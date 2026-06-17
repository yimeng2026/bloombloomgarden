import { useState, useEffect } from 'react'
import {
  Server, Layers, Cpu, Users, Search, Plus, Loader2,
  CheckCircle, XCircle, Trash2, Edit3,
  Play, Globe, Activity, AlertTriangle, Terminal, Zap, Wifi, WifiOff,
} from 'lucide-react'
import {
  fetchPlatforms, fetchFrameworks, fetchEngines, fetchTeams,
  createPlatform, deletePlatform, createTeam, createEngine,
} from '@/api/client'

/* ── Types ── */
interface Platform {
  id: string
  name: string
  type: string
  url: string
  status: 'connected' | 'disconnected' | 'error'
  apiKey?: string
  models: string[]
  createdAt: string
  lastCheck: string
  requestCount: number
  avgLatency: number
}

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

interface Team {
  id: string
  name: string
  framework: string
  collaborationMode: string
  status: 'active' | 'inactive' | 'running'
  description?: string
  memberCount?: number
}

/* ── Status Configs ── */
const PLATFORM_STATUS: Record<string, { color: string; label: string }> = {
  connected: { color: '#10b981', label: '已连接' },
  disconnected: { color: '#6b7280', label: '已断开' },
  error: { color: '#ef4444', label: '错误' },
}

const FRAMEWORK_STATUS: Record<string, { color: string; label: string }> = {
  active: { color: '#10b981', label: '活跃' },
  inactive: { color: '#6b7280', label: '停用' },
  deprecated: { color: '#ef4444', label: '弃用' },
}

const ENGINE_STATUS: Record<string, { color: string; label: string }> = {
  healthy: { color: '#10b981', label: '健康' },
  unhealthy: { color: '#f59e0b', label: '异常' },
  offline: { color: '#6b7280', label: '离线' },
}

const TEAM_STATUS: Record<string, { color: string; label: string }> = {
  active: { color: '#10b981', label: '活跃' },
  inactive: { color: '#6b7280', label: '停用' },
  running: { color: '#3b82f6', label: '运行中' },
}

const TABS = [
  { id: 'api-providers', label: 'API Provider', icon: Globe },
  { id: 'orchestration', label: '多线程编排', icon: Layers },
  { id: 'engines', label: '本地引擎', icon: Cpu },
  { id: 'cli-tools', label: 'CLI工具', icon: Terminal },
]

