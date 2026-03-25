import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EditorFileState {
  path: string
  isDirty: boolean
  viewState?: any // monaco.editor.ICodeEditorViewState
}

export interface TerminalInstance {
  id: number
  label: string
}

export interface Extension {
  id: string
  name: string
  version: string
  description: string
  author: string
  enabled: boolean
  builtIn: boolean
  path?: string
}

export interface IDEState {
  // Workspace
  workspacePath: string | null
  allFiles: string[]

  // Editor
  openFiles: string[]
  activeFile: string | null
  fileStates: Record<string, EditorFileState>

  // Terminal
  terminals: TerminalInstance[]
  activeTerminalId: number
  terminalOpen: boolean
  terminalHeight: number
  splitTerminal: boolean
  sidebarWidth: number
  chatWidth: number
  extensions: Extension[]

  // UI
  sidebarOpen: boolean
  activeTab: 'explorer' | 'search' | 'git' | 'chat' | 'extensions' | 'vibe'
  chatOpen: boolean
  theme: 'dark' | 'light' | 'monokai'
  quickOpen: boolean
  quickOpenQuery: string
  commandPaletteOpen: boolean
  autoSave: boolean
  zenMode: boolean
  customTheme: Record<string, string> | null
}

type Action =
  | { type: 'SET_WORKSPACE'; path: string | null; allFiles?: string[] }
  | { type: 'SET_ALL_FILES'; files: string[] }
  | { type: 'OPEN_FILE'; path: string }
  | { type: 'CLOSE_FILE'; path: string }
  | { type: 'SET_ACTIVE_FILE'; path: string | null }
  | { type: 'SET_FILE_DIRTY'; path: string; isDirty: boolean }
  | { type: 'SET_FILE_VIEW_STATE'; path: string; viewState: any }
  | { type: 'ADD_TERMINAL'; terminal: TerminalInstance }
  | { type: 'CLOSE_TERMINAL'; id: number }
  | { type: 'SET_ACTIVE_TERMINAL'; id: number }
  | { type: 'TOGGLE_TERMINAL' }
  | { type: 'SET_TERMINAL_OPEN'; open: boolean }
  | { type: 'SET_TERMINAL_HEIGHT'; height: number }
  | { type: 'SET_SPLIT_TERMINAL'; split: boolean }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR_OPEN'; open: boolean }
  | { type: 'SET_ACTIVE_TAB'; tab: IDEState['activeTab'] }
  | { type: 'TOGGLE_CHAT' }
  | { type: 'SET_CHAT_OPEN'; open: boolean }
  | { type: 'SET_THEME'; theme: IDEState['theme'] }
  | { type: 'SET_QUICK_OPEN'; open: boolean; query?: string }
  | { type: 'SET_COMMAND_PALETTE'; open: boolean }
  | { type: 'SET_AUTO_SAVE'; enabled: boolean }
  | { type: 'SET_SIDEBAR_WIDTH'; width: number }
  | { type: 'SET_CHAT_WIDTH'; width: number }
  | { type: 'SET_ZEN_MODE'; enabled: boolean }
  | { type: 'TOGGLE_ZEN_MODE' }
  | { type: 'SET_CUSTOM_THEME'; theme: Record<string, string> | null }
  | { type: 'SET_EXTENSIONS'; extensions: Extension[] }
  | { type: 'REFRESH_EXTENSIONS' }
  | { type: 'RESTORE_PERSISTED'; state: Partial<IDEState> }

// ─── Reducer ─────────────────────────────────────────────────────────────────

