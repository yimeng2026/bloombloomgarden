import { Router } from 'express';
import { AgentService, AgentStatus } from '../services/AgentService';
import { getAgentService, getDialogService } from '../services';

const router = Router();

function asyncHandler(fn: (req: any, res: any, next: any) => Promise<void>) {
  return (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
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
      })}\n\n`);
    } catch (e) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'heartbeat failed' })}\n\n`);
    }
  }, 5000);
  req.on('close', () => clearInterval(interval));
});

// 3. POST /api/agents — 创建
router.post('/', asyncHandler(async (req, res) => {
  const service = getAgentService();
  const agent = await service.create(req.body);
  res.status(201).json({ success: true, data: agent });
}));

// 4. PUT /api/agents/:id — 更新
router.put('/:id', asyncHandler(async (req, res) => {
  const service = getAgentService();
  const agent = await service.update(req.params.id, req.body);
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
