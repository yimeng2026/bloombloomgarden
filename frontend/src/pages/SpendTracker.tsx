import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { fetchSpendStats, fetchSpendSummary, fetchSpendBreakdown } from '@/api/client';

interface SpendRecord {
  id: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  timestamp: string;
  requestId: string;
  userId?: string;
  latencyMs: number;
  status: 'success' | 'error' | 'cached';
}

interface ProviderStat {
  provider: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
}

interface DailyStat {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}

const PROVIDER_COLORS: Record<string, string> = {
  'kimi-code': '#10b981',
  'openai': '#3b82f6',
  'deepseek': '#8b5cf6',
  'openrouter': '#f59e0b',
  'anthropic': '#ec4899',
  'gemini': '#06b6d4',
  'qwen': '#f97316',
  'glm': '#84cc16',
  'moonshot': '#6366f1',
  'azure-openai': '#0ea5e9'
};

export default function SpendTrackerPage() {
  const [records, setRecords] = useState<SpendRecord[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [budget, setBudget] = useState(100);
  const [alertThreshold, setAlertThreshold] = useState(0.8);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, summaryRes, breakdownRes] = await Promise.allSettled([
          fetchSpendStats(),
          fetchSpendSummary(),
          fetchSpendBreakdown(),
        ]);
        if (statsRes.status === 'fulfilled') {
          const data = statsRes.value?.data || statsRes.value || {};
          setRecords(data.records || []);
        }
        if (summaryRes.status === 'fulfilled') {
          const data = summaryRes.value?.data || summaryRes.value || {};
          setDailyStats(data.daily || []);
        }
        if (breakdownRes.status === 'fulfilled') {
          // breakdown data can be used for additional stats
        }
      } catch (e: any) {
        setError(e.message || '加载用量数据失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 计算统计数据
  const totalCost = records.reduce((sum, r) => sum + r.costUsd, 0);
  const totalTokens = records.reduce((sum, r) => sum + r.tokensIn + r.tokensOut, 0);
  const totalRequests = records.length;
  const avgLatency = records.length > 0 ? records.reduce((sum, r) => sum + r.latencyMs, 0) / records.length : 0;

  const providerStats: ProviderStat[] = Object.entries(
    records.reduce((acc, r) => {
      if (!acc[r.provider]) {
        acc[r.provider] = { provider: r.provider, totalRequests: 0, totalTokens: 0, totalCost: 0, totalLatency: 0 };
      }
      acc[r.provider].totalRequests++;
      acc[r.provider].totalTokens += r.tokensIn + r.tokensOut;
      acc[r.provider].totalCost += r.costUsd;
      acc[r.provider].totalLatency += r.latencyMs;
      return acc;
    }, {} as Record<string, any>)
  ).map(([_, v]) => ({
    provider: v.provider,
    totalRequests: v.totalRequests,
    totalTokens: v.totalTokens,
    totalCost: v.totalCost,
    avgLatency: Math.round(v.totalLatency / v.totalRequests)
  }));

  const filteredRecords = records.filter(r => {
    if (providerFilter !== 'all' && r.provider !== providerFilter) return false;
    if (filter && !r.model.includes(filter) && !r.provider.includes(filter)) return false;
    return true;
  });

  const budgetUsed = totalCost / budget;
  const budgetWarning = budgetUsed >= alertThreshold;

  // 简单的柱状图SVG
  const maxCost = Math.max(...dailyStats.map(d => d.cost));
  const chartHeight = 120;
  const barWidth = 40;
  const gap = 20;

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white mb-1">用量与成本追踪</h1>
          <p className="text-gray-500 text-sm">LLM API调用统计、Token用量与成本分析（参考LiteLLM）</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">${totalCost.toFixed(4)}</div>
            <div className="text-xs text-gray-500 mt-1">总成本 (USD)</div>
          </div>
          <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-[var(--sage-400)]">{totalTokens.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">总Token数</div>
          </div>
          <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{totalRequests}</div>
            <div className="text-xs text-gray-500 mt-1">总请求数</div>
          </div>
          <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-400">{avgLatency.toFixed(0)}ms</div>
            <div className="text-xs text-gray-500 mt-1">平均延迟</div>
          </div>
        </div>

        {/* 预算进度 */}
        <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">月度预算: ${budget}/月</span>
            <span className={`text-sm font-bold ${budgetWarning ? 'text-red-400' : 'text-emerald-400'}`}>
              {budgetWarning ? '⚠️ 预算告警' : '预算正常'} · {(budgetUsed * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${budgetWarning ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(budgetUsed * 100, 100)}%` }}
            />
          </div>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">预算上限:</span>
              <input
                type="number"
                value={budget}
                onChange={e => setBudget(Number(e.target.value))}
                className="w-20 px-2 py-1 bg-[#0d0d14] border border-gray-700 rounded text-white text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">告警阈值:</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={alertThreshold}
                onChange={e => setAlertThreshold(Number(e.target.value))}
                className="w-20 px-2 py-1 bg-[#0d0d14] border border-gray-700 rounded text-white text-xs"
              />
            </div>
          </div>
        </div>

        {/* 7日趋势图（简化SVG） */}
        <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">7日成本趋势</h2>
          <svg width={dailyStats.length * (barWidth + gap)} height={chartHeight + 30} className="overflow-visible">
            {dailyStats.map((d, i) => {
              const h = (d.cost / maxCost) * chartHeight;
              const x = i * (barWidth + gap) + gap / 2;
              const y = chartHeight - h;
              return (
                <g key={d.date}>
                  <rect
                    x={x} y={y} width={barWidth} height={h}
                    fill="var(--sage-600)" rx={4} opacity={0.8}
                  />
                  <text x={x + barWidth / 2} y={chartHeight + 15} textAnchor="middle" fill="#9ca3af" fontSize="10">
                    {d.date.slice(5)}
                  </text>
                  <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fill="#fff" fontSize="10">
                    ${d.cost.toFixed(2)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Provider分布 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Provider 分布</h2>
            <div className="space-y-3">
              {providerStats.map(p => (
                <div key={p.provider} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PROVIDER_COLORS[p.provider] || '#9ca3af' }} />
                  <span className="text-sm text-white w-24 truncate">{p.provider}</span>
                  <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${(p.totalCost / (providerStats[0]?.totalCost || 1)) * 100}%`,
                        backgroundColor: PROVIDER_COLORS[p.provider] || '#9ca3af'
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-16 text-right">${p.totalCost.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Provider 详情</h2>
            <div className="space-y-2">
              {providerStats.map(p => (
                <div key={p.provider} className="flex items-center justify-between p-2 bg-[#0d0d14] rounded">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[p.provider] }} />
                    <span className="text-sm text-white">{p.provider}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>{p.totalRequests} 请求</span>
                    <span>{p.totalTokens.toLocaleString()} tokens</span>
                    <span className="text-[var(--sage-400)]">{p.avgLatency}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 请求明细 */}
        <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">请求明细</h2>
            <div className="flex gap-2">
              <select
                value={providerFilter}
                onChange={e => setProviderFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#0d0d14] border border-gray-700 rounded text-white text-xs"
              >
                <option value="all">全部Provider</option>
                {providerStats.map(p => (
                  <option key={p.provider} value={p.provider}>{p.provider}</option>
                ))}
              </select>
              <input
                type="text"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="搜索模型..."
                className="px-3 py-1.5 bg-[#0d0d14] border border-gray-700 rounded text-white text-xs placeholder-gray-500 w-40"
              />
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="text-gray-400">
              <tr>
                <th className="text-left py-2 font-medium">时间</th>
                <th className="text-left py-2 font-medium">Provider</th>
                <th className="text-left py-2 font-medium">模型</th>
                <th className="text-right py-2 font-medium">Input</th>
                <th className="text-right py-2 font-medium">Output</th>
                <th className="text-right py-2 font-medium">成本</th>
                <th className="text-right py-2 font-medium">延迟</th>
                <th className="text-center py-2 font-medium">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredRecords.map(r => (
                <tr key={r.id} className="hover:bg-[#1a1a24] transition-colors">
                  <td className="py-2 text-gray-400 text-xs">{new Date(r.timestamp).toLocaleTimeString('zh-CN')}</td>
                  <td className="py-2">
                    <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: (PROVIDER_COLORS[r.provider] || '#9ca3af') + '20', color: PROVIDER_COLORS[r.provider] || '#9ca3af' }}>
                      {r.provider}
                    </span>
                  </td>
                  <td className="py-2 text-white text-xs">{r.model}</td>
                  <td className="py-2 text-right text-gray-400 text-xs">{r.tokensIn.toLocaleString()}</td>
                  <td className="py-2 text-right text-gray-400 text-xs">{r.tokensOut.toLocaleString()}</td>
                  <td className="py-2 text-right text-[var(--sage-400)] text-xs">${r.costUsd.toFixed(4)}</td>
                  <td className="py-2 text-right text-gray-400 text-xs">{r.latencyMs}ms</td>
                  <td className="py-2 text-center">
                    {r.status === 'success' && <span className="text-emerald-400 text-xs">✓</span>}
                    {r.status === 'error' && <span className="text-red-400 text-xs">✗</span>}
                    {r.status === 'cached' && <span className="text-blue-400 text-xs">⚡</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRecords.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">暂无匹配记录</div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-400">
            💡 成本按各Provider官方定价实时计算。Kimi Code: $0.003/1K tokens, GPT-3.5: $0.0015/1K input + $0.002/1K output, DeepSeek: $0.0005/1K tokens。
            实际计费以Provider账单为准。
          </p>
        </div>
      </div>
    </div>
  );
}
