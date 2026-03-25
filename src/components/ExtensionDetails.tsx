import React, { useEffect, useState } from 'react'
import { Package, Download, User, Calendar, ExternalLink, ShieldCheck, CheckCircle2, Globe, Clock, Star, Share2, Info, X } from 'lucide-react'
import { useIDE } from '../context/IDEContext'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ExtensionDetailsProps {
  id: string 
}

export default function ExtensionDetails({ id }: ExtensionDetailsProps) {
  const [ext, setExt] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [readme, setReadme] = useState('')
  const [iconProxy, setIconProxy] = useState<string | null>(null)
  const {  closeFile, refreshExtensions, state } = useIDE()

  const isInstalled = ext ? state.extensions.some(e => e.id === `${ext.namespace}.${ext.name}`) : false
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true)
      try {
        const data = await window.capsicode.getExtensionDetails(id)
        if (data) {
          setExt(data.meta)
          setReadme(data.readme)
          
          // Proxy the icon
          const originalIcon = data.meta.iconUrl || `https://open-vsx.org/api/${data.meta.namespace}/${data.meta.name}/${data.meta.version}/file/extension/icon.png`
          const proxied = await window.capsicode.getExternalImage(originalIcon)
          setIconProxy(proxied)
        }
      } catch (e) {
        console.error('Failed to fetch extension details', e)
      } finally {
        setTimeout(() => setLoading(false), 300)
      }
    }
    fetchDetails()
  }, [id])

  const handleInstall = async () => {
    if (!ext) return
    setInstalling(true)
    try {
      const res = await window.capsicode.installExtension(`${ext.namespace}.${ext.name}`, ext.version)
      if (res.success) {
        await refreshExtensions()
      } else {
        alert('Installation failed: ' + res.error)
      }
    } finally {
      setInstalling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-main)] space-y-4">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center animate-pulse">
           <Package size={24} className="text-blue-400" />
        </div>
        <div className="text-xs text-[var(--text-muted)] animate-pulse uppercase tracking-widest font-black">Loading Extension Data...</div>
      </div>
    )
  }

  if (!ext) return <div className="p-20 text-center opacity-30 text-xs uppercase font-black">Extension Data Unavailable</div>

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-8 pb-12 bg-gradient-to-b from-blue-500/10 via-[var(--bg-main)] to-[var(--bg-main)] flex items-start space-x-8 border-b border-[var(--border-main)] relative">
        <div className="w-40 h-40 rounded-2xl bg-[var(--bg-side)] border border-[var(--border-main)] flex items-center justify-center flex-shrink-0 shadow-2xl relative group overflow-hidden">
          {iconProxy ? (
            <img src={iconProxy} alt={ext.displayName} className="w-32 h-32 object-contain" />
          ) : (
             <div className="w-32 h-32 flex items-center justify-center bg-blue-500/5 rounded-xl border border-blue-500/10">
                <Package size={48} className="text-blue-400 opacity-30" />
             </div>
          )}
        </div>

        <div className="flex-1 py-2">
          <div className="flex items-center space-x-3 mb-2">
             <h1 className="text-4xl font-black text-white">{ext.displayName || ext.name}</h1>
             <div className="bg-blue-600/20 text-blue-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-500/30">
               v{ext.version}
             </div>
          </div>
          
          <div className="flex items-center space-x-4 mb-4 text-[13px] text-[var(--text-muted)]">
             <div className="flex items-center hover:text-[var(--text-main)] transition-colors cursor-pointer">
               <User size={14} className="mr-1.5" />
               <span className="font-bold underline decoration-blue-500/30">{ext.namespace}</span>
             </div>
             <div className="flex items-center">
                <Download size={14} className="mr-1.5" />
                <span>{ext.downloadCount.toLocaleString()} downloads</span>
             </div>
             <div className="flex items-center">
                <ShieldCheck size={14} className="mr-1.5 text-emerald-400" />
                <span className="text-emerald-400">Verified Extension</span>
             </div>
          </div>

          <p className="text-[15px] leading-relaxed text-[var(--text-muted)] max-w-2xl mb-8">
            {ext.description}
          </p>

          <div className="flex items-center space-x-3">
             <button 
                onClick={handleInstall}
                disabled={installing || isInstalled}
                className={`px-6 py-2.5 rounded-lg font-black text-sm transition-all active:scale-95 shadow-lg ${
                    isInstalled ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default" : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                }`}
             >
               {installing ? 'INSTALLING...' : isInstalled ? 'INSTALLED' : 'INSTALL'}
             </button>
             <button className="px-4 py-2.5 bg-[var(--bg-side)] hover:bg-[var(--border-main)] border border-[var(--border-main)] text-[var(--text-main)] rounded-lg font-bold text-sm transition-all">
               CHANGELOG
             </button>
          </div>
        </div>

        <button onClick={() => closeFile(`extension:${id}`)} className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-white hover:bg-red-500/20 rounded-full transition-all">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[280px] border-r border-[var(--border-main)] p-6 bg-[var(--bg-side)]/30 space-y-8 flex-shrink-0 overflow-y-auto no-scrollbar">
           <div>
              <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4 opacity-50">Publisher</h3>
              <div className="flex items-center space-x-2">
                 <div className="p-2 rounded bg-blue-500/10 text-blue-400 font-black text-xs uppercase">{ext.namespace.slice(0,2)}</div>
                 <span className="text-sm font-bold text-blue-400 hover:underline cursor-pointer">{ext.namespace}</span>
              </div>
           </div>

           <div>
              <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4 opacity-50">Metadata</h3>
              <div className="space-y-4">
                 <div className="flex flex-col">
                    <span className="text-[11px] text-[var(--text-muted)] mb-1">Version</span>
                    <span className="text-sm font-medium">{ext.version}</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[11px] text-[var(--text-muted)] mb-1">Last Update</span>
                    <span className="text-sm font-medium">{new Date(ext.timestamp).toLocaleDateString()}</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[11px] text-[var(--text-muted)] mb-1">Identifier</span>
                    <span className="text-sm font-medium opacity-60 text-[10px]">{ext.namespace}.{ext.name}</span>
                 </div>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-12 no-scrollbar bg-[var(--bg-main)] relative">
           <div className="max-w-4xl mx-auto custom-markdown prose prose-invert prose-blue">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {readme}
              </ReactMarkdown>
           </div>
        </div>
      </div>
    </div>
  )
}
