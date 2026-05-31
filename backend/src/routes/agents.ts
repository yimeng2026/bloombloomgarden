import { Router } from 'express';
import { AgentService, AgentStatus } from '../services/AgentService';
import { getAgentService, getDialogService } from '../services';
import prisma from '../config/prisma';

const router = Router();

function asyncHandler(fn: (req: any, res: any, next: any) => Promise<void>) {
  return (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ─── Mode 与 ProtocolLevel 一致性校验 ───────────────────
function validateModeAndProtocolLevel(
  mode: string,
  protocolLevel: number
): { valid: boolean; error?: string } {
  const modeToLevel: Record<string, number> = {
    A: 1, // 单线程 → L1
    B: 2, // 多线程 → L2
    C: 3, // 网关 → L3
  };

  const expectedLevel = modeToLevel[mode];
  if (expectedLevel === undefined) {
    return { valid: false, error: `Invalid mode "${mode}". Must be A (single-thread), B (multi-thread), or C (gateway)` };
  }

  if (protocolLevel !== expectedLevel) {
    const modeLabels: Record<string, string> = {
      A: 'single-thread (L1)',
      B: 'multi-thread (L2)',
      C: 'gateway (L3)',
    };
    return {
      valid: false,
      error: `Mode "${mode}" (${modeLabels[mode]}) requires protocolLevel ${expectedLevel}, but got ${protocolLevel}`,
    };
  }

  return { valid: true };
}

// ─── 根据 protocolLevel 推导 dashboardType ───────────────
function getDashboardType(level: number): string {
  const map: Record<number, string> = { 0: 'L0', 1: 'L1', 2: 'L2', 3: 'L3' };
  return map[level] || 'L1';
}

// 1. GET /api/agents — 列表
router.get('/', asyncHandler(async (req, res) => {
  const { groupId, status, role } = req.query;
  const service = getAgentService();
  const agents = await service.list({
    groupId: groupId as string | undefined,
    status: status as AgentStatus | undefined,
    role: role as string | undefined,
  });
  res.json({ success: true, data: agents, total: agents.length });
}));

// 1b. GET /api/agents/by-protocol/:level — 按协议层级查询
router.get('/by-protocol/:level', asyncHandler(async (req, res) => {
  const level = parseInt(req.params.level, 10);
  if (isNaN(level) || level < 0 || level > 3) {
    return res.status(400).json({ success: false, error: 'Protocol level must be 0, 1, 2, or 3' });
  }

  let agents: any[] = [];
  if (prisma) {
    const raws = await prisma.agent.findMany({
      where: { protocolLevel: level },
      orderBy: { createdAt: 'desc' },
    });
    agents = raws.map((raw: any) => ({
      ...raw,
      config: JSON.parse(raw.config || '{}'),
      knowledgeBaseIds: JSON.parse(raw.knowledgeBaseIds || '[]'),
      skillIds: JSON.parse(raw.skillIds || '[]'),
      integrationIds: JSON.parse(raw.integrationIds || '[]'),
      threadPlatforms: JSON.parse(raw.threadPlatforms || '[]'),
      workFiles: JSON.parse(raw.workFiles || '[]'),
    }));
  } else {
    // 降级：从 service 获取全部再过滤
    const service = getAgentService();
    const all = await service.list();
    agents = (all as any[]).filter((a: any) => (a.protocolLevel ?? 1) === level);
  }

  res.json({ success: true, data: agents, total: agents.length });
}));

// 2. GET /api/agents/:id — 详情
router.get('/:id', asyncHandler(async (req, res) => {
  const service = getAgentService();
  const agent = await service.getById(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
}));

// 2b. POST /api/agents/:id/chat — 通过Agent对话（快捷方式，代理到dialog逻辑）
router.post('/:id/chat', asyncHandler(async (req, res) => {
  const { content, role = 'user' } = req.body;
  const { getDialogService } = await import('../services');
  const { getBackendRouter } = await import('../services/BackendRouter');
  const dialogService = getDialogService();

  await dialogService.sendMessage(req.params.id, { content, role });
  const context = await dialogService.getContext(req.params.id);
  const messages = (context?.messages || []).map((m: any) => ({
    role: m.role === 'agent' ? 'assistant' : m.role,
    content: m.content,
  }));

  const router = getBackendRouter();
  const response = await router.chat('kimi-code', { messages, model: 'kimi-for-coding', temperature: 0.7 });
  await dialogService.sendMessage(req.params.id, { content: response.content, role: 'agent' });
  res.json({ success: true, data: response });
}));

// 2a. GET /api/agents/:id/context — 上下文详情（真实数据）
router.get('/:id/context', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const agentService = getAgentService();
  const agent = await agentService.getById(id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

  const dialogService = getDialogService();
  const messages = await dialogService.getHistory(id);

  const context = {
    agentId: agent.id,
    agentName: agent.name,
    role: agent.role || 'unknown',
    systemPrompt: (agent as any).systemPrompt || ((agent as any).config ? JSON.parse((agent as any).config || '{}').systemPrompt : null) || '暂无系统提示配置',
    messages: messages.slice(-20).map((m: any) => ({
      role: m.role,
      content: m.content,
      timestamp: m.createdAt || new Date().toISOString(),
    })),
    toolCalls: [],
    knowledgeRefs: [],
    tokenUsage: { used: messages.length * 100, limit: 8192 },
  };
  res.json({ success: true, data: context });
}));

// 2b. GET /api/agents/:id/context/stream — SSE 实时推送
router.get('/:id/context/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const interval = setInterval(async () => {
    try {
      const agentService = getAgentService();
      const agent = await agentService.getById(req.params.id);
      const dialogService = getDialogService();
      const messages = await dialogService.getHistory(req.params.id);
      const used = messages.length * 100;
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat', timestamp: new Date().toISOString(),
        agentStatus: agent?.status || 'unknown',
        tokenUsage: { used, limit: 8192 },
      })}

`);
    } catch (e) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'heartbeat failed' })}

`);
    }
  }, 5000);
  req.on('close', () => clearInterval(interval));
});

