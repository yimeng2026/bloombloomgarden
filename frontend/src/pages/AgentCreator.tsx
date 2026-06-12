import { useState, useEffect } from 'react'
import {
  Bot, Users, ChevronRight, ChevronLeft, CheckCircle, Plus, X, Loader2,
  Search, Server, Key, Cpu, MessageSquare, Sparkles
} from 'lucide-react'
import {
  fetchEngines, fetchPlatforms, fetchApiKeys, createAgent, fetchAgents
} from '@/api/client'

/* ── Types ── */
interface Engine {
  id: string
  brand: string
  model: string
  tier: string
  status: 'healthy' | 'unhealthy' | 'offline'
  healthScore: number
}

interface Platform {
  id: string
  name: string
  category: string
  protocolLevel: number
  status: string
  models: string[]
  apiKeyConfigured: boolean
}

interface ApiKey {
  id: string
  provider: string
  displayName: string
  maskedKey: string
  isActive: boolean
}

interface AgentOption {
  id: string
  name: string
  description?: string
  type: 'agent' | 'group'
}

/* ── Step Config ── */
const AGENT_STEPS = [
  { id: 1, label: '基本信息', icon: Bot },
  { id: 2, label: '选择平台', icon: Server },
  { id: 3, label: '配置API', icon: Key },
  { id: 4, label: '分配引擎', icon: Cpu },
]

const GROUP_STEPS = [
  { id: 1, label: '基本信息', icon: Users },
  { id: 2, label: '选择成员', icon: Bot },
  { id: 3, label: '配置模式', icon: Sparkles },
]

