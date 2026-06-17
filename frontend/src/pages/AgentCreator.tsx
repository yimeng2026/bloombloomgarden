import { useState, useEffect } from 'react'
import {
  Bot, Users, ChevronRight, ChevronLeft, CheckCircle, Plus, X, Loader2,
  Search, Server, Key, Cpu, MessageSquare, Sparkles, Wand2, ArrowLeft,
  ArrowRightLeft, GitBranch, Layers, Zap, Eye, Radio,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  fetchEngines, fetchPlatforms, fetchApiKeys, createAgent, fetchAgents,
  fetchAgentTemplates
} from '@/api/client'
import AgentTypeSelector, { AGENT_TYPES, AgentTypeConfig } from '@/components/AgentTypeSelector'
import ColorPicker from '@/components/ColorPicker'
import IconPicker from '@/components/IconPicker'

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

interface AgentTemplate {
  id: string
  name: string
  description: string
  agentType: string
  systemPrompt: string
  capabilities: string[]
  color: string
  icon: string
  personality?: string
}

/* ── Step Config ── */
const AGENT_STEPS = [
  { id: 1, label: '选择类型', icon: Wand2 },
  { id: 2, label: '选择平台', icon: Server },
  { id: 3, label: '个性化配置', icon: Sparkles },
  { id: 4, label: '确认创建', icon: CheckCircle },
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
  const [selectedType, setSelectedType] = useState<AgentTypeConfig | null>(null)
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [engines, setEngines] = useState<Engine[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null)
  const [selectedEngine, setSelectedEngine] = useState('')

  // Personalization
  const [systemPrompt, setSystemPrompt] = useState('')
  const [capabilities, setCapabilities] = useState<string[]>([])
  const [color, setColor] = useState('')
  const [icon, setIcon] = useState('')
  const [personality, setPersonality] = useState('')
  const [newCapability, setNewCapability] = useState('')

  // Templates
  const [templates, setTemplates] = useState<AgentTemplate[]>([])
  const [showTemplates, setShowTemplates] = useState(false)

  // Group mode
  const [existingAgents, setExistingAgents] = useState<AgentOption[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [swarmMode, setSwarmMode] = useState('parallel')
  const [groupType, setGroupType] = useState('swarm')
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false)

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

  useEffect(() => {
    if (mode === 'agent' && showTemplates) {
      fetchAgentTemplates().then((res: any) => {
        setTemplates(Array.isArray(res) ? res : res.data || [])
      }).catch(() => {
        setTemplates([])
      })
    }
  }, [mode, showTemplates])

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
        case 1: return !!selectedType
        case 2: return !!selectedPlatform
        case 3: return name.trim().length > 0 && (isL2Platform || (!!selectedApiKey && !!selectedEngine))
        case 4: return true
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
      // L2 orchestrators skip API & engine steps, go to personalization
      setStep(3)
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

  const handleSelectType = (type: AgentTypeConfig) => {
    setSelectedType(type)
    setName(type.name)
    setSystemPrompt(type.defaultSystemPrompt)
    setCapabilities([...type.defaultCapabilities])
    setColor(type.defaultColor)
    setIcon(type.icon)

    // Auto-select platform if available
    const recommendedPlat = availablePlatforms.find(p =>
      type.recommendedPlatforms.some(rp =>
        p.id.toLowerCase().includes(rp.toLowerCase()) ||
        p.name.toLowerCase().includes(rp.toLowerCase())
      )
    )
    if (recommendedPlat) {
      setSelectedPlatform(recommendedPlat)
      setSelectedModel(recommendedPlat.models[0] || '')
    }
  }

  const handleImportTemplate = (template: AgentTemplate) => {
    const typeConfig = AGENT_TYPES.find(t => t.id === template.agentType) || AGENT_TYPES[0]
    setSelectedType(typeConfig)
    setName(template.name)
    setDescription(template.description)
    setSystemPrompt(template.systemPrompt)
    setCapabilities([...(template.capabilities || [])])
    setColor(template.color || typeConfig.defaultColor)
    setIcon(template.icon || typeConfig.icon)
    setPersonality(template.personality || '')
    setShowTemplates(false)
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
        agentType: selectedType?.id || 'general',
        systemPrompt,
        capabilities,
        color,
        icon,
        personality,
        tags: capabilities,
        stats: {},
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
        groupMode: swarmMode,
        groupType,
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

  const addCapability = () => {
    if (newCapability.trim() && !capabilities.includes(newCapability.trim())) {
      setCapabilities([...capabilities, newCapability.trim()])
      setNewCapability('')
    }
  }

  const removeCapability = (cap: string) => {
    setCapabilities(capabilities.filter((c) => c !== cap))
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
            {mode === 'agent' ? '选择类型、配置平台、个性化定制' : '从现有智能体中组合'}
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
            selectedType={selectedType}
            onSelectType={handleSelectType}
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
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            capabilities={capabilities}
            addCapability={addCapability}
            removeCapability={removeCapability}
            newCapability={newCapability}
            setNewCapability={setNewCapability}
            color={color}
            setColor={setColor}
            icon={icon}
            setIcon={setIcon}
            personality={personality}
            setPersonality={setPersonality}
            templates={templates}
            showTemplates={showTemplates}
            setShowTemplates={setShowTemplates}
            onImportTemplate={handleImportTemplate}
            isL2Platform={isL2Platform}
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
            swarmMode={swarmMode}
            setSwarmMode={setSwarmMode}
            groupType={groupType}
            setGroupType={setGroupType}
            showAdvancedConfig={showAdvancedConfig}
            setShowAdvancedConfig={setShowAdvancedConfig}
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
    setSelectedType(null)
    setSelectedPlatform(null)
    setSelectedModel('')
    setSelectedApiKey(null)
    setSelectedEngine('')
    setSystemPrompt('')
    setCapabilities([])
    setColor('')
    setIcon('')
    setPersonality('')
    setNewCapability('')
    setSelectedMembers([])
    setSwarmMode('parallel')
    setGroupType('swarm')
    setShowAdvancedConfig(false)
    setCreationSuccess(false)
    setShowTemplates(false)
  }
}

/* ── Agent Form ── */
function AgentForm({
  step, selectedType, onSelectType,
  platforms, selectedPlatform, setSelectedPlatform,
  selectedModel, setSelectedModel,
  apiKeys, selectedApiKey, setSelectedApiKey,
  engines, selectedEngine, setSelectedEngine,
  name, setName, description, setDescription,
  systemPrompt, setSystemPrompt,
  capabilities, addCapability, removeCapability,
  newCapability, setNewCapability,
  color, setColor, icon, setIcon,
  personality, setPersonality,
  templates, showTemplates, setShowTemplates,
  onImportTemplate, isL2Platform,
}: any) {
  const [search, setSearch] = useState('')
  const [platSearch, setPlatSearch] = useState('')

  if (step === 1) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--sage-700)]">选择智能体类型</h3>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[var(--sage-100)] text-[var(--sage-600)] hover:bg-[var(--sage-200)] transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5" />
            {showTemplates ? '返回类型选择' : '从模板导入'}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {showTemplates ? (
            <motion.div
              key="templates"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索模板..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
                  style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                />
              </div>
              {templates.length === 0 ? (
                <div className="card text-center py-8">
                  <Wand2 className="w-8 h-8 text-[var(--sage-400)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--sage-500)]">暂无模板</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                  {templates.filter((t: AgentTemplate) =>
                    !search || t.name.toLowerCase().includes(search.toLowerCase())
                  ).map((template: AgentTemplate) => (
                    <button
                      key={template.id}
                      onClick={() => onImportTemplate(template)}
                      className="card p-3 text-left hover:bg-[var(--sage-50)] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm text-[var(--sage-800)]">{template.name}</h4>
                          <p className="text-[11px] text-[var(--sage-500)]">{template.description}</p>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-[var(--sage-400)] rotate-180" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="types"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <AgentTypeSelector
                selectedType={selectedType?.id || null}
                onSelect={onSelectType}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (step === 2) {
    // Sort platforms: recommended first
    const recommendedIds = selectedType?.recommendedPlatforms || []
    const sortedPlatforms = [...platforms].sort((a, b) => {
      const aRec = recommendedIds.some(rp => a.id.toLowerCase().includes(rp.toLowerCase()) || a.name.toLowerCase().includes(rp.toLowerCase()))
      const bRec = recommendedIds.some(rp => b.id.toLowerCase().includes(rp.toLowerCase()) || b.name.toLowerCase().includes(rp.toLowerCase()))
      if (aRec && !bRec) return -1
      if (!aRec && bRec) return 1
      return 0
    })

    const filtered = sortedPlatforms.filter((p: Platform) =>
      !platSearch || p.name.toLowerCase().includes(platSearch.toLowerCase())
    )
    const l1Filtered = filtered.filter((p: Platform) => p.protocolLevel === 1)
    const l2Filtered = filtered.filter((p: Platform) => p.protocolLevel === 2)
    const recommendedFiltered = filtered.filter((p: Platform) =>
      recommendedIds.some(rp => p.id.toLowerCase().includes(rp.toLowerCase()) || p.name.toLowerCase().includes(rp.toLowerCase()))
    )

    return (
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
          <input
            value={platSearch}
            onChange={(e) => setPlatSearch(e.target.value)}
            placeholder="搜索平台或编排器..."
            className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
          />
        </div>

        {/* Recommended */}
        {recommendedFiltered.length > 0 && !platSearch && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-[var(--sage-600)] bg-[var(--sage-100)] px-2 py-0.5 rounded-full">推荐平台</span>
              <span className="text-xs text-[var(--sage-400)]">{recommendedFiltered.length} 个</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {recommendedFiltered.map((p: Platform) => PlatformCard(p))}
            </div>
          </div>
        )}

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
    const isRecommended = selectedType?.recommendedPlatforms.some(rp =>
      p.id.toLowerCase().includes(rp.toLowerCase()) || p.name.toLowerCase().includes(rp.toLowerCase())
    )
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
        <div className="flex items-center justify-between">
          <div className="text-xs text-[var(--sage-400)]">
            {p.models.slice(0, 3).join(', ')}
            {p.models.length > 3 && ` +${p.models.length - 3}`}
          </div>
          {isRecommended && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-600">推荐</span>
          )}
        </div>
      </button>
    )
  }

  if (step === 3) {
    // For L2 platforms, skip API & engine, show personalization directly
    // For L1, show API & engine selection first (this is the old step 3 behavior)
    if (!isL2Platform) {
      return (
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-medium text-[var(--sage-700)] mb-3">API 与引擎配置</h3>
          </div>
          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-[var(--sage-700)]">选择 API Key</h4>
              <span className="text-xs text-[var(--sage-500)]">平台: {selectedPlatform?.name}</span>
            </div>
            {apiKeys.length === 0 ? (
              <div className="card text-center py-6">
                <Key className="w-8 h-8 text-[var(--sage-400)] mx-auto mb-2" />
                <p className="text-sm text-[var(--sage-500)]">暂无 API Key，请先在平台管理中配置</p>
              </div>
            ) : (
              <div className="space-y-2">
                {apiKeys.map((k: ApiKey) => {
                  const isSelected = selectedApiKey?.id === k.id
                  return (
                    <button
                      key={k.id}
                      onClick={() => setSelectedApiKey(k)}
                      className={`w-full card p-3 text-left transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-[var(--sage-500)] bg-[var(--sage-50)]' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                            <Key className="w-4 h-4 text-[var(--sage-500)]" />
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

          {/* Engine */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-[var(--sage-700)]">分配引擎</h4>
              <span className="text-xs text-[var(--sage-500)]">{engines.length} 个可用</span>
            </div>
            <div className="space-y-2">
              {engines.map((e: Engine) => {
                const isSelected = selectedEngine === e.id
                return (
                  <button
                    key={e.id}
                    onClick={() => setSelectedEngine(e.id)}
                    className={`w-full card p-3 text-left transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-[var(--sage-500)] bg-[var(--sage-50)]' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                          <Cpu className="w-4 h-4 text-[var(--sage-500)]" />
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

          {/* Divider */}
          <div className="border-t" style={{ borderColor: 'var(--sage-200)' }} />

          {/* Personalization */}
          <PersonalizationFields
            name={name} setName={setName}
            description={description} setDescription={setDescription}
            systemPrompt={systemPrompt} setSystemPrompt={setSystemPrompt}
            capabilities={capabilities} addCapability={addCapability} removeCapability={removeCapability}
            newCapability={newCapability} setNewCapability={setNewCapability}
            color={color} setColor={setColor}
            icon={icon} setIcon={setIcon}
            personality={personality} setPersonality={setPersonality}
          />
        </div>
      )
    }

    // L2 platform: show only personalization
    return (
      <div className="space-y-5">
        <div className="card p-3 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-amber-700">L2 编排器无需配置 API Key 和引擎，直接进行个性化配置</span>
          </div>
        </div>
        <PersonalizationFields
          name={name} setName={setName}
          description={description} setDescription={setDescription}
          systemPrompt={systemPrompt} setSystemPrompt={setSystemPrompt}
          capabilities={capabilities} addCapability={addCapability} removeCapability={removeCapability}
          newCapability={newCapability} setNewCapability={setNewCapability}
          color={color} setColor={setColor}
          icon={icon} setIcon={setIcon}
          personality={personality} setPersonality={setPersonality}
        />
      </div>
    )
  }

  if (step === 4) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-[var(--sage-700)]">确认配置</h3>

        <div className="space-y-3">
          <SummaryItem label="类型" value={selectedType?.name || '通用助手'} />
          <SummaryItem label="名称" value={name} />
          <SummaryItem label="描述" value={description || '—'} />
          <SummaryItem label="平台" value={selectedPlatform?.name || '—'} />
          <SummaryItem label="模型" value={selectedModel || selectedPlatform?.models[0] || '—'} />
          {!isL2Platform && (
            <>
              <SummaryItem label="API Key" value={selectedApiKey?.displayName || '—'} />
              <SummaryItem label="引擎" value={selectedEngine ? engines.find((e: Engine) => e.id === selectedEngine)?.brand : '—'} />
            </>
          )}
          <SummaryItem label="系统提示词" value={systemPrompt.slice(0, 60) + (systemPrompt.length > 60 ? '...' : '')} />
          <SummaryItem label="能力标签" value={capabilities.join(', ') || '—'} />
          <SummaryItem label="个性特征" value={personality || '—'} />
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--sage-500)] w-20">主题色</span>
            <div className="w-5 h-5 rounded" style={{ backgroundColor: color }} />
            <span className="text-xs text-[var(--sage-600)] font-mono">{color}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--sage-500)] w-20">图标</span>
            <span className="text-xs text-[var(--sage-600)] font-mono">{icon}</span>
          </div>
        </div>
      </div>
    )
  }

  return null
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-[var(--sage-500)] w-20 flex-shrink-0">{label}</span>
      <span className="text-xs text-[var(--sage-700)]">{value}</span>
    </div>
  )
}

function PersonalizationFields({
  name, setName, description, setDescription,
  systemPrompt, setSystemPrompt,
  capabilities, addCapability, removeCapability,
  newCapability, setNewCapability,
  color, setColor, icon, setIcon,
  personality, setPersonality,
}: any) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-[var(--sage-700)]">个性化配置</h3>

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
          rows={2}
          className="w-full px-4 py-2.5 rounded-card border text-sm resize-none"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--sage-700)] mb-1">系统提示词</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="定义智能体的行为准则..."
          rows={4}
          className="w-full px-4 py-2.5 rounded-card border text-sm resize-none font-mono text-xs"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
        />
        <p className="text-[10px] text-[var(--sage-400)] mt-1">系统提示词定义了智能体的核心行为，可在创建后随时修改</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--sage-700)] mb-1">能力标签</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {capabilities.map((cap: string) => (
            <span
              key={cap}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-[var(--sage-100)] text-[var(--sage-600)]"
            >
              {cap}
              <button onClick={() => removeCapability(cap)} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newCapability}
            onChange={(e) => setNewCapability(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCapability()}
            placeholder="添加能力标签..."
            className="flex-1 px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
          />
          <button
            onClick={addCapability}
            className="px-3 py-2 rounded-lg bg-[var(--sage-100)] text-[var(--sage-600)] hover:bg-[var(--sage-200)] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--sage-700)] mb-1">个性特征</label>
        <input
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          placeholder="例如：严谨、幽默、耐心..."
          className="w-full px-4 py-2.5 rounded-card border text-sm"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
        />
      </div>

      <ColorPicker value={color} onChange={setColor} />
      <IconPicker value={icon} onChange={setIcon} />
    </div>
  )
}

