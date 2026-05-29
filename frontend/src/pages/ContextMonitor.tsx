import { useState } from 'react'
import {
  Monitor, Activity, Clock, AlertTriangle, CheckCircle, RefreshCw,
  Trash2, Download, Filter, Search, Database, Bot, MessageSquare,
  FileText, BarChart3, ChevronRight, X,
} from 'lucide-react'

interface ContextItem {
  id: string
  name: string
  type: 'agent' | 'session' | 'task' | 'memory' | 'workflow'
  size: number
  lastAccessed: string
  createdAt: string
  status: 'active' | 'idle' | 'stale'
  tokenCount: number
  messageCount: number
  agentId?: string
  sessionId?: string
}

const MOCK_CONTEXTS: ContextItem[] = [
  { id: 'ctx-1', name: 'Code Assistant', type: 'agent', size: 102400, lastAccessed: '2026-05-25 13:30', createdAt: '2026-05-20', status: 'active', tokenCount: 4500, messageCount: 234, agentId: 'agent-1' },
  { id: 'ctx-2', name: 'Session #42', type: 'session', size: 51200, lastAccessed: '2026-05-25 12:45', createdAt: '2026-05-24', status: 'active', tokenCount: 2100, messageCount: 89, sessionId: 'sess-42' },
  { id: 'ctx-3', name: 'Task Queue Worker', type: 'task', size: 25600, lastAccessed: '2026-05-25 10:00', createdAt: '2026-05-23', status: 'idle', tokenCount: 800, messageCount: 12 },
  { id: 'ctx-4', name: 'Legacy Archive', type: 'memory', size: 204800, lastAccessed: '2026-05-20 09:00', createdAt: '2026-05-01', status: 'stale', tokenCount: 12000, messageCount: 0 },
  { id: 'ctx-5', name: 'System Monitor', type: 'agent', size: 76800, lastAccessed: '2026-05-25 13:15', createdAt: '2026-05-22', status: 'active', tokenCount: 3200, messageCount: 156, agentId: 'agent-3' },
  { id: 'ctx-6', name: 'Workflow Pipeline', type: 'workflow', size: 38400, lastAccessed: '2026-05-24 18:00', createdAt: '2026-05-21', status: 'idle', tokenCount: 1500, messageCount: 34 },
  { id: 'ctx-7', name: 'Chat Channel #general', type: 'session', size: 153600, lastAccessed: '2026-05-25 13:00', createdAt: '2026-05-18', status: 'active', tokenCount: 8900, messageCount: 445, sessionId: 'chan-1' },
  { id: 'ctx-8', name: 'Data Analysis', type: 'task', size: 128000, lastAccessed: '2026-05-23 11:30', createdAt: '2026-05-19', status: 'stale', tokenCount: 5600, messageCount: 67 },
]

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  agent: { icon: Bot, label: '智能体', color: '#3b82f6' },
  session: { icon: MessageSquare, label: '会话', color: '#c97b84' },
  task: { icon: FileText, label: '任务', color: '#f59e0b' },
  memory: { icon: Database, label: '记忆', color: '#6b7a5a' },
  workflow: { icon: BarChart3, label: '工作流', color: '#8b5cf6' },
}

function formatSize(bytes: number) {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return bytes + ' B'
}

