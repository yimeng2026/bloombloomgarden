import { useState } from 'react'
import { Workflow, Plus, Play, Trash2, GitBranch, Clock, CheckCircle, XCircle, Pause, Settings, ChevronRight, Bot, Wrench } from 'lucide-react'

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

const MOCK_WORKFLOWS: WorkflowItem[] = [
  {
    id: 'wf-1', name: '数据清洗流水线', description: '清洗并标准化用户数据，去除重复项，补全缺失值',
    steps: [
      { id: 's1', name: '读取数据源', type: 'tool', config: { source: 'database' } },
      { id: 's2', name: '去除重复', type: 'tool', config: { field: 'user_id' } },
      { id: 's3', name: '补全缺失值', type: 'agent', config: { strategy: 'median' } },
      { id: 's4', name: '格式标准化', type: 'tool', config: { format: 'utf8' } },
      { id: 's5', name: '写入目标库', type: 'tool', config: { target: 'warehouse' } },
    ],
    is_active: true, run_count: 234, success_count: 231, fail_count: 3,
    last_run: '2026-05-24 10:00', next_run: '2026-05-25 02:00',
    trigger: 'scheduled', created_by: 'admin',
  },
  {
    id: 'wf-2', name: 'CI/CD 自动部署', description: '代码合并后自动构建、测试并部署到生产环境',
    steps: [
      { id: 's1', name: '拉取代码', type: 'tool', config: { branch: 'main' } },
      { id: 's2', name: '运行单元测试', type: 'tool', config: { coverage: 80 } },
      { id: 's3', name: '构建镜像', type: 'tool', config: { registry: 'dockerhub' } },
      { id: 's4', name: '安全扫描', type: 'agent', config: { level: 'high' } },
      { id: 's5', name: '蓝绿部署', type: 'tool', config: { strategy: 'blue-green' } },
      { id: 's6', name: '健康检查', type: 'tool', config: { retries: 3 } },
      { id: 's7', name: '通知团队', type: 'tool', config: { channel: 'slack' } },
      { id: 's8', name: '清理旧版本', type: 'tool', config: { keep: 3 } },
    ],
    is_active: true, run_count: 156, success_count: 154, fail_count: 2,
    last_run: '2026-05-24 08:00', next_run: '手动触发',
    trigger: 'manual', created_by: 'devops',
  },
  {
    id: 'wf-3', name: '日志分析与告警', description: '每日日志汇总、异常检测与自动告警',
    steps: [
      { id: 's1', name: '收集日志', type: 'tool', config: { sources: ['api', 'db'] } },
      { id: 's2', name: '模式匹配', type: 'agent', config: { patterns: ['error', 'fatal'] } },
      { id: 's3', name: '生成报告', type: 'agent', config: { format: 'markdown' } },
      { id: 's4', name: '发送告警', type: 'tool', config: { severity: 'high' } },
    ],
    is_active: false, run_count: 89, success_count: 89, fail_count: 0,
    last_run: '2026-05-23 03:00',
    trigger: 'scheduled', created_by: 'admin',
  },
  {
    id: 'wf-4', name: '内容审核流水线', description: '自动审核用户生成内容，检测违规信息',
    steps: [
      { id: 's1', name: '内容提取', type: 'tool', config: { types: ['text', 'image'] } },
      { id: 's2', name: '敏感词检测', type: 'agent', config: { level: 'strict' } },
      { id: 's3', name: '人工复核', type: 'condition', config: { threshold: 0.7 } },
    ],
    is_active: true, run_count: 1201, success_count: 1195, fail_count: 6,
    last_run: '2026-05-24 16:00', next_run: '实时',
    trigger: 'webhook', created_by: 'moderator',
  },
  {
    id: 'wf-5', name: '周报自动生成', description: '汇总本周任务、代码提交和会议记录，生成周报',
    steps: [
      { id: 's1', name: '收集任务数据', type: 'tool', config: { source: 'jira' } },
      { id: 's2', name: '汇总代码提交', type: 'tool', config: { repo: 'all' } },
      { id: 's3', name: '整理会议纪要', type: 'agent', config: { extract: 'action_items' } },
      { id: 's4', name: '生成周报文档', type: 'agent', config: { template: 'weekly' } },
      { id: 's5', name: '邮件发送', type: 'tool', config: { to: 'team@company.com' } },
    ],
    is_active: true, run_count: 12, success_count: 12, fail_count: 0,
    last_run: '2026-05-23 18:00', next_run: '2026-05-30 18:00',
    trigger: 'scheduled', created_by: 'pm',
  },
  {
    id: 'wf-6', name: '数据备份与归档', description: '每日数据库备份、压缩并上传至冷存储',
    steps: [
      { id: 's1', name: '全量备份', type: 'tool', config: { type: 'full' } },
      { id: 's2', name: '增量备份', type: 'tool', config: { type: 'incremental' } },
      { id: 's3', name: '压缩打包', type: 'tool', config: { format: 'gzip' } },
      { id: 's4', name: '上传冷存储', type: 'tool', config: { provider: 's3' } },
      { id: 's5', name: '清理过期备份', type: 'tool', config: { retention: 30 } },
    ],
    is_active: true, run_count: 45, success_count: 45, fail_count: 0,
    last_run: '2026-05-24 02:00', next_run: '2026-05-25 02:00',
    trigger: 'scheduled', created_by: 'dba',
  },
]

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
  const [workflows] = useState<WorkflowItem[]>(MOCK_WORKFLOWS)
  const [selected, setSelected] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

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
                  <button className="p-1.5 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)]">
                    <Play className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--sage-400)] hover:text-red-500">
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
    </div>
  )
}
