import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  User,
  TreePine,
  ArrowLeft,
  Play,
  Pause,
  Zap,
  Trash2,
  Crown,
  Clock,
  Layers,
  Network,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  X,
  UserPlus,
  UserMinus,
  Activity,
  MessageSquare,
  GitBranch,
  History,
  BarChart3,
  Settings,
  RotateCcw,
} from 'lucide-react'
import {
  getGroup,
  deleteGroup,
  executeGroup,
  updateGroupStatus,
  addAgentToGroup,
  removeAgentFromGroup,
  assignCoordinator,
  fetchAgents,
  fetchGroups,
} from '@/api/client'

/* ── Types ──────────────────────────────────────────────────────── */

interface GroupEntity {
  id: string
  type: 'agent' | 'group'
  name: string
  role?: string
  status?: 'online' | 'offline' | 'busy'
  accentColor?: string
}

interface GroupTask {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  assigneeId: string
  priority: 'high' | 'medium' | 'low'
  progress: number
}

interface ExecutionRecord {
  id: string
  timestamp: string
  status: 'success' | 'failure' | 'running'
  duration: string
  triggeredBy: string
  output?: string
}

interface Group {
  id: string
  name: string
  entityType: 'mixed' | 'agents' | 'groups'
  type: 'sequential' | 'parallel' | 'hierarchical' | 'dynamic'
  status: 'active' | 'paused' | 'completed'
  description: string
  coordinatorId?: string
  coordinatorName?: string
  entityIds: string[]
  entities?: GroupEntity[]
  tasks: GroupTask[]
  children?: Group[]
  health?: { overall: string; issues: string[] }
  accentColor?: string
  createdAt?: string
}

/* ── Mock Data ──────────────────────────────────────────────────── */

