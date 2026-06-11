import { useState, useEffect, useRef } from 'react'
import {
  Network, Cpu, Zap, Activity, Globe, ArrowRightLeft, Settings,
  Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, Bot, Server,
  Leaf, Layers, Play, Pause, Power, Search, Filter, CheckCircle,
  AlertTriangle, XCircle, Clock, BarChart3, Loader2, Send, Square,
  Terminal, Sparkles,
} from 'lucide-react'
import { fetchSwarms, fetchAgents, fetchTasks, fetchChariots, executeChariotStream } from '@/api/client'

interface SwarmNode {
  id: string
  name: string
  type: 'coordinator' | 'worker' | 'leaf' | 'gateway' | 'observer'
  status: 'active' | 'idle' | 'offline' | 'error'
  load: number
  tasks: number
  memory: number
  uptime: string
  version: string
  region: string
  lastHeartbeat: string
}

interface SwarmTask {
  id: string
  name: string
  nodeId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: 'high' | 'medium' | 'low'
  progress: number
  startedAt: string
  estimatedDuration: string
}

const MOCK_NODES: SwarmNode[] = [
  { id: 'n-1', name: 'Coordinator-1', type: 'coordinator', status: 'active', load: 45, tasks: 12, memory: 2048, uptime: '15d 3h', version: 'v2.1.0', region: 'cn-north-1', lastHeartbeat: '刚刚' },
  { id: 'n-2', name: 'Gateway-1', type: 'gateway', status: 'active', load: 32, tasks: 8, memory: 1024, uptime: '15d 3h', version: 'v2.1.0', region: 'cn-north-1', lastHeartbeat: '刚刚' },
  { id: 'n-3', name: 'Worker-A1', type: 'worker', status: 'active', load: 78, tasks: 34, memory: 4096, uptime: '10d 5h', version: 'v2.0.5', region: 'cn-east-1', lastHeartbeat: '2秒前' },
  { id: 'n-4', name: 'Worker-A2', type: 'worker', status: 'active', load: 65, tasks: 28, memory: 4096, uptime: '10d 5h', version: 'v2.0.5', region: 'cn-east-1', lastHeartbeat: '3秒前' },
  { id: 'n-5', name: 'Worker-B1', type: 'worker', status: 'active', load: 42, tasks: 15, memory: 2048, uptime: '8d 12h', version: 'v2.0.5', region: 'cn-south-1', lastHeartbeat: '5秒前' },
  { id: 'n-6', name: 'Leaf-1', type: 'leaf', status: 'idle', load: 5, tasks: 1, memory: 512, uptime: '5d 0h', version: 'v1.9.0', region: 'cn-north-1', lastHeartbeat: '1分钟前' },
  { id: 'n-7', name: 'Leaf-2', type: 'leaf', status: 'offline', load: 0, tasks: 0, memory: 512, uptime: '0d 0h', version: 'v1.9.0', region: 'cn-east-1', lastHeartbeat: '30分钟前' },
  { id: 'n-8', name: 'Observer-1', type: 'observer', status: 'active', load: 15, tasks: 3, memory: 1024, uptime: '15d 3h', version: 'v2.1.0', region: 'cn-north-1', lastHeartbeat: '刚刚' },
]

const MOCK_TASKS: SwarmTask[] = [
  { id: 'st-1', name: '数据聚合', nodeId: 'n-3', status: 'running', priority: 'high', progress: 65, startedAt: '13:00', estimatedDuration: '45分钟' },
  { id: 'st-2', name: '模型推理', nodeId: 'n-4', status: 'running', priority: 'high', progress: 42, startedAt: '13:15', estimatedDuration: '1小时' },
  { id: 'st-3', name: '日志清理', nodeId: 'n-5', status: 'running', priority: 'low', progress: 88, startedAt: '12:30', estimatedDuration: '10分钟' },
  { id: 'st-4', name: '索引更新', nodeId: 'n-6', status: 'pending', priority: 'medium', progress: 0, startedAt: '-', estimatedDuration: '20分钟' },
  { id: 'st-5', name: '健康检查', nodeId: 'n-8', status: 'completed', priority: 'low', progress: 100, startedAt: '13:00', estimatedDuration: '已完成' },
  { id: 'st-6', name: '备份同步', nodeId: 'n-3', status: 'failed', priority: 'high', progress: 30, startedAt: '12:00', estimatedDuration: '已中断' },
]

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  coordinator: { icon: Network, label: '协调器', color: '#c97b84' },
  gateway: { icon: Globe, label: '网关', color: '#3b82f6' },
  worker: { icon: Cpu, label: '工作者', color: '#f59e0b' },
  leaf: { icon: Leaf, label: '叶子', color: '#6b7a5a' },
  observer: { icon: Activity, label: '观察者', color: '#8b5cf6' },
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  active: { color: '#10b981', label: '活跃' },
  idle: { color: '#b5bda8', label: '空闲' },
  offline: { color: '#ef4444', label: '离线' },
  error: { color: '#ef4444', label: '错误' },
}

