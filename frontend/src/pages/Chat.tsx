import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  MessageSquare, Send, Bot, User, Trash2, Settings, Wrench, Brain,
  ChevronDown, Plus, Paperclip, Sparkles, Clock, CheckCircle, AlertTriangle,
} from 'lucide-react'
import { getAgent } from '@/api/client'

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  thinking?: string
  agentName?: string
  timestamp: number
  isStreaming?: boolean
  model?: string
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

interface AgentInfo {
  id: string
  name: string
  description?: string
  role?: string
  platformId?: string
  apiKeyId?: string
  status?: string
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

function generateId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function formatTime(ts: number) {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function loadMessages(agentId: string): Message[] {
  try {
    const raw = localStorage.getItem(`sylva_chat_messages_${agentId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveMessages(agentId: string, msgs: Message[]) {
  try { localStorage.setItem(`sylva_chat_messages_${agentId}`, JSON.stringify(msgs)) } catch { /* quota exceeded */ }
}

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem('sylva_chat_sessions')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveSessions(sessions: ChatSession[]) {
  try { localStorage.setItem('sylva_chat_sessions', JSON.stringify(sessions)) } catch { /* quota exceeded */ }
}

// ---------------------------------------------------------------------------
// 组件
// ---------------------------------------------------------------------------

export default function Chat() {
  const [searchParams] = useSearchParams()
  const agentId = searchParams.get('agentId') || 'general'

  const [messages, setMessages] = useState<Message[]>(() => loadMessages(agentId))
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null)
  const [agentLoading, setAgentLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions)
  const [showNewChat, setShowNewChat] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  // 持久化消息
  useEffect(() => {
    saveMessages(agentId, messages)
  }, [messages, agentId])

  // 加载 Agent 信息
  useEffect(() => {
    if (agentId === 'general') {
      setAgentInfo({
        id: 'general',
        name: '通用助手',
        description: '全能型AI助手',
      })
      return
    }

    let cancelled = false
    async function loadAgent() {
      try {
        setAgentLoading(true)
        const res = await getAgent(agentId)
        const data = res.data || res
        if (!cancelled) {
          setAgentInfo({
            id: data.id,
            name: data.name,
            description: data.description,
            role: data.role,
            platformId: data.platformId,
            apiKeyId: data.apiKeyId,
            status: data.status,
          })
        }
      } catch (e) {
        console.error('Failed to load agent:', e)
        if (!cancelled) {
          setAgentInfo({
            id: agentId,
            name: `Agent ${agentId.slice(-6)}`,
            description: '无法加载智能体信息',
          })
        }
      } finally {
        if (!cancelled) setAgentLoading(false)
      }
    }
    loadAgent()
    return () => { cancelled = true }
  }, [agentId])

  // ---------------------------------------------------------------------------
  // 发送消息 — 通过后端 /api/dialog/:agentId/stream 流式对话
  // ---------------------------------------------------------------------------

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    // 用户消息
    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setStreamingContent('')

    // 预创建 assistant 占位消息
    const assistantId = generateId()
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        agentName: agentInfo?.name || 'AI',
        timestamp: Date.now(),
        isStreaming: true,
      },
    ])

    try {
      // 使用 SSE 流式调用后端 POST /api/dialog/:agentId/stream（安全版本，消息在body中）
      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/dialog/${agentId}/stream`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      })
      if (!response.ok) {
        throw new Error(`对话请求失败: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应')

      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue

          const dataStr = trimmed.slice(5).trim()
          if (!dataStr || dataStr === '{}') continue

          try {
            const data = JSON.parse(dataStr)
            // 处理错误事件
            if (data.error) {
              throw new Error(data.error)
            }
            if (data.content) {
              fullContent += data.content
              setStreamingContent(fullContent)
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: fullContent, isStreaming: true }
                    : m
                )
              )
            }
          } catch (e) {
            // 如果是我们抛出的错误，继续向上传播
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              throw e
            }
            // 其他解析错误忽略
          }
        }
      }

      // 流结束，标记完成
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, isStreaming: false, content: fullContent }
            : m
        )
      )
      setStreamingContent('')
    } catch (err) {
      const errorMsg = (err as Error).message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                isStreaming: false,
                content: `❌ 请求失败：${errorMsg}\n\n请检查：\n1. 智能体是否正确配置平台与API\n2. 网络连接是否正常\n3. 后端服务是否运行`,
                agentName: '系统错误',
              }
            : m
        )
      )
    } finally {
      setLoading(false)
    }
  }, [input, loading, agentId, agentInfo])

  // ---------------------------------------------------------------------------
  // 会话管理
  // ---------------------------------------------------------------------------

  const handleNewChat = () => {
    if (messages.length > 0) {
      const session: ChatSession = {
        id: generateId(),
        title: messages[0]?.content.slice(0, 30) || '新对话',
        messages: [...messages],
        createdAt: messages[0]?.timestamp || Date.now(),
        updatedAt: Date.now(),
      }
      setSessions((prev) => [session, ...prev].slice(0, 50))
      saveSessions([session, ...sessions].slice(0, 50))
    }
    setMessages([])
    saveMessages(agentId, [])
    setShowNewChat(false)
  }

  const handleLoadSession = (session: ChatSession) => {
    if (messages.length > 0) {
      const currentSession: ChatSession = {
        id: generateId(),
        title: messages[0]?.content.slice(0, 30) || '新对话',
        messages: [...messages],
        createdAt: messages[0]?.timestamp || Date.now(),
        updatedAt: Date.now(),
      }
      setSessions((prev) => [currentSession, ...prev].slice(0, 50))
    }
    setMessages(session.messages)
    saveMessages(agentId, session.messages)
  }

  const handleClearChat = () => {
    if (messages.length > 0) {
      const session: ChatSession = {
        id: generateId(),
        title: messages[0]?.content.slice(0, 30) || '新对话',
        messages: [...messages],
        createdAt: messages[0]?.timestamp || Date.now(),
        updatedAt: Date.now(),
      }
      setSessions((prev) => [session, ...prev].slice(0, 50))
      saveSessions([session, ...sessions].slice(0, 50))
    }
    setMessages([])
    saveMessages(agentId, [])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ---------------------------------------------------------------------------
  // 渲染
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Sidebar */}
      <div className="w-[260px] shrink-0 border-r flex flex-col" style={{ borderColor: 'var(--sage-200)' }}>
        {/* New Chat */}
        <div className="p-3 border-b" style={{ borderColor: 'var(--sage-200)' }}>
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-card bg-[var(--sage-500)] text-white hover:bg-[var(--sage-600)] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            新对话
          </button>
        </div>

        {/* Agent Info */}
        <div className="p-3 border-b" style={{ borderColor: 'var(--sage-200)' }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-card bg-[var(--sage-100)]">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--sage-500)' + '20' }}
            >
              <Bot className="w-3 h-3" style={{ color: 'var(--sage-500)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-[var(--sage-800)] truncate">
                {agentLoading ? '加载中...' : (agentInfo?.name || '通用助手')}
              </span>
              {agentInfo?.platformId && (
                <p className="text-[10px] text-[var(--sage-400)] truncate">
                  平台: {agentInfo.platformId}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-[10px] text-[var(--sage-400)]">历史会话</p>
            <span className="text-[10px] text-[var(--sage-300)]">{sessions.length}</span>
          </div>
          {sessions.length === 0 && (
            <p className="text-[10px] text-[var(--sage-300)] px-2">暂无历史会话</p>
          )}
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => handleLoadSession(session)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-card hover:bg-[var(--sage-50)] text-left transition-colors"
            >
              <MessageSquare className="w-3 h-3 text-[var(--sage-400)] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--sage-700)] truncate">{session.title}</p>
                <p className="text-[10px] text-[var(--sage-400)]">
                  {formatTime(session.updatedAt)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--sage-200)' }}>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[var(--sage-500)]" />
            <span className="text-sm font-medium text-[var(--sage-800)]">
              {agentInfo?.name || '对话'}
            </span>
            {agentInfo?.platformId ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                已绑定平台
              </span>
            ) : agentId !== 'general' ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                未绑定平台
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              className="p-1.5 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)]"
              title="清空对话"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-[var(--sage-400)]">
              <Bot className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">开始一个对话</p>
              <p className="text-xs mt-1">
                {agentInfo?.name ? `与 ${agentInfo.name} 对话` : '输入消息即可'}
              </p>
              {agentId !== 'general' && !agentInfo?.platformId && (
                <p className="text-xs mt-2 text-yellow-600">
                  ⚠️ 此智能体未绑定平台，请先配置平台与API
                </p>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor:
                    msg.role === 'user' ? 'var(--sage-200)' : 'var(--sage-500)',
                }}
              >
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-[var(--sage-600)]" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="max-w-[70%]">
                <div
                  className="rounded-card p-3 text-sm whitespace-pre-wrap"
                  style={{
                    backgroundColor:
                      msg.role === 'user' ? 'var(--sage-100)' : '#ffffff',
                    border:
                      msg.role === 'assistant'
                        ? '1px solid var(--sage-200)'
                        : 'none',
                  }}
                >
                  {msg.content || (msg.isStreaming ? (
                    <span className="inline-block w-2 h-4 bg-[var(--sage-400)] animate-pulse rounded-sm" />
                  ) : '')}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[var(--sage-400)]">
                    {formatTime(msg.timestamp)}
                  </span>
                  {msg.agentName && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sage-100)] text-[var(--sage-500)]">
                      {msg.agentName}
                    </span>
                  )}
                  {msg.model && (
                    <span className="text-[10px] text-[var(--sage-300)]">
                      {msg.model}
                    </span>
                  )}
                  {msg.usage && !msg.isStreaming && (
                    <span className="text-[10px] text-[var(--sage-300)]">
                      ↑{msg.usage.promptTokens} ↓{msg.usage.completionTokens}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--sage-500)' }}
              >
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-2 p-3 rounded-card bg-white border"
                style={{ borderColor: 'var(--sage-200)' }}
              >
                <div className="w-4 h-4 border-2 border-[var(--sage-300)] border-t-[var(--sage-500)] rounded-full animate-spin" />
                <span className="text-xs text-[var(--sage-500)]">准备中...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
          <div className="flex items-end gap-2">
            <button className="p-2 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)]">
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={agentInfo?.name ? `给 ${agentInfo.name} 发送消息...` : '发送消息...'}
              rows={1}
              className="flex-1 px-4 py-2.5 rounded-card border text-sm resize-none max-h-[120px]"
              style={{
                borderColor: 'var(--sage-200)',
                backgroundColor: 'var(--sage-50)',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = target.scrollHeight + 'px'
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-card bg-[var(--sage-500)] text-white hover:bg-[var(--sage-600)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