const mockGroupDetail: Record<string, Group> = {
  'g-1': {
    id: 'g-1', name: '产品研发总部', entityType: 'mixed', type: 'hierarchical', status: 'active',
    description: '负责全产品线的研发管理，包含前端、后端、测试、运维子团队',
    coordinatorId: 'a-1', coordinatorName: '张总监',
    entityIds: ['a-1', 'g-2', 'g-3', 'g-4'],
    entities: [
      { id: 'a-1', type: 'agent', name: '张总监', role: '技术总监', status: 'online', accentColor: '#6b7a5a' },
      { id: 'g-2', type: 'group', name: '前端开发组' },
      { id: 'g-3', type: 'group', name: '后端开发组' },
      { id: 'g-4', type: 'group', name: '测试运维组' },
    ],
    tasks: [
      { id: 't1', title: '产品迭代规划', status: 'in_progress', assigneeId: 'a-1', priority: 'high', progress: 60 },
    ],
    children: [
      {
        id: 'g-2', name: '前端开发组', entityType: 'agents', type: 'parallel', status: 'active',
        description: 'React/Vue前端开发团队',
        coordinatorId: 'a-2', coordinatorName: '李前端',
        entityIds: ['a-2', 'a-3', 'a-4'],
        entities: [
          { id: 'a-2', type: 'agent', name: '李前端', role: '前端负责人', status: 'online', accentColor: '#7fb89f' },
          { id: 'a-3', type: 'agent', name: '王组件', role: 'UI组件开发', status: 'busy', accentColor: '#7fa3b0' },
          { id: 'a-4', type: 'agent', name: '赵页面', role: '页面开发', status: 'online', accentColor: '#d4a373' },
        ],
        tasks: [
          { id: 't2', title: '设计系统升级', status: 'in_progress', assigneeId: 'a-3', priority: 'high', progress: 45 },
          { id: 't3', title: '仪表盘重构', status: 'pending', assigneeId: 'a-4', priority: 'medium', progress: 0 },
        ],
      },
      {
        id: 'g-3', name: '后端开发组', entityType: 'agents', type: 'sequential', status: 'active',
        description: 'API服务与数据库开发',
        coordinatorId: 'a-5', coordinatorName: '陈后端',
        entityIds: ['a-5', 'a-6'],
        entities: [
          { id: 'a-5', type: 'agent', name: '陈后端', role: '后端负责人', status: 'online', accentColor: '#8f9a7d' },
          { id: 'a-6', type: 'agent', name: '刘数据库', role: 'DBA', status: 'offline', accentColor: '#c97b84' },
        ],
        tasks: [
          { id: 't4', title: 'API v2开发', status: 'in_progress', assigneeId: 'a-5', priority: 'high', progress: 70 },
        ],
      },
      {
        id: 'g-4', name: '测试运维组', entityType: 'agents', type: 'dynamic', status: 'paused',
        description: '自动化测试与CI/CD运维',
        coordinatorId: 'a-7', coordinatorName: '周测试',
        entityIds: ['a-7', 'a-8'],
        entities: [
          { id: 'a-7', type: 'agent', name: '周测试', role: '测试负责人', status: 'online', accentColor: '#a78b9a' },
          { id: 'a-8', type: 'agent', name: '吴运维', role: 'DevOps', status: 'busy', accentColor: '#c9a96e' },
        ],
        tasks: [
          { id: 't5', title: 'CI流水线优化', status: 'completed', assigneeId: 'a-8', priority: 'medium', progress: 100 },
        ],
      },
    ],
    createdAt: '2024-01-15T08:00:00Z',
  },
  'g-2': {
    id: 'g-2', name: '前端开发组', entityType: 'agents', type: 'parallel', status: 'active',
    description: 'React/Vue前端开发团队',
    coordinatorId: 'a-2', coordinatorName: '李前端',
    entityIds: ['a-2', 'a-3', 'a-4'],
    entities: [
      { id: 'a-2', type: 'agent', name: '李前端', role: '前端负责人', status: 'online', accentColor: '#7fb89f' },
      { id: 'a-3', type: 'agent', name: '王组件', role: 'UI组件开发', status: 'busy', accentColor: '#7fa3b0' },
      { id: 'a-4', type: 'agent', name: '赵页面', role: '页面开发', status: 'online', accentColor: '#d4a373' },
    ],
    tasks: [
      { id: 't2', title: '设计系统升级', status: 'in_progress', assigneeId: 'a-3', priority: 'high', progress: 45 },
      { id: 't3', title: '仪表盘重构', status: 'pending', assigneeId: 'a-4', priority: 'medium', progress: 0 },
    ],
    createdAt: '2024-01-20T08:00:00Z',
  },
  'g-3': {
    id: 'g-3', name: '后端开发组', entityType: 'agents', type: 'sequential', status: 'active',
    description: 'API服务与数据库开发',
    coordinatorId: 'a-5', coordinatorName: '陈后端',
    entityIds: ['a-5', 'a-6'],
    entities: [
      { id: 'a-5', type: 'agent', name: '陈后端', role: '后端负责人', status: 'online', accentColor: '#8f9a7d' },
      { id: 'a-6', type: 'agent', name: '刘数据库', role: 'DBA', status: 'offline', accentColor: '#c97b84' },
    ],
    tasks: [
      { id: 't4', title: 'API v2开发', status: 'in_progress', assigneeId: 'a-5', priority: 'high', progress: 70 },
    ],
    createdAt: '2024-02-01T08:00:00Z',
  },
  'g-4': {
    id: 'g-4', name: '测试运维组', entityType: 'agents', type: 'dynamic', status: 'paused',
    description: '自动化测试与CI/CD运维',
    coordinatorId: 'a-7', coordinatorName: '周测试',
    entityIds: ['a-7', 'a-8'],
    entities: [
      { id: 'a-7', type: 'agent', name: '周测试', role: '测试负责人', status: 'online', accentColor: '#a78b9a' },
      { id: 'a-8', type: 'agent', name: '吴运维', role: 'DevOps', status: 'busy', accentColor: '#c9a96e' },
    ],
    tasks: [
      { id: 't5', title: 'CI流水线优化', status: 'completed', assigneeId: 'a-8', priority: 'medium', progress: 100 },
    ],
    createdAt: '2024-02-10T08:00:00Z',
  },
  'g-5': {
    id: 'g-5', name: '数据分析中心', entityType: 'mixed', type: 'sequential', status: 'active',
    description: '数据采集→清洗→分析→可视化',
    coordinatorId: 'a-9', coordinatorName: '郑分析',
    entityIds: ['a-9', 'g-6'],
    entities: [
      { id: 'a-9', type: 'agent', name: '郑分析', role: '分析负责人', status: 'online', accentColor: '#7fb89f' },
      { id: 'g-6', type: 'group', name: '数据工程组' },
    ],
    tasks: [],
    children: [
      {
        id: 'g-6', name: '数据工程组', entityType: 'agents', type: 'parallel', status: 'active',
        description: 'ETL管道与数据仓库',
        coordinatorId: 'a-10', coordinatorName: '孙工程',
        entityIds: ['a-10', 'a-11'],
        entities: [
          { id: 'a-10', type: 'agent', name: '孙工程', role: '数据工程师', status: 'online', accentColor: '#7fa3b0' },
          { id: 'a-11', type: 'agent', name: '钱ETL', role: 'ETL开发', status: 'busy', accentColor: '#d4a373' },
        ],
        tasks: [
          { id: 't6', title: '实时数仓搭建', status: 'in_progress', assigneeId: 'a-10', priority: 'high', progress: 30 },
        ],
        createdAt: '2024-03-01T08:00:00Z',
      },
    ],
    createdAt: '2024-03-15T08:00:00Z',
  },
  'g-6': {
    id: 'g-6', name: '数据工程组', entityType: 'agents', type: 'parallel', status: 'active',
    description: 'ETL管道与数据仓库',
    coordinatorId: 'a-10', coordinatorName: '孙工程',
    entityIds: ['a-10', 'a-11'],
    entities: [
      { id: 'a-10', type: 'agent', name: '孙工程', role: '数据工程师', status: 'online', accentColor: '#7fa3b0' },
      { id: 'a-11', type: 'agent', name: '钱ETL', role: 'ETL开发', status: 'busy', accentColor: '#d4a373' },
    ],
    tasks: [
      { id: 't6', title: '实时数仓搭建', status: 'in_progress', assigneeId: 'a-10', priority: 'high', progress: 30 },
    ],
    createdAt: '2024-03-01T08:00:00Z',
  },
  'g-7': {
    id: 'g-7', name: '内容创作团队', entityType: 'agents', type: 'dynamic', status: 'active',
    description: '研究→写作→翻译→审校',
    coordinatorId: 'a-12', coordinatorName: '林创作',
    entityIds: ['a-12', 'a-13', 'a-14'],
    entities: [
      { id: 'a-12', type: 'agent', name: '林创作', role: '内容总监', status: 'online', accentColor: '#6b7a5a' },
      { id: 'a-13', type: 'agent', name: '黄写作', role: '撰稿人', status: 'busy', accentColor: '#c97b84' },
      { id: 'a-14', type: 'agent', name: '何翻译', role: '翻译员', status: 'online', accentColor: '#8f9a7d' },
    ],
    tasks: [
      { id: 't7', title: '产品白皮书撰写', status: 'in_progress', assigneeId: 'a-13', priority: 'high', progress: 55 },
    ],
    createdAt: '2024-04-01T08:00:00Z',
  },
}

