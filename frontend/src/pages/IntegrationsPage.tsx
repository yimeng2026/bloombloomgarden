import { useState, useEffect } from 'react'
import {
  RefreshCw, Plus, Link, CheckCircle, AlertTriangle, Loader2,
  Clock, Edit, Trash2, Zap, Plug, BarChart3, XCircle, Globe,
  Server, Database, Cloud, Code, Settings, Layers
} from 'lucide-react'
import {
  fetchIntegrations, getIntegration, createIntegration,
  updateIntegration, deleteIntegration, testIntegration,
  syncIntegration, fetchIntegrationStats
} from '@/api/client'

/* ── Types ─────────────────────────────────────────────────────── */

type IntegrationStatus = 'active' | 'inactive' | 'error' | 'syncing'
type IntegrationType = 'api' | 'webhook' | 'database' | 'cloud' | 'messaging' | 'custom'

interface Integration {
  id: string
  name: string
  type: IntegrationType
  status: IntegrationStatus
  description?: string
  config?: any
  lastSync?: string
  lastError?: string
  createdAt: string
  updatedAt?: string
}

interface IntegrationStats {
  active: number
  total: number
  newThisMonth: number
  syncFailed: number
}

/* ── Helpers ───────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<IntegrationStatus, { label: string; color: string; bg: string }> = {
  active:  { label: '活跃',   color: 'text-green-600',  bg: 'bg-green-500/10' },
  inactive:{ label: '未激活', color: 'text-gray-600',   bg: 'bg-gray-500/10' },
  error:   { label: '错误',   color: 'text-red-600',    bg: 'bg-red-500/10' },
  syncing: { label: '同步中', color: 'text-amber-600',  bg: 'bg-amber-500/10' },
}

const TYPE_CONFIG: Record<IntegrationType, { label: string; icon: any; color: string }> = {
  api:        { label: 'API',        icon: Code,     color: '#3b82f6' },
  webhook:    { label: 'Webhook',    icon: Zap,      color: '#8b5cf6' },
  database:   { label: '数据库',     icon: Database, color: '#10b981' },
  cloud:      { label: '云服务',     icon: Cloud,    color: '#0ea5e9' },
  messaging:  { label: '消息',       icon: Globe,    color: '#f59e0b' },
  custom:     { label: '自定义',     icon: Settings, color: '#6b7280' },
}

/* ── Main Component ────────────────────────────────────────────── */

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<IntegrationStats>({ active: 0, total: 0, newThisMonth: 0, syncFailed: 0 })
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<{
    name: string
    type: IntegrationType
    description: string
    config: string
  }>({ name: '', type: 'api', description: '', config: '' })
  const [saveLoading, setSaveLoading] = useState(false)

  /* -- Load data -- */
  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [integrationsRes, statsRes] = await Promise.allSettled([
        fetchIntegrations(),
        fetchIntegrationStats()
      ])

      if (integrationsRes.status === 'fulfilled') {
        const data = integrationsRes.value?.data || integrationsRes.value || []
        if (Array.isArray(data)) {
          setIntegrations(data)
        } else {
          setIntegrations([])
        }
      } else {
        console.error('Failed to fetch integrations:', integrationsRes.reason)
        setError('获取集成列表失败')
      }

      if (statsRes.status === 'fulfilled') {
        const s = statsRes.value?.data || statsRes.value || {}
        setStats({
          active: s.active ?? 0,
          total: s.total ?? 0,
          newThisMonth: s.newThisMonth ?? 0,
          syncFailed: s.syncFailed ?? 0,
        })
      }
    } catch (e: any) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  /* -- Actions -- */
  const handleTest = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [`test-${id}`]: true }))
    try {
      await testIntegration(id)
      alert('测试成功')
    } catch (e: any) {
      alert('测试失败: ' + (e.message || '未知错误'))
    } finally {
      setActionLoading((prev) => ({ ...prev, [`test-${id}`]: false }))
    }
  }

  const handleSync = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [`sync-${id}`]: true }))
    try {
      await syncIntegration(id)
      alert('同步已触发')
      loadData()
    } catch (e: any) {
      alert('同步失败: ' + (e.message || '未知错误'))
    } finally {
      setActionLoading((prev) => ({ ...prev, [`sync-${id}`]: false }))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此集成？')) return
    setActionLoading((prev) => ({ ...prev, [`del-${id}`]: true }))
    try {
      await deleteIntegration(id)
      setIntegrations((prev) => prev.filter((i) => i.id !== id))
    } catch (e: any) {
      alert('删除失败: ' + (e.message || '未知错误'))
    } finally {
      setActionLoading((prev) => ({ ...prev, [`del-${id}`]: false }))
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({ name: '', type: 'api', description: '', config: '' })
    setShowModal(true)
  }

  const openEdit = async (id: string) => {
    try {
      const res: any = await getIntegration(id)
      const data = res?.data || res
      if (data) {
        setEditingId(id)
        setForm({
          name: data.name || '',
          type: data.type || 'api',
          description: data.description || '',
          config: data.config ? JSON.stringify(data.config, null, 2) : '',
        })
        setShowModal(true)
      }
    } catch (e: any) {
      alert('获取详情失败: ' + (e.message || '未知错误'))
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('请输入集成名称')
      return
    }
    setSaveLoading(true)
    try {
      const payload: any = {
        name: form.name,
        type: form.type,
        description: form.description || undefined,
      }
      if (form.config.trim()) {
        try {
          payload.config = JSON.parse(form.config)
        } catch {
          alert('配置 JSON 格式错误')
          setSaveLoading(false)
          return
        }
      }

      if (editingId) {
        const res: any = await updateIntegration(editingId, payload)
        const updated = res?.data || res
        if (updated) {
          setIntegrations((prev) => prev.map((i) => i.id === editingId ? { ...i, ...updated } : i))
        }
      } else {
        const res: any = await createIntegration(payload)
        const newItem = res?.data || res
        if (newItem) {
          setIntegrations((prev) => [newItem, ...prev])
        }
      }
      setShowModal(false)
    } catch (e: any) {
      alert('保存失败: ' + (e.message || '未知错误'))
    } finally {
      setSaveLoading(false)
    }
  }

  /* -- Render helpers -- */
  const renderStatusBadge = (status: IntegrationStatus) => {
    const cfg = STATUS_CONFIG[status]
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
        {cfg.label}
      </span>
    )
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '从未同步'
    try {
      const d = new Date(dateStr)
      return d.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">Integrations 集成管理</h1>
            <p className="text-sm text-[var(--sage-500)]">外部系统连接与数据同步</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)] transition-colors"
            title="刷新"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新建集成
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 flex items-center gap-2 text-red-600 bg-red-500/5">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
          <button onClick={loadData} className="text-xs underline ml-auto">重试</button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-[var(--sage-500)] gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>加载中...</span>
        </div>
      ) : integrations.length === 0 ? (
        <div className="card text-center py-16">
          <Link className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" />
          <p className="text-[var(--sage-500)]">暂无集成配置</p>
          <button onClick={openCreate} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> 新建集成
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((item) => {
            const typeCfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.custom
            const TypeIcon = typeCfg.icon
            return (
              <div key={item.id} className="card p-4 transition-all hover:shadow-md">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: typeCfg.color + '15' }}
                    >
                      <TypeIcon className="w-5 h-5" style={{ color: typeCfg.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-[var(--sage-800)]">{item.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: typeCfg.color + '15', color: typeCfg.color }}
                        >
                          {typeCfg.label}
                        </span>
                        {renderStatusBadge(item.status)}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[var(--sage-500)] mb-3 line-clamp-2 min-h-[2.5em]">
                  {item.description || '无描述'}
                </p>

                <div className="flex items-center gap-1 text-[10px] text-[var(--sage-400)] mb-3">
                  <Clock className="w-3 h-3" />
                  <span>最后同步: {formatDate(item.lastSync)}</span>
                </div>

                {item.lastError && (
                  <div className="text-[10px] text-red-500 bg-red-500/5 rounded-lg px-2 py-1.5 mb-3 line-clamp-2">
                    {item.lastError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-1 pt-2 border-t" style={{ borderColor: 'var(--sage-100)' }}>
                  <button
                    onClick={() => openEdit(item.id)}
                    className="p-1.5 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)] hover:text-[var(--sage-600)] transition-colors"
                    title="编辑"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleTest(item.id)}
                    disabled={actionLoading[`test-${item.id}`]}
                    className="p-1.5 rounded-lg hover:bg-blue-500/10 text-[var(--sage-400)] hover:text-blue-600 transition-colors"
                    title="测试"
                  >
                    {actionLoading[`test-${item.id}`] ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plug className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleSync(item.id)}
                    disabled={actionLoading[`sync-${item.id}`] || item.status === 'syncing'}
                    className="p-1.5 rounded-lg hover:bg-amber-500/10 text-[var(--sage-400)] hover:text-amber-600 transition-colors"
                    title="同步"
                  >
                    {actionLoading[`sync-${item.id}`] || item.status === 'syncing' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={actionLoading[`del-${item.id}`]}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--sage-400)] hover:text-red-600 transition-colors"
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--sage-500)]">活跃集成</span>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <span className="text-2xl font-bold text-[var(--sage-800)]">{stats.active}</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--sage-500)]">总集成数</span>
            <Layers className="w-4 h-4 text-[var(--sage-400)]" />
          </div>
          <span className="text-2xl font-bold text-[var(--sage-800)]">{stats.total}</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--sage-500)]">本月新增</span>
            <Plus className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-2xl font-bold text-[var(--sage-800)]">{stats.newThisMonth}</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--sage-500)]">同步失败</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <span className="text-2xl font-bold text-[var(--sage-800)]">{stats.syncFailed}</span>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="card w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--sage-800)]">
                {editingId ? '编辑集成' : '新建集成'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)]">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--sage-500)] mb-1">名称</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--sage-200)] bg-white text-[var(--sage-700)] focus:outline-none focus:ring-2 focus:ring-[var(--sage-300)]"
                  placeholder="集成名称"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--sage-500)] mb-1">类型</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as IntegrationType }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--sage-200)] bg-white text-[var(--sage-700)] focus:outline-none focus:ring-2 focus:ring-[var(--sage-300)]"
                >
                  <option value="api">API</option>
                  <option value="webhook">Webhook</option>
                  <option value="database">数据库</option>
                  <option value="cloud">云服务</option>
                  <option value="messaging">消息</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--sage-500)] mb-1">描述</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--sage-200)] bg-white text-[var(--sage-700)] focus:outline-none focus:ring-2 focus:ring-[var(--sage-300)] resize-none"
                  rows={2}
                  placeholder="可选描述"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--sage-500)] mb-1">配置 (JSON)</label>
                <textarea
                  value={form.config}
                  onChange={(e) => setForm((prev) => ({ ...prev, config: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--sage-200)] bg-white text-[var(--sage-700)] focus:outline-none focus:ring-2 focus:ring-[var(--sage-300)] resize-none font-mono"
                  rows={6}
                  placeholder='{"url": "https://...", "token": "..."}'
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-2 text-sm rounded-lg border border-[var(--sage-200)] text-[var(--sage-600)] hover:bg-[var(--sage-50)] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saveLoading}
                className="btn-primary flex items-center gap-1"
              >
                {saveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
