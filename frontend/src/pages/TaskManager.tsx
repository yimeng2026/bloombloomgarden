import { useState, useEffect } from 'react'

interface TaskItem {
  id: string
  taskNum: string
  name: string
  status: 'active' | 'completed' | 'pending' | 'failed' | 'cancelled'
  agentId: string
  agentName: string
  createdAt: string
  completedAt?: string
}

export default function TaskManager() {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'pending' | 'failed'>('all')

  const API_BASE = '/api'

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(API_BASE + '/tasks')
      const json = await res.json()
      setTasks(json.data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteTask(id: string) {
    if (!confirm('删除此任务?')) return
    try {
      await fetch(API_BASE + `/tasks/${id}`, { method: 'DELETE' })
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function cancelTask(id: string) {
    try {
      await fetch(API_BASE + `/tasks/${id}/cancel`, { method: 'POST' })
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: 'cancelled' as const } : t))
    } catch (e: any) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter)

  const statusBadge = (s: TaskItem['status']) => {
    const map = {
      active: { bg: 'bg-blue-50', text: 'text-blue-700', label: '进行中' },
      completed: { bg: 'bg-green-50', text: 'text-green-700', label: '已完成' },
      pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: '待处理' },
      failed: { bg: 'bg-red-50', text: 'text-red-700', label: '失败' },
      cancelled: { bg: 'bg-gray-50', text: 'text-gray-700', label: '已取消' },
    }
    const c = map[s]
    return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>
  }

  const counts = {
    all: tasks.length,
    active: tasks.filter((t) => t.status === 'active').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--sage-800)]">任务管理</h1>
          <p className="text-sm text-[var(--sage-500)] mt-1">查看和管理所有任务</p>
        </div>
        <button onClick={load} className="text-sm text-[var(--sage-600)] hover:text-[var(--sage-800)]">🔄 刷新</button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{error}</div>}

      {/* 统计 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {(['all', 'active', 'completed', 'pending', 'failed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-lg text-sm font-medium text-center transition-colors ${filter === f ? 'bg-[var(--sage-600)] text-white' : 'bg-white text-[var(--sage-600)] border border-[var(--sage-300)] hover:bg-[var(--sage-50)]'}`}
          >
            <div className="text-xs opacity-70">{f === 'all' ? '全部' : f === 'active' ? '进行中' : f === 'completed' ? '已完成' : f === 'pending' ? '待处理' : '失败'}</div>
            <div className="text-lg font-bold">{counts[f]}</div>
          </button>
        ))}
      </div>

      {/* 任务列表 */}
      {loading ? (
        <div className="text-center py-12 text-[var(--sage-500)]">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--sage-400)]">暂无任务</div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--sage-200)] overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-[var(--sage-50)] border-b border-[var(--sage-200)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--sage-700)]">任务</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--sage-700)]">状态</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--sage-700)]">Agent</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--sage-700)]">创建时间</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--sage-700)]">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-[var(--sage-100)] hover:bg-[var(--sage-50)]">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--sage-800)]">{t.name}</div>
                    <div className="text-xs text-[var(--sage-500)]">{t.taskNum}</div>
                  </td>
                  <td className="px-4 py-3">{statusBadge(t.status)}</td>
                  <td className="px-4 py-3 text-[var(--sage-600)]">{t.agentName}</td>
                  <td className="px-4 py-3 text-[var(--sage-500)] text-xs">{new Date(t.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    {t.status === 'active' && (
                      <button onClick={() => cancelTask(t.id)} className="text-yellow-600 hover:text-yellow-800 text-xs mr-2">取消</button>
                    )}
                    <button onClick={() => deleteTask(t.id)} className="text-red-500 hover:text-red-700 text-xs">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
