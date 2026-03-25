import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, User, Bot, Loader2, Sparkles, Plus, History, Layers, X, AtSign, Check, Copy } from 'lucide-react'
import { AgentExecutor, PROPOSAL_DELIM } from '../services/agent/executor'
import { OllamaService } from '../services/ollama'
import DiffViewer from './DiffViewer'
import { useIDE } from '../context/IDEContext'

function cn(...c: any[]) { return c.filter(Boolean).join(' ') }

interface Message { role: 'user' | 'assistant'; content: string }

const AGENT_EXECUTOR = new AgentExecutor()

export default function Chat() {
  const { state } = useIDE()
  const { workspacePath, activeFile, allFiles } = state

  // Keep executor context in sync with IDE state
  useEffect(() => {
    AGENT_EXECUTOR.updateContext({ workspacePath, activeFile, allFiles })
  }, [workspacePath, activeFile, allFiles])

  const [sessionId, setSessionId] = useState<string>(() =>
    localStorage.getItem('capsicode_active_session') || Date.now().toString()
  )
  const [sessions, setSessions] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('capsicode_chat_sessions') || '[]') } catch { return [] }
  })
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(`capsicode_chat_${sessionId}`)
      return saved ? JSON.parse(saved) : [{ role: 'assistant', content: 'I\'m CapsiCode AI. Ask me anything about your code.' }]
    } catch { return [{ role: 'assistant', content: 'I\'m CapsiCode AI. Ask me anything about your code.' }] }
  })
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [mode, setMode] = useState<'fast' | 'planning'>('fast')
  const [models, setModels] = useState<any[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [agentStatus, setAgentStatus] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showModels, setShowModels] = useState(false)
  const [atMentionQuery, setAtMentionQuery] = useState('')
  const [showAtMention, setShowAtMention] = useState(false)
  const isThinkingRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    window.capsicode.getModels().then((list: any[]) => {
      setModels(list)
      if (list.length > 0 && !selectedModel) {
        setSelectedModel(list[0].name)
        OllamaService.setModel(list[0].name)
      }
    })
  }, [])

  // Persist messages
  useEffect(() => {
    localStorage.setItem(`capsicode_chat_${sessionId}`, JSON.stringify(messages))
    localStorage.setItem('capsicode_active_session', sessionId)
    AGENT_EXECUTOR.setHistory(messages)

    if (messages.length > 1) {
      const exists = sessions.find(s => s.id === sessionId)
      if (!exists) {
        const firstUserMsg = messages.find(m => m.role === 'user')
        const title = firstUserMsg?.content.slice(0, 40) ?? 'New Chat'
        const updated = [{ id: sessionId, title, timestamp: Date.now() }, ...sessions].slice(0, 30)
        setSessions(updated)
        localStorage.setItem('capsicode_chat_sessions', JSON.stringify(updated))
      }
    }
  }, [messages, sessionId])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isThinking])

  const newSession = () => {
    setSessionId(Date.now().toString())
    setMessages([{ role: 'assistant', content: 'I\'m CapsiCode AI. Ask me anything about your code.' }])
    setShowHistory(false)
  }

  const loadSession = (id: string) => {
    try {
      const saved = localStorage.getItem(`capsicode_chat_${id}`)
      if (saved) { setMessages(JSON.parse(saved)); setSessionId(id) }
    } catch {}
    setShowHistory(false)
  }

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = sessions.filter(s => s.id !== id)
    setSessions(updated)
    localStorage.setItem('capsicode_chat_sessions', JSON.stringify(updated))
    localStorage.removeItem(`capsicode_chat_${id}`)
    if (sessionId === id) newSession()
  }

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = overrideText ?? input
    if (!text.trim() || isThinkingRef.current) return

    isThinkingRef.current = true
    setIsThinking(true)
    setAgentStatus('Thinking...')

    const userMsg: Message = { role: 'user', content: text }
    if (!overrideText) setInput('')
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (last?.role === 'user' && last.content === text) return prev
      return [...prev, userMsg]
    })

    try {
      let assistantMsgStarted = false
      await AGENT_EXECUTOR.runTask(text, setAgentStatus, chunk => {
        setMessages(prev => {
          if (!assistantMsgStarted) {
            assistantMsgStarted = true
            return [...prev, { role: 'assistant', content: chunk }]
          }
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant') {
            const copy = [...prev]
            copy[copy.length - 1] = { ...last, content: last.content + chunk }
            return copy
          }
          return prev
        })
      })
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err}` }])
    } finally {
      setIsThinking(false)
      isThinkingRef.current = false
      setTimeout(() => setAgentStatus(null), 3000)
    }
  }, [input])

  const handleApplyEdit = async (path: string, content: string) => {
    setAgentStatus(`Applying changes to ${path.split(/[/\\]/).pop()}...`)
    await window.capsicode.writeFile(path, content)
    setAgentStatus('Changes applied!')
    setTimeout(() => setAgentStatus(null), 2000)
  }

  // Parse PROPOSAL blocks using safe delimiter
  const renderMessageContent = (content: string) => {
    const MARKER_START = 'PROPOSAL_START'
    const MARKER_END = 'PROPOSAL_END'

    if (!content.includes(MARKER_START)) {
      return <MessageBody content={content} />
    }

    const parts: React.ReactNode[] = []
    let cursor = 0

    while (cursor < content.length) {
      const startIdx = content.indexOf(MARKER_START, cursor)
      if (startIdx === -1) {
        parts.push(<MessageBody key={cursor} content={content.slice(cursor)} />)
        break
      }

      if (startIdx > cursor) {
        parts.push(<MessageBody key={`text-${cursor}`} content={content.slice(cursor, startIdx)} />)
      }

      const endIdx = content.indexOf(MARKER_END, startIdx)
      if (endIdx === -1) {
        parts.push(<MessageBody key={`text-${startIdx}`} content={content.slice(startIdx)} />)
        break
      }

      const block = content.slice(startIdx + MARKER_START.length, endIdx)
      const delimParts = block.split(PROPOSAL_DELIM)
      if (delimParts.length >= 3) {
        const path = delimParts[0].trim().replace(/^\n/, '')
        const oldVal = delimParts[1]
        const newVal = delimParts[2]
        const explanation = delimParts[3]?.trim() ?? ''
        parts.push(
          <div key={`proposal-${startIdx}`} className="my-3">
            {explanation && (
              <p className="text-[11px] text-[#a1a1a8] mb-2 italic">{explanation}</p>
            )}
            <DiffViewer
              path={path}
              oldValue={oldVal}
              newValue={newVal}
              onApply={() => handleApplyEdit(path, newVal)}
              onReject={() => {}}
            />
          </div>
        )
      }

      cursor = endIdx + MARKER_END.length
    }

    return <>{parts}</>
  }

  // Handle @file mention in textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInput(val)
    const atIdx = val.lastIndexOf('@')
    if (atIdx !== -1 && atIdx === val.length - 1) {
      setShowAtMention(true)
      setAtMentionQuery('')
    } else if (atIdx !== -1 && atIdx < val.length) {
      const after = val.slice(atIdx + 1)
      if (!after.includes(' ')) {
        setShowAtMention(true)
        setAtMentionQuery(after)
      } else {
        setShowAtMention(false)
      }
    } else {
      setShowAtMention(false)
    }
  }

  const insertAtMention = (filePath: string) => {
    const atIdx = input.lastIndexOf('@')
    const newInput = input.slice(0, atIdx) + `@${filePath} `
    setInput(newInput)
    setShowAtMention(false)
    textareaRef.current?.focus()
  }

  const filteredAtFiles = allFiles
    .filter(f => f.toLowerCase().includes(atMentionQuery.toLowerCase()))
    .slice(0, 8)

  return (
    <div className="flex flex-col h-full bg-[var(--bg-side)] relative overflow-hidden font-outfit">
      {/* Header */}
      <div className="h-[35px] px-4 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-side)] flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Sparkles size={13} className="text-blue-400" />
          <span className="text-[10px] uppercase tracking-[0.15em] font-black text-[var(--text-muted)]">CapsiCode AI</span>
        </div>
        <div className="flex items-center space-x-1 pr-6">
          {agentStatus && (
            <span className="text-[9px] text-[#484850] italic mr-2 animate-pulse">{agentStatus}</span>
          )}
          <button onClick={() => setShowHistory(!showHistory)} className={cn('p-1.5 rounded transition-all hover:bg-[var(--border-main)]', showHistory ? 'text-blue-400' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]')} title="History">
            <History size={13} />
          </button>
          <button onClick={newSession} className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-main)] transition-all" title="New Chat">
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* History overlay */}
      {showHistory && (
        <div className="absolute inset-x-0 top-[35px] bottom-0 bg-[var(--bg-main)]/96 backdrop-blur-xl z-[100] flex flex-col">
          <div className="p-4 flex-1 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[9px] uppercase font-black text-[var(--text-muted)] tracking-[0.18em]">Recent Chats</h3>
              <button onClick={() => setShowHistory(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={13} /></button>
            </div>
            {sessions.map(s => (
              <div key={s.id} onClick={() => loadSession(s.id)}
                className={cn('p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between group',
                  sessionId === s.id ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[var(--bg-explorer)] border-[var(--border-main)] hover:border-[var(--text-muted)]'
                )}>
                <div className="flex-1 min-w-0 pr-2">
                  <div className={cn('text-[12px] truncate', sessionId === s.id ? 'text-white font-bold' : 'text-[var(--text-main)]')}>{s.title}</div>
                  <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{new Date(s.timestamp).toLocaleDateString()}</div>
                </div>
                <button onClick={e => deleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--text-muted)] hover:text-red-400 transition-all">
                  <X size={12} />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-center py-16 text-[var(--text-muted)] text-sm">No history</div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-6 no-scrollbar bg-[var(--bg-main)]">
        {messages.filter(m => (m.role as string) !== 'system').map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1`}>
            <div className={`flex items-center mb-1.5 text-[8px] font-black uppercase tracking-[0.12em] text-[var(--text-muted)] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'user' ? <User size={11} className="ml-1.5" /> : <Bot size={11} className="mr-1.5 text-blue-400/60" />}
              <span className="mx-1">{msg.role}</span>
            </div>
            <div className={cn(
              'max-w-[93%] p-3.5 rounded-2xl text-[12.5px] leading-relaxed',
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-sm shadow-sm'
                : 'bg-[var(--bg-explorer)] text-[var(--text-main)] border border-[var(--border-main)] rounded-tl-sm'
            )}>
              {msg.role === 'assistant' ? renderMessageContent(msg.content) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
              {msg.role === 'assistant' && msg.content.includes('PLAN:') && (
                <div className="mt-3 pt-3 border-t border-[#27272a] flex justify-end">
                  <button onClick={() => handleSend('Approved. Please proceed with the plan.')}
                    className="bg-white text-black text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:bg-white/90 active:scale-95 transition-all">
                    <Sparkles size={10} /><span>Approve & Run</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex flex-col items-start">
            <div className="flex items-center mb-1.5 text-[8px] font-black uppercase text-[#343440]">
              <Bot size={11} className="mr-1.5 text-blue-400/60" /> assistant
            </div>
            <div className="bg-[var(--bg-explorer)] border border-[var(--border-main)] p-3.5 rounded-2xl rounded-tl-sm flex items-center space-x-2">
              <Loader2 size={13} className="animate-spin text-blue-500 flex-shrink-0" />
              <span className="text-[12px] text-[var(--text-muted)] italic">{agentStatus ?? 'Thinking...'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-3 bg-[var(--bg-side)] border-t border-[var(--border-main)] relative">
        {/* @file mention dropdown */}
        {showAtMention && filteredAtFiles.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-[var(--bg-explorer)] border border-[var(--border-main)] rounded-xl overflow-hidden shadow-[0_-8px_30px_rgba(0,0,0,0.5)] z-50 max-h-[180px] overflow-y-auto">
            <div className="px-3 py-1.5 text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest border-b border-[var(--border-main)]">Mention a file</div>
            {filteredAtFiles.map(f => (
              <button key={f} onClick={() => insertAtMention(f)}
                className="w-full text-left px-3 py-2 text-[11px] text-[var(--text-main)]/80 hover:bg-[var(--border-main)] hover:text-[var(--text-main)] transition-colors flex items-center space-x-2">
                <AtSign size={10} className="text-blue-400 flex-shrink-0" />
                <span className="truncate">{f.split(/[/\\]/).pop()}</span>
                <span className="text-[9px] text-[var(--text-muted)] truncate ml-auto">{f}</span>
              </button>
            ))}
          </div>
        )}

        <div className="bg-[var(--bg-main)] rounded-2xl border border-[var(--border-main)] overflow-hidden focus-within:border-[var(--text-muted)] transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              if (e.key === 'Escape') setShowAtMention(false)
            }}
            placeholder="Ask anything, @ to mention a file..."
            rows={3}
            className="w-full bg-transparent text-[var(--text-main)] text-[13px] p-3 focus:outline-none resize-none min-h-[64px] max-h-[150px] no-scrollbar"
            style={{ fieldSizing: 'content' } as any}
            disabled={isThinking}
          />
          <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--border-main)]">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setMode(m => m === 'fast' ? 'planning' : 'fast')}
                className={cn('px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all',
                  mode === 'planning' ? 'text-amber-400 bg-amber-400/10' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-main)]'
                )}
              >
                {mode}
              </button>
              <div className="relative">
                <button onClick={() => setShowModels(!showModels)}
                  className="flex items-center px-2 py-1 space-x-1.5 text-[9px] uppercase font-black tracking-widest text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-main)] rounded-md transition-all">
                  <Layers size={11} />
                  <span className="max-w-[80px] truncate">{selectedModel || 'Model'}</span>
                </button>
                {showModels && (
                  <>
                    <div className="fixed inset-0 z-[190]" onClick={() => setShowModels(false)} />
                    <div className="absolute bottom-full mb-2 left-0 w-52 bg-[var(--bg-side)]/95 backdrop-blur-xl border border-[var(--border-main)] rounded-xl shadow-2xl overflow-hidden z-[200]">
                      <div className="px-3 py-2 border-b border-[var(--border-main)] bg-[var(--bg-side)]">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Models</span>
                      </div>
                      {models.length > 0 ? models.map(m => (
                        <button key={m.name} onClick={() => { setSelectedModel(m.name); OllamaService.setModel(m.name); setShowModels(false) }}
                          className={cn('w-full text-left px-3 py-2.5 text-[11px] hover:bg-[var(--bg-main)] transition-colors border-b border-[var(--border-main)]/50 last:border-0',
                            selectedModel === m.name ? 'text-blue-400' : 'text-[var(--text-muted)]'
                          )}>
                          {m.name}
                        </button>
                      )) : (
                        <div className="px-3 py-4 text-[10px] text-[var(--text-muted)] italic text-center">No models detected</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => handleSend()}
              disabled={isThinking || !input.trim()}
              className={cn('p-2 rounded-xl transition-all',
                isThinking || !input.trim() ? 'bg-[var(--border-main)] text-[var(--text-muted)] cursor-not-allowed' : 'bg-white text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-95'
              )}
            >
              <Send size={16} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Inline text renderer with basic markdown
function MessageBody({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)
  // Split on code blocks
  const parts = content.split(/(```[\w]*\n[\s\S]*?```)/g)

  return (
    <div className="whitespace-pre-wrap text-[12.5px] leading-relaxed space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const lineBreak = part.indexOf('\n')
          const lang = part.slice(3, lineBreak).trim()
          const code = part.slice(lineBreak + 1).replace(/```$/, '').trim()
          return (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-[var(--border-main)] bg-[var(--bg-main)] my-2">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-side)] border-b border-[var(--border-main)]">
                <span className="text-[9px] text-[var(--text-muted)] font-mono">{lang || 'code'}</span>
                <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  className="text-[9px] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center space-x-1 transition-colors">
                  {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3 text-[11px] text-[var(--text-main)] font-mono overflow-x-auto">{code}</pre>
            </div>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </div>
  )
}
