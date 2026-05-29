import { useState, useEffect } from 'react'
import {
  Plus, Trash2, Play, CheckCircle, Clock, AlertCircle, Search, Filter,
  BarChart3, TrendingUp, Pause, RotateCcw, Calendar, Bot, Layers,
  ChevronDown, ChevronRight, X, ArrowUpDown,
} from 'lucide-react'
import { fetchTasks, createTask, deleteTask } from '@/api/client'

interface Task {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
  priority: 'high' | 'medium' | 'low'
  agent_id?: string
  agent_name?: string
  progress: number
  created_at: string
  started_at?: string
  completed_at?: string
  estimated_duration?: string
  tags: string[]
}

const MOCK_TASKS: Task[] = [
  { id: 'task-1', name: '代码审查', description: '审查 frontend PR #123，检查代码质量和潜在问题', status: 'completed', priority: 'high', agent_id: 'agent-1', agent_name: 'Code Agent', progress: 100, created_at: '2026-05-24 10:00', started_at: '2026-05-24 10:00', completed_at: '2026-05-24 10:15', estimated_duration: '15分钟', tags: ['代码', '审查'] },
  { id: 'task-2', name: '数据备份', description: '每日数据库全量备份，上传到冷存储', status: 'running', priority: 'high', agent_id: 'agent-3', agent_name: 'Data Agent', progress: 72, created_at: '2026-05-24 14:00', started_at: '2026-05-24 14:00', estimated_duration: '30分钟', tags: ['备份', '数据库'] },
  { id: 'task-3', name: '文档生成', description: '根据最新 API 变更自动生成 OpenAPI 文档', status: 'pending', priority: 'medium', agent_id: 'agent-2', agent_name: 'Doc Agent', progress: 0, created_at: '2026-05-24 16:00', estimated_duration: '20分钟', tags: ['文档', 'API'] },
  { id: 'task-4', name: '测试运行', description: '运行单元测试和集成测试套件，生成报告', status: 'failed', priority: 'high', agent_id: 'agent-1', agent_name: 'Code Agent', progress: 45, created_at: '2026-05-24 09:00', started_at: '2026-05-24 09:00', completed_at: '2026-05-24 09:05', estimated_duration: '已中断', tags: ['测试'] },
  { id: 'task-5', name: '安全扫描', description: '扫描依赖漏洞和潜在安全风险', status: 'running', priority: 'high', agent_id: 'agent-4', agent_name: 'Sec Agent', progress: 35, created_at: '2026-05-25 08:00', started_at: '2026-05-25 08:00', estimated_duration: '1小时', tags: ['安全', '扫描'] },
  { id: 'task-6', name: '模型评估', description: '评估新微调模型的性能和准确性', status: 'pending', priority: 'medium', agent_id: 'agent-5', agent_name: 'ML Agent', progress: 0, created_at: '2026-05-25 10:00', estimated_duration: '2小时', tags: ['AI', '评估'] },
  { id: 'task-7', name: '索引重建', description: '重建知识库全文搜索索引', status: 'completed', priority: 'low', agent_id: 'agent-6', agent_name: 'KB Agent', progress: 100, created_at: '2026-05-23 02:00', started_at: '2026-05-23 02:00', completed_at: '2026-05-23 02:45', estimated_duration: '45分钟', tags: ['搜索', '索引'] },
  { id: 'task-8', name: '日志归档', description: '归档30天前的系统日志', status: 'paused', priority: 'low', agent_id: 'agent-7', agent_name: 'Ops Agent', progress: 60, created_at: '2026-05-22 03:00', started_at: '2026-05-22 03:00', estimated_duration: '已暂停', tags: ['运维', '日志'] },
]

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string; bg: string }> = {
  pending: { icon: Clock, color: '#f59e0b', label: '待处理', bg: '#fdf6e3' },
  running: { icon: Play, color: '#3b82f6', label: '运行中', bg: '#e8f0fe' },
  completed: { icon: CheckCircle, color: '#10b981', label: '已完成', bg: '#e8f5e9' },
  failed: { icon: AlertCircle, color: '#ef4444', label: '失败', bg: '#fce8e8' },
  paused: { icon: Pause, color: '#8b5cf6', label: '已暂停', bg: '#f3e8ff' },
}

