import { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessageSquare, Send, Bot, User, Trash2, Settings, Wrench, Brain,
  ChevronDown, Plus, Paperclip, Sparkles, Clock, CheckCircle, AlertTriangle,
} from 'lucide-react'
import {
  streamLLM, chatLLM, loadLLMConfig, hasLLMConfig, LLMMessage,
  LLMConfig, PRESET_PROVIDERS, askLLMStream,
} from '../api/llmApi'

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

interface Agent {
  id: string
  name: string
  description: string
  icon: any
  color: string
  systemPrompt?: string
}

// ---------------------------------------------------------------------------
// Agent 预设 — 每个对应不同的 system prompt
// ---------------------------------------------------------------------------

const AGENTS: Agent[] = [
  {
    id: 'general', name: '通用助手', description: '全能型AI助手',
    icon: Bot, color: '#6b7a5a',
    systemPrompt: '你是一个 helpful 的 AI 助手，可以回答各种问题。'
  },
  {
    id: 'code', name: '代码专家', description: '编程与调试',
    icon: Wrench, color: '#3b82f6',
    systemPrompt: '你是一个专业的编程助手，精通多种编程语言，擅长代码审查、调试和优化。请给出可直接运行的代码，并附带解释。'
  },
  {
    id: 'creative', name: '创意写作', description: '文案与创作',
    icon: Sparkles, color: '#c97b84',
    systemPrompt: '你是一个创意写作助手，擅长文案、故事、诗歌、营销内容等创作。风格多变，富有想象力。'
  },
  {
    id: 'analyst', name: '数据分析师', description: '数据分析与可视化',
    icon: Brain, color: '#8b5cf6',
    systemPrompt: '你是一个数据分析师，擅长数据分析、统计推断、可视化建议和商业洞察。请用清晰的逻辑和结构化的方式呈现分析结果。'
  },
]

const STORAGE_KEY_MESSAGES = 'sylva_chat_messages'
const STORAGE_KEY_SESSIONS = 'sylva_chat_sessions'
const STORAGE_KEY_AGENT = 'sylva_chat_agent'

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

function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MESSAGES)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveMessages(msgs: Message[]) {
  try { localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(msgs)) } catch { /* quota exceeded */ }
}

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveSessions(sessions: ChatSession[]) {
  try { localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions)) } catch { /* quota exceeded */ }
}

