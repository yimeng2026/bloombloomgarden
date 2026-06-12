import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Plus,
  Search,
  Activity,
  ChevronRight,
  ChevronDown,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  Crown,
  TreePine,
  User,
  Clock,
  Layers,
  Network,
  Zap,
  AlertTriangle,
  X,
  Check,
  UserPlus,
  Settings,
  ArrowRight,
  GitBranch,
  MessageCircle,
  Radio,
  CheckCircle,
  LayoutGrid,
  Loader2,
} from 'lucide-react'
import {
  fetchGroups,
  createGroup,
  deleteGroup,
  executeGroup,
  updateGroupStatus,
  fetchAgents,
  fetchGroupStats,
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

interface Group {
  id: string
  name: string
  entityType: 'mixed' | 'agents' | 'groups'
  type: 'sequential' | 'parallel' | 'hierarchical' | 'dynamic'
  groupType?: string
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
  color?: string
  icon?: string
  roleDefinitions?: Record<string, any>
  strategy?: Record<string, any>
  outputFormat?: string
  createdAt?: string
}

interface GroupStats {
  total: number
  active: number
  paused: number
  byType?: Record<string, number>
}

/* ── Group Type Config ──────────────────────────────────────────── */

const GROUP_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  swarm: { label: '蜂群', icon: Zap, color: '#3B82F6' },
  pipeline: { label: '流水线', icon: GitBranch, color: '#10B981' },
  committee: { label: '委员会', icon: Users, color: '#8B5CF6' },
  debate: { label: '辩论', icon: MessageCircle, color: '#F59E0B' },
  'review-chain': { label: '审查链', icon: CheckCircle, color: '#EC4899' },
  broadcast: { label: '广播', icon: Radio, color: '#14B8A6' },
}

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

/* ── Tree Node Component ────────────────────────────────────────── */

