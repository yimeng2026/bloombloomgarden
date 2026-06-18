import { useState, useEffect, useMemo } from 'react'
import {
  Server, Layers, Cpu, Users, Search, Plus, Loader2,
  CheckCircle, XCircle, Trash2, Edit3,
  Play, Globe, Activity, AlertTriangle, Terminal, Zap, Wifi, WifiOff,
  ChevronDown, ChevronRight, Box, ArrowRight, Database,
  Network, GitBranch, Cog, Shield, Code, FileText, Monitor,
} from 'lucide-react'
import {
  fetchPlatforms, fetchFrameworks, fetchEngines, fetchTeams,
  createPlatform, deletePlatform, createTeam, createEngine,
} from '@/api/client'

/* ── Types (matching backend schema) ── */
interface Framework {
  id: string
  brand: string
  name: string
  category: string
  protocolLevel: number
  status: string
  description?: string
  defaultConfig?: { protocol?: string; threading?: string; baseUrl?: string }
  presetRoles?: any[]
  createdAt?: string
}

interface Role {
  id: string
  name: string
  roleType: string
  primaryEngine: string | null
  secondaryEngine: string | null
  platformId: string | null
  apiKeyId: string | null
  systemPrompt: string | null
  authorizedTools: string[]
  teamId: string
  createdAt?: string
  updatedAt?: string
}

interface Team {
  id: string
  name: string
  description: string
  frameworkId: string
  collaborationMode: string
  engineStrategy: string
  status: string
  framework?: { id: string; brand: string; name: string }
  roles: Role[]
  taskStats?: { total: number; completed: number; failed: number }
  createdAt?: string
  updatedAt?: string
}

interface Engine {
  id: string
  brand: string
  model: string
  tier: string
  status: string
  healthScore: number
  latency?: number | null
  throughput?: number | null
  costPer1KTokens?: number
  supportsStreaming?: boolean
  supportsVision?: boolean
  supportsTools?: boolean
  metadata?: {
    category?: string
    protocol?: string
    protocolLevel?: number
    models?: string[]
    baseUrl?: string
  }
  createdAt?: string
  updatedAt?: string
}

interface Platform {
  id: string
  providerId: string
  name: string
  category: string
  protocolLevel: number
  protocol: string
  threading: string
  status: string
  defaultModel?: string
  models?: string[]
  baseUrl?: string
  apiKeySource?: string
}

/* ── Status / Color Configs ── */
const STATUS_COLORS: Record<string, { color: string; label: string }> = {
  active: { color: '#10b981', label: '活跃' },
  inactive: { color: '#6b7280', label: '停用' },
  running: { color: '#3b82f6', label: '运行中' },
  connected: { color: '#10b981', label: '已连接' },
  disconnected: { color: '#6b7280', label: '已断开' },
  error: { color: '#ef4444', label: '错误' },
  healthy: { color: '#10b981', label: '健康' },
  unhealthy: { color: '#f59e0b', label: '异常' },
  offline: { color: '#6b7280', label: '离线' },
  available: { color: '#10b981', label: '可用' },
  unavailable: { color: '#ef4444', label: '不可用' },
  deprecated: { color: '#f59e0b', label: '弃用' },
}

const ROLE_TYPE_LABELS: Record<string, string> = {
  executor: '执行者',
  coordinator: '协调者',
  reviewer: '审核者',
  planner: '规划者',
  researcher: '研究者',
  coder: '编码者',
  writer: '撰写者',
}

const COLLABORATION_LABELS: Record<string, string> = {
  hierarchical: '层级协作',
  swarm: '蜂群协作',
  consensus: '共识协作',
  relay: '中继协作',
  parallel: '并行协作',
}

const TABS = [
  { id: 'orchestration', label: '编排控制台', icon: Layers },
  { id: 'resources', label: '资源池', icon: Database },
]

const PROTOCOL_LEVEL_LABELS: Record<number, { label: string; color: string; bg: string; icon: any }> = {
  0: { label: 'L0 基础设施', color: '#6b7280', bg: '#f3f4f6', icon: Terminal },
  1: { label: 'L1 单线程引擎', color: '#3b82f6', bg: '#eff6ff', icon: Cpu },
  2: { label: 'L2 多线程编排', color: '#10b981', bg: '#ecfdf5', icon: Layers },
  3: { label: 'L3 网关', color: '#8b5cf6', bg: '#f5f3ff', icon: Network },
}

