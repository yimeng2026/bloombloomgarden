import { useState, useEffect } from 'react'
import { Palette, Plus, Search, Loader2, Trash2, X, Eye } from 'lucide-react'
import { fetchCanvases, getCanvas, createCanvas, deleteCanvas } from '@/api/client'

interface Canvas {
  id: string
  name: string
  status: 'active' | 'archived' | 'draft'
  createdAt: string
  content?: any
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  active: { color: '#10b981', label: '活跃' },
  archived: { color: '#6b7280', label: '归档' },
  draft: { color: '#f59e0b', label: '草稿' },
}

export default function CanvasPage() {
  const [canvases, setCanvases] = useState<Canvas[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCanvas, setSelectedCanvas] = useState<Canvas | null>(null)
  const [canvasDetail, setCanvasDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', content: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res: any = await fetchCanvases()
        const data = res.data || res
        setCanvases(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error('Failed to fetch canvases:', e)
        setCanvases([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    async function loadDetail() {
      if (!selectedCanvas) {
        setCanvasDetail(null)
        return
      }
      try {
        setDetailLoading(true)
        const res: any = await getCanvas(selectedCanvas.id)
        setCanvasDetail(res.data || res)
      } catch (e) {
        console.error('Failed to fetch canvas detail:', e)
        setCanvasDetail(selectedCanvas.content || null)
      } finally {
        setDetailLoading(false)
      }
    }
    loadDetail()
  }, [selectedCanvas])

  const filtered = canvases.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return c.name.toLowerCase().includes(q)
  })

  const activeCount = canvases.filter((c) => c.status === 'active').length

  const handleCreate = async () => {
    if (!form.name.trim()) return
    try {
      setCreating(true)
      let content = {}
      try {
        content = form.content ? JSON.parse(form.content) : {}
      } catch {
        content = { text: form.content }
      }
      const res: any = await createCanvas({ name: form.name, content })
      const newCanvas = res.data || { id: `canvas-${Date.now()}`, name: form.name, status: 'active', createdAt: new Date().toISOString() }
      setCanvases((prev) => [newCanvas, ...prev])
      setShowModal(false)
      setForm({ name: '', content: '' })
    } catch (e) {
      console.error('Failed to create canvas:', e)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCanvas(id)
      setCanvases((prev) => prev.filter((c) => c.id !== id))
      if (selectedCanvas?.id === id) setSelectedCanvas(null)
    } catch (e) {
      console.error('Failed to delete canvas:', e)
    }
  }

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
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
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
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
        />
      </div>

      {loading ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((canvas) => {
            const status = STATUS_CONFIG[canvas.status] || STATUS_CONFIG.draft
            return (
              <div
                key={canvas.id}
                className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedCanvas?.id === canvas.id ? 'ring-2 ring-[var(--sage-500)]' : ''
                }`}
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(canvas.id)
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--sage-400)] hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedCanvas(selectedCanvas?.id === canvas.id ? null : canvas)}
                    className="flex items-center gap-1 text-xs text-[var(--sage-500)] hover:text-[var(--sage-700)] transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    {selectedCanvas?.id === canvas.id ? '收起详情' : '查看内容'}
                  </button>
                </div>

                {selectedCanvas?.id === canvas.id && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--sage-100)' }}>
                    {detailLoading ? (
                      <div className="flex items-center gap-2 text-xs text-[var(--sage-500)]">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        加载详情...
                      </div>
                    ) : (
                      <pre className="bg-[var(--sage-50)] p-3 rounded-lg text-xs font-mono text-[var(--sage-600)] overflow-x-auto max-h-60 overflow-y-auto">
                        {canvasDetail ? JSON.stringify(canvasDetail, null, 2) : '无内容'}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[400px] max-w-[90vw]">
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">新建画布</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="画布名称"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
              <textarea
                placeholder="内容（JSON 或文本，可选）"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 rounded-card border text-sm resize-none font-mono"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreate}
                disabled={creating || !form.name.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                创建
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)' }}
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
