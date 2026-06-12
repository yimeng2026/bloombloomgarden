import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  MessageSquare, Send, Bot, User, Trash2, CheckCircle, AlertTriangle,
  Plus, Paperclip, Clock, Users, Zap, ChevronRight, Code, PenTool,
  BarChart3, Palette, Search, Briefcase, Eye, Building2, TestTube,
  Server, Headphones, Shield, Scale, HeartPulse, GraduationCap,
  Gamepad2, Megaphone, Sparkles, GitBranch, MessageCircle, Radio,
} from 'lucide-react'
import { getAgent, fetchAgents, fetchGroups } from '@/api/client'

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
  agentType?: string
  color?: string
  icon?: string
}

interface GroupInfo {
  id: string
  name: string
  description?: string
  groupType?: string
  status?: string
  color?: string
  icon?: string
  entityCount?: number
}

interface ChatTarget {
  id: string
  name: string
  type: 'agent' | 'group' | 'general'
  description?: string
  color?: string
  icon?: string
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

function loadMessages(targetId: string): Message[] {
  try {
    const raw = localStorage.getItem(`sylva_chat_messages_${targetId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveMessages(targetId: string, msgs: Message[]) {
  try { localStorage.setItem(`sylva_chat_messages_${targetId}`, JSON.stringify(msgs)) } catch { }
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
  try { localStorage.setItem('sylva_chat_sessions', JSON.stringify(sessions)) } catch { }
}

// Agent 类型图标映射
const AGENT_TYPE_ICONS: Record<string, React.ElementType> = {
  coding: Code, writing: PenTool, analysis: BarChart3, creative: Palette,
  research: Search, business: Briefcase, reviewer: Eye, architect: Building2,
  qa: TestTube, devops: Server, 'customer-service': Headphones,
  security: Shield, legal: Scale, medical: HeartPulse, education: GraduationCap,
  entertainment: Gamepad2, marketing: Megaphone, general: Sparkles,
}

// 群组类型图标映射
const GROUP_TYPE_ICONS: Record<string, React.ElementType> = {
  swarm: Zap, pipeline: GitBranch, committee: Users, debate: MessageCircle,
  'review-chain': Eye, broadcast: Radio,
}

// 颜色回退
function getColor(item: ChatTarget | AgentInfo | GroupInfo): string {
  return item.color || '#6B7280'
}

function getIcon(item: ChatTarget | AgentInfo | GroupInfo): React.ElementType {
  if (item.type === 'group' || ('groupType' in item && item.groupType)) {
    return GROUP_TYPE_ICONS[(item as any).groupType || 'swarm'] || Zap
  }
  if (item.type === 'general') return Sparkles
  return AGENT_TYPE_ICONS[(item as any).agentType || 'general'] || Sparkles
}

// ---------------------------------------------------------------------------
// 组件
// ---------------------------------------------------------------------------

export default function Chat() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const urlAgentId = searchParams.get('agentId') || 'general'

  // 目标ID可能是agentId或groupId
  const [targetId, setTargetId] = useState(urlAgentId)
  const [targetType, setTargetType] = useState<'agent' | 'group' | 'general'>(
    urlAgentId === 'general' ? 'general' : 'agent'
  )

  const [messages, setMessages] = useState<Message[]>(() => loadMessages(targetId))
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null)
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
  const [agentLoading, setAgentLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions)

  // 所有可对话目标
  const [allTargets, setAllTargets] = useState<ChatTarget[]>([])
  const [targetsLoading, setTargetsLoading] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  // 持久化消息
  useEffect(() => {
    saveMessages(targetId, messages)
  }, [messages, targetId])

  // 加载所有可对话目标（Agent + Group）
  useEffect(() => {
    let cancelled = false
    async function loadTargets() {
      try {
        setTargetsLoading(true)
        const [agentsRes, groupsRes] = await Promise.all([
          fetchAgents(),
          fetchGroups(),
        ])
        const agents = agentsRes.data || agentsRes || []
        const groups = groupsRes.data || groupsRes || []

        const targets: ChatTarget[] = [
          // 通用助手
          {
            id: 'general',
            name: '通用助手',
            type: 'general',
            description: '全能型AI助手',
            color: '#6B7280',
            icon: 'Sparkles',
          },
          // Agent 列表
          ...agents.map((a: any) => ({
            id: a.id,
            name: a.name || `Agent ${a.id.slice(-6)}`,
            type: 'agent' as const,
            description: a.description || a.role || '智能体',
            color: a.color,
            icon: a.icon,
            status: a.status,
            agentType: a.agentType,
          })),
          // 群组列表
          ...groups.map((g: any) => ({
            id: g.id,
            name: g.name || `群组 ${g.id.slice(-6)}`,
            type: 'group' as const,
            description: g.description || g.groupType || '群组',
            color: g.color,
            icon: g.icon,
            status: g.status,
            groupType: g.groupType,
            entityCount: g.entityCount || (g.agents?.length || 0),
          })),
        ]

        if (!cancelled) {
          setAllTargets(targets)
          // 如果当前 targetId 不在列表中，检查是否是群组
          const found = targets.find((t) => t.id === targetId)
          if (found) {
            setTargetType(found.type)
          }
        }
      } catch (e) {
        console.error('Failed to load targets:', e)
      } finally {
        if (!cancelled) setTargetsLoading(false)
      }
    }
    loadTargets()
    return () => { cancelled = true }
  }, [targetId])

  // 加载目标详情
  useEffect(() => {
    if (targetType === 'general') {
      setAgentInfo({ id: 'general', name: '通用助手', description: '全能型AI助手' })
      setGroupInfo(null)
      return
    }

    if (targetType === 'group') {
      setAgentInfo(null)
      const group = allTargets.find((t) => t.id === targetId && t.type === 'group')
      if (group) {
        setGroupInfo({
          id: group.id,
          name: group.name,
          description: group.description,
          groupType: (group as any).groupType,
          color: group.color,
          icon: group.icon,
        })
      }
      return
    }

    // Agent
    setGroupInfo(null)
    let cancelled = false
    async function loadAgent() {
      try {
        setAgentLoading(true)
        const res = await getAgent(targetId)
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
            agentType: data.agentType,
            color: data.color,
            icon: data.icon,
          })
        }
      } catch (e) {
        console.error('Failed to load agent:', e)
        if (!cancelled) {
          const fallback = allTargets.find((t) => t.id === targetId)
          setAgentInfo({
            id: targetId,
            name: fallback?.name || `Agent ${targetId.slice(-6)}`,
            description: fallback?.description || '无法加载智能体信息',
            color: fallback?.color,
            icon: fallback?.icon,
          })
        }
      } finally {
        if (!cancelled) setAgentLoading(false)
      }
    }
    loadAgent()
    return () => { cancelled = true }
  }, [targetId, targetType, allTargets])

  // 切换目标
  const handleSwitchTarget = (target: ChatTarget) => {
    if (target.id === targetId) return
    // 保存当前对话
    if (messages.length > 0) {
      const session: ChatSession = {
        id: generateId(),
        title: `${targetType === 'group' ? '群组' : 'Agent'} ${targetId.slice(-6)}: ${messages[0]?.content.slice(0, 20) || '对话'}`,
        messages: [...messages],
        createdAt: messages[0]?.timestamp || Date.now(),
        updatedAt: Date.now(),
      }
      setSessions((prev) => [session, ...prev].slice(0, 50))
      saveSessions([session, ...sessions].slice(0, 50))
    }
    // 切换
    setTargetId(target.id)
    setTargetType(target.type)
    setMessages(loadMessages(target.id))
    setStreamingContent('')
    // 更新 URL
    navigate(`/chat?agentId=${target.id}`, { replace: true })
  }

  // ---------------------------------------------------------------------------
  // 发送消息 — Agent 流式对话 / 群组执行
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

    const assistantId = generateId()
    const currentTarget = allTargets.find((t) => t.id === targetId)
    const assistantName = currentTarget?.name || (targetType === 'general' ? '通用助手' : 'AI')

    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        agentName: assistantName,
        timestamp: Date.now(),
        isStreaming: true,
      },
    ])

    // ============ 群组模式 ============
    if (targetType === 'group') {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
        const res = await fetch(`${API_BASE}/groups/${targetId}/swarm-execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: text, mode: 'parallel' }),
        })
        const data = await res.json()
        const result = data.data?.result || data.result || JSON.stringify(data)

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  isStreaming: false,
                  content: `📦 **群组执行结果**\n\n${result}\n\n---\n模式: ${data.data?.swarmMode || 'parallel'} | 群组: ${currentTarget?.name || targetId.slice(-6)}`,
                }
              : m
          )
        )
      } catch (err) {
        const errorMsg = (err as Error).message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  isStreaming: false,
                  content: `❌ 群组执行失败：${errorMsg}`,
                  agentName: '系统错误',
                }
              : m
          )
        )
      } finally {
        setLoading(false)
      }
      return
    }

    // ============ Agent 流式对话模式 ============
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
      const url = `${API_BASE}/dialog/${targetId}/stream`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              throw e
            }
          }
        }
      }

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
  }, [input, loading, targetId, targetType, allTargets, agentInfo, groupInfo, messages, sessions])

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
    saveMessages(targetId, [])
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
    saveMessages(targetId, session.messages)
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
    saveMessages(targetId, [])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 当前目标信息
  const currentTarget = allTargets.find((t) => t.id === targetId)
  const currentIcon = currentTarget ? getIcon(currentTarget) : Bot
  const currentColor = currentTarget ? getColor(currentTarget) : '#6B7280'

  // 分组目标
  const generalTargets = allTargets.filter((t) => t.type === 'general')
  const agentTargets = allTargets.filter((t) => t.type === 'agent')
  const groupTargets = allTargets.filter((t) => t.type === 'group')

  // ---------------------------------------------------------------------------
  // 渲染
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Sidebar */}
      <div
        className={`shrink-0 border-r flex flex-col transition-all duration-200 ${
          sidebarCollapsed ? 'w-[48px]' : 'w-[280px]'
        }`}
        style={{ borderColor: 'var(--sage-200)' }}
      >
        {/* Collapse Toggle */}
        <div className="flex items-center justify-between p-2 border-b" style={{ borderColor: 'var(--sage-200)' }}>
          {!sidebarCollapsed && (
            <span className="text-xs font-medium text-[var(--sage-600)] px-1">对话对象</span>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded hover:bg-[var(--sage-100)] text-[var(--sage-400)]"
            title={sidebarCollapsed ? '展开' : '收起'}
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`}
            />
          </button>
        </div>

        {/* New Chat */}
        <div className="p-2 border-b" style={{ borderColor: 'var(--sage-200)' }}>
          <button
            onClick={handleNewChat}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-card bg-[var(--sage-500)] text-white hover:bg-[var(--sage-600)] transition-colors text-sm font-medium ${
              sidebarCollapsed ? 'justify-center px-2' : ''
            }`}
          >
            <Plus className="w-4 h-4" />
            {!sidebarCollapsed && '新对话'}
          </button>
        </div>

        {/* Target List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {targetsLoading && (
            <p className="text-[10px] text-[var(--sage-400)] px-2">加载中...</p>
          )}

          {/* General */}
          {!sidebarCollapsed && generalTargets.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-[var(--sage-400)] px-2 mb-1 uppercase">通用</p>
              {generalTargets.map((t) => (
                <TargetItem
                  key={t.id}
                  target={t}
                  active={targetId === t.id}
                  onClick={() => handleSwitchTarget(t)}
                  collapsed={sidebarCollapsed}
                />
              ))}
            </div>
          )}

          {/* Agents */}
          {!sidebarCollapsed && agentTargets.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-[var(--sage-400)] px-2 mb-1 uppercase">
                智能体 ({agentTargets.length})
              </p>
              {agentTargets.map((t) => (
                <TargetItem
                  key={t.id}
                  target={t}
                  active={targetId === t.id}
                  onClick={() => handleSwitchTarget(t)}
                  collapsed={sidebarCollapsed}
                />
              ))}
            </div>
          )}

          {/* Groups */}
          {!sidebarCollapsed && groupTargets.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-[var(--sage-400)] px-2 mb-1 uppercase">
                群组 ({groupTargets.length})
              </p>
              {groupTargets.map((t) => (
                <TargetItem
                  key={t.id}
                  target={t}
                  active={targetId === t.id}
                  onClick={() => handleSwitchTarget(t)}
                  collapsed={sidebarCollapsed}
                />
              ))}
            </div>
          )}

          {/* Collapsed view: just icons */}
          {sidebarCollapsed && allTargets.map((t) => {
            const Icon = getIcon(t)
            const isActive = targetId === t.id
            return (
              <button
                key={t.id}
                onClick={() => handleSwitchTarget(t)}
                className={`w-full flex items-center justify-center p-2 rounded-lg transition-colors ${
                  isActive ? 'bg-[var(--sage-100)]' : 'hover:bg-[var(--sage-50)]'
                }`}
                title={t.name}
              >
                <Icon
                  className="w-5 h-5"
                  style={{ color: getColor(t) }}
                />
              </button>
            )
          })}
        </div>

        {/* Sessions */}
        {!sidebarCollapsed && (
          <div className="border-t p-2 max-h-[200px] overflow-y-auto" style={{ borderColor: 'var(--sage-200)' }}>
            <div className="flex items-center justify-between px-2 mb-1">
              <p className="text-[10px] font-medium text-[var(--sage-400)] uppercase">历史</p>
              <span className="text-[10px] text-[var(--sage-300)]">{sessions.length}</span>
            </div>
            {sessions.length === 0 && (
              <p className="text-[10px] text-[var(--sage-300)] px-2">暂无历史</p>
            )}
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleLoadSession(session)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--sage-50)] text-left transition-colors"
              >
                <MessageSquare className="w-3 h-3 text-[var(--sage-400)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[var(--sage-700)] truncate">{session.title}</p>
                  <p className="text-[9px] text-[var(--sage-400)]">{formatTime(session.updatedAt)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--sage-200)' }}>
          <div className="flex items-center gap-2">
            {(() => {
              const Icon = currentIcon
              return (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: currentColor + '20' }}
                >
                  <Icon className="w-4 h-4" style={{ color: currentColor }} />
                </div>
              )
            })()}
            <div>
              <span className="text-sm font-medium text-[var(--sage-800)]">
                {currentTarget?.name || '对话'}
              </span>
              <span className="text-[10px] text-[var(--sage-400)] ml-2">
                {targetType === 'group' ? '群组' : targetType === 'general' ? '通用' : 'Agent'}
              </span>
            </div>
            {targetType === 'agent' && agentInfo?.platformId ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {agentInfo.platformId}
              </span>
            ) : targetType === 'agent' && targetId !== 'general' ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                未绑定
              </span>
            ) : targetType === 'group' ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {(groupInfo?.groupType || 'swarm')}
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
              {(() => {
                const Icon = currentIcon
                return <Icon className="w-12 h-12 mb-3 opacity-30" />
              })()}
              <p className="text-sm">
                {targetType === 'group' ? '开始群组协作' : `与 ${currentTarget?.name || 'AI'} 对话`}
              </p>
              <p className="text-xs mt-1">
                {targetType === 'group'
                  ? '输入任务描述，群组将协同执行'
                  : '输入消息即可开始'}
              </p>
              {targetType === 'agent' && targetId !== 'general' && !agentInfo?.platformId && (
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
                    msg.role === 'user' ? 'var(--sage-200)' : currentColor,
                }}
              >
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-[var(--sage-600)]" />
                ) : (
                  (() => {
                    const Icon = currentIcon
                    return <Icon className="w-4 h-4 text-white" />
                  })()
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
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded text-white"
                      style={{ backgroundColor: currentColor + 'cc' }}
                    >
                      {msg.agentName}
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
                style={{ backgroundColor: currentColor }}
              >
                {(() => {
                  const Icon = currentIcon
                  return <Icon className="w-4 h-4 text-white" />
                })()}
              </div>
              <div className="flex items-center gap-2 p-3 rounded-card bg-white border"
                style={{ borderColor: 'var(--sage-200)' }}
              >
                <div className="w-4 h-4 border-2 border-[var(--sage-300)] border-t-[var(--sage-500)] rounded-full animate-spin" />
                <span className="text-xs text-[var(--sage-500)]">
                  {targetType === 'group' ? '群组执行中...' : '思考中...'}
                </span>
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
              placeholder={
                targetType === 'group'
                  ? '输入任务，群组协同执行...'
                  : currentTarget?.name
                  ? `给 ${currentTarget.name} 发送消息...`
                  : '发送消息...'
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
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-card text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ backgroundColor: currentColor }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 子组件：目标列表项
// ---------------------------------------------------------------------------

function TargetItem({
  target,
  active,
  onClick,
  collapsed,
}: {
  target: ChatTarget
  active: boolean
  onClick: () => void
  collapsed: boolean
}) {
  const Icon = getIcon(target)
  const color = getColor(target)

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
        active
          ? 'bg-[var(--sage-100)]'
          : 'hover:bg-[var(--sage-50)]'
      }`}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + '20' }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      {!collapsed && (
        <div className="flex-1 min-w-0">
          <p className={`text-xs truncate ${active ? 'font-medium text-[var(--sage-800)]' : 'text-[var(--sage-700)]'}`}>
            {target.name}
          </p>
          <p className="text-[9px] text-[var(--sage-400)] truncate">
            {target.type === 'group' ? '群组' : target.type === 'general' ? '通用' : target.description}
          </p>
        </div>
      )}
      {!collapsed && active && (
        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      )}
    </button>
  )
}