const CATEGORY_ICONS: Record<string, any> = {
  cloud: Globe,
  local: Cpu,
  'local-engine': Cpu,
  'code-agent': Code,
  infra: Terminal,
  cli: Terminal,
  filesystem: FileText,
  browser: Monitor,
  sandbox: Shield,
  jupyter: Code,
  'multi-agent': Layers,
  gateway: Network,
}

export default function PlatformManager() {
  const [activeTab, setActiveTab] = useState('orchestration')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFrameworks, setExpandedFrameworks] = useState<Set<string>>(new Set())
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())

  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [engines, setEngines] = useState<Engine[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState<Record<string, boolean>>({
    platforms: true, frameworks: true, engines: true, teams: true,
  })
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [showPlatformModal, setShowPlatformModal] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showEngineModal, setShowEngineModal] = useState(false)
  const [showFrameworkModal, setShowFrameworkModal] = useState(false)

  const [platformForm, setPlatformForm] = useState({ name: '', type: 'kimi', url: '', apiKey: '' })
  const [teamForm, setTeamForm] = useState({ name: '', framework: '', collaborationMode: 'hierarchical', description: '' })
  const [engineForm, setEngineForm] = useState({ brand: '', model: '', tier: 'local', description: '' })
  const [frameworkForm, setFrameworkForm] = useState({ name: '', category: '', protocolLevel: 2, description: '' })

  const [creating, setCreating] = useState(false)

  /* ── Load data ── */
  useEffect(() => {
    async function load() {
      try {
        setError(null)
        const [platRes, fwRes, engRes, teamRes]: any = await Promise.allSettled([
          fetchPlatforms(),
          fetchFrameworks(),
          fetchEngines(),
          fetchTeams(),
        ])

        const plats = platRes.status === 'fulfilled'
          ? (Array.isArray(platRes.value) ? platRes.value : platRes.value?.data || [])
          : []
        const fws = fwRes.status === 'fulfilled'
          ? (Array.isArray(fwRes.value) ? fwRes.value : fwRes.value?.data || [])
          : []
        const engs = engRes.status === 'fulfilled'
          ? (Array.isArray(engRes.value) ? engRes.value : engRes.value?.data || [])
          : []
        const tms = teamRes.status === 'fulfilled'
          ? (Array.isArray(teamRes.value) ? teamRes.value : teamRes.value?.data || [])
          : []

        setPlatforms(plats)
        setFrameworks(fws)
        setEngines(engs)
        setTeams(tms)
      } catch (e: any) {
        setError(e?.message || '加载数据失败')
      } finally {
        setLoading({ platforms: false, frameworks: false, engines: false, teams: false })
      }
    }
    load()
  }, [])

  /* ── Derived data ── */
  const frameworkMap = useMemo(() => {
    const map = new Map<string, Framework>()
    frameworks.forEach(f => map.set(f.id, f))
    return map
  }, [frameworks])

  const engineMap = useMemo(() => {
    const map = new Map<string, Engine>()
    engines.forEach(e => map.set(e.brand, e))
    return map
  }, [engines])

  const platformMap = useMemo(() => {
    const map = new Map<string, Platform>()
    platforms.forEach(p => {
      map.set(p.id, p)
      map.set(p.providerId, p)
    })
    return map
  }, [platforms])

  // Teams grouped by framework
  const teamsByFramework = useMemo(() => {
    const map = new Map<string, Team[]>()
    teams.forEach(t => {
      const fwId = t.frameworkId || t.framework?.id || 'unknown'
      if (!map.has(fwId)) map.set(fwId, [])
      map.get(fwId)!.push(t)
    })
    return map
  }, [teams])

  // All roles flattened
  const allRoles = useMemo(() => {
    const roles: (Role & { teamName?: string; frameworkId?: string })[] = []
    teams.forEach(t => {
      t.roles.forEach(r => {
        roles.push({ ...r, teamName: t.name, frameworkId: t.frameworkId })
      })
    })
    return roles
  }, [teams])

  // Resource usage count: how many roles use each engine/platform
  const resourceUsage = useMemo(() => {
    const usage = new Map<string, number>()
    allRoles.forEach(r => {
      if (r.primaryEngine) {
        usage.set(r.primaryEngine, (usage.get(r.primaryEngine) || 0) + 1)
      }
      if (r.secondaryEngine) {
        usage.set(r.secondaryEngine, (usage.get(r.secondaryEngine) || 0) + 1)
      }
      if (r.platformId) {
        usage.set(r.platformId, (usage.get(r.platformId) || 0) + 1)
      }
    })
    return usage
  }, [allRoles])

  // Resources grouped by protocolLevel
  const resourcesByLevel = useMemo(() => {
    const groups = new Map<number, (Platform | Engine)[]>()
    // Add platforms
    platforms.forEach(p => {
      const level = p.protocolLevel ?? 1
      if (!groups.has(level)) groups.set(level, [])
      groups.get(level)!.push(p)
    })
    // Add engines (de-duplicate with platforms)
    const platformIds = new Set(platforms.map(p => p.id))
    engines.forEach(e => {
      const level = e.metadata?.protocolLevel ?? 1
      if (!platformIds.has(e.id)) {
        if (!groups.has(level)) groups.set(level, [])
        groups.get(level)!.push(e)
      }
    })
    return groups
  }, [platforms, engines])

  // Stats
  const totalFrameworks = frameworks.length
  const totalTeams = teams.length
  const totalRoles = allRoles.length
  const totalResources = platforms.length + engines.length

  const activeFrameworks = frameworks.filter(f => f.status === 'active').length
  const activeTeams = teams.filter(t => t.status === 'active' || t.status === 'running').length

  /* ── Filters ── */
  const filteredFrameworks = frameworks.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.brand.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredResources = useMemo(() => {
    const q = searchQuery.toLowerCase()
    if (!q) return resourcesByLevel
    const filtered = new Map<number, (Platform | Engine)[]>()
    resourcesByLevel.forEach((items, level) => {
      const matched = items.filter((item: any) => {
        const name = (item.name || item.brand || '').toLowerCase()
        const category = (item.category || '').toLowerCase()
        const model = (item.model || '').toLowerCase()
        return name.includes(q) || category.includes(q) || model.includes(q)
      })
      if (matched.length > 0) filtered.set(level, matched)
    })
    return filtered
  }, [resourcesByLevel, searchQuery])

  /* ── Expand/Collapse ── */
  const toggleFramework = (id: string) => {
    setExpandedFrameworks(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleTeam = (id: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /* ── Actions ── */
  const handleCreatePlatform = async () => {
    if (!platformForm.name.trim()) return
    try {
      setCreating(true)
      const res = await createPlatform({
        name: platformForm.name,
        type: platformForm.type,
        url: platformForm.url,
        apiKey: platformForm.apiKey,
      })
      const newPlatform = res.data || res || {
        id: `pl-${Date.now()}`,
        name: platformForm.name,
        type: platformForm.type,
        url: platformForm.url,
        status: 'disconnected',
        apiKey: platformForm.apiKey,
        models: [],
        createdAt: new Date().toISOString().split('T')[0],
        lastCheck: '从未',
        requestCount: 0,
        avgLatency: 0,
      }
      setPlatforms((prev) => [newPlatform, ...prev])
      setShowPlatformModal(false)
      setPlatformForm({ name: '', type: 'kimi', url: '', apiKey: '' })
    } catch (e) {
      console.error('Failed to create platform:', e)
      const newPlatform: any = {
        id: `pl-${Date.now()}`,
        name: platformForm.name,
        type: platformForm.type,
        url: platformForm.url,
        status: 'disconnected',
        apiKey: platformForm.apiKey,
        models: [],
      }
      setPlatforms((prev) => [newPlatform, ...prev])
      setShowPlatformModal(false)
      setPlatformForm({ name: '', type: 'kimi', url: '', apiKey: '' })
    } finally {
      setCreating(false)
    }
  }

  const handleDeletePlatform = async (id: string) => {
    if (!confirm('确定删除此平台？')) return
    try {
      await deletePlatform(id)
      setPlatforms((prev) => prev.filter((p) => p.id !== id))
    } catch (e) {
      console.error('Failed to delete platform:', e)
      setPlatforms((prev) => prev.filter((p) => p.id !== id))
    }
  }

  const togglePlatformStatus = (id: string) => {
    setPlatforms((prev) => prev.map((p) => {
      if (p.id !== id) return p
      const next = p.status === 'connected' ? 'disconnected' : 'connected'
      return { ...p, status: next } as Platform
    }))
  }

  const handleCreateFramework = () => {
    if (!frameworkForm.name.trim()) return
    const newFramework: Framework = {
      id: `fw-${Date.now()}`,
      brand: frameworkForm.name.toLowerCase().replace(/\s+/g, '-'),
      name: frameworkForm.name,
      category: frameworkForm.category || 'multi-agent',
      protocolLevel: Number(frameworkForm.protocolLevel) || 2,
      status: 'active',
      description: frameworkForm.description,
      defaultConfig: { protocol: 'multi-thread', threading: 'multi' },
    }
    setFrameworks((prev) => [newFramework, ...prev])
    setShowFrameworkModal(false)
    setFrameworkForm({ name: '', category: '', protocolLevel: 2, description: '' })
  }

  const handleDeleteFramework = (id: string) => {
    if (!confirm('确定删除此框架？')) return
    setFrameworks((prev) => prev.filter((f) => f.id !== id))
  }

  const handleCreateEngine = async () => {
    if (!engineForm.brand.trim() || !engineForm.model.trim()) return
    try {
      setCreating(true)
      const res = await createEngine({
        brand: engineForm.brand,
        model: engineForm.model,
        tier: engineForm.tier,
        description: engineForm.description,
      })
      const newEngine = res.data || res || {
        id: `eng-${Date.now()}`,
        brand: engineForm.brand,
        model: engineForm.model,
        tier: engineForm.tier,
        status: 'offline',
        healthScore: 0,
        description: engineForm.description,
      }
      setEngines((prev) => [newEngine, ...prev])
      setShowEngineModal(false)
      setEngineForm({ brand: '', model: '', tier: 'local', description: '' })
    } catch (e) {
      console.error('Failed to create engine:', e)
      const newEngine: Engine = {
        id: `eng-${Date.now()}`,
        brand: engineForm.brand,
        model: engineForm.model,
        tier: engineForm.tier,
        status: 'offline',
        healthScore: 0,
        description: engineForm.description,
      }
      setEngines((prev) => [newEngine, ...prev])
      setShowEngineModal(false)
      setEngineForm({ brand: '', model: '', tier: 'local', description: '' })
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteEngine = (id: string) => {
    if (!confirm('确定删除此引擎？')) return
    setEngines((prev) => prev.filter((e) => e.id !== id))
  }

  const handleCreateTeam = async () => {
    if (!teamForm.name.trim() || !teamForm.framework.trim()) return
    try {
      setCreating(true)
      const res: any = await createTeam({
        name: teamForm.name,
        frameworkId: teamForm.framework,
        collaborationMode: teamForm.collaborationMode,
        description: teamForm.description,
        roles: [],
      })
      const newTeam = res.data || { id: `team-${Date.now()}`, ...teamForm, status: 'active' }
      setTeams((prev) => [newTeam, ...prev])
      setShowTeamModal(false)
      setTeamForm({ name: '', framework: '', collaborationMode: 'hierarchical', description: '' })
    } catch (e) {
      console.error('Failed to create team:', e)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteTeam = (id: string) => {
    if (!confirm('确定删除此团队？')) return
    setTeams((prev) => prev.filter((t) => t.id !== id))
  }

  const handleTestConnection = (id: string, name: string) => {
    alert(`正在测试 ${name} (ID: ${id}) 的连接...`)
  }

  /* ── Render helpers ── */
  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_COLORS[status] || STATUS_COLORS.inactive
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: cfg.color + '18', color: cfg.color }}>
        {cfg.label}
      </span>
    )
  }

  const ProtocolLevelBadge = ({ level }: { level: number }) => {
    const cfg = PROTOCOL_LEVEL_LABELS[level] || PROTOCOL_LEVEL_LABELS[1]
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
        {cfg.label}
      </span>
    )
  }

  const ResourceIcon = ({ item }: { item: any }) => {
    const category = item.category || item.metadata?.category || 'cloud'
    const Icon = CATEGORY_ICONS[category] || Box
    return <Icon className="w-5 h-5 text-[var(--sage-500)]" />
  }

  const getEngineByBrand = (brand: string | null) => {
    if (!brand) return null
    return engineMap.get(brand) || engines.find(e => e.brand === brand || e.id === brand)
  }

  const getPlatformById = (id: string | null) => {
    if (!id) return null
    return platformMap.get(id) || platforms.find(p => p.id === id || p.providerId === id)
  }

  const isLoading = loading.platforms || loading.frameworks || loading.engines || loading.teams

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">平台编排</h1>
            <p className="text-sm text-[var(--sage-500)]">
              {totalFrameworks} 编排框架 · {totalTeams} 团队 · {totalRoles} 角色 · {totalResources} 资源
            </p>
          </div>
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索..."
            className="w-full pl-10 pr-4 py-2 rounded-card border text-sm"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
          />
        </div>
      </div>

      {error && (
        <div className="card p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ecfdf5' }}>
            <Layers className="w-4 h-4" style={{ color: '#10b981' }} />
          </div>
          <div>
            <p className="text-xs text-[var(--sage-500)]">活跃编排框架</p>
            <p className="text-lg font-bold text-[var(--sage-800)]">{activeFrameworks} / {totalFrameworks}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eff6ff' }}>
            <Users className="w-4 h-4" style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <p className="text-xs text-[var(--sage-500)]">活跃团队</p>
            <p className="text-lg font-bold text-[var(--sage-800)]">{activeTeams} / {totalTeams}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fff7ed' }}>
            <GitBranch className="w-4 h-4" style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <p className="text-xs text-[var(--sage-500)]">角色总数</p>
            <p className="text-lg font-bold text-[var(--sage-800)]">{totalRoles}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f5f3ff' }}>
            <Database className="w-4 h-4" style={{ color: '#8b5cf6' }} />
          </div>
          <div>
            <p className="text-xs text-[var(--sage-500)]">资源总数</p>
            <p className="text-lg font-bold text-[var(--sage-800)]">{totalResources}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b" style={{ borderColor: 'var(--sage-200)' }}>
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchQuery('') }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-[1px] ${
                isActive
                  ? 'border-[var(--sage-500)] text-[var(--sage-700)]'
                  : 'border-transparent text-[var(--sage-500)] hover:text-[var(--sage-600)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Orchestration Console Tab ── */}
      {activeTab === 'orchestration' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-[var(--sage-500)] gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>加载编排数据...</span>
            </div>
          ) : filteredFrameworks.length === 0 ? (
            <div className="card text-center py-16">
              <Layers className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" />
              <p className="text-[var(--sage-500)] mb-2">暂编排框架</p>
              <p className="text-xs text-[var(--sage-400)]">请添加多线程编排框架</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFrameworks.map((fw) => {
                const fwTeams = teamsByFramework.get(fw.id) || []
                const isExpanded = expandedFrameworks.has(fw.id)
                const status = STATUS_COLORS[fw.status] || STATUS_COLORS.inactive
                const protocol = fw.defaultConfig?.protocol || 'multi-thread'
                const threading = fw.defaultConfig?.threading || 'multi'
                const L2Cfg = PROTOCOL_LEVEL_LABELS[2]

                return (
                  <div key={fw.id} className="card overflow-hidden">
                    {/* Framework Header */}
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--sage-50)] transition-colors"
                      onClick={() => toggleFramework(fw.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: L2Cfg.bg }}>
                          <Layers className="w-5 h-5" style={{ color: L2Cfg.color }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-[var(--sage-800)]">{fw.name}</h3>
                            <ProtocolLevelBadge level={2} />
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: status.color + '18', color: status.color }}>
                              {status.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-[var(--sage-400)]">{fw.brand}</span>
                            <span className="text-[10px] text-[var(--sage-400)]">·</span>
                            <span className="text-[10px] text-[var(--sage-400)]">{protocol}</span>
                            <span className="text-[10px] text-[var(--sage-400)]">·</span>
                            <span className="text-[10px] text-[var(--sage-400)]">{threading}</span>
                            {fw.category && (
                              <>
                                <span className="text-[10px] text-[var(--sage-400)]">·</span>
                                <span className="text-[10px] text-[var(--sage-400)]">{fw.category}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[var(--sage-500)]">
                          {fwTeams.length} 团队 · {fwTeams.reduce((acc, t) => acc + (t.roles?.length || 0), 0)} 角色
                        </span>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--sage-400)]" /> : <ChevronRight className="w-4 h-4 text-[var(--sage-400)]" />}
                      </div>
                    </div>

                    {/* Teams Section */}
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        {fwTeams.length === 0 ? (
                          <div className="text-center py-6 text-xs text-[var(--sage-400)]">
                            此框架下暂无团队
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                            {fwTeams.map((team) => {
                              const teamExpanded = expandedTeams.has(team.id)
                              const teamStatus = STATUS_COLORS[team.status] || STATUS_COLORS.inactive
                              const collabLabel = COLLABORATION_LABELS[team.collaborationMode] || team.collaborationMode

                              return (
                                <div key={team.id} className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--sage-100)' }}>
                                  {/* Team Header */}
                                  <div
                                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-[var(--sage-50)] transition-colors"
                                    onClick={() => toggleTeam(team.id)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Users className="w-4 h-4 text-[var(--sage-500)]" />
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-sm font-medium text-[var(--sage-700)]">{team.name}</span>
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: teamStatus.color + '18', color: teamStatus.color }}>
                                            {teamStatus.label}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="text-[10px] text-[var(--sage-400)]">{collabLabel}</span>
                                          <span className="text-[10px] text-[var(--sage-400)]">·</span>
                                          <span className="text-[10px] text-[var(--sage-400)]">{team.engineStrategy || 'mixed'}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-[var(--sage-400)]">{team.roles?.length || 0} 角色</span>
                                      {teamExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[var(--sage-400)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--sage-400)]" />}
                                    </div>
                                  </div>

                                  {/* Roles */}
                                  {teamExpanded && (
                                    <div className="px-3 pb-3 space-y-2">
                                      {team.roles?.length === 0 ? (
                                        <div className="text-center py-3 text-xs text-[var(--sage-400)]">暂无角色</div>
                                      ) : (
                                        team.roles.map((role) => {
                                          const engine = getEngineByBrand(role.primaryEngine)
                                          const platform = getPlatformById(role.platformId)
                                          const roleTypeLabel = ROLE_TYPE_LABELS[role.roleType] || role.roleType

                                          return (
                                            <div key={role.id} className="p-2.5 rounded-lg bg-[var(--sage-50)]">
                                              <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-1.5">
                                                  <Cog className="w-3.5 h-3.5 text-[var(--sage-400)]" />
                                                  <span className="text-xs font-medium text-[var(--sage-700)]">{role.name}</span>
                                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--sage-100)] text-[var(--sage-500)]">{roleTypeLabel}</span>
                                                </div>
                                              </div>

                                              {/* Engine binding */}
                                              <div className="space-y-1">
                                                {role.primaryEngine && (
                                                  <div className="flex items-center gap-1.5 text-[10px]">
                                                    <ArrowRight className="w-3 h-3 text-[var(--sage-400)]" />
                                                    <span className="text-[var(--sage-500)]">主引擎:</span>
                                                    <span className="font-medium text-[var(--sage-700)]">{role.primaryEngine}</span>
                                                    {engine && (
                                                      <span className="text-[var(--sage-400)]">({engine.model})</span>
                                                    )}
                                                  </div>
                                                )}
                                                {role.secondaryEngine && (
                                                  <div className="flex items-center gap-1.5 text-[10px]">
                                                    <ArrowRight className="w-3 h-3 text-[var(--sage-400)]" />
                                                    <span className="text-[var(--sage-500)]">备用:</span>
                                                    <span className="font-medium text-[var(--sage-700)]">{role.secondaryEngine}</span>
                                                  </div>
                                                )}
                                                {role.platformId && (
                                                  <div className="flex items-center gap-1.5 text-[10px]">
                                                    <ArrowRight className="w-3 h-3 text-[var(--sage-400)]" />
                                                    <span className="text-[var(--sage-500)]">平台:</span>
                                                    <span className="font-medium text-[var(--sage-700)]">{platform?.name || role.platformId}</span>
                                                  </div>
                                                )}
                                                {role.authorizedTools && role.authorizedTools.length > 0 && (
                                                  <div className="flex items-center gap-1.5 text-[10px]">
                                                    <ArrowRight className="w-3 h-3 text-[var(--sage-400)]" />
                                                    <span className="text-[var(--sage-500)]">工具:</span>
                                                    <span className="text-[var(--sage-700)]">{role.authorizedTools.join(', ')}</span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )
                                        })
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button onClick={() => setShowFrameworkModal(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> 添加编排框架
            </button>
            <button onClick={() => setShowTeamModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> 添加团队
            </button>
          </div>
        </div>
      )}

      {/* ── Resource Pool Tab ── */}
      {activeTab === 'resources' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-[var(--sage-500)] gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>加载资源池...</span>
            </div>
          ) : (
            <>
              {[3, 2, 1, 0].map((level) => {
                const items = filteredResources.get(level) || []
                if (items.length === 0) return null
                const levelCfg = PROTOCOL_LEVEL_LABELS[level] || PROTOCOL_LEVEL_LABELS[1]
                const LevelIcon = levelCfg.icon

                return (
                  <div key={level}>
                    <div className="flex items-center gap-2 mb-3">
                      <LevelIcon className="w-5 h-5" style={{ color: levelCfg.color }} />
                      <h3 className="text-sm font-bold text-[var(--sage-700)]">{levelCfg.label}</h3>
                      <span className="text-xs text-[var(--sage-400)]">({items.length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {items.map((item: any) => {
                        const id = item.id || item.providerId
                        const name = item.name || item.brand
                        const status = item.status || 'unknown'
                        const category = item.category || item.metadata?.category || 'unknown'
                        const model = item.model || ''
                        const usageCount = resourceUsage.get(id) || resourceUsage.get(item.brand) || 0
                        const statusCfg = STATUS_COLORS[status] || STATUS_COLORS.inactive
                        const Icon = CATEGORY_ICONS[category] || Box

                        return (
                          <div key={id} className="card p-3 transition-all hover:shadow-md">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                                  <Icon className="w-4 h-4 text-[var(--sage-500)]" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-semibold text-[var(--sage-800)]">{name}</h4>
                                  <span className="text-[10px] text-[var(--sage-400)]">{category}</span>
                                </div>
                              </div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: statusCfg.color + '18', color: statusCfg.color }}>
                                {statusCfg.label}
                              </span>
                            </div>

                            {model && (
                              <p className="text-[10px] text-[var(--sage-500)] mb-1.5">{model}</p>
                            )}

                            <div className="flex items-center justify-between text-[10px] text-[var(--sage-400)]">
                              <span className="flex items-center gap-1">
                                <GitBranch className="w-3 h-3" />
                                {usageCount > 0 ? `${usageCount} 角色使用` : '未使用'}
                              </span>
                              {item.healthScore !== undefined && (
                                <span className="flex items-center gap-1">
                                  <Activity className="w-3 h-3" />
                                  {item.healthScore}
                                </span>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1 pt-2 mt-2 border-t" style={{ borderColor: 'var(--sage-100)' }}>
                              <button
                                onClick={() => togglePlatformStatus(id)}
                                className="p-1 rounded hover:bg-[var(--sage-100)] transition-colors"
                                style={{ color: 'var(--sage-500)' }}
                                title={status === 'connected' || status === 'available' ? '断开' : '连接'}
                              >
                                {status === 'connected' || status === 'available' ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                              </button>
                              <button
                                onClick={() => handleTestConnection(id, name)}
                                className="p-1 rounded hover:bg-[var(--sage-100)] transition-colors"
                                style={{ color: 'var(--sage-500)' }}
                                title="测试连接"
                              >
                                <Play className="w-3 h-3" />
                              </button>
                              <button
                                className="p-1 rounded hover:bg-[var(--sage-100)] transition-colors"
                                style={{ color: 'var(--sage-500)' }}
                                title="编辑"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeletePlatform(id)}
                                className="p-1 rounded hover:bg-red-500/10 transition-colors"
                                style={{ color: 'var(--sage-500)' }}
                                title="删除"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {Array.from(filteredResources.values()).flat().length === 0 && (
                <div className="card text-center py-16">
                  <Database className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" />
                  <p className="text-[var(--sage-500)] mb-2">暂无资源</p>
                  <p className="text-xs text-[var(--sage-400)]">请添加资源或检查搜索条件</p>
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button onClick={() => setShowPlatformModal(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> 添加平台
            </button>
            <button onClick={() => setShowEngineModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> 添加引擎
            </button>
          </div>
        </div>
      )}

      {/* ── Modals (unchanged from original) ── */}
      {/* Platform Modal */}
      {showPlatformModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[400px] max-w-[90vw]">
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">添加平台</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--sage-600)] mb-1">平台名称</label>
                <input
                  type="text" value={platformForm.name}
                  onChange={(e) => setPlatformForm({ ...platformForm, name: e.target.value })}
                  placeholder="例如：Kimi API"
                  className="w-full px-3 py-2 rounded-card border text-sm"
                  style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--sage-600)] mb-1">类型</label>
                <select
                  value={platformForm.type}
                  onChange={(e) => setPlatformForm({ ...platformForm, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-card border text-sm"
                  style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                >
                  <option value="kimi">Kimi</option>
                  <option value="claude">Claude</option>
                  <option value="openai">OpenAI</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="zhipu">智谱AI</option>
                  <option value="ollama">Ollama</option>
                  <option value="gemini">Gemini</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--sage-600)] mb-1">API 端点</label>
                <input
                  type="text" value={platformForm.url}
                  onChange={(e) => setPlatformForm({ ...platformForm, url: e.target.value })}
                  placeholder="https://api.example.com"
                  className="w-full px-3 py-2 rounded-card border text-sm"
                  style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--sage-600)] mb-1">API Key</label>
                <input
                  type="password" value={platformForm.apiKey}
                  onChange={(e) => setPlatformForm({ ...platformForm, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 rounded-card border text-sm"
                  style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleCreatePlatform} disabled={!platformForm.name.trim() || creating}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                <Plus className="w-4 h-4" /> 添加
              </button>
              <button onClick={() => setShowPlatformModal(false)}
                className="px-4 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)' }}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Framework Modal */}
      {showFrameworkModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[400px] max-w-[90vw]">
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">添加编排框架</h2>
            <div className="space-y-3">
              <input type="text" placeholder="框架名称"
                value={frameworkForm.name}
                onChange={(e) => setFrameworkForm({ ...frameworkForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
              <input type="text" placeholder="分类 (默认 multi-agent)"
                value={frameworkForm.category}
                onChange={(e) => setFrameworkForm({ ...frameworkForm, category: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
              <input type="number" placeholder="协议级别 (默认 2)"
                value={frameworkForm.protocolLevel}
                onChange={(e) => setFrameworkForm({ ...frameworkForm, protocolLevel: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
              <textarea placeholder="描述（可选）" rows={3}
                value={frameworkForm.description}
                onChange={(e) => setFrameworkForm({ ...frameworkForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm resize-none"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleCreateFramework} disabled={!frameworkForm.name.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                <Plus className="w-4 h-4" /> 添加
              </button>
              <button onClick={() => setShowFrameworkModal(false)}
                className="px-4 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)' }}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Engine Modal */}
      {showEngineModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[400px] max-w-[90vw]">
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">添加引擎</h2>
            <div className="space-y-3">
              <input type="text" placeholder="品牌"
                value={engineForm.brand}
                onChange={(e) => setEngineForm({ ...engineForm, brand: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
              <input type="text" placeholder="模型"
                value={engineForm.model}
                onChange={(e) => setEngineForm({ ...engineForm, model: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
              <select value={engineForm.tier}
                onChange={(e) => setEngineForm({ ...engineForm, tier: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}>
                <option value="local">本地</option>
                <option value="edge">边缘</option>
                <option value="cloud">云端</option>
              </select>
              <textarea placeholder="描述（可选）" rows={3}
                value={engineForm.description}
                onChange={(e) => setEngineForm({ ...engineForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm resize-none"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleCreateEngine} disabled={!engineForm.brand.trim() || !engineForm.model.trim() || creating}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                <Plus className="w-4 h-4" /> 添加
              </button>
              <button onClick={() => setShowEngineModal(false)}
                className="px-4 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)' }}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[400px] max-w-[90vw]">
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">添加团队</h2>
            <div className="space-y-3">
              <input type="text" placeholder="团队名称"
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
              <select value={teamForm.framework}
                onChange={(e) => setTeamForm({ ...teamForm, framework: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}>
                <option value="">选择编排框架...</option>
                {frameworks.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <select value={teamForm.collaborationMode}
                onChange={(e) => setTeamForm({ ...teamForm, collaborationMode: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}>
                <option value="hierarchical">层级协作</option>
                <option value="swarm">蜂群协作</option>
                <option value="consensus">共识协作</option>
                <option value="relay">中继协作</option>
              </select>
              <textarea placeholder="描述（可选）" rows={3}
                value={teamForm.description}
                onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm resize-none"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleCreateTeam} disabled={creating || !teamForm.name.trim() || !teamForm.framework}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? '创建中...' : '创建'}
              </button>
              <button onClick={() => setShowTeamModal(false)}
                className="px-4 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)' }}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
