import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Plus,
  Search,
  Settings,
  Activity,
  MessageSquare,
  Zap,
  GitMerge,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  Crown,
  Shield,
  Hammer,
  BarChart3,
  Layers,
  Network,
} from 'lucide-react'
import {
  fetchGroups,
  createGroup,
  deleteGroup,
  getGroupStatus,
  updateGroupStatus,
  getGroupMeetings,
  startGroupMeeting,
  getGroupConflicts,
  resolveGroupConflict,
  getGroupHealth,
  getGroupHierarchy,
  getGroupGovernance,
  triggerGroupReorganize,
  addAgentToGroup,
  removeAgentFromGroup,
  assignCoordinator,
  nestGroup,
  executeGroup,
} from '@/api/client'

/* ── Types ──────────────────────────────────────────────────────── */

interface GroupMember {
  id: string
  name: string
  role: string
  status: 'online' | 'offline' | 'busy'
  avatarType?: string
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

interface Group {
  id: string
  name: string
  type: 'sequential' | 'parallel' | 'hierarchical' | 'dynamic'
  status: 'active' | 'paused' | 'completed'
  description: string
  members: GroupMember[]
  tasks: GroupTask[]
  health?: { overall: string; issues: string[] }
  hierarchy?: { level: number; children: string[] }
  accentColor?: string
}

interface Governance {
  provinces: {
    zhongshu: { name: string; subtitle: string; agents: any[]; stats: Record<string, any> }
    menxia: { name: string; subtitle: string; agents: any[]; stats: Record<string, any> }
    shangshu: { name: string; subtitle: string; agents: any[]; stats: Record<string, any> }
  }
  ministries: Record<string, { name: string; subtitle: string; agents?: number; stats?: Record<string, any> }>
}

/* ── Component ──────────────────────────────────────────────────── */

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [governance, setGovernance] = useState<Governance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'governance' | 'hierarchy' | 'health'>('overview')
  const [executing, setExecuting] = useState(false)
  const [nesting, setNesting] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [showAddAgent, setShowAddAgent] = useState(false)
  const [agentIdInput, setAgentIdInput] = useState('')
  const [coordinatorIdInput, setCoordinatorIdInput] = useState('')
  const [parentIdInput, setParentIdInput] = useState('')

  /* Load groups */
  useEffect(() => {
    loadGroups()
  }, [])

