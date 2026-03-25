import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Command, FileCode, Settings, Terminal as TerminalIcon, Play, RefreshCw, X } from 'lucide-react'
import { useIDE } from '../context/IDEContext'

interface CommandItem {
  id: string
  label: string
  description?: string
  shortcut?: string
  category: string
  icon?: React.ReactNode
  action: () => void
}

interface CommandPaletteProps {
  onClose: () => void
}

export default function CommandPalette({ onClose }: CommandPaletteProps) {
  const { state, dispatch, openFile, closeFile, openFolder } = useIDE()
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Build command list dynamically
  const commands: CommandItem[] = [
    {
      id: 'open-folder',
      label: 'Open Folder',
      description: 'Open a workspace folder',
      shortcut: 'Ctrl+O',
      category: 'Workspace',
      icon: <FileCode size={14} />,
      action: openFolder,
    },
    {
      id: 'close-folder',
      label: 'Close Folder',
      description: 'Close the current workspace',
      category: 'Workspace',
      action: () => dispatch({ type: 'SET_WORKSPACE', path: null }),
    },
    {
      id: 'toggle-sidebar',
      label: 'Toggle Sidebar',
      shortcut: 'Ctrl+B',
      category: 'View',
      action: () => dispatch({ type: 'TOGGLE_SIDEBAR' }),
    },
    {
      id: 'toggle-terminal',
      label: 'Toggle Terminal',
      shortcut: 'Ctrl+J',
      category: 'View',
      icon: <TerminalIcon size={14} />,
      action: () => dispatch({ type: 'TOGGLE_TERMINAL' }),
    },
    {
      id: 'toggle-chat',
      label: 'Toggle AI Chat',
      shortcut: 'Ctrl+L',
      category: 'View',
      action: () => dispatch({ type: 'TOGGLE_CHAT' }),
    },
    {
      id: 'new-terminal',
      label: 'New Terminal',
      shortcut: 'Ctrl+Shift+`',
      category: 'Terminal',
      action: () => {
        const id = Date.now()
        const count = state.terminals.length + 1
        dispatch({ type: 'ADD_TERMINAL', terminal: { id, label: `Terminal ${count}` } })
      },
    },
    {
      id: 'theme-dark',
      label: 'Theme: Dark',
      category: 'Appearance',
      action: () => dispatch({ type: 'SET_THEME', theme: 'dark' }),
    },
    {
      id: 'theme-light',
      label: 'Theme: Light',
      category: 'Appearance',
      action: () => dispatch({ type: 'SET_THEME', theme: 'light' }),
    },
    {
      id: 'theme-monokai',
      label: 'Theme: Monokai',
      category: 'Appearance',
      action: () => dispatch({ type: 'SET_THEME', theme: 'monokai' }),
    },
    ...(state.activeFile
      ? [
          {
            id: 'close-tab',
            label: 'Close Active Tab',
            shortcut: 'Ctrl+W',
            category: 'Editor',
            action: () => closeFile(state.activeFile!),
          },
        ]
      : []),
    // File items from workspace
    ...state.allFiles.slice(0, 200).map(f => ({
      id: `file:${f}`,
      label: f.split(/[/\\]/).pop() ?? f,
      description: f,
      category: 'Files',
      icon: <FileCode size={14} />,
      action: () => openFile(f),
    })),
  ]

  const filtered = query.trim()
    ? commands.filter(
        c =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase()) ||
          c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands.filter(c => c.category !== 'Files')

  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const runSelected = useCallback(() => {
    const item = filtered[selectedIdx]
    if (item) {
      item.action()
      onClose()
    }
  }, [filtered, selectedIdx, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      runSelected()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  // Group filtered by category
  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const flatItems = Object.values(grouped).flat()

  return (
    <div
      className="fixed inset-0 z-[500] flex items-start justify-center pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="w-[620px] max-w-[95vw] bg-[#141417] border border-[#2a2a2d] rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-[#1e1e21]">
          <Search size={15} className="text-[#52525b] mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands and files..."
            className="flex-1 bg-transparent text-white text-[13px] outline-none placeholder:text-[#404047]"
          />
          <kbd className="text-[9px] bg-[#27272a] text-[#555] px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-1">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-[#383840]">
                {category}
              </div>
              {items.map(item => {
                const globalIdx = flatItems.indexOf(item)
                const isSelected = globalIdx === selectedIdx
                return (
                  <div
                    key={item.id}
                    onClick={() => { item.action(); onClose() }}
                    onMouseEnter={() => setSelectedIdx(globalIdx)}
                    className={`flex items-center px-4 py-2 cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#2563eb]/20' : 'hover:bg-[#1e1e21]'
                    }`}
                  >
                    <div className={`mr-3 ${isSelected ? 'text-blue-400' : 'text-[#555]'}`}>
                      {item.icon ?? <Command size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] truncate ${isSelected ? 'text-white' : 'text-[#c4c4c8]'}`}>
                        {item.label}
                      </div>
                      {item.description && item.description !== item.label && (
                        <div className="text-[10px] text-[#404047] truncate">{item.description}</div>
                      )}
                    </div>
                    {item.shortcut && (
                      <kbd className="text-[9px] bg-[#1e1e21] text-[#404047] px-1.5 py-0.5 rounded font-mono ml-2 flex-shrink-0">
                        {item.shortcut}
                      </kbd>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-[#383840] text-sm">No results for "{query}"</div>
          )}
        </div>
      </div>
    </div>
  )
}
