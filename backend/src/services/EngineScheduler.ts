import { EventEmitter } from 'events';
import { prisma } from './PrismaService';

const providersConfig = require('../config/providers.json');

export interface Engine {
  id: string;
  brand: string;
  model: string;
  displayName?: string;
  tier: string;
  status: string;
  healthScore: number;
  latency?: number;
  throughput?: number;
  costPer1KTokens?: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsTools: boolean;
  apiKey?: string;
  baseUrl?: string;
  metadata: Record<string, unknown>;
  keyPool: Array<{ key: string; weight: number; lastUsed: string; failCount: number }>;
  keyRotationStrategy: string;
  createdAt: Date;
  updatedAt: Date;
}

function toEngine(raw: any): Engine {
  return {
    ...raw,
    metadata: JSON.parse(raw.metadata || '{}'),
    keyPool: JSON.parse(raw.keyPool || '[]'),
  };
}

export type EngineStrategy = 'mixed' | 'single' | 'fallback' | 'cost-optimized' | 'performance';

export class EngineScheduler extends EventEmitter {
  // 从 providers.json 加载 L1 层级的 provider 作为引擎（cloud/local，protocolLevel === 1）
  private getEnginesFromConfig(): Engine[] {
    const engineProviders = providersConfig.providers.filter(
      (p: any) => (p.category === 'cloud' || p.category === 'local' || p.category === 'local-engine') && p.protocolLevel === 1
    );
    return engineProviders.map((p: any) => ({
      id: p.id,
      brand: p.id,
      model: p.defaultModel,
      displayName: p.name,
      tier: this.inferTier(p.id),
      status: 'available',
      healthScore: 100,
      latency: undefined,
      throughput: undefined,
      costPer1KTokens: this.inferCost(p.id),
      supportsStreaming: true,
      supportsVision: p.id.includes('gpt-4o') || p.id.includes('claude'),
      supportsTools: true,
      apiKey: undefined,
      baseUrl: p.baseUrl,
      metadata: { category: p.category, models: p.models, protocolLevel: p.protocolLevel },
      keyPool: [],
      keyRotationStrategy: 'round-robin',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  private inferTier(engineId: string): string {
    const flagship = ['openai', 'claude', 'gpt-4o', 'claude-3-opus', 'gemini-1.5-pro'];
    if (flagship.some(f => engineId.includes(f))) return 'flagship';
    const standard = ['ollama', 'localai', 'lmstudio', 'jan', 'gpt4all'];
    if (standard.some(s => engineId.includes(s))) return 'standard';
    return 'professional';
  }

  private inferCost(engineId: string): number {
    const cheap = ['zhipu', 'deepseek', 'siliconflow', 'ollama', 'localai'];
    if (cheap.some(c => engineId.includes(c))) return 0.001;
    const expensive = ['claude', 'gpt-4o', 'openai'];
    if (expensive.some(e => engineId.includes(e))) return 0.03;
    return 0.01;
  }

  async listEngines(): Promise<Engine[]> {
    const fromConfig = this.getEnginesFromConfig();
    const fromDb = await prisma.engine.findMany();
    const dbEngines = fromDb.map(toEngine);
    // 合并：数据库覆盖配置
    const merged = fromConfig.map(eng => {
      const dbEng = dbEngines.find(d => d.id === eng.id);
      return dbEng || eng;
    });
    // 只保留 L1 引擎（cloud/local/local-engine 类别，protocolLevel === 1）
    const l1DbEngines = dbEngines.filter(d => {
      const meta = d.metadata || {};
      const category = meta.category || '';
      const protocolLevel = meta.protocolLevel || 0;
      return (category === 'cloud' || category === 'local' || category === 'local-engine') && protocolLevel === 1;
    });
    const extra = l1DbEngines.filter(d => !fromConfig.find((c: any) => c.id === d.id));
    return [...merged, ...extra];
  }

  async listAvailable(): Promise<Engine[]> {
    const all = await this.listEngines();
    return all.filter(e => e.status === 'available' && e.healthScore >= 50);
  }

  async getById(id: string): Promise<Engine | undefined> {
    const all = await this.listEngines();
    return all.find(e => e.id === id);
  }

  async allocate(role: any, strategy: EngineStrategy = 'mixed'): Promise<Engine | undefined> {
    const available = await this.listAvailable();
    if (available.length === 0) return undefined;

    let selected: Engine | undefined;

    switch (strategy) {
      case 'mixed':
        // 重要角色用 flagship，其他用 professional
        const tier = role.roleType === 'architect' || role.roleType === 'product_manager' ? 'flagship' : 'professional';
        selected = available.find(e => e.tier === tier) || available[0];
        break;
      case 'single':
        // 所有角色用同一引擎（第一个可用）
        selected = available[0];
        break;
      case 'fallback':
        // 优先用角色配置的引擎，失败时切换
        selected = available.find(e => e.id === role.primaryEngine) || available.find(e => e.id === role.secondaryEngine) || available[0];
        break;
      case 'cost-optimized':
        // 选最便宜的
        selected = available.reduce((cheapest, current) =>
          (current.costPer1KTokens || Infinity) < (cheapest.costPer1KTokens || Infinity) ? current : cheapest
        );
        break;
      case 'performance':
        // 选延迟最低的
        selected = available.reduce((fastest, current) =>
          (current.latency || Infinity) < (fastest.latency || Infinity) ? current : fastest
        );
        break;
      default:
        selected = available[0];
    }

    if (selected) {
      this.emit('engine:allocated', { engineId: selected.id, roleId: role.id, strategy });
    }
    return selected;
  }

  async release(engineId: string): Promise<void> {
    this.emit('engine:released', { engineId });
  }

  async healthCheck(engineId: string): Promise<{ healthy: boolean; score: number; latency?: number }> {
    const engine = await this.getById(engineId);
    if (!engine) return { healthy: false, score: 0 };
    
    // 模拟健康检查
    const score = engine.healthScore;
    const healthy = score >= 50;
    
    this.emit('engine:health', { engineId, healthy, score });
    return { healthy, score, latency: engine.latency };
  }

  async registerEngine(data: Partial<Engine>): Promise<Engine> {
    const engine = await prisma.engine.create({
      data: {
        id: data.id || crypto.randomUUID(),
        brand: data.brand || 'custom',
        model: data.model || 'custom',
        tier: data.tier || 'professional',
        status: data.status || 'available',
        healthScore: data.healthScore ?? 100,
        latency: data.latency || null,
        throughput: data.throughput || null,
        costPer1KTokens: data.costPer1KTokens || null,
        supportsStreaming: data.supportsStreaming ?? true,
        supportsVision: data.supportsVision ?? false,
        supportsTools: data.supportsTools ?? true,
        metadata: JSON.stringify({
          ...(data.metadata || {}),
          apiKey: data.apiKey,
          baseUrl: data.baseUrl,
          keyPool: data.keyPool,
          keyRotationStrategy: data.keyRotationStrategy,
        }),
      },
    });
    const result = toEngine(engine);
    this.emit('engine:registered', result);
    return result;
  }

  async updateEngine(id: string, data: Partial<Engine>): Promise<Engine | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.tier !== undefined) updateData.tier = data.tier;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.healthScore !== undefined) updateData.healthScore = data.healthScore;
    if (data.latency !== undefined) updateData.latency = data.latency;
    if (data.throughput !== undefined) updateData.throughput = data.throughput;
    if (data.costPer1KTokens !== undefined) updateData.costPer1KTokens = data.costPer1KTokens;
    if (data.supportsStreaming !== undefined) updateData.supportsStreaming = data.supportsStreaming;
    if (data.supportsVision !== undefined) updateData.supportsVision = data.supportsVision;
    if (data.supportsTools !== undefined) updateData.supportsTools = data.supportsTools;
    if (data.apiKey !== undefined) updateData.apiKey = data.apiKey;
    if (data.baseUrl !== undefined) updateData.baseUrl = data.baseUrl;
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);
    if (data.keyPool !== undefined) updateData.keyPool = JSON.stringify(data.keyPool);
    if (data.keyRotationStrategy !== undefined) updateData.keyRotationStrategy = data.keyRotationStrategy;

    try {
      const engine = await prisma.engine.update({ where: { id }, data: updateData });
      return toEngine(engine);
    } catch {
      return undefined;
    }
  }

