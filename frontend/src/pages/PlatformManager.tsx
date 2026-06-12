import { useState, useEffect } from 'react'
import {
  Server, Key, Layers, Cpu, Users, Search, Plus, Loader2,
  CheckCircle, XCircle, Check, X, Trash2, Edit3, Eye, EyeOff,
  GitBranch, Play, Globe, Activity
} from 'lucide-react'
import {
  fetchPlatforms, fetchFrameworks, fetchEngines, fetchTeams,
  createTeam, deletePlatform
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

interface ApiKeyItem {
  id: string
  name: string
  provider: string
  endpoint: string
  keyMask: string
  modelCount: number
  status: 'connected' | 'disconnected' | 'error'
  latency: number | string
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
  { id: 'platforms', label: '平台', icon: Server },
  { id: 'apikeys', label: 'API密钥', icon: Key },
  { id: 'frameworks', label: '框架', icon: Layers },
  { id: 'engines', label: '引擎', icon: Cpu },
  { id: 'teams', label: '团队', icon: Users },
]

/* ── Mock Data ── */
const MOCK_PLATFORMS: Platform[] = [
  { id: 'pl-1', name: 'Kimi API', type: 'kimi', url: 'https://api.moonshot.cn', status: 'connected', models: ['kimi-k2.5', 'kimi-k1.5'], createdAt: '2026-05-01', lastCheck: '刚刚', requestCount: 12543, avgLatency: 156 },
  { id: 'pl-2', name: 'Claude API', type: 'claude', url: 'https://api.anthropic.com', status: 'connected', models: ['claude-3-5-sonnet', 'claude-3-opus'], createdAt: '2026-05-02', lastCheck: '2分钟前', requestCount: 8765, avgLatency: 35 },
  { id: 'pl-3', name: 'Ollama Local', type: 'ollama', url: 'http://localhost:11434', status: 'connected', models: ['qwen2.5:7b', 'deepseek-r1:14b'], createdAt: '2026-05-03', lastCheck: '刚刚', requestCount: 3421, avgLatency: 120 },
  { id: 'pl-4', name: 'OpenAI', type: 'openai', url: 'https://api.openai.com', status: 'disconnected', models: ['gpt-4.1', 'gpt-4o'], createdAt: '2026-05-04', lastCheck: '1小时前', requestCount: 0, avgLatency: 0 },
  { id: 'pl-5', name: 'DeepSeek', type: 'deepseek', url: 'https://api.deepseek.com', status: 'connected', models: ['deepseek-chat', 'deepseek-reasoner'], createdAt: '2026-05-05', lastCheck: '5分钟前', requestCount: 5678, avgLatency: 45 },
  { id: 'pl-6', name: '智谱AI', type: 'zhipu', url: 'https://open.bigmodel.cn', status: 'connected', models: ['glm-5.1', 'glm-4-plus'], createdAt: '2026-05-06', lastCheck: '刚刚', requestCount: 8901, avgLatency: 80 },
]

const MOCK_APIKEYS: ApiKeyItem[] = [
  { id: 'ak-1', name: 'Kimi 生产密钥', provider: 'kimi', endpoint: 'https://api.moonshot.cn', keyMask: 'sk-mk-7a3f...', modelCount: 3, status: 'connected', latency: 156 },
  { id: 'ak-2', name: 'Claude 密钥', provider: 'claude', endpoint: 'https://api.anthropic.com', keyMask: 'sk-ant-9b2e...', modelCount: 3, status: 'connected', latency: 35 },
  { id: 'ak-3', name: 'OpenAI 密钥', provider: 'openai', endpoint: 'https://api.openai.com', keyMask: 'sk-proj-4c1d...', modelCount: 5, status: 'disconnected', latency: '-' },
  { id: 'ak-4', name: 'DeepSeek 密钥', provider: 'deepseek', endpoint: 'https://api.deepseek.com', keyMask: 'sk-ds-8f5a...', modelCount: 3, status: 'connected', latency: 45 },
  { id: 'ak-5', name: '智谱 API Key', provider: 'zhipu', endpoint: 'https://open.bigmodel.cn', keyMask: 'sk-zp-2e9b...', modelCount: 6, status: 'connected', latency: 80 },
]

export default function PlatformManager() {
  const [activeTab, setActiveTab] = useState('platforms')
  const [searchQuery, setSearchQuery] = useState('')

  // Data states
  const [platforms, setPlatforms] = useState<Platform[]>(MOCK_PLATFORMS)
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [engines, setEngines] = useState<Engine[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [apiKeys] = useState<ApiKeyItem[]>(MOCK_APIKEYS)
  const [loading, setLoading] = useState<Record<string, boolean>>({
    platforms: false, frameworks: true, engines: true, teams: true
  })

  // Modals
  const [showPlatformModal, setShowPlatformModal] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [platformForm, setPlatformForm] = useState({ name: '', type: 'kimi', url: '', apiKey: '' })
  const [teamForm, setTeamForm] = useState({ name: '', framework: '', collaborationMode: 'hierarchical', description: '' })
  const [creating, setCreating] = useState(false)
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())

  // Load data on mount
  useEffect(() => {
    async function load() {
      try {
        const [fwRes, engRes, teamRes]: any = await Promise.all([
          fetchFrameworks(),
          fetchEngines(),
          fetchTeams(),
        ])
        setFrameworks(Array.isArray(fwRes) ? fwRes : fwRes.data || [])
        setEngines(Array.isArray(engRes) ? engRes : engRes.data || [])
        setTeams(Array.isArray(teamRes) ? teamRes : teamRes.data || [])
      } catch (e) {
        console.error('Failed to load data:', e)
      } finally {
        setLoading({ platforms: false, frameworks: false, engines: false, teams: false })
      }
    }
    load()
  }, [])

  /* ── Actions ── */
  const handleCreatePlatform = () => {
    if (!platformForm.name.trim()) return
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
    setPlatforms([...platforms, newPlatform])
    setShowPlatformModal(false)
    setPlatformForm({ name: '', type: 'kimi', url: '', apiKey: '' })
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

  const togglePlatformStatus = (id: string) => {
    setPlatforms(platforms.map((p) => {
      if (p.id !== id) return p
      const next = p.status === 'connected' ? 'disconnected' : 'connected'
      return { ...p, status: next }
    }))
  }

  const deletePlatformItem = (id: string) => {
    if (!confirm('确定删除此平台？')) return
    setPlatforms(platforms.filter((p) => p.id !== id))
  }

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
  const filteredApiKeys = apiKeys.filter((k) =>
    k.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.provider.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
              {platforms.length} 平台 · {frameworks.length} 框架 · {engines.length} 引擎 · {teams.length} 团队
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

      {/* ── Platforms Tab ── */}
      {activeTab === 'platforms' && (
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

          <div className="overflow-x-auto rounded-card" style={{ border: '1px solid var(--sage-200)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--sage-100)' }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--sage-500)' }}>平台</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--sage-500)' }}>类型</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--sage-500)' }}>端点</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--sage-500)' }}>模型</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--sage-500)' }}>状态</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--sage-500)' }}>延迟</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--sage-500)' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlatforms.map((p) => {
                  const status = PLATFORM_STATUS[p.status]
                  return (
                    <tr key={p.id} className="hover:bg-[var(--sage-50)] transition-colors" style={{ borderBottom: '1px solid var(--sage-100)' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--sage-700)' }}>{p.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--sage-100)] text-[var(--sage-600)]">{p.type}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--sage-500)' }}>{p.url}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--sage-500)' }}>{p.models.join(', ')}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
                          <span className="text-xs" style={{ color: status.color }}>{status.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--sage-500)' }}>
                        {p.avgLatency > 0 ? `${p.avgLatency}ms` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => togglePlatformStatus(p.id)}
                            className="p-1.5 rounded hover:bg-[var(--sage-100)] transition-colors"
                            style={{ color: 'var(--sage-500)' }}
                            title={p.status === 'connected' ? '断开' : '连接'}
                          >
                            {p.status === 'connected' ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => deletePlatformItem(p.id)}
                            className="p-1.5 rounded hover:bg-[var(--sage-100)] transition-colors"
                            style={{ color: 'var(--sage-500)' }}
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── API Keys Tab ── */}
      {activeTab === 'apikeys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--sage-500)]">API 密钥与平台绑定，创建智能体时直接使用</p>
            <button className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> 添加密钥
            </button>
          </div>

          <div className="overflow-x-auto rounded-card" style={{ border: '1px solid var(--sage-200)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--sage-100)' }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--sage-500)' }}>名称</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--sage-500)' }}>平台</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--sage-500)' }}>端点</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--sage-500)' }}>密钥</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--sage-500)' }}>模型数</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--sage-500)' }}>状态</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--sage-500)' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredApiKeys.map((k) => (
                  <tr key={k.id} className="hover:bg-[var(--sage-50)] transition-colors" style={{ borderBottom: '1px solid var(--sage-100)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--sage-700)' }}>{k.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--sage-100)] text-[var(--sage-600)]">{k.provider}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--sage-500)' }}>{k.endpoint}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {revealedKeys.has(k.id) ? k.keyMask : '••••••••'}
                        <button
                          onClick={() => setRevealedKeys((prev) => { const n = new Set(prev); if (n.has(k.id)) n.delete(k.id); else n.add(k.id); return n })}
                          className="p-0.5 rounded hover:bg-[var(--sage-100)]"
                          style={{ color: 'var(--sage-400)' }}
                        >
                          {revealedKeys.has(k.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--sage-500)' }}>{k.modelCount}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: k.status === 'connected' ? '#10b981' : '#6b7280' }} />
                        <span className="text-xs" style={{ color: k.status === 'connected' ? '#10b981' : '#6b7280' }}>
                          {k.status === 'connected' ? '正常' : '断开'}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded hover:bg-[var(--sage-100)] transition-colors" style={{ color: 'var(--sage-500)' }}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded hover:bg-[var(--sage-100)] transition-colors" style={{ color: 'var(--sage-500)' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Frameworks Tab ── */}
      {activeTab === 'frameworks' && (
        <div className="space-y-4">
          {loading.frameworks ? (
            <div className="flex items-center justify-center py-16 text-[var(--sage-500)] gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>加载中...</span>
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
                    <div className="flex items-center justify-between text-xs text-[var(--sage-400)]">
                      <span>协议级别: {fw.protocolLevel}</span>
                      {fw.version && <span>v{fw.version}</span>}
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
          {loading.engines ? (
            <div className="flex items-center justify-center py-16 text-[var(--sage-500)] gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>加载中...</span>
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
                    <div className="flex items-center justify-between text-xs text-[var(--sage-400)]">
                      <span>层级: {engine.tier}</span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        健康分: {engine.healthScore}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Teams Tab ── */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="card p-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--sage-500)]" />
              <span className="text-sm font-medium text-[var(--sage-700)]">{activeTeamCount} 活跃团队</span>
            </div>
            <button
              onClick={() => setShowTeamModal(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> 创建团队
            </button>
          </div>

          {loading.teams ? (
            <div className="flex items-center justify-center py-16 text-[var(--sage-500)] gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>加载中...</span>
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
                          <Users className="w-5 h-5 text-[var(--sage-500)]" />
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
                    <div className="flex items-center justify-between text-xs text-[var(--sage-400)]">
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        {team.collaborationMode}
                      </span>
                      {team.memberCount !== undefined && <span>{team.memberCount} 成员</span>}
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
                disabled={!platformForm.name.trim()}
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

      {/* ── Team Modal ── */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[400px] max-w-[90vw]">
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">创建团队</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="团队名称"
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
