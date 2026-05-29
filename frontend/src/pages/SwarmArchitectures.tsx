import { useState } from 'react'
import {
  GitBranch, Network, Layers, Shuffle, Route, Crown, TreePine,
  RefreshCw, ArrowRightLeft, Workflow, Cpu, Zap, Settings,
  Play, Pause, Trash2, Plus, ChevronDown, ChevronRight,
  Activity, GitMerge, AlertTriangle, CheckCircle, HardDrive, Share2,
  BookOpen, FileText, Terminal, Globe, ArrowUpRight, X,
} from 'lucide-react'

/* ── Types ─────────────────────────────────────────────────────── */

interface Architecture {
  id: string
  name: string
  nameEn: string
  icon: any
  source: string
  description: string
  features: string[]
  status: 'active' | 'beta' | 'planned'
  config: Record<string, any>
  agents: { role: string; count: number; desc: string }[]
  useCases: string[]
}

/* ── Data ──────────────────────────────────────────────────────── */

const ARCHITECTURES: Architecture[] = [
  {
    id: 'hierarchical',
    name: '层级蜂群',
    nameEn: 'HierarchicalSwarm',
    icon: GitBranch,
    source: 'CollabFramework',
    description: 'Supervisor 管理 Worker 层级结构。任务从顶层分解，逐层下发到叶子节点执行，结果逐级聚合返回。适合复杂任务的分解与调度。',
    features: ['任务分解与聚合', '层级负载均衡', '故障逐级上报', '权限层级隔离', '动态深度调整'],
    status: 'active',
    config: { maxDepth: 5, maxWorkersPerLevel: 16, timeoutMs: 30000 },
    agents: [
      { role: 'Supervisor', count: 1, desc: '顶层协调，任务分解与结果聚合' },
      { role: 'Sub-Supervisor', count: 4, desc: '中间层调度，子任务管理' },
      { role: 'Worker', count: 16, desc: '叶子节点，执行具体任务' },
    ],
    useCases: ['复杂文档生成', '多层数据分析', '分阶段代码审查'],
  },
  {
    id: 'forest',
    name: '森林蜂群',
    nameEn: 'ForestSwarm',
    icon: TreePine,
    source: 'GitHub swarms',
    description: '多棵独立树形结构并行运行，每棵树处理不同子任务，森林级协调器负责最终汇总。适合大规模并行计算场景。',
    features: ['多树并行', '森林级协调', '树间负载均衡', '独立故障域', '弹性扩缩容'],
    status: 'active',
    config: { treeCount: 4, maxDepthPerTree: 3, crossTreeSync: true },
    agents: [
      { role: 'ForestCoordinator', count: 1, desc: '全局协调，结果汇总' },
      { role: 'TreeRoot', count: 4, desc: '每棵树的根节点' },
      { role: 'TreeNode', count: 12, desc: '树内工作节点' },
    ],
    useCases: ['大规模数据处理', '分布式计算', '批量任务执行'],
  },
  {
    id: 'heavy',
    name: '重型蜂群',
    nameEn: 'HeavySwarm',
    icon: HardDrive,
    source: 'GitHub swarms',
    description: '重型 Agent 专注单一复杂任务，配备专用工具链和上下文缓存。适合需要深度推理和长时运行的任务。',
    features: ['专用工具链', '上下文缓存', '长时运行支持', '断点恢复', '资源独占'],
    status: 'beta',
    config: { maxRuntimeHours: 4, checkpointInterval: 300, dedicatedGPU: true },
    agents: [
      { role: 'HeavyAgent', count: 4, desc: '重型推理 Agent' },
      { role: 'ToolProvider', count: 2, desc: '专用工具服务' },
      { role: 'Monitor', count: 1, desc: '健康监控与资源调度' },
    ],
    useCases: ['深度学习训练', '复杂数学证明', '大规模仿真'],
  },
  {
    id: 'router',
    name: '蜂群路由',
    nameEn: 'SwarmRouter',
    icon: Route,
    source: 'GitHub swarms',
    description: '智能路由 Agent 根据任务特征动态选择最优执行路径和 Agent 组合。内置策略引擎支持自定义路由规则。',
    features: ['智能任务分类', '动态路径选择', '策略引擎', 'A/B 测试支持', '性能反馈闭环'],
    status: 'active',
    config: { strategyPool: ['cost', 'speed', 'quality'], feedbackWindow: 100 },
    agents: [
      { role: 'Router', count: 2, desc: '任务分类与路径决策' },
      { role: 'Executor', count: 8, desc: '多类型执行 Agent' },
      { role: 'Evaluator', count: 2, desc: '结果评估与反馈' },
    ],
    useCases: ['多模型路由', '成本优化调度', '质量敏感任务'],
  },
  {
    id: 'rearrange',
    name: 'Agent 重排',
    nameEn: 'AgentRearrange',
    icon: Shuffle,
    source: 'GitHub swarms',
    description: '运行时动态重组 Agent 拓扑结构，根据负载和任务特征实时调整协作关系。支持热插拔 Agent 节点。',
    features: ['运行时拓扑切换', 'Agent 动态增删', '负载感知重排', '策略自适应调整', '零停机重组'],
    status: 'active',
    config: { reorganizationInterval: 60, strategyPool: ['sequential', 'parallel', 'hierarchical'] },
    agents: [
      { role: 'Orchestrator', count: 1, desc: '全局编排与重组决策' },
      { role: 'AdaptiveAgent', count: 8, desc: '自适应工作 Agent' },
      { role: 'Observer', count: 2, desc: '负载监控与触发重组' },
    ],
    useCases: ['弹性伸缩场景', '突发流量应对', '多模式切换'],
  },
  {
    id: 'ruflo',
    name: 'Ruflo 女王/工蜂',
    nameEn: 'Ruflo Queen/Worker',
    icon: Crown,
    source: 'GitHub swarms',
    description: 'Queen Agent 负责协调与记忆管理，Worker Agent 执行任务并汇报。自学习机制防止上下文遗忘，经验回放池持续提升性能。',
    features: ['Queen 协调中心', 'Worker 任务执行', '自学习记忆机制', '防遗忘上下文', '经验回放池'],
    status: 'beta',
    config: { memoryWindow: 10, experiencePoolSize: 1000, learningRate: 0.01 },
    agents: [
      { role: 'Queen', count: 1, desc: '全局协调与记忆管理' },
      { role: 'Worker', count: 8, desc: '任务执行与经验积累' },
      { role: 'Learner', count: 1, desc: '经验提炼与策略优化' },
    ],
    useCases: ['持续学习场景', '长对话管理', '知识积累任务'],
  },
  {
    id: 'cross-repo',
    name: '跨仓库蜂群',
    nameEn: 'Multi-Repo Swarm',
    icon: Share2,
    source: 'GitHub swarms',
    description: '跨多个代码仓库协作的蜂群架构，支持分布式代码审查、跨库依赖分析和统一发布管理。',
    features: ['跨库代码审查', '依赖图分析', '统一发布管理', '变更传播追踪', '冲突自动解决'],
    status: 'planned',
    config: { maxRepos: 10, syncInterval: 300, conflictStrategy: 'auto' },
    agents: [
      { role: 'RepoManager', count: 1, desc: '仓库管理与同步' },
      { role: 'CodeReviewer', count: 4, desc: '跨库代码审查' },
      { role: 'DependencyAnalyzer', count: 2, desc: '依赖分析与冲突检测' },
    ],
    useCases: ['微服务治理', '多模块项目', '跨团队协作'],
  },
  {
    id: 'sequential',
    name: '顺序执行',
    nameEn: 'Sequential',
    icon: Workflow,
    source: 'CollabFramework',
    description: '严格顺序执行的蜂群模式，前一个 Agent 的输出作为后一个的输入。适合流水线式任务，保证数据一致性。',
    features: ['严格顺序控制', '数据流管道', '中间结果缓存', '断点续传', '执行日志链'],
    status: 'active',
    config: { maxPipelineLength: 20, cacheIntermediate: true, retryFailed: true },
    agents: [
      { role: 'PipelineStarter', count: 1, desc: '流水线启动与监控' },
      { role: 'StageAgent', count: 6, desc: '各阶段执行 Agent' },
      { role: 'Validator', count: 1, desc: '最终结果验证' },
    ],
    useCases: ['CI/CD 流水线', '数据 ETL', '审批流程'],
  },
  {
    id: 'parallel',
    name: '并行执行',
    nameEn: 'Parallel',
    icon: Layers,
    source: 'CollabFramework',
    description: '完全并行执行的蜂群模式，所有 Agent 同时启动，结果通过聚合器合并。适合无依赖关系的批量任务。',
    features: ['完全并行启动', '结果聚合器', '超时统一控制', '资源配额管理', '并发限流'],
    status: 'active',
    config: { maxConcurrency: 32, timeoutMs: 60000, resourceQuota: 'auto' },
    agents: [
      { role: 'Dispatcher', count: 1, desc: '任务分发与并发控制' },
      { role: 'ParallelWorker', count: 16, desc: '并行工作 Agent' },
      { role: 'Aggregator', count: 1, desc: '结果聚合与去重' },
    ],
    useCases: ['批量 API 调用', '并行搜索', '并发测试'],
  },
]

