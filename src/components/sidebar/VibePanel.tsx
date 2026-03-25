import React, { useState, useRef, useEffect } from 'react'
import { Headphones, Youtube, Play, Radio, ShieldCheck, Lock, ChevronDown } from 'lucide-react'

type VibeTab = 'jiosaavn' | 'youtube' | 'reels' | 'radiogarden'

interface TabDef {
  id: VibeTab
  label: string
  icon: React.ElementType
  color: string
  src: string
}

const TABS: TabDef[] = [
  {
    id: 'jiosaavn',
    label: 'JioSaavn',
    icon: Headphones,
    color: '#2BC5B4',
    src: 'https://www.jiosaavn.com',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: Youtube,
    color: '#FF0000',
    src: 'https://www.youtube.com',
  },
  {
    id: 'reels',
    label: 'Reels',
    icon: Play,
    color: '#E1306C',
    src: 'https://www.instagram.com/reels/',
  },
  {
    id: 'radiogarden',
    label: 'Radio',
    icon: Radio,
    color: '#38bdf8',
    src: 'https://radio.garden/listen',
  },
]

const PLATFORM_CSS: Record<string, string> = {
  jiosaavn: `
    /* Hide JioSaavn ads and banners */
    .c-ads, [class*="ad-"], [id*="ad-"],
    .banner-container, .lhs-ad, .rhs-ad { display: none !important; }
  `,
  radiogarden: '', // clean site
  youtube: `
    /* ── Ad removal ── */
    ytd-display-ad-renderer, ytd-in-feed-ad-layout-renderer,
    ytd-banner-promo-renderer, ytd-ad-slot-renderer,
    .video-ads, .ytp-ad-module, .ytp-ad-overlay-container,
    .ytp-ad-player-overlay, #masthead-ad,
    ytd-rich-item-renderer:has([is-ad]),
    ytd-compact-video-renderer:has([is-ad]) { display: none !important; }

    /* ── Layout cleanup: collapse guide sidebar ── */
    ytd-guide-renderer, #guide, tp-yt-app-drawer,
    ytd-mini-guide-renderer { display: none !important; }

    /* ── Make content full-width ── */
    ytd-page-manager { margin-left: 0 !important; }
    ytd-app[guide-persistent-and-visible] #content.ytd-page-manager {
      margin-left: 0 !important;
    }

    /* ── Hide right-side recommendations on watch page ── */
    #secondary.ytd-watch-flexy { display: none !important; }
    #primary.ytd-watch-flexy { max-width: 100% !important; }

    /* ── Hide comments ── */
    ytd-comments, #comments { display: none !important; }

    /* ── Shorts: full screen style ── */
    ytd-reel-video-renderer { height: 100% !important; }
  `,
  reels: `
    [aria-label*="Sponsored"] { display: none !important; }
    ._9zm2 { display: none !important; }
  `,
}


const IS_ELECTRON = typeof window !== 'undefined' && !!(window as any).em

// Pause all audio/video elements in a webview
const PAUSE_SCRIPT = `
  try { document.querySelectorAll('audio,video').forEach(m => m.pause()) } catch(e) {}
`

interface VibeViewProps { tab: TabDef; active: boolean; wvRef: React.RefObject<any>; onReady: () => void }

function VibeView({ tab, active, wvRef, onReady }: VibeViewProps) {

  useEffect(() => {
    const wv = wvRef.current
    if (!wv || !IS_ELECTRON) return

    const handleReady = () => {
      onReady()
      wv.insertCSS(PLATFORM_CSS[tab.id] ?? '').catch(() => {})
    }

    const onNavigate = (e: any) => {
      const OAUTH_HOSTS = [
        'accounts.google.com',
        'accounts.spotify.com/en/authorize',
        'appleid.apple.com',
        'facebook.com/login',
      ]
      if (OAUTH_HOSTS.some(h => e.url?.includes(h))) {
        e.preventDefault();(window as any).em?.openExternal?.(e.url)
      }
    }

    wv.addEventListener('dom-ready', handleReady)
    wv.addEventListener('will-navigate', onNavigate)
    wv.addEventListener('did-start-navigation', onNavigate)
    return () => {
      wv.removeEventListener('dom-ready', handleReady)
      wv.removeEventListener('will-navigate', onNavigate)
      wv.removeEventListener('did-start-navigation', onNavigate)
    }
  }, [])

  if (IS_ELECTRON) {
    return (
      <div
        className="absolute inset-0"
        style={{ opacity: active ? 1 : 0, pointerEvents: active ? 'auto' : 'none', transition: 'opacity 250ms ease' }}
      >
        {/* @ts-expect-error */}
        <webview
          ref={wvRef}
          src={tab.src}
          partition={`persist:vibe-${tab.id}`}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allowpopups="true"
          useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
        />
      </div>
    )
  }

  // Dev mode fallback
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4"
      style={{
        opacity: active ? 1 : 0,
        pointerEvents: active ? 'auto' : 'none',
        transition: 'opacity 250ms ease',
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: `${tab.color}20`, boxShadow: `0 0 40px ${tab.color}15` }}
      >
        <tab.icon size={28} style={{ color: tab.color }} />
      </div>
      <div className="text-center space-y-1">
        <p className="text-[13px] font-semibold text-[var(--text-main)]">Launch Electron for Vibe Mode</p>
        <p className="text-[11px] text-[var(--text-muted)] max-w-[260px] leading-relaxed">
          Webviews require Electron. Run <code className="font-mono text-[#6b8cff]">npm run electron:dev</code>
        </p>
      </div>
      <a
        href={tab.src}
        target="_blank"
        rel="noreferrer"
        className="text-[11px] font-medium px-4 py-1.5 rounded-lg transition-colors"
        style={{ background: `${tab.color}15`, color: tab.color, border: `1px solid ${tab.color}25` }}
      >
        Open {tab.label} in browser →
      </a>
    </div>
  )
}

