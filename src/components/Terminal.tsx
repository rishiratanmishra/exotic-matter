import React, { useEffect, useRef } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { useIDE } from '../context/IDEContext'

interface TerminalProps {
  id: number
  isActive?: boolean
}

export default function Terminal({ id, isActive }: TerminalProps) {
  const { state } = useIDE()
  const containerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  // Use the prop ID directly — never generate a new one
  const terminalId = id

  useEffect(() => {
    if (!containerRef.current) return

    const isLight = state.theme === 'light'
    const isMonokai = state.theme === 'monokai'

    const term = new XTerm({
      theme: {
        background: isLight ? '#ffffff' : (isMonokai ? '#272822' : '#0d0d0f'),
        foreground: isLight ? '#333333' : '#d4d4d4',
        cursor: isLight ? '#333333' : '#d4d4d4',
        cursorAccent: isLight ? '#ffffff' : '#0d0d0f',
        selectionBackground: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)',
        black: '#000000',
        red: '#f44747',
        green: '#4ec994',
        yellow: '#d7ba7d',
        blue: '#569cd6',
        magenta: '#c586c0',
        cyan: '#4fc1ff',
        white: isLight ? '#333333' : '#d4d4d4',
        brightBlack: '#666666',
        brightRed: '#f44747',
        brightGreen: '#b5cea8',
        brightYellow: '#dcdcaa',
        brightBlue: '#9cdcfe',
        brightMagenta: '#c586c0',
        brightCyan: '#4fc1ff',
        brightWhite: isLight ? '#000000' : '#ffffff',
      },
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace",
      fontWeight: '400',
      cursorBlink: true,
      cursorStyle: 'bar',
      lineHeight: 1.4,
      allowTransparency: true,
      scrollback: 5000,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    
    // Defer fit to ensure RenderService is initialized and container has dimensions
    requestAnimationFrame(() => {
      try {
        if (containerRef.current && containerRef.current.clientWidth > 0) {
          fitAddon.fit()
        }
      } catch (err) {
        console.warn('Initial terminal fit failed:', err)
      }
    })

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Spawn the PTY with this specific ID
    window.capsicode.terminalSpawn(terminalId)

    // Wire data from PTY → xterm
    const removeListener = window.capsicode.onTerminalData(terminalId, data => {
      term.write(data)
    })

    // Wire keystrokes from xterm → PTY
    term.onData(data => {
      window.capsicode.terminalWrite(terminalId, data)
    })

    const handleResize = () => {
      try {
        if (containerRef.current && containerRef.current.clientWidth > 0) {
          fitAddon.fit()
          window.capsicode.terminalResize(terminalId, term.cols, term.rows)
        }
      } catch (err) {
        console.warn('Terminal resize failed:', err)
      }
    }

    const resizeObserver = new ResizeObserver(() => handleResize())
    resizeObserver.observe(containerRef.current)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
      removeListener()
      // Kill the PTY process to prevent memory leak
      window.capsicode.terminalKill(terminalId).catch(() => {})
      term.dispose()
    }
  }, [terminalId, state.theme]) // Re-run when terminal ID or theme changes

  // Fit when the terminal becomes active (panel shown/resized)
  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      requestAnimationFrame(() => {
        try { 
          if (containerRef.current && containerRef.current.clientWidth > 0) {
            fitAddonRef.current?.fit() 
          }
        } catch { /* ignore */ }
      })
    }
  }, [isActive])

  return (
    <div className="h-full w-full bg-[var(--bg-main)] overflow-hidden">
      <div ref={containerRef} className="h-full w-full p-1" />
    </div>
  )
}
