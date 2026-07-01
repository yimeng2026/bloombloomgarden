import { useState, useEffect } from 'react'
import { Layers, Plus, Search, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { fetchFrameworks } from '@/api/client'

interface Framework {
  id: string
  name: string
  category: string
  protocolLevel: number
  status: 'active' | 'inactive' | 'deprecated'
  description?: string
  version?: string
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  active: { color: '#10b981', label: '活跃' },
  inactive: { color: '#6b7280', label: '停用' },
  deprecated: { color: '#ef4444', label: '弃用' },
}

export default function Frameworks() {
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res: any = await fetchFrameworks()
        const data = res.data || res
        setFrameworks(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error('Failed to fetch frameworks:', e)
        setFrameworks([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = frameworks.filter((f) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      f.name.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
    )
  })

  const activeCount = frameworks.filter((f) => f.status === 'active').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">框架市场</h1>
            <p className="text-sm text-[var(--sage-500)]">
              {frameworks.length} 个框架 · {activeCount} 活跃
            </p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> 新建框架
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索框架..."
          className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[var(--sage-500)] gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>加载中...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Layers className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" />
          <p className="text-[var(--sage-500)]">暂无框架</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((fw) => {
            const status = STATUS_CONFIG[fw.status] || STATUS_CONFIG.inactive
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
                  <span
                    className="text-[10px] px-2 py-1 rounded-full"
                    style={{ backgroundColor: status.color + '15', color: status.color }}
                  >
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
  )
}
