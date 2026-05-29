import { useState } from 'react'
import {
  Users, GitBranch, Layers, ArrowRightLeft, Activity, Play, Pause, CheckCircle,
  Plus, Trash2, Search, Filter, Clock, TrendingUp, AlertTriangle, RefreshCw,
  ChevronRight, Bot, Zap, Shield, BarChart3,
} from 'lucide-react'

interface Task {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  assignee: string
  assigneeAvatar: string
  priority: 'high' | 'medium' | 'low'
  progress: number
  createdAt: string
  estimatedTime: string
  tags: string[]
}

interface TopologyNode {
  id: string
  name: string
  type: 'agent' | 'group' | 'hub'
  status: 'active' | 'idle' | 'error'
  connections: string[]
  load: number
}

interface SyncLog {
  id: string
  time: string
  source: string
  target: string
  action: string
  status: 'success' | 'failed' | 'pending'
  size: number
}

const MOCK_TASKS: Task[] = [
  { id: 't-1', name: '代码审查', description: '审查新提交的 PR，检查代码质量和安全漏洞', status: 'running', assignee: 'Code Agent', assigneeAvatar: '💻', priority: 'high', progress: 65, createdAt: '2026-05-25 10:00', estimatedTime: '30分钟', tags: ['代码', '审查'] },
  { id: 't-2', name: '文档生成', description: '根据 API 变更自动生成 OpenAPI 文档', status: 'pending', assignee: 'Doc Agent', assigneeAvatar: '📄', priority: 'medium', progress: 0, createdAt: '2026-05-25 11:00', estimatedTime: '15分钟', tags: ['文档', 'API'] },
  { id: 't-3', name: '测试执行', description: '运行单元测试和集成测试套件', status: 'completed', assignee: 'Test Agent', assigneeAvatar: '🧪', priority: 'low', progress: 100, createdAt: '2026-05-25 09:00', estimatedTime: '已完成', tags: ['测试'] },
  { id: 't-4', name: '数据清洗', description: '清洗用户上传的数据集，标准化格式', status: 'running', assignee: 'Data Agent', assigneeAvatar: '📊', priority: 'high', progress: 40, createdAt: '2026-05-25 12:00', estimatedTime: '45分钟', tags: ['数据'] },
  { id: 't-5', name: '安全扫描', description: '扫描依赖漏洞和潜在安全风险', status: 'failed', assignee: 'Sec Agent', assigneeAvatar: '🔒', priority: 'high', progress: 80, createdAt: '2026-05-25 08:00', estimatedTime: '已中断', tags: ['安全', '扫描'] },
  { id: 't-6', name: '模型评估', description: '评估新微调模型的性能和准确性', status: 'pending', assignee: 'ML Agent', assigneeAvatar: '🤖', priority: 'medium', progress: 0, createdAt: '2026-05-25 13:00', estimatedTime: '2小时', tags: ['AI', '评估'] },
  { id: 't-7', name: '日志分析', description: '分析过去24小时的系统日志，生成异常报告', status: 'completed', assignee: 'Ops Agent', assigneeAvatar: '⚙️', priority: 'low', progress: 100, createdAt: '2026-05-24 22:00', estimatedTime: '已完成', tags: ['运维'] },
  { id: 't-8', name: '知识库更新', description: '同步外部文档到知识库索引', status: 'running', assignee: 'KB Agent', assigneeAvatar: '📚', priority: 'medium', progress: 25, createdAt: '2026-05-25 11:30', estimatedTime: '1小时', tags: ['知识库'] },
]

const TOPOLOGY_NODES: TopologyNode[] = [
  { id: 'n-1', name: '协调器', type: 'hub', status: 'active', connections: ['n-2', 'n-3', 'n-4'], load: 45 },
  { id: 'n-2', name: '代码组', type: 'group', status: 'active', connections: ['n-5', 'n-6'], load: 78 },
  { id: 'n-3', name: '数据组', type: 'group', status: 'active', connections: ['n-7'], load: 32 },
  { id: 'n-4', name: '运维组', type: 'group', status: 'idle', connections: ['n-8'], load: 12 },
  { id: 'n-5', name: 'Code Agent', type: 'agent', status: 'active', connections: [], load: 65 },
  { id: 'n-6', name: 'Test Agent', type: 'agent', status: 'active', connections: [], load: 90 },
  { id: 'n-7', name: 'Data Agent', type: 'agent', status: 'active', connections: [], load: 40 },
  { id: 'n-8', name: 'Ops Agent', type: 'agent', status: 'idle', connections: [], load: 5 },
]

