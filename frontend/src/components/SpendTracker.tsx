import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, BarChart3, PieChart, Calendar,
  Zap, Cpu, Search, ChevronDown, ChevronUp, Filter, ArrowUpRight,
  ArrowDownRight, Wallet, Clock, AlertTriangle, CheckCircle2, Loader2,
  Server, Globe, HardDrive, Database, Eye, EyeOff, RefreshCw, Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ContentCard from '@/components/ContentCard';

/* ── Types ─────────────────────────────────────────────────────── */

interface SpendRecord {
  id: string;
  provider: string;
  model: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUSD: number;
  costCNY: number;
  timestamp: string;
  userId?: string;
  workspaceId?: string;
}

interface ProviderSpend {
  provider: string;
  totalRequests: number;
  totalTokens: number;
  totalCostUSD: number;
  totalCostCNY: number;
  models: string[];
  trend: 'up' | 'down' | 'flat';
  percentChange: number;
}

interface DailySpend {
  date: string;
  costUSD: number;
  costCNY: number;
  requests: number;
  tokens: number;
}

interface UserSpend {
  userId: string;
  userName: string;
  totalCostUSD: number;
  totalRequests: number;
  activeWorkspaces: number;
}

/* ── Mock Data ─────────────────────────────────────────────────── */

const MOCK_SPEND: SpendRecord[] = [
  { id: 's-1', provider: 'OpenAI', model: 'gpt-4o', requests: 342, promptTokens: 125000, completionTokens: 89000, totalTokens: 214000, costUSD: 3.21, costCNY: 23.18, timestamp: '2026-05-28T10:00:00Z', userId: 'admin', workspaceId: 'ws-1' },
  { id: 's-2', provider: 'Kimi Code', model: 'kimi-coder', requests: 892, promptTokens: 450000, completionTokens: 320000, totalTokens: 770000, costUSD: 5.78, costCNY: 41.70, timestamp: '2026-05-28T11:00:00Z', userId: 'dev', workspaceId: 'ws-2' },
  { id: 's-3', provider: 'Anthropic', model: 'claude-3-5-sonnet', requests: 156, promptTokens: 78000, completionTokens: 145000, totalTokens: 223000, costUSD: 4.47, costCNY: 32.27, timestamp: '2026-05-28T12:00:00Z', userId: 'admin', workspaceId: 'ws-1' },
  { id: 's-4', provider: 'DeepSeek', model: 'deepseek-chat', requests: 560, promptTokens: 280000, completionTokens: 190000, totalTokens: 470000, costUSD: 1.41, costCNY: 10.18, timestamp: '2026-05-28T13:00:00Z', userId: 'dev', workspaceId: 'ws-3' },
  { id: 's-5', provider: 'Moonshot', model: 'moonshot-v1-8k', requests: 234, promptTokens: 98000, completionTokens: 67000, totalTokens: 165000, costUSD: 1.65, costCNY: 11.91, timestamp: '2026-05-28T14:00:00Z', userId: 'analyst', workspaceId: 'ws-4' },
  { id: 's-6', provider: 'OpenRouter', model: 'google/gemini-2.0-flash:free', requests: 1200, promptTokens: 600000, completionTokens: 450000, totalTokens: 1050000, costUSD: 0.00, costCNY: 0.00, timestamp: '2026-05-28T15:00:00Z', userId: 'admin', workspaceId: 'ws-2' },
  { id: 's-7', provider: 'Qwen', model: 'qwen-turbo', requests: 89, promptTokens: 34000, completionTokens: 22000, totalTokens: 56000, costUSD: 0.28, costCNY: 2.02, timestamp: '2026-05-28T16:00:00Z', userId: 'dev', workspaceId: 'ws-3' },
  { id: 's-8', provider: 'Gemini', model: 'gemini-1.5-pro', requests: 445, promptTokens: 222000, completionTokens: 178000, totalTokens: 400000, costUSD: 2.00, costCNY: 14.44, timestamp: '2026-05-28T17:00:00Z', userId: 'analyst', workspaceId: 'ws-4' },
  { id: 's-9', provider: 'GLM', model: 'glm-4', requests: 67, promptTokens: 28000, completionTokens: 19000, totalTokens: 47000, costUSD: 0.47, costCNY: 3.39, timestamp: '2026-05-28T18:00:00Z', userId: 'admin', workspaceId: 'ws-1' },
  { id: 's-10', provider: 'Ollama', model: 'llama3.2', requests: 2300, promptTokens: 1150000, completionTokens: 890000, totalTokens: 2040000, costUSD: 0.00, costCNY: 0.00, timestamp: '2026-05-28T19:00:00Z', userId: 'dev', workspaceId: 'ws-5' },
];

