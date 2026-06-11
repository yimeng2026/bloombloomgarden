import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Palette, Plus, Search, Loader2, Trash2, X, Eye, ArrowLeft,
  Save, History, Type, Bot, Wrench, GitBranch, MousePointer2,
  GripVertical, RotateCcw, CheckCircle2, Clock, MoreHorizontal,
} from 'lucide-react'
import {
  fetchCanvases, getCanvas, createCanvas, deleteCanvas,
  updateCanvas, createCanvasRevision, getCanvasRevisions, restoreCanvasRevision,
} from '@/api/client'

/* ── Types ── */

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

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  active: { color: '#10b981', label: '活跃' },
  archived: { color: '#6b7280', label: '归档' },
  draft: { color: '#f59e0b', label: '草稿' },
}

const NODE_TYPE_CONFIG: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  text: { icon: Type, label: '文本', color: 'var(--sage-600)', bg: 'var(--sage-100)' },
  llm: { icon: Bot, label: 'AI', color: 'var(--bloom-sky)', bg: 'rgba(127,163,176,0.15)' },
  tool: { icon: Wrench, label: '工具', color: 'var(--bloom-amber)', bg: 'rgba(212,163,115,0.15)' },
}

/* ── Helpers ── */

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

/* ── Sub-components ── */

function GridBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage:
          'linear-gradient(var(--sage-200) 1px, transparent 1px), linear-gradient(90deg, var(--sage-200) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        opacity: 0.4,
      }}
    />
  )
}

function EdgeLayer({
  edges,
  nodes,
}: {
  edges: CanvasEdge[]
  nodes: CanvasNode[]
}) {
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
          <path
            key={edge.id}
            d={`M ${sx} ${sy} C ${cx} ${sy}, ${cx} ${ty}, ${tx} ${ty}`}
            fill="none"
            stroke="var(--sage-300)"
            strokeWidth={2}
          />
        )
      })}
    </svg>
  )
}

/* ── Main Page ── */

