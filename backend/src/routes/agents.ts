import { Router } from 'express';
import { AgentService, AgentStatus } from '../services/AgentService';

const router = Router();

function asyncHandler(fn: (req: any, res: any, next: any) => Promise<void>) {
  return (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
}

// 1. GET /api/agents — 列表
router.get('/', asyncHandler(async (req, res) => {
  const { groupId, status, role } = req.query;
  const service = new AgentService();
  const agents = await service.list({
    groupId: groupId as string | undefined,
    status: status as AgentStatus | undefined,
    role: role as string | undefined,
  });
  res.json({ success: true, data: agents, total: agents.length });
}));

// 2. GET /api/agents/:id — 详情
router.get('/:id', asyncHandler(async (req, res) => {
  const service = new AgentService();
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

// 2a. GET /api/agents/:id/context — 上下文详情（对接 AgentContextPanel）
router.get('/:id/context', asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Mock 上下文数据
  const contexts: Record<string, any> = {
    'agent-001': {
      agentId: 'agent-001', agentName: '架构师-Alpha', role: 'system_architect',
      systemPrompt: '你是千界花园的系统架构师，负责评估技术方案的可行性与扩展性，审查代码架构是否符合3DACP协议规范...',
      messages: [
        { role: 'user', content: '设计一个支持万级Agent并发的心跳检测机制', timestamp: '2026-05-28 10:00:23' },
        { role: 'assistant', content: '基于3DACP协议，我建议采用分层心跳设计...', timestamp: '2026-05-28 10:00:45' },
      ],
      toolCalls: [
        { name: 'registry_query', input: { pattern: 'heartbeat_*' }, output: { nodes: 156 }, status: 'success' },
      ],
      knowledgeRefs: [
        { id: 'kb-42', title: '3DACP协议规范 v2.1', relevance: 0.98 },
      ],
      tokenUsage: { used: 3847, limit: 8192 },
    },
  };
  const context = contexts[id] || {
    agentId: id, agentName: `Agent-${id.slice(-4)}`, role: 'unknown',
    systemPrompt: '暂无系统提示配置', messages: [], toolCalls: [],
    knowledgeRefs: [], tokenUsage: { used: 0, limit: 8192 },
  };
  res.json({ success: true, data: context });
}));

// 2b. GET /api/agents/:id/context/stream — SSE 实时推送
router.get('/:id/context/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'heartbeat', timestamp: new Date().toISOString(),
      tokenUsage: { used: Math.floor(Math.random() * 4000), limit: 8192 },
    })}\n\n`);
  }, 5000);
  req.on('close', () => clearInterval(interval));
});

// 3. POST /api/agents — 创建
router.post('/', asyncHandler(async (req, res) => {
  const service = new AgentService();
  const agent = await service.create(req.body);
  res.status(201).json({ success: true, data: agent });
}));

// 4. PUT /api/agents/:id — 更新
router.put('/:id', asyncHandler(async (req, res) => {
  const service = new AgentService();
  const agent = await service.update(req.params.id, req.body);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
}));

// 5. DELETE /api/agents/:id — 删除
router.delete('/:id', asyncHandler(async (req, res) => {
  const service = new AgentService();
  const ok = await service.delete(req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.status(204).send();
}));

// 6. POST /api/agents/:id/pause — 暂停
router.post('/:id/pause', asyncHandler(async (req, res) => {
  const service = new AgentService();
  const agent = await service.pause(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
}));

// 7. POST /api/agents/:id/resume — 恢复
router.post('/:id/resume', asyncHandler(async (req, res) => {
  const service = new AgentService();
  const agent = await service.resume(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
}));

// 8. POST /api/agents/:id/isolate — 隔离
router.post('/:id/isolate', asyncHandler(async (req, res) => {
  const service = new AgentService();
  const agent = await service.isolate(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
}));

// 9. POST /api/agents/:id/inject — 消息注入
router.post('/:id/inject', asyncHandler(async (req, res) => {
  const { message } = req.body;
  const service = new AgentService();
  await service.injectMessage(req.params.id, message);
  res.json({ success: true, data: { injected: true } });
}));

export default router;
