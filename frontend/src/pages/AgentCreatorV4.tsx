import { useState, useEffect } from 'react'
import {
  Layers, Users, UserCog, Cpu, ChevronRight, ChevronLeft,
  CheckCircle, Plus, X, Loader2, Sparkles, Search, Server, Key
} from 'lucide-react'
import {
  fetchFrameworks, createTeam, createRole, fetchEngines,
  fetchPlatforms, fetchApiKeys, createAgent
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

interface Platform {
  id: string
  name: string
  category: string
  protocolLevel: number
  protocol: string
  threading: string
  status: string
  models: string[]
  apiKeySource: string
  apiKeyConfigured: boolean
}

interface ApiKey {
  id: string
  provider: string
  providerName: string
  displayName: string
  maskedKey: string
  isActive: boolean
  isValid: boolean | null
  baseUrl?: string
}

interface RoleForm {
  id: string
  name: string
  roleType: string
  systemPrompt: string
  primaryEngine: string
}

/* ── Step Config ── */
const STEPS = [
  { id: 1, label: '选择框架', icon: Layers },
  { id: 2, label: '创建团队', icon: Users },
  { id: 3, label: '添加角色', icon: UserCog },
  { id: 4, label: '选择平台', icon: Server },
  { id: 5, label: '选择API', icon: Key },
  { id: 6, label: '分配引擎', icon: Cpu },
]

const ROLE_TYPES = [
  { value: 'coordinator', label: '协调者', desc: '负责团队决策与任务分配' },
  { value: 'executor', label: '执行者', desc: '负责具体任务执行' },
  { value: 'analyst', label: '分析师', desc: '负责数据分析与洞察' },
  { value: 'creative', label: '创意者', desc: '负责创意生成与方案设计' },
  { value: 'reviewer', label: '审核者', desc: '负责质量检查与反馈' },
  { value: 'specialist', label: '专家', desc: '负责特定领域深度工作' },
]

const PROTOCOL_LEVEL_LABELS: Record<number, string> = {
  0: 'L0 基础设施',
  1: 'L1 单线程',
  2: 'L2 多线程',
  3: 'L3 网关',
}

export default function AgentCreatorV4() {
  const [step, setStep] = useState(1)
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [engines, setEngines] = useState<Engine[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [creationSuccess, setCreationSuccess] = useState(false)

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
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [platformSearch, setPlatformSearch] = useState('')

  // Step 5
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null)
  const [apiKeySearch, setApiKeySearch] = useState('')

  // Load frameworks, engines, platforms & apiKeys on mount
  useEffect(() => {
    async function load() {
      try {
        const [fwRes, engRes, platRes, keyRes]: any = await Promise.all([
          fetchFrameworks(),
          fetchEngines(),
          fetchPlatforms(),
          fetchApiKeys(),
        ])
        setFrameworks(Array.isArray(fwRes) ? fwRes : fwRes.data || [])
        setEngines(Array.isArray(engRes) ? engRes : engRes.data || [])
        setPlatforms(Array.isArray(platRes) ? platRes : platRes.data || [])
        setApiKeys(Array.isArray(keyRes) ? keyRes : keyRes.data || [])
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
        // 创建角色
        await createRole(createdTeam.id, {
          name: role.name,
          roleType: role.roleType,
          systemPrompt: role.systemPrompt,
          primaryEngine: role.primaryEngine || undefined,
          platformId: selectedPlatform?.id,
          apiKeyId: selectedApiKey?.id,
        })

        // 创建对应 Agent（传递 platformId 和 apiKeyId）
        try {
          await createAgent({
            name: role.name,
            role: role.roleType,
            description: role.systemPrompt,
            platformId: selectedPlatform?.id,
            apiKeyId: selectedApiKey?.id,
            groupId: createdTeam.id,
          })
        } catch (agentErr) {
          console.error(`Failed to create agent for role ${role.name}:`, agentErr)
        }
      }
      setCreationSuccess(true)
    } catch (e) {
      console.error('Failed to create roles:', e)
      alert('创建角色失败，请重试')
    } finally {
      setCreating(false)
    }
  }

  /* ── Step 4: Platform ── */
  const filteredPlatforms = platforms.filter((p) => {
    if (!platformSearch.trim()) return true
    const q = platformSearch.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.protocol.toLowerCase().includes(q)
    )
  })

  const platformsByLevel = filteredPlatforms.reduce<Record<number, Platform[]>>((acc, p) => {
    const level = p.protocolLevel ?? 0
    if (!acc[level]) acc[level] = []
    acc[level].push(p)
    return acc
  }, {})

  /* ── Step 5: API Key ── */
  const platformApiKeys = selectedPlatform
    ? apiKeys.filter((k) => k.provider === selectedPlatform.id)
    : []

  const filteredApiKeys = platformApiKeys.filter((k) => {
    if (!apiKeySearch.trim()) return true
    const q = apiKeySearch.toLowerCase()
    return (
      k.displayName.toLowerCase().includes(q) ||
      k.providerName.toLowerCase().includes(q) ||
      k.maskedKey.toLowerCase().includes(q)
    )
  })

  /* ── Navigation ── */
  const canNext = () => {
    switch (step) {
      case 1: return !!selectedFramework
      case 2: return !!teamForm.name.trim() && !!selectedFramework
      case 3: return roles.some((r) => r.name.trim())
      case 4: return !!selectedPlatform
      case 5: return !!selectedApiKey
      case 6: return true
      default: return false
    }
  }

  const goNext = () => {
    if (step === 2) {
      handleCreateTeam()
      return
    }
    if (step === 6) {
      handleCreateRoles()
      return
    }
    if (step < 6) setStep(step + 1)
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
          <p className="text-sm text-[var(--sage-500)]">v4.0 架构 — 框架 → 团队 → 角色 → 平台 → API → 引擎</p>
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

      {/* ── Step 4: Select Platform ── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--sage-800)]">选择平台</h2>
            <span className="text-xs text-[var(--sage-500)]">
              {platforms.length} 个平台可用
            </span>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
            <input
              type="text"
              value={platformSearch}
              onChange={(e) => setPlatformSearch(e.target.value)}
              placeholder="搜索平台..."
              className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
              style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
            />
          </div>

          <div className="space-y-6">
            {[0, 1, 2, 3].map((level) => {
              const levelPlatforms = platformsByLevel[level] || []
              if (levelPlatforms.length === 0) return null
              return (
                <div key={level} className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--sage-700)] flex items-center gap-2">
                    <Server className="w-4 h-4 text-[var(--sage-500)]" />
                    {PROTOCOL_LEVEL_LABELS[level] || `L${level}`}
                    <span className="text-xs font-normal text-[var(--sage-400)]">({levelPlatforms.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {levelPlatforms.map((plat) => {
                      const isSelected = selectedPlatform?.id === plat.id
                      return (
                        <button
                          key={plat.id}
                          onClick={() => {
                            setSelectedPlatform(plat)
                            setSelectedApiKey(null)
                          }}
                          className={`card p-4 text-left transition-all hover:shadow-md ${
                            isSelected ? 'ring-2 ring-[var(--sage-500)] bg-[var(--sage-50)]' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                                <Server className="w-5 h-5 text-[var(--sage-500)]" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-sm text-[var(--sage-800)]">{plat.name}</h3>
                                <span className="text-[10px] text-[var(--sage-500)]">{plat.category}</span>
                              </div>
                            </div>
                            {isSelected && <CheckCircle className="w-5 h-5 text-[var(--sage-500)]" />}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[var(--sage-400)] mb-2">
                            <span className="px-1.5 py-0.5 rounded bg-[var(--sage-100)]">{plat.protocol}</span>
                            <span>{plat.threading}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-[var(--sage-400)]">
                            <span>状态: {plat.status}</span>
                            {plat.apiKeyConfigured && (
                              <span className="text-[#10b981]">API已配置</span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {filteredPlatforms.length === 0 && (
            <div className="card text-center py-12">
              <Server className="w-10 h-10 text-[var(--sage-400)] mx-auto mb-2" />
              <p className="text-[var(--sage-500)] text-sm">暂无平台</p>
            </div>
          )}
        </div>
      )}

      {/* ── Step 5: Select API ── */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--sage-800)]">选择 API</h2>
            <span className="text-xs text-[var(--sage-500)]">
              平台: {selectedPlatform?.name}
            </span>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
            <input
              type="text"
              value={apiKeySearch}
              onChange={(e) => setApiKeySearch(e.target.value)}
              placeholder="搜索 API Key..."
              className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
              style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
            />
          </div>

          <div className="space-y-3 max-w-2xl">
            {filteredApiKeys.length === 0 && (
              <div className="card text-center py-8">
                <Key className="w-8 h-8 text-[var(--sage-400)] mx-auto mb-2" />
                <p className="text-[var(--sage-500)] text-sm">
                  {selectedPlatform
                    ? `平台「${selectedPlatform.name}」暂无 API Key`
                    : '请先选择平台'}
                </p>
              </div>
            )}

            {filteredApiKeys.map((key) => {
              const isSelected = selectedApiKey?.id === key.id
              return (
                <button
                  key={key.id}
                  onClick={() => setSelectedApiKey(key)}
                  className={`w-full card p-4 text-left transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-[var(--sage-500)] bg-[var(--sage-50)]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                        <Key className="w-5 h-5 text-[var(--sage-500)]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-[var(--sage-800)]">{key.displayName}</h3>
                        <span className="text-[10px] text-[var(--sage-500)]">{key.providerName}</span>
                      </div>
                    </div>
                    {isSelected && <CheckCircle className="w-5 h-5 text-[var(--sage-500)]" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--sage-400)]">
                    <span className="px-1.5 py-0.5 rounded bg-[var(--sage-100)]">{key.maskedKey}</span>
                    <span
                      className="px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: key.isActive ? '#dcfce7' : '#f3f4f6',
                        color: key.isActive ? '#166534' : '#6b7280',
                      }}
                    >
                      {key.isActive ? '已激活' : '未激活'}
                    </span>
                    {key.isValid === true && (
                      <span className="px-1.5 py-0.5 rounded bg-[#dcfce7] text-[#166534]">有效</span>
                    )}
                    {key.isValid === false && (
                      <span className="px-1.5 py-0.5 rounded bg-[#fee2e2] text-[#991b1b]">无效</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {selectedPlatform && platformApiKeys.length > 0 && (
            <div className="text-xs text-[var(--sage-500)]">
              已筛选出 {platformApiKeys.length} 个属于「{selectedPlatform.name}」的 API Key
            </div>
          )}
        </div>
      )}

      {/* ── Step 6: Assign Engines ── */}
      {step === 6 && (
        <div className="space-y-4">
          {!creationSuccess ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--sage-800)]">分配引擎</h2>
                <span className="text-xs text-[var(--sage-500)]">
                  {engines.length} 个引擎可用
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className="px-3 py-1 rounded-full bg-[var(--sage-100)] text-xs text-[var(--sage-600)]">
                  平台: {selectedPlatform?.name}
                </div>
                <div className="px-3 py-1 rounded-full bg-[var(--sage-100)] text-xs text-[var(--sage-600)]">
                  API: {selectedApiKey?.displayName}
                </div>
              </div>

              <div className="space-y-3 max-w-2xl">
                {roles.map((role, idx) => {
                  const assignedEngine = engines.find((e) => e.id === role.primaryEngine)
                  return (
                    <div key={role.id} className="card p-4">
                      <div className="flex items-center gap-2 mb-3">
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
                        className="w-full px-3 py-2.5 rounded-card border text-sm"
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
                        <div className="flex items-center gap-2 mt-2 text-xs text-[var(--sage-500)]">
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
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
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
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
        <button
          onClick={goBack}
          disabled={step === 1 || creating || (step === 6 && creationSuccess)}
          className="flex items-center gap-2 px-4 py-2 rounded-card border text-sm disabled:opacity-40"
          style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-600)' }}
        >
          <ChevronLeft className="w-4 h-4" /> 上一步
        </button>

        {step < 6 && (
          <button
            onClick={goNext}
            disabled={!canNext() || creating}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> 处理中...
              </>
            ) : (
              <>
                下一步 <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}

        {step === 6 && !creationSuccess && (
          <button
            onClick={goNext}
            disabled={!canNext() || creating}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> 处理中...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" /> 确认创建
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
