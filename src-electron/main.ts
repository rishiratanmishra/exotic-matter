import { app, BrowserWindow, ipcMain, dialog, session, shell } from 'electron'
import path, { join, resolve, normalize } from 'path'
import { readdir, readFile, stat, writeFile, mkdir, unlink, rmdir, rename } from 'fs/promises'
import * as fs from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import * as pty from 'node-pty'
import os from 'os'

const execFileAsync = promisify(execFile)

// ─── Workspace state (stored in main process for security) ──────────────────
let activeWorkspacePath: string | null = null

function setWorkspacePath(p: string | null) {
  activeWorkspacePath = p
}

/**
 * Validates that a given file path is within the active workspace root.
 * Throws if there's a path traversal attempt.
 */
function assertSafePath(filePath: string) {
  if (!activeWorkspacePath) {
    // If no workspace is open, allow any path (initial state)
    return
  }
  const resolved = normalize(resolve(filePath))
  const workspaceResolved = normalize(resolve(activeWorkspacePath))
  if (!resolved.startsWith(workspaceResolved)) {
    throw new Error(`Path traversal blocked: "${filePath}" is outside workspace "${activeWorkspacePath}"`)
  }
}

// ─── Window ──────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // required for preload
      webviewTag: true, // required for Vibe Mode <webview> elements
    },
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 10, y: 10 },
    show: false,
  })

  // Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const isDev = !!process.env.VITE_DEV_SERVER_URL
    const csp = [
      "default-src 'self'",
      // Allow 'unsafe-inline' in dev for Vite's HMR and React preamble
      `script-src 'self' 'unsafe-eval' ${isDev ? "'unsafe-inline'" : ""}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      // Allow ws: in dev for Vite HMR
      `connect-src 'self' http://127.0.0.1:11434 https://open-vsx.org https://openvsx.eclipsecontent.org ${isDev ? "ws: localhost:*" : ""}`,
      "img-src * data: blob: 'self'",
    ].join('; ')

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    })
  })

  // ─── Vibe Mode: Ad-free persistent sessions ──────────────────────────────
  const AD_DOMAINS = [
    'doubleclick.net', 'googlesyndication.com', 'adservice.google.com',
    'googletagmanager.com', 'google-analytics.com', 'imasdk.googleapis.com',
    'ads.youtube.com', 'youtube.com/api/stats/ads', 'amazon-adsystem.com',
    'adnxs.com', 'moatads.com', 'securepubads.g.doubleclick.net',
    'pagead2.googlesyndication.com', 'static.ads-twitter.com',
  ]

  const vibeSessions = ['vibe-spotify', 'vibe-youtube', 'vibe-reels'].map(
    name => session.fromPartition(`persist:${name}`)
  )

  for (const vibeSession of vibeSessions) {
    vibeSession.webRequest.onBeforeRequest(
      { urls: ['*://*/*'] },
      (details, callback) => {
        const isAd = AD_DOMAINS.some(domain => details.url.includes(domain))
        callback({ cancel: isAd })
      }
    )
  }

  win.once('ready-to-show', () => win.show())


  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── Shell: open URLs in system browser (e.g. Google OAuth for Vibe Mode) ─────
ipcMain.handle('open-external', (_e, url: string) => {
  const allowed = [
    'accounts.google.com', 'open.spotify.com', 'youtube.com',
    'instagram.com', 'spotify.com', 'accounts.spotify.com',
  ]
  if (allowed.some(d => url.includes(d))) {
    shell.openExternal(url)
  }
})

// ─── Extensions Management ────────────────────────────────────────────────────
const EXTENSIONS_DIR = join(app.getPath('userData'), 'extensions')

async function ensureExtensionsDir() {
  try {
    await mkdir(EXTENSIONS_DIR, { recursive: true })
  } catch (err) {
    console.error('Failed to create extensions directory:', err)
  }
}

app.whenReady().then(ensureExtensionsDir)

