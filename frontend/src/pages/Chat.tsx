import { useState, useEffect, useRef } from 'react'
import {
  MessageSquare, Send, Bot, User, Trash2, Settings, Wrench, Brain,
  ChevronDown, Plus, Paperclip, Sparkles, Clock, CheckCircle,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  thinking?: string
  agentName?: string
  timestamp: number
  isStreaming?: boolean
}

interface Agent {
  id: string
  name: string
  description: string
  icon: any
  color: string
}

const AGENTS: Agent[] = [
  { id: 'general', name: '通用助手', description: '全能型AI助手', icon: Bot, color: '#6b7a5a' },
  { id: 'code', name: '代码专家', description: '编程与调试', icon: Wrench, color: '#3b82f6' },
  { id: 'creative', name: '创意写作', description: '文案与创作', icon: Sparkles, color: '#c97b84' },
  { id: 'analyst', name: '数据分析师', description: '数据分析与可视化', icon: Brain, color: '#8b5cf6' },
]

const MOCK_HISTORY: Message[] = [
  {
    id: 'msg-1', role: 'user', content: '帮我分析一下这个月的销售数据',
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'msg-2', role: 'assistant', content: '好的，我来为您分析销售数据。从数据来看，本月销售额环比增长15%，主要增长来自华东地区。建议重点关注华南市场的潜力。',
    agentName: '数据分析师',
    timestamp: Date.now() - 3500000,
  },
  {
    id: 'msg-3', role: 'user', content: '能帮我写一个Python脚本来处理这些数据吗？',
    timestamp: Date.now() - 1800000,
  },
  {
    id: 'msg-4', role: 'assistant', content: '当然可以。以下是一个用于处理销售数据的Python脚本示例：\n\n```python\nimport pandas as pd\nimport matplotlib.pyplot as plt\n\ndef analyze_sales(data_path):\n    df = pd.read_csv(data_path)\n    # 按地区分组统计\n    region_stats = df.groupby("region")["sales"].sum()\n    # 绘制趋势图\n    region_stats.plot(kind="bar")\n    plt.show()\n```\n\n这个脚本可以读取CSV文件，按地区汇总销售额，并生成可视化图表。您可以根据实际数据结构进行调整。',
    agentName: '代码专家',
    timestamp: Date.now() - 1700000,
  },
]

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>(MOCK_HISTORY)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState('general')
  const [showAgentPicker, setShowAgentPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // 调用后端真实 API
    (async () => {
      try {
        const res = await fetch(`/api/dialog/${selectedAgent}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text, role: 'user' }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setLoading(false)
        const reply = json?.data?.content || json?.content || '（无回复）'
        const agent = AGENTS.find((a) => a.id === selectedAgent) || AGENTS[0]
        const assistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: reply,
          agentName: agent.name,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, assistantMsg])
      } catch (err) {
        setLoading(false)
        const assistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: `请求失败：${(err as Error).message}。请检查后端是否启动（localhost:3001）。`,
          agentName: '系统',
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, assistantMsg])
      }
    })()
  }

  const clearChat = () => {
    setMessages([])
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const currentAgent = AGENTS.find((a) => a.id === selectedAgent) || AGENTS[0]

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Sidebar - Agent Picker */}
      <div className="w-[240px] shrink-0 border-r flex flex-col" style={{ borderColor: 'var(--sage-200)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--sage-200)' }}>
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

        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-[10px] text-[var(--sage-400)] px-2 mb-2">历史会话</p>
          {[
            { name: '销售数据分析', time: '今天', agent: '数据分析师' },
            { name: 'Python脚本编写', time: '今天', agent: '代码专家' },
            { name: '产品文案构思', time: '昨天', agent: '创意写作' },
            { name: '周报总结', time: '昨天', agent: '通用助手' },
          ].map((chat, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 rounded-card hover:bg-[var(--sage-50)] cursor-pointer"
            >
              <MessageSquare className="w-3 h-3 text-[var(--sage-400)]" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--sage-700)] truncate">{chat.name}</p>
                <p className="text-[10px] text-[var(--sage-400)]">{chat.agent} · {chat.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--sage-200)' }}>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[var(--sage-500)]" />
            <span className="text-sm font-medium text-[var(--sage-800)]">对话</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600">在线</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearChat}
              className="p-1.5 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)]"
              title="清空对话"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  {msg.content}
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
                </div>
              </div>
            </div>
          ))}

          {loading && (
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
                <span className="text-xs text-[var(--sage-500)]">思考中...</span>
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={`给 ${currentAgent.name} 发送消息...`}
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
