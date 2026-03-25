import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('em', {
  // App
  getVersion: () => ipcRenderer.invoke('get-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),

  // Workspace
  openFolder: () => ipcRenderer.invoke('open-folder'),
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFileAs: (content: string) => ipcRenderer.invoke('save-file-as', content),
  setWorkspacePath: (path: string | null) => ipcRenderer.invoke('set-workspace-path', path),

  // File System
  listDir: (path: string) => ipcRenderer.invoke('list-dir', path),
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('write-file', { path, content }),
  createFile: (path: string, content?: string) => ipcRenderer.invoke('create-file', { path, content }),
  createDirectory: (path: string) => ipcRenderer.invoke('create-directory', path),
  renameFile: (oldPath: string, newPath: string) => ipcRenderer.invoke('rename-file', { oldPath, newPath }),
  deleteFile: (path: string) => ipcRenderer.invoke('delete-file', path),
  listAllFiles: (rootPath: string) => ipcRenderer.invoke('list-all-files', rootPath),

  // Search
  searchWorkspace: (rootPath: string, query: string) => ipcRenderer.invoke('search-workspace', rootPath, query),

  // Agent Actions
  execCommand: (rootPath: string, command: string) => ipcRenderer.invoke('execute-command', rootPath, command),
  patchFile: (path: string, searchQuery: string, replaceWith: string) => ipcRenderer.invoke('patch-file', path, searchQuery, replaceWith),


  // Terminal PTY
  terminalSpawn: (id: number) => ipcRenderer.send('terminal-spawn', id),
  terminalWrite: (id: number, data: string) => ipcRenderer.send('terminal-write', id, data),
  terminalResize: (id: number, cols: number, rows: number) => ipcRenderer.send('terminal-resize', id, cols, rows),
  terminalKill: (id: number) => ipcRenderer.invoke('terminal-kill', id),
  onTerminalData: (id: number, callback: (data: string) => void) => {
    const channel = `terminal-data-${id}`
    const handler = (_: Electron.IpcRendererEvent, data: string) => callback(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },

  // Window
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowCreate: () => ipcRenderer.send('window-create'),

  // Git
  getGitStatus: (rootPath: string) => ipcRenderer.invoke('get-git-status', rootPath),
  gitDiff: (rootPath: string, filePath: string) => ipcRenderer.invoke('git-diff', rootPath, filePath),
  gitCommit: (rootPath: string, message: string) => ipcRenderer.invoke('git-commit', rootPath, message),

  // Extensions
  listExtensions: () => ipcRenderer.invoke('list-extensions'),
  getExtensionFile: (id: string, fileName: string) => ipcRenderer.invoke('get-extension-file', { id, fileName }),
  uninstallExtension: (id: string) => ipcRenderer.invoke('uninstall-extension', id),
  searchMarketplace: (query: string) => ipcRenderer.invoke('search-marketplace', query),
  installExtension: (id: string, version: string) => ipcRenderer.invoke('install-extension', { id, version }),

  // Commands
  getExtensionCommands: () => ipcRenderer.invoke('get-extension-commands'),
  executeExtensionCommand: (commandId: string, args: any[]) => ipcRenderer.invoke('execute-extension-command', commandId, args),
  getExtensionDetails: (id: string) => ipcRenderer.invoke('get-extension-details', id),
  getExternalImage: (url: string) => ipcRenderer.invoke('get-external-image', url),

  // AI (routed through main for security)
  getModels: () => ipcRenderer.invoke('get-models'),
  aiChat: (payload: { model: string; messages: any[]; stream: boolean }) =>
    ipcRenderer.invoke('ai-chat', payload),
})