function ideReducer(state: IDEState, action: Action): IDEState {
  switch (action.type) {
    case 'SET_WORKSPACE':
      return {
        ...state,
        workspacePath: action.path,
        allFiles: action.allFiles ?? [],
        openFiles: action.path ? state.openFiles : [],
        activeFile: action.path ? state.activeFile : null,
        fileStates: action.path ? state.fileStates : {},
      }

    case 'SET_ALL_FILES':
      return { ...state, allFiles: action.files }

    case 'OPEN_FILE': {
      const exists = state.openFiles.includes(action.path)
      return {
        ...state,
        openFiles: exists ? state.openFiles : [...state.openFiles, action.path],
        activeFile: action.path,
        fileStates: exists
          ? state.fileStates
          : {
              ...state.fileStates,
              [action.path]: { path: action.path, isDirty: false },
            },
      }
    }

    case 'CLOSE_FILE': {
      const newFiles = state.openFiles.filter(f => f !== action.path)
      const newStates = { ...state.fileStates }
      delete newStates[action.path]
      return {
        ...state,
        openFiles: newFiles,
        activeFile:
          state.activeFile === action.path && newFiles.length > 0
            ? newFiles[Math.max(0, state.openFiles.indexOf(action.path) - 1)] ?? newFiles[newFiles.length - 1]
            : state.activeFile === action.path
            ? null
            : state.activeFile,
        fileStates: newStates,
      }
    }

    case 'SET_ACTIVE_FILE':
      return { ...state, activeFile: action.path }

    case 'SET_FILE_DIRTY':
      return {
        ...state,
        fileStates: {
          ...state.fileStates,
          [action.path]: { ...(state.fileStates[action.path] ?? { path: action.path }), isDirty: action.isDirty },
        },
      }

    case 'SET_FILE_VIEW_STATE':
      return {
        ...state,
        fileStates: {
          ...state.fileStates,
          [action.path]: {
            ...(state.fileStates[action.path] ?? { path: action.path, isDirty: false }),
            viewState: action.viewState,
          },
        },
      }

    case 'SET_TERMINAL_OPEN':
      return { ...state, terminalOpen: action.open }

    case 'ADD_TERMINAL': {
      const exists = state.terminals.find(t => t.id === action.terminal.id)
      return exists
        ? { ...state, activeTerminalId: action.terminal.id, terminalOpen: true }
        : {
            ...state,
            terminals: [...state.terminals, action.terminal],
            activeTerminalId: action.terminal.id,
            terminalOpen: true,
          }
    }

    case 'CLOSE_TERMINAL': {
      const next = state.terminals.filter(t => t.id !== action.id)
      return {
        ...state,
        terminals: next,
        activeTerminalId:
          state.activeTerminalId === action.id
            ? (next[next.length - 1]?.id ?? 0)
            : state.activeTerminalId,
        terminalOpen: next.length > 0 ? state.terminalOpen : false,
      }
    }

    case 'SET_ACTIVE_TERMINAL':
      return { ...state, activeTerminalId: action.id }

    case 'SET_EXTENSIONS':
      return { ...state, extensions: action.extensions }

    case 'SET_CUSTOM_THEME':
      return { ...state, customTheme: action.theme }

    case 'TOGGLE_TERMINAL':
      return { ...state, terminalOpen: !state.terminalOpen }

    case 'SET_TERMINAL_HEIGHT':
      return { ...state, terminalHeight: Math.max(80, Math.min(600, action.height)) }

    case 'SET_SPLIT_TERMINAL':
      return { ...state, splitTerminal: action.split }

    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen }

    case 'SET_SIDEBAR_OPEN':
      return { ...state, sidebarOpen: action.open }

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.tab, sidebarOpen: true }

    case 'SET_SIDEBAR_WIDTH':
      return { ...state, sidebarWidth: Math.max(160, Math.min(600, action.width)) }

    case 'SET_CHAT_WIDTH':
      return { ...state, chatWidth: Math.max(280, Math.min(800, action.width)) }

    case 'TOGGLE_CHAT':
      return { ...state, chatOpen: !state.chatOpen }

    case 'SET_CHAT_OPEN':
      return { ...state, chatOpen: action.open }

    case 'SET_THEME':
      return { ...state, theme: action.theme }

    case 'SET_QUICK_OPEN':
      return { ...state, quickOpen: action.open, quickOpenQuery: action.query ?? '' }

    case 'SET_COMMAND_PALETTE':
      return { ...state, commandPaletteOpen: action.open }

    case 'SET_AUTO_SAVE':
      return { ...state, autoSave: action.enabled }

    case 'SET_ZEN_MODE':
      return { ...state, zenMode: action.enabled }
    
    case 'TOGGLE_ZEN_MODE':
      return { ...state, zenMode: !state.zenMode }

    case 'RESTORE_PERSISTED':
      return { ...state, ...action.state }

    default:
      return state
  }
}