export default function VibePanel() {
  const [activeTab, setActiveTab] = useState<VibeTab>('jiosaavn')
  const [showHeader, setShowHeader] = useState(false)
  const current = TABS.find(t => t.id === activeTab)!

  // One ref per tab — held in parent so we can pause inactive webviews
  const wvRefs = useRef<Record<string, React.RefObject<any>>>(
    Object.fromEntries(TABS.map(t => [t.id, { current: null }]))
  )

  // Track which webviews have fired dom-ready — only pause those
  const readyTabs = useRef<Set<string>>(new Set())

  // Pause all inactive tabs' media whenever the active tab changes
  useEffect(() => {
    if (!IS_ELECTRON) return
    TABS.forEach(t => {
      if (t.id !== activeTab && readyTabs.current.has(t.id)) {
        const wv = wvRefs.current[t.id]?.current
        if (wv) wv.executeJavaScript(PAUSE_SCRIPT).catch(() => {})
      }
    })
  }, [activeTab])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--bg-main)]">

      {/* ── Hero Header (collapsible, off by default) ── */}
      {showHeader && (
        <div
          className="relative flex-shrink-0 px-5 pt-5 pb-4 overflow-hidden"
          style={{ borderBottom: '1px solid var(--border-main)' }}
        >
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-700"
            style={{ background: `radial-gradient(ellipse at 30% 0%, ${current.color}12 0%, transparent 60%)` }}
          />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500"
                style={{
                  background: `linear-gradient(135deg, ${current.color}30, ${current.color}10)`,
                  boxShadow: `0 0 20px ${current.color}20`,
                  border: `1px solid ${current.color}25`,
                }}
              >
                <current.icon size={18} style={{ color: current.color }} strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-[var(--text-main)] leading-tight tracking-tight">Vibe Studio</h2>
                <p className="text-[10px] text-[var(--text-muted)]">Ad-free · No browser needed</p>
              </div>
            </div>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(107,140,255,0.08)', border: '1px solid rgba(107,140,255,0.15)' }}
              title="Credentials stored locally — encrypted, inaccessible to anyone else."
            >
              <Lock size={9} className="text-[#6b8cff]" />
              <span className="text-[8px] text-[#6b8cff] font-semibold tracking-wide">LOCAL ONLY</span>
            </div>
          </div>
          <div className="relative mt-3 flex items-start gap-2">
            <ShieldCheck size={11} className="text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
            <p className="text-[9.5px] text-[var(--text-muted)] leading-relaxed">
              Any account you log in to lives exclusively on <strong className="text-[var(--text-main)] font-semibold">this device</strong>, encrypted and inaccessible to developers or any third party.
            </p>
          </div>
        </div>
      )}

      {/* ── Tab Switcher + info toggle ── */}
      <div className="flex-shrink-0 px-2 py-2 flex items-center gap-1" style={{ borderBottom: '1px solid var(--border-main)' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-bold tracking-wide transition-all duration-200"
              style={
                isActive
                  ? { background: `${tab.color}18`, color: tab.color, boxShadow: `0 0 0 1px ${tab.color}35` }
                  : { background: 'transparent', color: 'var(--text-muted)' }
              }
            >
              <tab.icon size={12} strokeWidth={isActive ? 2.5 : 1.8} style={{ color: isActive ? tab.color : undefined }} />
              {tab.label}
            </button>
          )
        })}
        {/* Info/collapse toggle */}
        <button
          onClick={() => setShowHeader(h => !h)}
          className="p-2 rounded-xl transition-all flex-shrink-0"
          style={showHeader
            ? { background: 'rgba(107,140,255,0.12)', color: '#6b8cff' }
            : { background: 'transparent', color: 'var(--text-muted)' }
          }
          title={showHeader ? 'Hide Studio info' : 'Show Studio info'}
        >
          <ChevronDown size={13} style={{ transform: showHeader ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }} />
        </button>
      </div>

      {/* ── Webview Content Area ── */}
      <div className="flex-1 relative overflow-hidden">
        {TABS.map(tab => (
          <VibeView
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            wvRef={wvRefs.current[tab.id]}
            onReady={() => readyTabs.current.add(tab.id)}
          />
        ))}
      </div>
    </div>
  )
}
