/**
 * SpendTracker.ts - LLM用量统计与成本追踪
 * 参考: LiteLLM spend tracking / OpenRouter credits
 * 维度: provider × model × agent × task
 */

interface PricingConfig {
  inputPrice: number;      // per 1M tokens (USD)
  outputPrice: number;     // per 1M tokens (USD)
  reasoningPrice?: number; // per 1M reasoning tokens (USD)
  currency: string;
}

interface UsageRecord {
  id: string;
  timestamp: Date;
  provider: string;
  model: string;
  agentId?: string;
  taskId?: string;
  groupId?: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens?: number;
  cacheHitTokens?: number;
  latencyMs: number;
  cost: number;
  status: 'success' | 'error' | 'cached';
}

interface DailyStats {
  date: string;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalReasoningTokens: number;
  totalCost: number;
  avgLatencyMs: number;
  errorRate: number;
  byProvider: Record<string, { calls: number; cost: number }>;
  byModel: Record<string, { calls: number; cost: number }>;
}

// ===================== 定价表 =====================
const PRICING_TABLE: Record<string, Record<string, PricingConfig>> = {
  openai: {
    'gpt-4o': { inputPrice: 2.5, outputPrice: 10.0, currency: 'USD' },
    'gpt-4o-mini': { inputPrice: 0.15, outputPrice: 0.6, currency: 'USD' },
    'o1-preview': { inputPrice: 15.0, outputPrice: 60.0, reasoningPrice: 15.0, currency: 'USD' },
    'o3-mini': { inputPrice: 1.1, outputPrice: 4.4, reasoningPrice: 1.1, currency: 'USD' },
  },
  azure: {
    'gpt-4': { inputPrice: 30.0, outputPrice: 60.0, currency: 'USD' },
    'gpt-4-turbo': { inputPrice: 10.0, outputPrice: 30.0, currency: 'USD' },
  },
  anthropic: {
    'claude-3-5-sonnet': { inputPrice: 3.0, outputPrice: 15.0, currency: 'USD' },
    'claude-3-opus': { inputPrice: 15.0, outputPrice: 75.0, currency: 'USD' },
    'claude-3-haiku': { inputPrice: 0.25, outputPrice: 1.25, currency: 'USD' },
  },
  deepseek: {
    'deepseek-chat': { inputPrice: 0.14, outputPrice: 0.28, currency: 'USD' },
    'deepseek-reasoner': { inputPrice: 0.55, outputPrice: 2.19, reasoningPrice: 0.55, currency: 'USD' },
  },
  moonshot: {
    'moonshot-v1-128k': { inputPrice: 0.6, outputPrice: 0.6, currency: 'USD' },
    'moonshot-v1-32k': { inputPrice: 0.24, outputPrice: 0.24, currency: 'USD' },
  },
  kimi_code: {
    'kimi-k2-code': { inputPrice: 0.5, outputPrice: 2.0, currency: 'USD' },
  },
  qwen: {
    'qwen-max': { inputPrice: 0.5, outputPrice: 1.0, currency: 'USD' },
    'qwen-plus': { inputPrice: 0.2, outputPrice: 0.4, currency: 'USD' },
    'qwen-turbo': { inputPrice: 0.1, outputPrice: 0.2, currency: 'USD' },
  },
  gemini: {
    'gemini-1.5-pro': { inputPrice: 1.25, outputPrice: 5.0, currency: 'USD' },
    'gemini-1.5-flash': { inputPrice: 0.075, outputPrice: 0.3, currency: 'USD' },
  },
  glm: {
    'glm-4-plus': { inputPrice: 0.5, outputPrice: 0.5, currency: 'USD' },
    'glm-4-flash': { inputPrice: 0.05, outputPrice: 0.05, currency: 'USD' },
  },
  openrouter: {
    'default': { inputPrice: 0.0, outputPrice: 0.0, currency: 'USD' }, // OpenRouter动态定价
  },
};

// ===================== SpendTracker类 =====================
export class SpendTracker {
  private records: UsageRecord[] = [];
  private dailyStats: Map<string, DailyStats> = new Map();
  private listeners: ((record: UsageRecord) => void)[] = [];
  private monthlyBudget: number | null = null;
  private alertThreshold = 0.8;

