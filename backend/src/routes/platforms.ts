/**
 * platforms.ts — 平台管理路由
 * 
 * 【修复】2026-06-10: 移除默认 active/healthy 标记，改为从 BackendRouter 获取真实健康状态
 * 平台列表不再返回模拟状态，而是基于 BackendRouter 的健康检查结果
 */

import { Router } from 'express';
import providersData from '../config/providers.json';
import { getBackendRouter } from '../services/BackendRouter';

const router = Router();

interface Provider {
  id: string;
  name: string;
  category: string;
  baseUrl: string;
  defaultModel: string;
  apiKeySource: string;
  models: string[];
  protocolLevel: number;
  protocol: string;
  threading: string;
}

const allProviders: Provider[] = (providersData as any).providers || [];

// ─────────────────────────────────────────────
// GET /api/platforms — 平台列表（真实健康状态）
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  // 获取 BackendRouter 的真实健康状态
  let backendHealth: Map<string, { healthy: boolean; latency: number }> = new Map();
  try {
    const backendRouter = getBackendRouter();
    const backends = await backendRouter.listBackendsDetailed();
    for (const b of backends) {
      backendHealth.set(b.id, { healthy: b.healthy, latency: b.latency });
    }
  } catch (err: any) {
    console.warn('[Platforms] BackendRouter health check failed:', err.message);
  }

  let result = allProviders.map((p) => {
    const health = backendHealth.get(p.id);
    const hasApiKey = p.apiKeySource !== 'none' && !!resolveApiKey(p.apiKeySource);
    
    return {
      id: p.id,
      name: p.name,
      // 真实状态：基于 BackendRouter 健康检查 + API Key 配置
      status: health ? (health.healthy ? 'active' : 'error') : (hasApiKey ? 'configured' : 'unconfigured'),
      healthy: health?.healthy ?? null,
      latency: health?.latency ?? null,
      category: p.category,
      protocolLevel: p.protocolLevel,
      protocol: p.protocol,
      threading: p.threading,
      defaultModel: p.defaultModel,
      models: p.models,
      apiKeySource: p.apiKeySource,
      apiKeyConfigured: hasApiKey,
    };
  });

  const { protocolLevel, protocol, threading, healthy } = req.query;

  // 按 protocolLevel 数字过滤: ?protocolLevel=1
  if (protocolLevel !== undefined) {
    const level = parseInt(protocolLevel as string, 10);
    if (!isNaN(level)) {
      result = result.filter((p) => p.protocolLevel === level);
    }
  }

  // 按协议标签过滤: ?protocol=L1 或 ?protocol=single-thread
  if (protocol !== undefined) {
    const protoMap: Record<string, number> = {
      L0: 0,
      infra: 0,
      L1: 1,
      'single-thread': 1,
      L2: 2,
      'multi-thread': 2,
      L3: 3,
      gateway: 3,
    };
    const targetLevel = protoMap[protocol as string];
    if (targetLevel !== undefined) {
      result = result.filter((p) => p.protocolLevel === targetLevel);
    }
  }

  // 按线程模式过滤: ?threading=single|multi|gateway
  if (threading !== undefined) {
    result = result.filter((p) => p.threading === threading);
  }

  // 按健康状态过滤: ?healthy=true|false
  if (healthy !== undefined) {
    const wantHealthy = healthy === 'true';
    result = result.filter((p) => p.healthy === wantHealthy);
  }

  res.json({
    success: true,
    data: result,
    total: result.length,
    meta: {
      healthyCount: result.filter(p => p.healthy === true).length,
      unhealthyCount: result.filter(p => p.healthy === false).length,
      unconfiguredCount: result.filter(p => p.status === 'unconfigured').length,
      checkedAt: new Date().toISOString(),
    },
  });
});

// ─────────────────────────────────────────────
// GET /api/platforms/protocol-levels — 4层协议层级统计
// ─────────────────────────────────────────────
router.get('/protocol-levels', (_req, res) => {
  const levels = [
    {
      level: 0,
      name: 'L0',
      label: '基础设施',
      description: 'CLI、代码执行、文件系统、浏览器、沙箱等基础工具',
      protocol: 'infra',
      threading: 'single',
      count: 0,
      providers: [] as string[],
    },
    {
      level: 1,
      name: 'L1',
      label: '单线程LLM',
      description: '直接与单个LLM Provider对话（OpenAI、Claude、DeepSeek等）',
      protocol: 'single-thread',
      threading: 'single',
      count: 0,
      providers: [] as string[],
    },
    {
      level: 2,
      name: 'L2',
      label: '多线程编排',
      description: '多Agent协作框架（AutoGen、CrewAI、MetaGPT、LangGraph等）',
      protocol: 'multi-thread',
      threading: 'multi',
      count: 0,
      providers: [] as string[],
    },
    {
      level: 3,
      name: 'L3',
      label: '网关聚合',
      description: '统一网关层分发请求（OpenRouter、Azure、Bedrock等）',
      protocol: 'gateway',
      threading: 'gateway',
      count: 0,
      providers: [] as string[],
    },
  ];

  for (const provider of allProviders) {
    const lvl = levels.find((l) => l.level === provider.protocolLevel);
    if (lvl) {
      lvl.count++;
      lvl.providers.push(provider.id);
    }
  }

  res.json({
    success: true,
    data: levels,
  });
});

// ─────────────────────────────────────────────
// GET /api/platforms/:id/health — 单个平台健康检查
// ─────────────────────────────────────────────
router.get('/:id/health', async (req, res) => {
  const provider = allProviders.find(p => p.id === req.params.id);
  if (!provider) {
    return res.status(404).json({ success: false, error: 'Platform not found' });
  }

  try {
    const backendRouter = getBackendRouter();
    const backend = backendRouter.getBackend(req.params.id);
    
    if (!backend) {
      return res.json({
        success: true,
        data: {
          id: provider.id,
          healthy: null,
          status: 'not_registered',
          message: '此平台未在 BackendRouter 中注册（可能缺少 API Key）',
        },
      });
    }

    const health = await backend.healthCheck();
    res.json({
      success: true,
      data: {
        id: provider.id,
        healthy: health.status === 'healthy',
        latency: health.latency,
        status: health.status,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.json({
      success: true,
      data: {
        id: provider.id,
        healthy: false,
        status: 'check_failed',
        error: err.message,
        checkedAt: new Date().toISOString(),
      },
    });
  }
});

// 辅助函数：解析 API Key
function resolveApiKey(source: string): string | undefined {
  if (!source || source === 'none') return undefined;
  if (source.startsWith('env:')) {
    const envVar = source.slice(4);
    return process.env[envVar];
  }
  return undefined;
}

export default router;
