import { useState, useEffect } from 'react'
import {
  Users, GitBranch, Layers, ArrowRightLeft, Activity, Play, Pause, CheckCircle,
  Plus, Trash2, Search, Filter, Clock, TrendingUp, AlertTriangle, RefreshCw,
  ChevronRight, Bot, Zap, Shield, BarChart3,
} from 'lucide-react'
import { fetchGroups, fetchAgents, fetchTasks, executeGroup, getGroupStatus, getGroupMeetings, getGroupHealth } from '@/api/client'

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

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: 'text-yellow-500', icon: Pause, label: '待执行' },
  running: { color: 'text-blue-500', icon: Play, label: '执行中' },
  completed: { color: 'text-green-500', icon: CheckCircle, label: '已完成' },
  failed: { color: 'text-red-500', icon: AlertTriangle, label: '失败' },
}

const PRIORITY_CONFIG = {
  high: { color: 'bg-red-100 text-red-700', label: '高' },
  medium: { color: 'bg-yellow-100 text-yellow-700', label: '中' },
  low: { color: 'bg-green-100 text-green-700', label: '低' },
}

// ── MOCK DATA (fallback when API fails) ──
const MOCK_TASKS: Task[] = [
  { id: 'mock-1', name: '数据同步任务', description: '同步各节点数据到主库', status: 'running', assignee: 'Agent-A', assigneeAvatar: '🤖', priority: 'high', progress: 65, createdAt: '2024-01-15 09:00', estimatedTime: '2小时', tags: ['自动', '高频'] },
  { id: 'mock-2', name: '模型训练', description: '训练新模型版本', status: 'pending', assignee: 'Agent-B', assigneeAvatar: '🤖', priority: 'medium', progress: 0, createdAt: '2024-01-15 10:00', estimatedTime: '4小时', tags: ['训练', 'GPU'] },
  { id: 'mock-3', name: '健康检查', description: '检查所有节点健康状态', status: 'completed', assignee: 'Agent-C', assigneeAvatar: '🤖', priority: 'low', progress: 100, createdAt: '2024-01-15 08:00', estimatedTime: '已完成', tags: ['监控', '定期'] },
]

const MOCK_TOPOLOGY: TopologyNode[] = [
  { id: 'mock-group-1', name: '协作组A', type: 'group', status: 'active', connections: ['mock-agent-1', 'mock-agent-2'], load: 60 },
  { id: 'mock-agent-1', name: 'Agent-1', type: 'agent', status: 'active', connections: ['mock-group-1'], load: 75 },
  { id: 'mock-agent-2', name: 'Agent-2', type: 'agent', status: 'idle', connections: ['mock-group-1'], load: 20 },
]

const MOCK_SYNC_LOGS: SyncLog[] = [
  { id: 'mock-sync-1', time: new Date().toISOString(), source: 'Agent-A', target: '主库', action: '数据同步', status: 'success', size: 1024 },
  { id: 'mock-sync-2', time: new Date().toISOString(), source: '系统', target: 'Agent-B', action: '任务分发', status: 'pending', size: 256 },
]