export default function AgentCreator() {
  const [mode, setMode] = useState<'agent' | 'group'>('agent')
  const [step, setStep] = useState(1)

  // Common
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Agent mode
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [engines, setEngines] = useState<Engine[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null)
  const [selectedEngine, setSelectedEngine] = useState('')

  // Group mode
  const [existingAgents, setExistingAgents] = useState<AgentOption[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [groupMode, setGroupMode] = useState('parallel')

  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [creationSuccess, setCreationSuccess] = useState(false)

  const steps = mode === 'agent' ? AGENT_STEPS : GROUP_STEPS

  useEffect(() => {
    async function load() {
      try {
        const [platRes, engRes, keyRes, agentRes]: any = await Promise.all([
          fetchPlatforms(),
          fetchEngines(),
          fetchApiKeys(),
          fetchAgents(),
        ])
        setPlatforms(Array.isArray(platRes) ? platRes : platRes.data || [])
        setEngines(Array.isArray(engRes) ? engRes : engRes.data || [])
        setApiKeys(Array.isArray(keyRes) ? keyRes : keyRes.data || [])
        const agents = Array.isArray(agentRes) ? agentRes : agentRes.data || []
        setExistingAgents(agents.map((a: any) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          type: a.type || 'agent',
        })))
      } catch (e) {
        console.error('Failed to load data:', e)
      }
    }
    load()
  }, [])

  const l1Platforms = platforms.filter(
    (p) => p.protocolLevel === 1 && ['cloud', 'local', 'local-engine'].includes(p.category)
  )
  const l2Platforms = platforms.filter(
    (p) => p.protocolLevel === 2 && p.category === 'orchestrator'
  )
  const availablePlatforms = [...l1Platforms, ...l2Platforms]

  const platformApiKeys = selectedPlatform
    ? apiKeys.filter((k) => k.provider === selectedPlatform.id)
    : []

  const isL2Platform = selectedPlatform?.protocolLevel === 2

  const canNext = () => {
    if (mode === 'agent') {
      switch (step) {
        case 1: return name.trim().length > 0
        case 2: return !!selectedPlatform
        case 3: return isL2Platform || !!selectedApiKey
        case 4: return isL2Platform || !!selectedEngine
        default: return false
      }
    } else {
      switch (step) {
        case 1: return name.trim().length > 0
        case 2: return selectedMembers.length > 0
        case 3: return true
        default: return false
      }
    }
  }

  const goNext = () => {
    if (mode === 'agent' && step === 4) {
      handleCreateAgent()
      return
    }
    if (mode === 'agent' && step === 2 && isL2Platform) {
      // L2 orchestrators skip API & engine steps
      handleCreateAgent()
      return
    }
    if (mode === 'group' && step === 3) {
      handleCreateGroup()
      return
    }
    if (step < steps.length) setStep(step + 1)
  }

  const goBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleCreateAgent = async () => {
    try {
      setCreating(true)
      await createAgent({
        name,
        description,
        platformId: selectedPlatform?.id,
        apiKeyId: selectedApiKey?.id || undefined,
        model: selectedModel || selectedPlatform?.models[0],
        engineId: selectedEngine || undefined,
      })
      setCreationSuccess(true)
    } catch (e) {
      console.error('Failed to create agent:', e)
      alert('创建失败')
    } finally {
      setCreating(false)
    }
  }

  const handleCreateGroup = async () => {
    try {
      setCreating(true)
      await createAgent({
        name,
        description,
        type: 'group',
        members: selectedMembers,
        groupMode,
      })
      setCreationSuccess(true)
    } catch (e) {
      console.error('Failed to create group:', e)
      alert('创建失败')
    } finally {
      setCreating(false)
    }
  }

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
          {mode === 'agent' ? <Bot className="w-5 h-5 text-[var(--sage-500)]" /> : <Users className="w-5 h-5 text-[var(--sage-500)]" />}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[var(--sage-800)]">
            {mode === 'agent' ? '创建智能体' : '创建智能体群组'}
          </h1>
          <p className="text-xs text-[var(--sage-500)]">
            {mode === 'agent' ? '配置平台、API 与引擎' : '从现有智能体中组合'}
          </p>
        </div>
      </div>

      {/* Mode Switch */}
      {!creationSuccess && (
        <div className="flex gap-2">
          <button
            onClick={() => { setMode('agent'); setStep(1); resetForm() }}
            className={`flex items-center gap-2 px-4 py-2 rounded-card text-sm ${mode === 'agent' ? 'bg-[var(--sage-500)] text-white' : 'bg-[var(--sage-100)] text-[var(--sage-600)]'}`}
          >
            <Bot className="w-4 h-4" /> 智能体
          </button>
          <button
            onClick={() => { setMode('group'); setStep(1); resetForm() }}
            className={`flex items-center gap-2 px-4 py-2 rounded-card text-sm ${mode === 'group' ? 'bg-[var(--sage-500)] text-white' : 'bg-[var(--sage-100)] text-[var(--sage-600)]'}`}
          >
            <Users className="w-4 h-4" /> 群组
          </button>
        </div>
      )}

      {/* Steps */}
      {!creationSuccess && (
        <div className="flex items-center gap-2">
          {steps.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs ${
                  step === s.id
                    ? 'bg-[var(--sage-500)] text-white'
                    : step > s.id
                    ? 'bg-[var(--sage-100)] text-[var(--sage-500)]'
                    : 'bg-[var(--sage-50)] text-[var(--sage-400)]'
                }`}
              >
                <s.icon className="w-3 h-3" />
                {s.label}
              </div>
              {idx < steps.length - 1 && (
                <ChevronRight className="w-3 h-3 text-[var(--sage-300)]" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="card p-6">
        {creationSuccess ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-[#10b981] mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-[var(--sage-800)] mb-1">
              {mode === 'agent' ? '智能体创建完成！' : '群组创建完成！'}
            </h3>
            <p className="text-sm text-[var(--sage-500)] mb-4">
              「{name}」已创建
            </p>
            <div className="flex items-center justify-center gap-3">
              <a href="#/agents" className="btn-primary text-sm">查看列表</a>
              <a href="#/chat" className="px-4 py-2 rounded-card border text-sm flex items-center gap-2" style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-600)' }}>
                <MessageSquare className="w-4 h-4" /> 开始对话
              </a>
            </div>
          </div>
        ) : mode === 'agent' ? (
          <AgentForm
            step={step}
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            platforms={availablePlatforms}
            selectedPlatform={selectedPlatform}
            setSelectedPlatform={setSelectedPlatform}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            apiKeys={platformApiKeys}
            selectedApiKey={selectedApiKey}
            setSelectedApiKey={setSelectedApiKey}
            engines={engines}
            selectedEngine={selectedEngine}
            setSelectedEngine={setSelectedEngine}
          />
        ) : (
          <GroupForm
            step={step}
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            existingAgents={existingAgents}
            selectedMembers={selectedMembers}
            toggleMember={toggleMember}
            groupMode={groupMode}
            setGroupMode={setGroupMode}
          />
        )}
      </div>

      {/* Navigation */}
      {!creationSuccess && (
        <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
          <button
            onClick={goBack}
            disabled={step === 1 || creating}
            className="flex items-center gap-2 px-4 py-2 rounded-card border text-sm disabled:opacity-40"
            style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-600)' }}
          >
            <ChevronLeft className="w-4 h-4" /> 上一步
          </button>

          <button
            onClick={goNext}
            disabled={!canNext() || creating}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {creating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 处理中...</>
            ) : step === steps.length ? (
              <><CheckCircle className="w-4 h-4" /> 确认创建</>
            ) : (
              <>下一步 <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      )}
    </div>
  )

  function resetForm() {
    setStep(1)
    setName('')
    setDescription('')
    setSelectedPlatform(null)
    setSelectedModel('')
    setSelectedApiKey(null)
    setSelectedEngine('')
    setSelectedMembers([])
    setGroupMode('parallel')
    setCreationSuccess(false)
  }
}

/* ── Agent Form ── */
function AgentForm({
  step, name, setName, description, setDescription,
  platforms, selectedPlatform, setSelectedPlatform,
  selectedModel, setSelectedModel,
  apiKeys, selectedApiKey, setSelectedApiKey,
  engines, selectedEngine, setSelectedEngine,
}: any) {
  const [search, setSearch] = useState('')

  if (step === 1) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--sage-700)] mb-1">名称</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="给智能体起个名字"
            className="w-full px-4 py-2.5 rounded-card border text-sm"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--sage-700)] mb-1">描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述这个智能体的用途..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-card border text-sm resize-none"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
          />
        </div>
      </div>
    )
  }

  if (step === 2) {
    const filtered = platforms.filter((p: Platform) =>
      !search || p.name.toLowerCase().includes(search.toLowerCase())
    )
    const l1Filtered = filtered.filter((p: Platform) => p.protocolLevel === 1)
    const l2Filtered = filtered.filter((p: Platform) => p.protocolLevel === 2)

    return (
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索平台或编排器..."
            className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
          />
        </div>

        {/* L1 基础框架 */}
        {l1Filtered.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-[var(--sage-600)] bg-[var(--sage-100)] px-2 py-0.5 rounded-full">基础框架</span>
              <span className="text-xs text-[var(--sage-400)]">{l1Filtered.length} 个平台</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {l1Filtered.map((p: Platform) => PlatformCard(p))}
            </div>
          </div>
        )}

        {/* L2 编排器 */}
        {l2Filtered.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-[var(--sage-600)] bg-[var(--sage-100)] px-2 py-0.5 rounded-full">编排器</span>
              <span className="text-xs text-[var(--sage-400)]">{l2Filtered.length} 个</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {l2Filtered.map((p: Platform) => PlatformCard(p))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="card text-center py-8">
            <Search className="w-8 h-8 text-[var(--sage-400)] mx-auto mb-2" />
            <p className="text-sm text-[var(--sage-500)]">未找到匹配的平台</p>
            <p className="text-xs text-[var(--sage-400)] mt-1">尝试搜索其他关键词或查看所有平台</p>
          </div>
        )}

        {selectedPlatform && (
          <div className="pt-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
            <label className="block text-sm font-medium text-[var(--sage-700)] mb-2">选择模型</label>
            <div className="flex flex-wrap gap-2">
              {selectedPlatform.models.map((m: string) => (
                <button
                  key={m}
                  onClick={() => setSelectedModel(m)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                    selectedModel === m
                      ? 'bg-[var(--sage-500)] text-white'
                      : 'bg-[var(--sage-100)] text-[var(--sage-600)] hover:bg-[var(--sage-200)]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  function PlatformCard(p: Platform) {
    const isSelected = selectedPlatform?.id === p.id
    const isL2 = p.protocolLevel === 2
    return (
      <button
        key={p.id}
        onClick={() => {
          setSelectedPlatform(p)
          setSelectedModel(p.models[0] || '')
        }}
        className={`card p-4 text-left transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-[var(--sage-500)] bg-[var(--sage-50)]' : ''}`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isL2 ? 'bg-amber-50' : 'bg-[var(--sage-100)]'}`}>
              <Server className={`w-5 h-5 ${isL2 ? 'text-amber-500' : 'text-[var(--sage-500)]'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[var(--sage-800)]">{p.name}</h3>
              <span className="text-[10px] text-[var(--sage-500)]">{p.category}{isL2 ? ' · L2编排' : ' · L1基础'}</span>
            </div>
          </div>
          {isSelected && <CheckCircle className="w-5 h-5 text-[var(--sage-500)]" />}
        </div>
        <div className="text-xs text-[var(--sage-400)]">
          {p.models.slice(0, 3).join(', ')}
          {p.models.length > 3 && ` +${p.models.length - 3}`}
        </div>
      </button>
    )
  }

  if (step === 3) {
    const isL2 = selectedPlatform?.protocolLevel === 2
    if (isL2) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--sage-700)]">选择 API Key</h3>
            <span className="text-xs text-[var(--sage-500)]">平台: {selectedPlatform?.name}</span>
          </div>
          <div className="card text-center py-8">
            <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-sm text-[var(--sage-600)] font-medium">L2 编排器无需 API Key</p>
            <p className="text-xs text-[var(--sage-400)] mt-1">{selectedPlatform?.name} 是编排器框架，不需要 API Key 配置</p>
          </div>
        </div>
      )
    }
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--sage-700)]">选择 API Key</h3>
          <span className="text-xs text-[var(--sage-500)]">平台: {selectedPlatform?.name}</span>
        </div>
        {apiKeys.length === 0 ? (
          <div className="card text-center py-8">
            <Key className="w-8 h-8 text-[var(--sage-400)] mx-auto mb-2" />
            <p className="text-sm text-[var(--sage-500)]">暂无 API Key，请先在平台管理中配置</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((k: ApiKey) => {
              const isSelected = selectedApiKey?.id === k.id
              return (
                <button
                  key={k.id}
                  onClick={() => setSelectedApiKey(k)}
                  className={`w-full card p-4 text-left transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-[var(--sage-500)] bg-[var(--sage-50)]' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                        <Key className="w-5 h-5 text-[var(--sage-500)]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-[var(--sage-800)]">{k.displayName}</h3>
                        <span className="text-[10px] text-[var(--sage-500)]">{k.maskedKey}</span>
                      </div>
                    </div>
                    {isSelected && <CheckCircle className="w-5 h-5 text-[var(--sage-500)]" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (step === 4) {
    const isL2 = selectedPlatform?.protocolLevel === 2
    if (isL2) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--sage-700)]">分配引擎</h3>
            <span className="text-xs text-[var(--sage-500)]">平台: {selectedPlatform?.name}</span>
          </div>
          <div className="card text-center py-8">
            <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-sm text-[var(--sage-600)] font-medium">L2 编排器无需分配引擎</p>
            <p className="text-xs text-[var(--sage-400)] mt-1">{selectedPlatform?.name} 使用内部协议调度，不需要外部引擎</p>
          </div>
        </div>
      )
    }
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--sage-700)]">分配引擎</h3>
          <span className="text-xs text-[var(--sage-500)]">{engines.length} 个可用</span>
        </div>
        <div className="space-y-3">
          {engines.map((e: Engine) => {
            const isSelected = selectedEngine === e.id
            return (
              <button
                key={e.id}
                onClick={() => setSelectedEngine(e.id)}
                className={`w-full card p-4 text-left transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-[var(--sage-500)] bg-[var(--sage-50)]' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                      <Cpu className="w-5 h-5 text-[var(--sage-500)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-[var(--sage-800)]">{e.brand}</h3>
                      <span className="text-[10px] text-[var(--sage-500)]">{e.model} · {e.tier}</span>
                    </div>
                  </div>
                  {isSelected && <CheckCircle className="w-5 h-5 text-[var(--sage-500)]" />}
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-[var(--sage-500)]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.status === 'healthy' ? '#10b981' : e.status === 'unhealthy' ? '#f59e0b' : '#6b7280' }} />
                  {e.status === 'healthy' ? '健康' : e.status === 'unhealthy' ? '异常' : '离线'}
                  <span className="text-[var(--sage-400)]">· 健康分: {e.healthScore}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return null
}

/* ── Group Form ── */
function GroupForm({
  step, name, setName, description, setDescription,
  existingAgents, selectedMembers, toggleMember,
  groupMode, setGroupMode,
}: any) {
  const [search, setSearch] = useState('')

  if (step === 1) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--sage-700)] mb-1">群组名称</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="给群组起个名字"
            className="w-full px-4 py-2.5 rounded-card border text-sm"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--sage-700)] mb-1">描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述这个群组的用途..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-card border text-sm resize-none"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
          />
        </div>
      </div>
    )
  }

  if (step === 2) {
    const filtered = existingAgents.filter((a: AgentOption) =>
      !search || a.name.toLowerCase().includes(search.toLowerCase())
    )
    return (
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索智能体..."
            className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
          />
        </div>
        <div className="text-xs text-[var(--sage-500)]">
          已选择 {selectedMembers.length} 个成员
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filtered.map((a: AgentOption) => {
            const isSelected = selectedMembers.includes(a.id)
            return (
              <button
                key={a.id}
                onClick={() => toggleMember(a.id)}
                className={`w-full card p-3 text-left transition-all hover:shadow-md flex items-center gap-3 ${isSelected ? 'ring-2 ring-[var(--sage-500)] bg-[var(--sage-50)]' : ''}`}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                  {a.type === 'group' ? <Users className="w-4 h-4 text-[var(--sage-500)]" /> : <Bot className="w-4 h-4 text-[var(--sage-500)]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-[var(--sage-800)]">{a.name}</h3>
                  {a.description && <p className="text-[10px] text-[var(--sage-400)] truncate">{a.description}</p>}
                </div>
                {isSelected && <CheckCircle className="w-5 h-5 text-[var(--sage-500)]" />}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-[var(--sage-700)]">协作模式</h3>
        <div className="space-y-3">
          {[
            { value: 'parallel', label: '并行', desc: '所有成员同时处理，结果汇总' },
            { value: 'serial', label: '串行', desc: '成员按顺序接力处理' },
            { value: 'vote', label: '投票', desc: '多个成员独立判断，多数决' },
            { value: 'delegate', label: '委派', desc: '协调者分配任务给执行者' },
          ].map((m) => (
            <button
              key={m.value}
              onClick={() => setGroupMode(m.value)}
              className={`w-full card p-4 text-left transition-all hover:shadow-md ${groupMode === m.value ? 'ring-2 ring-[var(--sage-500)] bg-[var(--sage-50)]' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-[var(--sage-800)]">{m.label}</h3>
                  <p className="text-xs text-[var(--sage-500)] mt-1">{m.desc}</p>
                </div>
                {groupMode === m.value && <CheckCircle className="w-5 h-5 text-[var(--sage-500)]" />}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return null
}
