/**
 * DashboardL1Simple — 单线程LLM仪表盘
 * 对话统计、Token用量、延迟、模型使用率、最近对话
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
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import {
  MessageSquare,
  Clock,
  Zap,
  Bot,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from 'lucide-react';

export interface DashboardProps {
  agentId: string;
  agentName: string;
  refreshInterval?: number;
}

// ── Mock Data ──────────────────────────────────────────────
const TOKEN_DATA = [
  { time: '00:00', input: 1200, output: 3400 },
  { time: '04:00', input: 800, output: 2100 },
  { time: '08:00', input: 3500, output: 8900 },
  { time: '12:00', input: 5200, output: 12400 },
  { time: '16:00', input: 4800, output: 11200 },
  { time: '20:00', input: 2800, output: 6700 },
  { time: '23:59', input: 1500, output: 3800 },
];

const MODEL_USAGE_DATA = [
  { name: 'GPT-4', value: 42, color: '#c9a96e' },
  { name: 'Claude 3', value: 28, color: '#7fb89f' },
  { name: 'Kimi', value: 18, color: '#c97b84' },
  { name: 'Gemini', value: 8, color: '#7fa3b0' },
  { name: 'Ollama', value: 4, color: '#a78b9a' },
];

const RECENT_CONVERSATIONS = [
  { id: 1, user: '用户-A', message: '帮我分析这段代码的性能瓶颈...', model: 'GPT-4', tokens: 1240, latency: 1200, time: '2分钟前', status: 'success' },
  { id: 2, user: '用户-B', message: '翻译这段技术文档到日语', model: 'Claude 3', tokens: 3450, latency: 2300, time: '5分钟前', status: 'success' },
  { id: 3, user: '用户-C', message: '生成API测试用例', model: 'Kimi', tokens: 890, latency: 800, time: '8分钟前', status: 'success' },
  { id: 4, user: '用户-D', message: '数据库查询优化建议', model: 'GPT-4', tokens: 2100, latency: 1800, time: '12分钟前', status: 'warning' },
  { id: 5, user: '用户-E', message: '代码审查 PR#2847', model: 'Gemini', tokens: 4500, latency: 3500, time: '15分钟前', status: 'error' },
  { id: 6, user: '用户-F', message: '生成项目文档结构', model: 'Claude 3', tokens: 1560, latency: 1100, time: '20分钟前', status: 'success' },
];

const STATS = [
  {
    label: '总消息数',
    value: 12847,
    icon: MessageSquare,
    trend: '+12.5%',
    trendType: 'up' as const,
    color: '#c9a96e',
  },
  {
    label: '活跃会话',
    value: 156,
    icon: Bot,
    trend: '+5.2%',
    trendType: 'up' as const,
    color: '#7fb89f',
  },
  {
    label: '平均延迟',
    value: 1240,
    icon: Clock,
    trend: '-8.3%',
    trendType: 'down' as const,
    color: '#7fa3b0',
  },
  {
    label: 'Token/秒',
    value: 342,
    icon: Zap,
    trend: '+3.1%',
    trendType: 'up' as const,
    color: '#c97b84',
  },
];

// ── Components ─────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendType,
  color,
}: (typeof STATS)[0]) {
  const TrendIcon = trendType === 'up' ? TrendingUp : trendType === 'down' ? TrendingDown : Minus;
  const trendColor =
    trendType === 'up'
      ? 'text-emerald-600 bg-emerald-50'
      : trendType === 'down'
      ? 'text-amber-600 bg-amber-50'
      : 'text-gray-500 bg-gray-50';

  return (
    <Card className="border border-[var(--sage-200)] shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--sage-700)' }}>
              {value.toLocaleString()}
            </p>
          </div>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon size={20} style={{ color }} />
          </div>
        </div>
        <div className={`inline-flex items-center gap-1 mt-3 px-2 py-0.5 rounded-full text-xs font-medium ${trendColor}`}>
          <TrendIcon size={12} />
          <span>{trend}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardL1Simple({ agentName }: DashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#c9a96e20] flex items-center justify-center">
          <BarChart3 size={20} style={{ color: '#c9a96e' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--sage-700)' }}>
            {agentName} — 单线程LLM监控
          </h2>
          <p className="text-sm text-muted-foreground">L1 简单对话层 · 实时性能指标</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Token Usage AreaChart */}
        <Card className="lg:col-span-2 border border-[var(--sage-200)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              Token 用量趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={TOKEN_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradInput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c9a96e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#c9a96e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradOutput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7fb89f" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7fb89f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sage-200)" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
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
                  dataKey="input"
                  stroke="#c9a96e"
                  fill="url(#gradInput)"
                  strokeWidth={2}
                  name="输入 Token"
                />
                <Area
                  type="monotone"
                  dataKey="output"
                  stroke="#7fb89f"
                  fill="url(#gradOutput)"
                  strokeWidth={2}
                  name="输出 Token"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Model Usage PieChart */}
        <Card className="border border-[var(--sage-200)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bot size={16} className="text-emerald-500" />
              模型使用分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={MODEL_USAGE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {MODEL_USAGE_DATA.map((entry, index) => (
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
                  formatter={(value: number) => [`${value}%`, '占比']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {MODEL_USAGE_DATA.map((m) => (
                <div key={m.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="text-muted-foreground">{m.name}</span>
                  <span className="font-medium ml-auto">{m.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Conversations Table */}
      <Card className="border border-[var(--sage-200)] shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare size={16} className="text-blue-500" />
            最近对话记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">用户</TableHead>
                <TableHead>消息内容</TableHead>
                <TableHead className="w-[80px]">模型</TableHead>
                <TableHead className="w-[80px] text-right">Token</TableHead>
                <TableHead className="w-[80px] text-right">延迟</TableHead>
                <TableHead className="w-[80px]">状态</TableHead>
                <TableHead className="w-[80px]">时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RECENT_CONVERSATIONS.map((conv) => (
                <TableRow key={conv.id} className="group">
                  <TableCell className="font-medium text-xs">{conv.user}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                    {conv.message}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {conv.model}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono">
                    {conv.tokens.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono">
                    {conv.latency >= 1000 ? `${(conv.latency / 1000).toFixed(1)}s` : `${conv.latency}ms`}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        conv.status === 'success'
                          ? 'bg-emerald-500'
                          : conv.status === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{conv.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