export default function Collaboration() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [topologyNodes, setTopologyNodes] = useState<TopologyNode[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.allSettled([
      fetchGroups(),
      fetchAgents(),
    ]).then(([groupsRes, agentsRes]) => {
      if (cancelled) return
      // Tasks from groups
      const groups = groupsRes.status === 'fulfilled' ? (groupsRes.value?.data || []) : []
      const agents = agentsRes.status === 'fulfilled' ? (agentsRes.value?.data || []) : []
      if (groups.length > 0) {
        const mappedTasks = groups.map((g: any) => ({
          id: g.id,
          name: g.name,
          description: g.description || '',
          status: 'running',
          assignee: g.coordinatorId || 'system',
          priority: 'medium',
          progress: 0,
          dueDate: new Date().toISOString(),
          tags: [],
          updatedAt: new Date().toISOString(),
        }))
        setTasks(mappedTasks)
      } else {
        setTasks(MOCK_TASKS)
      }
      if (groups.length > 0 || agents.length > 0) {
        const mappedTopology = [
          ...groups.map((g: any) => ({
            id: g.id,
            name: g.name,
            type: 'group',
            status: 'active',
            connections: agents.filter((a: any) => a.groupId === g.id).map((a: any) => a.id),
            data: g,
          })),
          ...agents.map((a: any) => ({
            id: a.id,
            name: a.name,
            type: 'agent',
            status: 'idle',
            connections: [],
            data: a,
          })),
        ]
        setTopologyNodes(mappedTopology)
      } else {
        setTopologyNodes(MOCK_TOPOLOGY)
      }
    }).catch(() => {
      if (!cancelled) {
        setTasks(MOCK_TASKS)
        setTopologyNodes(MOCK_TOPOLOGY)
      }
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'tasks' | 'topology' | 'sync'>('tasks')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [executing, setExecuting] = useState(false)

  // Load data from real API
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      // Load groups as tasks
      const groupsRes = await fetchGroups()
      const groups = groupsRes.data || []
      const mappedTasks: Task[] = groups.map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description || '无描述',
        status: g.status === 'ACTIVE' ? 'running' : g.status === 'PAUSED' ? 'pending' : 'completed',
        assignee: g.coordinatorId ? `协调员 ${g.coordinatorId.slice(-4)}` : '未分配',
        assigneeAvatar: g.coordinatorId ? '👤' : '❓',
        priority: g.agentIds?.length > 3 ? 'high' : g.agentIds?.length > 1 ? 'medium' : 'low',
        progress: g.status === 'ACTIVE' ? 50 : g.status === 'COMPLETED' ? 100 : 0,
        createdAt: g.createdAt || new Date().toISOString().slice(0, 16).replace('T', ' '),
        estimatedTime: g.status === 'ACTIVE' ? '执行中' : g.status === 'COMPLETED' ? '已完成' : '待启动',
        tags: [g.type || '协作组', `成员${g.agentIds?.length || 0}`],
      }))
      setTasks(mappedTasks)

      // Load agents as topology nodes
      const agentsRes = await fetchAgents()
      const agents = agentsRes.data || []
      const groupsForTopology = groups.map((g: any) => ({
        id: g.id,
        name: g.name,
        type: 'group' as const,
        status: g.status === 'ACTIVE' ? 'active' as const : 'idle' as const,
        connections: g.agentIds || [],
        load: g.agentIds?.length * 20 || 0,
      }))
      const agentNodes = agents.map((a: any) => ({
        id: a.id,
        name: a.name,
        type: 'agent' as const,
        status: a.status === 'active' ? 'active' as const : a.status === 'paused' ? 'idle' as const : 'error' as const,
        connections: a.groupId ? [a.groupId] : [],
        load: a.status === 'active' ? 70 : 10,
      }))
      setTopologyNodes([...groupsForTopology, ...agentNodes])

      // Load sync logs from tasks
      const tasksRes = await fetchTasks()
      const realTasks = tasksRes.data || []
      const mappedSyncLogs: SyncLog[] = realTasks.slice(0, 10).map((t: any, i: number) => ({
        id: t.id || `sync-${i}`,
        time: t.createdAt || new Date().toISOString(),
        source: t.assignedAgent || '系统',
        target: t.groupId || '全局',
        action: t.type || '执行任务',
        status: t.status === 'completed' ? 'success' : t.status === 'failed' ? 'failed' : 'pending',
        size: t.description?.length || 0,
      }))
      setSyncLogs(mappedSyncLogs.length > 0 ? mappedSyncLogs : [])
    } catch (e: any) {
      console.error('Collaboration data load failed:', e)
      setError(e?.message || '加载协作数据失败')
      // Fallback to empty arrays
      setTasks([])
      setTopologyNodes([])
      setSyncLogs([])
    } finally {
      setLoading(false)
    }
  }

  const toggleTaskStatus = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t
      const next = t.status === 'pending' ? 'running' : t.status === 'running' ? 'completed' : 'pending'
      return { ...t, status: next, progress: next === 'running' ? 50 : next === 'completed' ? 100 : 0 }
    }))
  }

  const filtered = tasks.filter((t) => {
    const matchSearch = search === '' || t.name.includes(search) || t.description.includes(search)
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter
    return matchSearch && matchStatus && matchPriority
  })

  const executeSelectedGroup = async () => {
    if (!selectedNode) return
    try {
      setExecuting(true)
      await executeGroup(selectedNode)
      await loadData()
    } catch (e: any) {
      setError(e?.message || '执行失败')
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-[var(--sage-500)]" />
            协作中心
          </h1>
          <p className="text-sm text-[var(--sage-500)] mt-1">
            管理多智能体协作任务、拓扑结构与同步状态
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-[var(--sage-500)] hover:text-[var(--sage-700)] hover:bg-[var(--sage-100)] rounded-lg transition-colors"
            title="刷新数据"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 text-red-600 rounded-card px-4 py-3 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '总任务', value: tasks.length, icon: BarChart3, color: 'text-blue-500' },
          { label: '执行中', value: tasks.filter(t => t.status === 'running').length, icon: Activity, color: 'text-blue-500' },
          { label: '已完成', value: tasks.filter(t => t.status === 'completed').length, icon: CheckCircle, color: 'text-green-500' },
          { label: '节点数', value: topologyNodes.length, icon: GitBranch, color: 'text-purple-500' },
        ].map(stat => (
          <div key={stat.label} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--sage-500)]">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--sage-200)]">
        {[
          { id: 'tasks', label: '任务列表', icon: Layers },
          { id: 'topology', label: '拓扑结构', icon: GitBranch },
          { id: 'sync', label: '同步日志', icon: ArrowRightLeft },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors ${
              activeTab === tab.id
                ? 'text-[var(--sage-700)] border-b-2 border-[var(--sage-500)]'
                : 'text-[var(--sage-500)] hover:text-[var(--sage-700)]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
              <input
                type="text"
                placeholder="搜索任务..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
              <option value="pending">待执行</option>
              <option value="running">执行中</option>
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

          {loading ? (
            <div className="text-center py-12 text-[var(--sage-500)]">加载任务中...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-[var(--sage-500)]">
              <Layers className="w-10 h-10 mx-auto mb-2 text-[var(--sage-400)]" />
              <p>暂无任务</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(task => {
                const status = STATUS_CONFIG[task.status]
                const StatusIcon = status.icon
                const priority = PRIORITY_CONFIG[task.priority]
                return (
                  <div key={task.id} className="card p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleTaskStatus(task.id)}
                        className={`mt-1 ${status.color}`}
                      >
                        <StatusIcon className="w-5 h-5" />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{task.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${priority.color}`}>{priority.label}</span>
                          {task.tags.map(tag => (
                            <span key={tag} className="text-xs text-[var(--sage-500)] bg-[var(--sage-100)] px-2 py-0.5 rounded-full">{tag}</span>
                          ))}
                        </div>
                        <p className="text-sm text-[var(--sage-500)] mt-1">{task.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-[var(--sage-500)]">
                          <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> {task.assignee}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {task.estimatedTime}</span>
                          <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {task.progress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Topology Tab */}
      {activeTab === 'topology' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-[var(--sage-500)]">加载拓扑中...</div>
          ) : topologyNodes.length === 0 ? (
            <div className="text-center py-12 text-[var(--sage-500)]">
              <GitBranch className="w-10 h-10 mx-auto mb-2 text-[var(--sage-400)]" />
              <p>暂无拓扑节点</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {topologyNodes.map(node => {
                const isSelected = selectedNode === node.id
                const typeIcon = node.type === 'hub' ? Shield : node.type === 'group' ? Users : Bot
                const statusColor = node.status === 'active' ? 'text-green-500' : node.status === 'idle' ? 'text-yellow-500' : 'text-red-500'
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node.id)}
                    className={`card p-4 cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-[var(--sage-500)]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <typeIcon className={`w-5 h-5 ${statusColor}`} />
                        <span className="font-medium">{node.name}</span>
                      </div>
                      <span className={`text-xs ${statusColor}`}>{node.status}</span>
                    </div>
                    <div className="mt-2 text-sm text-[var(--sage-500)]">
                      类型: {node.type === 'hub' ? '协调中心' : node.type === 'group' ? '协作组' : '智能体'}
                    </div>
                    <div className="text-sm text-[var(--sage-500)]">
                      连接: {node.connections.length} | 负载: {node.load}%
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {selectedNode && (
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">已选择: {topologyNodes.find(n => n.id === selectedNode)?.name}</span>
                <button
                  onClick={executeSelectedGroup}
                  disabled={executing}
                  className="px-4 py-2 bg-[var(--sage-500)] text-white rounded-lg text-sm hover:bg-[var(--sage-600)] transition-colors disabled:opacity-50"
                >
                  {executing ? '执行中...' : '执行协作组'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sync Tab */}
      {activeTab === 'sync' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-[var(--sage-500)]">加载同步日志中...</div>
          ) : syncLogs.length === 0 ? (
            <div className="text-center py-12 text-[var(--sage-500)]">
              <ArrowRightLeft className="w-10 h-10 mx-auto mb-2 text-[var(--sage-400)]" />
              <p>暂无同步日志</p>
            </div>
          ) : (
            <div className="space-y-2">
              {syncLogs.map(log => (
                <div key={log.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${log.status === 'success' ? 'text-green-500' : log.status === 'failed' ? 'text-red-500' : 'text-yellow-500'}`}>
                        {log.status === 'success' ? '✓' : log.status === 'failed' ? '✗' : '⋯'}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{log.action}</p>
                        <p className="text-sm text-[var(--sage-500)]">{log.source} → {log.target}</p>
                      </div>
                    </div>
                    <span className="text-sm text-[var(--sage-500)]">{new Date(log.time).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
