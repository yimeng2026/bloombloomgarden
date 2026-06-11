import { prisma } from './PrismaService';

const providersConfig = require('../config/providers.json');

/**
 * 启动时从 providers.json 批量同步 Framework 和 Engine 到数据库
 * 使用 upsert 避免重复插入
 */
export async function syncProvidersToDatabase(): Promise<{
  frameworks: { created: number; updated: number };
  engines: { created: number; updated: number };
}> {
  const stats = {
    frameworks: { created: 0, updated: 0 },
    engines: { created: 0, updated: 0 },
  };

  // ─── 同步 Framework（orchestrator 类别）─────────────────
  const orchestratorProviders = providersConfig.providers.filter(
    (p: any) => p.category === 'orchestrator'
  );

  for (const provider of orchestratorProviders) {
    const existing = await prisma.framework.findUnique({
      where: { brand: provider.id },
    });

    const data = {
      brand: provider.id,
      name: provider.name || provider.id,
      tagline: provider.description?.slice(0, 100) || null,
      description: provider.description || null,
      category: 'multi-agent',
      features: JSON.stringify(provider.models || []),
      defaultConfig: JSON.stringify({
        baseUrl: provider.baseUrl,
        defaultModel: provider.defaultModel,
        models: provider.models,
        protocol: provider.protocol,
        threading: provider.threading,
      }),
      protocolLevel: provider.protocolLevel || 2,
      status: 'active',
    };

    if (existing) {
      await prisma.framework.update({
        where: { brand: provider.id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
      stats.frameworks.updated++;
    } else {
      await prisma.framework.create({ data });
      stats.frameworks.created++;
    }
  }

  // ─── 同步 Engine（cloud / local / gateway / local-engine 类别）─────────────────
  const engineProviders = providersConfig.providers.filter(
    (p: any) =>
      p.category === 'cloud' ||
      p.category === 'local' ||
      p.category === 'gateway' ||
      p.category === 'local-engine'
  );

  for (const provider of engineProviders) {
    const existing = await prisma.engine.findUnique({
      where: { id: provider.id },
    });

    const tier = inferTier(provider.id);
    const cost = inferCost(provider.id);

    const data = {
      id: provider.id,
      brand: provider.id,
      model: provider.defaultModel || 'unknown',
      tier,
      status: 'available',
      healthScore: 100,
      latency: null,
      throughput: null,
      costPer1KTokens: cost,
      supportsStreaming: true,
      supportsVision:
        provider.id.includes('gpt-4o') ||
        provider.id.includes('claude') ||
        provider.id.includes('gemini'),
      supportsTools: true,
      metadata: JSON.stringify({
        category: provider.category,
        models: provider.models,
        baseUrl: provider.baseUrl,
        apiKeySource: provider.apiKeySource,
        protocol: provider.protocol,
        protocolLevel: provider.protocolLevel,
        description: provider.description,
      }),
    };

    if (existing) {
      await prisma.engine.update({
        where: { id: provider.id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
      stats.engines.updated++;
    } else {
      await prisma.engine.create({ data });
      stats.engines.created++;
    }
  }

  console.log(
    `[Init] Sync complete: ${stats.frameworks.created} frameworks created, ${stats.frameworks.updated} updated; ${stats.engines.created} engines created, ${stats.engines.updated} updated`
  );
  return stats;
}

function inferTier(engineId: string): string {
  const flagship = ['openai', 'claude', 'gpt-4o', 'claude-3-opus', 'gemini-1.5-pro'];
  if (flagship.some((f) => engineId.includes(f))) return 'flagship';
  const standard = ['ollama', 'localai', 'lmstudio', 'jan', 'gpt4all'];
  if (standard.some((s) => engineId.includes(s))) return 'standard';
  return 'professional';
}

function inferCost(engineId: string): number {
  const cheap = ['zhipu', 'deepseek', 'siliconflow', 'ollama', 'localai'];
  if (cheap.some((c) => engineId.includes(c))) return 0.001;
  const expensive = ['claude', 'gpt-4o', 'openai'];
  if (expensive.some((e) => engineId.includes(e))) return 0.03;
  return 0.01;
}