  // Static route helpers (declared for TS, implemented after singleton)
  static getOverview?: () => Promise<any>;
  static getByProvider?: () => Promise<any>;
  static getByModel?: () => Promise<any>;
  static getHistory?: (days?: number) => Promise<any[]>;
  static getRecent?: (limit?: number) => Promise<any[]>;
  static setBudget?: (budget: { monthlyBudget?: number; alertThreshold?: number }) => Promise<void>;
  static getBudget?: () => Promise<any>;

  // 记录一次调用
  logUsage(record: Omit<UsageRecord, 'id' | 'cost'>): UsageRecord {
    const id = `usage_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const cost = this.calculateCost(
      record.provider,
      record.model,
      record.inputTokens,
      record.outputTokens,
      record.reasoningTokens,
      record.cacheHitTokens
    );

    const fullRecord: UsageRecord = { ...record, id, cost };
    this.records.push(fullRecord);
    this.updateDailyStats(fullRecord);
    this.listeners.forEach(cb => cb(fullRecord));

    return fullRecord;
  }

  // 计算成本（USD）
  calculateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    reasoningTokens?: number,
    cacheHitTokens?: number
  ): number {
    const providerPricing = PRICING_TABLE[provider.toLowerCase()];
    if (!providerPricing) return 0;

    const pricing = providerPricing[model] || providerPricing['default'];
    if (!pricing) return 0;

    const inputCost = (inputTokens / 1e6) * pricing.inputPrice;
    const outputCost = (outputTokens / 1e6) * pricing.outputPrice;
    const reasoningCost = reasoningTokens && pricing.reasoningPrice
      ? (reasoningTokens / 1e6) * pricing.reasoningPrice
      : 0;
    const cacheSavings = cacheHitTokens && pricing.inputPrice
      ? (cacheHitTokens / 1e6) * pricing.inputPrice * 0.5 // 缓存命中节省50%
      : 0;

    return inputCost + outputCost + reasoningCost - cacheSavings;
  }

  // 更新日统计
  private updateDailyStats(record: UsageRecord) {
    const date = record.timestamp.toISOString().split('T')[0];
    const existing = this.dailyStats.get(date);

    if (!existing) {
      this.dailyStats.set(date, {
        date,
        totalCalls: 1,
        totalInputTokens: record.inputTokens,
        totalOutputTokens: record.outputTokens,
        totalReasoningTokens: record.reasoningTokens || 0,
        totalCost: record.cost,
        avgLatencyMs: record.latencyMs,
        errorRate: record.status === 'error' ? 1 : 0,
        byProvider: { [record.provider]: { calls: 1, cost: record.cost } },
        byModel: { [record.model]: { calls: 1, cost: record.cost } },
      });
      return;
    }

    existing.totalCalls++;
    existing.totalInputTokens += record.inputTokens;
    existing.totalOutputTokens += record.outputTokens;
    existing.totalReasoningTokens += record.reasoningTokens || 0;
    existing.totalCost += record.cost;
    existing.avgLatencyMs = (existing.avgLatencyMs * (existing.totalCalls - 1) + record.latencyMs) / existing.totalCalls;
    existing.errorRate = (existing.errorRate * (existing.totalCalls - 1) + (record.status === 'error' ? 1 : 0)) / existing.totalCalls;

    const pp = existing.byProvider[record.provider] || { calls: 0, cost: 0 };
    pp.calls++; pp.cost += record.cost;
    existing.byProvider[record.provider] = pp;

    const pm = existing.byModel[record.model] || { calls: 0, cost: 0 };
    pm.calls++; pm.cost += record.cost;
    existing.byModel[record.model] = pm;
  }

  // 查询接口
  getRecords(filter?: { provider?: string; model?: string; agentId?: string; taskId?: string; from?: Date; to?: Date }): UsageRecord[] {
    return this.records.filter(r => {
      if (filter?.provider && r.provider !== filter.provider) return false;
      if (filter?.model && r.model !== filter.model) return false;
      if (filter?.agentId && r.agentId !== filter.agentId) return false;
      if (filter?.taskId && r.taskId !== filter.taskId) return false;
      if (filter?.from && r.timestamp < filter.from) return false;
      if (filter?.to && r.timestamp > filter.to) return false;
      return true;
    });
  }

  getDailyStats(date?: string): DailyStats | Map<string, DailyStats> {
    if (date) return this.dailyStats.get(date)!;
    return this.dailyStats;
  }

  getModelRanking(limit = 10): { model: string; calls: number; cost: number; avgLatency: number }[] {
    const modelMap = new Map<string, { calls: number; cost: number; latencySum: number }>();

    for (const r of this.records) {
      const key = `${r.provider}/${r.model}`;
      const existing = modelMap.get(key) || { calls: 0, cost: 0, latencySum: 0 };
      existing.calls++;
      existing.cost += r.cost;
      existing.latencySum += r.latencyMs;
      modelMap.set(key, existing);
    }

    return Array.from(modelMap.entries())
      .map(([model, stats]) => ({
        model,
        calls: stats.calls,
        cost: stats.cost,
        avgLatency: stats.latencySum / stats.calls,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  }

  getTotalSpend(from?: Date, to?: Date): { calls: number; inputTokens: number; outputTokens: number; reasoningTokens: number; cost: number } {
    const filtered = from || to ? this.getRecords({ from, to }) : this.records;
    return filtered.reduce((acc, r) => ({
      calls: acc.calls + 1,
      inputTokens: acc.inputTokens + r.inputTokens,
      outputTokens: acc.outputTokens + r.outputTokens,
      reasoningTokens: acc.reasoningTokens + (r.reasoningTokens || 0),
      cost: acc.cost + r.cost,
    }), { calls: 0, inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cost: 0 });
  }

  onUsage(callback: (record: UsageRecord) => void) {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }
}

// Singleton
export const spendTracker = new SpendTracker();

// Static helpers for route handlers
SpendTracker.getOverview = async function() {
  const total = spendTracker.getTotalSpend();
  const byProvider: Record<string, number> = {};
  const byModel: Record<string, number> = {};
  for (const r of (spendTracker as any).records) {
    byProvider[r.provider] = (byProvider[r.provider] || 0) + r.cost;
    byModel[`${r.provider}/${r.model}`] = (byModel[`${r.provider}/${r.model}`] || 0) + r.cost;
  }
  return {
    totalSpent: total.cost,
    totalTokens: total.inputTokens + total.outputTokens,
    totalRequests: total.calls,
    byProvider,
    byModel,
    byDay: Array.from((spendTracker as any).dailyStats.values()).map((d: any) => ({
      date: d.date,
      cost: d.totalCost,
      tokens: d.totalInputTokens + d.totalOutputTokens,
      requests: d.totalCalls,
    })),
    budgetLimit: (spendTracker as any).monthlyBudget || null,
    budgetRemaining: (spendTracker as any).monthlyBudget ? (spendTracker as any).monthlyBudget - total.cost : null,
  };
};

SpendTracker.getByProvider = async function() {
  const byProvider: Record<string, number> = {};
  for (const r of (spendTracker as any).records) {
    byProvider[r.provider] = (byProvider[r.provider] || 0) + r.cost;
  }
  return byProvider;
};

SpendTracker.getByModel = async function() {
  const byModel: Record<string, number> = {};
  for (const r of (spendTracker as any).records) {
    byModel[`${r.provider}/${r.model}`] = (byModel[`${r.provider}/${r.model}`] || 0) + r.cost;
  }
  return byModel;
};

SpendTracker.getHistory = async function(days = 30) {
  const result: any[] = [];
  const dailyStats = (spendTracker as any).dailyStats;
  const dates = Array.from(dailyStats.keys()).sort().slice(-days);
  for (const date of dates) {
    const d = dailyStats.get(date);
    if (d) {
      result.push({
        date,
        cost: d.totalCost,
        tokens: d.totalInputTokens + d.totalOutputTokens,
        requests: d.totalCalls,
      });
    }
  }
  return result;
};

SpendTracker.getRecent = async function(limit = 50) {
  return (spendTracker as any).records.slice(-limit);
};

SpendTracker.setBudget = async function({ monthlyBudget, alertThreshold }: { monthlyBudget?: number; alertThreshold?: number }) {
  (spendTracker as any).monthlyBudget = monthlyBudget || null;
  (spendTracker as any).alertThreshold = alertThreshold || 0.8;
};

SpendTracker.getBudget = async function() {
  return {
    monthlyBudget: (spendTracker as any).monthlyBudget || null,
    alertThreshold: (spendTracker as any).alertThreshold || 0.8,
  };
};
