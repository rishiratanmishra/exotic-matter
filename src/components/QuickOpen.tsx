import React, { useState, useEffect, useRef } from 'react'
import { Search, FileCode, X } from 'lucide-react'

interface QuickOpenProps {
  workspacePath: string | null
  onSelect: (path: string) => void
  onClose: () => void
  initialQuery?: string
}

export default function QuickOpen({ workspacePath, onSelect, onClose, initialQuery = '' }: QuickOpenProps) {
  const [query, setQuery] = useState(initialQuery)
  const [files, setFiles] = useState<string[]>([])
  const [filtered, setFiltered] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const COMMANDS = [
    { label: 'Preferences: IDE Settings', category: 'Preferences', action: () => { onClose(); (window as any).dispatch({ type: 'SET_COMMAND_PALETTE', open: true }) } },
    { label: 'Preferences: Keyboard Shortcuts', category: 'Preferences', action: () => { setQuery('> Shortcut: ') } },
    { label: 'Preferences: Configure Snippets', category: 'Preferences', action: () => { setQuery('> Snippet: ') } },
    { label: 'Preferences: Color Theme', category: 'Preferences', action: () => { setQuery('> Theme: ') } },
    { label: 'Theme: Dark', category: 'Theme', action: () => { (window as any).dispatch({ type: 'SET_THEME', theme: 'dark' }); onClose() } },
    { label: 'Theme: Light', category: 'Theme', action: () => { (window as any).dispatch({ type: 'SET_THEME', theme: 'light' }); onClose() } },
    { label: 'Theme: Monokai', category: 'Theme', action: () => { (window as any).dispatch({ type: 'SET_THEME', theme: 'monokai' }); onClose() } },
    { label: 'Terminal: Toggle Terminal', category: 'Terminal', action: () => { (window as any).dispatch({ type: 'TOGGLE_TERMINAL' }); onClose() } },
    { label: 'View: Toggle Sidebar', category: 'View', action: () => { (window as any).dispatch({ type: 'TOGGLE_SIDEBAR' }); onClose() } },
    { label: 'View: Explorer', category: 'View', action: () => { (window as any).dispatch({ type: 'SET_ACTIVE_TAB', tab: 'explorer' }); (window as any).dispatch({ type: 'SET_SIDEBAR_OPEN', open: true }); onClose() } },
    { label: 'View: Search', category: 'View', action: () => { (window as any).dispatch({ type: 'SET_ACTIVE_TAB', tab: 'search' }); (window as any).dispatch({ type: 'SET_SIDEBAR_OPEN', open: true }); onClose() } },
    { label: 'Git: Status', category: 'Git', action: () => { (window as any).dispatch({ type: 'SET_ACTIVE_TAB', tab: 'git' }); (window as any).dispatch({ type: 'SET_SIDEBAR_OPEN', open: true }); onClose() } },
    { label: 'Tasks: Run Task', category: 'Tasks', action: () => {} },
    { label: 'File: Save', category: 'File', action: () => { window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'save' } })); onClose() } },
    { label: 'File: Save All', category: 'File', action: () => { window.dispatchEvent(new CustomEvent('em-command', { detail: { command: 'save-all' } })); onClose() } },
  ]

  useEffect(() => {
    const init = async () => {
      if (!workspacePath) return
      const all = await window.em.listAllFiles(workspacePath)
      setFiles(all)
      setFiltered(all.slice(0, 10))
    }
    init()
    if (inputRef.current) {
        inputRef.current.focus()
        // If initialQuery is provided, move cursor to the end
        inputRef.current.setSelectionRange(initialQuery.length, initialQuery.length)
    }
  }, [workspacePath, initialQuery])

  useEffect(() => {
    const search = () => {
      if (query.startsWith('>')) {
        const cmdQuery = query.slice(1).trim().toLowerCase()
        if (!cmdQuery) {
          setFiltered(COMMANDS.map(c => `cmd:${c.label}`) as any)
        } else {
          const matches = COMMANDS.filter(c => 
            c.label.toLowerCase().includes(cmdQuery) || 
            c.category.toLowerCase().includes(cmdQuery)
          )
          setFiltered(matches.map(c => `cmd:${c.label}`) as any)
        }
        setSelectedIndex(0)
        return
      }

      if (!query.trim()) {
        setFiltered(files.slice(0, 10))
        return
      }
      const lower = query.toLowerCase()
      const matches = files.filter(f => f.toLowerCase().includes(lower))
      setFiltered(matches.slice(0, 15))
      setSelectedIndex(0)
    }
    search()
  }, [query, files])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter') {
      const item = filtered[selectedIndex]
      if (item) {
        if (typeof item === 'string' && item.startsWith('cmd:')) {
            const label = item.replace('cmd:', '')
            const cmd = COMMANDS.find(c => c.label === label)
            if (cmd) cmd.action()
        } else {
            onSelect(item)
        }
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[10vh] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="w-[600px] bg-[#18181b] border border-[#27272a] rounded-xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] overflow-hidden relative animate-in slide-in-from-top-4 duration-300">
        <div className="p-4 border-b border-[#27272a] bg-[#09090b]/50">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b]" />
            <input 
              ref={inputRef}
              type="text"
              placeholder="Search files by name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-[#1e1e1e] border border-[#27272a] rounded-lg py-2.5 pl-10 pr-4 text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
            />
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
          {filtered.length > 0 ? (
            filtered.map((item, i) => {
              const isCommand = typeof item === 'string' && item.startsWith('cmd:')
              if (isCommand) {
                const label = (item as string).replace('cmd:', '')
                const cmd = COMMANDS.find(c => c.label === label)
                return (
                  <div 
                    key={item}
                    onClick={() => cmd?.action()}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                      i === selectedIndex ? 'bg-blue-600 text-white' : 'text-[#a1a1aa] hover:bg-[#27272a]'
                    }`}
                  >
                    <Search size={16} className={i === selectedIndex ? "text-white" : "text-[#52525b]"} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-bold truncate">{label}</span>
                      <span className={`text-[10px] truncate ${i === selectedIndex ? 'text-white/70' : 'text-[#52525b]'}`}>{cmd?.category}</span>
                    </div>
                  </div>
                )
              }

              const path = item as string
              const fileName = path.split(/[\\\/]/).pop() || path
              const relPath = workspacePath ? path.replace(workspacePath, '').replace(/^[\\\/]/, '') : path
              return (
                <div 
                  key={path}
                  onClick={() => onSelect(path)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                    i === selectedIndex ? 'bg-blue-600/10 text-white' : 'text-[#a1a1aa] hover:bg-[#27272a]'
                  }`}
                >
                  <FileCode size={16} className={i === selectedIndex ? "text-blue-400" : "text-[#52525b]"} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-bold truncate">{fileName}</span>
                    <span className="text-[10px] text-[#52525b] truncate">{relPath}</span>
                  </div>
                  {i === selectedIndex && (
                    <span className="ml-auto text-[10px] uppercase font-black tracking-widest text-blue-500/50">Enter to open</span>
                  )}
                </div>
              )
            })
          ) : (
            <div className="py-8 text-center text-[#52525b] italic text-[13px]">
              No files matched your search
            </div>
          )}
        </div>

        <div className="px-4 py-2 bg-[#09090b]/50 border-t border-[#27272a] flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#52525b]">Quick Open</span>
          <div className="flex items-center space-x-3 text-[9px] text-[#52525b]">
              <span className="bg-[#27272a] px-1.5 py-0.5 rounded border border-[#333333]">↑↓ Navigate</span>
              <span className="bg-[#27272a] px-1.5 py-0.5 rounded border border-[#333333]">Esc Close</span>
          </div>
        </div>
      </div>
    </div>
  )
}
