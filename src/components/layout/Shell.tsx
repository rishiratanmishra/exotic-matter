import React, { useEffect, useRef, useCallback } from 'react'
import MenuBarMenu from './MenuBarMenu'
import {
  Files, MessageSquare, Search, GitBranch, Sparkles, Settings,
  Terminal as TerminalIcon, X, Maximize2, Command, FileCode,
  Play, Plus, Layers, FilePlus, FolderPlus, RefreshCw, ChevronRight, Keyboard, Coffee, ClipboardList
} from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useIDE } from '../../context/IDEContext'
import Terminal from '../Terminal'
import FileExplorer from '../FileExplorer'
import Editor from '../Editor'
import SearchSidebar from '../sidebar/SearchSidebar'
import GitSidebar from '../sidebar/GitSidebar'
import DiffEditor from '../DiffEditor'
import QuickOpen from '../QuickOpen'
import CommandPalette from '../CommandPalette'
import Chat from '../Chat'
import InlineAIWidget from '@/components/InlineAIWidget'
import KeyboardShortcuts from '../KeyboardShortcuts'
import ExtensionDetails from '../ExtensionDetails'
import VibePanel from '../sidebar/VibePanel'
import PlanSidebar from '../sidebar/PlanSidebar'
import UIPreview from '../UIPreview'
import { Indexer } from '../../services/Indexer'
import { setIndexing } from '../../store/appSlice'
import { useDispatch as useReduxDispatch, useSelector } from 'react-redux'
import { RootState } from '../../store'

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'explorer', icon: Files, label: 'Explorer' },
  { id: 'search',   icon: Search, label: 'Search' },
  { id: 'git',      icon: GitBranch, label: 'Source Control' },
  { id: 'plan',     icon: ClipboardList, label: 'Implementation Plan' },
  { id: 'chat',     icon: 'custom-icon', label: 'Exotic Matter AI' },
  { id: 'extensions', icon: Layers, label: 'Extensions' },
  { id: 'vibe',    icon: Coffee, label: 'Vibe Mode' },
] as const

