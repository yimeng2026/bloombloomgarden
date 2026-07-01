import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Network, Cpu, Play, Loader2, CheckCircle, XCircle, Clock,
  Layers, ArrowRight, Vote, History, AlertTriangle, Trash2,
  BarChart3, Zap, GitMerge, RefreshCw, PanelLeft, X
} from 'lucide-react'
import { fetchEngines, streamChatWithAgent } from '@/api/client'

/* ── Types ─────────────────────────────────────────────────────── */

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

/* ── Helpers ───────────────────────────────────────────────────── */

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
    .map(([id, s]) => ({
      id,
      content: s.content,
      engine: engines.find((e) => e.id === id),
    }))
    .filter((r): r is { id: string; content: string; engine: Engine } => !!r.engine)

  if (responses.length === 0) return null

  const avgLength = Math.round(
    responses.reduce((sum, r) => sum + r.content.length, 0) / responses.length
  )

  // Simple word frequency analysis
  const wordCounts: Record<string, number> = {}
  responses.forEach((r) => {
    const words = r.content
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2)
    words.forEach((w) => {
      wordCounts[w] = (wordCounts[w] || 0) + 1
    })
  })

  const commonWords = Object.entries(wordCounts)
    .filter(([_, count]) => count >= responses.length * 0.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word)

  const consensusScore = Math.min(Math.round((commonWords.length / 10) * 100), 100)

  return {
    totalVotes: responses.length,
    avgLength,
    commonWords,
    consensusScore,
    responses,
  }
}

/* ── Component ─────────────────────────────────────────────────── */