// 3. POST /api/agents — 创建（支持协议分层新字段）
router.post('/', asyncHandler(async (req, res) => {
  const {
    name, role, config, knowledgeBaseIds, skillIds, workspaceId,
    groupId, description, avatar,
    // ─── 协议分层新字段 ───────────────────────────
    protocolLevel: reqProtocolLevel,
    mode: reqMode,
    parentPlatform,
    threadPlatforms,
    dashboardType: reqDashboardType,
    workFiles,
  } = req.body;

  // 默认值
  const protocolLevel = reqProtocolLevel ?? 1;
  const mode = reqMode ?? 'A';

  // ── 校验 mode 与 protocolLevel 一致性 ──
  // protocolLevel=0 时跳过 mode 校验（基础设施层无特定mode要求）
  if (protocolLevel > 0) {
    const validation = validateModeAndProtocolLevel(mode, protocolLevel);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }
  }

  // ── Step 1: 创建基础 Agent ──
  const service = getAgentService();
  const baseAgent = await service.create({
    name,
    role,
    config,
    knowledgeBaseIds,
    skillIds,
    workspaceId,
    groupId,
    description,
    avatar,
  });

  // ── Step 2: 更新协议分层字段（直接走 Prisma）──
  if (prisma) {
    const dashboardType = reqDashboardType || getDashboardType(protocolLevel);

    await prisma.agent.update({
      where: { id: baseAgent.id },
      data: {
        protocolLevel,
        mode,
        parentPlatform: parentPlatform || null,
        threadPlatforms: JSON.stringify(threadPlatforms || []),
        dashboardType,
        workFiles: JSON.stringify(workFiles || []),
      },
    });
  }

  // ── Step 3: 返回完整 Agent ──
  const fullAgent = await service.getById(baseAgent.id);
  res.status(201).json({ success: true, data: fullAgent });
}));

// 4. PUT /api/agents/:id — 更新（支持协议分层新字段）
router.put('/:id', asyncHandler(async (req, res) => {
  const {
    protocolLevel: reqProtocolLevel,
    mode: reqMode,
    parentPlatform,
    threadPlatforms,
    dashboardType: reqDashboardType,
    workFiles,
    ...legacyFields
  } = req.body;

  const service = getAgentService();

  // ── Step 1: 更新旧字段 ──
  const agent = await service.update(req.params.id, legacyFields);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

  // ── Step 2: 更新协议分层字段 ──
  if (prisma) {
    const prismaUpdate: any = {};

    if (reqProtocolLevel !== undefined) {
      prismaUpdate.protocolLevel = reqProtocolLevel;
    }
    if (reqMode !== undefined) {
      prismaUpdate.mode = reqMode;
      // 如果同时更新了 mode 和 protocolLevel，再次校验一致性
      const levelToCheck = reqProtocolLevel ?? (await prisma.agent.findUnique({ where: { id: req.params.id }, select: { protocolLevel: true } }))?.protocolLevel ?? 1;
      if (levelToCheck > 0) {
        const validation = validateModeAndProtocolLevel(reqMode, levelToCheck);
        if (!validation.valid) {
          return res.status(400).json({ success: false, error: validation.error });
        }
      }
    }
    if (parentPlatform !== undefined) prismaUpdate.parentPlatform = parentPlatform || null;
    if (threadPlatforms !== undefined) prismaUpdate.threadPlatforms = JSON.stringify(threadPlatforms);
    if (reqDashboardType !== undefined) prismaUpdate.dashboardType = reqDashboardType;
    if (reqProtocolLevel !== undefined && reqDashboardType === undefined) {
      prismaUpdate.dashboardType = getDashboardType(reqProtocolLevel);
    }
    if (workFiles !== undefined) prismaUpdate.workFiles = JSON.stringify(workFiles);

    if (Object.keys(prismaUpdate).length > 0) {
      await prisma.agent.update({
        where: { id: req.params.id },
        data: prismaUpdate,
      });
    }
  }

  const updatedAgent = await service.getById(req.params.id);
  res.json({ success: true, data: updatedAgent });
}));

// 5. DELETE /api/agents/:id — 删除
router.delete('/:id', asyncHandler(async (req, res) => {
  const service = getAgentService();
  const ok = await service.delete(req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.status(204).send();
}));

// 6. POST /api/agents/:id/pause — 暂停
router.post('/:id/pause', asyncHandler(async (req, res) => {
  const service = getAgentService();
  const agent = await service.pause(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
}));

// 7. POST /api/agents/:id/resume — 恢复
router.post('/:id/resume', asyncHandler(async (req, res) => {
  const service = getAgentService();
  const agent = await service.resume(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
}));

// 8. POST /api/agents/:id/isolate — 隔离
router.post('/:id/isolate', asyncHandler(async (req, res) => {
  const service = getAgentService();
  const agent = await service.isolate(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
}));

// 9. POST /api/agents/:id/inject — 消息注入
router.post('/:id/inject', asyncHandler(async (req, res) => {
  const { message } = req.body;
  const service = getAgentService();
  await service.injectMessage(req.params.id, message);
  res.json({ success: true, data: { injected: true } });
}));

export default router;
