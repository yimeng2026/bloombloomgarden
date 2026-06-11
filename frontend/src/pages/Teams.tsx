import { useState, useEffect } from 'react'
import {
  Users, Plus, Search, Play, Loader2, X, CheckCircle, XCircle, GitBranch
} from 'lucide-react'
import { fetchTeams, createTeam, executeTeam } from '@/api/client'

interface Team {
  id: string
  name: string
  framework: string
  collaborationMode: string
  status: 'active' | 'inactive' | 'running'
  description?: string
  memberCount?: number
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  active: { color: '#10b981', label: '活跃' },
  inactive: { color: '#6b7280', label: '停用' },
  running: { color: '#3b82f6', label: '运行中' },
}

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', framework: '', collaborationMode: 'hierarchical', description: '' })
  const [creating, setCreating] = useState(false)
  const [executingId, setExecutingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res: any = await fetchTeams()
        const data = res.data || res
        setTeams(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error('Failed to fetch teams:', e)
        setTeams([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = teams.filter((t) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      t.name.toLowerCase().includes(q) ||
      t.framework.toLowerCase().includes(q) ||
      t.collaborationMode.toLowerCase().includes(q)
    )
  })

  const activeCount = teams.filter((t) => t.status === 'active').length

  const handleCreate = async () => {
    if (!form.name.trim() || !form.framework.trim()) return
    try {
      setCreating(true)
      const res: any = await createTeam({
        name: form.name,
        framework: form.framework,
        collaborationMode: form.collaborationMode,
        description: form.description,
      })
      const newTeam = res.data || { id: `team-${Date.now()}`, ...form, status: 'active' }
      setTeams((prev) => [newTeam, ...prev])
      setShowModal(false)
      setForm({ name: '', framework: '', collaborationMode: 'hierarchical', description: '' })
    } catch (e) {
      console.error('Failed to create team:', e)
    } finally {
      setCreating(false)
    }
  }

  const handleExecute = async (id: string) => {
    try {
      setExecutingId(id)
      await executeTeam(id)
    } catch (e) {
      console.error('Failed to execute team:', e)
    } finally {
      setExecutingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">团队管理</h1>
            <p className="text-sm text-[var(--sage-500)]">
              {teams.length} 个团队 · {activeCount} 活跃
            </p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> 创建团队
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索团队..."
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
          <Users className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" />
          <p className="text-[var(--sage-500)]">暂无团队</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((team) => {
            const status = STATUS_CONFIG[team.status] || STATUS_CONFIG.inactive
            return (
              <div key={team.id} className="card p-4 transition-all hover:shadow-md">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                      <Users className="w-5 h-5 text-[var(--sage-500)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-[var(--sage-800)]">{team.name}</h3>
                      <span className="text-[10px] text-[var(--sage-500)]">
                        {typeof team.framework === 'string' ? team.framework : team.framework?.name || team.frameworkId || '未知框架'}
                      </span>
                    </div>
                  </div>
                  <span
                    className="text-[10px] px-2 py-1 rounded-full"
                    style={{ backgroundColor: status.color + '15', color: status.color }}
                  >
                    {status.label}
                  </span>
                </div>
                {team.description && (
                  <p className="text-xs text-[var(--sage-500)] mb-3 line-clamp-2">{team.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-[var(--sage-400)] mb-3">
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    {team.collaborationMode}
                  </span>
                  {team.memberCount !== undefined && <span>{team.memberCount} 成员</span>}
                </div>
                <button
                  onClick={() => handleExecute(team.id)}
                  disabled={executingId === team.id}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-card-sm text-xs font-medium transition-colors hover:bg-[var(--sage-100)] disabled:opacity-50"
                  style={{ backgroundColor: 'var(--sage-50)', color: 'var(--sage-600)' }}
                >
                  {executingId === team.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {executingId === team.id ? '执行中...' : '执行团队'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[400px] max-w-[90vw]">
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">创建团队</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="团队名称"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
              <input
                type="text"
                placeholder="框架"
                value={form.framework}
                onChange={(e) => setForm({ ...form, framework: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
              <select
                value={form.collaborationMode}
                onChange={(e) => setForm({ ...form, collaborationMode: e.target.value })}
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
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-card border text-sm resize-none"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreate}
                disabled={creating || !form.name.trim() || !form.framework.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                创建
              </button>
              <button
                onClick={() => setShowModal(false)}
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