// ─── Initial State ────────────────────────────────────────────────────────────

const INITIAL_TERMINAL_ID = Date.now()

const initialState: IDEState = {
  workspacePath: null,
  allFiles: [],
  openFiles: [],
  activeFile: null,
  fileStates: {},
  terminals: [{ id: INITIAL_TERMINAL_ID, label: 'Terminal 1' }],
  activeTerminalId: INITIAL_TERMINAL_ID,
  terminalOpen: false,
  terminalHeight: 260,
  splitTerminal: false,
  extensions: [],
  sidebarOpen: true,
  sidebarWidth: 260,
  activeTab: 'explorer',
  chatOpen: true,
  chatWidth: 380,
  theme: 'dark',
  quickOpen: false,
  quickOpenQuery: '',
  commandPaletteOpen: false,
  autoSave: true,
  zenMode: false,
  customTheme: null,
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface IDEContextValue {
  state: IDEState
  dispatch: React.Dispatch<Action>
  // Convenience actions
  openFile: (path: string) => void
  closeFile: (path: string) => void
  openFolder: () => Promise<void>
  openIndividualFile: () => Promise<void>
  closeFolder: () => void
  saveFile: (path: string) => Promise<void>
  saveFileAs: (path: string) => Promise<void>
  saveAll: () => Promise<void>
  handleRunFile: () => void
  triggerCreateFile: () => void
  triggerCreateFolder: () => void
  refreshExtensions: () => Promise<void>
  applyExtensionTheme: (id: string) => Promise<void>
}

const IDEContext = createContext<IDEContextValue | null>(null)

const PERSIST_KEY = 'em_ide_state_v2'

function persistState(state: IDEState) {
  try {
    localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({
        workspacePath: state.workspacePath,
        openFiles: state.openFiles.filter(f => !f.startsWith('diff:')),
        activeFile: state.activeFile?.startsWith('diff:') ? null : state.activeFile,
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        chatOpen: state.chatOpen,
        terminalHeight: state.terminalHeight,
        sidebarWidth: state.sidebarWidth,
        chatWidth: state.chatWidth,
        autoSave: state.autoSave,
      })
    )
  } catch { /* ignore quota errors */ }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function IDEProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(ideReducer, initialState)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Restore persisted state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PERSIST_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as Partial<IDEState>
      if (saved.workspacePath) {
        // Re-validate workspace still exists
        window.em.setWorkspacePath(saved.workspacePath)
        dispatch({
          type: 'RESTORE_PERSISTED',
          state: {
            workspacePath: saved.workspacePath,
            openFiles: saved.openFiles ?? [],
            activeFile: saved.activeFile ?? null,
            theme: saved.theme ?? 'dark',
            sidebarOpen: saved.sidebarOpen ?? true,
            chatOpen: saved.chatOpen ?? true,
            terminalHeight: saved.terminalHeight ?? 260,
            sidebarWidth: saved.sidebarWidth ?? 260,
            chatWidth: saved.chatWidth ?? 380,
            autoSave: saved.autoSave ?? true,
          },
        })
        // Refresh file index
        window.em.listAllFiles(saved.workspacePath).then(files => {
          dispatch({ type: 'SET_ALL_FILES', files })
        })
      }
    } catch { /* ignore */ }
  }, [])

  // Extensions loader
  const refreshExtensions = useCallback(async () => {
    const extensions = await window.em.listExtensions()
    dispatch({ type: 'SET_EXTENSIONS', extensions })
  }, [])

  useEffect(() => {
    refreshExtensions()
  }, [refreshExtensions])

  const applyExtensionTheme = useCallback(async (id: string | null) => {
    if (!id) {
       dispatch({ type: 'SET_CUSTOM_THEME', theme: null })
       return
    }
    const json = await window.em.getExtensionFile(id, 'theme.json')
    if (json) {
      try {
        const theme = JSON.parse(json)
        dispatch({ type: 'SET_CUSTOM_THEME', theme: theme.colors || theme })
      } catch (e) {
        console.error('Failed to parse theme JSON', e)
      }
    }
  }, [])

  // Inject custom theme variables into document root
  useEffect(() => {
    const root = document.documentElement
    if (state.customTheme) {
      Object.entries(state.customTheme).forEach(([key, value]) => {
        root.style.setProperty(key.startsWith('--') ? key : `--${key}`, value)
      })
    } else {
      // Clear custom variables (simplified: might need more careful reset)
      root.style.cssText = ''
    }
  }, [state.customTheme])

  // Debounced persist on state change
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => persistState(state), 500)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [state.workspacePath, state.openFiles, state.activeFile, state.theme, state.chatOpen, state.sidebarOpen, state.sidebarWidth, state.chatWidth])

  // Sync theme to body class for global CSS variables
  useEffect(() => {
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-monokai')
    document.body.classList.add(`theme-${state.theme}`)
  }, [state.theme])

  const openFile = useCallback((path: string) => {
    dispatch({ type: 'OPEN_FILE', path })
  }, [])

  const closeFile = useCallback((path: string) => {
    dispatch({ type: 'CLOSE_FILE', path })
  }, [])

  const openFolder = useCallback(async () => {
    const path = await window.em.openFolder()
    if (!path) return
    dispatch({ type: 'SET_WORKSPACE', path })
    // Index files in background
    window.em.listAllFiles(path).then(files => {
      dispatch({ type: 'SET_ALL_FILES', files })
    })
  }, [])

  const openIndividualFile = useCallback(async () => {
    const path = await window.em.openFile()
    if (!path) return
    openFile(path)
  }, [openFile])

  const closeFolder = useCallback(() => {
    window.em.setWorkspacePath(null)
    dispatch({ type: 'SET_WORKSPACE', path: null })
  }, [])

  const saveFile = useCallback(async (path: string) => {
    // @ts-ignore - Monaco is global
    const model = monaco.editor.getModel(monaco.Uri.file(path))
    if (model) {
      const content = model.getValue()
      await window.em.writeFile(path, content)
      dispatch({ type: 'SET_FILE_DIRTY', path, isDirty: false })
    }
  }, [])

  const saveFileAs = useCallback(async (path: string) => {
    // @ts-ignore - Monaco is global
    const model = monaco.editor.getModel(monaco.Uri.file(path))
    if (model) {
      const content = model.getValue()
      const newPath = await window.em.saveFileAs(content)
      if (newPath) {
        closeFile(path)
        openFile(newPath)
      }
    }
  }, [closeFile, openFile])

  const saveAll = useCallback(async () => {
    const dirtyFiles = Object.entries(state.fileStates)
      .filter(([_, s]) => s.isDirty)
      .map(([p]) => p)
    for (const f of dirtyFiles) {
      await saveFile(f)
    }
  }, [state.fileStates, saveFile])

  const handleRunFile = useCallback(() => {
    const { activeFile, activeTerminalId } = state
    if (!activeFile) return
    const ext = activeFile.split('.').pop()?.toLowerCase()
    let command = ''
    if (ext === 'js') command = `node "${activeFile}"`
    else if (ext === 'ts') command = `npx ts-node "${activeFile}"`
    else if (ext === 'py') command = `python "${activeFile}"`
    else if (ext === 'go') command = `go run "${activeFile}"`
    else if (ext === 'sh') command = `bash "${activeFile}"`
    if (command) {
      dispatch({ type: 'TOGGLE_TERMINAL' })
      window.em.terminalWrite(activeTerminalId, command + '\r\n')
    }
  }, [state.activeFile, state.activeTerminalId])

  const triggerCreateFile = useCallback(() => {
    window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'create-file' } }))
  }, [])

  const triggerCreateFolder = useCallback(() => {
    window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'create-folder' } }))
  }, [])

  return (
    <IDEContext.Provider value={{
      state, dispatch, openFile, closeFile, openFolder, openIndividualFile,
      closeFolder, saveFile, saveFileAs, saveAll, handleRunFile,
      triggerCreateFile, triggerCreateFolder,
      refreshExtensions, applyExtensionTheme
    }}>
      {children}
    </IDEContext.Provider>
  )
}

export function useIDE() {
  const ctx = useContext(IDEContext)
  if (!ctx) throw new Error('useIDE must be used inside IDEProvider')
  return ctx
}
