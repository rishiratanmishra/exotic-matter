import React, { useState, useRef, useEffect } from 'react'
import { X, Loader2, Check, Copy, ArrowRight } from 'lucide-react'
import { OllamaService } from '../services/ollama'

interface InlineAIWidgetProps {
  selectedText: string
  filePath: string
  onClose: () => void
}

export default function InlineAIWidget({ selectedText, filePath, onClose }: InlineAIWidgetProps) {
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async () => {
    if (!prompt.trim() || isLoading) return
    setIsLoading(true)
    setResult('')

    // Inline Agent Prompt formatting
    const context = selectedText
      ? `The user has selected this code from ${filePath.split(/[/\\]/).pop()}:\n\`\`\`\n${selectedText}\n\`\`\`\n\n`
      : `Working in file: ${filePath.split(/[/\\]/).pop()}\n\n`

    const messages = [
      {
        role: 'system' as const,
        content: 'You are an expert coding assistant embedded directly in the editor. Provide concise, working code. Respond ONLY with the code or explanation — no conversational preamble. Keep formatting perfectly minimal.',
      },
      {
        role: 'user' as const,
        content: `${context}${prompt}`,
      },
    ]

    try {
      await OllamaService.chat(messages, chunk => {
        setResult(prev => prev + chunk)
      })
    } catch (err) {
      setResult(`Error: ${err}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = async () => {
    if (!result) return
    const codeMatch = result.match(/```[\w]*\n?([\s\S]+?)\n?```/)
    const code = codeMatch ? codeMatch[1] : result
    
    if (selectedText) {
      await window.em.patchFile(filePath, selectedText, code)
    } else {
      const original = await window.em.readFile(filePath)
      await window.em.writeFile(filePath, original + '\n' + code)
    }
    
    onClose()
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="absolute inset-x-8 bottom-6 z-[200] bg-[var(--bg-main)]/70 backdrop-blur-3xl border border-[var(--border-main)] rounded-3xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col font-outfit ring-1 ring-white/5 animate-in fade-in slide-in-from-bottom-4 duration-300"
      style={{ maxWidth: '850px', margin: '0 auto', maxHeight: '65vh' }}
    >
      {/* Premium Glass Header */}
      <div className="flex items-center px-5 py-3.5 border-b border-[var(--border-main)]/50 bg-white/5 flex-shrink-0 relative">
        <img src="/icon.png" alt="Exotic Matter" className="w-6 h-6 rounded-md object-cover shadow-lg shadow-blue-500/20 mr-3" />
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]">Inline Generation</span>
        {selectedText && (
          <div className="ml-4 px-3 py-1 bg-black/40 rounded-full border border-white/5 flex items-center">
            <span className="text-[10px] text-[var(--text-muted)] italic truncate max-w-[250px]">
              "{selectedText.slice(0, 45)}{selectedText.length > 45 ? '…' : ''}"
            </span>
          </div>
        )}
        <button onClick={onClose} className="ml-auto p-1.5 bg-black/20 text-[var(--text-muted)] hover:text-white hover:bg-red-500/80 rounded-lg transition-all active:scale-95">
          <X size={14} />
        </button>
      </div>

      {/* Input Pill */}
      <div className="flex items-center px-5 py-3 border-b border-[var(--border-main)]/50 bg-black/20 flex-shrink-0 transition-colors focus-within:bg-black/40">
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSubmit()
            if (e.key === 'Escape') onClose()
          }}
          placeholder={selectedText ? 'Explain, refactor, or transform the selection...' : 'Ask AI to generate or modify code...'}
          className="flex-1 bg-transparent text-[14px] text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)] tracking-wide font-medium"
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !prompt.trim()}
          className="ml-4 w-9 h-9 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-40 disabled:scale-100 disabled:shadow-none flex items-center justify-center flex-shrink-0"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} strokeWidth={2.5} />}
        </button>
      </div>

      {/* Editor Result Content Layout */}
      {(result || isLoading) && (
        <div className="flex-1 overflow-y-auto bg-[#0a0a0c] relative min-h-[150px]">
          <pre className="p-6 text-[13px] text-[#E4E4E5] whitespace-pre-wrap font-mono leading-loose no-scrollbar">
            {result}
            {isLoading && <span className="inline-block w-2.5 h-4 ml-1.5 bg-blue-500 animate-pulse align-middle" />}
          </pre>
        </div>
      )}

      {/* Action Footer */}
      {result && !isLoading && (
        <div className="flex items-center justify-end space-x-2.5 px-5 py-3 border-t border-[var(--border-main)] bg-[var(--bg-side)]/80 backdrop-blur-md flex-shrink-0">
          <button onClick={handleCopy} className="flex items-center space-x-1.5 px-4 py-2 text-[11px] font-bold text-[var(--text-main)] hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-95 border border-transparent hover:border-white/10">
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy'}</span>
          </button>
          <button
            onClick={handleApply}
            className="flex items-center space-x-2 px-5 py-2 text-[11px] bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95"
          >
            <Check size={14} strokeWidth={3} />
            <span>Apply to Editor</span>
          </button>
        </div>
      )}
    </div>
  )
}
