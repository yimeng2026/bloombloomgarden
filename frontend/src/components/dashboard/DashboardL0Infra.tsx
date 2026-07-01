/**
 * DashboardL0Infra — 基础设施仪表盘
 * 命令执行历史、文件操作统计、代码运行状态、资源使用率、沙箱状态
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Terminal,
  HardDrive,
  Cpu,
  MemoryStick,
  Container,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
} from 'lucide-react';
import type { DashboardProps } from './DashboardL1Simple';

// ── Mock Data ──────────────────────────────────────────────

const INFRA_STATS = [
  {
    label: '命令执行',
    value: 342,
    icon: Terminal,
    color: '#7fa3b0',
    bgColor: '#7fa3b020',
  },
  {
    label: '文件操作',
    value: 1289,
    icon: HardDrive,
    color: '#c9a96e',
    bgColor: '#c9a96e20',
  },
  {
    label: 'CPU 使用率',
    value: '42%',
    icon: Cpu,
    color: '#7fb89f',
    bgColor: '#7fb89f20',
  },
  {
    label: '内存占用',
    value: '3.2G',
    icon: MemoryStick,
    color: '#c97b84',
    bgColor: '#c97b8420',
  },
];

const RESOURCE_HISTORY = [
  { time: '00:00', cpu: 25, memory: 45 },
  { time: '04:00', cpu: 15, memory: 38 },
  { time: '08:00', cpu: 45, memory: 52 },
  { time: '12:00', cpu: 68, memory: 61 },
  { time: '16:00', cpu: 58, memory: 55 },
  { time: '20:00', cpu: 38, memory: 48 },
  { time: '23:59', cpu: 28, memory: 42 },
];

const COMMAND_HISTORY = [
  { id: 1, command: 'git clone https://github.com/org/project.git', status: 'success', duration: '3.2s', sandbox: 'sandbox-01', time: '2分钟前' },
  { id: 2, command: 'npm install && npm run build', status: 'success', duration: '45.1s', sandbox: 'sandbox-01', time: '5分钟前' },
  { id: 3, command: 'python data_pipeline.py --input /data/raw.csv', status: 'success', duration: '12.8s', sandbox: 'sandbox-02', time: '8分钟前' },
  { id: 4, command: 'docker-compose up -d --build', status: 'error', duration: '2.1s', sandbox: 'sandbox-03', time: '12分钟前' },
  { id: 5, command: 'pytest tests/integration/ -v --cov', status: 'success', duration: '28.6s', sandbox: 'sandbox-01', time: '15分钟前' },
  { id: 6, command: 'terraform apply -auto-approve', status: 'success', duration: '56.3s', sandbox: 'sandbox-04', time: '20分钟前' },
  { id: 7, command: 'kubectl apply -f k8s/deployment.yaml', status: 'success', duration: '4.5s', sandbox: 'sandbox-03', time: '25分钟前' },
  { id: 8, command: 'cargo test --release', status: 'error', duration: '15.2s', sandbox: 'sandbox-05', time: '30分钟前' },
];

const FILE_OPS_DATA = [
  { name: '读取', value: 542, color: '#7fa3b0' },
  { name: '写入', value: 318, color: '#c9a96e' },
  { name: '删除', value: 89, color: '#c97b84' },
  { name: '移动', value: 156, color: '#7fb89f' },
  { name: '复制', value: 184, color: '#a78b9a' },
];

const SANDBOX_STATUS = [
  { id: 'sandbox-01', status: 'running', tasks: 4, cpu: 35, memory: 42, uptime: '12h 34m' },
  { id: 'sandbox-02', status: 'running', tasks: 2, cpu: 22, memory: 28, uptime: '8h 12m' },
  { id: 'sandbox-03', status: 'running', tasks: 1, cpu: 15, memory: 18, uptime: '5h 45m' },
  { id: 'sandbox-04', status: 'idle', tasks: 0, cpu: 2, memory: 5, uptime: '3h 20m' },
  { id: 'sandbox-05', status: 'error', tasks: 0, cpu: 0, memory: 0, uptime: '--' },
];

const CODE_RUN_STATUS = [
  { id: 1, name: 'test_api_integration.py', status: 'success', runtime: 'Python 3.11', duration: '8.4s', lines: 245 },
  { id: 2, name: 'data_processor.rs', status: 'success', runtime: 'Rust 1.75', duration: '3.2s', lines: 189 },
  { id: 3, name: 'build_frontend.sh', status: 'success', runtime: 'Bash 5.2', duration: '45.1s', lines: 78 },
  { id: 4, name: 'deploy_infra.tf', status: 'success', runtime: 'Terraform 1.7', duration: '56.3s', lines: 312 },
  { id: 5, name: 'benchmark_sort.go', status: 'error', runtime: 'Go 1.21', duration: '12.5s', lines: 156 },
];

// ── Components ─────────────────────────────────────────────

function InfraStatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
}: (typeof INFRA_STATS)[0]) {
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

export function DashboardL0Infra({ agentName }: DashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#7fa3b020] flex items-center justify-center">
          <Container size={20} style={{ color: '#7fa3b0' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--sage-700)' }}>
            {agentName} — 基础设施监控
          </h2>
          <p className="text-sm text-muted-foreground">L0 基础设施层 · 命令执行与资源管理</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {INFRA_STATS.map((s) => (
          <InfraStatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Resource Usage AreaChart */}
        <Card className="lg:col-span-2 border border-[var(--sage-200)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Cpu size={16} className="text-blue-500" />
              资源使用率趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={RESOURCE_HISTORY} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7fb89f" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7fb89f" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c97b84" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#c97b84" stopOpacity={0} />
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
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid var(--sage-200)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: 'var(--shadow-card)',
                  }}
                  formatter={(value: number) => [`${value}%`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="#7fb89f"
                  fill="url(#gradCpu)"
                  strokeWidth={2}
                  name="CPU"
                />
                <Area
                  type="monotone"
                  dataKey="memory"
                  stroke="#c97b84"
                  fill="url(#gradMem)"
                  strokeWidth={2}
                  name="内存"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* File Operations PieChart */}
        <Card className="border border-[var(--sage-200)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <HardDrive size={16} className="text-amber-500" />
              文件操作分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={FILE_OPS_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {FILE_OPS_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid var(--sage-200)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value}`, '次数']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
              {FILE_OPS_DATA.map((op) => (
                <div key={op.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: op.color }} />
                  <span className="text-muted-foreground">{op.name}</span>
                  <span className="font-medium ml-auto">{op.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Code Run Status & Sandbox Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Code Run Status */}
        <Card className="border border-[var(--sage-200)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Play size={16} className="text-emerald-500" />
              代码运行状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">文件</TableHead>
                  <TableHead className="text-xs w-[80px]">状态</TableHead>
                  <TableHead className="text-xs w-[100px]">运行时</TableHead>
                  <TableHead className="text-xs w-[60px] text-right">耗时</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CODE_RUN_STATUS.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="text-xs font-mono truncate max-w-[180px]" title={run.name}>
                      {run.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {run.status === 'success' ? (
                          <CheckCircle2 size={12} className="text-emerald-500" />
                        ) : (
                          <XCircle size={12} className="text-red-500" />
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1 py-0 ${
                            run.status === 'success'
                              ? 'border-emerald-300 text-emerald-700'
                              : 'border-red-300 text-red-700'
                          }`}
                        >
                          {run.status === 'success' ? '成功' : '失败'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">{run.runtime}</TableCell>
                    <TableCell className="text-xs font-mono text-right">{run.duration}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Sandbox Status */}
        <Card className="border border-[var(--sage-200)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield size={16} className="text-violet-500" />
              沙箱状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {SANDBOX_STATUS.map((sb) => {
              const statusConfig =
                sb.status === 'running'
                  ? { color: 'text-emerald-600', dot: 'bg-emerald-500', label: '运行中' }
                  : sb.status === 'idle'
                  ? { color: 'text-gray-500', dot: 'bg-gray-400', label: '空闲' }
                  : { color: 'text-red-600', dot: 'bg-red-500', label: '异常' };

              return (
                <div
                  key={sb.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <span className={`w-2 h-2 rounded-full ${statusConfig.dot} ${sb.status === 'running' ? 'animate-pulse' : ''}`} />
                    <span className="text-xs font-mono font-medium">{sb.id}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusConfig.color} bg-opacity-10`}>
                    {statusConfig.label}
                  </span>
                  {sb.status !== 'error' && (
                    <>
                      <div className="flex items-center gap-1 flex-1">
                        <Cpu size={10} className="text-muted-foreground" />
                        <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-400"
                            style={{ width: `${sb.cpu}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-6">{sb.cpu}%</span>
                      </div>
                      <div className="flex items-center gap-1 flex-1">
                        <MemoryStick size={10} className="text-muted-foreground" />
                        <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-rose-400"
                            style={{ width: `${sb.memory}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-6">{sb.memory}%</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock size={10} />
                        {sb.uptime}
                      </span>
                    </>
                  )}
                  {sb.status === 'error' && (
                    <span className="text-[10px] text-red-500 flex-1">连接失败</span>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Command History Table */}
      <Card className="border border-[var(--sage-200)] shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Terminal size={16} className="text-slate-500" />
            命令执行历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] text-xs">#</TableHead>
                <TableHead className="text-xs">命令</TableHead>
                <TableHead className="w-[80px] text-xs">状态</TableHead>
                <TableHead className="w-[80px] text-xs text-right">耗时</TableHead>
                <TableHead className="w-[100px] text-xs">沙箱</TableHead>
                <TableHead className="w-[80px] text-xs">时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COMMAND_HISTORY.map((cmd) => (
                <TableRow key={cmd.id}>
                  <TableCell className="text-xs font-mono text-muted-foreground">{cmd.id}</TableCell>
                  <TableCell className="text-xs font-mono truncate max-w-[400px]" title={cmd.command}>
                    {cmd.command}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {cmd.status === 'success' ? (
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      ) : (
                        <XCircle size={12} className="text-red-500" />
                      )}
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1 py-0 ${
                          cmd.status === 'success'
                            ? 'border-emerald-300 text-emerald-700'
                            : 'border-red-300 text-red-700'
                        }`}
                      >
                        {cmd.status === 'success' ? '成功' : '失败'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono">{cmd.duration}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {cmd.sandbox}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">{cmd.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
