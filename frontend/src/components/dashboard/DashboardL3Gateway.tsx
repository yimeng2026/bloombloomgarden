/**
 * DashboardL3Gateway — 网关聚合仪表盘
 * 路由分发统计、负载均衡状态、后端健康、响应时间对比、错误率趋势
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  Router,
  Server,
  Activity,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Globe,
  Clock,
} from 'lucide-react';
import type { DashboardProps } from './DashboardL1Simple';

// ── Mock Data ──────────────────────────────────────────────

const GATEWAY_STATS = [
  {
    label: '总请求数',
    value: 45632,
    icon: Globe,
    trend: '+18.2%',
    trendType: 'up' as const,
    color: '#7fa3b0',
    bgColor: '#7fa3b020',
  },
  {
    label: '后端服务',
    value: 6,
    icon: Server,
    trend: '0',
    trendType: 'neutral' as const,
    color: '#7fb89f',
    bgColor: '#7fb89f20',
  },
  {
    label: '平均响应时间',
    value: 142,
    icon: Clock,
    trend: '-12.5%',
    trendType: 'down' as const,
    color: '#c9a96e',
    bgColor: '#c9a96e20',
  },
  {
    label: '健康服务',
    value: '5/6',
    icon: ShieldCheck,
    trend: '1 降级',
    trendType: 'neutral' as const,
    color: '#c97b84',
    bgColor: '#c97b8420',
  },
];

const BACKEND_ROUTING = [
  { name: 'GPT-4 API', requests: 12540, percentage: 27.5, responseTime: 320, status: 'healthy', color: '#7fb89f' },
  { name: 'Claude API', requests: 8920, percentage: 19.5, responseTime: 280, status: 'healthy', color: '#7fb89f' },
  { name: 'Kimi API', requests: 10230, percentage: 22.4, responseTime: 180, status: 'healthy', color: '#7fb89f' },
  { name: 'Gemini API', requests: 5680, percentage: 12.4, responseTime: 250, status: 'healthy', color: '#7fb89f' },
  { name: 'Ollama 本地', requests: 4560, percentage: 10.0, responseTime: 85, status: 'degraded', color: '#c9a96e' },
  { name: 'DeepSeek API', requests: 3702, percentage: 8.2, responseTime: 200, status: 'healthy', color: '#7fb89f' },
];

const RESPONSE_TIME_DATA = [
  { name: 'GPT-4', p50: 280, p95: 520, p99: 890 },
  { name: 'Claude', p50: 240, p95: 450, p99: 720 },
  { name: 'Kimi', p50: 150, p95: 320, p99: 580 },
  { name: 'Gemini', p50: 200, p95: 380, p99: 650 },
  { name: 'Ollama', p50: 60, p95: 120, p99: 250 },
  { name: 'DeepSeek', p50: 170, p95: 350, p99: 610 },
];

const ERROR_RATE_DATA = [
  { time: '00:00', rate: 0.8 },
  { time: '04:00', rate: 0.5 },
  { time: '08:00', rate: 1.2 },
  { time: '12:00', rate: 2.1 },
  { time: '16:00', rate: 1.8 },
  { time: '20:00', rate: 1.0 },
  { time: '23:59', rate: 0.7 },
];

// ── Components ─────────────────────────────────────────────

function GatewayStatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendType,
  color,
  bgColor,
}: (typeof GATEWAY_STATS)[0]) {
  const TrendIcon = trendType === 'up' ? TrendingUp : trendType === 'down' ? TrendingDown : Activity;
  const trendClass =
    trendType === 'up'
      ? 'text-emerald-600 bg-emerald-50'
      : trendType === 'down'
      ? 'text-emerald-600 bg-emerald-50'
      : 'text-amber-600 bg-amber-50';

  return (
    <Card className="border border-[var(--sage-200)] shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--sage-700)' }}>
              {value}
            </p>
          </div>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: bgColor }}
          >
            <Icon size={20} style={{ color }} />
          </div>
        </div>
        <div className={`inline-flex items-center gap-1 mt-3 px-2 py-0.5 rounded-full text-xs font-medium ${trendClass}`}>
          <TrendIcon size={12} />
          <span>{trend}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardL3Gateway({ agentName }: DashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#7fa3b020] flex items-center justify-center">
          <Router size={20} style={{ color: '#7fa3b0' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--sage-700)' }}>
            {agentName} — 网关聚合监控
          </h2>
          <p className="text-sm text-muted-foreground">L3 网关层 · 路由分发与负载均衡</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {GATEWAY_STATS.map((s) => (
          <GatewayStatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Response Time Comparison */}
        <Card className="border border-[var(--sage-200)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock size={16} className="text-blue-500" />
              各后端响应时间对比 (ms)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={RESPONSE_TIME_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sage-200)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
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
                  formatter={(value: number, name: string) => [`${value}ms`, name]}
                />
                <Bar dataKey="p50" fill="#7fb89f" radius={[4, 4, 0, 0]} barSize={20} name="P50" />
                <Bar dataKey="p95" fill="#c9a96e" radius={[4, 4, 0, 0]} barSize={20} name="P95" />
                <Bar dataKey="p99" fill="#c97b84" radius={[4, 4, 0, 0]} barSize={20} name="P99" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Error Rate Trend */}
        <Card className="border border-[var(--sage-200)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingDown size={16} className="text-rose-500" />
              错误率趋势 (%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={ERROR_RATE_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradError" x1="0" y1="0" x2="0" y2="1">
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
                  formatter={(value: number) => [`${value}%`, '错误率']}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#c97b84"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#c97b84' }}
                  activeDot={{ r: 5 }}
                  name="错误率"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Backend Health Table */}
      <Card className="border border-[var(--sage-200)] shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Server size={16} className="text-emerald-500" />
            后端服务健康状态与路由分发
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">后端服务</TableHead>
                <TableHead className="w-[100px]">健康状态</TableHead>
                <TableHead className="w-[100px] text-right">请求数</TableHead>
                <TableHead className="w-[100px] text-right">占比</TableHead>
                <TableHead className="w-[100px] text-right">响应时间</TableHead>
                <TableHead className="w-[150px]">负载指示</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {BACKEND_ROUTING.map((be) => (
                <TableRow key={be.name}>
                  <TableCell className="font-medium text-xs">{be.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          be.status === 'healthy'
                            ? 'bg-emerald-500'
                            : be.status === 'degraded'
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }`}
                      />
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          be.status === 'healthy'
                            ? 'border-emerald-300 text-emerald-700'
                            : be.status === 'degraded'
                            ? 'border-amber-300 text-amber-700'
                            : 'border-red-300 text-red-700'
                        }`}
                      >
                        {be.status === 'healthy' ? '健康' : be.status === 'degraded' ? '降级' : '异常'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono">
                    {be.requests.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono">{be.percentage}%</TableCell>
                  <TableCell className="text-right text-xs font-mono">{be.responseTime}ms</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(be.percentage * 2, 100)}%`,
                            backgroundColor: be.color,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-8 text-right">
                        {be.percentage}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
