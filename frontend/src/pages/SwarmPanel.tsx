import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Network, Cpu, Zap, Activity, Globe, ArrowRightLeft, Play, Pause, Power,
  Search, Filter, CheckCircle, AlertTriangle, XCircle, Clock, BarChart3,
  Loader2, Send, Square, Terminal, Sparkles, Layers, ArrowRight, Vote,
  History, Trash2, X, RefreshCw, GitMerge, Palette, Plus, Eye, ArrowLeft,
  Save, Type, Bot, Wrench, GitBranch, MousePointer2, GripVertical, RotateCcw,
  CheckCircle2, MoreHorizontal, PanelLeft, Pencil, LayoutGrid,
} from 'lucide-react'
import {
  fetchSwarms, fetchAgents, fetchTasks, fetchChariots, executeChariotStream,
  fetchEngines, streamChatWithAgent, fetchCanvases, getCanvas, createCanvas,
  deleteCanvas, updateCanvas, createCanvasRevision, getCanvasRevisions,
  restoreCanvasRevision,
} from '@/api/client'

/* ════════════════════════════════════════════════════════════════
   Types
   ════════════════════════════════════════════════════════════════ */

// ── SwarmNode ──
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

// ── SwarmTask ──
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

// ── Engine (from SwarmArchitectures) ──
interface Engine {
  id: string
  brand: string
  model: string
  tier: string
  status: string
  healthScore?: number
}

type Strategy = 'parallel' | 'sequential' | 'vote'

interface EngineRunState {
  status: 'pending' | 'running' | 'completed' | 'failed'
  content: string
  error?: string
  startTime?: number
  endTime?: number
}

interface SwarmRun {
  id: string
  timestamp: number
  strategy: Strategy
  prompt: string
  engineIds: string[]
  results: Record<string, EngineRunState>
  aggregate?: any
}

// ── Canvas ──
interface CanvasNode {
  id: string
  type: 'text' | 'llm' | 'tool'
  x: number
  y: number
  content?: string
  engineId?: string
  prompt?: string
  toolName?: string
}

interface CanvasEdge {
  id: string
  source: string
  target: string
}

interface CanvasData {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

interface CanvasItem {
  id: string
  name: string
  description?: string
  status: 'active' | 'archived' | 'draft'
  createdAt: string
  updatedAt?: string
  content?: CanvasData | any
}

interface Revision {
  id: string
  canvasId: string
  version: number
  createdAt: string
  createdBy?: string
  note?: string
}

/* ════════════════════════════════════════════════════════════════
   Config
   ════════════════════════════════════════════════════════════════ */

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

const NODE_TYPE_CONFIG: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  text: { icon: Type, label: '文本', color: 'var(--sage-600)', bg: 'var(--sage-100)' },
  llm: { icon: Bot, label: 'AI', color: 'var(--bloom-sky)', bg: 'rgba(127,163,176,0.15)' },
  tool: { icon: Wrench, label: '工具', color: 'var(--bloom-amber)', bg: 'rgba(212,163,115,0.15)' },
}

const CANVAS_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  active: { color: '#10b981', label: '活跃' },
  archived: { color: '#6b7280', label: '归档' },
  draft: { color: '#f59e0b', label: '草稿' },
}

/* ════════════════════════════════════════════════════════════════
   Mock data (fallback)
   ════════════════════════════════════════════════════════════════ */

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

/* ════════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════════ */

function agentToNode(agent: any): SwarmNode {
  return {
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
  }
}

function taskToSwarmTask(task: any): SwarmTask {
  return {
    id: task.id,
    name: task.name || task.id,
    nodeId: task.agentId || task.assignedTo || 'n-1',
    status: task.status === 'completed' ? 'completed' : task.status === 'failed' ? 'failed' : task.status === 'running' ? 'running' : 'pending',
    priority: 'medium',
    progress: task.status === 'completed' ? 100 : task.status === 'running' ? 50 : 0,
    startedAt: '-',
    estimatedDuration: '-',
  }
}

function extractContent(event: any): string {
  return (
    event.choices?.[0]?.delta?.content ||
    event.choices?.[0]?.text ||
    event.content ||
    event.message?.content ||
    ''
  )
}

function analyzeVote(states: Record<string, EngineRunState>, engines: Engine[]) {
  const responses = Object.entries(states)
    .filter(([_, s]) => s.status === 'completed' && s.content.trim())
    .map(([id, s]) => ({ id, content: s.content, engine: engines.find((e) => e.id === id) }))
    .filter((r): r is { id: string; content: string; engine: Engine } => !!r.engine)

  if (responses.length === 0) return null

  const avgLength = Math.round(responses.reduce((sum, r) => sum + r.content.length, 0) / responses.length)

  const wordCounts: Record<string, number> = {}
  responses.forEach((r) => {
    const words = r.content
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2)
    words.forEach((w) => { wordCounts[w] = (wordCounts[w] || 0) + 1 })
  })

  const commonWords = Object.entries(wordCounts)
    .filter(([_, count]) => count >= responses.length * 0.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word)

  const consensusScore = Math.min(Math.round((commonWords.length / 10) * 100), 100)

  return { totalVotes: responses.length, avgLength, commonWords, consensusScore, responses }
}

function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

function Leaf(props: any) {
  return <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.7C13.5 5.8 17 8 17 12a5 5 0 0 1-5 5Z"/><path d="M11 20v2"/></svg>
}

/* ════════════════════════════════════════════════════════════════
   Canvas Sub-components
   ════════════════════════════════════════════════════════════════ */

function GridBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: 'linear-gradient(var(--sage-200) 1px, transparent 1px), linear-gradient(90deg, var(--sage-200) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        opacity: 0.4,
      }}
    />
  )
}

function EdgeLayer({ edges, nodes }: { edges: CanvasEdge[]; nodes: CanvasNode[] }) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
      {edges.map((edge) => {
        const s = nodeMap.get(edge.source)
        const t = nodeMap.get(edge.target)
        if (!s || !t) return null
        const sx = s.x + 140
        const sy = s.y + 40
        const tx = t.x
        const ty = t.y + 40
        const cx = (sx + tx) / 2
        return (
          <path key={edge.id} d={`M ${sx} ${sy} C ${cx} ${sy}, ${cx} ${ty}, ${tx} ${ty}`} fill="none" stroke="var(--sage-300)" strokeWidth={2} />
        )
      })}
    </svg>
  )
}

/* ════════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════════ */