// ─── MenuBar ──────────────────────────────────────────────────────────────────
function MenuBar() {
  const { 
    state, dispatch, openFile, closeFile, openFolder, openIndividualFile, 
    closeFolder, saveFile, saveFileAs, saveAll, handleRunFile, 
    triggerCreateFile, triggerCreateFolder 
  } = useIDE()
  const { activeFile, theme } = state

  const fileMenuItems = [
    { label: 'New Text File', shortcut: 'Ctrl+N', onClick: () => {
      const fileName = `Untitled-${Date.now()}.txt`
      openFile(fileName) 
    } },
    { label: 'New File...', shortcut: 'Ctrl+Alt+Win+N', onClick: () => triggerCreateFile() },
    { label: 'New Window', shortcut: 'Ctrl+Shift+N', onClick: () => window.em.windowCreate() },
    {
      label: 'New Window with Profile',
      submenu: [
        { label: 'Default', onClick: () => window.em.windowCreate() },
        { label: 'Profile 1', onClick: () => window.em.windowCreate() },
      ]
    },
    { separator: true },
    { label: 'Open File...', shortcut: 'Ctrl+O', onClick: () => openIndividualFile() },
    { label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O', onClick: openFolder },
    { label: 'Open Workspace from File...', onClick: () => {} },
    {
      label: 'Open Recent',
      submenu: [
        { label: 'Reopen Closed Editor', shortcut: 'Ctrl+Shift+T', onClick: () => {} },
        { separator: true },
        { label: 'More...', onClick: () => {} },
      ]
    },
    { separator: true },
    { label: 'Add Folder to Workspace...', onClick: () => {} },
    { label: 'Save Workspace As...', onClick: () => {} },
    { label: 'Duplicate Workspace', onClick: () => {} },
    { separator: true },
    { label: 'Save', shortcut: 'Ctrl+S', disabled: !activeFile, onClick: () => activeFile && saveFile(activeFile) },
    { label: 'Save As...', shortcut: 'Ctrl+Shift+S', disabled: !activeFile, onClick: () => activeFile && saveFileAs(activeFile) },
    { label: 'Save All', shortcut: 'Ctrl+K S', onClick: () => saveAll() },
    { separator: true },
    { label: 'Share', submenu: [{ label: 'Export...', onClick: () => {} }] },
    { separator: true },
    { label: 'Auto Save', checked: state.autoSave, onClick: () => dispatch({ type: 'SET_AUTO_SAVE', enabled: !state.autoSave }) },
    {
      label: 'Preferences',
      submenu: [
        { label: 'IDE Settings', shortcut: 'Ctrl+,', onClick: () => dispatch({ type: 'SET_COMMAND_PALETTE', open: true }) },
        { label: 'Editor Settings', onClick: () => dispatch({ type: 'SET_COMMAND_PALETTE', open: true }) },
        { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S', onClick: () => openFile('settings:keyboard-shortcuts') },
        { label: 'Configure Snippets', onClick: () => dispatch({ type: 'SET_QUICK_OPEN', open: true, query: '> Snippets' }) },
        { separator: true },
        { label: 'Tasks', onClick: () => dispatch({ type: 'SET_QUICK_OPEN', open: true, query: '> Run Task' }) },
        { separator: true },
        { label: 'Themes', submenu: [
          { label: 'Dark', checked: theme === 'dark', onClick: () => dispatch({ type: 'SET_THEME', theme: 'dark' }) },
          { label: 'Light', checked: theme === 'light', onClick: () => dispatch({ type: 'SET_THEME', theme: 'light' }) },
          { label: 'Monokai', checked: theme === 'monokai', onClick: () => dispatch({ type: 'SET_THEME', theme: 'monokai' }) },
        ] },
        { separator: true },
        { label: 'Extensions', shortcut: 'Ctrl+Shift+X', onClick: () => { dispatch({ type: 'SET_ACTIVE_TAB', tab: 'extensions' }); dispatch({ type: 'SET_SIDEBAR_OPEN', open: true }) } },
        { label: 'Online Services Settings', onClick: () => {} },
      ]
    },
    { separator: true },
    { label: 'Revert File', disabled: !activeFile, onClick: () => {} },
    { label: 'Close Editor', shortcut: 'Ctrl+F4', disabled: !activeFile, onClick: () => activeFile && closeFile(activeFile) },
    { label: 'Close Folder', shortcut: 'Ctrl+K F', disabled: !state.workspacePath, onClick: () => dispatch({ type: 'SET_WORKSPACE', path: null }) },
    { label: 'Close Window', shortcut: 'Alt+F4', onClick: () => window.em.windowClose() },
  ]

  const editMenuItems = [
    { label: 'Undo', shortcut: 'Ctrl+Z', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'undo' } })) },
    { label: 'Redo', shortcut: 'Ctrl+Y', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'redo' } })) },
    { separator: true },
    { label: 'Cut', shortcut: 'Ctrl+X', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'cut' } })) },
    { label: 'Copy', shortcut: 'Ctrl+C', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'copy' } })) },
    { label: 'Paste', shortcut: 'Ctrl+V', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'paste' } })) },
    { separator: true },
    { label: 'Find', shortcut: 'Ctrl+F', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'find' } })) },
    { label: 'Replace', shortcut: 'Ctrl+H', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'replace' } })) },
    { separator: true },
    { label: 'Find in Files', shortcut: 'Ctrl+Shift+F', onClick: () => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'search' }) },
    { label: 'Replace in Files', shortcut: 'Ctrl+Shift+H', onClick: () => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'search' }) },
    { separator: true },
    { label: 'Toggle Line Comment', shortcut: 'Ctrl+/', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'toggle-line-comment' } })) },
    { label: 'Toggle Block Comment', shortcut: 'Shift+Alt+A', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'toggle-block-comment' } })) },
    { label: 'Emmet: Expand Abbreviation', shortcut: 'Tab', disabled: !activeFile, onClick: () => {} },
  ]

  const selectionMenuItems = [
    { label: 'Select All', shortcut: 'Ctrl+A', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'select-all' } })) },
    { label: 'Expand Selection', shortcut: 'Shift+Alt+Right', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'expand-selection' } })) },
    { label: 'Shrink Selection', shortcut: 'Shift+Alt+Left', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'shrink-selection' } })) },
    { separator: true },
    { label: 'Copy Line Up', shortcut: 'Shift+Alt+Up', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'copy-line-up' } })) },
    { label: 'Copy Line Down', shortcut: 'Shift+Alt+Down', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'copy-line-down' } })) },
    { label: 'Move Line Up', shortcut: 'Alt+Up', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'move-line-up' } })) },
    { label: 'Move Line Down', shortcut: 'Alt+Down', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'move-line-down' } })) },
    { label: 'Duplicate Selection', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'duplicate-selection' } })) },
    { separator: true },
    { label: 'Add Cursor Above', shortcut: 'Ctrl+Alt+Up', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'add-cursor-above' } })) },
    { label: 'Add Cursor Below', shortcut: 'Ctrl+Alt+Down', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'add-cursor-below' } })) },
    { label: 'Add Cursors to Line Ends', shortcut: 'Shift+Alt+I', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'add-cursors-to-line-ends' } })) },
    { label: 'Add Next Occurrence', shortcut: 'Ctrl+D', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'add-next-occurrence' } })) },
    { label: 'Add All Occurrences', shortcut: 'Ctrl+Shift+L', disabled: !activeFile, onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'add-all-occurrences' } })) },
    { separator: true },
    { label: 'Switch to Column Selection Mode', disabled: !activeFile, onClick: () => {} },
  ]

  const viewMenuItems = [
    { label: 'Appearance', submenu: [
      { label: 'Full Screen', shortcut: 'F11', onClick: () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); } },
      { label: 'Zen Mode', shortcut: 'Ctrl+K Z', checked: state.zenMode, onClick: () => dispatch({ type: 'TOGGLE_ZEN_MODE' }) },
      { label: 'Centered Layout', onClick: () => {} },
      { separator: true },
      { label: 'Menu Bar', checked: !state.zenMode, onClick: () => {} },
      { label: 'Primary Side Bar', checked: state.sidebarOpen, onClick: () => dispatch({ type: 'TOGGLE_SIDEBAR' }) },
      { label: 'Secondary Side Bar', checked: false, onClick: () => {} },
      { label: 'Panel', checked: state.terminalOpen, onClick: () => dispatch({ type: 'TOGGLE_TERMINAL' }) },
      { label: 'Status Bar', checked: !state.zenMode, onClick: () => {} },
    ]},
    { label: 'Editor Layout', submenu: [
      { label: 'Split Up', onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'split-up' } })) },
      { label: 'Split Down', onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'split-down' } })) },
      { label: 'Split Left', onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'split-left' } })) },
      { label: 'Split Right', onClick: () => window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'split-right' } })) },
      { separator: true },
      { label: 'Single', onClick: () => {} },
      { label: 'Two Columns', onClick: () => {} },
    ]},
    { separator: true },
    { label: 'Explorer', shortcut: 'Ctrl+Shift+E', onClick: () => { dispatch({ type: 'SET_ACTIVE_TAB', tab: 'explorer' }); dispatch({ type: 'SET_SIDEBAR_OPEN', open: true }) } },
    { label: 'Search', shortcut: 'Ctrl+Shift+F', onClick: () => { dispatch({ type: 'SET_ACTIVE_TAB', tab: 'search' }); dispatch({ type: 'SET_SIDEBAR_OPEN', open: true }) } },
    { label: 'Source Control', shortcut: 'Ctrl+Shift+G', onClick: () => { dispatch({ type: 'SET_ACTIVE_TAB', tab: 'git' }); dispatch({ type: 'SET_SIDEBAR_OPEN', open: true }) } },
    { label: 'Extensions', shortcut: 'Ctrl+Shift+X', onClick: () => { dispatch({ type: 'SET_ACTIVE_TAB', tab: 'extensions' }); dispatch({ type: 'SET_SIDEBAR_OPEN', open: true }) } },
  ]

  const goMenuItems = [
    { label: 'Back', shortcut: 'Alt+Left', onClick: () => {} },
    { label: 'Forward', shortcut: 'Alt+Right', onClick: () => {} },
    { separator: true },
    { label: 'Go to File...', shortcut: 'Ctrl+P', onClick: () => dispatch({ type: 'SET_QUICK_OPEN', open: true }) },
  ]

  const runMenuItems = [
    { label: 'Start Debugging', shortcut: 'F5', disabled: !activeFile, onClick: () => {} },
    { label: 'Run Without Debugging', shortcut: 'Ctrl+F5', disabled: !activeFile, onClick: handleRunFile },
  ]

  const terminalMenuItems = [
    { label: 'New Terminal', shortcut: 'Ctrl+Shift+`', onClick: () => { dispatch({ type: 'SET_TERMINAL_OPEN', open: true }); window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'add-terminal' } })) } },
    { label: 'Split Terminal', shortcut: 'Ctrl+Shift+5', onClick: () => dispatch({ type: 'SET_SPLIT_TERMINAL', split: !state.splitTerminal }) },
  ]

  const helpMenuItems = [
    { label: 'Welcome', onClick: () => {} },
    { label: 'Documentation', onClick: () => {} },
    { label: 'About', onClick: () => {} },
  ]

  return (
    <>
      <style>{`
        @keyframes vibe-diagonal {
          0% { background-position: 100% 0%; }
          100% { background-position: 0% 100%; }
        }

        .vibe-party-dg {
          background: linear-gradient(135deg, 
            #050505 0%, 
            #3d0f0f 10%, 
            #050505 15%,
            #3d320f 25%, 
            #050505 30%,
            #1a0f1a 40%, 
            #050505 45%,
            #0f0a1e 55%, 
            #050505 60%,
            #0a1a1a 70%, 
            #050505 75%,
            #3d0f0f 85%
          ) !important;
          background-size: 600% 600% !important;
          animation: vibe-diagonal 15s ease-in-out infinite alternate !important;
          border-color: rgba(107, 140, 255, 0.1) !important;
        }

        .vibe-party-accent {
          background: linear-gradient(-45deg, #3a2a6e, #5e2a3e, #5e2a2a, #5e522a, #2a5e56, #3a2a6e) !important;
          background-size: 400% 400% !important;
          animation: vibe-diagonal 12s linear infinite alternate !important;
        }
      `}</style>

      <div className={cn(
        "h-[30px] flex items-center px-2 border-b border-[var(--border-main)] select-none drag z-50 flex-shrink-0 transition-all duration-700",
        state.activeFile === 'vibe:studio' ? "vibe-party-dg" : "bg-[var(--bg-side)]"
      )}>
        <div className="flex items-center space-x-3 no-drag shrink-0">
          <div className="flex items-center">
            <img src="/icon.png" alt="Exotic Matter" className="w-[18px] h-[18px] rounded-[5px] object-cover mr-2 shadow-sm" />
            <span className="text-[12px] font-bold text-[#f2f2f2] tracking-wide">Exotic Matter</span>
          </div>
          <div className="flex items-center space-x-0.5">
            <MenuBarMenu label="File" items={fileMenuItems} />
            <MenuBarMenu label="Edit" items={editMenuItems} />
            <MenuBarMenu label="Selection" items={selectionMenuItems} />
            <MenuBarMenu label="View" items={viewMenuItems} />
            <MenuBarMenu label="Go" items={goMenuItems} />
            <MenuBarMenu label="Run" items={runMenuItems} />
            <MenuBarMenu label="Terminal" items={terminalMenuItems} />
            <MenuBarMenu label="Help" items={helpMenuItems} />
          </div>
        </div>
        
        <div className="flex-1 flex justify-center no-drag px-4">
          <button
            onClick={() => dispatch({ type: 'SET_QUICK_OPEN', open: true })}
            className="w-[420px] max-w-full relative group"
          >
            <div className="flex items-center w-full bg-[var(--bg-explorer)] border border-[var(--border-main)] text-[11px] px-8 py-1 rounded-md text-[var(--text-muted)] group-hover:bg-[var(--bg-side)] group-hover:border-[var(--text-muted)] transition-all">
              <Search size={11} className="absolute left-2.5 text-[var(--text-muted)]" />
              <span className="flex-1 text-center">Search files (Ctrl+P)</span>
              <kbd className="text-[9px] bg-[var(--bg-main)] px-1 rounded text-[var(--text-muted)]">Ctrl+P</kbd>
            </div>
          </button>
        </div>

        <div className="flex items-center space-x-1 no-drag shrink-0">
          {activeFile && !activeFile.startsWith('diff:') && (
            <button onClick={handleRunFile} className="px-2 py-1 flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 rounded transition-all mr-1">
              <Play size={12} fill="currentColor" />
              <span className="text-[10px] font-bold">Run</span>
            </button>
          )}
          <button onClick={() => window.em.windowMinimize()} className="w-8 h-[30px] flex items-center justify-center hover:bg-[var(--border-main)] transition-colors" title="Minimize">
            <span className="text-[var(--text-muted)] text-lg leading-none mb-1">–</span>
          </button>
          <button onClick={() => window.em.windowMaximize()} className="w-8 h-[30px] flex items-center justify-center hover:bg-[var(--border-main)] transition-colors" title="Maximize">
            <Maximize2 size={11} className="text-[var(--text-muted)]" />
          </button>
          <button onClick={() => window.em.windowClose()} className="w-8 h-[30px] flex items-center justify-center hover:bg-red-600 transition-colors group" title="Close">
            <X size={13} className="text-[var(--text-muted)] group-hover:text-white" />
          </button>
        </div>
      </div>
    </>
  )
}