/* ── Group Form ── */
function GroupForm({
  step, name, setName, description, setDescription,
  existingAgents, selectedMembers, toggleMember,
  swarmMode, setSwarmMode,
  groupType, setGroupType,
  showAdvancedConfig, setShowAdvancedConfig,
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
    const SWARM_MODES = [
      { value: 'sequential', label: '顺序执行', desc: '成员按序接力，单线流转完成', icon: ArrowRightLeft, color: '#10b981', bg: 'bg-emerald-50' },
      { value: 'parallel', label: '并行执行', desc: '多路同时分支，结果汇总', icon: GitBranch, color: '#3b82f6', bg: 'bg-blue-50' },
      { value: 'hierarchical', label: '层级执行', desc: '分层管理，上下级协同决策', icon: Layers, color: '#f59e0b', bg: 'bg-amber-50' },
      { value: 'dynamic', label: '动态编排', desc: '实时自适应，灵活调整策略', icon: Zap, color: '#8b5cf6', bg: 'bg-violet-50' },
    ]

    const GROUP_TYPES = [
      { value: 'swarm', label: '蜂群', icon: Users, desc: '分布式自主协作' },
      { value: 'pipeline', label: '流水线', icon: ArrowRightLeft, desc: '阶段化顺序处理' },
      { value: 'committee', label: '委员会', icon: MessageSquare, desc: '集体讨论决策' },
      { value: 'debate', label: '辩论', icon: MessageSquare, desc: '正反观点交锋' },
      { value: 'review-chain', label: '评审链', icon: Eye, desc: '多级审核把关' },
      { value: 'broadcast', label: '广播', icon: Radio, desc: '一对多信息分发' },
    ]

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-[var(--sage-700)]">蜂群协作模式</h3>
        <div className="grid grid-cols-2 gap-3">
          {SWARM_MODES.map((m) => {
            const Icon = m.icon
            const isSelected = swarmMode === m.value
            return (
              <motion.button
                key={m.value}
                onClick={() => setSwarmMode(m.value)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`card p-4 text-left transition-all hover:shadow-md border-2 ${
                  isSelected ? 'bg-[var(--sage-50)]' : 'border-transparent'
                }`}
                style={isSelected ? { borderColor: m.color } : {}}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? m.bg : 'bg-[var(--sage-100)]'}`}>
                    <Icon className="w-5 h-5" style={{ color: isSelected ? m.color : 'var(--sage-500)' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-[var(--sage-800)]">{m.label}</h3>
                      {isSelected && <CheckCircle className="w-4 h-4" style={{ color: m.color }} />}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-[var(--sage-500)]">{m.desc}</p>
              </motion.button>
            )
          })}
        </div>

        {/* 高级配置 */}
        <div className="pt-2">
          <button
            onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
            className="flex items-center gap-2 text-xs text-[var(--sage-600)] hover:text-[var(--sage-800)] transition-colors"
          >
            <span>{showAdvancedConfig ? '收起' : '展开'}高级配置</span>
            <ChevronRight className={`w-3 h-3 transition-transform ${showAdvancedConfig ? 'rotate-90' : ''}`} />
          </button>
          <AnimatePresence>
            {showAdvancedConfig && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 space-y-3 overflow-hidden"
              >
                <div className="card p-4 bg-[var(--sage-50)]">
                  <h4 className="text-xs font-medium text-[var(--sage-700)] mb-3">群组类型</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {GROUP_TYPES.map((t) => {
                      const Icon = t.icon
                      const isSelected = groupType === t.value
                      return (
                        <button
                          key={t.value}
                          onClick={() => setGroupType(t.value)}
                          className={`card p-2.5 text-left transition-all hover:shadow-md ${
                            isSelected ? 'ring-2 ring-[var(--sage-500)] bg-white' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-4 h-4" style={{ color: isSelected ? 'var(--sage-500)' : 'var(--sage-400)' }} />
                            <span className="text-xs font-medium text-[var(--sage-800)]">{t.label}</span>
                            {isSelected && <CheckCircle className="w-3 h-3 text-[var(--sage-500)]" />}
                          </div>
                          <p className="text-[10px] text-[var(--sage-500)]">{t.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  return null
}
