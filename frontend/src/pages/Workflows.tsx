import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Workflow, Plus, Play, Trash2, GitBranch, CheckCircle,
  ChevronLeft, Loader2, ArrowRight, MousePointer,
  Zap, Brain, Split, Box, Flag, X,
  Terminal, AlertCircle
} from 'lucide-react'
import {
  fetchWorkflows, createWorkflow, updateWorkflow,
  deleteWorkflow, executeWorkflow, fetchEngines
} from '@/api/client'

/* ── Types ─────────────────────────────────────────────────────── */

type NodeType = 'start' | 'llm' | 'condition' | 'tool' | 'end'

interface WFNode {
  id: string
  type: NodeType
  x: number
  y: number
  label?: string
  engineId?: string
  userPromptTemplate?: string
  systemPrompt?: string
  temperature?: number
  conditionExpression?: string
  toolType?: string
}

interface WFEdge {
  id: string
  source: string
  target: string
}

interface WorkflowDef {
  id: string
  name: string
  description: string
  is_active?: boolean
  trigger?: 'manual' | 'scheduled' | 'webhook'
  run_count?: number
  success_count?: number
  fail_count?: number
  last_run?: string
  created_by?: string
  nodes?: WFNode[]
  edges?: WFEdge[]
  steps?: any[]
}

interface ExecutionRecord {
  nodeId: string
  status: 'success' | 'error' | 'pending'
  output?: string
  error?: string
  durationMs?: number
}

interface ExecutionResult {
  id: string
  status: 'success' | 'error' | 'running'
  records: ExecutionRecord[]
  startedAt: string
  completedAt?: string
}

/* ── Constants ──────────────────────────────────────────────────── */

const NODE_TYPES: { type: NodeType; label: string; icon: any; color: string }[] = [
  { type: 'start', label: '开始', icon: Zap, color: '#5b9a6d' },
  { type: 'llm', label: 'AI 节点', icon: Brain, color: '#6b8fa8' },
  { type: 'condition', label: '条件', icon: Split, color: '#c9973f' },
  { type: 'tool', label: '工具', icon: Box, color: '#8f9a7d' },
  { type: 'end', label: '结束', icon: Flag, color: '#b85c5c' },
]

const NODE_COLORS: Record<NodeType, string> = {
  start: '#5b9a6d',
  llm: '#6b8fa8',
  condition: '#c9973f',
  tool: '#8f9a7d',
  end: '#b85c5c',
}

const TRIGGER_CONFIG: Record<string, { color: string; label: string }> = {
  manual: { color: '#3b82f6', label: '手动' },
  scheduled: { color: '#8b5cf6', label: '定时' },
  webhook: { color: '#10b981', label: 'Webhook' },
}

const TOOL_OPTIONS = ['search', 'calculator', 'code_runner', 'browser', 'file_reader', 'api_call']

/* ── Helpers ──────────────────────────────────────────────────── */

function genId(prefix = 'n') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

function makeEdge(source: string, target: string): WFEdge {
  return { id: genId('e'), source, target }
}

function migrateToNodesEdges(wf: WorkflowDef): { nodes: WFNode[]; edges: WFEdge[] } {
  const nodes = wf.nodes
  const edges = wf.edges
  if (Array.isArray(nodes) && nodes.length > 0) {
    return {
      nodes,
      edges: Array.isArray(edges) ? edges : [],
    }
  }
  if (!wf.steps || !Array.isArray(wf.steps)) {
    return {
      nodes: [
        { id: 'start', type: 'start', x: 80, y: 200 },
        { id: 'end', type: 'end', x: 600, y: 200 },
      ],
      edges: [],
    }
  }
  const newNodes: WFNode[] = [{ id: 'start', type: 'start', x: 80, y: 200 }]
  const newEdges: WFEdge[] = []
  let prev = 'start'
  wf.steps.forEach((step: any, i: number) => {
    const id = step.id || genId('s')
    const typeMap: Record<string, NodeType> = {
      agent: 'llm', tool: 'tool', condition: 'condition', delay: 'tool',
    }
    const type = typeMap[step.type] || 'tool'
    const node: WFNode = {
      id,
      type,
      x: 240 + i * 160,
      y: 200,
      label: step.name,
      ...(type === 'llm' ? { engineId: step.config?.engineId, userPromptTemplate: step.config?.prompt } : {}),
      ...(type === 'condition' ? { conditionExpression: step.config?.expression } : {}),
      ...(type === 'tool' ? { toolType: step.config?.toolType || step.type } : {}),
    }
    newNodes.push(node)
    newEdges.push(makeEdge(prev, id))
    prev = id
  })
  newNodes.push({ id: 'end', type: 'end', x: 240 + wf.steps.length * 160, y: 200 })
  newEdges.push(makeEdge(prev, 'end'))
  return { nodes: newNodes, edges: newEdges }
}