export default function PlatformManager() {
  const [activeTab, setActiveTab] = useState('api-providers')
  const [searchQuery, setSearchQuery] = useState('')

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
  const [frameworkForm, setFrameworkForm] = useState({ name: '', category: '', protocolLevel: 1, description: '' })

  const [creating, setCreating] = useState(false)

  // Load data on mount
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
        setPlatforms(Array.isArray(platRes.value) ? platRes.value : platRes.value?.data || [])
        setFrameworks(Array.isArray(fwRes.value) ? fwRes.value : fwRes.value?.data || [])
        setEngines(Array.isArray(engRes.value) ? engRes.value : engRes.value?.data || [])
        setTeams(Array.isArray(teamRes.value) ? teamRes.value : teamRes.value?.data || [])
      } catch (e: any) {
        setError(e?.message || '加载数据失败')
      } finally {
        setLoading({ platforms: false, frameworks: false, engines: false, teams: false })
      }
    }
    load()
  }, [])

  /* ── Filters ── */
  const filteredPlatforms = platforms.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.type.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredFrameworks = frameworks.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.category.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredEngines = engines.filter((e) =>
    e.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.model.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.framework.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
      // Fallback: optimistic local insert
      const newPlatform: Platform = {
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
      return { ...p, status: next }
    }))
  }

  const handleCreateFramework = () => {
    if (!frameworkForm.name.trim()) return
    const newFramework: Framework = {
      id: `fw-${Date.now()}`,
      name: frameworkForm.name,
      category: frameworkForm.category,
      protocolLevel: Number(frameworkForm.protocolLevel) || 1,
      status: 'active',
      description: frameworkForm.description,
    }
    setFrameworks((prev) => [newFramework, ...prev])
    setShowFrameworkModal(false)
    setFrameworkForm({ name: '', category: '', protocolLevel: 1, description: '' })
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
    if (!confirm('确定删除此工具？')) return
    setTeams((prev) => prev.filter((t) => t.id !== id))
  }

  const handleTestConnection = (id: string, name: string) => {
    alert(`正在测试 ${name} (ID: ${id}) 的连接...`)
  }

  /* ── Stats ── */
  const connectedCount = platforms.filter((p) => p.status === 'connected').length
  const activeFwCount = frameworks.filter((f) => f.status === 'active').length
  const healthyEngCount = engines.filter((e) => e.status === 'healthy').length
  const activeTeamCount = teams.filter((t) => t.status === 'active').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">平台管理</h1>
            <p className="text-sm text-[var(--sage-500)]">
              {platforms.length} API Provider · {frameworks.length} 编排平台 · {engines.length} 本地引擎 · {teams.length} CLI工具
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

      {/* ── API Provider Tab ── */}
      {activeTab === 'api-providers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="card p-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-[var(--sage-700)]">{connectedCount} 在线</span>
              </div>
              <div className="card p-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-[var(--sage-400)]" />
                <span className="text-sm font-medium text-[var(--sage-700)]">{platforms.length - connectedCount} 离线</span>
              </div>
            </div>
            <button
              onClick={() => setShowPlatformModal(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> 添加平台
            </button>
          </div>

          {loading.platforms ? (
            <div className="flex items-center justify-center py-16 text-[var(--sage-500)] gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>加载中...</span>
            </div>
          ) : filteredPlatforms.length === 0 ? (
            <div className="card text-center py-16">
              <Globe className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" />
              <p className="text-[var(--sage-500)] mb-2">暂无 API Provider</p>
              <p className="text-xs text-[var(--sage-400)]">请添加平台或检查搜索条件</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlatforms.map((p) => {
                const status = PLATFORM_STATUS[p.status]
                return (
                  <div key={p.id} className="card p-4 transition-all hover:shadow-md">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                          <Globe className="w-5 h-5 text-[var(--sage-500)]" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-[var(--sage-800)]">{p.name}</h3>
                          <span className="text-[10px] text-[var(--sage-500)]">{p.type}</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-full" style={{ backgroundColor: status.color + '15', color: status.color }}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--sage-500)] mb-3 line-clamp-2">
                      {p.url || '无端点信息'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-[var(--sage-400)] mb-3">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {p.models.length} 模型
                      </span>
                      <span>{p.avgLatency > 0 ? `${p.avgLatency}ms` : '-'}</span>
                    </div>
                    <div className="flex items-center gap-1 pt-2 border-t" style={{ borderColor: 'var(--sage-100)' }}>
                      <button
                        onClick={() => togglePlatformStatus(p.id)}
                        className="p-1.5 rounded hover:bg-[var(--sage-100)] transition-colors"
                        style={{ color: 'var(--sage-500)' }}
                        title={p.status === 'connected' ? '断开' : '连接'}
                      >
                        {p.status === 'connected' ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleTestConnection(p.id, p.name)}
                        className="p-1.5 rounded hover:bg-[var(--sage-100)] transition-colors"
                        style={{ color: 'var(--sage-500)' }}
                        title="测试连接"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-[var(--sage-100)] transition-colors"
                        style={{ color: 'var(--sage-500)' }}
                        title="编辑"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePlatform(p.id)}
                        className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                        style={{ color: 'var(--sage-500)' }}
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Orchestration Tab ── */}
      {activeTab === 'orchestration' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="card p-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--sage-500)]" />
              <span className="text-sm font-medium text-[var(--sage-700)]">{activeFwCount} 活跃框架</span>
            </div>
            <button
              onClick={() => setShowFrameworkModal(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> 添加框架
            </button>
          </div>

          {loading.frameworks ? (
            <div className="flex items-center justify-center py-16 text-[var(--sage-500)] gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>加载中...</span>
            </div>
          ) : filteredFrameworks.length === 0 ? (
            <div className="card text-center py-16">
              <Layers className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" />
              <p className="text-[var(--sage-500)] mb-2">暂无线程编排平台</p>
              <p className="text-xs text-[var(--sage-400)]">请添加框架或检查搜索条件</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFrameworks.map((fw) => {
                const status = FRAMEWORK_STATUS[fw.status] || FRAMEWORK_STATUS.inactive
                return (
                  <div key={fw.id} className="card p-4 transition-all hover:shadow-md">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                          <Layers className="w-5 h-5 text-[var(--sage-500)]" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-[var(--sage-800)]">{fw.name}</h3>
                          <span className="text-[10px] text-[var(--sage-500)]">{fw.category}</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-full" style={{ backgroundColor: status.color + '15', color: status.color }}>
                        {status.label}
                      </span>
                    </div>
                    {fw.description && (
                      <p className="text-xs text-[var(--sage-500)] mb-3 line-clamp-2">{fw.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-[var(--sage-400)] mb-3">
                      <span>协议级别: {fw.protocolLevel}</span>
                      {fw.version && <span>v{fw.version}</span>}
                    </div>
                    <div className="flex items-center gap-1 pt-2 border-t" style={{ borderColor: 'var(--sage-100)' }}>
                      <button
                        className="p-1.5 rounded hover:bg-[var(--sage-100)] transition-colors"
                        style={{ color: 'var(--sage-500)' }}
                        title="编辑"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteFramework(fw.id)}
                        className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                        style={{ color: 'var(--sage-500)' }}
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Engines Tab ── */}
      {activeTab === 'engines' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="card p-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[var(--sage-500)]" />
              <span className="text-sm font-medium text-[var(--sage-700)]">{healthyEngCount} 健康引擎</span>
            </div>
            <button
              onClick={() => setShowEngineModal(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> 添加引擎
            </button>
          </div>

          {loading.engines ? (
            <div className="flex items-center justify-center py-16 text-[var(--sage-500)] gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>加载中...</span>
            </div>
          ) : filteredEngines.length === 0 ? (
            <div className="card text-center py-16">
              <Cpu className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" />
              <p className="text-[var(--sage-500)] mb-2">暂无本地引擎</p>
              <p className="text-xs text-[var(--sage-400)]">请添加引擎或检查搜索条件</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEngines.map((engine) => {
                const status = ENGINE_STATUS[engine.status] || ENGINE_STATUS.offline
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
                      <span className="text-[10px] px-2 py-1 rounded-full" style={{ backgroundColor: status.color + '15', color: status.color }}>
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
                    <div className="flex items-center gap-1 pt-2 border-t" style={{ borderColor: 'var(--sage-100)' }}>
                      <button
                        className="p-1.5 rounded hover:bg-[var(--sage-100)] transition-colors"
                        style={{ color: 'var(--sage-500)' }}
                        title="编辑"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleTestConnection(engine.id, engine.brand)}
                        className="p-1.5 rounded hover:bg-[var(--sage-100)] transition-colors"
                        style={{ color: 'var(--sage-500)' }}
                        title="测试连接"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEngine(engine.id)}
                        className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                        style={{ color: 'var(--sage-500)' }}
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CLI Tools Tab ── */}
      {activeTab === 'cli-tools' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="card p-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[var(--sage-500)]" />
              <span className="text-sm font-medium text-[var(--sage-700)]">{activeTeamCount} 活跃工具</span>
            </div>
            <button
              onClick={() => setShowTeamModal(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> 添加工具
            </button>
          </div>

          {loading.teams ? (
            <div className="flex items-center justify-center py-16 text-[var(--sage-500)] gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>加载中...</span>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="card text-center py-16">
              <Terminal className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" />
              <p className="text-[var(--sage-500)] mb-2">暂无 CLI 工具</p>
              <p className="text-xs text-[var(--sage-400)]">请添加工具或检查搜索条件</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeams.map((team) => {
                const status = TEAM_STATUS[team.status] || TEAM_STATUS.inactive
                return (
                  <div key={team.id} className="card p-4 transition-all hover:shadow-md">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                          <Terminal className="w-5 h-5 text-[var(--sage-500)]" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-[var(--sage-800)]">{team.name}</h3>
                          <span className="text-[10px] text-[var(--sage-500)]">{team.framework}</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-full" style={{ backgroundColor: status.color + '15', color: status.color }}>
                        {status.label}
                      </span>
                    </div>
                    {team.description && (
                      <p className="text-xs text-[var(--sage-500)] mb-3 line-clamp-2">{team.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-[var(--sage-400)] mb-3">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {team.collaborationMode}
                      </span>
                      {team.memberCount !== undefined && <span>{team.memberCount} 成员</span>}
                    </div>
                    <div className="flex items-center gap-1 pt-2 border-t" style={{ borderColor: 'var(--sage-100)' }}>
                      <button
                        className="p-1.5 rounded hover:bg-[var(--sage-100)] transition-colors"
                        style={{ color: 'var(--sage-500)' }}
                        title="编辑"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleTestConnection(team.id, team.name)}
                        className="p-1.5 rounded hover:bg-[var(--sage-100)] transition-colors"
                        style={{ color: 'var(--sage-500)' }}
                        title="测试连接"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                        style={{ color: 'var(--sage-500)' }}
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Platform Modal ── */}
      {showPlatformModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[400px] max-w-[90vw]">
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">添加平台</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--sage-600)] mb-1">平台名称</label>
                <input
                  type="text"
                  value={platformForm.name}
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
                  type="text"
                  value={platformForm.url}
                  onChange={(e) => setPlatformForm({ ...platformForm, url: e.target.value })}
                  placeholder="https://api.example.com"
                  className="w-full px-3 py-2 rounded-card border text-sm"
                  style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--sage-600)] mb-1">API Key</label>
                <input
                  type="password"
                  value={platformForm.apiKey}
                  onChange={(e) => setPlatformForm({ ...platformForm, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 rounded-card border text-sm"
                  style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreatePlatform}
                disabled={!platformForm.name.trim() || creating}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> 添加
              </button>
              <button
                onClick={() => setShowPlatformModal(false)}
                className="px-4 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)' }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Framework Modal ── */}
      {showFrameworkModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[400px] max-w-[90vw]">
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">添加框架</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="框架名称"
                value={frameworkForm.name}
                onChange={(e) => setFrameworkForm({ ...frameworkForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
              <input
                type="text"
                placeholder="分类"
                value={frameworkForm.category}
                onChange={(e) => setFrameworkForm({ ...frameworkForm, category: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
              <input
                type="number"
                placeholder="协议级别"
                value={frameworkForm.protocolLevel}
                onChange={(e) => setFrameworkForm({ ...frameworkForm, protocolLevel: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
              <textarea
                placeholder="描述（可选）"
                value={frameworkForm.description}
                onChange={(e) => setFrameworkForm({ ...frameworkForm, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-card border text-sm resize-none"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreateFramework}
                disabled={!frameworkForm.name.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> 添加
              </button>
              <button
                onClick={() => setShowFrameworkModal(false)}
                className="px-4 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)' }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Engine Modal ── */}
      {showEngineModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[400px] max-w-[90vw]">
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">添加引擎</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="品牌"
                value={engineForm.brand}
                onChange={(e) => setEngineForm({ ...engineForm, brand: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
              <input
                type="text"
                placeholder="模型"
                value={engineForm.model}
                onChange={(e) => setEngineForm({ ...engineForm, model: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
              <select
                value={engineForm.tier}
                onChange={(e) => setEngineForm({ ...engineForm, tier: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              >
                <option value="local">本地</option>
                <option value="edge">边缘</option>
                <option value="cloud">云端</option>
              </select>
              <textarea
                placeholder="描述（可选）"
                value={engineForm.description}
                onChange={(e) => setEngineForm({ ...engineForm, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-card border text-sm resize-none"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreateEngine}
                disabled={!engineForm.brand.trim() || !engineForm.model.trim() || creating}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> 添加
              </button>
              <button
                onClick={() => setShowEngineModal(false)}
                className="px-4 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)' }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Team Modal ── */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[400px] max-w-[90vw]">
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">添加 CLI 工具</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="工具名称"
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
              <select
                value={teamForm.framework}
                onChange={(e) => setTeamForm({ ...teamForm, framework: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              >
                <option value="">选择框架...</option>
                {frameworks.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <select
                value={teamForm.collaborationMode}
                onChange={(e) => setTeamForm({ ...teamForm, collaborationMode: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              >
                <option value="hierarchical">层级协作</option>
                <option value="swarm">蜂群协作</option>
                <option value="consensus">共识协作</option>
                <option value="relay">中继协作</option>
              </select>
              <textarea
                placeholder="描述（可选）"
                value={teamForm.description}
                onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-card border text-sm resize-none"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreateTeam}
                disabled={creating || !teamForm.name.trim() || !teamForm.framework}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? '创建中...' : '创建'}
              </button>
              <button
                onClick={() => setShowTeamModal(false)}
                className="px-4 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)' }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