export default function ContextMonitor() {
  const [contexts, setContexts] = useState<ContextItem[]>(MOCK_CONTEXTS)
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [lastRefresh, setLastRefresh] = useState<string>('刚刚')

  const handleRefresh = () => {
    setLastRefresh(new Date().toLocaleTimeString())
  }

  const handleClearStale = () => {
    setContexts(contexts.filter((c) => c.status !== 'stale'))
  }

  const filtered = contexts.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter !== 'all' && c.type !== typeFilter) return false
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    return true
  })

  const activeCount = contexts.filter((c) => c.status === 'active').length
  const idleCount = contexts.filter((c) => c.status === 'idle').length
  const staleCount = contexts.filter((c) => c.status === 'stale').length
  const totalSize = contexts.reduce((sum, c) => sum + c.size, 0)
  const totalTokens = contexts.reduce((sum, c) => sum + c.tokenCount, 0)

  const selectedContext = contexts.find((c) => c.id === selected)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Monitor className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">上下文监控</h1>
            <p className="text-sm text-[var(--sage-500)]">
              {contexts.length} 个上下文 · 总计 {formatSize(totalSize)} · {totalTokens.toLocaleString()} tokens
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleClearStale} className="btn-secondary flex items-center gap-2 text-xs">
            <Trash2 className="w-3.5 h-3.5" /> 清理过期
          </button>
          <button onClick={handleRefresh} className="btn-secondary flex items-center gap-2 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> 刷新
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{activeCount}</p>
          <p className="text-xs text-[var(--sage-500)]">活跃上下文</p>
        </div>
        <div className="card p-4">
          <Clock className="w-5 h-5 text-[var(--sage-400)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{idleCount}</p>
          <p className="text-xs text-[var(--sage-500)]">空闲</p>
        </div>
        <div className="card p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{staleCount}</p>
          <p className="text-xs text-[var(--sage-500)]">过期</p>
        </div>
        <div className="card p-4">
          <Database className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{formatSize(totalSize)}</p>
          <p className="text-xs text-[var(--sage-500)]">总占用</p>
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
            placeholder="搜索上下文..."
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
          <option value="stale">过期</option>
        </select>
        <span className="text-xs text-[var(--sage-400)]">上次刷新: {lastRefresh}</span>
      </div>

      {/* Content */}
      <div className="flex gap-4">
        {/* List */}
        <div className={`card overflow-hidden ${selectedContext ? 'flex-1' : 'w-full'}`}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--sage-50)] text-[var(--sage-600)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">上下文</th>
                <th className="text-left px-4 py-3 font-medium">类型</th>
                <th className="text-left px-4 py-3 font-medium">大小</th>
                <th className="text-left px-4 py-3 font-medium">Tokens</th>
                <th className="text-left px-4 py-3 font-medium">最后访问</th>
                <th className="text-left px-4 py-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ctx) => {
                const typeCfg = TYPE_CONFIG[ctx.type]
                const TypeIcon = typeCfg.icon
                return (
                  <tr
                    key={ctx.id}
                    onClick={() => setSelected(selected === ctx.id ? null : ctx.id)}
                    className={`border-t cursor-pointer transition-colors ${
                      selected === ctx.id ? 'bg-[var(--sage-50)]' : 'hover:bg-[var(--sage-50)]'
                    }`}
                    style={{ borderColor: 'var(--sage-100)' }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="w-4 h-4" style={{ color: typeCfg.color }} />
                        <span className="font-medium text-[var(--sage-800)]">{ctx.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: typeCfg.color + '15', color: typeCfg.color }}
                      >
                        {typeCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--sage-500)] font-mono">{formatSize(ctx.size)}</td>
                    <td className="px-4 py-3 text-[var(--sage-500)] font-mono">{ctx.tokenCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[var(--sage-400)] text-xs">{ctx.lastAccessed}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          ctx.status === 'active'
                            ? 'bg-green-500/10 text-green-600'
                            : ctx.status === 'stale'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-[var(--sage-100)] text-[var(--sage-500)]'
                        }`}
                      >
                        {ctx.status === 'active' ? '活跃' : ctx.status === 'stale' ? '过期' : '空闲'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-[var(--sage-400)]">
              没有匹配的上下文
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedContext && (
          <div className="card p-4 w-[320px] shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--sage-800)]">上下文详情</h3>
              <button onClick={() => setSelected(null)} className="text-[var(--sage-400)] hover:text-[var(--sage-600)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-[var(--sage-400)]">名称</span>
                <p className="text-sm font-medium text-[var(--sage-800)]">{selectedContext.name}</p>
              </div>
              <div>
                <span className="text-xs text-[var(--sage-400)]">ID</span>
                <p className="text-xs font-mono text-[var(--sage-500)]">{selectedContext.id}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-[var(--sage-400)]">大小</span>
                  <p className="text-sm font-medium text-[var(--sage-800)]">{formatSize(selectedContext.size)}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--sage-400)]">Tokens</span>
                  <p className="text-sm font-medium text-[var(--sage-800)]">{selectedContext.tokenCount.toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-[var(--sage-400)]">消息数</span>
                  <p className="text-sm font-medium text-[var(--sage-800)]">{selectedContext.messageCount}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--sage-400)]">状态</span>
                  <p className="text-sm font-medium text-[var(--sage-800)]">
                    {selectedContext.status === 'active' ? '活跃' : selectedContext.status === 'stale' ? '过期' : '空闲'}
                  </p>
                </div>
              </div>
              <div>
                <span className="text-xs text-[var(--sage-400)]">创建时间</span>
                <p className="text-sm text-[var(--sage-700)]">{selectedContext.createdAt}</p>
              </div>
              <div>
                <span className="text-xs text-[var(--sage-400)]">最后访问</span>
                <p className="text-sm text-[var(--sage-700)]">{selectedContext.lastAccessed}</p>
              </div>
              {selectedContext.agentId && (
                <div>
                  <span className="text-xs text-[var(--sage-400)]">关联 Agent</span>
                  <p className="text-xs font-mono text-[var(--sage-500)]">{selectedContext.agentId}</p>
                </div>
              )}
              {selectedContext.sessionId && (
                <div>
                  <span className="text-xs text-[var(--sage-400)]">关联会话</span>
                  <p className="text-xs font-mono text-[var(--sage-500)]">{selectedContext.sessionId}</p>
                </div>
              )}

              <div className="pt-2 border-t" style={{ borderColor: 'var(--sage-100)' }}>
                <button className="w-full py-2 rounded-card text-xs text-[var(--sage-500)] hover:bg-[var(--sage-100)] transition-colors flex items-center justify-center gap-1">
                  <Download className="w-3.5 h-3.5" /> 导出上下文
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