/* ── Component ─────────────────────────────────────────────────── */

export default function SwarmArchitectures() {
  const [activeArch, setActiveArch] = useState<Architecture>(ARCHITECTURES[0])
  const [running, setRunning] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggleRun = (id: string) => {
    setRunning((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Network className="w-6 h-6 text-[var(--sage-500)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--sage-800)]">蜂群架构</h1>
          <p className="text-sm text-[var(--sage-500)]">{ARCHITECTURES.length} 种高级蜂群协作机制</p>
        </div>
      </div>

      {/* Architecture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ARCHITECTURES.map((arch) => {
          const Icon = arch.icon
          const isActive = activeArch.id === arch.id
          return (
            <div
              key={arch.id}
              onClick={() => setActiveArch(arch)}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                isActive ? 'ring-2 ring-[var(--sage-500)] bg-[var(--sage-50)]' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'var(--sage-100)' }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{
                        color:
                          arch.status === 'active'
                            ? '#10b981'
                            : arch.status === 'beta'
                              ? '#f59e0b'
                              : 'var(--sage-500)',
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--sage-800)]">{arch.name}</h3>
                    <p className="text-[10px] text-[var(--sage-400)]">{arch.nameEn}</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    arch.status === 'active'
                      ? 'bg-green-500/10 text-green-600'
                      : arch.status === 'beta'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-[var(--sage-100)] text-[var(--sage-500)]'
                  }`}
                >
                  {arch.status === 'active' ? '已启用' : arch.status === 'beta' ? '测试版' : '计划中'}
                </span>
              </div>
              <p className="text-xs text-[var(--sage-500)] line-clamp-2">{arch.description}</p>
              <div className="flex items-center gap-1 mt-2 text-[10px] text-[var(--sage-400)]">
                <span className="px-1.5 py-0.5 rounded bg-[var(--sage-100)]">{arch.source}</span>
                <span>{arch.agents.reduce((s, a) => s + a.count, 0)} Agents</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail Panel */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--sage-100)]">
              {(() => {
                const DetailIcon = activeArch.icon
                return <DetailIcon className="w-6 h-6 text-[var(--sage-500)]" />
              })()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--sage-800)]">
                {activeArch.name}
                <span className="text-sm font-normal text-[var(--sage-400)] ml-2">{activeArch.nameEn}</span>
              </h2>
              <p className="text-xs text-[var(--sage-500)] mt-1">{activeArch.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleRun(activeArch.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                running[activeArch.id]
                  ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                  : 'bg-[var(--sage-500)] text-white hover:bg-[var(--sage-600)]'
              }`}
            >
              {running[activeArch.id] ? (
                <>
                  <Pause className="w-4 h-4" /> 运行中
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> 启动
                </>
              )}
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--sage-500)]" />
            核心特性
          </h3>
          <div className="flex flex-wrap gap-2">
            {activeArch.features.map((f) => (
              <span
                key={f}
                className="text-xs px-2 py-1 rounded-full bg-[var(--sage-100)] text-[var(--sage-600)]"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Agents */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-2 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[var(--sage-500)]" />
            Agent 构成
          </h3>
          <div className="space-y-2">
            {activeArch.agents.map((agent, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-lg bg-[var(--sage-50)]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--sage-800)]">{agent.role}</span>
                  <span className="text-[10px] text-[var(--sage-400)]">{agent.desc}</span>
                </div>
                <span className="text-xs font-mono text-[var(--sage-500)]">x{agent.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Use Cases */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--sage-500)]" />
            适用场景
          </h3>
          <div className="flex flex-wrap gap-2">
            {activeArch.useCases.map((uc) => (
              <span
                key={uc}
                className="text-xs px-2 py-1 rounded-full bg-[var(--bloom-mint)]/10 text-[var(--sage-600)]"
              >
                {uc}
              </span>
            ))}
          </div>
        </div>

        {/* Config */}
        <div>
          <button
            onClick={() => toggleExpand(activeArch.id)}
            className="flex items-center gap-1 text-xs text-[var(--sage-500)] hover:text-[var(--sage-700)]"
          >
            {expanded[activeArch.id] ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            配置参数
          </button>
          {expanded[activeArch.id] && (
            <div className="mt-2 p-3 rounded-lg bg-[var(--sage-50)] text-xs font-mono text-[var(--sage-600)] space-y-1">
              {Object.entries(activeArch.config).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span>{k}</span>
                  <span className="text-[var(--sage-400)]">{JSON.stringify(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
