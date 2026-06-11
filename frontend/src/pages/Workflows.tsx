import { useState, useEffect } from 'react'
import { Workflow, Plus, Play, Trash2, GitBranch, Clock, CheckCircle, XCircle, Pause, Settings, ChevronRight, Bot, Wrench, Loader2 } from 'lucide-react'
import { fetchWorkflows, executeWorkflow, deleteWorkflow } from '@/api/client'

interface WorkflowStep {
  id: string
  name: string
  type: 'agent' | 'tool' | 'condition' | 'delay'
  config: Record<string, any>
}

interface WorkflowItem {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  is_active: boolean
  run_count: number
  success_count: number
  fail_count: number
  last_run?: string
  next_run?: string
  trigger: 'manual' | 'scheduled' | 'webhook'
  created_by: string
}

const STEP_ICONS: Record<string, any> = {
  agent: Bot,
  tool: Wrench,
  condition: GitBranch,
  delay: Clock,
}

const TRIGGER_CONFIG: Record<string, { color: string; label: string }> = {
  manual: { color: '#3b82f6', label: '手动' },
  scheduled: { color: '#8b5cf6', label: '定时' },
  webhook: { color: '#10b981', label: 'Webhook' },
}

export default function Workflows() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res: any = await fetchWorkflows()
        if (cancelled) return
        const data = res.data || res
        if (Array.isArray(data)) {
          setWorkflows(data)
        }
      } catch (e) {
        console.error('Failed to fetch workflows:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleExecute = async (id: string) => {
    try {
      await executeWorkflow(id)
    } catch (e) {
      console.error('Failed to execute workflow:', e)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteWorkflow(id)
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
    } catch (e) {
      console.error('Failed to delete workflow:', e)
    }
  }

  const selectedWorkflow = workflows.find((w) => w.id === selected)
  const activeCount = workflows.filter((w) => w.is_active).length
  const totalRuns = workflows.reduce((s, w) => s + w.run_count, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Workflow className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">工作流</h1>
            <p className="text-sm text-[var(--sage-500)]">{workflows.length} 个工作流 · {activeCount} 启用 · 累计运行 {totalRuns.toLocaleString()} 次</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> 新建工作流
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
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflows.map((wf) => {
            const trigger = TRIGGER_CONFIG[wf.trigger]
            const successRate = wf.run_count > 0 ? Math.round((wf.success_count / wf.run_count) * 100) : 100
            return (
              <div
                key={wf.id}
                onClick={() => setSelected(selected === wf.id ? null : wf.id)}
                className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                  selected === wf.id ? 'ring-2 ring-[var(--sage-500)]' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                      <GitBranch className="w-5 h-5 text-[var(--sage-500)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-[var(--sage-800)]">{wf.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${wf.is_active ? 'bg-green-500/10 text-green-600' : 'bg-[var(--sage-100)] text-[var(--sage-500)]'}`}>
                          {wf.is_active ? '启用' : '禁用'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: trigger.color + '15', color: trigger.color }}>
                          {trigger.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); handleExecute(wf.id) }} className="p-1.5 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)]">
                      <Play className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(wf.id) }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--sage-400)] hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[var(--sage-500)] mb-3">{wf.description}</p>
                <div className="flex items-center justify-between text-xs text-[var(--sage-400)]">
                  <span>{wf.steps.length} 个步骤</span>
                  <span>成功率: {successRate}%</span>
                  <span>运行 {wf.run_count} 次</span>
                  {wf.last_run && <span>上次: {wf.last_run}</span>}
                </div>

                {selected === wf.id && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--sage-100)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="w-3 h-3 text-[var(--sage-500)]" />
                      <span className="text-xs font-medium text-[var(--sage-700)]">执行步骤</span>
                    </div>
                    <div className="space-y-1.5">
                      {wf.steps.map((step, i) => (
                        <div key={step.id} className="flex items-center gap-2 text-xs">
                          <span className="w-5 h-5 rounded-full bg-[var(--sage-100)] flex items-center justify-center text-[10px] text-[var(--sage-500)] font-mono">
                            {i + 1}
                          </span>
                          <span className="text-[var(--sage-800)]">{step.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sage-100)] text-[var(--sage-500)]">
                            {step.type === 'agent' ? 'Agent' : step.type === 'tool' ? '工具' : step.type === 'condition' ? '条件' : '延迟'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