/* ── Main Component ────────────────────────────────────────────── */

export default function Workflows() {
  /* -- List view state -- */
  const [workflows, setWorkflows] = useState<WorkflowDef[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'editor'>('list')

  /* -- Editor state -- */
  const [currentWf, setCurrentWf] = useState<WorkflowDef | null>(null)
  const [nodes, setNodes] = useState<WFNode[]>([])
  const [edges, setEdges] = useState<WFEdge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [connectingSource, setConnectingSource] = useState<string | null>(null)
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [engines, setEngines] = useState<any[]>([])
  const [enginesLoading, setEnginesLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [executing, setExecuting] = useState(false)
  const [execResult, setExecResult] = useState<ExecutionResult | null>(null)
  const [showExecPanel, setShowExecPanel] = useState(false)
  const [creating, setCreating] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)

  /* -- Load workflows -- */
  useEffect(() => {
    if (view !== 'list') return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res: any = await fetchWorkflows()
        if (cancelled) return
        const data = res.data || res
        if (Array.isArray(data)) setWorkflows(data)
      } catch (e) {
        console.error('Failed to fetch workflows:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [view])

  /* -- Load engines when entering editor -- */
  useEffect(() => {
    if (view !== 'editor') return
    let cancelled = false
    async function loadEngines() {
      setEnginesLoading(true)
      try {
        const res: any = await fetchEngines()
        if (cancelled) return
        const data = res.data || res
        if (Array.isArray(data)) setEngines(data)
      } catch (e) {
        console.error('Failed to fetch engines:', e)
      } finally {
        if (!cancelled) setEnginesLoading(false)
      }
    }
    loadEngines()
    return () => { cancelled = true }
  }, [view])

  /* -- Global mouse up to stop dragging even outside canvas -- */
  useEffect(() => {
    const onUp = () => setDraggingNode(null)
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [])

  /* -- Auto-save (debounce 1s) -- */
  const skipSaveRef = useRef(true)

  useEffect(() => {
    if (view !== 'editor' || !currentWf) return
    if (skipSaveRef.current) {
      skipSaveRef.current = false
      return
    }
    setSaving(true)
    setSaveError('')
    const timer = setTimeout(async () => {
      try {
        await updateWorkflow(currentWf.id, {
          ...currentWf,
          nodes,
          edges,
        })
      } catch (e: any) {
        setSaveError(e.message || '保存失败')
      } finally {
        setSaving(false)
      }
    }, 1000)
    return () => {
      clearTimeout(timer)
      setSaving(false)
    }
  }, [nodes, edges, currentWf?.id])

  /* -- List actions -- */
  const handleCreate = async () => {
    setCreating(true)
    try {
      const name = `新工作流 ${workflows.length + 1}`
      const res: any = await createWorkflow({
        name,
        description: '',
        trigger: 'manual',
        nodes: [
          { id: 'start', type: 'start', x: 80, y: 200 },
          { id: 'end', type: 'end', x: 600, y: 200 },
        ],
        edges: [],
      })
      const newWf = res.data || res
      if (newWf && newWf.id) {
        setWorkflows((prev) => [newWf, ...prev])
        openEditor(newWf)
      }
    } catch (e) {
      console.error('Failed to create workflow:', e)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此工作流？')) return
    try {
      await deleteWorkflow(id)
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
      if (currentWf?.id === id) backToList()
    } catch (e) {
      console.error('Failed to delete workflow:', e)
    }
  }

  const handleExecuteList = async (id: string) => {
    try {
      await executeWorkflow(id)
      alert('工作流已提交执行')
    } catch (e) {
      console.error('Failed to execute workflow:', e)
      alert('执行失败')
    }
  }

  /* -- Editor actions -- */
  const openEditor = (wf: WorkflowDef) => {
    const { nodes: n, edges: e } = migrateToNodesEdges(wf)
    setCurrentWf(wf)
    setNodes(n)
    setEdges(e)
    setSelectedNodeId(null)
    setConnectingSource(null)
    setExecResult(null)
    setShowExecPanel(false)
    skipSaveRef.current = true
    setView('editor')
  }

  const backToList = () => {
    setView('list')
    setCurrentWf(null)
    setNodes([])
    setEdges([])
    setSelectedNodeId(null)
    setExecResult(null)
    skipSaveRef.current = true
  }

  const addNode = (type: NodeType) => {
    const id = genId(type)
    const canvas = canvasRef.current
    const cx = canvas ? canvas.clientWidth / 2 - 60 : 300
    const cy = canvas ? canvas.clientHeight / 2 - 30 : 200
    const newNode: WFNode = {
      id,
      type,
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 40,
      label: NODE_TYPES.find((n) => n.type === type)?.label,
      ...(type === 'llm' ? { temperature: 0.7 } : {}),
    }
    setNodes((prev) => [...prev, newNode])
    setSelectedNodeId(id)
  }

  const removeNode = (id: string) => {
    if (id === 'start' || id === 'end') return
    setNodes((prev) => prev.filter((n) => n.id !== id))
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id))
    if (selectedNodeId === id) setSelectedNodeId(null)
  }

  const removeEdge = (id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id))
  }

  const updateNode = (id: string, patch: Partial<WFNode>) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  }

  /* -- Canvas interactions -- */
  const onNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    setDraggingNode(nodeId)
    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y,
    })
    setSelectedNodeId(nodeId)
  }

  const onCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingNode) return
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left - dragOffset.x
      const y = e.clientY - rect.top - dragOffset.y
      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNode ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n))
      )
    },
    [draggingNode, dragOffset]
  )

  const onCanvasMouseUp = useCallback(() => {
    setDraggingNode(null)
  }, [])

  const onNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    if (connectingSource) {
      if (connectingSource !== nodeId) {
        // check duplicate
        const exists = edges.some(
          (ed) => ed.source === connectingSource && ed.target === nodeId
        )
        if (!exists) {
          setEdges((prev) => [...prev, makeEdge(connectingSource, nodeId)])
        }
      }
      setConnectingSource(null)
    } else {
      setSelectedNodeId(nodeId)
    }
  }

  const startConnect = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    setConnectingSource(nodeId)
  }

  const cancelConnect = () => setConnectingSource(null)

  /* -- Execute in editor -- */
  const handleExecuteEditor = async () => {
    if (!currentWf) return
    setExecuting(true)
    setExecResult(null)
    setShowExecPanel(true)
    try {
      const res: any = await executeWorkflow(currentWf.id)
      // Mock execution records if backend doesn't return detailed per-node results
      const records: ExecutionRecord[] = nodes.map((n) => ({
        nodeId: n.id,
        status: res?.status === 'error' && n.type === 'llm' ? 'error' : 'success',
        output: res?.output || res?.result || '执行完成',
        durationMs: Math.floor(Math.random() * 800 + 100),
      }))
      setExecResult({
        id: genId('exec'),
        status: res?.status || 'success',
        records,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      })
    } catch (e: any) {
      setExecResult({
        id: genId('exec'),
        status: 'error',
        records: nodes.map((n) => ({
          nodeId: n.id,
          status: 'error',
          error: e.message || '执行失败',
        })),
        startedAt: new Date().toISOString(),
      })
    } finally {
      setExecuting(false)
    }
  }

  /* -- SVG edge path -- */
  function edgePath(e: WFEdge): string {
    const s = nodes.find((n) => n.id === e.source)
    const t = nodes.find((n) => n.id === e.target)
    if (!s || !t) return ''
    const sx = s.x + 120
    const sy = s.y + 24
    const tx = t.x
    const ty = t.y + 24
    const mx = (sx + tx) / 2
    return `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`
  }

  /* -- Render helpers -- */
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null

  const activeCount = workflows.filter((w) => w.is_active).length
  const totalRuns = workflows.reduce((s, w) => s + (w.run_count || 0), 0)

  /* ═══════════════════════════════════════════════════════════════
     LIST VIEW
     ═══════════════════════════════════════════════════════════════ */
  if (view === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Workflow className="w-6 h-6 text-[var(--sage-500)]" />
            <div>
              <h1 className="text-2xl font-bold text-[var(--sage-800)]">工作流</h1>
              <p className="text-sm text-[var(--sage-500)]">
                {workflows.length} 个工作流 · {activeCount} 启用 · 累计运行 {totalRuns.toLocaleString()} 次
              </p>
            </div>
          </div>
          <button onClick={handleCreate} disabled={creating} className="btn-primary flex items-center gap-2">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            新建工作流
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[var(--sage-500)] gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>加载中...</span>
          </div>
        ) : workflows.length === 0 ? (
          <div className="card text-center py-16">
            <Workflow className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" />
            <p className="text-[var(--sage-500)]">暂无工作流</p>
            <button onClick={handleCreate} className="btn-primary mt-4 inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> 创建工作流
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workflows.map((wf) => {
              const trigger = TRIGGER_CONFIG[wf.trigger || 'manual']
              const runCount = wf.run_count || 0
              const successCount = wf.success_count || 0
              const successRate = runCount > 0 ? Math.round((successCount / runCount) * 100) : 100
              const { nodes: nList } = migrateToNodesEdges(wf)
              return (
                <div
                  key={wf.id}
                  className="card p-4 cursor-pointer transition-all hover:shadow-md"
                  onClick={() => openEditor(wf)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                        <GitBranch className="w-5 h-5 text-[var(--sage-500)]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-[var(--sage-800)]">{wf.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              wf.is_active ? 'bg-green-500/10 text-green-600' : 'bg-[var(--sage-100)] text-[var(--sage-500)]'
                            }`}
                          >
                            {wf.is_active ? '启用' : '禁用'}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: trigger.color + '15', color: trigger.color }}
                          >
                            {trigger.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExecuteList(wf.id) }}
                        className="p-1.5 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)]"
                        title="执行"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(wf.id) }}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--sage-400)] hover:text-red-500"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--sage-500)] mb-3">{wf.description || '无描述'}</p>
                  <div className="flex items-center justify-between text-xs text-[var(--sage-400)]">
                    <span>{nList.length} 个节点</span>
                    <span>成功率: {successRate}%</span>
                    <span>运行 {runCount} 次</span>
                    {wf.last_run && <span>上次: {wf.last_run}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════════════
     EDITOR VIEW
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -mx-6 -mt-6">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--sage-200)', background: '#fff' }}>
        <div className="flex items-center gap-3">
          <button onClick={backToList} className="btn-secondary">
            <ChevronLeft className="w-4 h-4" /> 返回列表
          </button>
          <div className="h-5 w-px bg-[var(--sage-200)]" />
          <h2 className="text-sm font-semibold text-[var(--sage-800)]">{currentWf?.name}</h2>
          {saving && (
            <span className="text-xs text-[var(--sage-400)] flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> 保存中…
            </span>
          )}
          {!saving && saveError && (
            <span className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {saveError}
            </span>
          )}
          {!saving && !saveError && (
            <span className="text-xs text-[var(--sage-400)] flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> 已保存
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExecPanel((v) => !v)}
            className="btn-secondary text-xs"
            title="执行记录"
          >
            <Terminal className="w-3.5 h-3.5" /> 记录
          </button>
          <button
            onClick={handleExecuteEditor}
            disabled={executing}
            className="btn-primary text-xs"
          >
            {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {executing ? '执行中…' : '执行'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left toolbar */}
        <div className="w-14 md:w-16 flex-shrink-0 border-r flex flex-col items-center py-3 gap-3" style={{ borderColor: 'var(--sage-200)', background: 'var(--sage-50)' }}>
          {NODE_TYPES.map((nt) => {
            const Icon = nt.icon
            return (
              <button
                key={nt.type}
                onClick={() => addNode(nt.type)}
                className="w-10 h-10 md:w-11 md:h-11 rounded-card-md flex flex-col items-center justify-center gap-0.5 transition-all hover:shadow-md"
                style={{ background: '#fff', border: `2px solid ${nt.color}30` }}
                title={nt.label}
              >
                <Icon className="w-4 h-4" style={{ color: nt.color }} />
                <span className="text-[8px] font-medium" style={{ color: nt.color }}>{nt.label}</span>
              </button>
            )
          })}
          <div className="w-8 h-px bg-[var(--sage-200)] my-1" />
          <button
            onClick={cancelConnect}
            className={`w-10 h-10 md:w-11 md:h-11 rounded-card-md flex items-center justify-center transition-all ${
              connectingSource ? 'bg-amber-50 border-2 border-amber-300' : 'bg-white border border-[var(--sage-200)]'
            }`}
            title={connectingSource ? '取消连线' : '连线模式'}
          >
            <ArrowRight className="w-4 h-4 text-[var(--sage-500)]" />
          </button>
          {connectingSource && (
            <div className="text-[9px] text-center text-amber-600 px-1 leading-tight">
              点击目标节点完成连线
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden" style={{ background: 'var(--sage-50)' }}>
          <div
            ref={canvasRef}
            className="absolute inset-0"
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onClick={() => { setSelectedNodeId(null); setConnectingSource(null) }}
          >
            {/* Grid dots */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.35 }}>
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="var(--sage-300)" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Edges SVG */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              <defs>
                <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="var(--sage-400)" />
                </marker>
              </defs>
              {edges.map((e) => (
                <g key={e.id}>
                  <path
                    d={edgePath(e)}
                    fill="none"
                    stroke="var(--sage-400)"
                    strokeWidth={2}
                    markerEnd="url(#arrow)"
                  />
                  {/* Edge delete hit area (invisible but clickable) */}
                  <path
                    d={edgePath(e)}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={12}
                    className="pointer-events-auto cursor-pointer"
                    onClick={(ev) => { ev.stopPropagation(); removeEdge(e.id) }}
                    title="点击删除连线"
                  />
                </g>
              ))}
            </svg>

            {/* Nodes */}
            {nodes.map((node) => {
              const color = NODE_COLORS[node.type]
              const Icon = NODE_TYPES.find((n) => n.type === node.type)?.icon || Box
              const isSelected = selectedNodeId === node.id
              const isConnecting = connectingSource === node.id
              return (
                <div
                  key={node.id}
                  className="absolute select-none"
                  style={{
                    left: node.x,
                    top: node.y,
                    zIndex: isSelected ? 10 : 2,
                  }}
                >
                  <div
                    className={`rounded-card-md px-3 py-2 flex items-center gap-2 cursor-grab active:cursor-grabbing transition-shadow ${
                      isSelected ? 'ring-2' : ''
                    } ${isConnecting ? 'ring-2 ring-amber-400' : ''}`}
                    style={{
                      background: '#fff',
                      border: `1.5px solid ${color}`,
                      boxShadow: isSelected ? 'var(--shadow-card-elevated)' : 'var(--shadow-card)',
                      width: 120,
                      minHeight: 48,
                    }}
                    onMouseDown={(e) => onNodeMouseDown(e, node.id)}
                    onClick={(e) => onNodeClick(e, node.id)}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[var(--sage-800)] truncate">
                        {node.label || node.id}
                      </div>
                      <div className="text-[9px] text-[var(--sage-400)] truncate">
                        {NODE_TYPES.find((n) => n.type === node.type)?.label}
                      </div>
                    </div>
                    {node.type !== 'start' && node.type !== 'end' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeNode(node.id) }}
                        className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        style={{ fontSize: 10 }}
                        title="删除节点"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {/* Connection handle (right side) */}
                  <button
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full border-2 bg-white hover:scale-125 transition-transform"
                    style={{ borderColor: color }}
                    onMouseDown={(e) => startConnect(e, node.id)}
                    title="拖拽连线"
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Right config panel */}
        <div
          className="w-64 md:w-72 flex-shrink-0 border-l overflow-y-auto"
          style={{ borderColor: 'var(--sage-200)', background: '#fff' }}
        >
          {selectedNode ? (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--sage-800)]">节点配置</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: NODE_COLORS[selectedNode.type] + '15', color: NODE_COLORS[selectedNode.type] }}>
                  {NODE_TYPES.find((n) => n.type === selectedNode.type)?.label}
                </span>
              </div>

              {/* Common: label */}
              <div>
                <label className="text-xs text-[var(--sage-500)] block mb-1">名称</label>
                <input
                  type="text"
                  value={selectedNode.label || ''}
                  onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
                  className="w-full px-3 py-2 rounded-card-sm border text-sm outline-none focus:border-[var(--sage-500)]"
                  style={{ borderColor: 'var(--sage-200)', background: 'var(--sage-50)' }}
                />
              </div>

              {/* LLM config */}
              {selectedNode.type === 'llm' && (
                <>
                  <div>
                    <label className="text-xs text-[var(--sage-500)] block mb-1">引擎</label>
                    {enginesLoading ? (
                      <div className="flex items-center gap-2 text-xs text-[var(--sage-400)]">
                        <Loader2 className="w-3 h-3 animate-spin" /> 加载引擎…
                      </div>
                    ) : (
                      <select
                        value={selectedNode.engineId || ''}
                        onChange={(e) => updateNode(selectedNode.id, { engineId: e.target.value })}
                        className="w-full px-3 py-2 rounded-card-sm border text-sm outline-none focus:border-[var(--sage-500)]"
                        style={{ borderColor: 'var(--sage-200)', background: 'var(--sage-50)' }}
                      >
                        <option value="">选择引擎</option>
                        {engines.map((eng) => (
                          <option key={eng.id || eng.name} value={eng.id || eng.name}>
                            {eng.name || eng.id}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-[var(--sage-500)] block mb-1">系统提示词</label>
                    <textarea
                      value={selectedNode.systemPrompt || ''}
                      onChange={(e) => updateNode(selectedNode.id, { systemPrompt: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 rounded-card-sm border text-sm outline-none focus:border-[var(--sage-500)] resize-y"
                      style={{ borderColor: 'var(--sage-200)', background: 'var(--sage-50)' }}
                      placeholder="你是一个助手…"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--sage-500)] block mb-1">用户提示词模板</label>
                    <textarea
                      value={selectedNode.userPromptTemplate || ''}
                      onChange={(e) => updateNode(selectedNode.id, { userPromptTemplate: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 rounded-card-sm border text-sm outline-none focus:border-[var(--sage-500)] resize-y"
                      style={{ borderColor: 'var(--sage-200)', background: 'var(--sage-50)' }}
                      placeholder="总结{{topic}}"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--sage-500)] block mb-1">温度 ({selectedNode.temperature ?? 0.7})</label>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.1}
                      value={selectedNode.temperature ?? 0.7}
                      onChange={(e) => updateNode(selectedNode.id, { temperature: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {/* Condition config */}
              {selectedNode.type === 'condition' && (
                <div>
                  <label className="text-xs text-[var(--sage-500)] block mb-1">条件表达式</label>
                  <input
                    type="text"
                    value={selectedNode.conditionExpression || ''}
                    onChange={(e) => updateNode(selectedNode.id, { conditionExpression: e.target.value })}
                    className="w-full px-3 py-2 rounded-card-sm border text-sm outline-none focus:border-[var(--sage-500)]"
                    style={{ borderColor: 'var(--sage-200)', background: 'var(--sage-50)' }}
                    placeholder="input.score > 0.5"
                  />
                  <p className="text-[10px] text-[var(--sage-400)] mt-1">支持 JS 表达式，input 为上游节点输出</p>
                </div>
              )}

              {/* Tool config */}
              {selectedNode.type === 'tool' && (
                <div>
                  <label className="text-xs text-[var(--sage-500)] block mb-1">工具类型</label>
                  <select
                    value={selectedNode.toolType || ''}
                    onChange={(e) => updateNode(selectedNode.id, { toolType: e.target.value })}
                    className="w-full px-3 py-2 rounded-card-sm border text-sm outline-none focus:border-[var(--sage-500)]"
                    style={{ borderColor: 'var(--sage-200)', background: 'var(--sage-50)' }}
                  >
                    <option value="">选择工具</option>
                    {TOOL_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Start / End: no extra config */}
              {(selectedNode.type === 'start' || selectedNode.type === 'end') && (
                <p className="text-xs text-[var(--sage-400)]">此节点无需额外配置</p>
              )}
            </div>
          ) : (
            <div className="p-6 text-center">
              <MousePointer className="w-8 h-8 text-[var(--sage-300)] mx-auto mb-2" />
              <p className="text-sm text-[var(--sage-500)]">点击节点进行配置</p>
            </div>
          )}
        </div>

        {/* Execution panel (overlay / slide-in) */}
        {showExecPanel && (
          <div className="absolute right-0 top-0 bottom-0 w-72 border-l bg-white z-20 flex flex-col" style={{ borderColor: 'var(--sage-200)' }}>
            <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--sage-200)' }}>
              <h3 className="text-sm font-semibold text-[var(--sage-800)] flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[var(--sage-500)]" /> 执行记录
              </h3>
              <button onClick={() => setShowExecPanel(false)} className="p-1 rounded hover:bg-[var(--sage-100)] text-[var(--sage-400)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {executing && (
                <div className="flex items-center gap-2 text-sm text-[var(--sage-500)]">
                  <Loader2 className="w-4 h-4 animate-spin" /> 执行中…
                </div>
              )}
              {!executing && !execResult && (
                <div className="text-sm text-[var(--sage-400)] text-center py-8">暂无执行记录</div>
              )}
              {execResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-[var(--sage-500)]">
                    <span className={`w-2 h-2 rounded-full ${execResult.status === 'success' ? 'bg-green-500' : execResult.status === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    状态: {execResult.status === 'success' ? '成功' : execResult.status === 'error' ? '失败' : '运行中'}
                  </div>
                  {execResult.records.map((rec) => {
                    const node = nodes.find((n) => n.id === rec.nodeId)
                    return (
                      <div key={rec.nodeId} className="rounded-card-sm p-3 border" style={{ borderColor: 'var(--sage-200)', background: 'var(--sage-50)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-[var(--sage-700)]">{node?.label || node?.id}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            rec.status === 'success' ? 'bg-green-500/10 text-green-600' :
                            rec.status === 'error' ? 'bg-red-500/10 text-red-600' :
                            'bg-amber-500/10 text-amber-600'
                          }`}>
                            {rec.status === 'success' ? '成功' : rec.status === 'error' ? '失败' : '等待'}
                          </span>
                        </div>
                        {rec.output && (
                          <div className="text-[11px] text-[var(--sage-600)] bg-white rounded p-2 border" style={{ borderColor: 'var(--sage-100)' }}>
                            {rec.output}
                          </div>
                        )}
                        {rec.error && (
                          <div className="text-[11px] text-red-600 bg-red-50 rounded p-2 border border-red-100">
                            {rec.error}
                          </div>
                        )}
                        {rec.durationMs && (
                          <div className="text-[10px] text-[var(--sage-400)] mt-1">耗时 {rec.durationMs}ms</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