const mockExecutionHistory: Record<string, ExecutionRecord[]> = {
  'g-1': [
    { id: 'ex-1', timestamp: '2024-12-01 09:30:00', status: 'success', duration: '12m 34s', triggeredBy: '手动触发', output: '迭代规划完成，已分配任务' },
    { id: 'ex-2', timestamp: '2024-12-02 14:15:00', status: 'success', duration: '8m 12s', triggeredBy: '定时任务', output: '日会同步完成' },
    { id: 'ex-3', timestamp: '2024-12-03 10:00:00', status: 'running', duration: '进行中', triggeredBy: '手动触发', output: '' },
  ],
  'g-2': [
    { id: 'ex-4', timestamp: '2024-12-01 11:00:00', status: 'success', duration: '15m 20s', triggeredBy: '手动触发', output: '设计系统组件库更新完成' },
    { id: 'ex-5', timestamp: '2024-12-02 16:30:00', status: 'failure', duration: '3m 45s', triggeredBy: '自动触发', output: '构建失败：依赖冲突' },
  ],
  'g-3': [
    { id: 'ex-6', timestamp: '2024-12-01 13:00:00', status: 'success', duration: '22m 10s', triggeredBy: '手动触发', output: 'API v2接口开发进度70%' },
  ],
  'g-4': [
    { id: 'ex-7', timestamp: '2024-11-28 08:00:00', status: 'success', duration: '45m 00s', triggeredBy: '定时任务', output: 'CI流水线优化完成' },
  ],
}

/* ── Helpers ────────────────────────────────────────────────────── */

const typeIcons: Record<string, React.ElementType> = {
  sequential: Clock,
  parallel: Layers,
  hierarchical: Network,
  dynamic: RefreshCw,
}

const typeLabels: Record<string, string> = {
  sequential: '顺序执行',
  parallel: '并行执行',
  hierarchical: '层级结构',
  dynamic: '动态重组',
}

function flattenGroups(groups: Group[]): Group[] {
  const result: Group[] = []
  function walk(list: Group[]) {
    for (const g of list) {
      result.push(g)
      if (g.children) walk(g.children)
    }
  }
  walk(groups)
  return result
}

/* ── Execution Badge ────────────────────────────────────────────── */

function ExecutionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    success: { bg: 'bg-green-500/10', text: 'text-green-600', label: '成功' },
    failure: { bg: 'bg-red-500/10', text: 'text-red-600', label: '失败' },
    running: { bg: 'bg-blue-500/10', text: 'text-blue-600', label: '执行中' },
  }
  const c = config[status] || config.success
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

