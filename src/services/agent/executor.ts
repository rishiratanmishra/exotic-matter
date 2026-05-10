// Global window.em types are in src/global.d.ts
import { LocalAgentService, LocalMessage } from '../LocalAgentService'
import { AGENT_TOOLS, buildToolsPromptSection } from './tools'
import { VectorStorage } from '../VectorStorage'
import { store } from '../../store'
import { setTasks, updateArtifact } from '../../store/planSlice'

// Safe delimiter that doesn't appear in file paths or normal text
export const PROPOSAL_DELIM = '|||DELIM|||'

export interface AgentContext {
  workspacePath: string | null
  activeFile: string | null
  allFiles: string[]
  activeTerminalId: number
}

function buildSystemPrompt(ctx: AgentContext): string {
  const fileList = ctx.allFiles.length > 0
    ? ctx.allFiles.slice(0, 300).join('\n')
    : '(no workspace open)'

  return `You are Exotic Matter AI — an expert coding assistant powered by Gemma 4.

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
function trimMessages(messages: LocalMessage[], maxChars = 32_000): LocalMessage[] {
  const system = messages.filter(m => m.role === 'system')
  const conversation = messages.filter(m => m.role !== 'system')

  let total = system.reduce((acc, m) => acc + m.content.length, 0)
  const trimmed: LocalMessage[] = []

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
  private messages: LocalMessage[] = []
  private context: AgentContext = { workspacePath: null, activeFile: null, allFiles: [], activeTerminalId: 0 }

  constructor() {
    // System prompt is rebuilt per-run so context stays fresh
  }

  updateContext(ctx: Partial<AgentContext>) {
    this.context = { ...this.context, ...ctx }
  }

  setHistory(history: LocalMessage[]) {
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
    const systemMsg: LocalMessage = { role: 'system', content: buildSystemPrompt(this.context) }
    // Replace existing system msg or prepend
    if (this.messages.length > 0 && this.messages[0].role === 'system') {
      this.messages[0] = systemMsg
    } else {
      this.messages.unshift(systemMsg)
    }

    this.messages.push({ role: 'user', content: task })

    const MAX_TOOL_CALLS = 20
    let toolCallsLeft = MAX_TOOL_CALLS

    while (toolCallsLeft > 0) {
      onUpdate('Thinking...')
      const trimmed = trimMessages(this.messages)
      const response = await LocalAgentService.chat(trimmed, onStream)

      if (!response || typeof response !== 'string') {
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

      const result = await this.executeTool(toolCall.tool, toolCall.args, onUpdate)
      this.messages.push({
        role: 'user', // Ollama doesn't have a "tool" role; use user to pass results
        content: `[Tool result for ${toolCall.tool}]\n${result}`,
      })

      // Self-Healing Trigger: If it proposed an edit, auto-verify it (optional but implemented for Agentic mode)
      if (toolCall.tool === 'patch_edit' && this.context.activeFile && this.context.activeFile.endsWith('.ts')) {
         onUpdate(`🔍 Verifying system integrity...`)
         const verifyCmd = `npx tsc --noEmit`
         const verifyResult = await this.executeTool('execute_command', { command: verifyCmd }, onUpdate)
         
         if (verifyResult.includes('Error') || verifyResult.includes('Failed') || verifyResult.includes('error TS')) {
             this.messages.push({
                 role: 'user',
                 content: `CRITICAL: The recent edit caused typecheck to fail. Fix the following errors:\n\n${verifyResult}`
             })
         }
      }

      toolCallsLeft--
    }

    return 'Reached maximum tool call limit. Ask me to continue if needed.'
  }

  private async executeTool(name: string, args: Record<string, any>, onUpdate: (msg: string) => void): Promise<string> {
    try {
      switch (name) {
        case 'execute_command': {
          onUpdate(`🏃 Running: ${args.command}`)
          const root = this.context.workspacePath || ''
          const res = await window.em.execCommand(root, args.command)
          return res.output || '(empty output)'
        }

        case 'patch_edit': {
          onUpdate(`🩹 Applying patch...`)
          const res = await window.em.patchFile(args.path, args.searchQuery, args.replaceWith)
          if (!res.success) {
            return `❌ Patch Failed: ${res.error}`
          }
          return `✅ Patch applied to ${args.path}`
        }

        case 'read_file': {
          const content = await window.em.readFile(args.path)
          return content.length > 0 ? content : '(empty file)'
        }

        case 'write_file': {
          await window.em.writeFile(args.path, args.content)
          return `✅ Wrote ${args.path}`
        }

        case 'propose_edit': {
          // Read current content to show a diff
          const original = await window.em.readFile(args.path)
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
          const files = await window.em.listDir(args.path)
          return JSON.stringify(
            files.map((f: any) => ({ name: f.name, isDir: f.isDir, path: f.path })),
            null,
            2
          )
        }

        case 'search_workspace': {
          if (!this.context.workspacePath) return 'No workspace is open.'
          const results = await window.em.searchWorkspace(this.context.workspacePath, args.query)
          if (!results.length) return 'No results found.'
          return results
            .slice(0, 20)
            .map((r: any) => `${r.path}:${r.line}: ${r.content}`)
            .join('\n')
        }

        case 'execute_extension_command': {
          onUpdate(`🔌 Executing: ${args.commandId}`)
          const res = await window.em.executeExtensionCommand(args.commandId, args.args || [])
          return res && res.error ? `Error: ${res.error}` : JSON.stringify(res)
        }

        case 'list_extension_commands': {
          const cmds = await window.em.getExtensionCommands()
          return JSON.stringify(cmds)
        }

        case 'semantic_search': {
          onUpdate(`🧠 Searching memory for: ${args.query}`)
          const embedding = await LocalAgentService.generateEmbedding(args.query)
          if (embedding && !embedding.error) {
            const results = await VectorStorage.search(embedding, 5)
            if (results.length === 0) return 'No relevant code found in indexed memory.'
            return results
              .map(r => `File: ${r.path}\nContent:\n${r.content}`)
              .join('\n---\n')
          }
          return 'Failed to generate embedding for search.'
        }

        case 'send_terminal_input': {
          onUpdate(`⌨ Sending terminal input...`)
          window.em.terminalWrite(this.context.activeTerminalId || 0, args.input)
          return '✅ Input sent to terminal'
        }

        case 'create_plan': {
          onUpdate(`📝 Creating implementation plan...`)
          store.dispatch(setTasks(args.tasks.map((t: any) => ({ ...t, status: 'pending' }))))
          // Auto-switch sidebar to plan tab if possible (via bridge)
          window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'switch-tab', tab: 'plan' } }))
          return '✅ Plan created and shown in sidebar'
        }

        case 'generate_ui': {
          onUpdate(`🎨 Generating UI preview...`)
          const id = `ui-${Date.now()}`
          store.dispatch(updateArtifact({
            id,
            title: args.title,
            type: 'code',
            content: args.content
          }))
          return `✅ UI artifact "${args.title}" generated. Preview it in the artifacts section.`
        }

        default:
          return `Unknown tool: ${name}`
      }
    } catch (err: any) {
      return `Error in ${name}: ${err.message ?? String(err)}`
    }
  }
}