const PRIORITY_CONFIG = {
  high: { color: '#ef4444', label: '高' },
  medium: { color: '#f59e0b', label: '中' },
  low: { color: '#10b981', label: '低' },
}

export default function TasksAndChat() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<{ name: string; description: string; agent_id: string; priority: Task['priority']; tags: string }>({ name: '', description: '', agent_id: '', priority: 'medium', tags: '' })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'created' | 'priority' | 'progress'>('created')
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchTasks()
        setTasks(res.data?.length > 0 ? res.data : MOCK_TASKS)
      } catch (e) {
        setTasks(MOCK_TASKS)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSubmit = () => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: form.name,
      description: form.description,
      status: 'pending',
      priority: form.priority,
      agent_id: form.agent_id || undefined,
      agent_name: form.agent_id ? `Agent-${form.agent_id}` : undefined,
      progress: 0,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    }
    setTasks([newTask, ...tasks])
    setShowModal(false)
    setForm({ name: '', description: '', agent_id: '', priority: 'medium', tags: '' })
  }

  const handleDelete = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id))
  }

  const toggleTaskStatus = (id: string) => {
    setTasks(tasks.map((t) => {
      if (t.id !== id) return t
      const flow = ['pending', 'running', 'completed']
      const idx = flow.indexOf(t.status)
      const next = idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : 'pending'
      return { ...t, status: next as Task['status'], progress: next === 'completed' ? 100 : next === 'running' ? 10 : 0 }
    }))
  }

  const filtered = tasks.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    return true
  }).sort((a, b) => {
    if (sortBy === 'priority') {
      const order = { high: 3, medium: 2, low: 1 }
      return order[b.priority] - order[a.priority]
    }
    if (sortBy === 'progress') return b.progress - a.progress
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const completedCount = tasks.filter((t) => t.status === 'completed').length
  const runningCount = tasks.filter((t) => t.status === 'running').length
  const failedCount = tasks.filter((t) => t.status === 'failed').length
  const pendingCount = tasks.filter((t) => t.status === 'pending').length
  const avgProgress = tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="flex items-center gap-3 text-[var(--sage-500)]">
          <div className="w-5 h-5 border-2 border-[var(--sage-300)] border-t-[var(--sage-500)] rounded-full animate-spin" />
          <span className="text-sm">加载任务...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">任务列表</h1>
            <p className="text-sm text-[var(--sage-500)]">{tasks.length} 个任务 · {runningCount} 进行中 · {completedCount} 已完成</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> 新建任务
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="card p-4">
          <Clock className="w-5 h-5 text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{pendingCount}</p>
          <p className="text-xs text-[var(--sage-500)]">待处理</p>
        </div>
        <div className="card p-4">
          <Play className="w-5 h-5 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{runningCount}</p>
          <p className="text-xs text-[var(--sage-500)]">进行中</p>
        </div>
        <div className="card p-4">
          <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{completedCount}</p>
          <p className="text-xs text-[var(--sage-500)]">已完成</p>
        </div>
        <div className="card p-4">
          <AlertCircle className="w-5 h-5 text-red-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{failedCount}</p>
          <p className="text-xs text-[var(--sage-500)]">失败</p>
        </div>
        <div className="card p-4">
          <TrendingUp className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{avgProgress}%</p>
          <p className="text-xs text-[var(--sage-500)]">平均进度</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索任务..."
            className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-card border text-sm"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
        >
          <option value="all">全部状态</option>
          <option value="pending">待处理</option>
          <option value="running">进行中</option>
          <option value="completed">已完成</option>
          <option value="failed">失败</option>
          <option value="paused">已暂停</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2.5 rounded-card border text-sm"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
        >
          <option value="all">全部优先级</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2.5 rounded-card border text-sm"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
        >
          <option value="created">按创建时间</option>
          <option value="priority">按优先级</option>
          <option value="progress">按进度</option>
        </select>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filtered.map((task) => {
          const config = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending
          const StatusIcon = config.icon
          const priority = PRIORITY_CONFIG[task.priority]
          const isExpanded = expandedTask === task.id
          return (
            <div key={task.id} className="card overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => toggleTaskStatus(task.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0"
                      style={{ backgroundColor: config.color + '15' }}
                    >
                      <StatusIcon className="w-4 h-4" style={{ color: config.color }} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm text-[var(--sage-800)]">{task.name}</h3>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: priority.color + '15', color: priority.color }}>
                          {priority.label}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: config.bg, color: config.color }}>
                          {config.label}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--sage-500)] mt-0.5">{task.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--sage-400)]">
                        {task.agent_name && (
                          <span className="flex items-center gap-1">
                            <Bot className="w-3 h-3" />
                            {task.agent_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {task.created_at}
                        </span>
                        <span>预计: {task.estimated_duration}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                      className="p-1 text-[var(--sage-400)] hover:text-[var(--sage-600)]"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(task.id)} className="p-1 text-[var(--sage-400)] hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress */}
                {task.status === 'running' && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-[var(--sage-400)] mb-1">
                      <span>进度</span>
                      <span>{task.progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--sage-100)]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${task.progress}%`, backgroundColor: config.color }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: 'var(--sage-100)' }}>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[var(--sage-400)]">ID</span>
                      <p className="font-mono text-[var(--sage-600)]">{task.id}</p>
                    </div>
                    <div>
                      <span className="text-[var(--sage-400)]">Agent</span>
                      <p className="text-[var(--sage-600)]">{task.agent_name || '未分配'}</p>
                    </div>
                    <div>
                      <span className="text-[var(--sage-400)]">Agent ID</span>
                      <p className="font-mono text-[var(--sage-600)]">{task.agent_id || '-'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[var(--sage-400)]">开始时间</span>
                      <p className="text-[var(--sage-600)]">{task.started_at || '-'}</p>
                    </div>
                    <div>
                      <span className="text-[var(--sage-400)]">完成时间</span>
                      <p className="text-[var(--sage-600)]">{task.completed_at || '-'}</p>
                    </div>
                    <div>
                      <span className="text-[var(--sage-400)]">预计时长</span>
                      <p className="text-[var(--sage-600)]">{task.estimated_duration}</p>
                    </div>
                  </div>
                  {task.tags.length > 0 && (
                    <div className="flex items-center gap-1 pt-1">
                      <span className="text-[10px] text-[var(--sage-400)]">标签:</span>
                      {task.tags.map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sage-100)] text-[var(--sage-500)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="card p-8 text-center text-sm text-[var(--sage-400)]">
            没有匹配的任务
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[450px] max-w-[90vw]">
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">新建任务</h2>
            <div className="space-y-3">
              <input
                type="text" placeholder="任务名称"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
              <input
                type="text" placeholder="任务描述"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as Task['priority'] })}
                  className="px-3 py-2 rounded-card border text-sm"
                  style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                >
                  <option value="high">高优先级</option>
                  <option value="medium">中优先级</option>
                  <option value="low">低优先级</option>
                </select>
                <input
                  type="text" placeholder="Agent ID (可选)"
                  value={form.agent_id} onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
                  className="px-3 py-2 rounded-card border text-sm"
                  style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                />
              </div>
              <input
                type="text" placeholder="标签 (逗号分隔)"
                value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSubmit} disabled={!form.name} className="btn-primary flex-1 disabled:opacity-50">创建</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)' }}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
