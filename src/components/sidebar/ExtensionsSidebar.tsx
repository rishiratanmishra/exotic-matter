import React, { useState } from 'react'
import { Search, Package, CheckCircle2, Download, Trash2, ShieldCheck, Info, RefreshCw, Settings } from 'lucide-react'
import { useIDE } from '../../context/IDEContext'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export default function ExtensionsSidebar() {
  const { state, dispatch, refreshExtensions } = useIDE()
  const [search, setSearch] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshExtensions()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const filtered = state.extensions.filter(ext => 
    ext.name.toLowerCase().includes(search.toLowerCase()) ||
    ext.description.toLowerCase().includes(search.toLowerCase())
  )

  const installed = filtered.filter(ext => ext.enabled)
  const available = filtered.filter(ext => !ext.enabled)

  return (
    <div className="flex flex-col h-full bg-[var(--bg-side)] font-outfit overflow-hidden">
      {/* Search Header */}
      <div className="p-3 border-b border-[var(--border-main)] flex flex-col space-y-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)]">EXTENSIONS</span>
          <button 
             onClick={handleRefresh}
             className={cn("p-1.5 hover:bg-[var(--border-main)] rounded transition-all text-[var(--text-muted)]", isRefreshing && "animate-spin text-blue-400")}
             title="Reload Extensions"
          >
            <RefreshCw size={13} />
          </button>
        </div>
        <div className="relative group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-400 transition-colors" />
          <input 
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Extensions..."
            className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] focus:border-blue-500/50 outline-none rounded-md py-1.5 pl-9 pr-3 text-xs placeholder:text-[var(--text-muted)] transition-all"
          />
        </div>
      </div>

      {/* Extension List */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-2">
        {state.extensions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 opacity-40 text-center space-y-4">
             <Package size={40} strokeWidth={1} />
             <div className="text-xs">No extensions found in the <code>extensions/</code> folder.</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Installed Section */}
            {installed.length > 0 && (
              <section className="px-3">
                <h3 className="text-[9px] font-bold text-[var(--text-muted)] mb-3 flex items-center">
                  INSTALLED
                  <span className="ml-2 bg-[var(--border-main)] px-1.5 py-0.5 rounded text-white">{installed.length}</span>
                </h3>
                <div className="space-y-1">
                  {installed.map(ext => <ExtensionItem key={ext.id} extension={ext} />)}
                </div>
              </section>
            )}

            {/* Recommended/Available Section */}
            {available.length > 0 && (
              <section className="px-3 pb-4">
                <h3 className="text-[9px] font-bold text-[var(--text-muted)] mb-3 flex items-center uppercase tracking-tighter opacity-70">
                  Recommended for you
                </h3>
                <div className="space-y-1">
                  {available.map(ext => <ExtensionItem key={ext.id} extension={ext} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ExtensionItem({ extension }: { extension: any }) {
  const { id, name, version, author, description, enabled, builtIn } = extension
  const { applyExtensionTheme } = useIDE()

  return (
    <div 
      onClick={() => applyExtensionTheme(id)}
      className="group relative bg-transparent hover:bg-[var(--border-main)]/30 border border-transparent hover:border-[var(--border-main)] p-2 rounded-lg transition-all cursor-pointer"
    >
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-[var(--border-main)] flex items-center justify-center flex-shrink-0">
          <Package size={20} className="text-blue-400 opacity-80" />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center space-x-1 mb-0.5">
            <span className="text-[12px] font-bold truncate leading-tight">{name}</span>
            {builtIn && (
              <span title="Verified Creator">
                <ShieldCheck size={12} className="text-blue-400 flex-shrink-0" />
              </span>
            )}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] flex items-center space-x-2 mb-1">
            <span className="truncate max-w-[80px] font-medium opacity-80">v{version}</span>
            <span>by {author}</span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed line-clamp-2 pr-2">
            {description}
          </p>
        </div>
      </div>

      {/* Action Buttons (Floating Over Item) */}
      <div className="absolute right-2 top-2 flex flex-col items-center space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {enabled ? (
           <button 
             className="p-1.5 hover:bg-red-500/10 text-red-400/80 hover:text-red-400 rounded-md transition-all shadow-sm"
             title="Uninstall"
             onClick={(e) => { e.stopPropagation(); window.capsicode.uninstallExtension(id) }}
           >
             <Trash2 size={13} />
           </button>
        ) : (
           <button 
             className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-md transition-all border border-blue-500/20 shadow-sm"
             title="Install"
           >
             <Download size={13} />
           </button>
        )}
        <button 
           className="p-1.5 hover:bg-[var(--border-main)] text-[var(--text-muted)] rounded-md transition-all"
           title="Settings"
        >
          <Settings size={13} />
        </button>
      </div>

      {/* Active Indicator */}
      {enabled && (
        <div className="absolute top-2 right-2 p-0.5 group-hover:hidden transition-all">
           <CheckCircle2 size={12} className="text-emerald-400" />
        </div>
      )}
    </div>
  )
}