  async function loadGroups() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchGroups()
      setGroups(res.data || [])
      if (res.data?.length > 0) {
        setSelectedGroup(res.data[0])
      }
    } catch (e: any) {
      console.error(e)
      setError(e?.message || '加载协作组失败')
    } finally {
      setLoading(false)
    }
  }

  /* Load governance when group selected */
  useEffect(() => {
    if (!selectedGroup) return
    loadGovernance(selectedGroup.id)
  }, [selectedGroup?.id])

  async function loadGovernance(groupId: string) {
    try {
      const res = await getGroupGovernance(groupId)
      setGovernance(res.data)
    } catch (e: any) {
      console.error('Governance load failed', e)
      setError(e?.message || '加载治理信息失败')
    }
  }

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.description.toLowerCase().includes(search.toLowerCase())
  )

  const typeIcons: Record<string, React.ElementType> = {
    sequential: Clock,
    parallel: Layers,
    hierarchical: Network,
    dynamic: RefreshCw,
  }

  const typeLabels: Record<string, string> = {
    sequential: '顺序',
    parallel: '并行',
    hierarchical: '层级',
    dynamic: '动态',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--sage-800)]">协作组管理</h1>
          <p className="text-[var(--sage-500)] mt-1">
            三省六部治理 · 动态重组 · 多等级层级
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新建协作组
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 text-red-600 rounded-card px-4 py-3 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            ✕
          </button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar — Group List */}
        <div className="w-72 space-y-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
            <input
              type="text"
              placeholder="搜索协作组..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
              style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-[var(--sage-500)]">加载中...</div>
          ) : filtered.length === 0 ? (
            <div className="card text-center py-8">
              <Users className="w-10 h-10 text-[var(--sage-400)] mx-auto mb-2" />
              <p className="text-[var(--sage-500)]">暂无协作组</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((group) => {
                const TypeIcon = typeIcons[group.type] || Users
                const isSelected = selectedGroup?.id === group.id
                return (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    className={`w-full text-left p-3 rounded-card-sm transition-all ${
                      isSelected
                        ? 'bg-[var(--sage-500)] text-white'
                        : 'bg-white hover:bg-[var(--sage-100)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <TypeIcon className="w-4 h-4" />
                      <span className="font-medium text-sm">{group.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ml-auto ${
                          group.status === 'active'
                            ? 'bg-green-500/20 text-green-600'
                            : group.status === 'paused'
                            ? 'bg-amber-500/20 text-amber-600'
                            : 'bg-[var(--sage-200)] text-[var(--sage-500)]'
                        }`}
                      >
                        {group.status === 'active' ? '运行中' : group.status === 'paused' ? '已暂停' : '已完成'}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${isSelected ? 'text-white/70' : 'text-[var(--sage-500)]'}`}>
                      {group.members.length} 成员 · {group.tasks.length} 任务 · {typeLabels[group.type]}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {selectedGroup ? (
            <div className="space-y-4">
              {/* Group Header Card */}
              <div className="card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <Users className="w-6 h-6 text-[var(--sage-500)]" />
                      <h2 className="text-lg font-bold text-[var(--sage-800)]">{selectedGroup.name}</h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--sage-100)] text-[var(--sage-600)]">
                        {typeLabels[selectedGroup.type]}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--sage-500)] mt-1">{selectedGroup.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          setExecuting(true)
                          await executeGroup(selectedGroup.id)
                          loadGroups()
                        } catch (e: any) {
                          console.error(e)
                          setError(e?.message || '执行失败')
                        } finally {
                          setExecuting(false)
                        }
                      }}
                      disabled={executing}
                      className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                      title="执行群组"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await updateGroupStatus(selectedGroup.id, {
                            status: selectedGroup.status === 'active' ? 'paused' : 'active',
                          })
                          loadGroups()
                        } catch (e: any) {
                          console.error(e)
                          setError(e?.message || '状态更新失败')
                        }
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        selectedGroup.status === 'active'
                          ? 'text-amber-500 hover:bg-amber-500/10'
                          : 'text-green-500 hover:bg-green-500/10'
                      }`}
                      title={selectedGroup.status === 'active' ? '暂停' : '启动'}
                    >
                      {selectedGroup.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await triggerGroupReorganize(selectedGroup.id, { strategy: 'auto' })
                          loadGovernance(selectedGroup.id)
                        } catch (e: any) {
                          console.error(e)
                          setError(e?.message || '重组失败')
                        }
                      }}
                      className="p-2 text-[var(--sage-500)] hover:text-[var(--sage-700)] hover:bg-[var(--sage-100)] rounded-lg transition-colors"
                      title="动态重组"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm('确定删除此协作组？')) return
                        try {
                          await deleteGroup(selectedGroup.id)
                          loadGroups()
                        } catch (e) { console.error(e) }
                      }}
                      className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-3 mt-4">
                  {[
                    { label: '成员', value: selectedGroup.members.length, icon: Users },
                    { label: '任务', value: selectedGroup.tasks.length, icon: CheckCircle },
                    { label: '运行中', value: selectedGroup.tasks.filter((t) => t.status === 'in_progress').length, icon: Activity },
                    { label: '层级', value: selectedGroup.hierarchy?.level || 1, icon: Layers },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-[var(--sage-50)] rounded-card-sm p-3 text-center">
                      <stat.icon className="w-4 h-4 text-[var(--sage-400)] mx-auto mb-1" />
                      <div className="text-lg font-bold text-[var(--sage-800)]">{stat.value}</div>
                      <div className="text-xs text-[var(--sage-500)]">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 border-b">
                {[
                  { id: 'overview', label: '概览', icon: BarChart3 },
                  { id: 'governance', label: '三省六部', icon: Crown },
                  { id: 'hierarchy', label: '层级结构', icon: Network },
                  { id: 'health', label: '健康', icon: Activity },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
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
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4"
                  >
                    {/* Members */}
                    <div className="card p-4">
                      <h3 className="font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" /> 成员
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedGroup.members.map((m) => (
                          <div key={m.id} className="flex items-center gap-2 bg-[var(--sage-50)] rounded-lg px-3 py-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: m.accentColor || 'var(--sage-500)' }}
                            >
                              {m.name[0]}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-[var(--sage-800)]">{m.name}</div>
                              <div className="text-[10px] text-[var(--sage-500)]">
                                {m.role} · {m.status === 'online' ? '在线' : m.status === 'busy' ? '忙碌' : '离线'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tasks */}
                    <div className="card p-4">
                      <h3 className="font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> 任务
                      </h3>
                      <div className="space-y-2">
                        {selectedGroup.tasks.map((task) => (
                          <div key={task.id} className="flex items-center gap-3 bg-[var(--sage-50)] rounded-lg px-3 py-2">
                            <div className={`w-2 h-2 rounded-full ${
                              task.status === 'completed' ? 'bg-green-500' :
                              task.status === 'in_progress' ? 'bg-amber-500' :
                              'bg-[var(--sage-300)]'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-[var(--sage-800)] truncate">{task.title}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <div className="flex-1 h-1 bg-[var(--sage-200)] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[var(--sage-500)] rounded-full transition-all"
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-[var(--sage-500)]">{task.progress}%</span>
                              </div>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              task.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                              task.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                              'bg-[var(--sage-100)] text-[var(--sage-500)]'
                            }`}>
                              {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Management Actions */}
                    <div className="card p-4">
                      <h3 className="font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4" /> 管理操作
                      </h3>
                      <div className="space-y-3">
                        {/* Add Agent */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Agent ID"
                            value={agentIdInput}
                            onChange={(e) => setAgentIdInput(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border text-sm"
                            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                          />
                          <button
                            onClick={async () => {
                              if (!agentIdInput.trim()) return
                              try {
                                await addAgentToGroup(selectedGroup.id, agentIdInput.trim())
                                setAgentIdInput('')
                                loadGroups()
                              } catch (e: any) {
                                setError(e?.message || '添加成员失败')
                              }
                            }}
                            className="px-3 py-2 bg-[var(--sage-500)] text-white rounded-lg text-sm hover:bg-[var(--sage-600)] transition-colors"
                          >
                            添加成员
                          </button>
                        </div>

                        {/* Assign Coordinator */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="协调员 Agent ID"
                            value={coordinatorIdInput}
                            onChange={(e) => setCoordinatorIdInput(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border text-sm"
                            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                          />
                          <button
                            onClick={async () => {
                              if (!coordinatorIdInput.trim()) return
                              try {
                                setAssigning(true)
                                await assignCoordinator(selectedGroup.id, coordinatorIdInput.trim())
                                setCoordinatorIdInput('')
                                loadGroups()
                              } catch (e: any) {
                                setError(e?.message || '分配协调员失败')
                              } finally {
                                setAssigning(false)
                              }
                            }}
                            disabled={assigning}
                            className="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 transition-colors disabled:opacity-50"
                          >
                            {assigning ? '分配中...' : '分配协调员'}
                          </button>
                        </div>

                        {/* Nest Group */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="父群组 ID"
                            value={parentIdInput}
                            onChange={(e) => setParentIdInput(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border text-sm"
                            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                          />
                          <button
                            onClick={async () => {
                              if (!parentIdInput.trim()) return
                              try {
                                setNesting(true)
                                await nestGroup(selectedGroup.id, parentIdInput.trim())
                                setParentIdInput('')
                                loadGroups()
                              } catch (e: any) {
                                setError(e?.message || '嵌套失败')
                              } finally {
                                setNesting(false)
                              }
                            }}
                            disabled={nesting}
                            className="px-3 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-colors disabled:opacity-50"
                          >
                            {nesting ? '嵌套中...' : '嵌套到父组'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'governance' && governance && (
                  <motion.div
                    key="governance"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4"
                  >
                    {/* 三省 */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        {
                          key: 'zhongshu',
                          icon: Crown,
                          title: governance.provinces.zhongshu.name,
                          subtitle: governance.provinces.zhongshu.subtitle,
                          color: '#8b5cf6',
                          agents: governance.provinces.zhongshu.agents,
                        },
                        {
                          key: 'menxia',
                          icon: Shield,
                          title: governance.provinces.menxia.name,
                          subtitle: governance.provinces.menxia.subtitle,
                          color: '#f59e0b',
                          agents: governance.provinces.menxia.agents,
                        },
                        {
                          key: 'shangshu',
                          icon: Hammer,
                          title: governance.provinces.shangshu.name,
                          subtitle: governance.provinces.shangshu.subtitle,
                          color: '#10b981',
                          agents: governance.provinces.shangshu.agents,
                        },
                      ].map((province) => (
                        <div key={province.key} className="card p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <province.icon className="w-5 h-5" style={{ color: province.color }} />
                            <div>
                              <div className="font-semibold text-[var(--sage-800)]">{province.title}</div>
                              <div className="text-xs text-[var(--sage-500)]">{province.subtitle}</div>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            {province.agents.map((a: any) => (
                              <div key={a.id} className="flex items-center gap-2 text-sm">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]" style={{ backgroundColor: province.color }}>
                                  {a.name[0]}
                                </div>
                                <span className="text-[var(--sage-700)]">{a.name}</span>
                                <span className="text-[10px] text-[var(--sage-400)] ml-auto">{a.role}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 六部 */}
                    <div className="card p-4">
                      <h3 className="font-semibold text-[var(--sage-800)] mb-3">六部职能映射</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {Object.entries(governance.ministries).map(([key, ministry]: [string, any]) => (
                          <div key={key} className="bg-[var(--sage-50)] rounded-card-sm p-3">
                            <div className="font-medium text-sm text-[var(--sage-800)]">{ministry.name}</div>
                            <div className="text-xs text-[var(--sage-500)]">{ministry.subtitle}</div>
                            <div className="mt-2 text-xs text-[var(--sage-600)]">
                              {ministry.agents !== undefined && <div>人员: {ministry.agents}</div>}
                              {ministry.stats && Object.entries(ministry.stats).map(([k, v]) => (
                                <div key={k}>{k}: {String(v)}</div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'hierarchy' && (
                  <motion.div
                    key="hierarchy"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="card p-4"
                  >
                    <h3 className="font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
                      <Network className="w-4 h-4" /> 多等级层级结构
                    </h3>
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-[var(--sage-500)] text-white flex items-center justify-center mx-auto mb-2 text-lg font-bold">
                          L{selectedGroup.hierarchy?.level || 1}
                        </div>
                        <div className="text-sm text-[var(--sage-800)] font-medium">{selectedGroup.name}</div>
                        <div className="text-xs text-[var(--sage-500)] mt-1">
                          当前层级: {selectedGroup.hierarchy?.level || 1}
                          {selectedGroup.hierarchy?.children && selectedGroup.hierarchy.children.length > 0 &&
                            ` · 子组: ${selectedGroup.hierarchy.children.length} 个`}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'health' && (
                  <motion.div
                    key="health"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="card p-4"
                  >
                    <h3 className="font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> 健康状态
                    </h3>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedGroup.health?.overall === 'healthy' ? 'bg-green-500' :
                        selectedGroup.health?.overall === 'warning' ? 'bg-amber-500' :
                        'bg-red-500'
                      }`} />
                      <span className="text-sm text-[var(--sage-700)]">
                        {selectedGroup.health?.overall === 'healthy' ? '健康' :
                         selectedGroup.health?.overall === 'warning' ? '警告' : '异常'}
                      </span>
                    </div>
                    {selectedGroup.health?.issues && selectedGroup.health.issues.length > 0 ? (
                      <div className="space-y-2">
                        {selectedGroup.health.issues.map((issue, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-amber-600 bg-amber-500/5 rounded-lg px-3 py-2">
                            <AlertTriangle className="w-4 h-4" />
                            {issue}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-green-600 bg-green-500/5 rounded-lg px-3 py-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        所有系统正常运行
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="card text-center py-16">
              <Users className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" />
              <p className="text-[var(--sage-500)]">选择一个协作组查看详情</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={loadGroups} />}
    </div>
  )
}

/* ── Create Modal ───────────────────────────────────────────────── */

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'sequential' | 'parallel' | 'hierarchical' | 'dynamic'>('parallel')
  const [desc, setDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await createGroup({
        name: name.trim(),
        type,
        description: desc.trim(),
        members: [],
        tasks: [],
      })
      onCreated()
      onClose()
    } catch (err) {
      console.error(err)
      alert('创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">新建协作组</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--sage-600)] mb-1">名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--sage-200)' }}
              placeholder="例如：数据分析蜂群"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--sage-600)] mb-1">类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--sage-200)' }}
            >
              <option value="sequential">顺序执行</option>
              <option value="parallel">并行执行</option>
              <option value="hierarchical">层级结构</option>
              <option value="dynamic">动态重组</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[var(--sage-600)] mb-1">描述</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--sage-200)' }}
              rows={3}
              placeholder="描述此协作组的职责..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">取消</button>
            <button type="submit" disabled={submitting} className="flex-1 btn-primary">
              {submitting ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
