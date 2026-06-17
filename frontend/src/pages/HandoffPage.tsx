import { useState, useEffect } from 'react'
import {
  RefreshCw, Plus, Send, CheckCircle, XCircle, AlertTriangle,
  Loader2, Clock, ArrowRight, User, Target, Hash, BarChart3,
  ChevronDown, ChevronUp, Ban, Sparkles
} from 'lucide-react'
import {
  fetchHandoffs, fetchPendingHandoffs, createHandoff, acceptHandoff,
  declineHandoff, completeHandoff, cancelHandoff, autoRouteHandoff,
  fetchHandoffStats
} from '@/api/client'

/* ── Types ─────────────────────────────────────────────────────── */

type HandoffStatus = 'pending' | 'accepted' | 'completed' | 'declined' | 'cancelled'
type Priority = 'low' | 'medium' | 'high' | 'critical'

interface Handoff {
  id: string
  title: string
  description?: string
  sourceAgent: string
  targetAgent: string
  status: HandoffStatus
  priority: Priority
  createdAt: string
  updatedAt?: string
  completedAt?: string
  payload?: any
  result?: any
}

interface HandoffStats {
  total: number
  pending: number
  completedToday: number
  autoRouteSuccess: number
}

/* ── Helpers ───────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<HandoffStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: '待处理',  color: 'text-amber-600',  bg: 'bg-amber-500/10' },
  accepted:  { label: '已接受',  color: 'text-green-600',  bg: 'bg-green-500/10' },
  completed: { label: '已完成',  color: 'text-blue-600',   bg: 'bg-blue-500/10' },
  declined:  { label: '已拒绝',  color: 'text-red-600',    bg: 'bg-red-500/10' },
  cancelled: { label: '已取消',  color: 'text-gray-600',   bg: 'bg-gray-500/10' },
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  low:      { label: '低', color: 'text-[var(--sage-400)]' },
  medium:   { label: '中', color: 'text-blue-500' },
  high:     { label: '高', color: 'text-amber-500' },
  critical: { label: '紧急', color: 'text-red-500' },
}

type TabKey = 'all' | 'pending' | 'completed' | 'declined'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待处理' },
  { key: 'completed', label: '已完成' },
  { key: 'declined', label: '已拒绝' },
]

/* ── Main Component ────────────────────────────────────────────── */