// ---------------------------------------------------------------------------
// 组件
// ---------------------------------------------------------------------------

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>(loadMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_AGENT) || 'general'
  })
  const [showAgentPicker, setShowAgentPicker] = useState(false)
  const [showLLMConfig, setShowLLMConfig] = useState(false)
  const [llmConfig, setLLMConfig] = useState<LLMConfig>(loadLLMConfig)
  const [hasConfig, setHasConfig] = useState(hasLLMConfig)
  const [streamingContent, setStreamingContent] = useState('') // 当前流式片段
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions)
  const [showNewChat, setShowNewChat] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<(() => void) | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  // 持久化消息
  useEffect(() => {
    saveMessages(messages)
  }, [messages])

  const currentAgent = AGENTS.find((a) => a.id === selectedAgent) || AGENTS[0]

  // ---------------------------------------------------------------------------
  // 发送消息 — 前端直连 LLM，SSE 流式
  // ---------------------------------------------------------------------------

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    if (!hasConfig) {
      setShowLLMConfig(true)
      return
    }

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

    // 构造 LLM messages
    const llmMessages: LLMMessage[] = []
    if (currentAgent.systemPrompt) {
      llmMessages.push({ role: 'system', content: currentAgent.systemPrompt })
    }
    // 只取最近 20 条作为上下文（防止 token 爆炸）
    const contextMsgs = messages.slice(-20)
    for (const msg of contextMsgs) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        llmMessages.push({ role: msg.role, content: msg.content })
      }
    }
    llmMessages.push({ role: 'user', content: text })

    // 预创建 assistant 占位消息
    const assistantId = generateId()
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        agentName: currentAgent.name,
        timestamp: Date.now(),
        isStreaming: true,
      },
    ])

    try {
      let fullContent = ''
      let finalUsage: Message['usage'] | undefined
      let finalModel: string | undefined

      for await (const chunk of streamLLM({ messages: llmMessages, stream: true })) {
        fullContent += chunk.content
        setStreamingContent(fullContent)

        if (chunk.usage) finalUsage = chunk.usage
        if (chunk.model) finalModel = chunk.model

        // 实时更新消息内容
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: fullContent,
                  isStreaming: !chunk.done,
                  model: finalModel,
                  usage: finalUsage,
                }
              : m
          )
        )
      }

      // 流结束，标记完成
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, isStreaming: false, content: fullContent, model: finalModel, usage: finalUsage }
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
                content: `❌ 请求失败：${errorMsg}\n\n请检查：\n1. API Key 是否正确配置（点击右上角 ⚙️ 配置）\n2. 网络连接是否正常\n3. 当前 Provider 服务是否可用`,
                agentName: '系统错误',
              }
            : m
        )
      )
    } finally {
      setLoading(false)
    }
  }, [input, loading, hasConfig, messages, currentAgent])

  // ---------------------------------------------------------------------------
  // LLM 配置面板
  // ---------------------------------------------------------------------------

  const handleSaveConfig = () => {
    const { saveLLMConfig } = require('../api/llmApi')
    saveLLMConfig(llmConfig)
    setHasConfig(hasLLMConfig())
    setShowLLMConfig(false)
  }

  const handleTestConnection = async () => {
    const { testLLMConnection } = require('../api/llmApi')
    const result = await testLLMConnection(llmConfig)
    alert(result.ok
      ? `✅ 连接成功！延迟 ${result.latency}ms\n可用模型: ${result.model || '未知'}`
      : `❌ 连接失败：${result.error}`)
  }

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
      setSessions((prev) => [session, ...prev].slice(0, 50)) // 最多保留 50 个
      saveSessions([session, ...sessions].slice(0, 50))
    }
    setMessages([])
    saveMessages([])
    setShowNewChat(false)
  }

  const handleLoadSession = (session: ChatSession) => {
    if (messages.length > 0) {
      // 自动保存当前会话
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
    saveMessages(session.messages)
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
    saveMessages([])
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

        {/* Agent Picker */}
        <div className="p-3 border-b" style={{ borderColor: 'var(--sage-200)' }}>
          <button
            onClick={() => setShowAgentPicker(!showAgentPicker)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-card bg-[var(--sage-100)] hover:bg-[var(--sage-200)] transition-colors"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: currentAgent.color + '20' }}
            >
              {(() => {
                const Icon = currentAgent.icon
                return <Icon className="w-3 h-3" style={{ color: currentAgent.color }} />
              })()}
            </div>
            <span className="text-sm font-medium text-[var(--sage-800)]">{currentAgent.name}</span>
            <ChevronDown className="w-3 h-3 text-[var(--sage-400)] ml-auto" />
          </button>
        </div>

        {showAgentPicker && (
          <div className="p-2 space-y-1">
            {AGENTS.map((agent) => (
              <button
                key={agent.id}
                onClick={() => {
                  setSelectedAgent(agent.id)
                  localStorage.setItem(STORAGE_KEY_AGENT, agent.id)
                  setShowAgentPicker(false)
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-card text-left transition-colors ${
                  selectedAgent === agent.id
                    ? 'bg-[var(--sage-100)]'
                    : 'hover:bg-[var(--sage-50)]'
                }`}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: agent.color + '20' }}
                >
                  {(() => {
                    const Icon = agent.icon
                    return <Icon className="w-3 h-3" style={{ color: agent.color }} />
                  })()}
                </div>
                <div>
                  <p className="text-sm text-[var(--sage-800)]">{agent.name}</p>
                  <p className="text-[10px] text-[var(--sage-400)]">{agent.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

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
            <span className="text-sm font-medium text-[var(--sage-800)]">对话</span>
            {hasConfig ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                已配置
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 flex items-center gap-1 cursor-pointer"
                onClick={() => setShowLLMConfig(true)}
              >
                <AlertTriangle className="w-3 h-3" />
                未配置API
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowLLMConfig(true)}
              className="p-1.5 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)]"
              title="LLM 配置"
            >
              <Settings className="w-4 h-4" />
            </button>
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
              <p className="text-xs mt-1">选择左侧角色，输入消息即可</p>
              {!hasConfig && (
                <button
                  onClick={() => setShowLLMConfig(true)}
                  className="mt-4 px-4 py-2 rounded-card bg-[var(--sage-500)] text-white text-sm hover:bg-[var(--sage-600)]"
                >
                  配置 LLM API
                </button>
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
              placeholder={hasConfig
                ? `给 ${currentAgent.name} 发送消息...`
                : '⚠️ 请先点击右上角 ⚙️ 配置 LLM API'
              }
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
              disabled={!input.trim() || loading || !hasConfig}
              className="p-2.5 rounded-card bg-[var(--sage-500)] text-white hover:bg-[var(--sage-600)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* LLM Config Modal */}
        {showLLMConfig && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-card p-6 w-[480px] max-h-[80vh] overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--sage-800)]">LLM 配置</h2>
                <button
                  onClick={() => setShowLLMConfig(false)}
                  className="p-1 rounded hover:bg-[var(--sage-100)] text-[var(--sage-400)]"
                >
                  ✕
                </button>
              </div>

              {!hasConfig && (
                <div className="mb-4 p-3 rounded bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  未配置 API Key。请选择 Provider 并填写 API Key。
                </div>
              )}

              <div className="space-y-4">
                {/* Provider */}
                <div>
                  <label className="block text-sm font-medium text-[var(--sage-700)] mb-1">Provider</label>
                  <select
                    value={llmConfig.provider}
                    onChange={(e) => {
                      const p = PRESET_PROVIDERS.find((pr) => pr.value === e.target.value)
                      if (p) {
                        setLLMConfig((c) => ({
                          ...c,
                          provider: p.value,
                          baseUrl: p.baseUrl,
                          model: p.models[0] || c.model,
                        }))
                      }
                    }}
                    className="w-full px-3 py-2 rounded border text-sm"
                    style={{ borderColor: 'var(--sage-200)', background: 'var(--sage-50)' }}
                  >
                    {PRESET_PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                {/* Base URL */}
                <div>
                  <label className="block text-sm font-medium text-[var(--sage-700)] mb-1">Base URL</label>
                  <input
                    type="text"
                    value={llmConfig.baseUrl}
                    onChange={(e) => setLLMConfig((c) => ({ ...c, baseUrl: e.target.value }))}
                    className="w-full px-3 py-2 rounded border text-sm"
                    style={{ borderColor: 'var(--sage-200)', background: 'var(--sage-50)' }}
                  />
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-sm font-medium text-[var(--sage-700)] mb-1">API Key</label>
                  <input
                    type="password"
                    value={llmConfig.apiKey}
                    onChange={(e) => setLLMConfig((c) => ({ ...c, apiKey: e.target.value }))}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 rounded border text-sm"
                    style={{ borderColor: 'var(--sage-200)', background: 'var(--sage-50)' }}
                  />
                </div>

                {/* Model */}
                <div>
                  <label className="block text-sm font-medium text-[var(--sage-700)] mb-1">Model</label>
                  <input
                    type="text"
                    value={llmConfig.model}
                    onChange={(e) => setLLMConfig((c) => ({ ...c, model: e.target.value }))}
                    className="w-full px-3 py-2 rounded border text-sm"
                    style={{ borderColor: 'var(--sage-200)', background: 'var(--sage-50)' }}
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {PRESET_PROVIDERS.find((p) => p.value === llmConfig.provider)?.models.map((m) => (
                      <button
                        key={m}
                        onClick={() => setLLMConfig((c) => ({ ...c, model: m }))}
                        className="text-[10px] px-2 py-0.5 rounded bg-[var(--sage-100)] text-[var(--sage-600)] hover:bg-[var(--sage-200)]"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-[var(--sage-700)] mb-1">
                    Temperature: {llmConfig.temperature}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={llmConfig.temperature}
                    onChange={(e) => setLLMConfig((c) => ({ ...c, temperature: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleTestConnection}
                    className="flex-1 px-4 py-2 rounded-card border text-sm font-medium hover:bg-[var(--sage-50)]"
                    style={{ borderColor: 'var(--sage-200)' }}
                  >
                    测试连接
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    className="flex-1 px-4 py-2 rounded-card bg-[var(--sage-500)] text-white text-sm font-medium hover:bg-[var(--sage-600)]"
                  >
                    保存配置
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