ipcMain.handle('list-extensions', async () => {
  try {
    const folders = await readdir(EXTENSIONS_DIR, { withFileTypes: true })
    const extensions = []

    for (const folder of folders) {
      if (folder.isDirectory()) {
        const manifestPath = join(EXTENSIONS_DIR, folder.name, 'package.json')
        try {
          const content = await readFile(manifestPath, 'utf8')
          const manifest = JSON.parse(content)
          extensions.push({
            id: folder.name,
            name: manifest.name || folder.name,
            version: manifest.version || '0.0.1',
            description: manifest.description || 'No description provided',
            author: manifest.author || 'Unknown',
            enabled: true, // Simplified: manage via a config file later
            path: join(EXTENSIONS_DIR, folder.name)
          })
        } catch (e) {
          console.warn(`Failed to read manifest for extension ${folder.name}:`, e)
        }
      }
    }

    // Add some built-in mock extensions if folder is empty for demonstration
    if (extensions.length === 0) {
      return [
        { id: 'cc.theme.tokyo-night', name: 'Tokyo Night', version: '1.0.0', description: 'A clean, dark theme for Exotic Matter.', author: 'Enki', enabled: true, builtIn: true },
        { id: 'cc.lang.python', name: 'Python Support', version: '2.4.1', description: 'Rich IntelliSense and linting for Python.', author: 'Exotic Matter Team', enabled: true, builtIn: true },
        { id: 'cc.util.git-lens', name: 'GitLens Lite', version: '0.8.0', description: 'Visual git history and line blame.', author: 'Community', enabled: false, builtIn: true },
      ]
    }

    return extensions
  } catch (err) {
    console.error('[list-extensions]', err)
    return []
  }
})

ipcMain.handle('get-extension-file', async (_event, { id, fileName }: { id: string; fileName: string }) => {
  try {
    const filePath = join(EXTENSIONS_DIR, id, fileName)
    // Basic safety check: ensure the resulting path is still within EXTENSIONS_DIR
    if (!filePath.startsWith(EXTENSIONS_DIR)) {
      throw new Error('Unauthorized path access')
    }
    return await readFile(filePath, 'utf8')
  } catch (err) {
    console.error(`[get-extension-file] ${id}/${fileName}:`, err)
    return null
  }
})

ipcMain.handle('uninstall-extension', async (_event, id: number | string) => {
    // Logic to delete the folder
    return { success: true }
})

ipcMain.handle('search-marketplace', async (_event, query: string) => {
  try {
    const response = await fetch(`https://open-vsx.org/api/-/search?q=${encodeURIComponent(query)}&size=30`)
    return await response.json()
  } catch (err) {
    console.error('[search-marketplace]', err)
    return { extensions: [] }
  }
})

