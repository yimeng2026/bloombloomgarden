/**
 * DashboardL2Multi — 多线程编排仪表盘
 * 线程状态卡片、手递手流程可视化、子任务进度、执行时间线、线程负载
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  GitBranch,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  Timer,
  ArrowRight,
  Layers,
  Activity,
} from 'lucide-react';
import type { DashboardProps } from './DashboardL1Simple';

// ── Mock Data ──────────────────────────────────────────────

const THREAD_STATS = [
  {
    label: '运行中',
    value: 8,
    icon: Play,
    color: '#7fb89f',
    bgColor: '#7fb89f20',
  },
  {
    label: '等待中',
    value: 3,
    icon: Pause,
    color: '#c9a96e',
    bgColor: '#c9a96e20',
  },
  {
    label: '已完成',
    value: 24,
    icon: CheckCircle2,
    color: '#7fa3b0',
    bgColor: '#7fa3b020',
  },
  {
    label: '错误',
    value: 1,
    icon: AlertCircle,
    color: '#c97b84',
    bgColor: '#c97b8420',
  },
];

const SUBTASKS = [
  { id: 1, name: '代码审查 PR#2847', agent: '代码助手-A', progress: 78, status: 'running', eta: '2分钟' },
  { id: 2, name: 'Q4销售数据分析', agent: '数据分析-B', progress: 45, status: 'running', eta: '8分钟' },
  { id: 3, name: '技术文档日译', agent: '翻译专员-E', progress: 62, status: 'running', eta: '5分钟' },
  { id: 4, name: '集成测试运行', agent: '测试代理-D', progress: 92, status: 'running', eta: '1分钟' },
  { id: 5, name: 'API文档生成', agent: '文档生成-C', progress: 0, status: 'pending', eta: '--' },
  { id: 6, name: '数据清洗管道', agent: '数据处理节点', progress: 100, status: 'completed', eta: '已完成' },
  { id: 7, name: '安全审计扫描', agent: '代码审查-F', progress: 30, status: 'error', eta: '异常' },
];

const HANDOFF_FLOW = [
  { from: '总调度器', to: '代码助手-A', type: '派发任务', status: 'active' as const },
  { from: '代码助手-A', to: '文档生成-C', type: '代码→文档', status: 'normal' as const },
  { from: '数据分析-B', to: '翻译专员-E', type: '数据→翻译', status: 'active' as const },
  { from: '测试代理-D', to: '代码审查-F', type: '测试→审查', status: 'pending' as const },
  { from: '数据处理节点', to: '数据分析-B', type: '数据传递', status: 'active' as const },
  { from: '总调度器', to: '测试代理-D', type: '测试指令', status: 'active' as const },
  { from: '翻译专员-E', to: '报告生成-G', type: '翻译汇总', status: 'normal' as const },
  { from: '代码审查-F', to: '代码助手-A', type: '审查反馈', status: 'error' as const },
];

const THREAD_LOAD_DATA = [
  { name: '代码助手-A', load: 78, tasks: 3 },
  { name: '数据分析-B', load: 65, tasks: 2 },
  { name: '翻译专员-E', load: 45, tasks: 1 },
  { name: '测试代理-D', load: 88, tasks: 2 },
  { name: '文档生成-C', load: 12, tasks: 1 },
  { name: '代码审查-F', load: 55, tasks: 2 },
  { name: '总调度器', load: 92, tasks: 8 },
];

const TIMELINE_DATA = [
  { time: '14:30', running: 6, waiting: 2, error: 0 },
  { time: '14:32', running: 8, waiting: 3, error: 0 },
  { time: '14:34', running: 9, waiting: 2, error: 0 },
  { time: '14:36', running: 7, waiting: 4, error: 1 },
  { time: '14:38', running: 8, waiting: 3, error: 1 },
  { time: '14:40', running: 6, waiting: 3, error: 0 },
  { time: '14:42', running: 8, waiting: 2, error: 0 },
  { time: '14:44', running: 7, waiting: 3, error: 0 },
];

// ── Components ─────────────────────────────────────────────

function ThreadStatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
}: (typeof THREAD_STATS)[0]) {
  return (
    <Card className="border border-[var(--sage-200)] shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-3xl font-bold" style={{ color: 'var(--sage-700)' }}>
              {value}
            </p>
          </div>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: bgColor }}
          >
            <Icon size={24} style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HandoffFlowView() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {HANDOFF_FLOW.map((flow, idx) => {
        const isHovered = hoveredIdx === idx;
        const statusColor =
          flow.status === 'active'
            ? 'border-emerald-400 bg-emerald-50'
            : flow.status === 'error'
            ? 'border-red-400 bg-red-50'
            : flow.status === 'pending'
            ? 'border-amber-400 bg-amber-50'
            : 'border-gray-300 bg-gray-50';

        return (
          <div
            key={idx}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${statusColor} ${
              isHovered ? 'shadow-md scale-[1.01]' : ''
            }`}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <Badge variant="secondary" className="text-[10px] font-mono min-w-[90px] justify-center">
              {flow.from}
            </Badge>
            <div className="flex items-center gap-1 flex-1">
              <ArrowRight
                size={14}
                className={
                  flow.status === 'active'
                    ? 'text-emerald-500'
                    : flow.status === 'error'
                    ? 'text-red-500'
                    : flow.status === 'pending'
                    ? 'text-amber-500'
                    : 'text-gray-400'
                }
              />
              <span className="text-xs text-muted-foreground flex-1 text-center truncate">
                {flow.type}
              </span>
              <ArrowRight
                size={14}
                className={
                  flow.status === 'active'
                    ? 'text-emerald-500'
                    : flow.status === 'error'
                    ? 'text-red-500'
                    : flow.status === 'pending'
                    ? 'text-amber-500'
                    : 'text-gray-400'
                }
              />
            </div>
            <Badge variant="secondary" className="text-[10px] font-mono min-w-[90px] justify-center">
              {flow.to}
            </Badge>
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                flow.status === 'active'
                  ? 'bg-emerald-500 animate-pulse'
                  : flow.status === 'error'
                  ? 'bg-red-500'
                  : flow.status === 'pending'
                  ? 'bg-amber-500'
                  : 'bg-gray-400'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}

export function DashboardL2Multi({ agentName }: DashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#7fb89f20] flex items-center justify-center">
          <GitBranch size={20} style={{ color: '#7fb89f' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--sage-700)' }}>
            {agentName} — 多线程编排监控
          </h2>
          <p className="text-sm text-muted-foreground">L2 编排层 · 线程状态与手递手流程</p>
        </div>
      </div>

      {/* Thread Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {THREAD_STATS.map((s) => (
          <ThreadStatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Execution Timeline */}
        <Card className="border border-[var(--sage-200)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Timer size={16} className="text-blue-500" />
              线程执行时间线
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={TIMELINE_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRunning" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7fb89f" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7fb89f" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradWaiting" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c9a96e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#c9a96e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sage-200)" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid var(--sage-200)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: 'var(--shadow-card)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="running"
                  stroke="#7fb89f"
                  fill="url(#gradRunning)"
                  strokeWidth={2}
                  name="运行中"
                />
                <Area
                  type="monotone"
                  dataKey="waiting"
                  stroke="#c9a96e"
                  fill="url(#gradWaiting)"
                  strokeWidth={2}
                  name="等待中"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Thread Load BarChart */}
        <Card className="border border-[var(--sage-200)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity size={16} className="text-rose-500" />
              各线程负载
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={THREAD_LOAD_DATA} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sage-200)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  width={85}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid var(--sage-200)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: 'var(--shadow-card)',
                  }}
                  formatter={(value: number) => [`${value}%`, '负载']}
                />
                <Bar dataKey="load" fill="#7fa3b0" radius={[0, 4, 4, 0]} barSize={16} name="负载率" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Handoff Flow & Subtask Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Handoff Flow */}
        <Card className="border border-[var(--sage-200)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GitBranch size={16} className="text-violet-500" />
              手递手流程可视化
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HandoffFlowView />
          </CardContent>
        </Card>

        {/* Subtask Progress */}
        <Card className="border border-[var(--sage-200)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers size={16} className="text-emerald-500" />
              子任务进度
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {SUBTASKS.map((task) => {
              const statusConfig =
                task.status === 'running'
                  ? { color: 'text-emerald-600', bg: 'bg-emerald-50', badge: '运行中' }
                  : task.status === 'completed'
                  ? { color: 'text-blue-600', bg: 'bg-blue-50', badge: '已完成' }
                  : task.status === 'pending'
                  ? { color: 'text-amber-600', bg: 'bg-amber-50', badge: '等待中' }
                  : { color: 'text-red-600', bg: 'bg-red-50', badge: '错误' };

              return (
                <div key={task.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'running' ? 'bg-emerald-500 animate-pulse' : task.status === 'completed' ? 'bg-blue-500' : task.status === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <span className="text-sm font-medium truncate" title={task.name}>{task.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {task.agent}
                      </Badge>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusConfig.color} ${statusConfig.bg}`}>
                        {statusConfig.badge}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={task.progress} className="h-1.5 flex-1" />
                    <span className="text-[10px] text-muted-foreground font-mono w-[60px] text-right">
                      {task.progress}% · {task.eta}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