/* ── Main Component ─────────────────────────────────────────────── */

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [executing, setExecuting] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'history' | 'settings'>('overview')
  const [showAddMember, setShowAddMember] = useState(false)
  const [showRemoveMember, setShowRemoveMember] = useState(false)
  const [availableAgents, setAvailableAgents] = useState<{ id: string; name: string; status: string }[]>([])
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([])
  const [selectedToRemove, setSelectedToRemove] = useState<string[]>([])

  useEffect(() => {
    if (id) loadGroup(id)
  }, [id])

  async function loadGroup(groupId: string) {
    try {
      setLoading(true)
      setError(null)
      const res = await getGroup(groupId)
      if (res.data) {
        setGroup(res.data)
      } else {
        // Fallback to mock
        const mock = mockGroupDetail[groupId]
        if (mock) setGroup(mock)
        else setError('群组不存在')
      }
    } catch (e: any) {
      const mock = mockGroupDetail[groupId]
      if (mock) {
        setGroup(mock)
      } else {
        setError(e?.message || '加载失败')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleExecute() {
    if (!group) return
    setExecuting(true)
    try {
      await executeGroup(group.id)
      // Add mock execution record
      const newRecord: ExecutionRecord = {
        id: `ex-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        status: 'running',
        duration: '进行中',
        triggeredBy: '手动触发',
      }
      mockExecutionHistory[group.id] = [...(mockExecutionHistory[group.id] || []), newRecord]
    } catch (e) {
      console.error(e)
    } finally {
      setExecuting(false)
    }
  }

  async function handleToggleStatus() {
    if (!group) return
    try {
      await updateGroupStatus(group.id, {
        status: group.status === 'active' ? 'paused' : 'active',
      })
      setGroup({ ...group, status: group.status === 'active' ? 'paused' : 'active' })
    } catch (e) {
      console.error(e)
      setGroup({ ...group, status: group.status === 'active' ? 'paused' : 'active' })
    }
  }

  async function handleDisband() {
    if (!group) return
    if (!confirm(`确定解散群组「${group.name}」？此操作不可撤销。`)) return
    try {
      await deleteGroup(group.id)
      navigate('/groups')
    } catch (e) {
      console.error(e)
      navigate('/groups')
    }
  }

  async function loadAvailableAgents() {
    try {
      const res = await fetchAgents()
      if (res.data) {
        const existingIds = group?.entities?.filter((e) => e.type === 'agent').map((e) => e.id) || []
        setAvailableAgents(
          res.data
            .filter((a: any) => !existingIds.includes(a.id))
            .map((a: any) => ({ id: a.id, name: a.name, status: a.status || 'idle' }))
        )
      }
    } catch (e) {
      const existingIds = group?.entities?.filter((e) => e.type === 'agent').map((e) => e.id) || []
      setAvailableAgents([
        { id: 'a-20', name: '新Agent-A', status: 'idle' },
        { id: 'a-21', name: '新Agent-B', status: 'online' },
        { id: 'a-22', name: '新Agent-C', status: 'online' },
      ].filter((a) => !existingIds.includes(a.id)))
    }
  }

  async function handleAddMembers() {
    if (!group || selectedToAdd.length === 0) return
    try {
      for (const agentId of selectedToAdd) {
        await addAgentToGroup(group.id, agentId)
      }
      // Optimistic update
      const newAgents = selectedToAdd.map((id) => {
        const found = availableAgents.find((a) => a.id === id)
        return {
          id,
          type: 'agent' as const,
          name: found?.name || id,
          role: '成员',
          status: 'online' as const,
          accentColor: '#6b7a5a',
        }
      })
      setGroup({
        ...group,
        entities: [...(group.entities || []), ...newAgents],
        entityIds: [...group.entityIds, ...selectedToAdd],
      })
      setShowAddMember(false)
      setSelectedToAdd([])
    } catch (e) {
      console.error(e)
    }
  }

  async function handleRemoveMembers() {
    if (!group || selectedToRemove.length === 0) return
    try {
      for (const entityId of selectedToRemove) {
        const entity = group.entities?.find((e) => e.id === entityId)
        if (entity?.type === 'agent') {
          await removeAgentFromGroup(group.id, entityId)
        }
      }
      setGroup({
        ...group,
        entities: group.entities?.filter((e) => !selectedToRemove.includes(e.id)) || [],
        entityIds: group.entityIds.filter((id) => !selectedToRemove.includes(id)),
      })
      setShowRemoveMember(false)
      setSelectedToRemove([])
    } catch (e) {
      console.error(e)
    }
  }

  function handleChatWithAgent(agentId: string) {
    navigate(`/chat?agent=${agentId}`)
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-[var(--sage-500)]">
          <div className="w-5 h-5 border-2 border-[var(--sage-300)] border-t-[var(--sage-500)] rounded-full animate-spin" />
          <span className="text-sm">加载中...</span>
        </div>
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-[var(--sage-500)]">{error || '群组不存在'}</p>
        <button onClick={() => navigate('/groups')} className="btn-primary mt-4">
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </button>
      </div>
    )
  }

  const TypeIcon = typeIcons[group.type] || Users
  const executionHistory = mockExecutionHistory[group.id] || []
  const hasNestedGroups = group.entities?.some((e) => e.type === 'group') || (group.children && group.children.length > 0)
  const agentMembers = group.entities?.filter((e) => e.type === 'agent') || []
  const groupMembers = group.entities?.filter((e) => e.type === 'group') || []

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate('/groups')}
          className="flex items-center gap-1 text-[var(--sage-500)] hover:text-[var(--sage-700)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          协作组
        </button>
        <ChevronRight className="w-3 h-3 text-[var(--sage-300)]" />
        <span className="text-[var(--sage-800)] font-medium">{group.name}</span>
      </div>

      {/* Group Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-card flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: group.accentColor ? `${group.accentColor}15` : 'var(--sage-100)' }}
            >
              <TypeIcon className="w-7 h-7" style={{ color: group.accentColor || 'var(--sage-500)' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--sage-800)]">{group.name}</h1>
              <p className="text-sm text-[var(--sage-500)] mt-1">{group.description}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--sage-100)] text-[var(--sage-600)]">
                  {typeLabels[group.type]}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    group.status === 'active'
                      ? 'bg-green-500/15 text-green-600'
                      : group.status === 'paused'
                      ? 'bg-amber-500/15 text-amber-600'
                      : 'bg-[var(--sage-200)] text-[var(--sage-500)]'
                  }`}
                >
                  {group.status === 'active' ? '运行中' : group.status === 'paused' ? '已暂停' : '已完成'}
                </span>
                {group.entityType === 'mixed' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500">混合成员</span>
                )}
                {group.entityType === 'groups' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">纯群组</span>
                )}
                {group.coordinatorName && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    协调员: {group.coordinatorName}
                  </span>
                )}
                {group.createdAt && (
                  <span className="text-xs text-[var(--sage-400)]">
                    创建于 {new Date(group.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleExecute}
              disabled={executing || group.status !== 'active'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--sage-500)' }}
            >
              <Zap className={`w-4 h-4 ${executing ? 'animate-pulse' : ''}`} />
              {executing ? '执行中...' : '触发执行'}
            </button>
            <button
              onClick={handleToggleStatus}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                group.status === 'active'
                  ? 'text-amber-600 bg-amber-500/10 hover:bg-amber-500/20'
                  : 'text-green-600 bg-green-500/10 hover:bg-green-500/20'
              }`}
            >
              {group.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {group.status === 'active' ? '暂停' : '恢复'}
            </button>
            <button
              onClick={handleDisband}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              解散
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-5 gap-3 mt-5 pt-5" style={{ borderTop: '1px solid var(--sage-200)' }}>
          {[
            { label: 'Agent成员', value: agentMembers.length, icon: User },
            { label: '嵌套群组', value: groupMembers.length, icon: TreePine },
            { label: '任务数', value: group.tasks?.length || 0, icon: CheckCircle },
            { label: '执行次数', value: executionHistory.length, icon: Activity },
            { label: '执行模式', value: typeLabels[group.type], icon: TypeIcon },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <stat.icon className="w-4 h-4 text-[var(--sage-400)] mx-auto mb-1" />
              <div className="text-lg font-bold text-[var(--sage-800)]">{stat.value}</div>
              <div className="text-xs text-[var(--sage-500)]">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--sage-200)' }}>
        {[
          { id: 'overview' as const, label: '概览', icon: BarChart3 },
          { id: 'members' as const, label: '成员', icon: Users },
          { id: 'history' as const, label: '执行历史', icon: History },
          { id: 'settings' as const, label: '设置', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
              activeTab === tab.id
                ? 'border-[var(--sage-500)] text-[var(--sage-700)]'
                : 'border-transparent text-[var(--sage-500)] hover:text-[var(--sage-600)]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Tasks */}
            <div className="card p-4">
              <h3 className="font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> 任务列表
              </h3>
              {group.tasks && group.tasks.length > 0 ? (
                <div className="space-y-2">
                  {group.tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 bg-[var(--sage-50)] rounded-lg px-3 py-2.5">
                      <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          task.status === 'completed'
                            ? 'bg-green-500'
                            : task.status === 'in_progress'
                            ? 'bg-amber-500'
                            : 'bg-[var(--sage-300)]'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[var(--sage-800)]">{task.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-[var(--sage-200)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${task.progress}%`,
                                backgroundColor: task.status === 'completed' ? 'var(--success)' : 'var(--sage-500)',
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-[var(--sage-500)] w-8 text-right">{task.progress}%</span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          task.priority === 'high'
                            ? 'bg-red-500/10 text-red-500'
                            : task.priority === 'medium'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-[var(--sage-100)] text-[var(--sage-500)]'
                        }`}
                      >
                        {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--sage-400)] text-center py-6">暂无任务</p>
              )}
            </div>

            {/* Nested Group Tree */}
            {hasNestedGroups && (
              <div className="card p-4">
                <h3 className="font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" /> 嵌套群组结构
                </h3>
                <NestedGroupTree group={group} expandedIds={expandedIds} toggleExpand={toggleExpand} onNavigate={navigate} />
              </div>
            )}

            {/* Recent Execution */}
            {executionHistory.length > 0 && (
              <div className="card p-4">
                <h3 className="font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
                  <History className="w-4 h-4" /> 最近执行
                </h3>
                <div className="space-y-2">
                  {executionHistory.slice(0, 3).map((ex) => (
                    <div key={ex.id} className="flex items-center gap-3 bg-[var(--sage-50)] rounded-lg px-3 py-2.5">
                      <ExecutionStatusBadge status={ex.status} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[var(--sage-800)]">{ex.timestamp}</div>
                        {ex.output && <div className="text-xs text-[var(--sage-500)] truncate">{ex.output}</div>}
                      </div>
                      <div className="text-xs text-[var(--sage-400)] flex-shrink-0">{ex.duration}</div>
                      <div className="text-xs text-[var(--sage-400)] flex-shrink-0">{ex.triggeredBy}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <motion.div
            key="members"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Member Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddMember(true); loadAvailableAgents() }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--sage-500)' }}
              >
                <UserPlus className="w-4 h-4" />
                添加成员
              </button>
              <button
                onClick={() => setShowRemoveMember(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors"
              >
                <UserMinus className="w-4 h-4" />
                移除成员
              </button>
            </div>

            {/* Agent Members */}
            <div className="card p-4">
              <h3 className="font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Agent 成员 ({agentMembers.length})
              </h3>
              {agentMembers.length > 0 ? (
                <div className="space-y-2">
                  {agentMembers.map((entity) => (
                    <div
                      key={entity.id}
                      className="flex items-center gap-3 bg-[var(--sage-50)] rounded-lg px-3 py-2.5 group hover:bg-[var(--sage-100)] transition-colors"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: entity.accentColor || 'var(--sage-500)' }}
                      >
                        {entity.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--sage-800)]">{entity.name}</span>
                          {group.coordinatorId === entity.id && (
                            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                              <Crown className="w-3 h-3" /> 协调员
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--sage-500)]">
                          {entity.role} · {entity.status === 'online' ? '在线' : entity.status === 'busy' ? '忙碌' : '离线'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleChatWithAgent(entity.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-[var(--sage-500)] bg-white border opacity-0 group-hover:opacity-100 transition-all hover:bg-[var(--sage-500)] hover:text-white"
                        style={{ borderColor: 'var(--sage-200)' }}
                      >
                        <MessageSquare className="w-3 h-3" />
                        对话
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--sage-400)] text-center py-6">暂无 Agent 成员</p>
              )}
            </div>

            {/* Group Members */}
            {groupMembers.length > 0 && (
              <div className="card p-4">
                <h3 className="font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
                  <TreePine className="w-4 h-4" /> 嵌套群组 ({groupMembers.length})
                </h3>
                <div className="space-y-2">
                  {groupMembers.map((entity) => (
                    <div
                      key={entity.id}
                      className="flex items-center gap-3 bg-purple-50 rounded-lg px-3 py-2.5"
                    >
                      <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <TreePine className="w-4 h-4 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--sage-800)]">{entity.name}</div>
                        <div className="text-[11px] text-[var(--sage-500)]">嵌套群组</div>
                      </div>
                      <button
                        onClick={() => navigate(`/groups/${entity.id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-purple-600 bg-purple-100 hover:bg-purple-200 transition-colors"
                      >
                        查看详情
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="card p-4">
              <h3 className="font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
                <History className="w-4 h-4" /> 执行历史
              </h3>
              {executionHistory.length > 0 ? (
                <div className="space-y-2">
                  {executionHistory.map((ex) => (
                    <div key={ex.id} className="bg-[var(--sage-50)] rounded-lg px-3 py-3">
                      <div className="flex items-center gap-3 mb-1.5">
                        <ExecutionStatusBadge status={ex.status} />
                        <span className="text-sm font-medium text-[var(--sage-800)]">{ex.timestamp}</span>
                        <span className="text-xs text-[var(--sage-400)] ml-auto">{ex.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--sage-500)]">
                        <span>触发: {ex.triggeredBy}</span>
                      </div>
                      {ex.output && (
                        <div className="mt-2 text-sm text-[var(--sage-600)] bg-white rounded-lg px-3 py-2" style={{ border: '1px solid var(--sage-200)' }}>
                          {ex.output}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="w-10 h-10 text-[var(--sage-300)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--sage-400)]">暂无执行记录</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="card p-4 max-w-lg">
              <h3 className="font-semibold text-[var(--sage-800)] mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4" /> 群组设置
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--sage-100)' }}>
                  <div>
                    <div className="text-sm font-medium text-[var(--sage-800)]">群组ID</div>
                    <div className="text-xs text-[var(--sage-400)] font-mono">{group.id}</div>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(group.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[var(--sage-100)] text-[var(--sage-500)] hover:bg-[var(--sage-200)] transition-colors"
                  >
                    复制
                  </button>
                </div>
                <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--sage-100)' }}>
                  <div>
                    <div className="text-sm font-medium text-[var(--sage-800)]">执行模式</div>
                    <div className="text-xs text-[var(--sage-400)]">{typeLabels[group.type]}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-[var(--sage-100)] text-[var(--sage-500)]">{group.type}</span>
                </div>
                <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--sage-100)' }}>
                  <div>
                    <div className="text-sm font-medium text-[var(--sage-800)]">成员类型</div>
                    <div className="text-xs text-[var(--sage-400)]">
                      {group.entityType === 'mixed' ? 'Agent + 群组混合' : group.entityType === 'groups' ? '仅群组' : '仅Agent'}
                    </div>
                  </div>
                </div>
                {group.coordinatorId && (
                  <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--sage-100)' }}>
                    <div>
                      <div className="text-sm font-medium text-[var(--sage-800)]">协调员</div>
                      <div className="text-xs text-[var(--sage-400)]">{group.coordinatorName} ({group.coordinatorId})</div>
                    </div>
                  </div>
                )}
                <div className="pt-2">
                  <button
                    onClick={handleDisband}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    解散群组
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddMember && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl w-full max-w-md p-6"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[var(--sage-800)]">添加成员</h2>
                <button onClick={() => { setShowAddMember(false); setSelectedToAdd([]) }} className="p-1.5 hover:bg-[var(--sage-100)] rounded-lg">
                  <X className="w-4 h-4 text-[var(--sage-400)]" />
                </button>
              </div>
              {availableAgents.length > 0 ? (
                <div className="space-y-1 max-h-64 overflow-y-auto mb-4">
                  {availableAgents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setSelectedToAdd((prev) =>
                          prev.includes(agent.id) ? prev.filter((id) => id !== agent.id) : [...prev, agent.id]
                        )
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        selectedToAdd.includes(agent.id) ? 'bg-[var(--sage-50)]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          selectedToAdd.includes(agent.id) ? 'bg-[var(--sage-500)] border-[var(--sage-500)]' : 'border-[var(--sage-300)]'
                        }`}
                      >
                        {selectedToAdd.includes(agent.id) && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: 'var(--sage-500)' }}
                      >
                        {agent.name[0]}
                      </div>
                      <span className="text-sm text-[var(--sage-700)]">{agent.name}</span>
                      <span className="text-[10px] text-[var(--sage-400)] ml-auto">{agent.id}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--sage-400)] text-center py-6 mb-4">没有可添加的 Agent</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAddMember(false); setSelectedToAdd([]) }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-[var(--sage-100)] text-[var(--sage-600)] hover:bg-[var(--sage-200)] transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddMembers}
                  disabled={selectedToAdd.length === 0}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: 'var(--sage-500)' }}
                >
                  添加 {selectedToAdd.length > 0 ? `(${selectedToAdd.length})` : ''}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remove Member Modal */}
      <AnimatePresence>
        {showRemoveMember && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl w-full max-w-md p-6"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[var(--sage-800)]">移除成员</h2>
                <button onClick={() => { setShowRemoveMember(false); setSelectedToRemove([]) }} className="p-1.5 hover:bg-[var(--sage-100)] rounded-lg">
                  <X className="w-4 h-4 text-[var(--sage-400)]" />
                </button>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto mb-4">
                {group.entities?.map((entity) => (
                  <button
                    key={entity.id}
                    onClick={() => {
                      setSelectedToRemove((prev) =>
                        prev.includes(entity.id) ? prev.filter((id) => id !== entity.id) : [...prev, entity.id]
                      )
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      selectedToRemove.includes(entity.id) ? 'bg-red-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        selectedToRemove.includes(entity.id) ? 'bg-red-500 border-red-500' : 'border-[var(--sage-300)]'
                      }`}
                    >
                      {selectedToRemove.includes(entity.id) && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    {entity.type === 'agent' ? (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: entity.accentColor || 'var(--sage-500)' }}
                      >
                        {entity.name[0]}
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <TreePine className="w-3.5 h-3.5 text-purple-500" />
                      </div>
                    )}
                    <span className="text-sm text-[var(--sage-700)]">{entity.name}</span>
                    <span className="text-[10px] text-[var(--sage-400)] ml-auto">{entity.type === 'agent' ? 'Agent' : '群组'}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowRemoveMember(false); setSelectedToRemove([]) }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-[var(--sage-100)] text-[var(--sage-600)] hover:bg-[var(--sage-200)] transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleRemoveMembers}
                  disabled={selectedToRemove.length === 0}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  移除 {selectedToRemove.length > 0 ? `(${selectedToRemove.length})` : ''}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Nested Group Tree Component ────────────────────────────────── */

function NestedGroupTree({
  group,
  expandedIds,
  toggleExpand,
  onNavigate,
}: {
  group: Group
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
  onNavigate: (path: string) => void
}) {
  return (
    <div className="space-y-1">
      {/* Current Group */}
      <TreeItem
        group={group}
        level={0}
        isRoot
        expandedIds={expandedIds}
        toggleExpand={toggleExpand}
        onNavigate={onNavigate}
      />
    </div>
  )
}

function TreeItem({
  group,
  level,
  isRoot,
  expandedIds,
  toggleExpand,
  onNavigate,
}: {
  group: Group
  level: number
  isRoot?: boolean
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
  onNavigate: (path: string) => void
}) {
  const isExpanded = expandedIds.has(group.id)
  const hasChildren = group.children && group.children.length > 0
  const hasGroupEntities = group.entities?.some((e) => e.type === 'group')
  const indent = level * 24
  const TypeIcon = typeIcons[group.type] || Users

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          isRoot ? 'bg-[var(--sage-100)]' : 'hover:bg-[var(--sage-50)]'
        }`}
        style={{ marginLeft: indent }}
      >
        {/* Expand toggle */}
        <button
          onClick={() => toggleExpand(group.id)}
          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--sage-200)] transition-colors"
        >
          {(hasChildren || hasGroupEntities) ? (
            isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[var(--sage-500)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--sage-500)]" />
          ) : (
            <div className="w-3.5 h-3.5" />
          )}
        </button>

        <TypeIcon className="w-4 h-4 text-[var(--sage-500)] flex-shrink-0" />
        <span className={`text-sm font-medium ${isRoot ? 'text-[var(--sage-800)]' : 'text-[var(--sage-700)]'}`}>
          {group.name}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--sage-100)] text-[var(--sage-500)] flex-shrink-0">
          {typeLabels[group.type]}
        </span>
        {group.status === 'paused' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 flex-shrink-0">
            已暂停
          </span>
        )}

        {/* Entity badges */}
        <div className="ml-auto flex items-center gap-1.5">
          {group.entities?.map((e) => (
            <span key={e.id} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white" style={{ border: '1px solid var(--sage-200)' }}>
              {e.type === 'agent' ? <User className="w-2.5 h-2.5" /> : <TreePine className="w-2.5 h-2.5 text-purple-400" />}
              {e.name}
            </span>
          ))}
          {!isRoot && (
            <button
              onClick={() => onNavigate(`/groups/${group.id}`)}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--sage-500)] text-white hover:bg-[var(--sage-600)] transition-colors flex-shrink-0"
            >
              详情
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      <AnimatePresence>
        {(hasChildren || hasGroupEntities) && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-1">
              {/* Group entities that are groups */}
              {group.entities
                ?.filter((e) => e.type === 'group')
                .map((e) => {
                  const childGroup = group.children?.find((c) => c.id === e.id)
                  if (childGroup) {
                    return (
                      <TreeItem
                        key={e.id}
                        group={childGroup}
                        level={level + 1}
                        expandedIds={expandedIds}
                        toggleExpand={toggleExpand}
                        onNavigate={onNavigate}
                      />
                    )
                  }
                  // Standalone group entity (no full data)
                  return (
                    <div
                      key={e.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--sage-50)] transition-colors"
                      style={{ marginLeft: (level + 1) * 24 }}
                    >
                      <div className="w-3.5 h-3.5 flex-shrink-0" />
                      <TreePine className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-[var(--sage-700)]">{e.name}</span>
                      <button
                        onClick={() => onNavigate(`/groups/${e.id}`)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors ml-auto"
                      >
                        详情
                      </button>
                    </div>
                  )
                })}
              {/* Direct children not in entities list */}
              {group.children
                ?.filter((c) => !group.entities?.some((e) => e.id === c.id))
                .map((child) => (
                  <TreeItem
                    key={child.id}
                    group={child}
                    level={level + 1}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                    onNavigate={onNavigate}
                  />
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
