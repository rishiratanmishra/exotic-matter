import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, User, Bot, Loader2, Plus, History, Layers, X, AtSign, Check, Copy, ChevronRight, Settings, Image, PenTool, Mic, ArrowRight, ChevronDown } from 'lucide-react'
import { AgentExecutor, PROPOSAL_DELIM } from '../services/agent/executor'
import { LocalAgentService } from '../services/LocalAgentService'
import DiffViewer from './DiffViewer'
import { useIDE } from '../context/IDEContext'

function cn(...c: any[]) { return c.filter(Boolean).join(' ') }

interface Message { role: 'user' | 'assistant' | 'system'; content: string }

const AGENT_EXECUTOR = new AgentExecutor()

export default function Chat() {
  const { state, dispatch } = useIDE()
  const { workspacePath, activeFile, allFiles } = state

  useEffect(() => {
    AGENT_EXECUTOR.updateContext({ workspacePath, activeFile, allFiles })
  }, [workspacePath, activeFile, allFiles])

  const [sessionId, setSessionId] = useState<string>(() => localStorage.getItem('em_active_session') || Date.now().toString())
  const [sessions, setSessions] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('em_chat_sessions') || '[]') } catch { return [] }
  })
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(`em_chat_${sessionId}`)
      return saved ? JSON.parse(saved) : [{ role: 'assistant', content: 'I\'m Exotic Matter AI. Ask me anything about your code.' }]
    } catch { return [{ role: 'assistant', content: 'I\'m Exotic Matter AI. Ask me anything about your code.' }] }
  })
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [mode, setMode] = useState<'fast' | 'planning'>('fast')
  const [models, setModels] = useState<any[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [agentStatus, setAgentStatus] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showModels, setShowModels] = useState(false)
  const [showAddContext, setShowAddContext] = useState(false)
  const [atMentionQuery, setAtMentionQuery] = useState('')
  const [showAtMention, setShowAtMention] = useState(false)
  const isThinkingRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Initialize the internal Gemma 4 model
    const modelPath = state.localModelPath || 'd:\\exotic-matter\\models\\gemma-4-it.gguf'
    setAgentStatus('Initializing Gemma 4...')
    LocalAgentService.loadModel(modelPath).then(res => {
      if (res.success) {
        setModels([{ name: 'Gemma 4 (Local)' }])
        setSelectedModel('Gemma 4 (Local)')
        setAgentStatus('Gemma 4 Ready')
      } else {
        setAgentStatus(`Error: ${res.error}`)
      }
      setTimeout(() => setAgentStatus(null), 3000)
    })
  }, [])

  useEffect(() => {
    localStorage.setItem(`em_chat_${sessionId}`, JSON.stringify(messages))
    localStorage.setItem('em_active_session', sessionId)
    AGENT_EXECUTOR.setHistory(messages)

    if (messages.length > 1) {
      const exists = sessions.find(s => s.id === sessionId)
      if (!exists) {
        const firstUserMsg = messages.find(m => m.role === 'user' && !m.content.startsWith('[Tool result'))
        const title = firstUserMsg?.content.slice(0, 40) ?? 'New Chat'
        const updated = [{ id: sessionId, title, timestamp: Date.now() }, ...sessions].slice(0, 30)
        setSessions(updated)
        localStorage.setItem('em_chat_sessions', JSON.stringify(updated))
      }
    }
  }, [messages, sessionId])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isThinking])

  const newSession = () => {
    setSessionId(Date.now().toString())
    setMessages([{ role: 'assistant', content: 'I\'m Exotic Matter AI. Ask me anything about your code.' }])
    setShowHistory(false)
  }

  const loadSession = (id: string) => {
    try {
      const saved = localStorage.getItem(`em_chat_${id}`)
      if (saved) { setMessages(JSON.parse(saved)); setSessionId(id) }
    } catch { }
    setShowHistory(false)
  }

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = sessions.filter(s => s.id !== id)
    setSessions(updated)
    localStorage.setItem('em_chat_sessions', JSON.stringify(updated))
    localStorage.removeItem(`em_chat_${id}`)
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
    setAgentStatus(`Applying changes...`)
    await window.em.writeFile(path, content)
    setAgentStatus('Changes applied!')
    setTimeout(() => setAgentStatus(null), 2000)
  }

  const renderMessageContent = (content: string) => {
    const MARKER_START = 'PROPOSAL_START'
    const MARKER_END = 'PROPOSAL_END'

    if (!content.includes(MARKER_START)) return <MessageBody content={content} />

    const parts: React.ReactNode[] = []
    let cursor = 0

    while (cursor < content.length) {
      const startIdx = content.indexOf(MARKER_START, cursor)
      if (startIdx === -1) {
        parts.push(<MessageBody key={cursor} content={content.slice(cursor)} />)
        break
      }

      if (startIdx > cursor) parts.push(<MessageBody key={`text-${cursor}`} content={content.slice(cursor, startIdx)} />)

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
          <div key={`proposal-${startIdx}`} className="my-4 rounded-xl overflow-hidden border border-[var(--border-main)] shadow-lg hover:shadow-xl transition-shadow">
            {explanation && <div className="bg-[var(--bg-side)] p-3 text-[12px] text-[var(--text-main)] italic border-b border-[var(--border-main)]">{explanation}</div>}
            <DiffViewer path={path} oldValue={oldVal} newValue={newVal} onApply={() => handleApplyEdit(path, newVal)} onReject={() => { }} />
          </div>
        )
      }
      cursor = endIdx + MARKER_END.length
    }
    return <>{parts}</>
  }

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

  const activeSession = sessions.find(s => s.id === sessionId)
  const displayTitle = activeSession && activeSession.title && activeSession.title !== 'New Chat'
    ? activeSession.title
    : 'Exotic Matter AI'

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] relative overflow-hidden font-outfit text-[var(--text-main)]">
      {/* Premium Header */}
      <div className="h-[60px] px-5 border-b border-[var(--border-main)]/50 flex items-center justify-between bg-[var(--bg-main)]/80 backdrop-blur-md z-40 flex-shrink-0">
        <div className="flex items-center space-x-3.5 min-w-0 pr-2">
          <span className="text-[15px] text-[#f2f2f2] font-medium tracking-wide truncate">{displayTitle}</span>
        </div>
        <div className="flex items-center space-x-0.5 flex-shrink-0">
          {agentStatus && <span className="text-[10px] text-[#6b8cff] italic mr-2 animate-pulse font-medium px-2 py-0.5 bg-[#6b8cff]/10 rounded-full">{agentStatus}</span>}
          <button onClick={() => setShowHistory(!showHistory)} className={cn('p-1.5 rounded-lg flex items-center justify-center transition-all', showHistory ? 'bg-[#6b8cff]/10 text-[#6b8cff]' : 'text-[#525252] hover:text-[#d4d4d4] hover:bg-[#2b2b2b]')} title="History"><History size={15} strokeWidth={1.5} /></button>
          <button onClick={newSession} className="p-1.5 rounded-lg flex items-center justify-center text-[#525252] hover:text-[#d4d4d4] hover:bg-[#2b2b2b] transition-all" title="New Chat"><Plus size={16} strokeWidth={1.5} /></button>
          <button onClick={() => dispatch({ type: 'SET_CHAT_OPEN', open: false })} className="p-1.5 rounded-lg flex items-center justify-center text-[#525252] hover:text-[#d4d4d4] hover:bg-[#2b2b2b] transition-all ml-0.5" title="Close"><X size={16} strokeWidth={1.5} /></button>
        </div>
      </div>

      {/* History Layer */}
      {showHistory && (
        <div className="absolute inset-x-0 top-[60px] bottom-0 bg-[var(--bg-main)]/95 backdrop-blur-3xl z-[100] flex flex-col animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-5 flex-1 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] uppercase font-black text-[var(--text-muted)] tracking-[0.2em]">Chat History</h3>
            </div>
            {sessions.map(s => (
              <div key={s.id} onClick={() => loadSession(s.id)} className={cn('p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between group', sessionId === s.id ? 'bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/5' : 'bg-[var(--bg-side)] border-[var(--border-main)] hover:border-[var(--text-muted)]')}>
                <div className="flex-1 min-w-0 pr-2">
                  <div className={cn('text-[13px] truncate', sessionId === s.id ? 'text-white font-bold' : 'text-[var(--text-main)]')}>{s.title}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">{new Date(s.timestamp).toLocaleDateString()}</div>
                </div>
                <button onClick={e => deleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 p-2 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"><X size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!showHistory && (
        <>
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pt-6 pb-40 space-y-6 no-scrollbar">
            {messages.filter(m => m.role !== 'system').map((msg, i) => {
              // Tool Call Rendering
              if (msg.role === 'user' && msg.content.startsWith('[Tool result for')) {
                const toolNameMatch = msg.content.match(/\[Tool result for (.*?)\]/)
                const toolName = toolNameMatch ? toolNameMatch[1] : 'Tool'
                const resultCode = msg.content.replace(`[Tool result for ${toolName}]\n`, '')
                return (
                  <div key={i} className="flex flex-col items-start max-w-[90%] animate-in fade-in">
                    <details className="group border border-[var(--border-main)] bg-[var(--bg-side)]/50 rounded-xl overflow-hidden backdrop-blur-sm cursor-pointer w-full text-left">
                      <summary className="flex items-center space-x-2 px-3 py-2 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors select-none list-none outline-none">
                        <Settings size={12} className="text-emerald-500/70" />
                        <span>System Executed <span className="font-mono text-[10px] bg-black/20 px-1.5 py-0.5 ml-1 rounded text-[var(--text-main)]">{toolName}</span></span>
                        <ChevronRight size={12} className="ml-auto transform group-open:rotate-90 transition-transform" />
                      </summary>
                      <div className="border-t border-[var(--border-main)] p-3 bg-black/20 overflow-x-auto max-h-[300px]">
                        <pre className="text-[11px] text-[#A1A1AA] font-mono whitespace-pre-wrap">{resultCode || "Success"}</pre>
                      </div>
                    </details>
                  </div>
                )
              }

              const isUser = msg.role === 'user'
              return (
                <div key={i} className={cn('flex flex-col animate-in fade-in slide-in-from-bottom-2', isUser ? 'items-end' : 'items-start')}>
                  <div className="flex space-x-3 w-full max-w-full text-left">
                    <div className={cn('flex-1 min-w-0', isUser ? 'flex justify-end' : '')}>
                      <div className={cn(
                        'inline-block max-w-[90%] px-4 py-3 border border-[var(--border-main)] text-[13.5px] leading-relaxed break-words',
                        isUser ? 'bg-[var(--bg-side)] text-[var(--text-main)] rounded-2xl rounded-tr-md shadow-sm' : 'text-[var(--text-main)] rounded-2xl rounded-tl-sm border-transparent'
                      )}>
                        {isUser ? <div className="whitespace-pre-wrap">{msg.content}</div> : renderMessageContent(msg.content)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {isThinking && (
              <div className="flex space-x-3 w-full animate-in fade-in">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                  <Loader2 size={13} className="text-blue-400 animate-spin" />
                </div>
                <div className="bg-[var(--bg-side)]/50 border border-[var(--border-main)] px-4 py-2.5 rounded-2xl rounded-tl-sm flex items-center space-x-2">
                  <span className="text-[12.5px] text-[var(--text-muted)] italic font-medium tracking-wide">{agentStatus ?? 'Processing...'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Antigravity Input Area */}
          <div className="absolute bottom-5 left-5 right-5 z-50">
            {/* @file mention popup */}
            {showAtMention && filteredAtFiles.length > 0 && (
              <div className="absolute bottom-[calc(100%+12px)] left-0 w-[280px] bg-[#1e1e1e] border border-[#2b2b2b] rounded-xl overflow-hidden shadow-2xl z-50">
                <div className="px-3 py-2 text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest border-b border-[#2b2b2b]">Mention a file</div>
                <div className="max-h-[220px] overflow-y-auto no-scrollbar py-1.5">
                  {filteredAtFiles.map(f => (
                    <button key={f} onClick={() => insertAtMention(f)} className="w-full text-left px-3 py-2 text-[12.5px] text-[#cccccc] hover:bg-[#2b2b2b] hover:text-white transition-colors flex items-center space-x-2 group">
                      <AtSign size={13} className="text-[#888888] group-hover:text-white flex-shrink-0 transition-colors" />
                      <span className="truncate">{f.split(/[/\\]/).pop()}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* The Input Pill */}
            <div className="bg-[#1e1e1e] rounded-2xl border border-[#2b2b2b] shadow-2xl focus-within:border-[#4d4d4d] transition-all flex flex-col relative text-white">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                  if (e.key === 'Escape') setShowAtMention(false)
                }}
                placeholder="Ask anything, @ to mention, / for workflows"
                rows={1}
                className="w-full bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none text-[#e8e8e8] text-[14px] px-4 py-4 resize-none min-h-[56px] max-h-[200px] no-scrollbar placeholder:text-[#525252]"
                style={{ fieldSizing: 'content' } as any}
                disabled={isThinking}
              />

              <div className="flex items-center justify-between px-3 pb-3 pt-1">
                <div className="flex items-center space-x-2 ml-1">
                  {/* Add Context Button */}
                  <div className="relative">
                    <button onClick={() => setShowAddContext(!showAddContext)} className="w-[30px] h-[30px] rounded-full bg-[#303030] hover:bg-[#404040] flex items-center justify-center transition-colors text-[#a3a3a3] hover:text-[#d4d4d4]">
                      <Plus size={16} />
                    </button>
                    {showAddContext && (
                      <>
                        <div className="fixed inset-0 z-[190]" onClick={() => setShowAddContext(false)} />
                        <div className="absolute bottom-[calc(100%+12px)] left-0 min-w-[180px] bg-[#1a1a1a] border border-[#2b2b2b] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[200] animate-in fade-in slide-in-from-bottom-2">
                          <div className="px-4 py-3 border-b border-[#2b2b2b]">
                            <span className="text-[12.5px] text-[#a3a3a3]">Add context</span>
                          </div>
                          <div className="py-1.5 flex flex-col">
                            <button className="flex items-center space-x-3 px-4 py-2 hover:bg-[#303030] text-[13.5px] text-[#e8e8e8] transition-colors">
                              <Image size={15} className="text-[#a3a3a3]" />
                              <span>Media</span>
                            </button>
                            <button onClick={() => { setInput(prev => prev + '@'); setShowAddContext(false); textareaRef.current?.focus() }} className="flex items-center space-x-3 px-4 py-2 hover:bg-[#303030] text-[13.5px] text-[#e8e8e8] transition-colors">
                              <AtSign size={15} className="text-[#a3a3a3]" />
                              <span>Mentions</span>
                            </button>
                            <button className="flex items-center space-x-3 px-4 py-2 hover:bg-[#303030] text-[13.5px] text-[#e8e8e8] transition-colors">
                              <PenTool size={15} className="text-[#a3a3a3]" />
                              <span>Workflows</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Mode Select */}
                  <button onClick={() => setMode(m => m === 'fast' ? 'planning' : 'fast')} className={cn('flex items-center space-x-1.5 text-[13px] px-2 py-1.5 rounded-lg transition-colors', mode === 'planning' ? 'text-white bg-[#303030]' : 'text-[#a3a3a3] hover:text-[#d4d4d4] hover:bg-[#303030]')}>
                    <span className="capitalize">{mode}</span>
                    <ChevronDown size={14} className="ml-0.5" />
                  </button>

                  {/* Model Select */}
                  <div className="relative">
                    <button onClick={() => setShowModels(!showModels)} className="flex items-center space-x-1.5 text-[13px] px-2 py-1.5 rounded-lg text-[#a3a3a3] hover:text-[#d4d4d4] hover:bg-[#303030] transition-colors max-w-[150px]">
                      <span className="truncate">{selectedModel || 'Model'}</span>
                      <ChevronDown size={14} className="flex-shrink-0" />
                    </button>
                    {showModels && (
                      <>
                        <div className="fixed inset-0 z-[190]" onClick={() => setShowModels(false)} />
                        <div className="absolute bottom-[calc(100%+12px)] left-0 min-w-[220px] bg-[#1a1a1a] border border-[#2b2b2b] rounded-xl shadow-2xl overflow-hidden z-[200] animate-in fade-in slide-in-from-bottom-2">
                          <div className="py-1.5">
                            {models.length > 0 ? models.map(m => (
                              <button key={m.name} onClick={() => { setSelectedModel(m.name); setShowModels(false) }} className={cn('w-full text-left px-4 py-2.5 text-[13px] hover:bg-[#303030] transition-colors flex items-center space-x-2.5', selectedModel === m.name ? 'text-white' : 'text-[#a3a3a3]')}>
                                <span className="truncate">{m.name}</span>
                              </button>
                            )) : (
                              <div className="px-4 py-4 text-[12px] text-[#525252] text-center">No models detected</div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center space-x-2 pr-1">
                  <button className="w-[30px] h-[30px] flex items-center justify-center text-[#a3a3a3] hover:text-white transition-colors">
                    <Mic size={18} />
                  </button>
                  <button onClick={() => handleSend()} disabled={isThinking || !input.trim()} className={cn('w-[32px] h-[32px] rounded-full flex items-center justify-center transition-all duration-200', isThinking || !input.trim() ? 'bg-[#303030] text-[#737373] cursor-not-allowed' : 'bg-[#404040] text-white hover:bg-[#505050] active:scale-95')}>
                    {isThinking ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} strokeWidth={2.5} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MessageBody({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)
  const parts = content.split(/(```[\w]*\n[\s\S]*?```)/g)

  return (
    <div className="whitespace-pre-wrap leading-relaxed space-y-4 font-outfit">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const lineBreak = part.indexOf('\n')
          const lang = part.slice(3, lineBreak).trim()
          const code = part.slice(lineBreak + 1).replace(/```$/, '').trim()
          return (
            <div key={i} className="my-3 rounded-2xl overflow-hidden border border-[var(--border-main)] bg-[#0A0A0C] shadow-lg group">
              <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-[var(--border-main)]">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">{lang || 'code'}</span>
                <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className="text-[10px] font-bold text-[var(--text-muted)] hover:text-white flex items-center space-x-1.5 transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg active:scale-95">
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-4 overflow-x-auto no-scrollbar">
                <pre className="text-[12.5px] text-[#E4E4E5] font-mono leading-loose">{code}</pre>
              </div>
            </div>
          )
        }
        return <span key={i} className={cn("", part.startsWith('PLAN:') && 'font-bold text-blue-400')}>{part}</span>
      })}
    </div>
  )
}
