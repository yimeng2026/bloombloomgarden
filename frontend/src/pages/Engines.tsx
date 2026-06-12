import { useState, useEffect } from 'react'
import {
  Cpu, Plus, Search, Activity
} from 'lucide-react'
import { fetchEngines } from '@/api/client'

interface Engine {
  id: string
  brand: string
  model: string
  tier: string
  status: 'healthy' | 'unhealthy' | 'offline'
  healthScore: number
  description?: string
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  healthy: { color: '#10b981', label: '健康' },
  unhealthy: { color: '#f59e0b', label: '异常' },
  offline: { color: '#6b7280', label: '离线' },
}

export default function Engines() {
  const [engines, setEngines] = useState<Engine[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res: any = await fetchEngines()
        const data = res.data || res
        setEngines(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error('Failed to fetch engines:', e)
        setEngines([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = engines.filter((e) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      e.brand.toLowerCase().includes(q) ||
      e.model.toLowerCase().includes(q) ||
      e.tier.toLowerCase().includes(q)
    )
  })

  const healthyCount = engines.filter((e) => e.status === 'healthy').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cpu className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">引擎调度</h1>
            <p className="text-sm text-[var(--sage-500)]">
              {engines.length} 个引擎 · {healthyCount} 健康
            </p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> 新建引擎
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索引擎..."
          className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[var(--sage-500)] gap-2">
          <div className="w-5 h-5 border-2 border-[var(--sage-300)] border-t-[var(--sage-500)] rounded-full animate-spin" />
          <span>加载中...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Cpu className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" />
          <p className="text-[var(--sage-500)]">暂无引擎</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((engine) => {
            const status = STATUS_CONFIG[engine.status] || STATUS_CONFIG.offline
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
                  <span
                    className="text-[10px] px-2 py-1 rounded-full"
                    style={{ backgroundColor: status.color + '15', color: status.color }}
                  >
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
  )
}
