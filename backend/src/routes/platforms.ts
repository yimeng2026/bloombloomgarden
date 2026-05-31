import { Router } from 'express';
import providersData from '../config/providers.json';

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
// GET /api/platforms — 平台列表（支持过滤）
// ─────────────────────────────────────────────
router.get('/', (_req, res) => {
  let result = allProviders.map((p) => ({
    id: p.id,
    name: p.name,
    status: 'active' as const,
    healthy: true,
    category: p.category,
    protocolLevel: p.protocolLevel,
    protocol: p.protocol,
    threading: p.threading,
    defaultModel: p.defaultModel,
    models: p.models,
  }));

  const { protocolLevel, protocol, threading } = _req.query;

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

  res.json({
    success: true,
    data: result,
    total: result.length,
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

export default router;
