// ─── Tool Definitions ─────────────────────────────────────────────────────────
// These are sent to the AI model so it knows what tools are available.

export interface ToolParameter {
  type: string
  description: string
  required?: boolean
}

export interface Tool {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, ToolParameter>
    required: string[]
  }
}

export const AGENT_TOOLS: Tool[] = [
  {
    name: 'read_file',
    description: 'Read the full contents of a file from disk.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file.' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write or overwrite a file with new content. Always prefer propose_edit for showing diffs first.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file.' },
        content: { type: 'string', description: 'The full content to write.' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'propose_edit',
    description: 'Propose a code change to a file. This shows a diff to the user before applying. Prefer this over write_file for editing existing files.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file to edit.' },
        content: { type: 'string', description: 'The new full content of the file.' },
        explanation: { type: 'string', description: 'Brief explanation of what was changed and why.' },
      },
      required: ['path', 'content', 'explanation'],
    },
  },
  {
    name: 'execute_command',
    description: 'Execute a bash/powershell command in the workspace terminal. Crucial for running tests, build scripts, or arbitrary CLI commands to verify your changes plan.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'CLI command to run (e.g., npm run test, tsc, etc.)' },
      },
      required: ['command'],
    },
  },
  {
    name: 'patch_edit',
    description: 'Safely replace a specific block of code in a file. Prefer this over write_file. Target specific blocks rather than the entire file.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file to edit.' },
        searchQuery: { type: 'string', description: 'The exact existing block of code in the file you want to replace.' },
        replaceWith: { type: 'string', description: 'The new code to swap in.' },
      },
      required: ['path', 'searchQuery', 'replaceWith'],
    },
  },
  {
    name: 'list_dir',
    description: 'List the files and subdirectories in a directory.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the directory.' },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_workspace',
    description: 'Search for a text string across all files in the workspace.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The text or pattern to search for.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'execute_extension_command',
    description: 'Execute an extension command programmatically inside the Extension Host.',
    parameters: {
      type: 'object',
      properties: {
        commandId: { type: 'string', description: 'The registered extension command ID' },
        args: { type: 'string', description: 'JSON stringified array of arguments for the command' }
      },
      required: ['commandId']
    }
  },
  {
    name: 'list_extension_commands',
    description: 'Fetch all available extension commands that can be executed.',
    parameters: { type: 'object', properties: {}, required: [] }
  }
]

export function buildToolsPromptSection(tools: Tool[]): string {
  return tools
    .map(t => {
      const params = Object.entries(t.parameters.properties)
        .map(([k, v]) => `  - ${k} (${v.type}): ${v.description}`)
        .join('\n')
      return `### ${t.name}\n${t.description}\nParameters:\n${params}`
    })
    .join('\n\n')
}
