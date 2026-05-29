import { useState } from 'react'
import { Clock, Plus, Play, Trash2, Edit2, History, Terminal, Pause, Calendar, Repeat, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface ScheduledTask {
  id: string
  name: string
  description: string
  cron: string
  command: string
  isActive: boolean
  lastRun?: string
  nextRun?: string
  status: 'idle' | 'running' | 'failed' | 'success'
  runCount: number
  failCount: number
  tags: string[]
  timeout: number
}

const MOCK_TASKS: ScheduledTask[] = [
  { id: 'sch-1', name: '每日全量备份', description: '数据库全量备份并上传至冷存储', cron: '0 2 * * *', command: 'backup_db.sh --full', isActive: true, lastRun: '2026-05-24 02:00', nextRun: '2026-05-25 02:00', status: 'success', runCount: 45, failCount: 0, tags: ['备份', '数据库'], timeout: 3600 },
  { id: 'sch-2', name: '日志清理', description: '清理30天前的系统日志和临时文件', cron: '0 3 * * 0', command: 'cleanup_logs.sh --retention=30', isActive: true, lastRun: '2026-05-18 03:00', nextRun: '2026-05-25 03:00', status: 'success', runCount: 12, failCount: 0, tags: ['清理', '维护'], timeout: 600 },
  { id: 'sch-3', name: '健康检查', description: '检查所有服务健康状态并生成报告', cron: '*/15 * * * *', command: 'health_check.py --all', isActive: true, lastRun: '2026-05-24 16:00', nextRun: '2026-05-24 16:15', status: 'success', runCount: 1248, failCount: 3, tags: ['监控', '健康'], timeout: 60 },
  { id: 'sch-4', name: '周报生成', description: '汇总本周数据生成周报并发送邮件', cron: '0 9 * * 1', command: 'generate_weekly_report.py --email', isActive: false, lastRun: '2026-05-19 09:00', nextRun: '2026-05-26 09:00', status: 'idle', runCount: 8, failCount: 1, tags: ['报告', '邮件'], timeout: 300 },
  { id: 'sch-5', name: '模型同步', description: '从 Ollama 模型仓库同步最新版本', cron: '0 4 * * *', command: 'sync_models.sh --provider=ollama', isActive: true, lastRun: '2026-05-24 04:00', nextRun: '2026-05-25 04:00', status: 'failed', runCount: 23, failCount: 2, tags: ['AI', '同步'], timeout: 1800 },
  { id: 'sch-6', name: '索引重建', description: '重建知识库全文搜索索引', cron: '0 1 * * 6', command: 'rebuild_index.py --full', isActive: true, lastRun: '2026-05-17 01:00', nextRun: '2026-05-24 01:00', status: 'success', runCount: 6, failCount: 0, tags: ['搜索', '索引'], timeout: 1200 },
]

function isValidCron(cron: string): boolean {
  const parts = cron.trim().split(/\s+/)
  return parts.length === 5 || parts.length === 6
}

function getCronDescription(cron: string): string {
  if (cron === '0 2 * * *') return '每天 02:00'
  if (cron === '0 3 * * 0') return '每周日 03:00'
  if (cron === '*/15 * * * *') return '每15分钟'
  if (cron === '0 9 * * 1') return '每周一 09:00'
  if (cron === '0 4 * * *') return '每天 04:00'
  if (cron === '0 1 * * 6') return '每周六 01:00'
  return cron
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  idle: { icon: Clock, color: '#b5bda8', label: '空闲' },
  running: { icon: Play, color: '#3b82f6', label: '运行中' },
  failed: { icon: XCircle, color: '#ef4444', label: '失败' },
  success: { icon: CheckCircle, color: '#10b981', label: '成功' },
}

export default function SchedulerPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>(MOCK_TASKS)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', cron: '', command: '', tags: '' })
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const toggleActive = (id: string) => {
    setTasks(tasks.map((t) => t.id === id ? { ...t, isActive: !t.isActive } : t))
  }

  const handleSubmit = () => {
    const newTask: ScheduledTask = {
      id: `sch-${Date.now()}`,
      name: form.name,
      description: form.description,
      cron: form.cron,
      command: form.command,
      isActive: true,
      status: 'idle',
      runCount: 0,
      failCount: 0,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      timeout: 300,
    }
    setTasks([...tasks, newTask])
    setShowModal(false)
    setForm({ name: '', description: '', cron: '', command: '', tags: '' })
  }

  const filtered = tasks.filter((t) => {
    if (filter === 'active') return t.isActive
    if (filter === 'inactive') return !t.isActive
    return true
  })

  const activeCount = tasks.filter((t) => t.isActive).length
  const totalRuns = tasks.reduce((s, t) => s + t.runCount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">调度器</h1>
            <p className="text-sm text-[var(--sage-500)]">{tasks.length} 个定时任务 · {activeCount} 启用 · 累计运行 {totalRuns} 次</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> 新建任务
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{activeCount}</p>
          <p className="text-xs text-[var(--sage-500)]">启用任务</p>
        </div>
        <div className="card p-4">
          <XCircle className="w-5 h-5 text-[var(--sage-400)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{tasks.filter((t) => !t.isActive).length}</p>
          <p className="text-xs text-[var(--sage-500)]">禁用任务</p>
        </div>
        <div className="card p-4">
          <AlertTriangle className="w-5 h-5 text-red-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{tasks.filter((t) => t.status === 'failed').length}</p>
          <p className="text-xs text-[var(--sage-500)]">失败任务</p>
        </div>
        <div className="card p-4">
          <Repeat className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{totalRuns}</p>
          <p className="text-xs text-[var(--sage-500)]">总执行次数</p>
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

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--sage-50)] text-[var(--sage-600)]">
            <tr>
              <th className="text-left px-4 py-3 font-medium">任务</th>
              <th className="text-left px-4 py-3 font-medium">调度</th>
              <th className="text-left px-4 py-3 font-medium">状态</th>
              <th className="text-left px-4 py-3 font-medium">执行</th>
              <th className="text-left px-4 py-3 font-medium">下次运行</th>
              <th className="text-left px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => {
              const status = STATUS_CONFIG[task.status]
              const StatusIcon = status.icon
              return (
                <tr key={task.id} className="border-t" style={{ borderColor: 'var(--sage-100)' }}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--sage-800)]">{task.name}</div>
                    <div className="text-xs text-[var(--sage-500)]">{task.description}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {task.tags.map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sage-100)] text-[var(--sage-500)]">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-[var(--sage-500)]">{task.cron}</div>
                    <div className="text-[10px] text-[var(--sage-400)]">{getCronDescription(task.cron)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(task.id)}
                      className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                        task.isActive
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-[var(--sage-100)] text-[var(--sage-500)]'
                      }`}
                    >
                      {task.isActive ? <CheckCircle className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      {task.isActive ? '启用' : '禁用'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--sage-500)]">
                    <div className="flex items-center gap-1">
                      <StatusIcon className="w-3 h-3" style={{ color: status.color }} />
                      <span style={{ color: status.color }}>{status.label}</span>
                    </div>
                    <div className="text-[10px] text-[var(--sage-400)] mt-0.5">
                      {task.runCount} 次 · {task.failCount} 失败
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--sage-400)]">{task.nextRun || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button className="p-1 text-[var(--sage-400)] hover:text-[var(--sage-600)]">
                        <Play className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-[var(--sage-400)] hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[450px] max-w-[90vw]">
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">新建定时任务</h2>
            <div className="space-y-3">
              <input type="text" placeholder="任务名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
              <input type="text" placeholder="任务描述" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
              <input type="text" placeholder="Cron 表达式 (如 0 2 * * *)" value={form.cron} onChange={(e) => setForm({ ...form, cron: e.target.value })} className="w-full px-3 py-2 rounded-card border text-sm font-mono" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
              {form.cron && !isValidCron(form.cron) && (
                <p className="text-xs text-red-500">Cron 格式错误，应为 5 或 6 个字段</p>
              )}
              <input type="text" placeholder="执行命令" value={form.command} onChange={(e) => setForm({ ...form, command: e.target.value })} className="w-full px-3 py-2 rounded-card border text-sm font-mono" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
              <input type="text" placeholder="标签 (逗号分隔)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="w-full px-3 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSubmit} disabled={!form.name || !form.cron || !isValidCron(form.cron)} className="btn-primary flex-1 disabled:opacity-50">创建</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)' }}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
