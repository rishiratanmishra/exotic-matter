import React, { useState } from 'react'
import { Search, Keyboard, Info, Command } from 'lucide-react'

const SHORTCUTS = [
  { command: 'Accept Inline Completion', keybinding: 'Ctrl + /', when: 'accessibleViewIsShown && accessibleViewCurr..', source: 'System' },
  { command: 'Accept Inline Suggestion', keybinding: 'Tab', when: 'inlineEditIsVisible && tabShouldAcceptInline..', source: 'System' },
  { command: 'Add Cursor Above', keybinding: 'Ctrl + Alt + UpArrow', when: 'editorTextFocus', source: 'System' },
  { command: 'Add Cursor Below', keybinding: 'Ctrl + Alt + DownArrow', when: 'editorTextFocus', source: 'System' },
  { command: 'Add Cursors to Line Ends', keybinding: 'Shift + Alt + I', when: 'editorTextFocus', source: 'System' },
  { command: 'Add Line Comment', keybinding: 'Ctrl + K Ctrl + C', when: 'editorTextFocus && !editorReadOnly', source: 'System' },
  { command: 'Add Selection To Next Find Match', keybinding: 'Ctrl + D', when: 'editorFocus', source: 'System' },
  { command: 'Copy Line Up', keybinding: 'Shift + Alt + UpArrow', when: 'editorTextFocus && !editorReadOnly', source: 'System' },
  { command: 'Copy Line Down', keybinding: 'Shift + Alt + DownArrow', when: 'editorTextFocus && !editorReadOnly', source: 'System' },
  { command: 'Move Line Up', keybinding: 'Alt + UpArrow', when: 'editorTextFocus && !editorReadOnly', source: 'System' },
  { command: 'Move Line Down', keybinding: 'Alt + DownArrow', when: 'editorTextFocus && !editorReadOnly', source: 'System' },
  { command: 'Format Document', keybinding: 'Shift + Alt + F', when: 'editorTextFocus && !editorReadOnly', source: 'System' },
  { command: 'Go to File...', keybinding: 'Ctrl + P', when: '', source: 'System' },
  { command: 'Quick Open Palette', keybinding: 'Ctrl + Shift + P', when: '', source: 'System' },
  { command: 'Toggle Terminal', keybinding: 'Ctrl + `', when: '', source: 'System' },
  { command: 'Save File', keybinding: 'Ctrl + S', when: 'editorTextFocus', source: 'System' },
]

export default function KeyboardShortcuts() {
  const [query, setQuery] = useState('')

  const filtered = SHORTCUTS.filter(s => 
    s.command.toLowerCase().includes(query.toLowerCase()) || 
    s.keybinding.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e] text-[var(--text-main)] font-outfit overflow-hidden h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[var(--border-main)] bg-[#1e1e1e]">
        <div className="flex items-center space-x-3 mb-6">
          <Keyboard size={24} className="text-blue-400" />
          <h1 className="text-xl font-black tracking-tight">Keyboard Shortcuts</h1>
        </div>
        
        <div className="relative max-w-2xl">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input 
            type="text"
            placeholder="Search in keybindings (e.g. 'save', 'ctrl+s')"
            className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-10 py-2 text-sm outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#1e1e1e] z-10 border-b border-[#3c3c3c]">
            <tr className="text-[11px] font-bold text-[#bbbbbb] uppercase tracking-wider">
              <th className="px-8 py-3 w-[40%]">Command</th>
              <th className="px-4 py-3 w-[25%]">Keybinding</th>
              <th className="px-4 py-3 w-[25%]">When</th>
              <th className="px-4 py-3 w-[10%]">Source</th>
            </tr>
          </thead>
          <tbody className="text-[12px]">
            {filtered.map((s, i) => (
              <tr 
                key={i} 
                className="group hover:bg-[#2a2d2e] border-b border-[#252526] transition-colors"
              >
                <td className="px-8 py-2.5 font-medium text-[#cccccc] group-hover:text-white">{s.command}</td>
                <td className="px-4 py-2.5">
                  <span className="bg-[#333333] px-2 py-0.5 rounded border border-[#444444] text-[11px] text-[#eeeeee]">
                    {s.keybinding}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-[#888888] font-mono italic text-[11px] truncate max-w-[200px]" title={s.when}>
                  {s.when || '—'}
                </td>
                <td className="px-4 py-2.5 text-[#888888]">{s.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center">
            <Info size={40} className="text-[#3c3c3c] mb-4" />
            <div className="text-[#888888] text-sm italic">No shortcuts found matching your search.</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-3 bg-[#007acc] text-white flex items-center justify-between text-[11px] font-bold">
        <div className="flex items-center space-x-4">
          <span>{filtered.length} entries shown</span>
          <span className="opacity-70">|</span>
          <button className="hover:underline flex items-center space-x-1">
            <Command size={10} />
            <span>Record Keys</span>
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <button className="hover:underline">Import Shortcuts</button>
          <button className="hover:underline">Export Shortcuts</button>
        </div>
      </div>
    </div>
  )
}
