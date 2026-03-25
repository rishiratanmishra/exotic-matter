import React, { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Loader2, Check, Copy } from 'lucide-react'
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

    const context = selectedText
      ? `The user has selected this code from ${filePath.split(/[/\\]/).pop()}:\n\`\`\`\n${selectedText}\n\`\`\`\n\n`
      : `Working in file: ${filePath.split(/[/\\]/).pop()}\n\n`

    const messages = [
      {
        role: 'system' as const,
        content: 'You are an expert coding assistant. Provide concise, working code. Respond ONLY with the code or explanation — no preamble.',
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
    // Extract code from markdown code block if present
    const codeMatch = result.match(/```[\w]*\n?([\s\S]+?)\n?```/)
    const code = codeMatch ? codeMatch[1] : result
    await window.capsicode.writeFile(filePath, code)
    onClose()
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="absolute inset-x-8 bottom-4 z-50 bg-[var(--bg-explorer)] border border-[var(--border-main)] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden max-h-[50vh] flex flex-col"
      style={{ maxWidth: '800px', margin: '0 auto' }}
    >
      {/* Header */}
      <div className="flex items-center px-4 py-2.5 border-b border-[var(--border-main)] flex-shrink-0">
        <Sparkles size={13} className="text-blue-400 mr-2" />
        <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">Inline AI</span>
        {selectedText && (
          <span className="ml-3 text-[10px] text-[var(--text-muted)] italic truncate max-w-[200px]">
            "{selectedText.slice(0, 40)}{selectedText.length > 40 ? '…' : ''}"
          </span>
        )}
        <button onClick={onClose} className="ml-auto p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded transition-colors">
          <X size={13} />
        </button>
      </div>

      {/* Input */}
      <div className="flex items-center px-4 py-2 border-b border-[var(--border-main)] flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSubmit()
            if (e.key === 'Escape') onClose()
          }}
          placeholder={selectedText ? 'Explain, refactor, or transform the selection...' : 'Ask AI to generate code...'}
          className="flex-1 bg-transparent text-[13px] text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !prompt.trim()}
          className="ml-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold rounded-lg transition-colors flex items-center space-x-1.5"
        >
          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          <span>{isLoading ? 'Thinking...' : 'Generate'}</span>
        </button>
      </div>

      {/* Result */}
      {(result || isLoading) && (
        <div className="flex-1 overflow-y-auto">
          <pre className="p-4 text-[12px] text-[var(--text-main)] whitespace-pre-wrap font-mono leading-relaxed">
            {result}
            {isLoading && <span className="animate-pulse text-blue-400">▋</span>}
          </pre>
        </div>
      )}

      {/* Actions */}
      {result && !isLoading && (
        <div className="flex items-center justify-end space-x-2 px-4 py-2.5 border-t border-[var(--border-main)] bg-[var(--bg-side)] flex-shrink-0">
          <button onClick={handleCopy} className="flex items-center space-x-1.5 px-3 py-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-main)] rounded-lg transition-all">
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button
            onClick={handleApply}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors"
          >
            <Check size={12} />
            <span>Apply to File</span>
          </button>
        </div>
      )}
    </div>
  )
}
