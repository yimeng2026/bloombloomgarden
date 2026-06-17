import { useState, useEffect } from 'react'
import {
  Download, FileJson, FileText, FileSpreadsheet, CheckCircle, Clock,
  Plus, Trash2, Filter, Search, Eye, Copy, Check, Archive, Calendar,
  Database, Layers, Tag, ChevronDown, X, Play, Pause, AlertTriangle,
  Loader2,
} from 'lucide-react'

interface ExportJob {
  id: string
  name: string
  format: 'json' | 'csv' | 'markdown' | 'pdf' | 'xml'
  scope: 'full' | 'partial' | 'timerange'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
  size?: string
  itemCount?: number
  createdAt: string
  completedAt?: string
  tags: string[]
  description: string
}

const FORMAT_CONFIG: Record<string, { icon: any; label: string; color: string; ext: string }> = {
  json: { icon: FileJson, label: 'JSON', color: '#3b82f6', ext: '.json' },
  csv: { icon: FileSpreadsheet, label: 'CSV', color: '#10b981', ext: '.csv' },
  markdown: { icon: FileText, label: 'Markdown', color: '#f59e0b', ext: '.md' },
  pdf: { icon: FileText, label: 'PDF', color: '#ef4444', ext: '.pdf' },
  xml: { icon: FileText, label: 'XML', color: '#8b5cf6', ext: '.xml' },
}

const SCOPE_LABELS: Record<string, string> = {
  full: '全量',
  partial: '部分',
  timerange: '时间范围',
}

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: any }> = {
  pending: { color: '#f59e0b', label: '待处理', icon: Clock },
  running: { color: '#3b82f6', label: '进行中', icon: Play },
  completed: { color: '#10b981', label: '已完成', icon: CheckCircle },
  failed: { color: '#ef4444', label: '失败', icon: X },
  paused: { color: '#8b5cf6', label: '已暂停', icon: Pause },
}