const agentToNode = (agent: any): SwarmNode => ({
  id: agent.id,
  name: agent.name || agent.id,
  type: 'worker',
  status: agent.status === 'active' ? 'active' : 'idle',
  load: Math.floor(Math.random() * 60) + 10,
  tasks: agent.stats?.messageCount || 0,
  memory: 2048,
  uptime: '1d',
  version: 'v2.0',
  region: 'cn-north-1',
  lastHeartbeat: '刚刚',
})

const taskToSwarmTask = (task: any): SwarmTask => ({
  id: task.id,
  name: task.name || task.id,
  nodeId: task.agentId || task.assignedTo || 'n-1',
  status: task.status === 'completed' ? 'completed' : task.status === 'failed' ? 'failed' : task.status === 'running' ? 'running' : 'pending',
  priority: 'medium',
  progress: task.status === 'completed' ? 100 : task.status === 'running' ? 50 : 0,
  startedAt: '-',
  estimatedDuration: '-',
})

export default function SwarmPanel() {
  const [nodes, setNodes] = useState<SwarmNode[]>(MOCK_NODES)
  const [tasks, setTasks] = useState<SwarmTask[]>(MOCK_TASKS)
  const [loading, setLoading] = useState(false)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'nodes' | 'tasks' | 'topology' | 'execute'>('nodes')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  // ─── 战车执行状态 ────────────────────────────────────
  const [chariots, setChariots] = useState<any[]>([])
  const [selectedChariotId, setSelectedChariotId] = useState<string>('')
  const [taskInput, setTaskInput] = useState('')
  const [executionEvents, setExecutionEvents] = useState<any[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<any>(null)
  const abortRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchAgents().catch(() => null),
      fetchTasks().catch(() => null),
      fetchSwarms().catch(() => null),
      fetchChariots().catch(() => null),
    ])
      .then(([agentsRes, tasksRes, swarmsRes, chariotsRes]) => {
        if (cancelled) return
        const agents = agentsRes?.data || agentsRes
        const tasks = tasksRes?.data || tasksRes
        const chariotList = chariotsRes?.data || chariotsRes
        if (Array.isArray(agents) && agents.length > 0) {
          setNodes(agents.map(agentToNode))
        }
        if (Array.isArray(tasks) && tasks.length > 0) {
          setTasks(tasks.map(taskToSwarmTask))
        }
        if (Array.isArray(chariotList) && chariotList.length > 0) {
          setChariots(chariotList)
          if (!selectedChariotId) setSelectedChariotId(chariotList[0].id)
        }
      })
      .catch(() => {
        // fallback to MOCK
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const toggleNodeStatus = (id: string) => {
    setNodes(nodes.map((n) => {
      if (n.id !== id) return n
      const next = n.status === 'active' ? 'idle' : n.status === 'idle' ? 'offline' : 'active'
      return { ...n, status: next }
    }))
  }

  // ─── 战车执行 ────────────────────────────────────────
  const handleExecute = () => {
    if (!selectedChariotId || !taskInput.trim()) return

    setExecutionEvents([])
    setExecutionResult(null)
    setIsExecuting(true)

    const task = {
      id: `task-${Date.now()}`,
      type: 'execute',
      payload: { content: taskInput.trim() },
    }

    const abort = executeChariotStream(
      selectedChariotId,
      task,
      (event) => {
        setExecutionEvents((prev) => [...prev, event])
        if (event.type === 'complete') {
          setExecutionResult(event.result)
        }
      },
      (err) => {
        setExecutionEvents((prev) => [...prev, { type: 'error', error: err.message }])
        setIsExecuting(false)
      },
      () => {
        setIsExecuting(false)
      },
    )

    abortRef.current = abort
  }

  const filteredNodes = nodes.filter((n) => {
    if (search && !n.name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter !== 'all' && n.type !== typeFilter) return false
    if (statusFilter !== 'all' && n.status !== statusFilter) return false
    return true
  })

  const activeCount = nodes.filter((n) => n.status === 'active').length
  const totalTasks = nodes.reduce((sum, n) => sum + n.tasks, 0)
  const avgLoad = Math.round(nodes.reduce((sum, n) => sum + n.load, 0) / nodes.length)
  const totalMemory = nodes.reduce((sum, n) => sum + n.memory, 0)
  const offlineCount = nodes.filter((n) => n.status === 'offline').length

  const nodeTasks = (nodeId: string) => tasks.filter((t) => t.nodeId === nodeId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Network className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">蜂群面板</h1>
            <p className="text-sm text-[var(--sage-500)]">
              {nodes.length} 个节点 · {activeCount} 活跃 · {totalTasks} 任务 · 负载 {avgLoad}%
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="card p-4">
          <Cpu className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{activeCount}</p>
          <p className="text-xs text-[var(--sage-500)]">活跃节点</p>
        </div>
        <div className="card p-4">
          <Zap className="w-5 h-5 text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{totalTasks}</p>
          <p className="text-xs text-[var(--sage-500)]">总任务</p>
        </div>
        <div className="card p-4">
          <Activity className="w-5 h-5 text-red-400 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{avgLoad}%</p>
          <p className="text-xs text-[var(--sage-500)]">平均负载</p>
        </div>
        <div className="card p-4">
          <Layers className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{(totalMemory / 1024).toFixed(1)}GB</p>
          <p className="text-xs text-[var(--sage-500)]">总内存</p>
        </div>
        <div className="card p-4">
          <AlertTriangle className="w-5 h-5 text-red-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{offlineCount}</p>
          <p className="text-xs text-[var(--sage-500)]">离线</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'nodes' as const, label: `节点 (${nodes.length})`, icon: Network },
          { id: 'tasks' as const, label: `任务 (${tasks.length})`, icon: Layers },
          { id: 'topology' as const, label: '拓扑', icon: Globe },
          { id: 'execute' as const, label: '战车执行', icon: Play },
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

      {/* Nodes Tab */}
      {activeTab === 'nodes' && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索节点..."
                className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2.5 rounded-card border text-sm"
              style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
            >
              <option value="all">全部类型</option>
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-card border text-sm"
              style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
            >
              <option value="all">全部状态</option>
              <option value="active">活跃</option>
              <option value="idle">空闲</option>
              <option value="offline">离线</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredNodes.map((node) => {
              const typeCfg = TYPE_CONFIG[node.type]
              const TypeIcon = typeCfg.icon
              const statusCfg = STATUS_CONFIG[node.status]
              const isSelected = selectedNode === node.id
              const nTasks = nodeTasks(node.id)
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(isSelected ? null : node.id)}
                  className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-[var(--sage-500)]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: typeCfg.color + '15' }}
                      >
                        <TypeIcon className="w-5 h-5" style={{ color: typeCfg.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-[var(--sage-800)]">{node.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: typeCfg.color + '15', color: typeCfg.color }}>
                            {typeCfg.label}
                          </span>
                          <span className="text-[10px] text-[var(--sage-400)]">{node.region}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleNodeStatus(node.id) }}
                        className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                        style={{ backgroundColor: statusCfg.color + '15', color: statusCfg.color }}
                      >
                        {node.status === 'active' ? <Power className="w-3 h-3" /> : node.status === 'idle' ? <Pause className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {statusCfg.label}
                      </button>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center">
                      <p className="text-xs text-[var(--sage-400)]">负载</p>
                      <p className="text-sm font-bold text-[var(--sage-800)]">{node.load}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[var(--sage-400)]">任务</p>
                      <p className="text-sm font-bold text-[var(--sage-800)]">{node.tasks}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[var(--sage-400)]">内存</p>
                      <p className="text-sm font-bold text-[var(--sage-800)]">{node.memory}MB</p>
                    </div>
                  </div>

                  {/* Load bar */}
                  <div className="h-1.5 rounded-full bg-[var(--sage-100)] overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${node.load}%`,
                        backgroundColor: node.load > 80 ? '#ef4444' : node.load > 50 ? '#f59e0b' : '#10b981',
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[var(--sage-400)]">
                    <span>运行 {node.uptime}</span>
                    <span>{node.version}</span>
                    <span>心跳: {node.lastHeartbeat}</span>
                  </div>

                  {/* Task list for selected node */}
                  {isSelected && nTasks.length > 0 && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--sage-100)' }}>
                      <p className="text-xs font-medium text-[var(--sage-600)] mb-2">节点任务</p>
                      <div className="space-y-1.5">
                        {nTasks.map((t) => (
                          <div key={t.id} className="flex items-center gap-2 text-xs">
                            <span className={`w-2 h-2 rounded-full ${
                              t.status === 'running' ? 'bg-blue-500' :
                              t.status === 'completed' ? 'bg-green-500' :
                              t.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'
                            }`} />
                            <span className="text-[var(--sage-700)] flex-1">{t.name}</span>
                            <span className="text-[var(--sage-400)]">{t.progress}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--sage-50)] text-[var(--sage-600)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">任务</th>
                <th className="text-left px-4 py-3 font-medium">节点</th>
                <th className="text-left px-4 py-3 font-medium">优先级</th>
                <th className="text-left px-4 py-3 font-medium">状态</th>
                <th className="text-left px-4 py-3 font-medium">进度</th>
                <th className="text-left px-4 py-3 font-medium">开始时间</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const node = nodes.find((n) => n.id === t.nodeId)
                return (
                  <tr key={t.id} className="border-t" style={{ borderColor: 'var(--sage-100)' }}>
                    <td className="px-4 py-3 font-medium text-[var(--sage-800)]">{t.name}</td>
                    <td className="px-4 py-3 text-[var(--sage-500)]">{node?.name || t.nodeId}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        t.priority === 'high' ? 'bg-red-500/10 text-red-600' :
                        t.priority === 'medium' ? 'bg-amber-500/10 text-amber-600' :
                        'bg-green-500/10 text-green-600'
                      }`}>
                        {t.priority === 'high' ? '高' : t.priority === 'medium' ? '中' : '低'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        t.status === 'running' ? 'bg-blue-500/10 text-blue-600' :
                        t.status === 'completed' ? 'bg-green-500/10 text-green-600' :
                        t.status === 'failed' ? 'bg-red-500/10 text-red-600' :
                        'bg-[var(--sage-100)] text-[var(--sage-500)]'
                      }`}>
                        {t.status === 'running' ? '进行中' : t.status === 'completed' ? '已完成' : t.status === 'failed' ? '失败' : '待处理'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-[var(--sage-100)]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${t.progress}%`,
                              backgroundColor: t.status === 'failed' ? '#ef4444' : '#3b82f6',
                            }}
                          />
                        </div>
                        <span className="text-xs text-[var(--sage-400)]">{t.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--sage-400)]">{t.startedAt}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Topology Tab */}
      {activeTab === 'topology' && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[var(--sage-500)]" />
            蜂群拓扑
          </h3>
          <div className="relative h-[350px] bg-[var(--sage-50)] rounded-card border p-4" style={{ borderColor: 'var(--sage-100)' }}>
            {nodes.map((node, i) => {
              const typeCfg = TYPE_CONFIG[node.type]
              const x = 80 + (i % 4) * 220
              const y = 60 + Math.floor(i / 4) * 130
              return (
                <div
                  key={node.id}
                  className="absolute"
                  style={{ left: x, top: y }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center border-2"
                    style={{
                      backgroundColor: typeCfg.color + '15',
                      borderColor: node.status === 'active' ? typeCfg.color : 'var(--sage-200)',
                    }}
                  >
                    <typeCfg.icon className="w-6 h-6" style={{ color: typeCfg.color }} />
                  </div>
                  <p className="text-[10px] text-center mt-1 text-[var(--sage-600)] font-medium">{node.name}</p>
                  <p className="text-[9px] text-center text-[var(--sage-400)]">{node.load}%</p>
                </div>
              )
            })}
            {/* Hub node in center */}
            <div className="absolute" style={{ left: 340, top: 140 }}>
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center border-2"
                style={{ backgroundColor: '#c97b84' + '15', borderColor: '#c97b84' }}
              >
                <Network className="w-7 h-7" style={{ color: '#c97b84' }} />
              </div>
              <p className="text-[10px] text-center mt-1 text-[var(--sage-600)] font-medium">Swarm Hub</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: cfg.color }} />
                <span className="text-xs text-[var(--sage-500)]">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execute Tab */}
      {activeTab === 'execute' && (
        <div className="space-y-4">
          {/* Chariot Selector */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
              <Network className="w-4 h-4 text-[var(--sage-500)]" />
              选择战车
            </h3>
            {chariots.length === 0 ? (
              <p className="text-sm text-[var(--sage-400)]">暂无战车，请先创建</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {chariots.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChariotId(c.id)}
                    className={`p-3 rounded-card border text-left transition-all ${
                      selectedChariotId === c.id
                        ? 'border-[var(--sage-500)] bg-[var(--sage-50)] ring-1 ring-[var(--sage-500)]'
                        : 'border-[var(--sage-200)] hover:border-[var(--sage-400)]'
                    }`}
                  >
                    <p className="font-medium text-sm text-[var(--sage-800)]">{c.name}</p>
                    <p className="text-xs text-[var(--sage-400)] mt-1">
                      {c.executionMode} · {c.agentIds?.length || 0} 个Agent
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Task Input */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[var(--sage-500)]" />
              任务输入
            </h3>
            <textarea
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="输入任务描述，例如：设计一个博客系统的技术方案..."
              className="w-full h-32 p-3 rounded-card border text-sm resize-none"
              style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-[var(--sage-400)]">
                {taskInput.length} 字符 · 选中战车: {chariots.find((c) => c.id === selectedChariotId)?.name || '未选择'}
              </p>
              <div className="flex gap-2">
                {isExecuting && (
                  <button
                    onClick={() => {
                      abortRef.current?.();
                      setIsExecuting(false);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-card text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    停止
                  </button>
                )}
                <button
                  onClick={handleExecute}
                  disabled={isExecuting || !selectedChariotId || !taskInput.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-card text-sm font-medium bg-[var(--sage-500)] text-white hover:bg-[var(--sage-600)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {isExecuting ? '执行中...' : '执行'}
                </button>
              </div>
            </div>
          </div>

          {/* Execution Progress */}
          {executionEvents.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--sage-500)]" />
                执行进度
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {executionEvents.map((evt, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    {evt.type === 'start' && (
                      <>
                        <Play className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <span className="text-[var(--sage-600)]">
                          启动 {evt.mode} 模式，{evt.agentCount} 个Agent参与
                        </span>
                      </>
                    )}
                    {evt.type === 'subtask_start' && (
                      <>
                        <Loader2 className="w-4 h-4 text-amber-500 mt-0.5 shrink-0 animate-spin" />
                        <span className="text-[var(--sage-600)]">
                          Agent <span className="font-medium">{evt.agentId.slice(0, 8)}</span> 开始执行任务 {evt.index + 1}/{evt.total}
                        </span>
                      </>
                    )}
                    {evt.type === 'subtask_complete' && (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <span className="text-[var(--sage-600)]">
                            Agent <span className="font-medium">{evt.agentId.slice(0, 8)}</span> 完成
                            <span className="text-xs text-[var(--sage-400)] ml-2">({evt.elapsedMs}ms)</span>
                          </span>
                          <p className="text-xs text-[var(--sage-400)] mt-1 line-clamp-3">{String(evt.data).slice(0, 200)}...</p>
                        </div>
                      </>
                    )}
                    {evt.type === 'subtask_error' && (
                      <>
                        <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <span className="text-red-600">
                          Agent <span className="font-medium">{evt.agentId.slice(0, 8)}</span> 失败: {evt.error}
                          {evt.willRetry && <span className="text-xs ml-2">(将重试)</span>}
                        </span>
                      </>
                    )}
                    {evt.type === 'complete' && (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-green-600 font-medium">
                          执行完成！总耗时 {evt.totalElapsedMs}ms
                        </span>
                      </>
                    )}
                    {evt.type === 'error' && (
                      <>
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <span className="text-red-600">错误: {evt.error}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Result */}
          {executionResult && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[var(--sage-500)]" />
                执行结果
              </h3>
              <pre className="text-xs text-[var(--sage-600)] bg-[var(--sage-50)] p-3 rounded-card overflow-auto max-h-64">
                {JSON.stringify(executionResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
