// Global window.capsicode types are in src/global.d.ts
import { OllamaService, OllamaMessage } from '../ollama'
import { AGENT_TOOLS, buildToolsPromptSection } from './tools'

// Safe delimiter that doesn't appear in file paths or normal text
export const PROPOSAL_DELIM = '|||DELIM|||'

export interface AgentContext {
  workspacePath: string | null
  activeFile: string | null
  allFiles: string[]
}

function buildSystemPrompt(ctx: AgentContext): string {
  const fileList = ctx.allFiles.length > 0
    ? ctx.allFiles.slice(0, 300).join('\n')
    : '(no workspace open)'

  return `You are CapsiCode AI — an expert coding assistant embedded in a local IDE.

## Context
- Workspace: ${ctx.workspacePath ?? 'none'}
- Active file: ${ctx.activeFile ?? 'none'}
- Available files (first 300):
\`\`\`
${fileList}
\`\`\`

## Available Tools
Use ONE tool at a time. Emit a JSON block with the following format (and nothing else on those lines):
\`\`\`json
{"tool": "<tool_name>", "args": {<args>}}
\`\`\`

${buildToolsPromptSection(AGENT_TOOLS)}

## Rules
- ALWAYS use \`propose_edit\` (not \`write_file\`) when editing an existing file. This shows a diff to the user.
- Work step-by-step. After each tool result, reason about the next step.
- If the task is complete, respond normally without a tool call.
- Never make up file paths. Only reference paths from the file list above.
- In PLANNING MODE: output a numbered plan prefixed with "PLAN:" before calling any tools.`
}

/**
 * Trim messages to stay within token budget.
 * Keeps the system prompt + most recent N messages.
 */
function trimMessages(messages: OllamaMessage[], maxChars = 16_000): OllamaMessage[] {
  const system = messages.filter(m => m.role === 'system')
  const conversation = messages.filter(m => m.role !== 'system')

  let total = system.reduce((acc, m) => acc + m.content.length, 0)
  const trimmed: OllamaMessage[] = []

  for (let i = conversation.length - 1; i >= 0; i--) {
    const len = conversation[i].content.length
    if (total + len > maxChars) break
    trimmed.unshift(conversation[i])
    total += len
  }

  return [...system, ...trimmed]
}

/**
 * Parse the first JSON tool call block from an LLM response.
 * More robust than regex on "CALL: tool_name({...})".
 */
function parseToolCall(response: string): { tool: string; args: Record<string, any> } | null {
  // Match ```json ... ``` block containing a tool call
  const jsonBlockMatch = response.match(/```json\s*\n?(\{[\s\S]*?\})\s*\n?```/i)
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1])
      if (parsed.tool && typeof parsed.tool === 'string') {
        return { tool: parsed.tool.toLowerCase(), args: parsed.args ?? {} }
      }
    } catch { /* fall through */ }
  }

  // Fallback: bare JSON object with "tool" key (no code fence)
  const bareJsonMatch = response.match(/\{[\s\S]*?"tool"\s*:\s*"[\s\S]*?"[\s\S]*?\}/)
  if (bareJsonMatch) {
    try {
      const parsed = JSON.parse(bareJsonMatch[0])
      if (parsed.tool && typeof parsed.tool === 'string') {
        return { tool: parsed.tool.toLowerCase(), args: parsed.args ?? {} }
      }
    } catch { /* fall through */ }
  }

  return null
}

export class AgentExecutor {
  private messages: OllamaMessage[] = []
  private context: AgentContext = { workspacePath: null, activeFile: null, allFiles: [] }

  constructor() {
    // System prompt is rebuilt per-run so context stays fresh
  }

  updateContext(ctx: Partial<AgentContext>) {
    this.context = { ...this.context, ...ctx }
  }

  setHistory(history: OllamaMessage[]) {
    // Rebuild: keep system at top, replace conversation
    this.messages = [
      { role: 'system', content: buildSystemPrompt(this.context) },
      ...history.filter(m => m.role !== 'system'),
    ]
  }

  async runTask(
    task: string,
    onUpdate: (msg: string) => void,
    onStream?: (chunk: string) => void
  ): Promise<string> {
    // Ensure fresh system prompt with latest context
    const systemMsg: OllamaMessage = { role: 'system', content: buildSystemPrompt(this.context) }
    // Replace existing system msg or prepend
    if (this.messages.length > 0 && this.messages[0].role === 'system') {
      this.messages[0] = systemMsg
    } else {
      this.messages.unshift(systemMsg)
    }

    this.messages.push({ role: 'user', content: task })

    const MAX_TOOL_CALLS = 12
    let toolCallsLeft = MAX_TOOL_CALLS

    while (toolCallsLeft > 0) {
      onUpdate('Thinking...')
      const trimmed = trimMessages(this.messages)
      const response = await OllamaService.chat(trimmed, onStream)

      if (!response) {
        return 'No response from model.'
      }

      const toolCall = parseToolCall(response)

      if (!toolCall) {
        // Model gave a final answer
        this.messages.push({ role: 'assistant', content: response })
        onUpdate('Done')
        return response
      }

      // Execute the tool
      onUpdate(`⚙ Running tool: ${toolCall.tool}`)
      this.messages.push({ role: 'assistant', content: response })

      const result = await this.executeTool(toolCall.tool, toolCall.args)
      this.messages.push({
        role: 'user', // Ollama doesn't have a "tool" role; use user to pass results
        content: `[Tool result for ${toolCall.tool}]\n${result}`,
      })

      toolCallsLeft--
    }

    return 'Reached maximum tool call limit. Ask me to continue if needed.'
  }

  private async executeTool(name: string, args: Record<string, any>): Promise<string> {
    try {
      switch (name) {
        case 'read_file': {
          const content = await window.capsicode.readFile(args.path)
          return content.length > 0 ? content : '(empty file)'
        }

        case 'write_file': {
          await window.capsicode.writeFile(args.path, args.content)
          return `✅ Wrote ${args.path}`
        }

        case 'propose_edit': {
          // Read current content to show a diff
          const original = await window.capsicode.readFile(args.path)
          // Format with safe delimiter so Chat.tsx can parse reliably
          return [
            `PROPOSAL_START`,
            args.path,
            PROPOSAL_DELIM,
            original,
            PROPOSAL_DELIM,
            args.content,
            PROPOSAL_DELIM,
            args.explanation ?? '',
            `PROPOSAL_END`,
          ].join('\n')
        }

        case 'list_dir': {
          const files = await window.capsicode.listDir(args.path)
          return JSON.stringify(
            files.map((f: any) => ({ name: f.name, isDir: f.isDir, path: f.path })),
            null,
            2
          )
        }

        case 'search_workspace': {
          if (!this.context.workspacePath) return 'No workspace is open.'
          const results = await window.capsicode.searchWorkspace(this.context.workspacePath, args.query)
          if (!results.length) return 'No results found.'
          return results
            .slice(0, 20)
            .map((r: any) => `${r.path}:${r.line}: ${r.content}`)
            .join('\n')
        }

        default:
          return `Unknown tool: ${name}`
      }
    } catch (err: any) {
      return `Error in ${name}: ${err.message ?? String(err)}`
    }
  }
}
