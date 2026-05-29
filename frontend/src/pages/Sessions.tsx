import { useState } from 'react'
import { MessageSquare, Clock, Trash2, Bot, Plus, Search, Filter, X } from 'lucide-react'

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

const MOCK_SESSIONS: Session[] = [
  { id: 'sess-1', name: '代码审查 PR#123', agentName: 'CodeReviewer', agentIcon: '🔍', messageCount: 45, tokenUsed: 12500, lastActivity: '2026-05-24 16:30', createdAt: '2026-05-24 10:00', status: 'active', tags: ['代码', '审查'] },
  { id: 'sess-2', name: 'API 文档生成', agentName: 'DocWriter', agentIcon: '📝', messageCount: 12, tokenUsed: 3400, lastActivity: '2026-05-24 14:00', createdAt: '2026-05-24 13:30', status: 'active', tags: ['文档', 'API'] },
  { id: 'sess-3', name: 'Q2 销售数据分析', agentName: 'DataAnalyst', agentIcon: '📊', messageCount: 89, tokenUsed: 28900, lastActivity: '2026-05-24 10:00', createdAt: '2026-05-24 08:00', status: 'closed', tags: ['数据', '分析'] },
  { id: 'sess-4', name: '生产环境故障排查', agentName: 'Debugger', agentIcon: '🐛', messageCount: 23, tokenUsed: 7800, lastActivity: '2026-05-23 18:00', createdAt: '2026-05-23 15:00', status: 'closed', tags: ['运维', '紧急'] },
  { id: 'sess-5', name: '产品需求讨论', agentName: 'ProductManager', agentIcon: '💡', messageCount: 56, tokenUsed: 15600, lastActivity: '2026-05-23 12:00', createdAt: '2026-05-23 09:00', status: 'archived', tags: ['产品', '需求'] },
  { id: 'sess-6', name: '前端性能优化', agentName: 'FrontendExpert', agentIcon: '⚡', messageCount: 34, tokenUsed: 11200, lastActivity: '2026-05-22 16:00', createdAt: '2026-05-22 14:00', status: 'archived', tags: ['前端', '性能'] },
]

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  active: { color: '#10b981', label: '活跃' },
  closed: { color: '#6b7a5a', label: '已关闭' },
  archived: { color: '#b5bda8', label: '已归档' },
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>(MOCK_SESSIONS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selected, setSelected] = useState<string | null>(null)

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
    </div>
  )
}