export default function Shell() {
  const { 
    state, dispatch, openFile, closeFile, openFolder, 
    openIndividualFile, saveFile, saveFileAs, saveAll 
  } = useIDE()

  useEffect(() => {
    (window as any).dispatch = dispatch;
    (window as any).state = state;
  }, [dispatch, state])

  const {
    activeTab, sidebarOpen, sidebarWidth, workspacePath, terminalOpen, terminalHeight,
    terminals, activeTerminalId, splitTerminal, quickOpen, quickOpenQuery,
    openFiles, activeFile, chatOpen, chatWidth, commandPaletteOpen, fileStates
  } = state

  const reduxDispatch = useReduxDispatch();
  const reduxAppState = useSelector((state: RootState) => state.app);

  const handleIndexProject = useCallback(async () => {
    if (!workspacePath) return;
    reduxDispatch(setIndexing({ isIndexing: true, progress: 0 }));
    await Indexer.indexWorkspace(workspacePath, (current, total) => {
      reduxDispatch(setIndexing({ isIndexing: true, progress: Math.round((current / total) * 100) }));
    });
    reduxDispatch(setIndexing({ isIndexing: false, progress: 100 }));
  }, [workspacePath, reduxDispatch]);

  const [inlineAI, setInlineAI] = React.useState<{ text: string; filePath: string } | null>(null)
  const [resizing, setResizing] = React.useState<'sidebar' | 'chat' | 'terminal' | null>(null)
  const [newItemState, setNewItemState] = React.useState<{ type: 'file' | 'folder'; parentPath: string } | null>(null)
  const newItemInputRef = useRef<HTMLInputElement>(null)

  function handleCreateFile() {
    if (!workspacePath) return
    setNewItemState({ type: 'file', parentPath: workspacePath })
    requestAnimationFrame(() => newItemInputRef.current?.focus())
  }

  function handleCreateFolder() {
    if (!workspacePath) return
    setNewItemState({ type: 'folder', parentPath: workspacePath })
    requestAnimationFrame(() => newItemInputRef.current?.focus())
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey
      const isShift = e.shiftKey
      const key = e.key.toLowerCase()

      if (isCtrl) {
        switch (key) {
          case 'n':
            e.preventDefault()
            if (isShift) window.em.windowCreate()
            else {
              const fileName = `Untitled-${Date.now()}.txt`
              openFile(fileName)
            }
            break
          case 'o':
            e.preventDefault()
            if (isShift) {}
            else openIndividualFile()
            break
          case 's':
            e.preventDefault()
            if (isShift) { if (activeFile) saveFileAs(activeFile) }
            else { if (activeFile) saveFile(activeFile) }
            break
          case 'p':
            e.preventDefault()
            if (isShift) dispatch({ type: 'SET_COMMAND_PALETTE', open: true })
            else dispatch({ type: 'SET_QUICK_OPEN', open: true })
            break
          case 'b': e.preventDefault(); dispatch({ type: 'TOGGLE_SIDEBAR' }); break
          case 'j': e.preventDefault(); dispatch({ type: 'TOGGLE_TERMINAL' }); break
          case 'l': e.preventDefault(); e.stopPropagation(); dispatch({ type: 'TOGGLE_CHAT' }); break
          case 'i': 
            if (isShift) {
              e.preventDefault();
              handleIndexProject();
            }
            break
          case 'w': e.preventDefault(); if (activeFile) closeFile(activeFile); break
          case '`': e.preventDefault(); dispatch({ type: 'TOGGLE_TERMINAL' }); break
        }

        if (key === 'k') {
          const chordHandler = (ke: KeyboardEvent) => {
            const k = ke.key.toLowerCase()
            if (k === 's') { ke.preventDefault(); saveAll() }
            if (k === 'o') { ke.preventDefault(); openFolder() }
            if (k === 'f') { ke.preventDefault(); dispatch({ type: 'SET_WORKSPACE', path: null }) }
            if (k === 'z') { ke.preventDefault(); dispatch({ type: 'TOGGLE_ZEN_MODE' }) }
            window.removeEventListener('keydown', chordHandler)
          }
          window.addEventListener('keydown', chordHandler, { once: true })
          setTimeout(() => window.removeEventListener('keydown', chordHandler), 1000)
        }
      }

      if (e.key === 'Escape') {
        dispatch({ type: 'SET_COMMAND_PALETTE', open: false })
        dispatch({ type: 'SET_QUICK_OPEN', open: false })
        setInlineAI(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeFile, openFolder, closeFile, openIndividualFile, saveFile, saveFileAs, saveAll, dispatch])

  useEffect(() => {
    const handler = (e: any) => {
      const { command, tab } = e.detail || {}
      if (command === 'create-file') handleCreateFile()
      if (command === 'create-folder') handleCreateFolder()
      if (command === 'add-terminal') addTerminal()
      if (command === 'switch-tab' && tab) dispatch({ type: 'SET_ACTIVE_TAB', tab })
    }
    window.addEventListener('em-command', handler)
    return () => window.removeEventListener('em-command', handler)
  }, [handleCreateFile, handleCreateFolder])

  const handleTerminalResizeDrag = useCallback((e: React.MouseEvent) => {
    const startY = e.clientY
    const startHeight = terminalHeight
    setResizing('terminal')
    const onMove = (me: MouseEvent) =>
      dispatch({ type: 'SET_TERMINAL_HEIGHT', height: startHeight + (startY - me.clientY) })
    const onUp = () => {
      setResizing(null)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [terminalHeight, dispatch])

  const handleSidebarResizeDrag = useCallback((e: React.MouseEvent) => {
    const startX = e.clientX
    const startWidth = sidebarWidth
    setResizing('sidebar')
    const onMove = (me: MouseEvent) =>
      dispatch({ type: 'SET_SIDEBAR_WIDTH', width: startWidth + (me.clientX - startX) })
    const onUp = () => {
      setResizing(null)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [sidebarWidth, dispatch])

  const handleChatResizeDrag = useCallback((e: React.MouseEvent) => {
    const startX = e.clientX
    const startWidth = chatWidth
    setResizing('chat')
    const onMove = (me: MouseEvent) =>
      dispatch({ type: 'SET_CHAT_WIDTH', width: startWidth + (startX - me.clientX) })
    const onUp = () => {
      setResizing(null)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [chatWidth, dispatch])

  function addTerminal() {
    const id = Date.now()
    const label = `Terminal ${terminals.length + 1}`
    dispatch({ type: 'ADD_TERMINAL', terminal: { id, label } })
  }

  const submitNewItem = async (name: string) => {
    if (!name.trim() || !newItemState) { setNewItemState(null); return }
    const fullPath = `${newItemState.parentPath}/${name.trim()}`
    if (newItemState.type === 'file') {
      await window.em.createFile(fullPath)
      openFile(fullPath)
    } else {
      await window.em.createDirectory(fullPath)
    }
    setNewItemState(null)
    ;(window as any).refreshExplorer?.()
  }

  const handleShowDiff = (path: string) => {
    const diffPath = `diff:${path}`
    openFile(diffPath)
  }

  const renderBreadcrumbs = () => {
    if (!activeFile) return null
    const isDiff = activeFile.startsWith('diff:')
    const filePath = isDiff ? activeFile.replace('diff:', '') : activeFile
    const base = workspacePath ? filePath.replace(workspacePath, '').replace(/^[\\/]/, '') : filePath
    const parts = base.split(/[/\\]/).filter(Boolean)
    return (
      <div className="h-[24px] bg-[var(--bg-main)] flex items-center px-4 space-x-1 text-[10px] border-b border-[var(--border-main)] text-[var(--text-muted)] font-medium flex-shrink-0">
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight size={10} className="text-[var(--border-main)]" />}
            <span className={cn('hover:text-[var(--text-main)] cursor-pointer transition-colors', i === parts.length - 1 && 'text-[var(--text-muted)] opacity-80')}>
              {part}
            </span>
          </React.Fragment>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--bg-main)] text-[var(--text-main)] font-outfit overflow-hidden">
      {!state.zenMode && <MenuBar />}

      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        {!state.zenMode && (
          <div className={cn(
            "w-[48px] flex flex-col items-center py-3 border-r border-[var(--border-main)] z-30 flex-shrink-0 transition-all duration-700 select-none",
            activeFile === 'vibe:studio' ? "vibe-party-dg" : "bg-[var(--bg-side)]"
          )}>
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'chat') {
                    dispatch({ type: 'TOGGLE_CHAT' })
                  } else if (item.id === 'vibe') {
                    // Open Vibe Mode as a special full-area panel
                    openFile('vibe:studio')
                    dispatch({ type: 'SET_SIDEBAR_OPEN', open: false })
                  } else if (activeTab === item.id && sidebarOpen) {
                    dispatch({ type: 'TOGGLE_SIDEBAR' })
                  } else {
                    dispatch({ type: 'SET_ACTIVE_TAB', tab: item.id as any })
                    if (!sidebarOpen) dispatch({ type: 'SET_SIDEBAR_OPEN', open: true })
                  }
                }}
                className={cn(
                  'p-3 mb-1 cursor-pointer transition-all duration-200 group relative rounded-md w-9',
                  (item.id !== 'chat' && item.id !== 'vibe' && activeTab === item.id && sidebarOpen)
                  || (item.id === 'vibe' && activeFile === 'vibe:studio')
                  || (item.id === 'chat' && chatOpen)
                    ? 'text-[#6b8cff] bg-[#6b8cff]/10'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-main)]'
                )}
                title={item.label}
              >
                {item.icon === 'custom-icon' ? (
                  <img src="/icon.png" alt="Exotic Matter Logo" className={cn("w-5 h-5 rounded-md object-cover transition-all shadow-md shadow-[#6b8cff]/10", chatOpen ? "ring-1 ring-[#6b8cff]/50 scale-105" : "opacity-80 group-hover:opacity-100")} />
                ) : (
                  <item.icon size={20} strokeWidth={1.5} />
                )}
                {((item.id !== 'chat' && item.id !== 'vibe' && activeTab === item.id && sidebarOpen)
                || (item.id === 'vibe' && activeFile === 'vibe:studio')
                || (item.id === 'chat' && chatOpen)) && (
                  <div className="absolute left-0.5 top-2 bottom-2 w-[2px] bg-[#6b8cff] rounded-full" />
                )}
              </button>
            ))}
            <div className="mt-auto pb-3">
              <button
                onClick={() => dispatch({ type: 'SET_COMMAND_PALETTE', open: true })}
                className="p-3 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-main)] transition-colors rounded-md w-9"
                title="Settings / Command Palette"
              >
                <Settings size={20} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        {/* Sidebar Panel */}
        {!state.zenMode && sidebarOpen && (
          <div 
            style={{ width: sidebarWidth ?? 260 }}
            className={cn(
              "border-r border-[var(--border-main)] flex flex-col flex-shrink-0 animate-in slide-in-from-left duration-150 relative transition-all duration-700",
              activeFile === 'vibe:studio' ? "vibe-party-dg" : "bg-[var(--bg-side)]",
              resizing && "pointer-events-none"
            )}
          >
            {/* Horizontal Resizer (Right side of sidebar) */}
            <div 
              onMouseDown={handleSidebarResizeDrag}
              className="absolute top-0 bottom-0 -right-[2px] w-[4px] cursor-ew-resize hover:bg-blue-500/30 transition-colors z-20 pointer-events-auto"
            />
            <div className="h-[34px] flex items-center px-3 justify-between border-b border-[var(--border-main)] flex-shrink-0">
              <span className="text-[9px] uppercase tracking-[0.18em] font-black text-[var(--text-muted)]">{activeTab}</span>
              {activeTab === 'explorer' && (
                <div className="flex items-center space-x-0.5">
                  <button onClick={handleCreateFile} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded transition-colors" title="New File"><FilePlus size={13} /></button>
                  <button onClick={handleCreateFolder} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded transition-colors" title="New Folder"><FolderPlus size={13} /></button>
                  <button onClick={() => (window as any).refreshExplorer?.()} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded transition-colors" title="Refresh"><RefreshCw size={13} /></button>
                </div>
              )}
            </div>

            {newItemState && (
              <div className="px-2 py-1 border-b border-[var(--border-main)]">
                <input
                  ref={newItemInputRef}
                  autoFocus
                  className="w-full bg-[var(--bg-explorer)] text-[var(--text-main)] text-xs px-2 py-1 rounded outline-none border border-blue-500/50 placeholder:text-[var(--text-muted)]"
                  placeholder={newItemState.type === 'file' ? 'filename.ts' : 'folder-name'}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitNewItem(e.currentTarget.value)
                    if (e.key === 'Escape') setNewItemState(null)
                  }}
                  onBlur={e => submitNewItem(e.currentTarget.value)}
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {activeTab === 'explorer' ? (
                <FileExplorer workspacePath={workspacePath} onFileSelect={openFile} />
              ) : activeTab === 'search' ? (
                <SearchSidebar workspacePath={workspacePath} onResultClick={openFile} />
              ) : activeTab === 'git' ? (
                <GitSidebar workspacePath={workspacePath} onShowDiff={handleShowDiff} />
              ) : activeTab === 'plan' ? (
                <PlanSidebar />
              ) : activeTab === 'extensions' ? (
                <ExtensionsSidebar />
              ) : activeTab === 'vibe' ? (
                <VibePanel />
              ) : null}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {!state.zenMode && openFiles.length > 0 && (
            <div className="h-[34px] bg-[var(--bg-main)] flex items-center border-b border-[var(--border-main)] overflow-x-auto no-scrollbar flex-shrink-0">
              {openFiles.map(path => {
                const isKeyboardShortcuts = path === 'settings:keyboard-shortcuts'
                const isVibe = path === 'vibe:studio'
                const isDiff = path.startsWith('diff:')
                const actualPath = isDiff ? path.replace('diff:', '') : path
                const fileName = isKeyboardShortcuts ? 'Keyboard Shortcuts' : isVibe ? '⚡ Vibe Mode' : (actualPath.split(/[/\\]/).pop() ?? actualPath)
                const isDirty = !isDiff && !isKeyboardShortcuts && !isVibe && fileStates[path]?.isDirty
                return (
                  <div
                    key={path}
                    onClick={() => dispatch({ type: 'SET_ACTIVE_FILE', path })}
                    className={cn(
                      'h-full flex items-center px-3 space-x-2 border-r border-[var(--border-main)] cursor-pointer transition-colors min-w-fit group',
                      activeFile === path
                        ? 'bg-[var(--bg-main)] border-t-2 border-t-blue-500/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                        : 'bg-[var(--bg-tab-inactive)] text-[var(--text-muted)] hover:bg-[var(--bg-explorer)]'
                    )}
                  >
                    {isKeyboardShortcuts 
                      ? <Keyboard size={11} className="text-blue-400 flex-shrink-0" />
                      : isVibe
                        ? <Coffee size={11} className="text-[#6b8cff] flex-shrink-0" />
                        : isDiff
                          ? <GitBranch size={11} className="text-amber-400 flex-shrink-0" />
                          : path.startsWith('extension:')
                            ? <Layers size={11} className="text-blue-400 flex-shrink-0" />
                            : <FileCode size={11} className={activeFile === path ? 'text-blue-400 flex-shrink-0' : 'text-[var(--text-muted)] flex-shrink-0'} />
                    }
                    <span className={cn('text-[12px] truncate max-w-[130px]', isDiff && 'italic text-amber-400/70', path.startsWith('extension:') && 'font-bold')}>
                      {isDirty && <span className="text-amber-400 mr-1">●</span>}
                      {isDiff ? `diff: ${fileName}` : (path.startsWith('extension:') ? `Extension: ${path.split(':').pop()}` : fileName)}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); closeFile(path) }}
                      className="opacity-0 group-hover:opacity-100 hover:bg-[var(--border-main)] rounded p-0.5 flex-shrink-0 transition-all"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {!state.zenMode && renderBreadcrumbs()}

          <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
            <div className="flex-1 overflow-hidden relative">
              {/* Vibe Mode Persistence: Keep mounted in background so music doesn't stop */}
              {openFiles.includes('vibe:studio') && (
                <div className={cn("absolute inset-0 z-10", activeFile !== 'vibe:studio' && "invisible pointer-events-none")}>
                  <VibePanel />
                </div>
              )}

              {activeFile === 'settings:keyboard-shortcuts' ? (
                <KeyboardShortcuts />
              ) : activeFile === 'vibe:studio' ? (
                null
              ) : activeFile?.startsWith('diff:') ? (
                <DiffEditor path={activeFile.replace('diff:', '')} workspacePath={workspacePath} />
              ) : activeFile?.startsWith('extension:') ? (
                <ExtensionDetails id={activeFile.split(':').pop() || ''} />
              ) : (
                <Editor onInlineAIRequest={(text, filePath) => setInlineAI({ text, filePath })} />
              )}
            </div>

            {inlineAI && (
              <InlineAIWidget
                selectedText={inlineAI.text}
                filePath={inlineAI.filePath}
                onClose={() => setInlineAI(null)}
              />
            )}

            {!state.zenMode && terminalOpen && (
              <div style={{ height: terminalHeight }} className="border-t border-[var(--border-main)] flex flex-col min-h-0 bg-[var(--bg-main)] flex-shrink-0">
                <div onMouseDown={handleTerminalResizeDrag} className="h-[4px] -mt-[2px] w-full cursor-ns-resize hover:bg-blue-500/50 transition-colors z-10 flex-shrink-0" />
                <div className="h-[34px] bg-[var(--bg-side)] px-3 flex items-center justify-between border-b border-[var(--border-main)] flex-shrink-0">
                  <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar">
                    {terminals.map(term => (
                      <div
                        key={term.id}
                        onClick={() => dispatch({ type: 'SET_ACTIVE_TERMINAL', id: term.id })}
                        className={cn(
                          'flex items-center space-x-2 cursor-pointer pb-1 mt-1 border-b-2 transition-all whitespace-nowrap',
                          activeTerminalId === term.id ? 'border-[var(--text-main)] text-[var(--text-main)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        )}
                      >
                        <TerminalIcon size={11} />
                        <span className="text-[10px] font-bold tracking-wide">{term.label}</span>
                        <button onClick={e => { e.stopPropagation(); dispatch({ type: 'CLOSE_TERMINAL', id: term.id }) }} className="hover:bg-[var(--border-main)] rounded p-0.5 transition-colors">
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    <button onClick={addTerminal} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors" title="New Terminal">
                      <Plus size={13} />
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => dispatch({ type: 'SET_SPLIT_TERMINAL', split: !splitTerminal })} className={cn('p-1.5 rounded hover:bg-[var(--border-main)] transition-colors', splitTerminal && 'text-blue-400 bg-blue-500/10')} title="Split Terminal">
                      <Layers size={13} />
                    </button>
                    <button onClick={() => dispatch({ type: 'TOGGLE_TERMINAL' })} className="p-1.5 hover:bg-[var(--border-main)] rounded transition-colors" title="Close Terminal">
                      <X size={13} />
                    </button>
                  </div>
                </div>

                <div className={cn('flex-1 overflow-hidden', splitTerminal ? 'flex' : 'block')}>
                  {splitTerminal ? (
                    <>
                      <div className="flex-1 min-w-0 border-r border-[var(--border-main)]">
                        <Terminal id={activeTerminalId} isActive={true} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Terminal id={terminals.find(t => t.id !== activeTerminalId)?.id ?? terminals[0]?.id ?? 0} isActive={false} />
                      </div>
                    </>
                  ) : (
                    <Terminal id={activeTerminalId} isActive={true} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {!state.zenMode && chatOpen && (
          <div 
            style={{ width: chatWidth ?? 380 }}
            className={cn(
              "bg-[var(--bg-side)] border-l border-[var(--border-main)] flex flex-col flex-shrink-0 animate-in slide-in-from-right duration-150 relative",
              resizing && "pointer-events-none"
            )}
          >
            {/* Horizontal Resizer (Left side of chat) */}
            <div 
              onMouseDown={handleChatResizeDrag}
              className="absolute top-0 bottom-0 -left-[2px] w-[4px] cursor-ew-resize hover:bg-blue-500/30 transition-colors z-20 pointer-events-auto"
            />
            <Chat />
          </div>
        )}

        <UIPreview />
      </div>

      {!state.zenMode && (
        <div className="h-[22px] bg-[var(--bg-side)] border-t border-[var(--border-main)] flex items-center justify-between px-3 text-[10px] text-[var(--text-muted)] flex-shrink-0 z-50 select-none">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <Sparkles size={11} className={cn(reduxAppState.isIndexing && "animate-spin text-blue-400")} />
              {reduxAppState.isIndexing ? (
                <span className="text-blue-400 font-medium">Indexing Project: {reduxAppState.indexingProgress}%</span>
              ) : (
                <span>Exotic Matter Local AI Ready</span>
              )}
            </div>
            {workspacePath && (
              <div className="flex items-center space-x-1.5 opacity-80 hover:opacity-100 cursor-pointer">
                <FolderPlus size={11} />
                <span>{workspacePath.split(/[\\/]/).pop()}</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {activeFile && (
              <div className="flex items-center space-x-1.5">
                <FileCode size={11} />
                <span>{activeFile.split(/[\\/]/).pop()}</span>
              </div>
            )}
            <div className="flex items-center space-x-1 hover:text-[var(--text-main)] cursor-pointer">
              <Layers size={11} />
              <span>UTF-8</span>
            </div>
          </div>
        </div>
      )}

      {/* Global Resizing Overlay */}
      {resizing && (
        <div className="fixed inset-0 z-50 cursor-ew-resize select-none" style={{ cursor: resizing === 'terminal' ? 'ns-resize' : 'ew-resize' }} />
      )}

      {quickOpen && (
        <QuickOpen
          workspacePath={workspacePath}
          initialQuery={quickOpenQuery}
          onSelect={path => { openFile(path); dispatch({ type: 'SET_QUICK_OPEN', open: false }) }}
          onClose={() => dispatch({ type: 'SET_QUICK_OPEN', open: false })}
        />
      )}

      {commandPaletteOpen && (
        <CommandPalette onClose={() => dispatch({ type: 'SET_COMMAND_PALETTE', open: false })} />
      )}
    </div>
  )
}