export default function HandoffPage() {
  const [handoffs, setHandoffs] = useState<Handoff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [stats, setStats] = useState<HandoffStats>({ total: 0, pending: 0, completedToday: 0, autoRouteSuccess: 0 })
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '', sourceAgent: '', targetAgent: '', priority: 'medium' as Priority, description: ''
  })
  const [createLoading, setCreateLoading] = useState(false)

  /* -- Load data -- */
  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [handoffsRes, statsRes] = await Promise.allSettled([
        fetchHandoffs(),
        fetchHandoffStats()
      ])

      if (handoffsRes.status === 'fulfilled') {
        const data = handoffsRes.value?.data || handoffsRes.value || []
        if (Array.isArray(data)) {
          setHandoffs(data)
        } else {
          setHandoffs([])
        }
      } else {
        console.error('Failed to fetch handoffs:', handoffsRes.reason)
        setError('获取移交列表失败')
      }

      if (statsRes.status === 'fulfilled') {
        const s = statsRes.value?.data || statsRes.value || {}
        setStats({
          total: s.total ?? 0,
          pending: s.pending ?? 0,
          completedToday: s.completedToday ?? 0,
          autoRouteSuccess: s.autoRouteSuccess ?? 0,
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

  /* -- Tab filtering -- */
  const filteredHandoffs = handoffs.filter((h) => {
    if (activeTab === 'all') return true
    return h.status === activeTab
  })

  /* -- Actions -- */
  const handleAccept = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }))
    try {
      await acceptHandoff(id)
      setHandoffs((prev) => prev.map((h) => h.id === id ? { ...h, status: 'accepted' as HandoffStatus } : h))
    } catch (e: any) {
      alert('接受失败: ' + (e.message || '未知错误'))
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleDecline = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }))
    try {
      await declineHandoff(id)
      setHandoffs((prev) => prev.map((h) => h.id === id ? { ...h, status: 'declined' as HandoffStatus } : h))
    } catch (e: any) {
      alert('拒绝失败: ' + (e.message || '未知错误'))
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleComplete = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }))
    try {
      await completeHandoff(id)
      setHandoffs((prev) => prev.map((h) => h.id === id ? { ...h, status: 'completed' as HandoffStatus } : h))
    } catch (e: any) {
      alert('完成失败: ' + (e.message || '未知错误'))
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleCancel = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }))
    try {
      await cancelHandoff(id)
      setHandoffs((prev) => prev.map((h) => h.id === id ? { ...h, status: 'cancelled' as HandoffStatus } : h))
    } catch (e: any) {
      alert('取消失败: ' + (e.message || '未知错误'))
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.sourceAgent.trim() || !createForm.targetAgent.trim()) {
      alert('请填写标题、源Agent和目标Agent')
      return
    }
    setCreateLoading(true)
    try {
      const res: any = await createHandoff({
        title: createForm.title,
        sourceAgent: createForm.sourceAgent,
        targetAgent: createForm.targetAgent,
        priority: createForm.priority,
        description: createForm.description || undefined,
      })
      const newHandoff = res?.data || res
      if (newHandoff) {
        setHandoffs((prev) => [newHandoff, ...prev])
        setShowCreateModal(false)
        setCreateForm({ title: '', sourceAgent: '', targetAgent: '', priority: 'medium', description: '' })
      }
    } catch (e: any) {
      alert('创建失败: ' + (e.message || '未知错误'))
    } finally {
      setCreateLoading(false)
    }
  }

  const handleAutoRoute = async () => {
    if (!createForm.title.trim() || !createForm.sourceAgent.trim()) {
      alert('请填写标题和源Agent')
      return
    }
    setCreateLoading(true)
    try {
      const res: any = await autoRouteHandoff({
        title: createForm.title,
        sourceAgent: createForm.sourceAgent,
        priority: createForm.priority,
        description: createForm.description || undefined,
      })
      const newHandoff = res?.data || res
      if (newHandoff) {
        setHandoffs((prev) => [newHandoff, ...prev])
        setShowCreateModal(false)
        setCreateForm({ title: '', sourceAgent: '', targetAgent: '', priority: 'medium', description: '' })
      }
    } catch (e: any) {
      alert('自动路由失败: ' + (e.message || '未知错误'))
    } finally {
      setCreateLoading(false)
    }
  }

  /* -- Render helpers -- */
  const renderStatusBadge = (status: HandoffStatus) => {
    const cfg = STATUS_CONFIG[status]
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
        {cfg.label}
      </span>
    )
  }

  const renderPriorityBadge = (priority: Priority) => {
    const cfg = PRIORITY_CONFIG[priority]
    return <span className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
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
          <Send className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">Handoff 移交</h1>
            <p className="text-sm text-[var(--sage-500)]">Agent 间任务移交与协作</p>
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
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            创建移交
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

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b" style={{ borderColor: 'var(--sage-200)' }}>
        {TABS.map((tab) => {
          const count = tab.key === 'all' ? handoffs.length : handoffs.filter((h) => h.status === tab.key).length
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                active ? 'text-[var(--sage-700)]' : 'text-[var(--sage-400)] hover:text-[var(--sage-600)]'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                active ? 'bg-[var(--sage-100)] text-[var(--sage-600)]' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
              {active && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--sage-500)] rounded-t-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-[var(--sage-500)] gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>加载中...</span>
        </div>
      ) : filteredHandoffs.length === 0 ? (
        <div className="card text-center py-16">
          <Send className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" />
          <p className="text-[var(--sage-500)]">
            {activeTab === 'all' ? '暂无移交记录' : '该状态下暂无记录'}
          </p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> 创建移交
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--sage-100)', background: 'var(--sage-50)' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--sage-500)]">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--sage-500)]">标题</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--sage-500)]">源Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--sage-500)]">目标Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--sage-500)]">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--sage-500)]">优先级</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--sage-500)]">创建时间</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[var(--sage-500)]">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--sage-100)' }}>
                {filteredHandoffs.map((h) => (
                  <tr key={h.id} className="hover:bg-[var(--sage-50)]/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-[var(--sage-400)]">{h.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--sage-800)]">{h.title}</div>
                      {h.description && <div className="text-[10px] text-[var(--sage-400)] mt-0.5 truncate max-w-[200px]">{h.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-[var(--sage-600)]">
                        <User className="w-3 h-3 text-[var(--sage-400)]" />
                        <span className="text-xs">{h.sourceAgent}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-[var(--sage-600)]">
                        <Target className="w-3 h-3 text-[var(--sage-400)]" />
                        <span className="text-xs">{h.targetAgent}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{renderStatusBadge(h.status)}</td>
                    <td className="px-4 py-3">{renderPriorityBadge(h.priority)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-[var(--sage-400)]">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">{formatDate(h.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {h.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAccept(h.id)}
                              disabled={actionLoading[h.id]}
                              className="p-1.5 rounded-lg hover:bg-green-500/10 text-[var(--sage-400)] hover:text-green-600 transition-colors"
                              title="接受"
                            >
                              {actionLoading[h.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleDecline(h.id)}
                              disabled={actionLoading[h.id]}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--sage-400)] hover:text-red-600 transition-colors"
                              title="拒绝"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCancel(h.id)}
                              disabled={actionLoading[h.id]}
                              className="p-1.5 rounded-lg hover:bg-gray-500/10 text-[var(--sage-400)] hover:text-gray-600 transition-colors"
                              title="取消"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {h.status === 'accepted' && (
                          <button
                            onClick={() => handleComplete(h.id)}
                            disabled={actionLoading[h.id]}
                            className="p-1.5 rounded-lg hover:bg-blue-500/10 text-[var(--sage-400)] hover:text-blue-600 transition-colors"
                            title="完成"
                          >
                            {actionLoading[h.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {(h.status === 'completed' || h.status === 'declined' || h.status === 'cancelled') && (
                          <span className="text-[10px] text-[var(--sage-400)] px-2">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--sage-500)]">总移交数</span>
            <Hash className="w-4 h-4 text-[var(--sage-400)]" />
          </div>
          <span className="text-2xl font-bold text-[var(--sage-800)]">{stats.total}</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--sage-500)]">待处理</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-bold text-[var(--sage-800)]">{stats.pending}</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--sage-500)]">今日完成</span>
            <CheckCircle className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-2xl font-bold text-[var(--sage-800)]">{stats.completedToday}</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--sage-500)]">自动路由成功</span>
            <Sparkles className="w-4 h-4 text-green-500" />
          </div>
          <span className="text-2xl font-bold text-[var(--sage-800)]">{stats.autoRouteSuccess}</span>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="card w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--sage-800)]">创建移交</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)]">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--sage-500)] mb-1">标题</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--sage-200)] bg-white text-[var(--sage-700)] focus:outline-none focus:ring-2 focus:ring-[var(--sage-300)]"
                  placeholder="输入移交标题"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--sage-500)] mb-1">源Agent</label>
                  <input
                    type="text"
                    value={createForm.sourceAgent}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, sourceAgent: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--sage-200)] bg-white text-[var(--sage-700)] focus:outline-none focus:ring-2 focus:ring-[var(--sage-300)]"
                    placeholder="源Agent ID"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--sage-500)] mb-1">目标Agent</label>
                  <input
                    type="text"
                    value={createForm.targetAgent}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, targetAgent: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--sage-200)] bg-white text-[var(--sage-700)] focus:outline-none focus:ring-2 focus:ring-[var(--sage-300)]"
                    placeholder="目标Agent ID"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--sage-500)] mb-1">优先级</label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, priority: e.target.value as Priority }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--sage-200)] bg-white text-[var(--sage-700)] focus:outline-none focus:ring-2 focus:ring-[var(--sage-300)]"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                  <option value="critical">紧急</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--sage-500)] mb-1">描述</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--sage-200)] bg-white text-[var(--sage-700)] focus:outline-none focus:ring-2 focus:ring-[var(--sage-300)] resize-none"
                  rows={3}
                  placeholder="可选描述"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-2 text-sm rounded-lg border border-[var(--sage-200)] text-[var(--sage-600)] hover:bg-[var(--sage-50)] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAutoRoute}
                disabled={createLoading}
                className="px-3 py-2 text-sm rounded-lg border border-[var(--sage-200)] text-[var(--sage-600)] hover:bg-[var(--sage-50)] transition-colors flex items-center gap-1"
              >
                {createLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                自动路由
              </button>
              <button
                onClick={handleCreate}
                disabled={createLoading}
                className="btn-primary flex items-center gap-1"
              >
                {createLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
