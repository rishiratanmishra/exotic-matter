import React, { useState, useEffect } from 'react'
import { Search, Package, CheckCircle2, Download, Trash2, ShieldCheck, Info, RefreshCw, Settings } from 'lucide-react'
import { useIDE } from '../../context/IDEContext'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export default function ExtensionsSidebar() {
  const { state, dispatch, refreshExtensions } = useIDE()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Debounced search on Open VSX
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!search.trim()) {
        setResults([])
        return
      }
      setIsSearching(true)
      try {
        const data = await window.capsicode.searchMarketplace(search)
        setResults(data.extensions || [])
      } catch (e) {
        console.error('Open VSX search failed', e)
      } finally {
        setIsSearching(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshExtensions()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // Local extensions
  const installed = state.extensions.filter(ext => 
    !search.trim() || ext.name.toLowerCase().includes(search.toLowerCase())
  )

  const displayedResults = search.trim() ? results : []

  return (
    <div className="flex flex-col h-full bg-[var(--bg-side)] font-outfit overflow-hidden">
      {/* Search Header */}
      <div className="p-3 border-b border-[var(--border-main)] flex flex-col space-y-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)]">EXTENSIONS</span>
          <button 
             onClick={handleRefresh}
             className={cn("p-1.5 hover:bg-[var(--border-main)] rounded transition-all text-[var(--text-muted)]", (isRefreshing || isSearching) && "animate-spin text-blue-400")}
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
        {(!search.trim() && state.extensions.length === 0) ? (
          <div className="flex flex-col items-center justify-center p-8 opacity-40 text-center space-y-4">
             <Package size={40} strokeWidth={1} />
             <div className="text-xs">No extensions found in the <code>extensions/</code> folder.</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Installed Section (Only if no search or searching local) */}
            {installed.length > 0 && (
              <section className="px-3">
                <h3 className="text-[9px] font-bold text-[var(--text-muted)] mb-3 flex items-center tracking-tighter uppercase opacity-70">
                  INSTALLED
                  <span className="ml-2 bg-[var(--border-main)] px-1.5 py-0.5 rounded text-[var(--text-main)]">{installed.length}</span>
                </h3>
                <div className="space-y-1">
                  {installed.map(ext => <ExtensionItem key={ext.id} extension={ext} />)}
                </div>
              </section>
            )}

            {/* Marketplace Search Results */}
            {search.trim() && (
              <section className="px-3 pb-4">
                <h3 className="text-[9px] font-bold text-[var(--text-muted)] mb-3 flex items-center uppercase tracking-tighter opacity-70">
                  {isSearching ? 'SEARCHING MARKETPLACE...' : `MARKETPLACE (${results.length})`}
                </h3>
                <div className="space-y-1">
                  {displayedResults.map(ext => <MarketplaceItem key={ext.namespace + '.' + ext.name} extension={ext} />)}
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

function MarketplaceItem({ extension }: { extension: any }) {
  const { namespace, name, version, displayName, description, iconUrl, downloadCount } = extension
  const id = `${namespace}.${name}`
  const { state, openFile, refreshExtensions } = useIDE()
  const isInstalled = state.extensions.some(e => e.id === id)

  const [isInstalling, setIsInstalling] = useState(false)
  const [proxiedIcon, setProxiedIcon] = useState<string | null>(null)

  useEffect(() => {
    const fetchIcon = async () => {
      let url = iconUrl
      if (url && !url.startsWith('http')) {
        url = `https://open-vsx.org${url.startsWith('/') ? '' : '/'}${url}`
      }
      if (!url) {
        url = `https://open-vsx.org/api/${namespace}/${name}/${version}/file/extension/icon.png`
      }
      const res = await window.capsicode.getExternalImage(url)
      if (res) setProxiedIcon(res)
      else {
          // One more try with another common path
          const fallbackUrl = `https://open-vsx.org/api/${namespace}/${name}/${version}/file/icon.png`
          const res2 = await window.capsicode.getExternalImage(fallbackUrl)
          setProxiedIcon(res2)
      }
    }
    fetchIcon()
  }, [extension])

  const handleInstall = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsInstalling(true)
    try {
      const res = await window.capsicode.installExtension(id, version)
      if (res.success) {
        await refreshExtensions()
      } else {
        alert('Failed to install extension: ' + res.error)
      }
    } catch (err) {
      console.error('Install error:', err)
    } finally {
      setIsInstalling(false)
    }
  }

  return (
    <div 
      onClick={() => openFile('extension:' + id)}
      className="group relative bg-transparent hover:bg-blue-500/5 border border-transparent hover:border-blue-500/20 p-2 rounded-lg transition-all cursor-pointer"
    >
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 rounded-md bg-[var(--bg-main)] border border-[var(--border-main)] flex items-center justify-center flex-shrink-0 overflow-hidden text-blue-400">
          {proxiedIcon ? (
             <img src={proxiedIcon} alt={name} className="w-full h-full object-contain" />
          ) : (
             <Package size={20} className="text-[var(--text-muted)] opacity-30" />
          )}
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center space-x-1 mb-0.5">
            <span className="text-[12px] font-bold truncate leading-tight text-blue-400">{displayName || name}</span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] flex items-center space-x-2 mb-1">
            <span className="truncate max-w-[80px] font-medium opacity-80">{namespace}</span>
            <span className="flex items-center text-[9px] bg-[var(--border-main)] px-1 rounded-sm">
                <Download size={8} className="mr-1" />
                {downloadCount ? (downloadCount / 1000).toFixed(1) : 0}k
            </span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      {/* Install Button */}
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isInstalled ? (
          <button 
            disabled={isInstalling}
            className={cn(
              "px-2 py-1 text-white text-[9px] font-bold rounded shadow-lg transition-all active:scale-95",
              isInstalling ? "bg-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
            )}
            onClick={handleInstall}
          >
            {isInstalling ? '...' : 'INSTALL'}
          </button>
        ) : (
          <div className="p-1 px-2 border border-emerald-500/30 text-emerald-400 text-[8px] font-black rounded uppercase">
            INSTALLED
          </div>
        )}
      </div>
    </div>
  )
}