function TreeNode({
  group,
  level,
  expandedIds,
  toggleExpand,
  selectedId,
  onSelect,
  onDelete,
  onExecute,
  onToggleStatus,
}: {
  group: Group
  level: number
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
  selectedId: string | null
  onSelect: (g: Group) => void
  onDelete: (id: string) => void
  onExecute: (id: string) => void
  onToggleStatus: (id: string, currentStatus: string) => void
}) {
  const isExpanded = expandedIds.has(group.id)
  const isSelected = selectedId === group.id
  const hasChildren = group.children && group.children.length > 0
  const TypeIcon = typeIcons[group.type] || Users
  const indent = level * 20

  const groupTypeConfig = group.groupType ? GROUP_TYPE_CONFIG[group.groupType] : null
  const groupTypeColor = groupTypeConfig?.color || group.color || group.accentColor || 'var(--sage-500)'

  return (
    <div>
      <div
        className={`group flex items-center gap-2 p-3 rounded-card-sm transition-all cursor-pointer ${
          isSelected
            ? 'bg-[var(--sage-500)] text-white'
            : 'bg-white hover:bg-[var(--sage-100)]'
        }`}
        style={{ marginLeft: indent }}
        onClick={() => onSelect(group)}
      >
        {/* Expand toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleExpand(group.id)
          }}
          className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors ${
            isSelected ? 'hover:bg-white/20' : 'hover:bg-[var(--sage-200)]'
          }`}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )
          ) : (
            <div className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Icon */}
        <TypeIcon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-white' : 'text-[var(--sage-500)]'}`} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{group.name}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                group.status === 'active'
                  ? isSelected ? 'bg-green-500/30 text-white' : 'bg-green-500/15 text-green-600'
                  : group.status === 'paused'
                  ? isSelected ? 'bg-amber-500/30 text-white' : 'bg-amber-500/15 text-amber-600'
                  : isSelected ? 'bg-white/20 text-white/80' : 'bg-[var(--sage-200)] text-[var(--sage-500)]'
              }`}
            >
              {group.status === 'active' ? '运行中' : group.status === 'paused' ? '已暂停' : '已完成'}
            </span>
            {group.groupType && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 text-white"
                style={{ backgroundColor: groupTypeColor }}
              >
                {groupTypeConfig?.label || group.groupType}
              </span>
            )}
          </div>
          <p className={`text-xs mt-0.5 truncate ${isSelected ? 'text-white/70' : 'text-[var(--sage-500)]'}`}>
            {(group.entities?.length || group.entityIds?.length || 0)} 成员 · {typeLabels[group.type]}
            {group.coordinatorName && ` · 协调: ${group.coordinatorName}`}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onExecute(group.id) }}
            className={`p-1.5 rounded transition-colors ${isSelected ? 'hover:bg-white/20 text-white/80' : 'hover:bg-[var(--sage-200)] text-[var(--sage-500)]'}`}
            title="执行"
          >
            <Zap className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleStatus(group.id, group.status) }}
            className={`p-1.5 rounded transition-colors ${isSelected ? 'hover:bg-white/20 text-white/80' : 'hover:bg-[var(--sage-200)] text-[var(--sage-500)]'}`}
            title={group.status === 'active' ? '暂停' : '启动'}
          >
            {group.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(group.id) }}
            className={`p-1.5 rounded transition-colors ${isSelected ? 'hover:bg-white/20 text-white/80' : 'hover:bg-red-100 text-red-400'}`}
            title="删除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-1">
              {group.children!.map((child) => (
                <TreeNode
                  key={child.id}
                  group={child}
                  level={level + 1}
                  expandedIds={expandedIds}
                  toggleExpand={toggleExpand}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onExecute={onExecute}
                  onToggleStatus={onToggleStatus}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Flatten groups for search ──────────────────────────────────── */

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

function searchGroups(groups: Group[], query: string): Group[] {
  if (!query.trim()) return groups
  const q = query.toLowerCase()
  const all = flattenGroups(groups)
  const matched = all.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.coordinatorName?.toLowerCase().includes(q) ||
      g.groupType?.toLowerCase().includes(q)
  )
  return groups.filter((g) => {
    const flat = flattenGroups([g])
    return flat.some((fg) => fg.name.toLowerCase().includes(q) || fg.description.toLowerCase().includes(q))
  })
}

/* ── Main Component ─────────────────────────────────────────────── */

export default function Groups() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [stats, setStats] = useState<GroupStats>({ total: 0, active: 0, paused: 0 })
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    loadGroups()
    loadStats()
  }, [])

  async function loadGroups() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchGroups()
      const data = res.data || res || []
      if (Array.isArray(data) && data.length > 0) {
        setGroups(data)
        setSelectedGroup(data[0])
      } else {
        setGroups([])
      }
    } catch (e: any) {
      console.error(e)
      setError('加载群组失败: ' + e.message)
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      setStatsLoading(true)
      const res = await fetchGroupStats()
      const data = res.data || res || {}
      setStats({
        total: data.total || 0,
        active: data.active || 0,
        paused: data.paused || 0,
        byType: data.byType || {},
      })
    } catch (e) {
      console.error('Failed to load group stats:', e)
    } finally {
      setStatsLoading(false)
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelect(group: Group) {
    setSelectedGroup(group)
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此协作组？')) return
    try {
      await deleteGroup(id)
      loadGroups()
    } catch (e) {
      console.error(e)
      const removeGroup = (list: Group[]): Group[] =>
        list
          .filter((g) => g.id !== id)
          .map((g) => ({
            ...g,
            children: g.children ? removeGroup(g.children) : undefined,
          }))
      setGroups((prev) => removeGroup(prev))
      if (selectedGroup?.id === id) setSelectedGroup(null)
    }
  }

  async function handleExecute(id: string) {
    setExecutingId(id)
    try {
      await executeGroup(id)
    } catch (e) {
      console.error(e)
    } finally {
      setExecutingId(null)
    }
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    try {
      await updateGroupStatus(id, {
        status: currentStatus === 'active' ? 'paused' : 'active',
      })
      loadGroups()
    } catch (e) {
      console.error(e)
      const updateStatus = (list: Group[]): Group[] =>
        list.map((g) => {
          if (g.id === id) {
            return { ...g, status: g.status === 'active' ? 'paused' : 'active' as any }
          }
          return { ...g, children: g.children ? updateStatus(g.children) : undefined }
        })
      setGroups((prev) => updateStatus(prev))
      if (selectedGroup?.id === id) {
        setSelectedGroup((prev) =>
          prev ? { ...prev, status: prev.status === 'active' ? 'paused' : 'active' as any } : null
        )
      }
    }
  }

  const filteredGroups = searchGroups(groups, search).filter(g =>
    typeFilter === 'all' || g.groupType === typeFilter
  )
  const totalCount = flattenGroups(groups).length

  // Unique group types for filter
  const typeOptions = Array.from(new Set(groups.map(g => g.groupType).filter(Boolean)))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--sage-800)]">协作组管理</h1>
          <p className="text-[var(--sage-500)] mt-1">
            递归群组组合 · 树形层级 · {totalCount} 个群组
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          创建群组
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '全部', value: statsLoading ? '—' : stats.total, icon: LayoutGrid, color: 'bg-[var(--sage-500)]' },
          { label: '运行中', value: statsLoading ? '—' : stats.active, icon: CheckCircle, color: 'bg-green-500' },
          { label: '已暂停', value: statsLoading ? '—' : stats.paused, icon: Pause, color: 'bg-amber-500' },
        ].map((stat) => (
          <button
            key={stat.label}
            className="flex items-center gap-3 px-4 py-3 rounded-card text-sm bg-white hover:bg-[var(--sage-50)] transition-colors"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color} text-white`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs text-[var(--sage-500)]">{stat.label}</div>
              <div className="text-lg font-bold text-[var(--sage-800)]">{stat.value}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Type Filter */}
      {typeOptions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[var(--sage-500)] mr-1">按类型筛选:</span>
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
              typeFilter === 'all'
                ? 'bg-[var(--sage-500)] text-white'
                : 'bg-[var(--sage-100)] text-[var(--sage-600)] hover:bg-[var(--sage-200)]'
            }`}
          >
            全部
          </button>
          {typeOptions.map((type) => {
            const config = GROUP_TYPE_CONFIG[type]
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                  typeFilter === type
                    ? 'text-white'
                    : 'bg-[var(--sage-100)] text-[var(--sage-600)] hover:bg-[var(--sage-200)]'
                }`}
                style={typeFilter === type ? { backgroundColor: config?.color || '#6B7280' } : {}}
              >
                {config?.label || type}
              </button>
            )
          })}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 text-red-600 rounded-card px-4 py-3 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar — Tree List */}
        <div className="w-80 space-y-3 flex-shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
            <input
              type="text"
              placeholder="搜索群组..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
              style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
            />
          </div>

          {/* Expand/Collapse All */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                const allIds = new Set(flattenGroups(groups).map((g) => g.id))
                setExpandedIds(allIds)
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-white border text-[var(--sage-500)] hover:bg-[var(--sage-100)] transition-colors"
              style={{ borderColor: 'var(--sage-200)' }}
            >
              展开全部
            </button>
            <button
              onClick={() => setExpandedIds(new Set())}
              className="text-xs px-3 py-1.5 rounded-lg bg-white border text-[var(--sage-500)] hover:bg-[var(--sage-100)] transition-colors"
              style={{ borderColor: 'var(--sage-200)' }}
            >
              折叠全部
            </button>
          </div>

          {/* Tree */}
          {loading ? (
            <div className="text-center py-8 text-[var(--sage-500)]">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              加载中...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="card text-center py-8">
              <Users className="w-10 h-10 text-[var(--sage-400)] mx-auto mb-2" />
              <p className="text-[var(--sage-500)]">暂无协作组</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredGroups.map((group) => (
                <TreeNode
                  key={group.id}
                  group={group}
                  level={0}
                  expandedIds={expandedIds}
                  toggleExpand={toggleExpand}
                  selectedId={selectedGroup?.id || null}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                  onExecute={handleExecute}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </div>
          )}
        </div>

        {/* Main Content — Group Preview */}
        <div className="flex-1 min-w-0">
          {selectedGroup ? (
            <GroupPreview
              group={selectedGroup}
              onNavigate={(id) => navigate(`/groups/${id}`)}
              onExecute={() => handleExecute(selectedGroup.id)}
              onToggleStatus={() => handleToggleStatus(selectedGroup.id, selectedGroup.status)}
              onDelete={() => handleDelete(selectedGroup.id)}
              executing={executingId === selectedGroup.id}
            />
          ) : (
            <div className="card text-center py-16">
              <Users className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" />
              <p className="text-[var(--sage-500)]">选择一个群组查看详情</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateGroupModal
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              loadGroups()
              loadStats()
              setShowCreate(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Group Preview (right panel) ────────────────────────────────── */

function GroupPreview({
  group,
  onNavigate,
  onExecute,
  onToggleStatus,
  onDelete,
  executing,
}: {
  group: Group
  onNavigate: (id: string) => void
  onExecute: () => void
  onToggleStatus: () => void
  onDelete: () => void
  executing: boolean
}) {
  const TypeIcon = typeIcons[group.type] || Users
  const memberCount = group.entities?.length || group.entityIds?.length || 0
  const agentCount = group.entities?.filter((e) => e.type === 'agent').length || 0
  const groupCount = group.entities?.filter((e) => e.type === 'group').length || 0

  const groupTypeConfig = group.groupType ? GROUP_TYPE_CONFIG[group.groupType] : null
  const groupTypeColor = groupTypeConfig?.color || group.color || group.accentColor || 'var(--sage-500)'
  const GroupTypeIcon = groupTypeConfig?.icon || Users

  // Role definitions
  const roleEntries = group.roleDefinitions
    ? Object.entries(group.roleDefinitions)
    : []

  return (
    <motion.div
      key={group.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Header Card */}
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-card flex items-center justify-center"
                style={{ backgroundColor: groupTypeColor + '20' }}
              >
                <GroupTypeIcon className="w-5 h-5" style={{ color: groupTypeColor }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--sage-800)]">{group.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--sage-100)] text-[var(--sage-600)]">
                    {typeLabels[group.type]}
                  </span>
                  <span className="text-xs text-[var(--sage-400)]">·</span>
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
                  {group.groupType && (
                    <>
                      <span className="text-xs text-[var(--sage-400)]">·</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: groupTypeColor }}
                      >
                        {groupTypeConfig?.label || group.groupType}
                      </span>
                    </>
                  )}
                  {group.entityType === 'mixed' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500">
                      混合
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm text-[var(--sage-500)] mt-2">{group.description}</p>

            {/* Strategy & Output */}
            {(group.strategy || group.outputFormat) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {group.strategy && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--sage-50)] text-[var(--sage-500)] border" style={{ borderColor: 'var(--sage-200)' }}>
                    策略: {Object.keys(group.strategy).join(', ')}
                  </span>
                )}
                {group.outputFormat && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--sage-50)] text-[var(--sage-500)] border" style={{ borderColor: 'var(--sage-200)' }}>
                    输出: {group.outputFormat}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onExecute}
              disabled={executing}
              className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
              title="执行群组"
            >
              <Zap className={`w-4 h-4 ${executing ? 'animate-pulse' : ''}`} />
            </button>
            <button
              onClick={onToggleStatus}
              className={`p-2 rounded-lg transition-colors ${
                group.status === 'active'
                  ? 'text-amber-500 hover:bg-amber-500/10'
                  : 'text-green-500 hover:bg-green-500/10'
              }`}
              title={group.status === 'active' ? '暂停' : '启动'}
            >
              {group.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onNavigate(group.id)}
              className="p-2 text-[var(--sage-500)] hover:bg-[var(--sage-100)] rounded-lg transition-colors"
              title="查看详情"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: '成员', value: memberCount, icon: Users },
            { label: 'Agent', value: agentCount, icon: User },
            { label: '子群组', value: groupCount, icon: TreePine },
            { label: '任务', value: group.tasks?.length || 0, icon: Activity },
          ].map((stat) => (
            <div key={stat.label} className="bg-[var(--sage-50)] rounded-card-sm p-3 text-center">
              <stat.icon className="w-4 h-4 text-[var(--sage-400)] mx-auto mb-1" />
              <div className="text-lg font-bold text-[var(--sage-800)]">{stat.value}</div>
              <div className="text-xs text-[var(--sage-500)]">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Definitions */}
      {roleEntries.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" /> 角色分工
          </h3>
          <div className="space-y-2">
            {roleEntries.map(([roleName, roleDef]) => (
              <div
                key={roleName}
                className="flex items-center gap-3 bg-[var(--sage-50)] rounded-lg px-3 py-2.5"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: groupTypeColor }}
                >
                  {roleName[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--sage-800)]">{roleName}</div>
                  <div className="text-[11px] text-[var(--sage-500)]">
                    {typeof roleDef === 'string' ? roleDef : (roleDef?.description || JSON.stringify(roleDef).slice(0, 60))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="card p-4">
        <h3 className="font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> 成员列表
        </h3>
        <div className="space-y-2">
          {group.entities?.map((entity) => (
            <div
              key={entity.id}
              className="flex items-center gap-3 bg-[var(--sage-50)] rounded-lg px-3 py-2.5"
            >
              {entity.type === 'agent' ? (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: entity.accentColor || 'var(--sage-500)' }}
                >
                  {entity.name[0]}
                </div>
              ) : (
                <div
                  className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0"
                >
                  <TreePine className="w-4 h-4 text-purple-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--sage-800)]">{entity.name}</div>
                <div className="text-[11px] text-[var(--sage-500)]">
                  {entity.type === 'agent'
                    ? `${entity.role || 'Agent'} · ${entity.status === 'online' ? '在线' : entity.status === 'busy' ? '忙碌' : '离线'}`
                    : '嵌套群组'}
                </div>
              </div>
              {entity.type === 'agent' && group.coordinatorId === entity.id && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 flex-shrink-0">
                  <Crown className="w-3 h-3" /> 协调员
                </span>
              )}
              {entity.type === 'group' && (
                <button
                  onClick={() => onNavigate(entity.id)}
                  className="text-xs px-2 py-1 rounded-lg bg-[var(--sage-100)] text-[var(--sage-500)] hover:bg-[var(--sage-200)] transition-colors flex-shrink-0"
                >
                  查看
                </button>
              )}
            </div>
          ))}
          {(!group.entities || group.entities.length === 0) && (
            <p className="text-sm text-[var(--sage-400)] text-center py-4">暂无成员</p>
          )}
        </div>
      </div>

      {/* Tasks */}
      {group.tasks && group.tasks.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" /> 任务
          </h3>
          <div className="space-y-2">
            {group.tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 bg-[var(--sage-50)] rounded-lg px-3 py-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    task.status === 'completed'
                      ? 'bg-green-500'
                      : task.status === 'in_progress'
                      ? 'bg-amber-500'
                      : 'bg-[var(--sage-300)]'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--sage-800)]">{task.title}</div>
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
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

/* ── Create Group Modal ─────────────────────────────────────────── */

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'sequential' | 'parallel' | 'hierarchical' | 'dynamic'>('parallel')
  const [groupType, setGroupType] = useState('swarm')
  const [desc, setDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [availableAgents, setAvailableAgents] = useState<{ id: string; name: string }[]>([])
  const [availableGroups, setAvailableGroups] = useState<{ id: string; name: string }[]>([])
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [coordinatorId, setCoordinatorId] = useState('')
  const [activePicker, setActivePicker] = useState<'agents' | 'groups' | null>(null)

  useEffect(() => {
    fetchAgents().then((res: any) => {
      if (res.data) setAvailableAgents(res.data.map((a: any) => ({ id: a.id, name: a.name })))
    }).catch(() => {
      setAvailableAgents([])
    })
    fetchGroups().then((res: any) => {
      if (res.data) setAvailableGroups(res.data.map((g: any) => ({ id: g.id, name: g.name })))
    }).catch(() => {
      setAvailableGroups([])
    })
  }, [])

  const allSelectedEntities = [
    ...selectedAgentIds.map((id) => {
      const a = availableAgents.find((ag) => ag.id === id)
      return { id, name: a?.name || id, type: 'agent' as const }
    }),
    ...selectedGroupIds.map((id) => {
      const g = availableGroups.find((gr) => gr.id === id)
      return { id, name: g?.name || id, type: 'group' as const }
    }),
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await createGroup({
        name: name.trim(),
        type,
        groupType,
        description: desc.trim(),
        entityType:
          selectedAgentIds.length > 0 && selectedGroupIds.length > 0
            ? 'mixed'
            : selectedGroupIds.length > 0
            ? 'groups'
            : 'agents',
        entityIds: [...selectedAgentIds, ...selectedGroupIds],
        coordinatorId: coordinatorId || undefined,
      })
      onCreated()
    } catch (err) {
      console.error(err)
      alert('创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--sage-800)]">创建群组</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--sage-100)] rounded-lg transition-colors">
            <X className="w-4 h-4 text-[var(--sage-400)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--sage-700)] mb-1.5">群组名称 <span className="text-red-500">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all focus:border-[var(--sage-500)]"
              style={{ borderColor: 'var(--sage-200)' }}
              placeholder="例如：产品研发总部"
              required
            />
          </div>

          {/* Group Type */}
          <div>
            <label className="block text-sm font-medium text-[var(--sage-700)] mb-1.5">群组类型</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(GROUP_TYPE_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGroupType(key)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                    groupType === key
                      ? 'border-[var(--sage-500)] bg-[var(--sage-50)]'
                      : 'border-[var(--sage-200)] hover:border-[var(--sage-300)]'
                  }`}
                >
                  <config.icon className="w-4 h-4 flex-shrink-0" style={{ color: config.color }} />
                  <div>
                    <div className="text-xs font-medium text-[var(--sage-700)]">{config.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Execution Mode */}
          <div>
            <label className="block text-sm font-medium text-[var(--sage-700)] mb-1.5">执行模式</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'sequential', label: '顺序执行', desc: '按序依次执行', icon: Clock },
                { id: 'parallel', label: '并行执行', desc: '同时执行任务', icon: Layers },
                { id: 'hierarchical', label: '层级结构', desc: '上下级汇报', icon: Network },
                { id: 'dynamic', label: '动态重组', desc: '自动调整结构', icon: RefreshCw },
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setType(opt.id)}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border-2 text-left transition-all ${
                    type === opt.id
                      ? 'border-[var(--sage-500)] bg-[var(--sage-50)]'
                      : 'border-[var(--sage-200)] hover:border-[var(--sage-300)]'
                  }`}
                >
                  <opt.icon className={`w-4 h-4 flex-shrink-0 ${type === opt.id ? 'text-[var(--sage-500)]' : 'text-[var(--sage-400)]'}`} />
                  <div>
                    <div className="text-sm font-medium text-[var(--sage-700)]">{opt.label}</div>
                    <div className="text-[11px] text-[var(--sage-400)]">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--sage-700)] mb-1.5">描述</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all focus:border-[var(--sage-500)] resize-y"
              style={{ borderColor: 'var(--sage-200)' }}
              rows={2}
              placeholder="描述此群组的职责..."
            />
          </div>

          {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--sage-700)] mb-1.5">成员选择</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setActivePicker(activePicker === 'agents' ? null : 'agents')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activePicker === 'agents'
                    ? 'bg-[var(--sage-500)] text-white'
                    : 'bg-[var(--sage-100)] text-[var(--sage-600)] hover:bg-[var(--sage-200)]'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                添加 Agent
              </button>
              <button
                type="button"
                onClick={() => setActivePicker(activePicker === 'groups' ? null : 'groups')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activePicker === 'groups'
                    ? 'bg-purple-500 text-white'
                    : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                添加已有群组
              </button>
            </div>

            {/* Agent Picker */}
            <AnimatePresence>
              {activePicker === 'agents' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border rounded-lg p-3 space-y-1.5 max-h-40 overflow-y-auto" style={{ borderColor: 'var(--sage-200)' }}>
                    {availableAgents.map((agent) => {
                      const isSelected = selectedAgentIds.includes(agent.id)
                      return (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => {
                            setSelectedAgentIds((prev) =>
                              prev.includes(agent.id) ? prev.filter((id) => id !== agent.id) : [...prev, agent.id]
                            )
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                            isSelected ? 'bg-[var(--sage-50)]' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected ? 'bg-[var(--sage-500)] border-[var(--sage-500)]' : 'border-[var(--sage-300)]'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <User className="w-4 h-4 text-[var(--sage-400)]" />
                          <span className="text-sm text-[var(--sage-700)]">{agent.name}</span>
                          <span className="text-[10px] text-[var(--sage-400)] ml-auto">{agent.id}</span>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Group Picker */}
            <AnimatePresence>
              {activePicker === 'groups' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border rounded-lg p-3 space-y-1.5 max-h-40 overflow-y-auto" style={{ borderColor: 'var(--sage-200)' }}>
                    {availableGroups.map((group) => {
                      const isSelected = selectedGroupIds.includes(group.id)
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => {
                            setSelectedGroupIds((prev) =>
                              prev.includes(group.id) ? prev.filter((id) => id !== group.id) : [...prev, group.id]
                            )
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                            isSelected ? 'bg-purple-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected ? 'bg-purple-500 border-purple-500' : 'border-[var(--sage-300)]'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <TreePine className="w-4 h-4 text-purple-400" />
                          <span className="text-sm text-[var(--sage-700)]">{group.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Selected Entities Summary */}
            {allSelectedEntities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {allSelectedEntities.map((entity) => (
                  <span
                    key={`${entity.type}-${entity.id}`}
                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full ${
                      entity.type === 'agent'
                        ? 'bg-[var(--sage-100)] text-[var(--sage-600)]'
                        : 'bg-purple-100 text-purple-600'
                    }`}
                  >
                    {entity.type === 'agent' ? <User className="w-3 h-3" /> : <TreePine className="w-3 h-3" />}
                    {entity.name}
                    <button
                      type="button"
                      onClick={() => {
                        if (entity.type === 'agent') {
                          setSelectedAgentIds((prev) => prev.filter((id) => id !== entity.id))
                        } else {
                          setSelectedGroupIds((prev) => prev.filter((id) => id !== entity.id))
                        }
                      }}
                      className="hover:text-red-500 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Coordinator */}
          {selectedAgentIds.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[var(--sage-700)] mb-1.5">协调员 Agent</label>
              <select
                value={coordinatorId}
                onChange={(e) => setCoordinatorId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all focus:border-[var(--sage-500)]"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff' }}
              >
                <option value="">-- 选择协调员 --</option>
                {selectedAgentIds.map((id) => {
                  const agent = availableAgents.find((a) => a.id === id)
                  return (
                    <option key={id} value={id}>
                      {agent?.name || id}
                    </option>
                  )
                })}
              </select>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-2.5 text-sm">
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50"
            >
              {submitting ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