export default function MemoryExport() {
  const [jobs, setJobs] = useState<ExportJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<{ name: string; format: ExportJob['format']; scope: ExportJob['scope']; description: string }>({ name: '', format: 'json', scope: 'full', description: '' })
  const [search, setSearch] = useState('')
  const [formatFilter, setFormatFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // 注意：client.ts 中暂无 fetchExportJobs API，保持空列表
  // 等后端提供 /memories/exports 或类似 GET 接口后，可在此加载真实数据
  useEffect(() => {
    setLoading(false)
  }, [])

  const toggleSelect = (id: string) => {
    const next = new Set(selectedJobs)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedJobs(next)
  }

  const selectAll = () => {
    if (selectedJobs.size === filtered.length) {
      setSelectedJobs(new Set())
    } else {
      setSelectedJobs(new Set(filtered.map((j) => j.id)))
    }
  }

  const handleDeleteSelected = () => {
    setJobs(jobs.filter((j) => !selectedJobs.has(j.id)))
    setSelectedJobs(new Set())
  }

  const handleSubmit = () => {
    const newJob: ExportJob = {
      id: `exp-${Date.now()}`,
      name: form.name,
      format: form.format,
      scope: form.scope,
      status: 'pending',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      tags: ['用户创建'],
      description: form.description,
    }
    setJobs([newJob, ...jobs])
    setShowModal(false)
    setForm({ name: '', format: 'json', scope: 'full', description: '' })
  }

  const filtered = jobs.filter((j) => {
    if (search && !j.name.toLowerCase().includes(search.toLowerCase())) return false
    if (formatFilter !== 'all' && j.format !== formatFilter) return false
    if (statusFilter !== 'all' && j.status !== statusFilter) return false
    return true
  })

  const completedCount = jobs.filter((j) => j.status === 'completed').length
  const totalSize = jobs.filter((j) => j.size).reduce((sum, j) => {
    const num = parseFloat(j.size!.replace(/[^0-9.]/g, ''))
    const unit = j.size!.includes('MB') ? 1024 : 1
    return sum + num * unit
  }, 0)

  const copyJobId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Download className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">记忆导出</h1>
            <p className="text-sm text-[var(--sage-500)]">
              {jobs.length} 个导出任务 · {completedCount} 已完成 · 总计 {(totalSize / 1024).toFixed(1)} MB
            </p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> 新建导出
        </button>
      </div>

      {loading && (
        <div className="card p-6 text-center">
          <Loader2 className="w-8 h-8 text-[var(--sage-400)] mx-auto mb-2 animate-spin" />
          <p className="text-sm text-[var(--sage-400)]">加载中...</p>
        </div>
      )}

      {error && (
        <div className="card p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <Archive className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{jobs.length}</p>
          <p className="text-xs text-[var(--sage-500)]">总任务</p>
        </div>
        <div className="card p-4">
          <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{completedCount}</p>
          <p className="text-xs text-[var(--sage-500)]">已完成</p>
        </div>
        <div className="card p-4">
          <Play className="w-5 h-5 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{jobs.filter((j) => j.status === 'running').length}</p>
          <p className="text-xs text-[var(--sage-500)]">进行中</p>
        </div>
        <div className="card p-4">
          <Database className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{(totalSize / 1024).toFixed(1)}MB</p>
          <p className="text-xs text-[var(--sage-500)]">总导出</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索导出任务..."
            className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
          />
        </div>
        <select
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value)}
          className="px-3 py-2.5 rounded-card border text-sm"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
        >
          <option value="all">全部格式</option>
          {Object.entries(FORMAT_CONFIG).map(([key, cfg]) => (
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
          <option value="pending">待处理</option>
          <option value="running">进行中</option>
          <option value="completed">已完成</option>
          <option value="failed">失败</option>
          <option value="paused">已暂停</option>
        </select>
        {selectedJobs.size > 0 && (
          <button onClick={handleDeleteSelected} className="btn-secondary flex items-center gap-2 text-xs text-red-500">
            <Trash2 className="w-3.5 h-3.5" /> 删除 {selectedJobs.size} 项
          </button>
        )}
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--sage-50)] text-[var(--sage-600)]">
            <tr>
              <th className="text-left px-4 py-3 font-medium w-[40px]">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedJobs.size === filtered.length}
                  onChange={selectAll}
                  className="rounded"
                />
              </th>
              <th className="text-left px-4 py-3 font-medium">导出任务</th>
              <th className="text-left px-4 py-3 font-medium">格式</th>
              <th className="text-left px-4 py-3 font-medium">范围</th>
              <th className="text-left px-4 py-3 font-medium">状态</th>
              <th className="text-left px-4 py-3 font-medium">大小</th>
              <th className="text-left px-4 py-3 font-medium">创建时间</th>
              <th className="text-left px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((job) => {
              const config = FORMAT_CONFIG[job.format] || FORMAT_CONFIG.json
              const FormatIcon = config.icon
              const statusCfg = STATUS_CONFIG[job.status]
              const StatusIcon = statusCfg.icon
              const isSelected = selectedJobs.has(job.id)
              return (
                <tr
                  key={job.id}
                  className={`border-t transition-colors ${isSelected ? 'bg-[var(--sage-50)]' : 'hover:bg-[var(--sage-50)]'}`}
                  style={{ borderColor: 'var(--sage-100)' }}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(job.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: config.color + '15' }}
                      >
                        <FormatIcon className="w-4 h-4" style={{ color: config.color }} />
                      </div>
                      <div>
                        <div className="font-medium text-[var(--sage-800)]">{job.name}</div>
                        <div className="text-[10px] text-[var(--sage-400)]">{job.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{ backgroundColor: config.color + '15', color: config.color }}
                    >
                      {config.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--sage-500)]">
                    {SCOPE_LABELS[job.scope]}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-xs">
                      <StatusIcon className="w-3 h-3" style={{ color: statusCfg.color }} />
                      <span style={{ color: statusCfg.color }}>{statusCfg.label}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--sage-500)] font-mono">
                    {job.size || '-'}
                    {job.itemCount && (
                      <span className="text-[var(--sage-400)] ml-1">({job.itemCount.toLocaleString()} 项)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--sage-400)]">{job.createdAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyJobId(job.id)}
                        className="p-1 text-[var(--sage-400)] hover:text-[var(--sage-600)]"
                        title="复制ID"
                      >
                        {copiedId === job.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      {job.status === 'completed' && (
                        <button className="p-1 text-[var(--sage-400)] hover:text-[var(--sage-600)]" title="下载">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setJobs(jobs.filter((j) => j.id !== job.id))
                          setSelectedJobs((prev) => {
                            const next = new Set(prev)
                            next.delete(job.id)
                            return next
                          })
                        }}
                        className="p-1 text-[var(--sage-400)] hover:text-red-500"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-[var(--sage-400)]">
            没有匹配的导出任务
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[450px] max-w-[90vw]">
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">新建导出</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="导出名称"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
              <textarea
                placeholder="描述（可选）"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.format}
                  onChange={(e) => setForm({ ...form, format: e.target.value as 'json' | 'csv' | 'markdown' | 'pdf' | 'xml' })}
                  className="px-3 py-2 rounded-card border text-sm"
                  style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                >
                  {Object.entries(FORMAT_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
                <select
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value as 'full' | 'partial' | 'timerange' })}
                  className="px-3 py-2 rounded-card border text-sm"
                  style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
                >
                  <option value="full">全量</option>
                  <option value="partial">部分</option>
                  <option value="timerange">时间范围</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSubmit} disabled={!form.name} className="btn-primary flex-1 disabled:opacity-50">
                创建
              </button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)' }}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