const SYNC_LOGS: SyncLog[] = [
  { id: 's-1', time: '13:30:45', source: 'Code Agent', target: '协调器', action: '推送状态', status: 'success', size: 2456 },
  { id: 's-2', time: '13:30:42', source: '协调器', target: 'Data Agent', action: '分发任务', status: 'success', size: 890 },
  { id: 's-3', time: '13:30:38', source: 'Test Agent', target: '协调器', action: '上报结果', status: 'success', size: 12340 },
  { id: 's-4', time: '13:30:35', source: '协调器', target: 'Ops Agent', action: '同步配置', status: 'failed', size: 0 },
  { id: 's-5', time: '13:30:30', source: 'Data Agent', target: '代码组', action: '共享数据', status: 'success', size: 56700 },
  { id: 's-6', time: '13:30:28', source: '协调器', target: '全部', action: '心跳广播', status: 'success', size: 128 },
]

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: '#f59e0b', icon: Pause, label: '待处理' },
  running: { color: '#3b82f6', icon: Play, label: '进行中' },
  completed: { color: '#10b981', icon: CheckCircle, label: '已完成' },
  failed: { color: '#ef4444', icon: AlertTriangle, label: '失败' },
}

const PRIORITY_CONFIG = {
  high: { color: '#ef4444', label: '高' },
  medium: { color: '#f59e0b', label: '中' },
  low: { color: '#10b981', label: '低' },
}