const DAILY_SPEND: DailySpend[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  const baseCost = 5 + Math.random() * 15;
  return {
    date: date.toISOString().split('T')[0],
    costUSD: parseFloat(baseCost.toFixed(2)),
    costCNY: parseFloat((baseCost * 7.2).toFixed(2)),
    requests: Math.floor(200 + Math.random() * 800),
    tokens: Math.floor(50000 + Math.random() * 200000),
  };
});

const USER_SPEND: UserSpend[] = [
  { userId: 'admin', userName: '管理员', totalCostUSD: 12.53, totalRequests: 1898, activeWorkspaces: 3 },
  { userId: 'dev', userName: '开发者', totalCostUSD: 8.26, totalRequests: 3648, activeWorkspaces: 2 },
  { userId: 'analyst', userName: '分析师', totalCostUSD: 5.89, totalRequests: 678, activeWorkspaces: 1 },
  { userId: 'guest', userName: '访客', totalCostUSD: 0.00, totalRequests: 0, activeWorkspaces: 0 },
];

/* ── Helpers ─────────────────────────────────────────────────── */

function formatCurrency(num: number): string {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTokens(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

/* ── Component ─────────────────────────────────────────────────── */

export default function SpendTracker() {
  const [records] = useState<SpendRecord[]>(MOCK_SPEND);
  const [dailySpend] = useState<DailySpend[]>(DAILY_SPEND);
  const [userSpend] = useState<UserSpend[]>(USER_SPEND);
  const [expandedSection, setExpandedSection] = useState<string | null>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [showUSD, setShowUSD] = useState(true);
  const [loading, setLoading] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Aggregated provider stats
  const providerStats = useCallback((): ProviderSpend[] => {
    const map = new Map<string, ProviderSpend>();
    records.forEach(r => {
      const existing = map.get(r.provider);
      if (existing) {
        existing.totalRequests += r.requests;
        existing.totalTokens += r.totalTokens;
        existing.totalCostUSD += r.costUSD;
        existing.totalCostCNY += r.costCNY;
        if (!existing.models.includes(r.model)) existing.models.push(r.model);
      } else {
        map.set(r.provider, {
          provider: r.provider,
          totalRequests: r.requests,
          totalTokens: r.totalTokens,
          totalCostUSD: r.costUSD,
          totalCostCNY: r.costCNY,
          models: [r.model],
          trend: Math.random() > 0.5 ? 'up' : 'down',
          percentChange: parseFloat((Math.random() * 30).toFixed(1)),
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalCostUSD - a.totalCostUSD);
  }, [records]);

  const stats = providerStats();
  const totalCostUSD = stats.reduce((s, p) => s + p.totalCostUSD, 0);
  const totalCostCNY = stats.reduce((s, p) => s + p.totalCostCNY, 0);
  const totalRequests = stats.reduce((s, p) => s + p.totalRequests, 0);
  const totalTokens = stats.reduce((s, p) => s + p.totalTokens, 0);
  const freeProviders = stats.filter(p => p.totalCostUSD === 0).length;
  const paidProviders = stats.length - freeProviders;

  const filteredRecords = records.filter(r => {
    const matchesSearch = !searchQuery || r.provider.toLowerCase().includes(searchQuery.toLowerCase()) || r.model.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = providerFilter === 'all' || r.provider === providerFilter;
    return matchesSearch && matchesProvider;
  });

  const allProviders = Array.from(new Set(records.map(r => r.provider)));

  const sections = [
    { id: 'overview', label: '总览', icon: DollarSign },
    { id: 'providers', label: '按 Provider', icon: Server },
    { id: 'daily', label: '按日期', icon: Calendar },
    { id: 'users', label: '按用户', icon: Globe },
    { id: 'realtime', label: '实时用量', icon: Zap },
  ];

  return (
    <div className="max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--sage-100)' }}>
            <Wallet size={20} style={{ color: 'var(--sage-500)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--sage-800)' }}>用量统计</h1>
            <p className="text-sm" style={{ color: 'var(--sage-500)' }}>LLM API 调用追踪与成本分析</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUSD(!showUSD)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors"
            style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-600)' }}
          >
            {showUSD ? <DollarSign size={14} /> : <span className="text-xs">CNY</span>}
            {showUSD ? 'USD' : 'CNY'}
          </button>
          <button
            onClick={() => setLoading(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors"
            style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-600)' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors" style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-600)' }}>
            <Download size={14} />
            导出
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="p-4 rounded-xl border flex items-center gap-3" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}>
          <DollarSign size={20} style={{ color: '#10b981' }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--sage-500)' }}>总成本</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>
              {showUSD ? `$${formatCurrency(totalCostUSD)}` : `¥${formatCurrency(totalCostCNY)}`}
            </p>
          </div>
        </div>
        <div className="p-4 rounded-xl border flex items-center gap-3" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}>
          <Zap size={20} style={{ color: 'var(--sage-500)' }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--sage-500)' }}>请求次数</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>{totalRequests.toLocaleString()}</p>
          </div>
        </div>
        <div className="p-4 rounded-xl border flex items-center gap-3" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}>
          <Database size={20} style={{ color: 'var(--sage-500)' }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--sage-500)' }}>Token 消耗</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>{formatTokens(totalTokens)}</p>
          </div>
        </div>
        <div className="p-4 rounded-xl border flex items-center gap-3" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}>
          <Server size={20} style={{ color: '#3b82f6' }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--sage-500)' }}>付费 Provider</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>{paidProviders} 个</p>
          </div>
        </div>
        <div className="p-4 rounded-xl border flex items-center gap-3" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}>
          <CheckCircle2 size={20} style={{ color: '#f59e0b' }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--sage-500)' }}>免费 Provider</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>{freeProviders} 个</p>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--sage-200)' }}>
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => toggleSection(s.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                expandedSection === s.id
                  ? 'border-[var(--sage-500)] text-[var(--sage-700)]'
                  : 'border-transparent text-[var(--sage-500)] hover:text-[var(--sage-600)]'
              }`}
            >
              <Icon size={16} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Section Content */}
      <AnimatePresence mode="wait">
        {expandedSection === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <ContentCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold" style={{ color: 'var(--sage-700)' }}>Provider 用量排行</h3>
                <div className="relative max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--sage-400)' }} />
                  <input
                    type="text"
                    placeholder="搜索 Provider..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-800)', backgroundColor: 'var(--sage-50)' }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                {stats.map(p => (
                  <div key={p.provider} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: 'var(--sage-200)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--sage-100)' }}>
                      <Server size={16} style={{ color: 'var(--sage-500)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm" style={{ color: 'var(--sage-700)' }}>{p.provider}</span>
                        <span className="text-xs" style={{ color: 'var(--sage-400)' }}>{p.models.join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--sage-400)' }}>
                        <span>{p.totalRequests.toLocaleString()} 请求</span>
                        <span>{formatTokens(p.totalTokens)} tokens</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold" style={{ color: 'var(--sage-700)' }}>
                        {showUSD ? `$${formatCurrency(p.totalCostUSD)}` : `¥${formatCurrency(p.totalCostCNY)}`}
                      </div>
                      <div className="flex items-center justify-end gap-1 text-xs">
                        {p.trend === 'up' ? <ArrowUpRight size={12} style={{ color: '#ef4444' }} /> : <ArrowDownRight size={12} style={{ color: '#10b981' }} />}
                        <span style={{ color: p.trend === 'up' ? '#ef4444' : '#10b981' }}>{p.percentChange}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ContentCard>
          </motion.div>
        )}

        {expandedSection === 'providers' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <ContentCard>
              <div className="flex items-center gap-3 mb-4">
                <Filter size={16} style={{ color: 'var(--sage-500)' }} />
                <select
                  value={providerFilter}
                  onChange={e => setProviderFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--sage-200)', color: 'var(--sage-700)' }}
                >
                  <option value="all">全部 Provider</option>
                  {allProviders.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--sage-100)' }}>
                      <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--sage-500)' }}>时间</th>
                      <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--sage-500)' }}>Provider</th>
                      <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--sage-500)' }}>模型</th>
                      <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--sage-500)' }}>请求</th>
                      <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--sage-500)' }}>Tokens</th>
                      <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--sage-500)' }}>成本</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map(r => (
                      <tr key={r.id} className="border-b" style={{ borderColor: 'var(--sage-100)' }}>
                        <td className="py-2.5 px-3 text-xs" style={{ color: 'var(--sage-600)' }}>{new Date(r.timestamp).toLocaleTimeString('zh-CN')}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-600)' }}>{r.provider}</span>
                        </td>
                        <td className="py-2.5 px-3 text-xs font-mono" style={{ color: 'var(--sage-700)' }}>{r.model}</td>
                        <td className="py-2.5 px-3 text-right text-xs" style={{ color: 'var(--sage-600)' }}>{r.requests}</td>
                        <td className="py-2.5 px-3 text-right text-xs" style={{ color: 'var(--sage-600)' }}>{formatTokens(r.totalTokens)}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-medium" style={{ color: 'var(--sage-700)' }}>
                          {showUSD ? `$${formatCurrency(r.costUSD)}` : `¥${formatCurrency(r.costCNY)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ContentCard>
          </motion.div>
        )}

        {expandedSection === 'daily' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <ContentCard>
              <h3 className="font-semibold mb-4" style={{ color: 'var(--sage-700)' }}>近 30 日用量趋势</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--sage-100)' }}>
                      <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--sage-500)' }}>日期</th>
                      <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--sage-500)' }}>请求</th>
                      <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--sage-500)' }}>Tokens</th>
                      <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--sage-500)' }}>成本</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySpend.slice().reverse().map(d => (
                      <tr key={d.date} className="border-b" style={{ borderColor: 'var(--sage-100)' }}>
                        <td className="py-2 px-3 text-xs" style={{ color: 'var(--sage-600)' }}>{d.date}</td>
                        <td className="py-2 px-3 text-right text-xs" style={{ color: 'var(--sage-600)' }}>{d.requests.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-xs" style={{ color: 'var(--sage-600)' }}>{formatTokens(d.tokens)}</td>
                        <td className="py-2 px-3 text-right text-xs font-medium" style={{ color: 'var(--sage-700)' }}>
                          {showUSD ? `$${formatCurrency(d.costUSD)}` : `¥${formatCurrency(d.costCNY)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ContentCard>
          </motion.div>
        )}

        {expandedSection === 'users' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <ContentCard>
              <h3 className="font-semibold mb-4" style={{ color: 'var(--sage-700)' }}>用户用量排行</h3>
              <div className="grid grid-cols-4 gap-4">
                {userSpend.map(u => (
                  <div key={u.userId} className="p-4 rounded-xl border" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Globe size={16} style={{ color: 'var(--sage-500)' }} />
                      <span className="font-semibold text-sm" style={{ color: 'var(--sage-700)' }}>{u.userName}</span>
                    </div>
                    <div className="space-y-1 text-xs" style={{ color: 'var(--sage-500)' }}>
                      <div>成本: <span className="font-medium" style={{ color: 'var(--sage-700)' }}>{showUSD ? `$${formatCurrency(u.totalCostUSD)}` : `¥${formatCurrency(u.totalCostUSD * 7.2)}`}</span></div>
                      <div>请求: <span className="font-medium" style={{ color: 'var(--sage-700)' }}>{u.totalRequests.toLocaleString()}</span></div>
                      <div>活跃空间: <span className="font-medium" style={{ color: 'var(--sage-700)' }}>{u.activeWorkspaces} 个</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </ContentCard>
          </motion.div>
        )}

        {expandedSection === 'realtime' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <ContentCard>
              <h3 className="font-semibold mb-4" style={{ color: 'var(--sage-700)' }}>实时用量监控</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#f0fdf4' }}>
                  <p className="text-xs" style={{ color: '#10b981' }}>当前 RPM</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: '#10b981' }}>12</p>
                  <p className="text-xs" style={{ color: 'var(--sage-400)' }}>requests/min</p>
                </div>
                <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#eff6ff' }}>
                  <p className="text-xs" style={{ color: '#3b82f6' }}>队列深度</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: '#3b82f6' }}>3</p>
                  <p className="text-xs" style={{ color: 'var(--sage-400)' }}>pending tasks</p>
                </div>
                <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fef2f2' }}>
                  <p className="text-xs" style={{ color: '#ef4444' }}>今日预估</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: '#ef4444' }}>
                    {showUSD ? `$${formatCurrency(totalCostUSD * 1.2)}` : `¥${formatCurrency(totalCostCNY * 1.2)}`}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--sage-400)' }}>projected cost</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs p-3 rounded-lg" style={{ backgroundColor: '#f0fdf4', color: '#10b981' }}>
                <CheckCircle2 size={14} />
                所有 Provider 运行正常，无异常告警
              </div>
            </ContentCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