ipcMain.handle('install-extension', async (_event, { id, version }: { id: string; version: string }) => {
  const [ns, name] = id.split('.')
  const downloadUrl = `https://open-vsx.org/api/${ns}/${name}/${version}/file/${ns}.${name}-${version}.vsix`
  const targetDir = path.join(EXTENSIONS_DIR, id)
  const AdmZip = require('adm-zip')
  const axios = require('axios')

  try {
    const res = await axios.get(downloadUrl, { responseType: 'arraybuffer' })
    const zip = new AdmZip(Buffer.from(res.data))
    
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })
    
    // Extract into folder, but usually VSIX has its contents inside 'extension/' folder
    zip.extractAllTo(targetDir, true)
    
    // Check if everything is inside an 'extension' subfolder
    const subfolder = path.join(targetDir, 'extension')
    if (fs.existsSync(subfolder)) {
        // Move contents out of extension subfolder to targetDir
        const files = fs.readdirSync(subfolder)
        for (const file of files) {
            fs.renameSync(path.join(subfolder, file), path.join(targetDir, file))
        }
        fs.rmdirSync(subfolder)
    }

    return { success: true }
  } catch (err: any) {
    console.error('[install-extension] error:', err)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('get-extension-details', async (_event, id: string) => {
  try {
    const [ns, name] = id.split('.')
    const metaRes = await fetch(`https://open-vsx.org/api/${ns}/${name}/latest`)
    const meta = await metaRes.json()
    
    let readme = ''
    try {
        const readmeRes = await fetch(`https://open-vsx.org/api/${ns}/${name}/${meta.version}/file/README.md`)
        if (readmeRes.ok) readme = await readmeRes.text()
    } catch (e) { /* ignore readme missing */ }

    return { meta, readme }
  } catch (err) {
    console.error('[get-extension-details]', err)
    return null
  }
})

ipcMain.handle('get-external-image', async (_event, url: string) => {
  try {
    const axios = require('axios')
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 5000,
      headers: { 'User-Agent': 'Exotic Matter IDE' }
    })
    const base64 = Buffer.from(response.data, 'binary').toString('base64')
    const contentType = response.headers['content-type'] || 'image/png'
    return `data:${contentType};base64,${base64}`
  } catch (err: any) {
    // If it's a 404, just return null quietly
    if (err.response?.status !== 404) {
      console.error(`[get-external-image] ${url}: ${err.message}`)
    }
    return null
  }
})

// ─── IPC: App ─────────────────────────────────────────────────────────────────
ipcMain.handle('get-version', () => app.getVersion())
ipcMain.handle('get-app-path', () => app.getAppPath())

ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  if (result.canceled || !result.filePaths[0]) return null
  const folderPath = result.filePaths[0]
  setWorkspacePath(folderPath) // Track in main process
  return folderPath
})

// Allow renderer to notify main of the current workspace (e.g., on restore)
ipcMain.handle('set-workspace-path', (_event, path: string | null) => {
  setWorkspacePath(path)
})

ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'] })
  if (result.canceled || !result.filePaths[0]) return null
  return result.filePaths[0]
})

ipcMain.handle('save-file-as', async (_event, content: string) => {
  const result = await dialog.showSaveDialog({
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'TypeScript', extensions: ['ts', 'tsx'] },
      { name: 'JavaScript', extensions: ['js', 'jsx'] },
      { name: 'Text', extensions: ['txt'] },
    ]
  })
  if (result.canceled || !result.filePath) return null
  await writeFile(result.filePath, content, 'utf-8')
  return result.filePath
})

// ─── IPC: File System ─────────────────────────────────────────────────────────
ipcMain.handle('list-dir', async (_event, path: string) => {
  try {
    const entries = await readdir(path, { withFileTypes: true })
    return entries.map(e => ({
      name: e.name,
      isDir: e.isDirectory(),
      path: join(path, e.name),
    }))
  } catch {
    return []
  }
})

ipcMain.handle('read-file', async (_event, filePath: string) => {
  try {
    assertSafePath(filePath)
    return await readFile(filePath, 'utf-8')
  } catch (err) {
    console.error('[read-file]', err)
    return ''
  }
})

ipcMain.handle('write-file', async (_event, { path: filePath, content }: { path: string; content: string }) => {
  try {
    assertSafePath(filePath)
    await writeFile(filePath, content, 'utf-8')
    return 'Success'
  } catch (err) {
    console.error('[write-file]', err)
    return `Error: ${err}`
  }
})