export default function Collaboration() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS)
  const [activeTab, setActiveTab] = useState<'tasks' | 'topology' | 'sync'>('tasks')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const toggleTaskStatus = (id: string) => {
    setTasks(tasks.map((t) => {
      if (t.id !== id) return t
      const next = t.status === 'pending' ? 'running' : t.status === 'running' ? 'completed' : 'pending'
      return { ...t, status: next, progress: next === 'completed' ? 100 : next === 'running' ? 50 : 0 }
    }))
  }

  const filtered = tasks.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    return true
  })

  const completedCount = tasks.filter((t) => t.status === 'completed').length
  const runningCount = tasks.filter((t) => t.status === 'running').length
  const failedCount = tasks.filter((t) => t.status === 'failed').length
  const avgProgress = tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">协作组管理</h1>
            <p className="text-sm text-[var(--sage-500)]">任务分解、调度与同步压缩</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <Layers className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{tasks.length}</p>
          <p className="text-xs text-[var(--sage-500)]">总任务</p>
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
          <TrendingUp className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{avgProgress}%</p>
          <p className="text-xs text-[var(--sage-500)]">平均进度</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'tasks' as const, label: `任务 (${tasks.length})`, icon: Layers },
          { id: 'topology' as const, label: '拓扑', icon: GitBranch },
          { id: 'sync' as const, label: '同步', icon: ArrowRightLeft },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-card text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[var(--sage-500)] text-white'
                  : 'bg-[var(--sage-50)] text-[var(--sage-600)] hover:bg-[var(--sage-100)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <>
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
          </div>

          <div className="space-y-3">
            {filtered.map((task) => {
              const status = STATUS_CONFIG[task.status]
              const StatusIcon = status.icon
              const priority = PRIORITY_CONFIG[task.priority]
              return (
                <div key={task.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        onClick={() => toggleTaskStatus(task.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                        style={{ backgroundColor: status.color + '15' }}
                      >
                        <StatusIcon className="w-4 h-4" style={{ color: status.color }} />
                      </button>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm text-[var(--sage-800)]">{task.name}</h3>
                        <p className="text-xs text-[var(--sage-500)] mt-0.5">{task.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-lg">{task.assigneeAvatar}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sage-100)] text-[var(--sage-500)]">
                            {task.assignee}
                          </span>
                          {task.tags.map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sage-100)] text-[var(--sage-500)]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-col items-end">
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: priority.color + '15', color: priority.color }}>
                        {priority.label}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: status.color + '15', color: status.color }}>
                        {status.label}
                      </span>
                      <span className="text-[10px] text-[var(--sage-400)]">{task.estimatedTime}</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  {task.status === 'running' && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-[var(--sage-400)] mb-1">
                        <span>进度</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--sage-100)]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${task.progress}%`, backgroundColor: status.color }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Topology Tab */}
      {activeTab === 'topology' && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-4 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[var(--sage-500)]" />
            Agent 拓扑图
          </h3>
          <div className="relative h-[300px] bg-[var(--sage-50)] rounded-card border p-4" style={{ borderColor: 'var(--sage-100)' }}>
            {TOPOLOGY_NODES.map((node, i) => {
              const isSelected = selectedNode === node.id
              const x = 50 + (i % 4) * 220
              const y = 50 + Math.floor(i / 4) * 120
              const nodeColor = node.status === 'active' ? '#10b981' : node.status === 'error' ? '#ef4444' : '#b5bda8'
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(isSelected ? null : node.id)}
                  className="absolute cursor-pointer transition-transform hover:scale-105"
                  style={{ left: x, top: y }}
                >
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center border-2"
                    style={{
                      backgroundColor: nodeColor + '15',
                      borderColor: isSelected ? nodeColor : 'transparent',
                    }}
                  >
                    {node.type === 'hub' ? (
                      <Zap className="w-6 h-6" style={{ color: nodeColor }} />
                    ) : node.type === 'group' ? (
                      <Users className="w-6 h-6" style={{ color: nodeColor }} />
                    ) : (
                      <Bot className="w-6 h-6" style={{ color: nodeColor }} />
                    )}
                  </div>
                  <p className="text-[10px] text-center mt-1 text-[var(--sage-600)] font-medium">{node.name}</p>
                  <p className="text-[9px] text-center text-[var(--sage-400)]">{node.load}%</p>
                </div>
              )
            })}
            {/* Connection lines (simplified) */}
            <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
              {TOPOLOGY_NODES.map((node) =>
                node.connections.map((targetId, ci) => {
                  const target = TOPOLOGY_NODES.find((n) => n.id === targetId)
                  if (!target) return null
                  const idx1 = TOPOLOGY_NODES.indexOf(node)
                  const idx2 = TOPOLOGY_NODES.indexOf(target)
                  const x1 = 50 + (idx1 % 4) * 220 + 32
                  const y1 = 50 + Math.floor(idx1 / 4) * 120 + 32
                  const x2 = 50 + (idx2 % 4) * 220 + 32
                  const y2 = 50 + Math.floor(idx2 / 4) * 120 + 32
                  return (
                    <line
                      key={`${node.id}-${targetId}-${ci}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="var(--sage-200)"
                      strokeWidth={1}
                      strokeDasharray="4 2"
                    />
                  )
                })
              )}
            </svg>
          </div>
          {selectedNode && (
            <div className="mt-4 p-3 rounded-card bg-[var(--sage-50)]" style={{ border: '1px solid var(--sage-100)' }}>
              {(() => {
                const node = TOPOLOGY_NODES.find((n) => n.id === selectedNode)
                if (!node) return null
                return (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--sage-800)] font-medium">{node.name}</span>
                    <span className="text-[var(--sage-500)]">负载 {node.load}% · {node.connections.length} 连接</span>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* Sync Tab */}
      {activeTab === 'sync' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4">
              <RefreshCw className="w-5 h-5 text-[var(--sage-500)] mb-2" />
              <p className="text-2xl font-bold text-[var(--sage-800)]">{SYNC_LOGS.filter((s) => s.status === 'success').length}</p>
              <p className="text-xs text-[var(--sage-500)]">成功同步</p>
            </div>
            <div className="card p-4">
              <AlertTriangle className="w-5 h-5 text-red-500 mb-2" />
              <p className="text-2xl font-bold text-[var(--sage-800)]">{SYNC_LOGS.filter((s) => s.status === 'failed').length}</p>
              <p className="text-xs text-[var(--sage-500)]">失败</p>
            </div>
            <div className="card p-4">
              <BarChart3 className="w-5 h-5 text-[var(--sage-500)] mb-2" />
              <p className="text-2xl font-bold text-[var(--sage-800)]">
                {(SYNC_LOGS.reduce((s, l) => s + l.size, 0) / 1024).toFixed(1)}KB
              </p>
              <p className="text-xs text-[var(--sage-500)]">总传输</p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--sage-100)' }}>
              <ArrowRightLeft className="w-4 h-4 text-[var(--sage-500)]" />
              <h3 className="text-sm font-semibold text-[var(--sage-800)]">同步日志</h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {SYNC_LOGS.map((log) => (
                <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 border-b text-xs" style={{ borderColor: 'var(--sage-50)' }}>
                  <span className="text-[var(--sage-400)] font-mono w-[70px] shrink-0">{log.time}</span>
                  <span className="text-[var(--sage-600)] w-[90px] shrink-0">{log.source}</span>
                  <ChevronRight className="w-3 h-3 text-[var(--sage-300)]" />
                  <span className="text-[var(--sage-600)] w-[90px] shrink-0">{log.target}</span>
                  <span className="text-[var(--sage-500)] flex-1">{log.action}</span>
                  <span className={`px-1.5 py-0.5 rounded ${
                    log.status === 'success' ? 'bg-green-500/10 text-green-600' :
                    log.status === 'failed' ? 'bg-red-500/10 text-red-600' :
                    'bg-[var(--sage-100)] text-[var(--sage-500)]'
                  }`}>
                    {log.status === 'success' ? '成功' : log.status === 'failed' ? '失败' : '待处理'}
                  </span>
                  <span className="text-[var(--sage-400)] w-[60px] text-right">{(log.size / 1024).toFixed(1)}KB</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
