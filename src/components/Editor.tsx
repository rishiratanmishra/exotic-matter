import React, { useEffect, useRef, useCallback } from 'react'
import * as monaco from 'monaco-editor'
import { Sparkles } from 'lucide-react'
import { useIDE } from '../context/IDEContext'

// ─── Language detection ───────────────────────────────────────────────────────
const EXT_LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  html: 'html', css: 'css', scss: 'scss', less: 'less',
  json: 'json', jsonc: 'json',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
  java: 'java', kt: 'kotlin', cs: 'csharp', cpp: 'cpp', c: 'c', h: 'c',
  md: 'markdown', mdx: 'markdown',
  sh: 'shell', bash: 'shell', zsh: 'shell',
  yaml: 'yaml', yml: 'yaml',
  toml: 'ini', ini: 'ini',
  xml: 'xml', svg: 'xml',
  sql: 'sql',
  dockerfile: 'dockerfile',
}

function getLanguage(filePath: string): string {
  const parts = filePath.split('.')
  const ext = parts[parts.length - 1]?.toLowerCase()
  const fileName = filePath.split(/[/\\]/).pop()?.toLowerCase()
  if (fileName === 'dockerfile') return 'dockerfile'
  return EXT_LANGUAGE_MAP[ext] ?? 'plaintext'
}

// ─── Monaco Theme Registration (once) ────────────────────────────────────────
let themesRegistered = false
function ensureThemes() {
  if (themesRegistered) return
  themesRegistered = true

  monaco.editor.defineTheme('em-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'type', foreground: '4EC9B0' },
    ],
    colors: {
      'editor.background': '#0d0d0f',
      'editor.foreground': '#D4D4D4',
      'editorCursor.foreground': '#AEAFAD',
      'editor.lineHighlightBackground': '#1a1a1d',
      'editorLineNumber.foreground': '#444444',
      'editorLineNumber.activeForeground': '#969696',
      'editor.selectionBackground': '#264F78',
      'editorIndentGuide.background': '#282828',
      'editorIndentGuide.activeBackground': '#3C3C3C',
    },
  })

  monaco.editor.defineTheme('em-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#FFFFFF',
    },
  })

  monaco.editor.defineTheme('em-monokai', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '75715E', fontStyle: 'italic' },
      { token: 'string', foreground: 'E6DB74' },
      { token: 'keyword', foreground: 'F92672' },
      { token: 'number', foreground: 'AE81FF' },
    ],
    colors: {
      'editor.background': '#272822',
      'editorLineNumber.foreground': '#75715E',
    },
  })
}

const THEME_MAP: Record<string, string> = {
  dark: 'em-dark',
  light: 'em-light',
  monokai: 'em-monokai',
}

// ─── Component ────────────────────────────────────────────────────────────────
interface EditorProps {
  onInlineAIRequest?: (selectedText: string, filePath: string) => void
}

