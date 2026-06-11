import { Router } from 'express';
import { AgentService, AgentStatus } from '../services/AgentService';
import { getAgentService, getDialogService } from '../services';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

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

  const service = getAgentService();
  const all = await service.list();
  const agents = all.filter((a: any) => (a.protocolLevel ?? 1) === level);
  res.json({ success: true, data: agents, total: agents.length });
}));

// 2. GET /api/agents/:id — 详情
router.get('/:id', asyncHandler(async (req, res) => {
  const service = getAgentService();
  const agent = await service.getById(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
}));

// 2b. POST /api/agents/:id/chat — 【已废弃】请使用 /api/dialog/:agentId/chat
router.post('/:id/chat', asyncHandler(async (req, res) => {
  console.warn(`[DEPRECATED] POST /api/agents/${req.params.id}/chat 已废弃，请迁移到 POST /api/dialog/${req.params.id}/chat`);

  const content = req.body.content || req.body.message || '';
  const { getDialogService } = await import('../services');
  const { getBackendRouter } = await import('../services/BackendRouter');
  const dialogService = getDialogService();

  await dialogService.sendMessage(req.params.id, { content, role: 'user' });

  let messages: Array<{role: 'user' | 'assistant' | 'system'; content: string}> = [];
  try {
    const context = await dialogService.getContext(req.params.id);
    messages = (context?.messages || []).map((m: any) => ({
      role: (m.role === 'agent' ? 'assistant' : m.role) as 'user' | 'assistant' | 'system',
      content: m.content || '',
    }));
  } catch {
    // If context fails, just use the current message
  }

  if (messages.length === 0) {
    messages = [{ role: 'user' as const, content }];
  }

  const agentService = getAgentService();
  const agent = await agentService.getById(req.params.id);
  const agentConfig = (agent?.config as any) || {};
  const llmConfig = agentConfig.llmConfig || {};

  const router = getBackendRouter();
  const platformId = llmConfig.provider || req.body.platformId || 'openrouter';
  const model = llmConfig.model || req.body.model || 'deepseek/deepseek-chat-v3-0324';

  try {
    const response = await router.chat(platformId, { messages, model, temperature: 0.7 });
    await dialogService.sendMessage(req.params.id, { content: response.content, role: 'agent' });
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', 'Sat, 01 Aug 2026 00:00:00 GMT');
    res.json({ success: true, data: response, deprecated: true, alternative: `/api/dialog/${req.params.id}/chat` });
  } catch (err: any) {
    console.error('[Chat] Backend error:', err.message);
    res.status(502).json({ success: false, error: err.message || 'Chat failed', deprecated: true });
  }
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
    systemPrompt: (agent as any).systemPrompt || ((agent as any).config ? (typeof (agent as any).config === 'string' ? JSON.parse((agent as any).config || '{}').systemPrompt : (agent as any).config.systemPrompt) : null) || '暂无系统提示配置',
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
  let isClosed = false;
  const interval = setInterval(async () => {
    if (isClosed) return;
    try {
      const agentService = getAgentService();
      const agent = await agentService.getById(req.params.id);
      const dialogService = getDialogService();
      const messages = await dialogService.getHistory(req.params.id);
      const used = messages.length * 100;
      if (!isClosed) {
        res.write(`data: ${JSON.stringify({
          type: 'heartbeat', timestamp: new Date().toISOString(),
          agentStatus: agent?.status || 'unknown',
          tokenUsage: { used, limit: 8192 },
        })}

`);
      }
    } catch (e) {
      if (!isClosed) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'heartbeat failed' })}

`);
      }
    }
  }, 5000);
  req.on('close', () => { isClosed = true; clearInterval(interval); });
});

// 3. POST /api/agents — 创建（精简版：路由层只做参数提取，全部下沉到 Service）
router.post('/', asyncHandler(async (req, res) => {
  const {
    name, role, config, llmConfig, knowledgeBaseIds, skillIds, workspaceId,
    groupId, description, avatar,
    protocolLevel, mode, parentPlatform, threadPlatforms,
    dashboardType, workFiles,
    swarmEnabled, swarmMode, roleInGroup, coordinatorId,
  } = req.body;

  // 路由层只做空值校验
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Agent name is required' });
  }
  if (!role || !role.trim()) {
    return res.status(400).json({ success: false, error: 'Agent role is required' });
  }

  // 合并 llmConfig 到 config
  const mergedConfig: Record<string, unknown> = (config as any) || {};
  if (llmConfig && typeof llmConfig === 'object') {
    mergedConfig.llmConfig = llmConfig;
  }

  // 一次性传给 Service（包含全部字段）
  const service = getAgentService();
  try {
    const agent = await service.create({
      name: name.trim(),
      role: role.trim(),
      config: mergedConfig,
      knowledgeBaseIds,
      skillIds,
      workspaceId,
      groupId,
      description,
      avatar,
      protocolLevel,
      mode,
      parentPlatform,
      threadPlatforms,
      dashboardType,
      workFiles,
      swarmEnabled,
      swarmMode,
      roleInGroup,
      coordinatorId,
    });
    res.status(201).json({ success: true, data: agent });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
}));

// 4. PUT /api/agents/:id — 更新
router.put('/:id', asyncHandler(async (req, res) => {
  const service = getAgentService();

  // 提取需要 JSON 序列化的字段
  const updatePayload: any = { ...req.body };

  // 如果传了 llmConfig，合并到 config
  if (req.body.llmConfig && typeof req.body.llmConfig === 'object') {
    const current = await service.getById(req.params.id);
    const currentConfig = (current?.config as any) || {};
    updatePayload.config = { ...currentConfig, llmConfig: req.body.llmConfig };
    delete updatePayload.llmConfig;
  }

  // 数组字段保持数组（Service.update 内部会 JSON.stringify）
  const agent = await service.update(req.params.id, updatePayload);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
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
