import { useState, useEffect, useRef } from 'react'
import {
  Cpu, Plus, Search, MessageSquare, X, Send, Loader2,
  CheckCircle, XCircle, Activity, User
} from 'lucide-react'
import { fetchEngines, chatWithEngine, streamChatWithEngine } from '@/api/client'

interface Engine {
  id: string
  brand: string
  model: string
  tier: string
  status: 'healthy' | 'unhealthy' | 'offline'
  healthScore: number
  description?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  healthy: { color: '#10b981', label: '健康' },
  unhealthy: { color: '#f59e0b', label: '异常' },
  offline: { color: '#6b7280', label: '离线' },
}

export default function Engines() {
  const [engines, setEngines] = useState<Engine[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [chatEngine, setChatEngine] = useState<Engine | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res: any = await fetchEngines()
        const data = res.data || res
        setEngines(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error('Failed to fetch engines:', e)
        setEngines([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const filtered = engines.filter((e) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      e.brand.toLowerCase().includes(q) ||
      e.model.toLowerCase().includes(q) ||
      e.tier.toLowerCase().includes(q)
    )
  })

  const healthyCount = engines.filter((e) => e.status === 'healthy').length

  const handleSend = async () => {
    if (!chatEngine || !input.trim() || chatLoading) return
    const userMsg: ChatMessage = { role: 'user', content: input.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setChatLoading(true)

    try {
      const newMessages = [...messages, userMsg]
      const res: any = await chatWithEngine(chatEngine.id, newMessages)
      const assistantContent = res.data?.content || res.content || res.message || JSON.stringify(res)
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }])
    } catch (e) {
      console.error('Chat error:', e)
      setMessages((prev) => [...prev, { role: 'assistant', content: '抱歉，对话出现错误，请稍后重试。' }])
    } finally {
      setChatLoading(false)
    }
  }

  const openChat = (engine: Engine) => {
    setChatEngine(engine)
    setMessages([])
    setInput('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cpu className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">引擎调度</h1>
            <p className="text-sm text-[var(--sage-500)]">
              {engines.length} 个引擎 · {healthyCount} 健康
            </p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> 新建引擎
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索引擎..."
          className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[var(--sage-500)] gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>加载中...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Cpu className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" />
          <p className="text-[var(--sage-500)]">暂无引擎</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((engine) => {
            const status = STATUS_CONFIG[engine.status] || STATUS_CONFIG.offline
            return (
              <div key={engine.id} className="card p-4 transition-all hover:shadow-md">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                      <Cpu className="w-5 h-5 text-[var(--sage-500)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-[var(--sage-800)]">{engine.brand}</h3>
                      <span className="text-[10px] text-[var(--sage-500)]">{engine.model}</span>
                    </div>
                  </div>
                  <span
                    className="text-[10px] px-2 py-1 rounded-full"
                    style={{ backgroundColor: status.color + '15', color: status.color }}
                  >
                    {status.label}
                  </span>
                </div>
                {engine.description && (
                  <p className="text-xs text-[var(--sage-500)] mb-3 line-clamp-2">{engine.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-[var(--sage-400)] mb-3">
                  <span>层级: {engine.tier}</span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    健康分: {engine.healthScore}
                  </span>
                </div>
                <button
                  onClick={() => openChat(engine)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-card-sm text-xs font-medium transition-colors hover:bg-[var(--sage-100)]"
                  style={{ backgroundColor: 'var(--sage-50)', color: 'var(--sage-600)' }}
                >
                  <MessageSquare className="w-4 h-4" />
                  与引擎对话
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Chat Panel */}
      {chatEngine && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card w-[500px] max-w-[90vw] h-[600px] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--sage-200)' }}>
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[var(--sage-500)]" />
                <div>
                  <h3 className="font-semibold text-sm text-[var(--sage-800)]">
                    {chatEngine.brand} — {chatEngine.model}
                  </h3>
                  <span className="text-[10px] text-[var(--sage-500)]">引擎对话</span>
                </div>
              </div>
              <button
                onClick={() => setChatEngine(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8 text-[var(--sage-400)] text-sm">
                  开始与 {chatEngine.brand} 对话...
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-[var(--sage-100)] flex items-center justify-center flex-shrink-0">
                      <Cpu className="w-3 h-3 text-[var(--sage-500)]" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                      msg.role === 'user'
                        ? 'bg-[var(--sage-500)] text-white'
                        : 'bg-[var(--sage-50)] text-[var(--sage-700)]'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-[var(--sage-500)] flex items-center justify-center flex-shrink-0">
                      <User className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--sage-100)] flex items-center justify-center flex-shrink-0">
                    <Cpu className="w-3 h-3 text-[var(--sage-500)]" />
                  </div>
                  <div className="bg-[var(--sage-50)] px-3 py-2 rounded-lg text-sm text-[var(--sage-500)] flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    思考中...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="输入消息..."
                  className="flex-1 px-3 py-2 rounded-card border text-sm"
                  style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                />
                <button
                  onClick={handleSend}
                  disabled={chatLoading || !input.trim()}
                  className="px-3 py-2 rounded-card bg-[var(--sage-500)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
