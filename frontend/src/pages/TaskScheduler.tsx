import { useState, useEffect } from 'react'

interface ScheduledTask {
  id: string
  name: string
  cron: string
  command: string
  enabled: boolean
  lastRun?: string
  nextRun?: string
}

export default function TaskScheduler() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newTask, setNewTask] = useState({ name: '', cron: '', command: '' })

  const API_BASE = '/api'

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(API_BASE + '/scheduler/tasks')
      const json = await res.json()
      setTasks(json.data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function create() {
    try {
      const res = await fetch(API_BASE + '/scheduler/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      })
      const json = await res.json()
      if (json.success) {
        setTasks((prev) => [...prev, json.data])
        setShowAdd(false)
        setNewTask({ name: '', cron: '', command: '' })
      }
    } catch (e: any) { setError(e.message) }
  }

  async function deleteTask(id: string) {
    if (!confirm('删除此调度任务?')) return
    try {
      await fetch(API_BASE + `/scheduler/tasks/${id}`, { method: 'DELETE' })
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (e: any) { setError(e.message) }
  }

  async function runTask(id: string) {
    try {
      await fetch(API_BASE + `/scheduler/tasks/${id}/run`, { method: 'POST' })
      alert('任务已触发执行')
    } catch (e: any) { setError(e.message) }
  }

  async function pauseTask(id: string) {
    try {
      await fetch(API_BASE + `/scheduler/tasks/${id}/pause`, { method: 'POST' })
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, enabled: false } : t))
    } catch (e: any) { setError(e.message) }
  }

  async function resumeTask(id: string) {
    try {
      await fetch(API_BASE + `/scheduler/tasks/${id}/resume`, { method: 'POST' })
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, enabled: true } : t))
    } catch (e: any) { setError(e.message) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--sage-800)]">任务调度器</h1>
          <p className="text-sm text-[var(--sage-500)] mt-1">管理定时任务和调度计划</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-[var(--sage-600)] text-white rounded-lg hover:bg-[var(--sage-700)] text-sm font-medium">+ 添加任务</button>
          <button onClick={load} className="text-sm text-[var(--sage-600)] hover:text-[var(--sage-800)]">🔄</button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{error}</div>}

      {showAdd && (
        <div className="bg-white rounded-xl border border-[var(--sage-200)] p-5 shadow-sm mb-6">
          <h3 className="font-semibold text-[var(--sage-800)] mb-3">新建调度任务</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input value={newTask.name} onChange={(e) => setNewTask({ ...newTask, name: e.target.value })} className="px-3 py-2 border border-[var(--sage-300)] rounded-lg" placeholder="任务名称" />
            <input value={newTask.cron} onChange={(e) => setNewTask({ ...newTask, cron: e.target.value })} className="px-3 py-2 border border-[var(--sage-300)] rounded-lg" placeholder="Cron表达式 (如: 0 9 * * *)" />
            <input value={newTask.command} onChange={(e) => setNewTask({ ...newTask, command: e.target.value })} className="px-3 py-2 border border-[var(--sage-300)] rounded-lg" placeholder="执行命令" />
          </div>
          <div className="flex gap-2">
            <button onClick={create} className="px-4 py-2 bg-[var(--sage-600)] text-white rounded-lg text-sm">保存</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-[var(--sage-300)] text-[var(--sage-600)] rounded-lg text-sm">取消</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-[var(--sage-500)]">加载中...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-[var(--sage-400)]">暂无调度任务</div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--sage-200)] overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-[var(--sage-50)] border-b border-[var(--sage-200)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--sage-700)]">名称</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--sage-700)]">Cron</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--sage-700)]">命令</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--sage-700)]">状态</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--sage-700)]">操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b border-[var(--sage-100)] hover:bg-[var(--sage-50)]">
                  <td className="px-4 py-3 font-medium text-[var(--sage-800)]">{t.name}</td>
                  <td className="px-4 py-3 text-[var(--sage-600)] font-mono text-xs">{t.cron}</td>
                  <td className="px-4 py-3 text-[var(--sage-600)] text-xs max-w-[200px] truncate">{t.command}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${t.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                      {t.enabled ? '启用' : '暂停'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => runTask(t.id)} className="text-[var(--sage-600)] hover:text-[var(--sage-800)] text-xs mr-2">执行</button>
                    {t.enabled ? (
                      <button onClick={() => pauseTask(t.id)} className="text-yellow-600 hover:text-yellow-800 text-xs mr-2">暂停</button>
                    ) : (
                      <button onClick={() => resumeTask(t.id)} className="text-green-600 hover:text-green-800 text-xs mr-2">恢复</button>
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
