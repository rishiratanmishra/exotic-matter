/// <reference types="vite/client" />

interface Window {
  em: {
    // App
    getVersion: () => Promise<string>
    getAppPath: () => Promise<string>

    // Workspace
    openFolder: () => Promise<string | null>
    openFile: () => Promise<string | null>
    saveFileAs: (content: string) => Promise<string | null>
    setWorkspacePath: (path: string | null) => Promise<void>

    // File System
    listDir: (path: string) => Promise<Array<{ name: string; isDir: boolean; path: string }>>
    readFile: (path: string) => Promise<string>
    writeFile: (path: string, content: string) => Promise<string>
    createFile: (path: string, content?: string) => Promise<{ success: boolean; error?: string }>
    createDirectory: (path: string) => Promise<{ success: boolean; error?: string }>
    renameFile: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>
    deleteFile: (path: string) => Promise<{ success: boolean; error?: string }>
    listAllFiles: (rootPath: string) => Promise<string[]>

    // Search
    searchWorkspace: (rootPath: string, query: string) => Promise<Array<{ path: string; line: number; content: string }>>

    // Agent Actions
    execCommand: (rootPath: string, command: string) => Promise<{ success: boolean; output: string }>
    patchFile: (path: string, searchQuery: string, replaceWith: string) => Promise<{ success: boolean; error?: string }>


    // Terminal
    terminalSpawn: (id: number) => void
    terminalWrite: (id: number, data: string) => void
    terminalResize: (id: number, cols: number, rows: number) => void
    terminalKill: (id: number) => Promise<boolean>
    onTerminalData: (id: number, callback: (data: string) => void) => () => void

    // Window
    windowMinimize: () => void
    windowMaximize: () => void
    windowClose: () => void
    windowCreate: () => void

    // Git
    getGitStatus: (rootPath: string) => Promise<Array<{ status: string; path: string }>>
    gitDiff: (rootPath: string, filePath: string) => Promise<string>
    gitCommit: (rootPath: string, message: string) => Promise<{ success: boolean; output?: string; error?: string }>

    // AI
    getModels: () => Promise<Array<{ name: string; [key: string]: any }>>
    aiChat: (payload: { model: string; messages: any[]; stream: boolean }) => Promise<string>
    localAiLoad: (modelPath: string) => Promise<{ success: boolean; error?: string }>
    localAiChat: (payload: { messages: any[] }) => Promise<any>
    localAiStatus: () => Promise<{ loaded: boolean }>
    onLocalAiToken: (callback: (token: string) => void) => () => void
    localAiEmbedding: (text: string) => Promise<any>

    // Extensions
    listExtensions: () => Promise<any[]>
    getExtensionFile: (id: string, fileName: string) => Promise<string | null>
    uninstallExtension: (id: string) => Promise<{ success: boolean }>
    searchMarketplace: (query: string) => Promise<any>
    installExtension: (id: string, version: string) => Promise<{ success: boolean, error?: string }>
  getExtensionCommands: () => Promise<{id: string}[]>
  executeExtensionCommand: (commandId: string, args: any[]) => Promise<any>
    getExtensionDetails: (id: string) => Promise<any>
    getExternalImage: (url: string) => Promise<string | null>
  }
}