export default function CanvasPage() {
  /* -- List view state -- */
  const [canvases, setCanvases] = useState<CanvasItem[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '' })
  const [creating, setCreating] = useState(false)

  /* -- Editor view state -- */
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

  /* -- Drag state (refs to avoid re-renders) -- */
  const dragRef = useRef<{
    nodeId: string | null
    offsetX: number
    offsetY: number
    dragging: boolean
  }>({ nodeId: null, offsetX: 0, offsetY: 0, dragging: false })

  const canvasAreaRef = useRef<HTMLDivElement>(null)

  /* -- Load list -- */
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

  /* -- Auto-save (debounce 1s) -- */
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

  /* -- List actions -- */
  const filtered = canvases.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    )
  })

  const activeCount = canvases.filter((c) => c.status === 'active').length

  const handleCreate = async () => {
    if (!createForm.name.trim()) return
    try {
      setCreating(true)
      const res: any = await createCanvas({
        name: createForm.name,
        description: createForm.description,
        content: { nodes: [], edges: [] },
      })
      const newCanvas = res.data || {
        id: `canvas-${Date.now()}`,
        name: createForm.name,
        description: createForm.description,
        status: 'active',
        createdAt: new Date().toISOString(),
      }
      setCanvases((prev) => [newCanvas, ...prev])
      setShowCreateModal(false)
      setCreateForm({ name: '', description: '' })
    } catch (e) {
      console.error('Failed to create canvas:', e)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
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

  /* -- Enter editor -- */
  const enterEditor = async (canvas: CanvasItem) => {
    try {
      setEditorLoading(true)
      setEditorCanvas(canvas)
      const res: any = await getCanvas(canvas.id)
      const detail = res.data || res
      const content = detail.content || canvas.content || { nodes: [], edges: [] }
      setCanvasData(
        content.nodes && content.edges
          ? content
          : { nodes: [], edges: [] }
      )
    } catch (e) {
      console.error('Failed to load canvas detail:', e)
      setCanvasData({ nodes: [], edges: [] })
    } finally {
      setEditorLoading(false)
    }
  }

  /* -- Node operations -- */
  const addNode = (type: CanvasNode['type']) => {
    const id = generateId('n')
    const newNode: CanvasNode = {
      id,
      type,
      x: 100 + Math.random() * 40,
      y: 100 + Math.random() * 40,
      content: type === 'text' ? '新文本节点' : undefined,
      engineId: type === 'llm' ? 'zhipu' : undefined,
      prompt: type === 'llm' ? '' : undefined,
      toolName: type === 'tool' ? '' : undefined,
    }
    setCanvasData((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }))
    setSelectedNodeId(id)
  }

  const updateNode = (id: string, patch: Partial<CanvasNode>) => {
    setCanvasData((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }))
  }

  const deleteNode = (id: string) => {
    setCanvasData((prev) => ({
      nodes: prev.nodes.filter((n) => n.id !== id),
      edges: prev.edges.filter((e) => e.source !== id && e.target !== id),
    }))
    if (selectedNodeId === id) setSelectedNodeId(null)
  }

  const addEdge = (source: string, target: string) => {
    if (source === target) return
    const exists = canvasData.edges.some(
      (e) => e.source === source && e.target === target
    )
    if (exists) return
    setCanvasData((prev) => ({
      ...prev,
      edges: [...prev.edges, { id: generateId('e'), source, target }],
    }))
  }

  const deleteEdge = (id: string) => {
    setCanvasData((prev) => ({
      ...prev,
      edges: prev.edges.filter((e) => e.id !== id),
    }))
  }

  /* -- Drag handlers -- */
  const onNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const node = canvasData.nodes.find((n) => n.id === nodeId)
    if (!node) return
    const rect = canvasAreaRef.current?.getBoundingClientRect()
    if (!rect) return
    dragRef.current = {
      nodeId,
      offsetX: e.clientX - rect.left - node.x,
      offsetY: e.clientY - rect.top - node.y,
      dragging: false,
    }
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
      // Click without drag: toggle selection or connect
      if (connecting) {
        if (connecting !== nodeId) {
          addEdge(connecting, nodeId)
        }
        setConnecting(null)
      }
    }
    dragRef.current = { nodeId: null, offsetX: 0, offsetY: 0, dragging: false }
  }

  /* -- Revisions -- */
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
      await createCanvasRevision(editorCanvas.id, {
        note: revisionNote || '手动保存',
        content: canvasData,
      })
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
      if (content) {
        setCanvasData(content)
      }
      if (showRevisions) loadRevisions(editorCanvas.id)
    } catch (e) {
      console.error('Failed to restore revision:', e)
    } finally {
      setRestoring(false)
    }
  }

  /* -- Render: Editor -- */
  if (editorCanvas) {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)] -mx-4 -my-4 md:-mx-6 lg:-mx-8 md:-my-4">
        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b shrink-0"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditorCanvas(null)
                setCanvasData({ nodes: [], edges: [] })
                setSelectedNodeId(null)
                setConnecting(null)
                setShowRevisions(false)
              }}
              className="btn-secondary"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">返回</span>
            </button>
            <div>
              <h2 className="text-sm font-semibold text-[var(--sage-800)]">{editorCanvas.name}</h2>
              <p className="text-[10px] text-[var(--sage-500)]">
                {canvasData.nodes.length} 节点 · {canvasData.edges.length} 连接
                {saving && ' · 保存中...'}
                {saveError && ` · 保存失败: ${saveError}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRevisionModal(true)}
              className="btn-secondary text-xs"
              title="保存版本"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">保存版本</span>
            </button>
            <button
              onClick={() => {
                setShowRevisions((v) => !v)
                if (!showRevisions && editorCanvas) loadRevisions(editorCanvas.id)
              }}
              className={`btn-secondary text-xs ${showRevisions ? 'ring-1 ring-[var(--sage-400)]' : ''}`}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">版本历史</span>
            </button>
            <div className="w-px h-5 bg-[var(--sage-200)] mx-1" />
            <button onClick={() => addNode('text')} className="btn-secondary text-xs">
              <Type className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">文本</span>
            </button>
            <button onClick={() => addNode('llm')} className="btn-secondary text-xs">
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI</span>
            </button>
            <button onClick={() => addNode('tool')} className="btn-secondary text-xs">
              <Wrench className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">工具</span>
            </button>
            <button
              onClick={() => setConnecting((c) => (c ? null : 'start'))}
              className={`btn-secondary text-xs ${connecting ? 'ring-1 ring-[var(--sage-400)]' : ''}`}
              title="连接模式：先点击此按钮，再依次点击两个节点"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">连接</span>
            </button>
          </div>
        </div>

        {/* Editor body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas area */}
          <div
            ref={canvasAreaRef}
            className="relative flex-1 overflow-auto"
            style={{ backgroundColor: 'var(--sage-50)' }}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onClick={() => {
              if (!dragRef.current.dragging) {
                setSelectedNodeId(null)
                if (connecting) setConnecting(null)
              }
            }}
          >
            {editorLoading ? (
              <div className="flex items-center justify-center h-full gap-2 text-[var(--sage-500)]">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>加载画布...</span>
              </div>
            ) : (
              <>
                <GridBackground />
                <EdgeLayer edges={canvasData.edges} nodes={canvasData.nodes} />
                {canvasData.nodes.map((node) => {
                  const cfg = NODE_TYPE_CONFIG[node.type]
                  const Icon = cfg.icon
                  const isSelected = selectedNodeId === node.id
                  return (
                    <div
                      key={node.id}
                      className="absolute z-10 select-none"
                      style={{
                        left: node.x,
                        top: node.y,
                        width: 180,
                      }}
                    >
                      <div
                        className={`rounded-card-md p-3 border transition-shadow cursor-move ${
                          isSelected ? 'ring-2 ring-[var(--sage-500)]' : ''
                        } ${connecting ? 'hover:ring-1 hover:ring-[var(--sage-400)]' : ''}`}
                        style={{
                          backgroundColor: '#fff',
                          borderColor: isSelected ? 'var(--sage-500)' : 'var(--sage-200)',
                          boxShadow: 'var(--shadow-card)',
                        }}
                        onMouseDown={(e) => onNodeMouseDown(e, node.id)}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (connecting && connecting !== 'start') {
                            addEdge(connecting, node.id)
                            setConnecting(null)
                          } else if (connecting === 'start') {
                            setConnecting(node.id)
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center"
                            style={{ backgroundColor: cfg.bg }}
                          >
                            <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                          </div>
                          <span className="text-[10px] font-medium text-[var(--sage-500)] uppercase tracking-wide">
                            {cfg.label}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNode(node.id)
                            }}
                            className="ml-auto p-1 rounded hover:bg-red-500/10 text-[var(--sage-400)] hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        {node.type === 'text' && (
                          <textarea
                            className="w-full text-xs bg-transparent resize-none outline-none"
                            rows={2}
                            value={node.content || ''}
                            onChange={(e) => updateNode(node.id, { content: e.target.value })}
                            onMouseDown={(e) => e.stopPropagation()}
                            placeholder="输入文本..."
                            style={{ color: 'var(--sage-800)' }}
                          />
                        )}

                        {node.type === 'llm' && (
                          <div className="space-y-1.5">
                            <input
                              className="w-full text-[10px] px-1.5 py-1 rounded border outline-none"
                              style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)', color: 'var(--sage-800)' }}
                              value={node.engineId || ''}
                              onChange={(e) => updateNode(node.id, { engineId: e.target.value })}
                              onMouseDown={(e) => e.stopPropagation()}
                              placeholder="引擎 ID"
                            />
                            <textarea
                              className="w-full text-[10px] bg-transparent resize-none outline-none border rounded px-1.5 py-1"
                              style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)', color: 'var(--sage-800)' }}
                              rows={2}
                              value={node.prompt || ''}
                              onChange={(e) => updateNode(node.id, { prompt: e.target.value })}
                              onMouseDown={(e) => e.stopPropagation()}
                              placeholder="提示词..."
                            />
                          </div>
                        )}

                        {node.type === 'tool' && (
                          <input
                            className="w-full text-xs px-1.5 py-1 rounded border outline-none"
                            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)', color: 'var(--sage-800)' }}
                            value={node.toolName || ''}
                            onChange={(e) => updateNode(node.id, { toolName: e.target.value })}
                            onMouseDown={(e) => e.stopPropagation()}
                            placeholder="工具名称"
                          />
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Connection hint */}
                {connecting && (
                  <div
                    className="absolute bottom-4 left-4 z-20 px-3 py-1.5 rounded-card text-xs"
                    style={{ backgroundColor: 'var(--sage-800)', color: '#fff' }}
                  >
                    {connecting === 'start'
                      ? '请点击第一个节点'
                      : '请点击第二个节点以完成连接'}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Revisions sidebar */}
          {showRevisions && (
            <div
              className="w-64 shrink-0 border-l overflow-y-auto hidden md:block"
              style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff' }}
            >
              <div className="p-3 border-b" style={{ borderColor: 'var(--sage-200)' }}>
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--sage-800)]">
                  <History className="w-4 h-4 text-[var(--sage-500)]" />
                  版本历史
                </div>
              </div>
              {revisionsLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-xs text-[var(--sage-500)]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  加载中...
                </div>
              ) : revisions.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--sage-500)]">
                  暂无版本记录
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {revisions.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-2 rounded-card-md border hover:shadow-sm transition-shadow"
                      style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-3 h-3 text-[var(--sage-400)]" />
                        <span className="text-[10px] font-mono text-[var(--sage-500)]">
                          v{rev.version}
                        </span>
                        <span className="text-[10px] text-[var(--sage-400)] ml-auto">
                          {new Date(rev.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--sage-700)] mb-1.5 line-clamp-2">
                        {rev.note || '无备注'}
                      </p>
                      <button
                        onClick={() => handleRestoreRevision(rev.id)}
                        disabled={restoring}
                        className="w-full flex items-center justify-center gap-1 text-[10px] py-1 rounded-md border transition-colors hover:bg-[var(--sage-100)] disabled:opacity-50"
                        style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-600)' }}
                      >
                        {restoring ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        恢复此版本
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Save revision modal */}
        {showRevisionModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="card p-5 w-[360px] max-w-[90vw]">
              <h3 className="text-sm font-bold text-[var(--sage-800)] mb-3">保存版本</h3>
              <input
                type="text"
                placeholder="版本备注（可选）"
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                className="w-full px-3 py-2 rounded-card border text-sm mb-4"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)', color: 'var(--sage-800)' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveRevision}
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  保存
                </button>
                <button
                  onClick={() => {
                    setShowRevisionModal(false)
                    setRevisionNote('')
                  }}
                  className="px-4 py-2 rounded-card border text-sm"
                  style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)' }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* -- Render: List -- */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Palette className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">协作画布</h1>
            <p className="text-sm text-[var(--sage-500)]">
              {canvases.length} 个画布 · {activeCount} 活跃
            </p>
          </div>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> 新建画布
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索画布..."
          className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)', color: 'var(--sage-800)' }}
        />
      </div>

      {listLoading ? (
        <div className="flex items-center justify-center py-16 text-[var(--sage-500)] gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>加载中...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Palette className="w-12 h-12 text-[var(--sage-400)] mx-auto mb-3" />
          <p className="text-[var(--sage-500)]">暂无画布</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((canvas) => {
            const status = STATUS_CONFIG[canvas.status] || STATUS_CONFIG.draft
            const nodeCount = canvas.content?.nodes?.length || 0
            const edgeCount = canvas.content?.edges?.length || 0
            return (
              <div
                key={canvas.id}
                className="card p-4 transition-all hover:shadow-md cursor-pointer"
                style={{ boxShadow: 'var(--shadow-card)' }}
                onClick={() => enterEditor(canvas)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                      <Palette className="w-5 h-5 text-[var(--sage-500)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-[var(--sage-800)]">{canvas.name}</h3>
                      <span className="text-[10px] text-[var(--sage-500)]">
                        {new Date(canvas.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] px-2 py-1 rounded-full"
                      style={{ backgroundColor: status.color + '15', color: status.color }}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>

                {canvas.description && (
                  <p className="text-xs text-[var(--sage-500)] mb-3 line-clamp-2">{canvas.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-[var(--sage-400)]">
                    <span className="flex items-center gap-1">
                      <MousePointer2 className="w-3 h-3" />
                      {nodeCount} 节点
                    </span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {edgeCount} 连接
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        enterEditor(canvas)
                      }}
                      className="p-1.5 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)] hover:text-[var(--sage-600)]"
                      title="编辑"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(canvas.id)
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--sage-400)] hover:text-red-500"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[400px] max-w-[90vw]" style={{ boxShadow: 'var(--shadow-card-elevated)' }}>
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">新建画布</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="画布名称"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)', color: 'var(--sage-800)' }}
              />
              <textarea
                placeholder="描述（可选）"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-card border text-sm resize-none"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)', color: 'var(--sage-800)' }}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreate}
                disabled={creating || !createForm.name.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                创建
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setCreateForm({ name: '', description: '' })
                }}
                className="px-4 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)' }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
