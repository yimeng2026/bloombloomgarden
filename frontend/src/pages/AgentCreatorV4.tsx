import { useState, useEffect } from 'react'
import {
  Layers, Users, UserCog, Cpu, ChevronRight, ChevronLeft,
  CheckCircle, Plus, X, Loader2, Sparkles, ArrowRight,
  Search, MessageSquare, Play
} from 'lucide-react'
import {
  fetchFrameworks, createTeam, createRole, fetchEngines,
  chatWithRole
} from '@/api/client'

/* ── Types ── */
interface Framework {
  id: string
  name: string
  category: string
  protocolLevel: number
  status: 'active' | 'inactive' | 'deprecated'
  description?: string
  version?: string
}

interface Engine {
  id: string
  brand: string
  model: string
  tier: string
  status: 'healthy' | 'unhealthy' | 'offline'
  healthScore: number
  description?: string
}

interface RoleForm {
  id: string
  name: string
  roleType: string
  systemPrompt: string
  primaryEngine: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/* ── Step Config ── */
const STEPS = [
  { id: 1, label: '选择框架', icon: Layers },
  { id: 2, label: '创建团队', icon: Users },
  { id: 3, label: '添加角色', icon: UserCog },
  { id: 4, label: '分配引擎', icon: Cpu },
]

const ROLE_TYPES = [
  { value: 'coordinator', label: '协调者', desc: '负责团队决策与任务分配' },
  { value: 'executor', label: '执行者', desc: '负责具体任务执行' },
  { value: 'analyst', label: '分析师', desc: '负责数据分析与洞察' },
  { value: 'creative', label: '创意者', desc: '负责创意生成与方案设计' },
  { value: 'reviewer', label: '审核者', desc: '负责质量检查与反馈' },
  { value: 'specialist', label: '专家', desc: '负责特定领域深度工作' },
]

export default function AgentCreatorV4() {
  const [step, setStep] = useState(1)
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [engines, setEngines] = useState<Engine[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  // Step 1
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null)
  const [fwSearch, setFwSearch] = useState('')

  // Step 2
  const [teamForm, setTeamForm] = useState({
    name: '',
    collaborationMode: 'hierarchical',
    description: '',
  })
  const [createdTeam, setCreatedTeam] = useState<any>(null)

  // Step 3
  const [roles, setRoles] = useState<RoleForm[]>([])

  // Step 4
  const [chatRoleId, setChatRoleId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  // Load frameworks & engines on mount
  useEffect(() => {
    async function load() {
      try {
        const [fwRes, engRes]: any = await Promise.all([
          fetchFrameworks(),
          fetchEngines(),
        ])
        setFrameworks(Array.isArray(fwRes) ? fwRes : fwRes.data || [])
        setEngines(Array.isArray(engRes) ? engRes : engRes.data || [])
      } catch (e) {
        console.error('Failed to load data:', e)
      }
    }
    load()
  }, [])

  /* ── Step 1: Framework ── */
  const filteredFrameworks = frameworks.filter((f) => {
    if (!fwSearch.trim()) return true
    const q = fwSearch.toLowerCase()
    return (
      f.name.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
    )
  })

  /* ── Step 2: Team ── */
  const handleCreateTeam = async () => {
    if (!teamForm.name.trim() || !selectedFramework) return
    try {
      setCreating(true)
      const res: any = await createTeam({
        name: teamForm.name,
        frameworkId: selectedFramework.id,
        collaborationMode: teamForm.collaborationMode,
        description: teamForm.description,
        roles: [], // 角色在 Step 3 单独添加
      })
      setCreatedTeam(res.data || res)
      setStep(3)
    } catch (e) {
      console.error('Failed to create team:', e)
      alert('创建团队失败，请重试')
    } finally {
      setCreating(false)
    }
  }

  /* ── Step 3: Roles ── */
  const addRole = () => {
    setRoles((prev) => [
      ...prev,
      {
        id: `role-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: '',
        roleType: 'executor',
        systemPrompt: '',
        primaryEngine: '',
      },
    ])
  }

  const removeRole = (id: string) => {
    setRoles((prev) => prev.filter((r) => r.id !== id))
  }

  const updateRole = (id: string, field: keyof RoleForm, value: string) => {
    setRoles((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    )
  }

  const handleCreateRoles = async () => {
    if (!createdTeam?.id) return
    const validRoles = roles.filter((r) => r.name.trim() && r.roleType)
    if (validRoles.length === 0) {
      alert('请至少添加一个角色')
      return
    }
    try {
      setCreating(true)
      for (const role of validRoles) {
        await createRole(createdTeam.id, {
          name: role.name,
          roleType: role.roleType,
          systemPrompt: role.systemPrompt,
          primaryEngine: role.primaryEngine || undefined,
        })
      }
      setStep(4)
    } catch (e) {
      console.error('Failed to create roles:', e)
      alert('创建角色失败，请重试')
    } finally {
      setCreating(false)
    }
  }

  /* ── Step 4: Chat with Role ── */
  const handleChatSend = async () => {
    if (!chatRoleId || !chatInput.trim() || chatLoading) return
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() }
    setChatMessages((prev) => [...prev, userMsg])
    setChatInput('')
    setChatLoading(true)
    try {
      const res: any = await chatWithRole(chatRoleId, userMsg.content)
      const response = res.data?.response || res.response || '无响应'
      setChatMessages((prev) => [...prev, { role: 'assistant', content: response }])
    } catch (e) {
      console.error('Chat error:', e)
      setChatMessages((prev) => [...prev, { role: 'assistant', content: '对话出现错误，请稍后重试。' }])
    } finally {
      setChatLoading(false)
    }
  }

  const openChat = (roleId: string) => {
    setChatRoleId(roleId)
    setChatMessages([])
    setChatInput('')
  }

  /* ── Navigation ── */
  const canNext = () => {
    switch (step) {
      case 1: return !!selectedFramework
      case 2: return !!teamForm.name.trim() && !!selectedFramework
      case 3: return roles.some((r) => r.name.trim())
      case 4: return true
      default: return false
    }
  }

  const goNext = () => {
    if (step === 2) {
      handleCreateTeam()
      return
    }
    if (step === 3) {
      handleCreateRoles()
      return
    }
    if (step < 4) setStep(step + 1)
  }

  const goBack = () => {
    if (step > 1) setStep(step - 1)
  }

  /* ── Render ── */
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-[var(--sage-500)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--sage-800)]">创建智能体</h1>
          <p className="text-sm text-[var(--sage-500)]">v4.0 架构 — 框架 → 团队 → 角色 → 引擎</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = step === s.id
          const isDone = step > s.id
          return (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-card text-sm font-medium transition-all flex-1 justify-center ${
                  isActive
                    ? 'bg-[var(--sage-500)] text-white shadow-md'
                    : isDone
                    ? 'bg-[var(--sage-100)] text-[var(--sage-600)]'
                    : 'bg-[var(--sage-50)] text-[var(--sage-400)]'
                }`}
              >
                {isDone ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-[var(--sage-300)] flex-shrink-0" />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Step 1: Select Framework ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--sage-800)]">选择框架</h2>
            <span className="text-xs text-[var(--sage-500)]">
              {frameworks.filter((f) => f.status === 'active').length} 个活跃框架
            </span>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
            <input
              type="text"
              value={fwSearch}
              onChange={(e) => setFwSearch(e.target.value)}
              placeholder="搜索框架..."
              className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
              style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFrameworks.map((fw) => {
              const isSelected = selectedFramework?.id === fw.id
              return (
                <button
                  key={fw.id}
                  onClick={() => setSelectedFramework(fw)}
                  className={`card p-4 text-left transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-[var(--sage-500)] bg-[var(--sage-50)]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                        <Layers className="w-5 h-5 text-[var(--sage-500)]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-[var(--sage-800)]">{fw.name}</h3>
                        <span className="text-[10px] text-[var(--sage-500)]">{fw.category}</span>
                      </div>
                    </div>
                    {isSelected && <CheckCircle className="w-5 h-5 text-[var(--sage-500)]" />}
                  </div>
                  {fw.description && (
                    <p className="text-xs text-[var(--sage-500)] mb-2 line-clamp-2">{fw.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-[var(--sage-400)]">
                    <span>协议级别: {fw.protocolLevel}</span>
                    {fw.version && <span>v{fw.version}</span>}
                  </div>
                </button>
              )
            })}
          </div>

          {filteredFrameworks.length === 0 && (
            <div className="card text-center py-12">
              <Layers className="w-10 h-10 text-[var(--sage-400)] mx-auto mb-2" />
              <p className="text-[var(--sage-500)] text-sm">暂无框架</p>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Create Team ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="px-3 py-1 rounded-full bg-[var(--sage-100)] text-xs text-[var(--sage-600)]">
              已选框架: {selectedFramework?.name}
            </div>
          </div>

          <h2 className="text-lg font-semibold text-[var(--sage-800)]">创建团队</h2>

          <div className="card p-6 space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-[var(--sage-700)] mb-1">团队名称 *</label>
              <input
                type="text"
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                placeholder="例如：数据分析团队"
                className="w-full px-3 py-2.5 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--sage-700)] mb-1">协作模式</label>
              <select
                value={teamForm.collaborationMode}
                onChange={(e) => setTeamForm({ ...teamForm, collaborationMode: e.target.value })}
                className="w-full px-3 py-2.5 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              >
                <option value="hierarchical">层级协作 — 自上而下任务分配</option>
                <option value="swarm">蜂群协作 — 去中心化自主协作</option>
                <option value="consensus">共识协作 — 投票决策</option>
                <option value="relay">中继协作 — 链式传递</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--sage-700)] mb-1">描述（可选）</label>
              <textarea
                value={teamForm.description}
                onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                placeholder="描述团队的职责与目标..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-card border text-sm resize-none"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Add Roles ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--sage-800)]">添加角色</h2>
              <span className="text-xs text-[var(--sage-500)]">
                团队: {createdTeam?.name || teamForm.name}
              </span>
            </div>
            <button
              onClick={addRole}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> 添加角色
            </button>
          </div>

          {roles.length === 0 && (
            <div className="card text-center py-12">
              <UserCog className="w-10 h-10 text-[var(--sage-400)] mx-auto mb-2" />
              <p className="text-[var(--sage-500)] text-sm mb-3">还没有角色，点击上方按钮添加</p>
              <button onClick={addRole} className="btn-primary flex items-center gap-2 mx-auto text-sm">
                <Plus className="w-4 h-4" /> 添加第一个角色
              </button>
            </div>
          )}

          <div className="space-y-3">
            {roles.map((role, idx) => (
              <div key={role.id} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-[var(--sage-500)]">角色 #{idx + 1}</span>
                  <button
                    onClick={() => removeRole(role.id)}
                    className="p-1 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--sage-600)] mb-1">角色名称 *</label>
                    <input
                      type="text"
                      value={role.name}
                      onChange={(e) => updateRole(role.id, 'name', e.target.value)}
                      placeholder="例如：数据分析师"
                      className="w-full px-3 py-2 rounded-card border text-sm"
                      style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--sage-600)] mb-1">角色类型 *</label>
                    <select
                      value={role.roleType}
                      onChange={(e) => updateRole(role.id, 'roleType', e.target.value)}
                      className="w-full px-3 py-2 rounded-card border text-sm"
                      style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                    >
                      {ROLE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label} — {t.desc}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-[var(--sage-600)] mb-1">系统提示词（可选）</label>
                    <textarea
                      value={role.systemPrompt}
                      onChange={(e) => updateRole(role.id, 'systemPrompt', e.target.value)}
                      placeholder="定义该角色的行为准则与专长..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-card border text-sm resize-none"
                      style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 4: Assign Engines ── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--sage-800)]">分配引擎 & 测试对话</h2>
            <span className="text-xs text-[var(--sage-500)]">
              {engines.filter((e) => e.status === 'healthy').length} 个健康引擎
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Engine Assignment */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[var(--sage-700)]">为角色分配引擎</h3>
              {roles.map((role, idx) => {
                const assignedEngine = engines.find((e) => e.id === role.primaryEngine)
                return (
                  <div key={role.id} className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCog className="w-4 h-4 text-[var(--sage-500)]" />
                      <span className="text-sm font-medium text-[var(--sage-800)]">
                        {role.name || `角色 #${idx + 1}`}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--sage-100)] text-[var(--sage-500)]">
                        {ROLE_TYPES.find((t) => t.value === role.roleType)?.label || role.roleType}
                      </span>
                    </div>
                    <select
                      value={role.primaryEngine}
                      onChange={(e) => updateRole(role.id, 'primaryEngine', e.target.value)}
                      className="w-full px-3 py-2 rounded-card border text-sm mb-2"
                      style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                    >
                      <option value="">选择引擎...</option>
                      {engines.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.brand} — {e.model} ({e.tier})
                        </option>
                      ))}
                    </select>
                    {assignedEngine && (
                      <div className="flex items-center gap-2 text-xs text-[var(--sage-500)]">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor:
                              assignedEngine.status === 'healthy'
                                ? '#10b981'
                                : assignedEngine.status === 'unhealthy'
                                ? '#f59e0b'
                                : '#6b7280',
                          }}
                        />
                        {assignedEngine.status === 'healthy' ? '健康' : assignedEngine.status === 'unhealthy' ? '异常' : '离线'}
                        <span className="text-[var(--sage-400)]">· 健康分: {assignedEngine.healthScore}</span>
                      </div>
                    )}
                    <button
                      onClick={() => openChat(role.id)}
                      className="mt-2 w-full flex items-center justify-center gap-2 py-1.5 rounded-card-sm text-xs transition-colors hover:bg-[var(--sage-100)]"
                      style={{ backgroundColor: 'var(--sage-50)', color: 'var(--sage-600)' }}
                    >
                      <MessageSquare className="w-3 h-3" />
                      测试对话
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Chat Panel */}
            <div>
              {chatRoleId ? (
                <div className="card flex flex-col h-[500px]">
                  <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'var(--sage-200)' }}>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[var(--sage-500)]" />
                      <span className="text-sm font-medium text-[var(--sage-800)]">
                        测试: {roles.find((r) => r.id === chatRoleId)?.name || '角色'}
                      </span>
                    </div>
                    <button
                      onClick={() => setChatRoleId(null)}
                      className="p-1 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-8 text-[var(--sage-400)] text-sm">
                        开始测试对话...
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
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
                  </div>

                  <div className="p-3 border-t" style={{ borderColor: 'var(--sage-200)' }}>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                        placeholder="输入测试消息..."
                        className="flex-1 px-3 py-2 rounded-card border text-sm"
                        style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                      />
                      <button
                        onClick={handleChatSend}
                        disabled={chatLoading || !chatInput.trim()}
                        className="px-3 py-2 rounded-card bg-[var(--sage-500)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card p-8 text-center h-[500px] flex flex-col items-center justify-center">
                  <MessageSquare className="w-12 h-12 text-[var(--sage-300)] mb-3" />
                  <p className="text-[var(--sage-500)] text-sm">点击角色卡片上的「测试对话」开始测试</p>
                </div>
              )}
            </div>
          </div>

          {/* Completion */}
          <div className="card p-6 text-center">
            <CheckCircle className="w-10 h-10 text-[#10b981] mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-[var(--sage-800)] mb-1">创建完成！</h3>
            <p className="text-sm text-[var(--sage-500)] mb-4">
              团队「{createdTeam?.name || teamForm.name}」已创建，包含 {roles.length} 个角色
            </p>
            <div className="flex items-center justify-center gap-3">
              <a
                href="#/teams"
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Users className="w-4 h-4" /> 查看团队
              </a>
              <a
                href="#/engines"
                className="px-4 py-2 rounded-card border text-sm flex items-center gap-2"
                style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-600)' }}
              >
                <Cpu className="w-4 h-4" /> 引擎调度
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
        <button
          onClick={goBack}
          disabled={step === 1 || creating}
          className="flex items-center gap-2 px-4 py-2 rounded-card border text-sm disabled:opacity-40"
          style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-600)' }}
        >
          <ChevronLeft className="w-4 h-4" /> 上一步
        </button>

        {step < 4 && (
          <button
            onClick={goNext}
            disabled={!canNext() || creating}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> 处理中...
              </>
            ) : step === 3 ? (
              <>
                <CheckCircle className="w-4 h-4" /> 确认创建
              </>
            ) : (
              <>
                下一步 <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