export default function SwarmArchitectures() {
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

  // Sync ref with state
  useEffect(() => {
    statesRef.current = engineStates
  }, [engineStates])

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
    return () => {
      cancelled = true
    }
  }, [])

  const toggleEngine = (id: string) => {
    setSelectedEngines((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const selectAll = () => setSelectedEngines(engines.map((e) => e.id))
  const clearSelection = () => setSelectedEngines([])

  const updateEngineState = useCallback(
    (engineId: string, patch: Partial<EngineRunState>) => {
      setEngineStates((prev) => {
        const next = { ...prev, [engineId]: { ...prev[engineId], ...patch } }
        statesRef.current = next
        return next
      })
    },
    []
  )

  const resetStates = useCallback(() => {
    const initial: Record<string, EngineRunState> = {}
    selectedEngines.forEach((id) => {
      initial[id] = { status: 'pending', content: '' }
    })
    setEngineStates(initial)
    statesRef.current = initial
    setAggregateResult(null)
    setError(null)
  }, [selectedEngines])

  const addToHistory = useCallback(
    (agg: any) => {
      const run: SwarmRun = {
        id: `swarm-${Date.now()}`,
        timestamp: Date.now(),
        strategy,
        prompt,
        engineIds: [...selectedEngines],
        results: { ...statesRef.current },
        aggregate: agg,
      }
      setHistory((prev) => [run, ...prev].slice(0, 20))
    },
    [strategy, prompt, selectedEngines]
  )

  const runParallel = useCallback(async () => {
    resetStates()
    setIsRunning(true)
    const aborts: (() => void)[] = []

    try {
      const promises = selectedEngines.map((engineId) => {
        return new Promise<void>((resolve) => {
          const engine = engines.find((e) => e.id === engineId)
          if (!engine) {
            resolve()
            return
          }

          updateEngineState(engineId, { status: 'running', startTime: Date.now() })

          const abort = streamChatWithAgent(
            engineId,
            [{ role: 'user', content: prompt }],
            (event) => {
              const content = extractContent(event)
              if (content) {
                const current = statesRef.current[engineId]?.content || ''
                updateEngineState(engineId, {
                  status: 'running',
                  content: current + content,
                })
              }
            },
            (err) => {
              updateEngineState(engineId, {
                status: 'failed',
                error: err.message,
                endTime: Date.now(),
              })
              resolve()
            },
            () => {
              updateEngineState(engineId, {
                status: 'completed',
                endTime: Date.now(),
              })
              resolve()
            }
          )
          aborts.push(abort)
        })
      })

      await Promise.all(promises)

      const completed = Object.values(statesRef.current).filter(
        (s) => s.status === 'completed'
      ).length

      let agg: any
      if (strategy === 'vote') {
        agg = { mode: 'vote', ...analyzeVote(statesRef.current, engines) }
      } else {
        agg = {
          mode: 'parallel',
          completed,
          total: selectedEngines.length,
        }
      }
      setAggregateResult(agg)
      addToHistory(agg)
    } catch (e: any) {
      setError('蜂群执行失败：' + (e.message || '未知错误'))
    } finally {
      setIsRunning(false)
      abortsRef.current = aborts
    }
  }, [
    selectedEngines,
    engines,
    prompt,
    strategy,
    resetStates,
    updateEngineState,
    addToHistory,
  ])

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
            engineId,
            [{ role: 'user', content: prompt }],
            (event) => {
              const content = extractContent(event)
              if (content) {
                const current = statesRef.current[engineId]?.content || ''
                updateEngineState(engineId, {
                  status: 'running',
                  content: current + content,
                })
              }
            },
            (err) => {
              updateEngineState(engineId, {
                status: 'failed',
                error: err.message,
                endTime: Date.now(),
              })
              resolve()
            },
            () => {
              updateEngineState(engineId, {
                status: 'completed',
                endTime: Date.now(),
              })
              resolve()
            }
          )
          aborts.push(abort)
        })
      }

      const completed = Object.values(statesRef.current).filter(
        (s) => s.status === 'completed'
      ).length

      const agg = {
        mode: 'sequential',
        completed,
        total: selectedEngines.length,
      }
      setAggregateResult(agg)
      addToHistory(agg)
    } catch (e: any) {
      setError('蜂群执行失败：' + (e.message || '未知错误'))
    } finally {
      setIsRunning(false)
      abortsRef.current = aborts
    }
  }, [
    selectedEngines,
    engines,
    prompt,
    resetStates,
    updateEngineState,
    addToHistory,
  ])

  const handleStart = () => {
    if (selectedEngines.length === 0) {
      setError('请至少选择一个引擎')
      return
    }
    if (!prompt.trim()) {
      setError('请输入任务提示词')
      return
    }
    setError(null)
    if (strategy === 'sequential') {
      runSequential()
    } else {
      runParallel()
    }
  }

  const handleStop = () => {
    abortsRef.current.forEach((abort) => abort())
    setIsRunning(false)
    Object.entries(statesRef.current).forEach(([id, state]) => {
      if (state.status === 'running') {
        updateEngineState(id, {
          status: 'failed',
          error: '用户中断',
          endTime: Date.now(),
        })
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
      case 'pending':
        return <Clock className="w-4 h-4 text-[var(--sage-400)]" />
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-[var(--sage-400)]" />
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '等待中'
      case 'running':
        return '执行中'
      case 'completed':
        return '已完成'
      case 'failed':
        return '失败'
      default:
        return '未知'
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-[var(--sage-100)] text-[var(--sage-500)]'
      case 'running':
        return 'bg-blue-500/10 text-blue-600'
      case 'completed':
        return 'bg-green-500/10 text-green-600'
      case 'failed':
        return 'bg-red-500/10 text-red-600'
      default:
        return 'bg-[var(--sage-100)] text-[var(--sage-500)]'
    }
  }

  const runningCount = Object.values(engineStates).filter((s) => s.status === 'running').length
  const completedCount = Object.values(engineStates).filter((s) => s.status === 'completed').length
  const failedCount = Object.values(engineStates).filter((s) => s.status === 'failed').length
  const totalCount = selectedEngines.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Network className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">蜂群协调器</h1>
            <p className="text-sm text-[var(--sage-500)]">
              多引擎协作 · {engines.length} 个引擎可用
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="btn-secondary flex items-center gap-2"
        >
          <History className="w-4 h-4" />
          历史记录 {history.length > 0 && `(${history.length})`}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="card p-3 flex items-center gap-2 bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600 flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="p-1 hover:bg-red-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--sage-800)] flex items-center gap-2">
              <History className="w-4 h-4 text-[var(--sage-500)]" />
              执行历史
            </h3>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> 清空
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-[var(--sage-400)]">暂无历史记录</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((run) => (
                <div
                  key={run.id}
                  onClick={() => loadHistory(run)}
                  className="p-3 rounded-card-md bg-[var(--sage-50)] hover:bg-[var(--sage-100)] cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[var(--sage-700)]">
                      {run.strategy === 'parallel'
                        ? '并行'
                        : run.strategy === 'sequential'
                          ? '顺序'
                          : '投票'}
                    </span>
                    <span className="text-[10px] text-[var(--sage-400)]">
                      {new Date(run.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--sage-600)] line-clamp-1">{run.prompt}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--sage-400)]">
                    <span>{run.engineIds.length} 个引擎</span>
                    <span>·</span>
                    <span>
                      {Object.values(run.results).filter((r) => r.status === 'completed').length}{' '}
                      成功
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Layout: Left config + Right results */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Configuration Panel */}
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-4">
          <div className="card p-4 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--sage-800)] flex items-center gap-2">
              <PanelLeft className="w-4 h-4 text-[var(--sage-500)]" />
              蜂群配置
            </h2>

            {/* Engine Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[var(--sage-700)]">选择引擎</label>
                <div className="flex gap-1">
                  <button
                    onClick={selectAll}
                    className="text-[10px] text-[var(--sage-500)] hover:text-[var(--sage-700)] px-1.5 py-0.5 rounded bg-[var(--sage-100)] transition-colors"
                  >
                    全选
                  </button>
                  <button
                    onClick={clearSelection}
                    className="text-[10px] text-[var(--sage-500)] hover:text-[var(--sage-700)] px-1.5 py-0.5 rounded bg-[var(--sage-100)] transition-colors"
                  >
                    清空
                  </button>
                </div>
              </div>
              {enginesLoading ? (
                <div className="flex items-center gap-2 py-4 text-[var(--sage-400)]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">加载引擎...</span>
                </div>
              ) : engines.length === 0 ? (
                <p className="text-xs text-[var(--sage-400)] py-2">暂无可用引擎</p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {engines.map((engine) => {
                    const selected = selectedEngines.includes(engine.id)
                    return (
                      <label
                        key={engine.id}
                        className={`flex items-center gap-2 p-2 rounded-card-sm cursor-pointer transition-colors ${
                          selected ? 'bg-[var(--sage-100)]' : 'hover:bg-[var(--sage-50)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleEngine(engine.id)}
                          className="w-4 h-4 rounded border-[var(--sage-300)] text-[var(--sage-500)] focus:ring-[var(--sage-500)]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Cpu className="w-3 h-3 text-[var(--sage-400)]" />
                            <span className="text-xs font-medium text-[var(--sage-700)] truncate">
                              {engine.brand}
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--sage-400)]">
                            {engine.model}
                          </span>
                        </div>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            engine.status === 'healthy' ? 'bg-green-500' : 'bg-amber-500'
                          }`}
                        />
                      </label>
                    )
                  })}
                </div>
              )}
              <p className="text-[10px] text-[var(--sage-400)] mt-1">
                已选择 {selectedEngines.length} 个引擎
              </p>
            </div>

            {/* Prompt Input */}
            <div>
              <label className="text-xs font-medium text-[var(--sage-700)] mb-1.5 block">
                任务提示词
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="输入任务描述，例如：分析以下代码的潜在问题..."
                className="w-full h-28 p-3 rounded-card-md border text-sm resize-none"
                style={{
                  borderColor: 'var(--sage-200)',
                  backgroundColor: 'var(--sage-50)',
                }}
              />
              <p className="text-[10px] text-[var(--sage-400)] mt-1 text-right">
                {prompt.length} 字符
              </p>
            </div>

            {/* Strategy Selection */}
            <div>
              <label className="text-xs font-medium text-[var(--sage-700)] mb-2 block">
                协调策略
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'parallel' as Strategy, label: '并行', icon: Layers, desc: '同时执行' },
                    { id: 'sequential' as Strategy, label: '顺序', icon: ArrowRight, desc: '依次执行' },
                    { id: 'vote' as Strategy, label: '投票', icon: Vote, desc: '共识聚合' },
                  ] as const
                ).map((s) => {
                  const Icon = s.icon
                  const active = strategy === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => setStrategy(s.id)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-card-md border text-xs transition-all ${
                        active
                          ? 'border-[var(--sage-500)] bg-[var(--sage-50)] text-[var(--sage-700)]'
                          : 'border-[var(--sage-200)] text-[var(--sage-500)] hover:border-[var(--sage-300)]'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${
                          active ? 'text-[var(--sage-500)]' : 'text-[var(--sage-400)]'
                        }`}
                      />
                      <span className="font-medium">{s.label}</span>
                      <span className="text-[9px] opacity-70">{s.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Start / Stop Button */}
            <button
              onClick={isRunning ? handleStop : handleStart}
              disabled={enginesLoading || selectedEngines.length === 0}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-card-md text-sm font-medium transition-colors ${
                isRunning
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-[var(--sage-500)] text-white hover:bg-[var(--sage-600)]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4" /> 停止执行
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> 启动蜂群
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Execution Results */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Progress Overview */}
          {totalCount > 0 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-[var(--sage-800)] flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[var(--sage-500)]" />
                  执行进度
                </h3>
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <span className="flex items-center gap-1 text-[var(--sage-500)]">
                    <Loader2 className="w-3 h-3 animate-spin" /> {runningCount} 执行中
                  </span>
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-3 h-3" /> {completedCount} 完成
                  </span>
                  {failedCount > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle className="w-3 h-3" /> {failedCount} 失败
                    </span>
                  )}
                </div>
              </div>
              <div className="h-2 rounded-full bg-[var(--sage-100)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${totalCount > 0 ? ((completedCount + failedCount) / totalCount) * 100 : 0}%`,
                    backgroundColor: failedCount > 0 ? '#f59e0b' : '#10b981',
                  }}
                />
              </div>
            </div>
          )}

          {/* Engine Status Cards */}
          {selectedEngines.length > 0 && (
            <div className="space-y-3">
              {selectedEngines.map((engineId) => {
                const engine = engines.find((e) => e.id === engineId)
                const state = engineStates[engineId] || {
                  status: 'pending',
                  content: '',
                }
                if (!engine) return null

                return (
                  <div key={engineId} className="card p-4">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[var(--sage-100)] flex items-center justify-center">
                          <Cpu className="w-4 h-4 text-[var(--sage-500)]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-[var(--sage-800)]">
                            {engine.brand}
                          </h4>
                          <span className="text-[10px] text-[var(--sage-400)]">
                            {engine.model}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-1 rounded-full flex items-center gap-1 ${statusColor(
                          state.status
                        )}`}
                      >
                        {statusIcon(state.status)}
                        {statusLabel(state.status)}
                      </span>
                    </div>

                    {/* Real-time Content */}
                    <div className="p-3 rounded-card-md bg-[var(--sage-50)] text-xs text-[var(--sage-700)] min-h-[60px] max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {state.content || (
                        <span className="text-[var(--sage-400)] italic">
                          {state.status === 'pending'
                            ? '等待启动...'
                            : state.status === 'running'
                              ? '接收响应中...'
                              : '无响应内容'}
                        </span>
                      )}
                    </div>

                    {state.error && (
                      <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {state.error}
                      </p>
                    )}

                    {state.endTime && state.startTime && (
                      <p className="mt-2 text-[10px] text-[var(--sage-400)] text-right">
                        耗时 {((state.endTime - state.startTime) / 1000).toFixed(1)}s
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Aggregate Result */}
          {aggregateResult && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
                {aggregateResult.mode === 'vote' ? (
                  <Vote className="w-4 h-4 text-[var(--sage-500)]" />
                ) : (
                  <GitMerge className="w-4 h-4 text-[var(--sage-500)]" />
                )}
                {aggregateResult.mode === 'vote' ? '投票聚合结果' : '执行聚合结果'}
              </h3>

              {aggregateResult.mode === 'vote' && aggregateResult.totalVotes > 0 ? (
                <div className="space-y-3">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-card-md bg-[var(--sage-50)] text-center">
                      <p className="text-lg font-bold text-[var(--sage-800)]">
                        {aggregateResult.totalVotes}
                      </p>
                      <p className="text-[10px] text-[var(--sage-500)]">参与投票</p>
                    </div>
                    <div className="p-3 rounded-card-md bg-[var(--sage-50)] text-center">
                      <p className="text-lg font-bold text-[var(--sage-800)]">
                        {aggregateResult.consensusScore}%
                      </p>
                      <p className="text-[10px] text-[var(--sage-500)]">共识度</p>
                    </div>
                    <div className="p-3 rounded-card-md bg-[var(--sage-50)] text-center">
                      <p className="text-lg font-bold text-[var(--sage-800)]">
                        {aggregateResult.avgLength}
                      </p>
                      <p className="text-[10px] text-[var(--sage-500)]">平均长度</p>
                    </div>
                    <div className="p-3 rounded-card-md bg-[var(--sage-50)] text-center">
                      <p className="text-lg font-bold text-[var(--sage-800)]">
                        {aggregateResult.commonWords?.length || 0}
                      </p>
                      <p className="text-[10px] text-[var(--sage-500)]">共同关键词</p>
                    </div>
                  </div>

                  {/* Common Words */}
                  {aggregateResult.commonWords?.length > 0 && (
                    <div>
                      <p className="text-xs text-[var(--sage-600)] mb-1.5">高频共识词</p>
                      <div className="flex flex-wrap gap-1.5">
                        {aggregateResult.commonWords.map((word: string) => (
                          <span
                            key={word}
                            className="text-xs px-2 py-1 rounded-full bg-[var(--sage-100)] text-[var(--sage-600)]"
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Per-engine summaries */}
                  <div>
                    <p className="text-xs text-[var(--sage-600)] mb-1.5">各引擎意见摘要</p>
                    <div className="space-y-2">
                      {aggregateResult.responses?.map(
                        (r: { id: string; content: string; engine?: Engine }) => (
                          <div
                            key={r.id}
                            className="p-2.5 rounded-card-md bg-[var(--sage-50)]"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Cpu className="w-3 h-3 text-[var(--sage-400)]" />
                              <span className="text-xs font-medium text-[var(--sage-700)]">
                                {r.engine?.brand || r.id}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--sage-600)] line-clamp-3">
                              {r.content}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-card-md bg-[var(--sage-50)]">
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-4 h-4 text-[var(--sage-500)]" />
                    <span className="text-xs text-[var(--sage-700)]">
                      {aggregateResult.mode === 'parallel' ? '并行执行' : '顺序执行'}完成
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--sage-600)]">
                    <span>
                      成功: {aggregateResult.completed} / {aggregateResult.total}
                    </span>
                    <span>
                      成功率:{' '}
                      {Math.round(
                        (aggregateResult.completed / aggregateResult.total) * 100
                      )}
                      %
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {selectedEngines.length === 0 && !aggregateResult && (
            <div className="card p-8 text-center">
              <Network className="w-12 h-12 text-[var(--sage-300)] mx-auto mb-3" />
              <p className="text-sm text-[var(--sage-500)]">
                请在左侧选择引擎并配置任务
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
