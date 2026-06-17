import { useState, useEffect } from 'react'
import { MessageSquare, Clock, Trash2, Bot, Plus, Search, Filter, X, AlertTriangle } from 'lucide-react'
import { fetchAuthSessions } from '@/api/client'

interface Session {
  id: string
  name: string
  agentName: string
  agentIcon: string
  messageCount: number
  tokenUsed: number
  lastActivity: string
  createdAt: string
  status: 'active' | 'closed' | 'archived'
  tags: string[]
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  active: { color: '#10b981', label: '活跃' },
  closed: { color: '#6b7a5a', label: '已关闭' },
  archived: { color: '#b5bda8', label: '已归档' },
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchAuthSessions()
      .then((data: any) => {
        if (!cancelled) {
          const list = (data?.data || []).map((s: any) => ({
            id: s.id || 'unknown',
            name: s.name || s.sessionName || `会话 ${(s.id || '').slice(-4)}`,
            agentName: s.agentName || s.agent?.name || 'System',
            agentIcon: s.agentIcon || '🤖',
            messageCount: s.messageCount || s.messages || 0,
            tokenUsed: s.tokenUsed || s.tokens || 0,
            lastActivity: s.lastActivity || s.lastLogin || s.updatedAt || '-',
            createdAt: s.createdAt || s.created_at || '-',
            status: s.status || 'active',
            tags: s.tags || [],
          }))
          setSessions(list)
        }
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || '加载会话列表失败')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = sessions.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.agentName.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    return true
  })

  const handleDelete = (id: string) => {
    setSessions(sessions.filter((s) => s.id !== id))
  }

  const activeCount = sessions.filter((s) => s.status === 'active').length
  const totalTokens = sessions.reduce((sum, s) => sum + s.tokenUsed, 0)

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
            <span className="text-sm">加载会话列表...</span>
          </div>
        </div>
      ) : (
        <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">会话管理</h1>
            <p className="text-sm text-[var(--sage-500)]">{sessions.length} 个会话 · {activeCount} 活跃 · 总计 {(totalTokens / 1000).toFixed(1)}K tokens</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input type="text" placeholder="搜索会话..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-2.5 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}>
          <option value="all">全部状态</option>
          <option value="active">活跃</option>
          <option value="closed">已关闭</option>
          <option value="archived">已归档</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--sage-50)] text-[var(--sage-600)]">
            <tr>
              <th className="text-left px-4 py-3 font-medium">会话</th>
              <th className="text-left px-4 py-3 font-medium">Agent</th>
              <th className="text-left px-4 py-3 font-medium">消息</th>
              <th className="text-left px-4 py-3 font-medium">Tokens</th>
              <th className="text-left px-4 py-3 font-medium">最后活动</th>
              <th className="text-left px-4 py-3 font-medium">状态</th>
              <th className="text-left px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sess) => {
              const status = STATUS_CONFIG[sess.status]
              return (
                <tr key={sess.id} className="border-t" style={{ borderColor: 'var(--sage-100)' }}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--sage-800)]">{sess.name}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sess.tags.map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sage-100)] text-[var(--sage-500)]">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--sage-500)]">
                    <span className="mr-1">{sess.agentIcon}</span>
                    {sess.agentName}
                  </td>
                  <td className="px-4 py-3 text-[var(--sage-500)]">{sess.messageCount}</td>
                  <td className="px-4 py-3 text-[var(--sage-500)] font-mono text-xs">{(sess.tokenUsed / 1000).toFixed(1)}K</td>
                  <td className="px-4 py-3 text-[var(--sage-400)] text-xs">{sess.lastActivity}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: status.color + '15', color: status.color }}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(sess.id)} className="p-1 text-[var(--sage-400)] hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && !loading && (
        <div className="text-center text-sm text-[var(--sage-400)]">暂无数据</div>
      )}
        </>
      )}
    </div>
  )
}