export default function Editor({ onInlineAIRequest }: EditorProps) {
  const { state, dispatch } = useIDE()
  const { activeFile, fileStates, theme } = state

  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const prevFileRef = useRef<string | null>(null)
  // Debounce auto-save timer
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { autoSave } = state

  // Initialize editor once
  useEffect(() => {
    if (!containerRef.current) return
    ensureThemes()

    const editor = monaco.editor.create(containerRef.current, {
      value: '',
      language: 'plaintext',
      theme: THEME_MAP[theme] ?? 'em-dark',
      automaticLayout: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Consolas, monospace",
      fontLigatures: true,
      lineHeight: 22,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      roundedSelection: true,
      padding: { top: 12, bottom: 12 },
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        useShadows: false,
        verticalScrollbarSize: 6,
        horizontalScrollbarSize: 6,
        verticalHasArrows: false,
        horizontalHasArrows: false,
      },
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      suggest: { showSnippets: true, showWords: true },
      wordWrap: 'off',
      tabSize: 2,
      insertSpaces: true,
      formatOnPaste: true,
      formatOnType: false,
    })

    editorRef.current = editor

    // Mark dirty on changes → debounced auto-save
    const disposable = editor.onDidChangeModelContent(() => {
      const file = prevFileRef.current
      if (!file) return
      dispatch({ type: 'SET_FILE_DIRTY', path: file, isDirty: true })

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        const content = editor.getValue()
        await window.em.writeFile(file, content)
        dispatch({ type: 'SET_FILE_DIRTY', path: file, isDirty: false })
      }, 1000) // 1-second auto-save debounce
    })

    // Register Ctrl+K (Inline AI)
    editor.addAction({
      id: 'em.inline-ai',
      label: 'Ask AI (Inline)',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
      run: (ed) => {
        const selection = ed.getSelection()
        const selectedText = selection ? ed.getModel()?.getValueInRange(selection) ?? '' : ''
        const file = prevFileRef.current
        if (file && onInlineAIRequest) {
          onInlineAIRequest(selectedText, file)
        }
      },
    })

    // Register Ctrl+S (explicit save)
    editor.addAction({
      id: 'em.save',
      label: 'Save File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: async (ed) => {
        const file = prevFileRef.current
        if (!file) return
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        await window.em.writeFile(file, ed.getValue())
        dispatch({ type: 'SET_FILE_DIRTY', path: file, isDirty: false })
      },
    })

    // Listen for global commands from menu
    const commandHandler = (e: any) => {
      const { command } = e.detail || {}
      if (!command) return
      switch(command) {
        case 'undo': editor.trigger('keyboard', 'undo', null); break
        case 'redo': editor.trigger('keyboard', 'redo', null); break
        case 'cut': editor.focus(); document.execCommand('cut'); break
        case 'copy': editor.focus(); document.execCommand('copy'); break
        case 'paste': editor.focus(); document.execCommand('paste'); break
        case 'select-all': editor.trigger('keyboard', 'editor.action.selectAll', null); break
        
        // Find & Replace
        case 'find': editor.trigger('keyboard', 'actions.find', null); break
        case 'replace': editor.trigger('keyboard', 'editor.action.startFindReplaceAction', null); break
        
        // Comments
        case 'toggle-line-comment': editor.trigger('keyboard', 'editor.action.commentLine', null); break
        case 'toggle-block-comment': editor.trigger('keyboard', 'editor.action.blockComment', null); break
        
        // Smart Selection
        case 'expand-selection': editor.trigger('keyboard', 'editor.action.smartSelect.expand', null); break
        case 'shrink-selection': editor.trigger('keyboard', 'editor.action.smartSelect.shrink', null); break
        
        // Line Manipulation
        case 'copy-line-up': editor.trigger('keyboard', 'editor.action.copyLinesUpAction', null); break
        case 'copy-line-down': editor.trigger('keyboard', 'editor.action.copyLinesDownAction', null); break
        case 'move-line-up': editor.trigger('keyboard', 'editor.action.moveLinesUpAction', null); break
        case 'move-line-down': editor.trigger('keyboard', 'editor.action.moveLinesDownAction', null); break
        case 'duplicate-selection': editor.trigger('keyboard', 'editor.action.duplicateSelection', null); break
        
        // Multi-cursor
        case 'add-cursor-above': editor.trigger('keyboard', 'editor.action.insertCursorAbove', null); break
        case 'add-cursor-below': editor.trigger('keyboard', 'editor.action.insertCursorBelow', null); break
        case 'add-cursors-to-line-ends': editor.trigger('keyboard', 'editor.action.insertCursorAtEndOfEachLineSelected', null); break
        case 'add-next-occurrence': editor.trigger('keyboard', 'editor.action.addSelectionToNextFindMatch', null); break
        case 'add-all-occurrences': editor.trigger('keyboard', 'editor.action.selectHighlights', null); break
      }
    }
    window.addEventListener('em-command', commandHandler)

    return () => {
      disposable.dispose()
      editor.dispose()
      window.removeEventListener('em-command', commandHandler)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [state.autoSave]) // re-bind if autoSave toggles to update closures? Actually better to use ref for autoSave

  // Sync theme changes
  useEffect(() => {
    monaco.editor.setTheme(THEME_MAP[theme] ?? 'em-dark')
  }, [theme])

  // Handle file switching — the critical multi-file logic
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const prevFile = prevFileRef.current

    // Save view state of the file we're leaving
    if (prevFile && prevFile !== activeFile) {
      const viewState = editor.saveViewState()
      if (viewState) {
        dispatch({ type: 'SET_FILE_VIEW_STATE', path: prevFile, viewState })
      }
    }

    prevFileRef.current = activeFile ?? null

    if (!activeFile) {
      editor.setModel(null)
      return
    }

    // Check if we already have a model for this file
    const uri = monaco.Uri.file(activeFile)
    let model = monaco.editor.getModel(uri)

    if (!model) {
      // Load the file content and create a new persistent model
      window.em.readFile(activeFile).then(content => {
        const lang = getLanguage(activeFile)
        const newModel = monaco.editor.createModel(content ?? '', lang, uri)
        editor.setModel(newModel)

        // Restore view state if we have one
        const savedState = fileStates[activeFile]?.viewState
        if (savedState) editor.restoreViewState(savedState)
        editor.focus()
      })
    } else {
      // Model exists (user switched back) — no reload, content preserved
      editor.setModel(model)
      const savedState = fileStates[activeFile]?.viewState
      if (savedState) editor.restoreViewState(savedState)
      editor.focus()
    }
  }, [activeFile])

  // Cleanup models for closed files
  useEffect(() => {
    const currentModels = monaco.editor.getModels()
    const openSet = new Set(state.openFiles)
    currentModels.forEach(m => {
      const filePath = m.uri.fsPath
      if (filePath && !openSet.has(filePath) && filePath !== activeFile) {
        m.dispose()
      }
    })
  }, [state.openFiles])

  const WelcomeScreen = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-main)] select-none z-20">
      <img src="/icon.png" alt="Exotic Matter Logo" className="w-[80px] h-[80px] rounded-3xl object-cover shadow-[0_10px_40px_rgba(107,140,255,0.2)] mb-6" />
      <div className="text-4xl font-black text-[var(--text-main)] opacity-10 tracking-tight mb-2">Exotic Matter</div>
      <div className="text-sm text-[var(--text-muted)] mb-8 opacity-60">AI-powered local IDE</div>
      <div className="flex flex-col space-y-2.5 text-[11px] font-mono">
        {[
          ['Open Folder', 'Ctrl+O'],
          ['Quick Open', 'Ctrl+P'],
          ['Command Palette', 'Ctrl+Shift+P'],
          ['Toggle AI Chat', 'Ctrl+L'],
        ].map(([label, shortcut]) => (
          <div key={label} className="flex justify-between w-56 text-[var(--text-muted)]">
            <span className="text-[var(--text-muted)] opacity-80">{label}</span>
            <span className="bg-[var(--bg-side)] px-1.5 py-0.5 rounded text-[var(--text-main)] opacity-60">{shortcut}</span>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="h-full w-full relative bg-[var(--bg-main)]">
      <div ref={containerRef} className="h-full w-full" />
      {!activeFile && <WelcomeScreen />}
    </div>
  )
}