ipcMain.handle('create-file', async (_event, { path: filePath, content = '' }: { path: string; content?: string }) => {
  try {
    assertSafePath(filePath)
    await writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('create-directory', async (_event, dirPath: string) => {
  try {
    assertSafePath(dirPath)
    await mkdir(dirPath, { recursive: true })
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('rename-file', async (_event, { oldPath, newPath }: { oldPath: string; newPath: string }) => {
  try {
    assertSafePath(oldPath)
    assertSafePath(newPath)
    await rename(oldPath, newPath)
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('delete-file', async (_event, filePath: string) => {
  try {
    assertSafePath(filePath)
    const s = await stat(filePath)
    if (s.isDirectory()) {
      await rmdir(filePath, { recursive: true } as any)
    } else {
      await unlink(filePath)
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

// ─── IPC: list-all-files (recursive, for AI context) ─────────────────────────
ipcMain.handle('list-all-files', async (_event, rootPath: string) => {
  const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.gemini', 'obj', 'bin', '.vscode', 'out'])
  const results: string[] = []

  const walk = async (dir: string) => {
    if (results.length > 2000) return // Hard cap to avoid flooding context
    let entries: any[]
    try {
      entries = (await readdir(dir, { withFileTypes: true })) as any
    } catch {
      return
    }
    for (const entry of entries) {
      if (IGNORE.has(entry.name)) continue
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else {
        results.push(fullPath)
      }
    }
  }

  try {
    await walk(rootPath)
    return results
  } catch {
    return []
  }
})

// ─── IPC: Workspace Search (ripgrep) ──────────────────────────────────────────
ipcMain.handle('search-workspace', async (_event, rootPath: string, query: string) => {
  if (!rootPath || !query) return []
  try {
    // Try ripgrep first (fast path)
    const { stdout } = await execFileAsync(
      'rg',
      ['--json', '-n', '--max-count', '5', '--max-filesize', '1M', query, rootPath],
      { maxBuffer: 10 * 1024 * 1024 }
    )
    return stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line) } catch { return null } })
      .filter((r): r is any => r?.type === 'match')
      .slice(0, 100)
      .map((r: any) => ({
        path: r.data.path.text,
        line: r.data.line_number,
        content: r.data.lines.text.trim(),
      }))
  } catch {
    // Fallback: manual walk (rg not installed)
    const results: any[] = []
    const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.gemini'])

    const walk = async (dir: string) => {
      if (results.length >= 100) return
      const entries = (await readdir(dir, { withFileTypes: true }).catch(() => [])) as any[]
      for (const entry of entries) {
        if (IGNORE.has(entry.name)) continue
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(fullPath)
        } else {
          try {
            const s = await stat(fullPath)
            if (s.size > 1024 * 1024) continue
            const content = await readFile(fullPath, 'utf8')
            const lines = content.split('\n')
            lines.forEach((line, idx) => {
              if (line.includes(query) && results.length < 100) {
                results.push({ path: fullPath, line: idx + 1, content: line.trim() })
              }
            })
          } catch { /* skip binary/unreadable */ }
        }
      }
    }
    await walk(rootPath)
    return results
  }
})

// ─── IPC: Agent Actions ────────────────────────────────────────────────────────
const { exec } = require('child_process')
ipcMain.handle('execute-command', async (_event, rootPath: string, command: string) => {
  return new Promise((resolve) => {
    exec(command, { cwd: rootPath, maxBuffer: 10 * 1024 * 1024, timeout: 30000 }, (error: any, stdout: string, stderr: string) => {
      let output = stdout + (stderr ? '\n[STDERR]:\n' + stderr : '')
      if (error) {
        output += `\n[ERROR]: ${error.message}`
      }
      resolve({ success: !error, output: output.trim() || '(No output)' })
    })
  })
})

ipcMain.handle('patch-file', async (_event, filePath: string, searchQuery: string, replaceWith: string) => {
  try {
    assertSafePath(filePath)
    const content = await readFile(filePath, 'utf-8')
    
    // Exact string replacement for safety
    if (!content.includes(searchQuery)) {
      return { success: false, error: 'Target code block not found in file.' }
    }
    
    const count = content.split(searchQuery).length - 1
    if (count > 1) {
      return { success: false, error: 'Target code block matches multiple times. Be more specific.' }
    }
    
    const newContent = content.replace(searchQuery, replaceWith)
    await writeFile(filePath, newContent, 'utf-8')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})


// ─── IPC: Terminal PTY ────────────────────────────────────────────────────────
const ptys: Map<number, pty.IPty> = new Map()

ipcMain.on('terminal-spawn', (event, id: number) => {
  if (ptys.has(id)) return // Already spawned
  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash'
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: activeWorkspacePath || os.homedir(),
    env: process.env as NodeJS.ProcessEnv,
  })
  ptys.set(id, ptyProcess)

  ptyProcess.onData(data => {
    // Check if window still exists before sending
    if (!event.sender.isDestroyed()) {
      event.sender.send(`terminal-data-${id}`, data)
    }
  })

  ptyProcess.onExit(() => {
    ptys.delete(id)
  })
})

ipcMain.on('terminal-write', (_event, id: number, data: string) => {
  ptys.get(id)?.write(data)
})

ipcMain.on('terminal-resize', (_event, id: number, cols: number, rows: number) => {
  ptys.get(id)?.resize(cols, rows)
})

ipcMain.handle('terminal-kill', (_event, id: number) => {
  const ptyProcess = ptys.get(id)
  if (ptyProcess) {
    try { ptyProcess.kill() } catch { /* already dead */ }
    ptys.delete(id)
  }
  return true
})

// ─── IPC: Window Controls ─────────────────────────────────────────────────────
ipcMain.on('window-minimize', event => BrowserWindow.fromWebContents(event.sender)?.minimize())
ipcMain.on('window-maximize', event => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win?.isMaximized() ? win.unmaximize() : win?.maximize()
})
ipcMain.on('window-close', event => BrowserWindow.fromWebContents(event.sender)?.close())
ipcMain.on('window-create', () => createWindow())

// ─── IPC: Git ─────────────────────────────────────────────────────────────────
ipcMain.handle('get-git-status', async (_event, rootPath: string) => {
  try {
    const { stdout } = await execFileAsync('git', ['status', '--porcelain'], { cwd: rootPath })
    return stdout.trim().split('\n').filter(Boolean).map(line => ({
      status: line.substring(0, 2).trim(),
      path: line.substring(3).trim(),
    }))
  } catch {
    return []
  }
})

ipcMain.handle('git-diff', async (_event, rootPath: string, filePath: string) => {
  try {
    const { stdout } = await execFileAsync('git', ['diff', 'HEAD', '--', filePath], { cwd: rootPath })
    return stdout
  } catch {
    return ''
  }
})

ipcMain.handle('git-commit', async (_event, rootPath: string, message: string) => {
  try {
    await execFileAsync('git', ['add', '-A'], { cwd: rootPath })
    const { stdout } = await execFileAsync('git', ['commit', '-m', message], { cwd: rootPath })
    return { success: true, output: stdout }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// ─── IPC: AI / Ollama ─────────────────────────────────────────────────────────
import { CommandRegistry } from './core/CommandRegistry'

ipcMain.handle('get-extension-commands', () => {
  return CommandRegistry.getAllExportedCommands()
})

ipcMain.handle('execute-extension-command', async (_event, commandId: string, args: any[]) => {
  try {
    return await CommandRegistry.executeCommand(commandId, ...args)
  } catch (err: any) {
    return { error: err.message }
  }
})

ipcMain.handle('get-models', async () => {
  try {
    const response = await fetch('http://127.0.0.1:11434/api/tags')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json() as { models: any[] }
    return data.models || []
  } catch {
    return []
  }
})

/**
 * Route AI chat through the main process so API keys never touch the renderer.
 * Currently proxies to Ollama on localhost.
 */
ipcMain.handle('ai-chat', async (_event, { model, messages, stream }: {
  model: string
  messages: Array<{ role: string; content: string }>
  stream: boolean
}) => {
  // Non-streaming path only (streaming is done in renderer directly to localhost)
  const response = await fetch('http://127.0.0.1:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
  })
  if (!response.ok) throw new Error(`Ollama error: ${response.status}`)
  const data = await response.json() as any
  return data.message?.content ?? ''
})
