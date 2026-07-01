import { useState, useEffect } from 'react'
import { fetchPlatforms, createPlatform, deletePlatform } from '@/api/client'
import { Globe, Plus, Power, Trash2, Settings, CheckCircle, XCircle, MessageSquare, Edit2, Eye, AlertTriangle } from 'lucide-react'

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

const TYPE_COLORS: Record<string, string> = {
  kimi: '#c97b84',
  claude: '#d4a373',
  ollama: '#6b7a5a',
  openai: '#7fa3b0',
  deepseek: '#a78b9a',
  gemini: '#7fb89f',
}

export default function Platforms() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'kimi', url: '' })
  const [filter, setFilter] = useState<'all' | 'connected' | 'disconnected'>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPlatforms()
      .then((data: any) => {
        if (!cancelled) setPlatforms(data?.data || [])
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || '加载平台列表失败')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const toggleStatus = (id: string) => {
    setPlatforms(platforms.map((p) => {
      if (p.id !== id) return p
      const next = p.status === 'connected' ? 'disconnected' : 'connected'
      return { ...p, status: next }
    }))
  }

  const handleSubmit = () => {
    const newPlatform: Platform = {
      id: `pl-${Date.now()}`,
      name: form.name,
      type: form.type,
      url: form.url,
      status: 'disconnected',
      models: [],
      createdAt: new Date().toISOString().split('T')[0],
      lastCheck: '从未',
      requestCount: 0,
      avgLatency: 0,
    }
    setPlatforms([...platforms, newPlatform])
    setShowModal(false)
    setForm({ name: '', type: 'kimi', url: '' })
  }

  const filtered = platforms.filter((p) => {
    if (filter === 'connected') return p.status === 'connected'
    if (filter === 'disconnected') return p.status !== 'connected'
    return true
  })

  const connectedCount = platforms.filter((p) => p.status === 'connected').length
  const totalRequests = platforms.reduce((s, p) => s + p.requestCount, 0)

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
            <span className="text-sm">加载平台列表...</span>
          </div>
        </div>
      ) : (
        <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">平台列表</h1>
            <p className="text-sm text-[var(--sage-500)]">{platforms.length} 个平台 · {connectedCount} 在线 · 累计 {totalRequests.toLocaleString()} 次请求</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> 新建平台
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{connectedCount}</p>
          <p className="text-xs text-[var(--sage-500)]">在线平台</p>
        </div>
        <div className="card p-4">
          <XCircle className="w-5 h-5 text-[var(--sage-400)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{platforms.filter((p) => p.status !== 'connected').length}</p>
          <p className="text-xs text-[var(--sage-500)]">离线平台</p>
        </div>
        <div className="card p-4">
          <MessageSquare className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{totalRequests.toLocaleString()}</p>
          <p className="text-xs text-[var(--sage-500)]">累计请求</p>
        </div>
        <div className="card p-4">
          <Eye className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{Math.round(platforms.filter((p) => p.status === 'connected').reduce((s, p) => s + p.avgLatency, 0) / connectedCount) || 0}ms</p>
          <p className="text-xs text-[var(--sage-500)]">平均延迟</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(['all', 'connected', 'disconnected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-card text-xs font-medium transition-colors ${
              filter === f ? 'bg-[var(--sage-500)] text-white' : 'bg-[var(--sage-50)] text-[var(--sage-600)] hover:bg-[var(--sage-100)]'
            }`}
          >
            {f === 'all' ? '全部' : f === 'connected' ? '在线' : '离线'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((pl) => (
          <div key={pl.id} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: (TYPE_COLORS[pl.type] || '#6b7a5a') + '15' }}>
                  <Globe className="w-5 h-5" style={{ color: TYPE_COLORS[pl.type] || '#6b7a5a' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-[var(--sage-800)]">{pl.name}</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--sage-100)] text-[var(--sage-500)]">{pl.type}</span>
                  </div>
                  <p className="text-xs text-[var(--sage-500)] font-mono">{pl.url}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleStatus(pl.id)} className="text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  {pl.status === 'connected' ? (
                    <span className="bg-green-500/10 text-green-600 flex items-center gap-1 px-2 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" /> 在线
                    </span>
                  ) : pl.status === 'error' ? (
                    <span className="bg-red-500/10 text-red-600 flex items-center gap-1 px-2 py-1 rounded-full">
                      <XCircle className="w-3 h-3" /> 错误
                    </span>
                  ) : (
                    <span className="bg-[var(--sage-100)] text-[var(--sage-500)] flex items-center gap-1 px-2 py-1 rounded-full">
                      <XCircle className="w-3 h-3" /> 离线
                    </span>
                  )}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {pl.models.map((m) => (
                <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sage-100)] text-[var(--sage-500)]">{m}</span>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--sage-400)]">
              <span>请求: {pl.requestCount.toLocaleString()}</span>
              <span>延迟: {pl.avgLatency}ms</span>
              <span>上次检查: {pl.lastCheck}</span>
              <span>创建: {pl.createdAt}</span>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && !loading && (
        <div className="text-center text-sm text-[var(--sage-400)]">暂无数据</div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[400px] max-w-[90vw]">
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">新建平台</h2>
            <div className="space-y-3">
              <input type="text" placeholder="平台名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}>
                <option value="kimi">Kimi</option>
                <option value="claude">Claude</option>
                <option value="ollama">Ollama</option>
                <option value="openai">OpenAI</option>
                <option value="deepseek">DeepSeek</option>
                <option value="gemini">Gemini</option>
              </select>
              <input type="text" placeholder="API URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="w-full px-3 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
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
