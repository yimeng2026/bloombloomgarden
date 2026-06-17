import { useState, useEffect } from 'react'
import { Webhook, Plus, Send, Trash2, Edit2, Eye, EyeOff, Copy, Check, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { fetchWebhooks } from '@/api/client'

interface WebhookItem {
  id: string
  name: string
  url: string
  events: string[]
  isActive: boolean
  secret?: string
  createdAt: string
  lastTriggered?: string
  successRate?: number
  totalDeliveries: number
  failedDeliveries: number
  headers: Record<string, string>
  retryPolicy: { maxRetries: number; backoff: string }
}

const EVENT_LABELS: Record<string, string> = {
  'message.created': '消息创建',
  'message.updated': '消息更新',
  'agent.mentioned': 'Agent提及',
  'agent.created': 'Agent创建',
  'agent.updated': 'Agent更新',
  'agent.deleted': 'Agent删除',
  'agent.status_changed': '状态变更',
  'workflow.started': '工作流启动',
  'workflow.completed': '工作流完成',
  'workflow.failed': '工作流失败',
  'monitor.alert': '监控告警',
  'system.error': '系统错误',
  'agent.crashed': 'Agent崩溃',
  'export.completed': '导出完成',
  'export.failed': '导出失败',
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({})
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', events: '', secret: '' })
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchWebhooks()
      .then((data: any) => {
        if (!cancelled) setWebhooks(data?.data || [])
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || '加载 Webhooks 失败')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const toggleActive = (id: string) => {
    setWebhooks(webhooks.map((w) => w.id === id ? { ...w, isActive: !w.isActive } : w))
  }

  const maskSecret = (secret?: string) => {
    if (!secret) return '••••••••'
    if (secret.length <= 8) return '••••••••'
    return secret.slice(0, 4) + '••••' + secret.slice(-4)
  }

  const handleSubmit = () => {
    const newWebhook: WebhookItem = {
      id: `wh-${Date.now()}`,
      name: form.name,
      url: form.url,
      events: form.events.split(',').map((e) => e.trim()).filter(Boolean),
      isActive: true,
      secret: form.secret || undefined,
      createdAt: new Date().toISOString().split('T')[0],
      totalDeliveries: 0,
      failedDeliveries: 0,
      successRate: 0,
      headers: { 'Content-Type': 'application/json' },
      retryPolicy: { maxRetries: 3, backoff: 'exponential' },
    }
    setWebhooks([...webhooks, newWebhook])
    setShowModal(false)
    setForm({ name: '', url: '', events: '', secret: '' })
  }

  const filtered = webhooks.filter((w) => {
    if (filter === 'active') return w.isActive
    if (filter === 'inactive') return !w.isActive
    return true
  })

  const activeCount = webhooks.filter((w) => w.isActive).length
  const totalDeliveries = webhooks.reduce((s, w) => s + w.totalDeliveries, 0)

  return (
    <div className="space-y-6">
      {error && (
        <div className="card p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
          <div className="flex items-center gap-3 text-[var(--sage-500)]">
            <div className="w-5 h-5 border-2 border-[var(--sage-300)] border-t-[var(--sage-500)] rounded-full animate-spin" />
            <span className="text-sm">加载 Webhooks...</span>
          </div>
        </div>
      ) : (
        <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Webhook className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">Webhooks</h1>
            <p className="text-sm text-[var(--sage-500)]">{webhooks.length} 个 Webhook · {activeCount} 启用 · 累计推送 {totalDeliveries.toLocaleString()} 次</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> 新建 Webhook
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{activeCount}</p>
          <p className="text-xs text-[var(--sage-500)]">启用中</p>
        </div>
        <div className="card p-4">
          <Send className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{totalDeliveries.toLocaleString()}</p>
          <p className="text-xs text-[var(--sage-500)]">总推送</p>
        </div>
        <div className="card p-4">
          <AlertTriangle className="w-5 h-5 text-red-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{webhooks.reduce((s, w) => s + w.failedDeliveries, 0)}</p>
          <p className="text-xs text-[var(--sage-500)]">失败数</p>
        </div>
        <div className="card p-4">
          <RefreshCw className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{Math.round(webhooks.filter((w) => w.successRate !== undefined).reduce((s, w) => s + (w.successRate || 0), 0) / webhooks.filter((w) => w.successRate !== undefined).length) || 0}%</p>
          <p className="text-xs text-[var(--sage-500)]">平均成功率</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-card text-xs font-medium transition-colors ${
              filter === f ? 'bg-[var(--sage-500)] text-white' : 'bg-[var(--sage-50)] text-[var(--sage-600)] hover:bg-[var(--sage-100)]'
            }`}
          >
            {f === 'all' ? '全部' : f === 'active' ? '启用' : '禁用'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((wh) => (
          <div key={wh.id} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                  <Webhook className="w-5 h-5 text-[var(--sage-500)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-[var(--sage-800)]">{wh.name}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${wh.isActive ? 'bg-green-500/10 text-green-600' : 'bg-[var(--sage-100)] text-[var(--sage-500)]'}`}>
                      {wh.isActive ? '启用' : '禁用'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--sage-500)] font-mono">{wh.url}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(wh.id)} className="p-1.5 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)]">
                  {wh.isActive ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </button>
                <button className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--sage-400)] hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {wh.events.map((ev) => (
                <span key={ev} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sage-100)] text-[var(--sage-500)]">{EVENT_LABELS[ev] || ev}</span>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--sage-400)]">
              <div className="flex items-center gap-2">
                <span>Secret:</span>
                <span className="font-mono">{showSecret[wh.id] ? wh.secret : maskSecret(wh.secret)}</span>
                <button onClick={() => setShowSecret({ ...showSecret, [wh.id]: !showSecret[wh.id] })} className="text-[var(--sage-400)]">
                  {showSecret[wh.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span>推送: {wh.totalDeliveries.toLocaleString()}</span>
                <span>成功率: {wh.successRate}%</span>
                {wh.lastTriggered && <span>上次: {wh.lastTriggered}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && !loading && (
        <div className="text-center text-sm text-[var(--sage-400)]">暂无数据</div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[450px] max-w-[90vw]">
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">新建 Webhook</h2>
            <div className="space-y-3">
              <input type="text" placeholder="名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
              <input type="text" placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="w-full px-3 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
              <input type="text" placeholder="事件 (逗号分隔)" value={form.events} onChange={(e) => setForm({ ...form, events: e.target.value })} className="w-full px-3 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
              <input type="text" placeholder="Secret (可选)" value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} className="w-full px-3 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSubmit} className="btn-primary flex-1">创建</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)' }}>取消</button>
            </div>
          </div>
        </div>
      )}
    </>
  )}
    </div>
  )
}