export default function SwarmPage() {
  /* ── Top-level mode: overview | orchestrate ── */
  const [mode, setMode] = useState<'overview' | 'orchestrate'>('overview')

  /* ── Overview sub-tabs ── */
  const [overviewTab, setOverviewTab] = useState<'nodes' | 'tasks' | 'topology' | 'execute'>('nodes')

  /* ── SwarmPanel data ── */
  const [nodes, setNodes] = useState<SwarmNode[]>(MOCK_NODES)
  const [tasks, setTasks] = useState<SwarmTask[]>(MOCK_TASKS)
  const [loading, setLoading] = useState(false)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const [chariots, setChariots] = useState<any[]>([])
  const [selectedChariotId, setSelectedChariotId] = useState<string>('')
  const [taskInput, setTaskInput] = useState('')
  const [executionEvents, setExecutionEvents] = useState<any[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<any>(null)
  const abortRef = useRef<(() => void) | null>(null)

  /* ── SwarmArchitectures data ── */
  const [engines, setEngines] = useState<Engine[]>([])
  const [enginesLoading, setEnginesLoading] = useState(true)
  const [selectedEngines, setSelectedEngines] = useState<string[]>([])
  const [prompt, setPrompt] = useState('')
  const [strategy, setStrategy] = useState<Strategy>('parallel')
  const [isRunning, setIsRunning] = useState(false)
  const [engineStates, setEngineStates] = useState<Record<string, EngineRunState>>({})
  const [aggregateResult, setAggregateResult] = useState<any>(null)
  const [history, setHistory] = useState<SwarmRun[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const abortsRef = useRef<(() => void)[]>([])
  const statesRef = useRef<Record<string, EngineRunState>>({})

  /* ── Canvas data ── */
  const [canvases, setCanvases] = useState<CanvasItem[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '' })
  const [creating, setCreating] = useState(false)
  const [editorCanvas, setEditorCanvas] = useState<CanvasItem | null>(null)
  const [canvasData, setCanvasData] = useState<CanvasData>({ nodes: [], edges: [] })
  const [editorLoading, setEditorLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [showRevisions, setShowRevisions] = useState(false)
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [revisionsLoading, setRevisionsLoading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [revisionNote, setRevisionNote] = useState('')
  const [showRevisionModal, setShowRevisionModal] = useState(false)
  const dragRef = useRef<{ nodeId: string | null; offsetX: number; offsetY: number; dragging: boolean }>({ nodeId: null, offsetX: 0, offsetY: 0, dragging: false })
  const canvasAreaRef = useRef<HTMLDivElement>(null)

  /* ═══════════════════════════════════════════════════════════
     Effects
     ═══════════════════════════════════════════════════════════ */

  // Load agents / tasks / chariots
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchAgents().catch(() => null),
      fetchTasks().catch(() => null),
      fetchSwarms().catch(() => null),
      fetchChariots().catch(() => null),
    ])
      .then(([agentsRes, tasksRes, _swarmsRes, chariotsRes]) => {
        if (cancelled) return
        const agents = agentsRes?.data || agentsRes
        const _tasks = tasksRes?.data || tasksRes
        const chariotList = chariotsRes?.data || chariotsRes
        if (Array.isArray(agents) && agents.length > 0) setNodes(agents.map(agentToNode))
        if (Array.isArray(_tasks) && _tasks.length > 0) setTasks(_tasks.map(taskToSwarmTask))
        if (Array.isArray(chariotList) && chariotList.length > 0) {
          setChariots(chariotList)
          if (!selectedChariotId) setSelectedChariotId(chariotList[0].id)
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Load engines
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setEnginesLoading(true)
        const res: any = await fetchEngines()
        const data = res.data || res
        if (!cancelled) setEngines(Array.isArray(data) ? data : [])
      } catch (e: any) {
        if (!cancelled) setError('加载引擎列表失败：' + (e.message || '未知错误'))
      } finally {
        if (!cancelled) setEnginesLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Load canvases
  useEffect(() => {
    async function load() {
      try {
        setListLoading(true)
        const res: any = await fetchCanvases()
        const data = res.data || res
        setCanvases(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error('Failed to fetch canvases:', e)
        setCanvases([])
      } finally {
        setListLoading(false)
      }
    }
    load()
  }, [])

  // Auto-save canvas
  const autoSave = useCallback(
    debounce(async (canvasId: string, data: CanvasData) => {
      if (!canvasId) return
      try {
        setSaving(true)
        setSaveError(null)
        await updateCanvas(canvasId, { content: data })
      } catch (e: any) {
        console.error('Auto-save failed:', e)
        setSaveError(e.message || '保存失败')
      } finally {
        setSaving(false)
      }
    }, 1000),
    []
  )

  useEffect(() => {
    if (editorCanvas) {
      autoSave(editorCanvas.id, canvasData)
    }
  }, [canvasData, editorCanvas, autoSave])

  /* ═══════════════════════════════════════════════════════════
     SwarmPanel Actions
     ═══════════════════════════════════════════════════════════ */

  const toggleNodeStatus = (id: string) => {
    setNodes(nodes.map((n) => {
      if (n.id !== id) return n
      const next = n.status === 'active' ? 'idle' : n.status === 'idle' ? 'offline' : 'active'
      return { ...n, status: next }
    }))
  }

  const handleExecute = () => {
    if (!selectedChariotId || !taskInput.trim()) return
    setExecutionEvents([])
    setExecutionResult(null)
    setIsExecuting(true)
    const task = { id: `task-${Date.now()}`, type: 'execute', payload: { content: taskInput.trim() } }
    const abort = executeChariotStream(
      selectedChariotId, task,
      (event) => {
        setExecutionEvents((prev) => [...prev, event])
        if (event.type === 'complete') setExecutionResult(event.result)
      },
      (err) => {
        setExecutionEvents((prev) => [...prev, { type: 'error', error: err.message }])
        setIsExecuting(false)
      },
      () => { setIsExecuting(false) },
    )
    abortRef.current = abort
  }

  /* ═══════════════════════════════════════════════════════════
     SwarmArchitectures Actions
     ═══════════════════════════════════════════════════════════ */

  useEffect(() => { statesRef.current = engineStates }, [engineStates])

  const toggleEngine = (id: string) => {
    setSelectedEngines((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }
  const selectAll = () => setSelectedEngines(engines.map((e) => e.id))
  const clearSelection = () => setSelectedEngines([])

  const updateEngineState = useCallback((engineId: string, patch: Partial<EngineRunState>) => {
    setEngineStates((prev) => {
      const next = { ...prev, [engineId]: { ...prev[engineId], ...patch } }
      statesRef.current = next
      return next
    })
  }, [])

  const resetStates = useCallback(() => {
    const initial: Record<string, EngineRunState> = {}
    selectedEngines.forEach((id) => { initial[id] = { status: 'pending', content: '' } })
    setEngineStates(initial)
    statesRef.current = initial
    setAggregateResult(null)
    setError(null)
  }, [selectedEngines])

  const addToHistory = useCallback((agg: any) => {
    const run: SwarmRun = { id: `swarm-${Date.now()}`, timestamp: Date.now(), strategy, prompt, engineIds: [...selectedEngines], results: { ...statesRef.current }, aggregate: agg }
    setHistory((prev) => [run, ...prev].slice(0, 20))
  }, [strategy, prompt, selectedEngines])

  const runParallel = useCallback(async () => {
    resetStates()
    setIsRunning(true)
    const aborts: (() => void)[] = []
    try {
      const promises = selectedEngines.map((engineId) => {
        return new Promise<void>((resolve) => {
          const engine = engines.find((e) => e.id === engineId)
          if (!engine) { resolve(); return }
          updateEngineState(engineId, { status: 'running', startTime: Date.now() })
          const abort = streamChatWithAgent(
            engineId, [{ role: 'user', content: prompt }],
            (event) => {
              const content = extractContent(event)
              if (content) {
                const current = statesRef.current[engineId]?.content || ''
                updateEngineState(engineId, { status: 'running', content: current + content })
              }
            },
            (err) => { updateEngineState(engineId, { status: 'failed', error: err.message, endTime: Date.now() }); resolve() },
            () => { updateEngineState(engineId, { status: 'completed', endTime: Date.now() }); resolve() }
          )
          aborts.push(abort)
        })
      })
      await Promise.all(promises)
      const completed = Object.values(statesRef.current).filter((s) => s.status === 'completed').length
      let agg: any
      if (strategy === 'vote') {
        agg = { mode: 'vote', ...analyzeVote(statesRef.current, engines) }
      } else {
        agg = { mode: 'parallel', completed, total: selectedEngines.length }
      }
      setAggregateResult(agg)
      addToHistory(agg)
    } catch (e: any) {
      setError('蜂群执行失败：' + (e.message || '未知错误'))
    } finally {
      setIsRunning(false)
      abortsRef.current = aborts
    }
  }, [selectedEngines, engines, prompt, strategy, resetStates, updateEngineState, addToHistory])

  const runSequential = useCallback(async () => {
    resetStates()
    setIsRunning(true)
    const aborts: (() => void)[] = []
    try {
      for (const engineId of selectedEngines) {
        const engine = engines.find((e) => e.id === engineId)
        if (!engine) continue
        updateEngineState(engineId, { status: 'running', startTime: Date.now() })
        await new Promise<void>((resolve) => {
          const abort = streamChatWithAgent(
            engineId, [{ role: 'user', content: prompt }],
            (event) => {
              const content = extractContent(event)
              if (content) {
                const current = statesRef.current[engineId]?.content || ''
                updateEngineState(engineId, { status: 'running', content: current + content })
              }
            },
            (err) => { updateEngineState(engineId, { status: 'failed', error: err.message, endTime: Date.now() }); resolve() },
            () => { updateEngineState(engineId, { status: 'completed', endTime: Date.now() }); resolve() }
          )
          aborts.push(abort)
        })
      }
      const completed = Object.values(statesRef.current).filter((s) => s.status === 'completed').length
      const agg = { mode: 'sequential', completed, total: selectedEngines.length }
      setAggregateResult(agg)
      addToHistory(agg)
    } catch (e: any) {
      setError('蜂群执行失败：' + (e.message || '未知错误'))
    } finally {
      setIsRunning(false)
      abortsRef.current = aborts
    }
  }, [selectedEngines, engines, prompt, resetStates, updateEngineState, addToHistory])

  const handleStart = () => {
    if (selectedEngines.length === 0) { setError('请至少选择一个引擎'); return }
    if (!prompt.trim()) { setError('请输入任务提示词'); return }
    setError(null)
    if (strategy === 'sequential') { runSequential() } else { runParallel() }
  }

  const handleStop = () => {
    abortsRef.current.forEach((abort) => abort())
    setIsRunning(false)
    Object.entries(statesRef.current).forEach(([id, state]) => {
      if (state.status === 'running') {
        updateEngineState(id, { status: 'failed', error: '用户中断', endTime: Date.now() })
      }
    })
  }

  const clearHistory = () => setHistory([])

  const loadHistory = (run: SwarmRun) => {
    setSelectedEngines(run.engineIds)
    setPrompt(run.prompt)
    setStrategy(run.strategy)
    setEngineStates(run.results)
    setAggregateResult(run.aggregate)
    setShowHistory(false)
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-[var(--sage-400)]" />
      case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-[var(--sage-400)]" />
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '等待中'
      case 'running': return '执行中'
      case 'completed': return '已完成'
      case 'failed': return '失败'
      default: return '未知'
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-[var(--sage-100)] text-[var(--sage-500)]'
      case 'running': return 'bg-blue-500/10 text-blue-600'
      case 'completed': return 'bg-green-500/10 text-green-600'
      case 'failed': return 'bg-red-500/10 text-red-600'
      default: return 'bg-[var(--sage-100)] text-[var(--sage-500)]'
    }
  }

  const runningCount = Object.values(engineStates).filter((s) => s.status === 'running').length
  const completedCount = Object.values(engineStates).filter((s) => s.status === 'completed').length
  const failedCount = Object.values(engineStates).filter((s) => s.status === 'failed').length
  const totalCount = selectedEngines.length

  /* ═══════════════════════════════════════════════════════════
     Canvas Actions
     ═══════════════════════════════════════════════════════════ */

  const filteredCanvases = canvases.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)
  })

  const activeCanvasCount = canvases.filter((c) => c.status === 'active').length

  const handleCreateCanvas = async () => {
    if (!createForm.name.trim()) return
    try {
      setCreating(true)
      const res: any = await createCanvas({ name: createForm.name, description: createForm.description, content: { nodes: [], edges: [] } })
      const newCanvas = res.data || { id: `canvas-${Date.now()}`, name: createForm.name, description: createForm.description, status: 'active', createdAt: new Date().toISOString() }
      setCanvases((prev) => [newCanvas, ...prev])
      setShowCreateModal(false)
      setCreateForm({ name: '', description: '' })
    } catch (e) {
      console.error('Failed to create canvas:', e)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteCanvas = async (id: string) => {
    if (!confirm('确定删除此画布？')) return
    try {
      await deleteCanvas(id)
      setCanvases((prev) => prev.filter((c) => c.id !== id))
      if (editorCanvas?.id === id) {
        setEditorCanvas(null)
        setCanvasData({ nodes: [], edges: [] })
      }
    } catch (e) {
      console.error('Failed to delete canvas:', e)
    }
  }

  const enterEditor = async (canvas: CanvasItem) => {
    try {
      setEditorLoading(true)
      setEditorCanvas(canvas)
      const res: any = await getCanvas(canvas.id)
      const detail = res.data || res
      const content = detail.content || canvas.content || { nodes: [], edges: [] }
      setCanvasData(content.nodes && content.edges ? content : { nodes: [], edges: [] })
    } catch (e) {
      console.error('Failed to load canvas detail:', e)
      setCanvasData({ nodes: [], edges: [] })
    } finally {
      setEditorLoading(false)
    }
  }

  const addNode = (type: CanvasNode['type']) => {
    const id = generateId('n')
    const newNode: CanvasNode = {
      id, type, x: 100 + Math.random() * 40, y: 100 + Math.random() * 40,
      content: type === 'text' ? '新文本节点' : undefined,
      engineId: type === 'llm' ? 'zhipu' : undefined,
      prompt: type === 'llm' ? '' : undefined,
      toolName: type === 'tool' ? '' : undefined,
    }
    setCanvasData((prev) => ({ ...prev, nodes: [...prev.nodes, newNode] }))
    setSelectedNodeId(id)
  }

  const updateNode = (id: string, patch: Partial<CanvasNode>) => {
    setCanvasData((prev) => ({ ...prev, nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }))
  }

  const deleteNode = (id: string) => {
    setCanvasData((prev) => ({ nodes: prev.nodes.filter((n) => n.id !== id), edges: prev.edges.filter((e) => e.source !== id && e.target !== id) }))
    if (selectedNodeId === id) setSelectedNodeId(null)
  }

  const addEdge = (source: string, target: string) => {
    if (source === target) return
    const exists = canvasData.edges.some((e) => e.source === source && e.target === target)
    if (exists) return
    setCanvasData((prev) => ({ ...prev, edges: [...prev.edges, { id: generateId('e'), source, target }] }))
  }

  const deleteEdge = (id: string) => {
    setCanvasData((prev) => ({ ...prev, edges: prev.edges.filter((e) => e.id !== id) }))
  }

  const onNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const node = canvasData.nodes.find((n) => n.id === nodeId)
    if (!node) return
    const rect = canvasAreaRef.current?.getBoundingClientRect()
    if (!rect) return
    dragRef.current = { nodeId, offsetX: e.clientX - rect.left - node.x, offsetY: e.clientY - rect.top - node.y, dragging: false }
    setSelectedNodeId(nodeId)
  }

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    const { nodeId, offsetX, offsetY } = dragRef.current
    if (!nodeId) return
    const rect = canvasAreaRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left - offsetX
    const y = e.clientY - rect.top - offsetY
    dragRef.current.dragging = true
    updateNode(nodeId, { x: Math.max(0, x), y: Math.max(0, y) })
  }

  const onCanvasMouseUp = (e: React.MouseEvent) => {
    const { nodeId, dragging } = dragRef.current
    if (nodeId && !dragging) {
      if (connecting) {
        if (connecting !== nodeId) addEdge(connecting, nodeId)
        setConnecting(null)
      }
    }
    dragRef.current = { nodeId: null, offsetX: 0, offsetY: 0, dragging: false }
  }

  const loadRevisions = async (canvasId: string) => {
    try {
      setRevisionsLoading(true)
      const res: any = await getCanvasRevisions(canvasId)
      const data = res.data || res
      setRevisions(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Failed to load revisions:', e)
      setRevisions([])
    } finally {
      setRevisionsLoading(false)
    }
  }

  const handleSaveRevision = async () => {
    if (!editorCanvas) return
    try {
      setSaving(true)
      await createCanvasRevision(editorCanvas.id, { note: revisionNote || '手动保存', content: canvasData })
      setShowRevisionModal(false)
      setRevisionNote('')
      if (showRevisions) loadRevisions(editorCanvas.id)
    } catch (e) {
      console.error('Failed to save revision:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleRestoreRevision = async (revisionId: string) => {
    if (!editorCanvas || !confirm('确定恢复到此版本？当前未保存的更改将丢失。')) return
    try {
      setRestoring(true)
      const res: any = await restoreCanvasRevision(editorCanvas.id, revisionId)
      const content = res.data?.content || res.content
      if (content) setCanvasData(content)
      if (showRevisions) loadRevisions(editorCanvas.id)
    } catch (e) {
      console.error('Failed to restore revision:', e)
    } finally {
      setRestoring(false)
    }
  }

  /* ═══════════════════════════════════════════════════════════
     Derived data
     ═══════════════════════════════════════════════════════════ */

  const filteredNodes = nodes.filter((n) => {
    if (search && !n.name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter !== 'all' && n.type !== typeFilter) return false
    if (statusFilter !== 'all' && n.status !== statusFilter) return false
    return true
  })

  const activeNodeCount = nodes.filter((n) => n.status === 'active').length
  const totalTasks = nodes.reduce((sum, n) => sum + n.tasks, 0)
  const avgLoad = Math.round(nodes.reduce((sum, n) => sum + n.load, 0) / nodes.length)
  const totalMemory = nodes.reduce((sum, n) => sum + n.memory, 0)
  const offlineNodeCount = nodes.filter((n) => n.status === 'offline').length
  const nodeTasks = (nodeId: string) => tasks.filter((t) => t.nodeId === nodeId)

  /* ═══════════════════════════════════════════════════════════
     Render: Canvas Editor
     ═══════════════════════════════════════════════════════════ */

  if (mode === 'orchestrate' && editorCanvas) {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)] -mx-4 -my-4 md:-mx-6 lg:-mx-8 md:-my-4">
        <div className="flex items-center justify-between px-4 py-2 border-b shrink-0" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setEditorCanvas(null); setCanvasData({ nodes: [], edges: [] }); setSelectedNodeId(null); setConnecting(null); setShowRevisions(false) }}
              className="btn-secondary"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">返回</span>
            </button>
            <div>
              <h2 className="text-sm font-semibold text-[var(--sage-800)]">{editorCanvas.name}</h2>
              <p className="text-[10px] text-[var(--sage-500)]">{canvasData.nodes.length} 节点 · {canvasData.edges.length} 连接 {saving && ' · 保存中...'} {saveError && ` · 保存失败: ${saveError}`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowRevisionModal(true)} className="btn-secondary text-xs" title="保存版本"><Save className="w-3.5 h-3.5" /><span className="hidden sm:inline">保存版本</span></button>
            <button onClick={() => { setShowRevisions((v) => !v); if (!showRevisions && editorCanvas) loadRevisions(editorCanvas.id) }} className={`btn-secondary text-xs ${showRevisions ? 'ring-1 ring-[var(--sage-400)]' : ''}`}><History className="w-3.5 h-3.5" /><span className="hidden sm:inline">版本历史</span></button>
            <div className="w-px h-5 bg-[var(--sage-200)] mx-1" />
            <button onClick={() => addNode('text')} className="btn-secondary text-xs"><Type className="w-3.5 h-3.5" /><span className="hidden sm:inline">文本</span></button>
            <button onClick={() => addNode('llm')} className="btn-secondary text-xs"><Bot className="w-3.5 h-3.5" /><span className="hidden sm:inline">AI</span></button>
            <button onClick={() => addNode('tool')} className="btn-secondary text-xs"><Wrench className="w-3.5 h-3.5" /><span className="hidden sm:inline">工具</span></button>
            <button onClick={() => setConnecting((c) => (c ? null : 'start'))} className={`btn-secondary text-xs ${connecting ? 'ring-1 ring-[var(--sage-400)]' : ''}`} title="连接模式"><GitBranch className="w-3.5 h-3.5" /><span className="hidden sm:inline">连接</span></button>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div ref={canvasAreaRef} className="relative flex-1 overflow-auto" style={{ backgroundColor: 'var(--sage-50)' }} onMouseMove={onCanvasMouseMove} onMouseUp={onCanvasMouseUp} onClick={() => { if (!dragRef.current.dragging) { setSelectedNodeId(null); if (connecting) setConnecting(null) } }}>
            {editorLoading ? (
              <div className="flex items-center justify-center h-full gap-2 text-[var(--sage-500)]"><Loader2 className="w-5 h-5 animate-spin" /><span>加载画布...</span></div>
            ) : (
              <>
                <GridBackground />
                <EdgeLayer edges={canvasData.edges} nodes={canvasData.nodes} />
                {canvasData.nodes.map((node) => {
                  const cfg = NODE_TYPE_CONFIG[node.type]
                  const Icon = cfg.icon
                  const isSelected = selectedNodeId === node.id
                  return (
                    <div key={node.id} className="absolute z-10 select-none" style={{ left: node.x, top: node.y, width: 180 }}>
                      <div className={`rounded-card-md p-3 border transition-shadow cursor-move ${isSelected ? 'ring-2 ring-[var(--sage-500)]' : ''} ${connecting ? 'hover:ring-1 hover:ring-[var(--sage-400)]' : ''}`} style={{ backgroundColor: '#fff', borderColor: isSelected ? 'var(--sage-500)' : 'var(--sage-200)', boxShadow: 'var(--shadow-card)' }} onMouseDown={(e) => onNodeMouseDown(e, node.id)} onClick={(e) => { e.stopPropagation(); if (connecting && connecting !== 'start') { addEdge(connecting, node.id); setConnecting(null) } else if (connecting === 'start') { setConnecting(node.id) } }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: cfg.bg }}><Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} /></div>
                          <span className="text-[10px] font-medium text-[var(--sage-500)] uppercase tracking-wide">{cfg.label}</span>
                          <button onClick={(e) => { e.stopPropagation(); deleteNode(node.id) }} className="ml-auto p-1 rounded hover:bg-red-500/10 text-[var(--sage-400)] hover:text-red-500"><X className="w-3 h-3" /></button>
                        </div>
                        {node.type === 'text' && <textarea className="w-full text-xs bg-transparent resize-none outline-none" rows={2} value={node.content || ''} onChange={(e) => updateNode(node.id, { content: e.target.value })} onMouseDown={(e) => e.stopPropagation()} placeholder="输入文本..." style={{ color: 'var(--sage-800)' }} />}
                        {node.type === 'llm' && (
                          <div className="space-y-1.5">
                            <input className="w-full text-[10px] px-1.5 py-1 rounded border outline-none" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)', color: 'var(--sage-800)' }} value={node.engineId || ''} onChange={(e) => updateNode(node.id, { engineId: e.target.value })} onMouseDown={(e) => e.stopPropagation()} placeholder="引擎 ID" />
                            <textarea className="w-full text-[10px] bg-transparent resize-none outline-none border rounded px-1.5 py-1" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)', color: 'var(--sage-800)' }} rows={2} value={node.prompt || ''} onChange={(e) => updateNode(node.id, { prompt: e.target.value })} onMouseDown={(e) => e.stopPropagation()} placeholder="提示词..." />
                          </div>
                        )}
                        {node.type === 'tool' && <input className="w-full text-xs px-1.5 py-1 rounded border outline-none" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)', color: 'var(--sage-800)' }} value={node.toolName || ''} onChange={(e) => updateNode(node.id, { toolName: e.target.value })} onMouseDown={(e) => e.stopPropagation()} placeholder="工具名称" />}
                      </div>
                    </div>
                  )
                })}
                {connecting && <div className="absolute bottom-4 left-4 z-20 px-3 py-1.5 rounded-card text-xs" style={{ backgroundColor: 'var(--sage-800)', color: '#fff' }}>{connecting === 'start' ? '请点击第一个节点' : '请点击第二个节点以完成连接'}</div>}
              </>
            )}
          </div>
          {showRevisions && (
            <div className="w-64 shrink-0 border-l overflow-y-auto hidden md:block" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff' }}>
              <div className="p-3 border-b" style={{ borderColor: 'var(--sage-200)' }}>
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--sage-800)]"><History className="w-4 h-4 text-[var(--sage-500)]" />版本历史</div>
              </div>
              {revisionsLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-xs text-[var(--sage-500)]"><Loader2 className="w-4 h-4 animate-spin" />加载中...</div>
              ) : revisions.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--sage-500)]">暂无版本记录</div>
              ) : (
                <div className="p-2 space-y-1">
                  {revisions.map((rev) => (
                    <div key={rev.id} className="p-2 rounded-card-md border hover:shadow-sm transition-shadow" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-3 h-3 text-[var(--sage-400)]" />
                        <span className="text-[10px] font-mono text-[var(--sage-500)]">v{rev.version}</span>
                        <span className="text-[10px] text-[var(--sage-400)] ml-auto">{new Date(rev.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-[var(--sage-700)] mb-1.5 line-clamp-2">{rev.note || '无备注'}</p>
                      <button onClick={() => handleRestoreRevision(rev.id)} disabled={restoring} className="w-full flex items-center justify-center gap-1 text-[10px] py-1 rounded-md border transition-colors hover:bg-[var(--sage-100)] disabled:opacity-50" style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-600)' }}>{restoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}恢复此版本</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {showRevisionModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="card p-5 w-[360px] max-w-[90vw]">
              <h3 className="text-sm font-bold text-[var(--sage-800)] mb-3">保存版本</h3>
              <input type="text" placeholder="版本备注（可选）" value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} className="w-full px-3 py-2 rounded-card border text-sm mb-4" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)', color: 'var(--sage-800)' }} />
              <div className="flex gap-2">
                <button onClick={handleSaveRevision} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}保存</button>
                <button onClick={() => { setShowRevisionModal(false); setRevisionNote('') }} className="px-4 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)' }}>取消</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════════
     Render: Canvas List (Orchestrate mode, no editor open)
     ═══════════════════════════════════════════════════════════ */

  if (mode === 'orchestrate') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Palette className="w-6 h-6 text-[var(--sage-500)]" />
            <div>
              <h1 className="text-2xl font-bold text-[var(--sage-800)]">协作画布</h1>
              <p className="text-sm text-[var(--sage-500)]">{canvases.length} 个画布 · {activeCanvasCount} 活跃</p>
            </div>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> 新建画布</button>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索画布..." className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)', color: 'var(--sage-800)' }} />
        </div>
        {listLoading ? (
          <div className="flex items-center justify-center py-16 text-[var(--sage-500)] gap-2"><Loader2 className="w-5 h-5 animate-spin" /><span>加载中...</span></div>
        ) : filteredCanvases.length === 0 ? (
          <div className="card text-center py-16"><Palette className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" /><p className="text-[var(--sage-500)]">暂无画布</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCanvases.map((canvas) => {
              const status = CANVAS_STATUS_CONFIG[canvas.status] || CANVAS_STATUS_CONFIG.draft
              const nodeCount = canvas.content?.nodes?.length || 0
              const edgeCount = canvas.content?.edges?.length || 0
              return (
                <div key={canvas.id} className="card p-4 transition-all hover:shadow-md cursor-pointer" style={{ boxShadow: 'var(--shadow-card)' }} onClick={() => enterEditor(canvas)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sage-100)]"><Palette className="w-5 h-5 text-[var(--sage-500)]" /></div>
                      <div>
                        <h3 className="font-semibold text-sm text-[var(--sage-800)]">{canvas.name}</h3>
                        <span className="text-[10px] text-[var(--sage-500)]">{new Date(canvas.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-full" style={{ backgroundColor: status.color + '15', color: status.color }}>{status.label}</span>
                  </div>
                  {canvas.description && <p className="text-xs text-[var(--sage-500)] mb-3 line-clamp-2">{canvas.description}</p>}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[10px] text-[var(--sage-400)]">
                      <span className="flex items-center gap-1"><MousePointer2 className="w-3 h-3" />{nodeCount} 节点</span>
                      <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{edgeCount} 连接</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); enterEditor(canvas) }} className="p-1.5 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)] hover:text-[var(--sage-600)]" title="编辑"><Eye className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteCanvas(canvas.id) }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--sage-400)] hover:text-red-500" title="删除"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="card p-6 w-[400px] max-w-[90vw]" style={{ boxShadow: 'var(--shadow-card-elevated)' }}>
              <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">新建画布</h2>
              <div className="space-y-3">
                <input type="text" placeholder="画布名称" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="w-full px-3 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)', color: 'var(--sage-800)' }} />
                <textarea placeholder="描述（可选）" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-card border text-sm resize-none" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)', color: 'var(--sage-800)' }} />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleCreateCanvas} disabled={creating || !createForm.name.trim()} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">{creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}创建</button>
                <button onClick={() => { setShowCreateModal(false); setCreateForm({ name: '', description: '' }) }} className="px-4 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)' }}>取消</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════════
     Render: Overview Mode
     ═══════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Network className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">蜂群</h1>
            <p className="text-sm text-[var(--sage-500)]">{nodes.length} 个节点 · {activeNodeCount} 活跃 · {totalTasks} 任务 · 负载 {avgLoad}%</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="card p-4"><Cpu className="w-5 h-5 text-[var(--sage-500)] mb-2" /><p className="text-2xl font-bold text-[var(--sage-800)]">{activeNodeCount}</p><p className="text-xs text-[var(--sage-500)]">活跃节点</p></div>
        <div className="card p-4"><Zap className="w-5 h-5 text-amber-500 mb-2" /><p className="text-2xl font-bold text-[var(--sage-800)]">{totalTasks}</p><p className="text-xs text-[var(--sage-500)]">总任务</p></div>
        <div className="card p-4"><Activity className="w-5 h-5 text-red-400 mb-2" /><p className="text-2xl font-bold text-[var(--sage-800)]">{avgLoad}%</p><p className="text-xs text-[var(--sage-500)]">平均负载</p></div>
        <div className="card p-4"><Layers className="w-5 h-5 text-[var(--sage-500)] mb-2" /><p className="text-2xl font-bold text-[var(--sage-800)]">{(totalMemory / 1024).toFixed(1)}GB</p><p className="text-xs text-[var(--sage-500)]">总内存</p></div>
        <div className="card p-4"><AlertTriangle className="w-5 h-5 text-red-500 mb-2" /><p className="text-2xl font-bold text-[var(--sage-800)]">{offlineNodeCount}</p><p className="text-xs text-[var(--sage-500)]">离线</p></div>
      </div>

      {/* Overview Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'nodes' as const, label: `节点 (${nodes.length})`, icon: Network },
          { id: 'tasks' as const, label: `任务 (${tasks.length})`, icon: Layers },
          { id: 'topology' as const, label: '拓扑', icon: Globe },
          { id: 'execute' as const, label: '执行', icon: Play },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setOverviewTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-card text-sm font-medium transition-colors ${overviewTab === tab.id ? 'bg-[var(--sage-500)] text-white' : 'bg-[var(--sage-50)] text-[var(--sage-600)] hover:bg-[var(--sage-100)]'}`}>
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* ===== Nodes Tab ===== */}
      {overviewTab === 'nodes' && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索节点..." className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2.5 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}>
              <option value="all">全部类型</option>
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (<option key={key} value={key}>{cfg.label}</option>))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}>
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
                <div key={node.id} onClick={() => setSelectedNode(isSelected ? null : node.id)} className={`card p-4 cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-[var(--sage-500)]' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: typeCfg.color + '15' }}><TypeIcon className="w-5 h-5" style={{ color: typeCfg.color }} /></div>
                      <div>
                        <h3 className="font-semibold text-sm text-[var(--sage-800)]">{node.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: typeCfg.color + '15', color: typeCfg.color }}>{typeCfg.label}</span>
                          <span className="text-[10px] text-[var(--sage-400)]">{node.region}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); toggleNodeStatus(node.id) }} className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: statusCfg.color + '15', color: statusCfg.color }}>
                      {node.status === 'active' ? <Power className="w-3 h-3" /> : node.status === 'idle' ? <Pause className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {statusCfg.label}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center"><p className="text-xs text-[var(--sage-400)]">负载</p><p className="text-sm font-bold text-[var(--sage-800)]">{node.load}%</p></div>
                    <div className="text-center"><p className="text-xs text-[var(--sage-400)]">任务</p><p className="text-sm font-bold text-[var(--sage-800)]">{node.tasks}</p></div>
                    <div className="text-center"><p className="text-xs text-[var(--sage-400)]">内存</p><p className="text-sm font-bold text-[var(--sage-800)]">{node.memory}MB</p></div>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--sage-100)] overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all" style={{ width: `${node.load}%`, backgroundColor: node.load > 80 ? '#ef4444' : node.load > 50 ? '#f59e0b' : '#10b981' }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--sage-400)]">
                    <span>运行 {node.uptime}</span><span>{node.version}</span><span>心跳: {node.lastHeartbeat}</span>
                  </div>
                  {isSelected && nTasks.length > 0 && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--sage-100)' }}>
                      <p className="text-xs font-medium text-[var(--sage-600)] mb-2">节点任务</p>
                      <div className="space-y-1.5">
                        {nTasks.map((t) => (
                          <div key={t.id} className="flex items-center gap-2 text-xs">
                            <span className={`w-2 h-2 rounded-full ${t.status === 'running' ? 'bg-blue-500' : t.status === 'completed' ? 'bg-green-500' : t.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'}`} />
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

      {/* ===== Tasks Tab ===== */}
      {overviewTab === 'tasks' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--sage-50)] text-[var(--sage-600)]">
              <tr><th className="text-left px-4 py-3 font-medium">任务</th><th className="text-left px-4 py-3 font-medium">节点</th><th className="text-left px-4 py-3 font-medium">优先级</th><th className="text-left px-4 py-3 font-medium">状态</th><th className="text-left px-4 py-3 font-medium">进度</th><th className="text-left px-4 py-3 font-medium">开始时间</th></tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const node = nodes.find((n) => n.id === t.nodeId)
                return (
                  <tr key={t.id} className="border-t" style={{ borderColor: 'var(--sage-100)' }}>
                    <td className="px-4 py-3 font-medium text-[var(--sage-800)]">{t.name}</td>
                    <td className="px-4 py-3 text-[var(--sage-500)]">{node?.name || t.nodeId}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${t.priority === 'high' ? 'bg-red-500/10 text-red-600' : t.priority === 'medium' ? 'bg-amber-500/10 text-amber-600' : 'bg-green-500/10 text-green-600'}`}>
                        {t.priority === 'high' ? '高' : t.priority === 'medium' ? '中' : '低'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'running' ? 'bg-blue-500/10 text-blue-600' : t.status === 'completed' ? 'bg-green-500/10 text-green-600' : t.status === 'failed' ? 'bg-red-500/10 text-red-600' : 'bg-[var(--sage-100)] text-[var(--sage-500)]'}`}>
                        {t.status === 'running' ? '进行中' : t.status === 'completed' ? '已完成' : t.status === 'failed' ? '失败' : '待处理'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-[var(--sage-100)]">
                          <div className="h-full rounded-full" style={{ width: `${t.progress}%`, backgroundColor: t.status === 'failed' ? '#ef4444' : '#3b82f6' }} />
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

      {/* ===== Topology Tab ===== */}
      {overviewTab === 'topology' && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-[var(--sage-500)]" />蜂群拓扑</h3>
          <div className="relative h-[350px] bg-[var(--sage-50)] rounded-card border p-4" style={{ borderColor: 'var(--sage-100)' }}>
            {nodes.map((node, i) => {
              const typeCfg = TYPE_CONFIG[node.type]
              const x = 80 + (i % 4) * 220
              const y = 60 + Math.floor(i / 4) * 130
              return (
                <div key={node.id} className="absolute" style={{ left: x, top: y }}>
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center border-2" style={{ backgroundColor: typeCfg.color + '15', borderColor: node.status === 'active' ? typeCfg.color : 'var(--sage-200)' }}><typeCfg.icon className="w-6 h-6" style={{ color: typeCfg.color }} /></div>
                  <p className="text-[10px] text-center mt-1 text-[var(--sage-600)] font-medium">{node.name}</p>
                  <p className="text-[9px] text-center text-[var(--sage-400)]">{node.load}%</p>
                </div>
              )
            })}
            <div className="absolute" style={{ left: 340, top: 140 }}>
              <div className="w-16 h-16 rounded-xl flex items-center justify-center border-2" style={{ backgroundColor: '#c97b84' + '15', borderColor: '#c97b84' }}><Network className="w-7 h-7" style={{ color: '#c97b84' }} /></div>
              <p className="text-[10px] text-center mt-1 text-[var(--sage-600)] font-medium">Swarm Hub</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: cfg.color }} /><span className="text-xs text-[var(--sage-500)]">{cfg.label}</span></div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Execute Tab (merged: chariot + engines) ===== */}
      {overviewTab === 'execute' && (
        <div className="space-y-4">
          {/* ── Chariot Execution ── */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2"><Network className="w-4 h-4 text-[var(--sage-500)]" />选择战车</h3>
            {chariots.length === 0 ? (
              <p className="text-sm text-[var(--sage-400)]">暂无战车，请先创建</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {chariots.map((c: any) => (
                  <button key={c.id} onClick={() => setSelectedChariotId(c.id)} className={`p-3 rounded-card border text-left transition-all ${selectedChariotId === c.id ? 'border-[var(--sage-500)] bg-[var(--sage-50)] ring-1 ring-[var(--sage-500)]' : 'border-[var(--sage-200)] hover:border-[var(--sage-400)]'}`}>
                    <p className="font-medium text-sm text-[var(--sage-800)]">{c.name}</p>
                    <p className="text-xs text-[var(--sage-400)] mt-1">{c.executionMode} · {c.agentIds?.length || 0} 个Agent</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2"><Terminal className="w-4 h-4 text-[var(--sage-500)]" />任务输入</h3>
            <textarea value={taskInput} onChange={(e) => setTaskInput(e.target.value)} placeholder="输入任务描述，例如：设计一个博客系统的技术方案..." className="w-full h-32 p-3 rounded-card border text-sm resize-none" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-[var(--sage-400)]">{taskInput.length} 字符 · 选中战车: {chariots.find((c) => c.id === selectedChariotId)?.name || '未选择'}</p>
              <div className="flex gap-2">
                {isExecuting && <button onClick={() => { abortRef.current?.(); setIsExecuting(false) }} className="flex items-center gap-1.5 px-4 py-2 rounded-card text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"><Square className="w-4 h-4" />停止</button>}
                <button onClick={handleExecute} disabled={isExecuting || !selectedChariotId || !taskInput.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-card text-sm font-medium bg-[var(--sage-500)] text-white hover:bg-[var(--sage-600)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}{isExecuting ? '执行中...' : '执行'}
                </button>
              </div>
            </div>
          </div>

          {executionEvents.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-[var(--sage-500)]" />执行进度</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {executionEvents.map((evt, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    {evt.type === 'start' && (<><Play className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" /><span className="text-[var(--sage-600)]">启动 {evt.mode} 模式，{evt.agentCount} 个Agent参与</span></>)}
                    {evt.type === 'subtask_start' && (<><Loader2 className="w-4 h-4 text-amber-500 mt-0.5 shrink-0 animate-spin" /><span className="text-[var(--sage-600)]">Agent <span className="font-medium">{evt.agentId.slice(0, 8)}</span> 开始执行任务 {evt.index + 1}/{evt.total}</span></>)}
                    {evt.type === 'subtask_complete' && (<><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /><div className="flex-1"><span className="text-[var(--sage-600)]">Agent <span className="font-medium">{evt.agentId.slice(0, 8)}</span> 完成<span className="text-xs text-[var(--sage-400)] ml-2">({evt.elapsedMs}ms)</span></span><p className="text-xs text-[var(--sage-400)] mt-1 line-clamp-3">{String(evt.data).slice(0, 200)}...</p></div></>)}
                    {evt.type === 'subtask_error' && (<><XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" /><span className="text-red-600">Agent <span className="font-medium">{evt.agentId.slice(0, 8)}</span> 失败: {evt.error}{evt.willRetry && <span className="text-xs ml-2">(将重试)</span>}</span></>)}
                    {evt.type === 'complete' && (<><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /><span className="text-green-600 font-medium">执行完成！总耗时 {evt.totalElapsedMs}ms</span></>)}
                    {evt.type === 'error' && (<><AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" /><span className="text-red-600">错误: {evt.error}</span></>)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {executionResult && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[var(--sage-500)]" />执行结果</h3>
              <pre className="text-xs text-[var(--sage-600)] bg-[var(--sage-50)] p-3 rounded-card overflow-auto max-h-64">{JSON.stringify(executionResult, null, 2)}</pre>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-dashed" style={{ borderColor: 'var(--sage-200)' }} />

          {/* ── Engine Swarm Execution (from SwarmArchitectures) ── */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-[var(--sage-500)]" />
              <div>
                <h1 className="text-2xl font-bold text-[var(--sage-800)]">多引擎执行</h1>
                <p className="text-sm text-[var(--sage-500)]">多引擎协作 · {engines.length} 个引擎可用</p>
              </div>
            </div>
            <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary flex items-center gap-2"><History className="w-4 h-4" />历史记录 {history.length > 0 && `(${history.length})`}</button>
          </div>

          {error && (
            <div className="card p-3 flex items-center gap-2 bg-red-50 border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded transition-colors"><X className="w-4 h-4 text-red-500" /></button>
            </div>
          )}

          {showHistory && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--sage-800)] flex items-center gap-2"><History className="w-4 h-4 text-[var(--sage-500)]" />执行历史</h3>
                {history.length > 0 && <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"><Trash2 className="w-3 h-3" /> 清空</button>}
              </div>
              {history.length === 0 ? (
                <p className="text-sm text-[var(--sage-400)]">暂无历史记录</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.map((run) => (
                    <div key={run.id} onClick={() => loadHistory(run)} className="p-3 rounded-card-md bg-[var(--sage-50)] hover:bg-[var(--sage-100)] cursor-pointer transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[var(--sage-700)]">{run.strategy === 'parallel' ? '并行' : run.strategy === 'sequential' ? '顺序' : '投票'}</span>
                        <span className="text-[10px] text-[var(--sage-400)]">{new Date(run.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-[var(--sage-600)] line-clamp-1">{run.prompt}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--sage-400)]">
                        <span>{run.engineIds.length} 个引擎</span><span>·</span><span>{Object.values(run.results).filter((r) => r.status === 'completed').length} 成功</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Engine config */}
            <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-4">
              <div className="card p-4 space-y-4">
                <h2 className="text-sm font-semibold text-[var(--sage-800)] flex items-center gap-2"><PanelLeft className="w-4 h-4 text-[var(--sage-500)]" />引擎配置</h2>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-[var(--sage-700)]">选择引擎</label>
                    <div className="flex gap-1">
                      <button onClick={selectAll} className="text-[10px] text-[var(--sage-500)] hover:text-[var(--sage-700)] px-1.5 py-0.5 rounded bg-[var(--sage-100)] transition-colors">全选</button>
                      <button onClick={clearSelection} className="text-[10px] text-[var(--sage-500)] hover:text-[var(--sage-700)] px-1.5 py-0.5 rounded bg-[var(--sage-100)] transition-colors">清空</button>
                    </div>
                  </div>
                  {enginesLoading ? (
                    <div className="flex items-center gap-2 py-4 text-[var(--sage-400)]"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">加载引擎...</span></div>
                  ) : engines.length === 0 ? (
                    <p className="text-xs text-[var(--sage-400)] py-2">暂无可用引擎</p>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {engines.map((engine) => {
                        const selected = selectedEngines.includes(engine.id)
                        return (
                          <label key={engine.id} className={`flex items-center gap-2 p-2 rounded-card-sm cursor-pointer transition-colors ${selected ? 'bg-[var(--sage-100)]' : 'hover:bg-[var(--sage-50)]'}`}>
                            <input type="checkbox" checked={selected} onChange={() => toggleEngine(engine.id)} className="w-4 h-4 rounded border-[var(--sage-300)] text-[var(--sage-500)] focus:ring-[var(--sage-500)]" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5"><Cpu className="w-3 h-3 text-[var(--sage-400)]" /><span className="text-xs font-medium text-[var(--sage-700)] truncate">{engine.brand}</span></div>
                              <span className="text-[10px] text-[var(--sage-400)]">{engine.model}</span>
                            </div>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${engine.status === 'healthy' ? 'bg-green-500' : 'bg-amber-500'}`} />
                          </label>
                        )
                      })}
                    </div>
                  )}
                  <p className="text-[10px] text-[var(--sage-400)] mt-1">已选择 {selectedEngines.length} 个引擎</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--sage-700)] mb-1.5 block">任务提示词</label>
                  <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="输入任务描述，例如：分析以下代码的潜在问题..." className="w-full h-28 p-3 rounded-card-md border text-sm resize-none" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
                  <p className="text-[10px] text-[var(--sage-400)] mt-1 text-right">{prompt.length} 字符</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--sage-700)] mb-2 block">协调策略</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'parallel' as Strategy, label: '并行', icon: Layers, desc: '同时执行' },
                      { id: 'sequential' as Strategy, label: '顺序', icon: ArrowRight, desc: '依次执行' },
                      { id: 'vote' as Strategy, label: '投票', icon: Vote, desc: '共识聚合' },
                    ] as const).map((s) => {
                      const Icon = s.icon
                      const active = strategy === s.id
                      return (
                        <button key={s.id} onClick={() => setStrategy(s.id)} className={`flex flex-col items-center gap-1 p-2.5 rounded-card-md border text-xs transition-all ${active ? 'border-[var(--sage-500)] bg-[var(--sage-50)] text-[var(--sage-700)]' : 'border-[var(--sage-200)] text-[var(--sage-500)] hover:border-[var(--sage-300)]'}`}>
                          <Icon className={`w-4 h-4 ${active ? 'text-[var(--sage-500)]' : 'text-[var(--sage-400)]'}`} /><span className="font-medium">{s.label}</span><span className="text-[9px] opacity-70">{s.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <button onClick={isRunning ? handleStop : handleStart} disabled={enginesLoading || selectedEngines.length === 0} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-card-md text-sm font-medium transition-colors ${isRunning ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-[var(--sage-500)] text-white hover:bg-[var(--sage-600)]'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                  {isRunning ? <><RefreshCw className="w-4 h-4" /> 停止执行</> : <><Play className="w-4 h-4" /> 启动引擎</>}
                </button>
              </div>
            </div>

            {/* Right: Execution results */}
            <div className="flex-1 space-y-4 min-w-0">
              {totalCount > 0 && (
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 className="text-sm font-semibold text-[var(--sage-800)] flex items-center gap-2"><Zap className="w-4 h-4 text-[var(--sage-500)]" />执行进度</h3>
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <span className="flex items-center gap-1 text-[var(--sage-500)]"><Loader2 className="w-3 h-3 animate-spin" /> {runningCount} 执行中</span>
                      <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3" /> {completedCount} 完成</span>
                      {failedCount > 0 && <span className="flex items-center gap-1 text-red-600"><XCircle className="w-3 h-3" /> {failedCount} 失败</span>}
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--sage-100)] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${totalCount > 0 ? ((completedCount + failedCount) / totalCount) * 100 : 0}%`, backgroundColor: failedCount > 0 ? '#f59e0b' : '#10b981' }} />
                  </div>
                </div>
              )}

              {selectedEngines.length > 0 && (
                <div className="space-y-3">
                  {selectedEngines.map((engineId) => {
                    const engine = engines.find((e) => e.id === engineId)
                    const state = engineStates[engineId] || { status: 'pending', content: '' }
                    if (!engine) return null
                    return (
                      <div key={engineId} className="card p-4">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[var(--sage-100)] flex items-center justify-center"><Cpu className="w-4 h-4 text-[var(--sage-500)]" /></div>
                            <div><h4 className="text-sm font-medium text-[var(--sage-800)]">{engine.brand}</h4><span className="text-[10px] text-[var(--sage-400)]">{engine.model}</span></div>
                          </div>
                          <span className={`text-[10px] px-2 py-1 rounded-full flex items-center gap-1 ${statusColor(state.status)}`}>{statusIcon(state.status)}{statusLabel(state.status)}</span>
                        </div>
                        <div className="p-3 rounded-card-md bg-[var(--sage-50)] text-xs text-[var(--sage-700)] min-h-[60px] max-h-48 overflow-y-auto whitespace-pre-wrap">
                          {state.content || (<span className="text-[var(--sage-400)] italic">{state.status === 'pending' ? '等待启动...' : state.status === 'running' ? '接收响应中...' : '无响应内容'}</span>)}
                        </div>
                        {state.error && <p className="mt-2 text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {state.error}</p>}
                        {state.endTime && state.startTime && <p className="mt-2 text-[10px] text-[var(--sage-400)] text-right">耗时 {((state.endTime - state.startTime) / 1000).toFixed(1)}s</p>}
                      </div>
                    )
                  })}
                </div>
              )}

              {aggregateResult && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
                    {aggregateResult.mode === 'vote' ? <Vote className="w-4 h-4 text-[var(--sage-500)]" /> : <GitMerge className="w-4 h-4 text-[var(--sage-500)]" />}
                    {aggregateResult.mode === 'vote' ? '投票聚合结果' : '执行聚合结果'}
                  </h3>
                  {aggregateResult.mode === 'vote' && aggregateResult.totalVotes > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 rounded-card-md bg-[var(--sage-50)] text-center"><p className="text-lg font-bold text-[var(--sage-800)]">{aggregateResult.totalVotes}</p><p className="text-[10px] text-[var(--sage-500)]">参与投票</p></div>
                        <div className="p-3 rounded-card-md bg-[var(--sage-50)] text-center"><p className="text-lg font-bold text-[var(--sage-800)]">{aggregateResult.consensusScore}%</p><p className="text-[10px] text-[var(--sage-500)]">共识度</p></div>
                        <div className="p-3 rounded-card-md bg-[var(--sage-50)] text-center"><p className="text-lg font-bold text-[var(--sage-800)]">{aggregateResult.avgLength}</p><p className="text-[10px] text-[var(--sage-500)]">平均长度</p></div>
                        <div className="p-3 rounded-card-md bg-[var(--sage-50)] text-center"><p className="text-lg font-bold text-[var(--sage-800)]">{aggregateResult.commonWords?.length || 0}</p><p className="text-[10px] text-[var(--sage-500)]">共同关键词</p></div>
                      </div>
                      {aggregateResult.commonWords?.length > 0 && (
                        <div>
                          <p className="text-xs text-[var(--sage-600)] mb-1.5">高频共识词</p>
                          <div className="flex flex-wrap gap-1.5">
                            {aggregateResult.commonWords.map((word: string) => (<span key={word} className="text-xs px-2 py-1 rounded-full bg-[var(--sage-100)] text-[var(--sage-600)]">{word}</span>))}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-[var(--sage-600)] mb-1.5">各引擎意见摘要</p>
                        <div className="space-y-2">
                          {aggregateResult.responses?.map((r: { id: string; content: string; engine?: Engine }) => (
                            <div key={r.id} className="p-2.5 rounded-card-md bg-[var(--sage-50)]">
                              <div className="flex items-center gap-2 mb-1"><Cpu className="w-3 h-3 text-[var(--sage-400)]" /><span className="text-xs font-medium text-[var(--sage-700)]">{r.engine?.brand || r.id}</span></div>
                              <p className="text-xs text-[var(--sage-600)] line-clamp-3">{r.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-card-md bg-[var(--sage-50)]">
                      <div className="flex items-center gap-3 mb-2"><BarChart3 className="w-4 h-4 text-[var(--sage-500)]" /><span className="text-xs text-[var(--sage-700)]">{aggregateResult.mode === 'parallel' ? '并行执行' : '顺序执行'}完成</span></div>
                      <div className="flex items-center gap-4 text-xs text-[var(--sage-600)]"><span>成功: {aggregateResult.completed} / {aggregateResult.total}</span><span>成功率: {Math.round((aggregateResult.completed / aggregateResult.total) * 100)}%</span></div>
                    </div>
                  )}
                </div>
              )}

              {selectedEngines.length === 0 && !aggregateResult && (
                <div className="card p-8 text-center"><Network className="w-12 h-12 text-[var(--sage-300)] mx-auto mb-3" /><p className="text-sm text-[var(--sage-500)]">请在左侧选择引擎并配置任务</p></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