  async deleteEngine(id: string): Promise<boolean> {
    try {
      await prisma.engine.delete({ where: { id } });
      this.emit('engine:deleted', { id });
      return true;
    } catch {
      return false;
    }
  }

  async addKey(engineId: string, keyData: { key: string; weight?: number }): Promise<boolean> {
    const engine = await this.getById(engineId);
    if (!engine) return false;
    
    const pool = engine.keyPool || [];
    pool.push({
      key: keyData.key,
      weight: keyData.weight || 1,
      lastUsed: new Date().toISOString(),
      failCount: 0,
    });
    
    await this.updateEngine(engineId, { keyPool: pool });
    return true;
  }

  async removeKey(engineId: string, keyId: string): Promise<boolean> {
    const engine = await this.getById(engineId);
    if (!engine) return false;
    
    const pool = (engine.keyPool || []).filter((k: any) => k.key !== keyId);
    await this.updateEngine(engineId, { keyPool: pool });
    return true;
  }

  // Key 轮询
  rotateKey(engine: Engine): string | undefined {
    const pool = engine.keyPool || [];
    if (pool.length === 0) return undefined;
    
    switch (engine.keyRotationStrategy) {
      case 'round-robin':
        // 找到最近使用的，取下一个
        const sorted = [...pool].sort((a, b) => new Date(a.lastUsed).getTime() - new Date(b.lastUsed).getTime());
        return sorted[0]?.key;
      case 'weighted':
        // 按权重随机选择
        const totalWeight = pool.reduce((sum, k) => sum + k.weight, 0);
        let random = Math.random() * totalWeight;
        for (const key of pool) {
          random -= key.weight;
          if (random <= 0) return key.key;
        }
        return pool[0]?.key;
      case 'least-recently-used':
        const leastUsed = [...pool].sort((a, b) => new Date(a.lastUsed).getTime() - new Date(b.lastUsed).getTime());
        return leastUsed[0]?.key;
      default:
        return pool[0]?.key;
    }
  }
}

let engineScheduler: EngineScheduler | null = null;
export function getEngineScheduler(): EngineScheduler {
  if (!engineScheduler) engineScheduler = new EngineScheduler();
  return engineScheduler;
}
