import { Router } from 'express';
import { getDialogService, getAgentService, getRoleService } from '../services';
import { getBackendRouter } from '../services/BackendRouter';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// 辅助函数：获取 Agent 绑定的平台和模型
async function resolveAgentPlatform(agentId: string): Promise<{ platformId: string; model: string; apiKeyId?: string }> {
  const agentService = getAgentService();
  const roleService = getRoleService();

  // 特殊处理 'general' 通用助手 — 使用智谱AI GLM-5.1
  if (agentId === 'general') {
    return { platformId: 'zhipu', model: 'glm-5.1' };
  }

  // 1. 获取 Agent
  const agent = await agentService.getById(agentId);
  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  // 2. 优先使用 Agent 绑定的平台
  let platformId = agent.platformId;
  let apiKeyId = agent.apiKeyId;
  let model = agent.config?.model as string | undefined;

  // 2b. 兼容旧数据：从 config.llmConfig.provider 获取平台
  if (!platformId && agent.config?.llmConfig?.provider) {
    platformId = agent.config.llmConfig.provider as string;
  }
  if (!model && agent.config?.llmConfig?.model) {
    model = agent.config.llmConfig.model as string;
  }

  // 3. 如果 Agent 没有绑定平台，尝试从 Role 获取
  if (!platformId && agent.role) {
    // agent.role 可能是 roleId 或 roleName，先尝试作为 ID 查询
    const role = await roleService.getById(agent.role);
    if (role) {
      platformId = role.platformId;
      apiKeyId = role.apiKeyId;
      model = role.primaryEngine;
    }
  }

  // 4. 回退默认值
  if (!platformId) {
    platformId = 'openrouter';
  }
  if (!model) {
    model = 'deepseek/deepseek-chat-v3-0324';
  }

  return { platformId, model, apiKeyId };
}

// 1. GET /api/dialog/agents — 可对话 Agent 列表
router.get('/agents', asyncHandler(async (_req, res) => {
  const service = getDialogService();
  const agents = await service.listAgents();
  res.json({ success: true, data: agents });
}));

// 0. GET /api/dialog — 获取最近对话会话列表
router.get('/', asyncHandler(async (_req, res) => {
  const service = getDialogService();
  const sessions = await service.listSessions?.() || [];
  res.json({ success: true, data: sessions });
}));

// 0b. POST /api/dialog — 创建新对话会话
router.post('/', asyncHandler(async (req, res) => {
  const { agentId, title = '新对话' } = req.body;
  const session = { id: `sess_${Date.now()}`, agentId, title, createdAt: new Date().toISOString() };
  res.json({ success: true, data: session });
}));

// 2. POST /api/dialog/:agentId/chat — 调用 LLM API（非流式）
router.post('/:agentId/chat', asyncHandler(async (req, res) => {
  const { content, role = 'user' } = req.body;
  const service = getDialogService();

  // 保存用户消息到上下文
  await service.sendMessage(req.params.agentId, { content, role });

  // 获取完整上下文
  const context = await service.getContext(req.params.agentId);
  const messages = (context?.messages || []).map((m: any) => ({
    role: m.role === 'agent' ? 'assistant' : m.role,
    content: m.content,
  }));

  // 解析 Agent 绑定的平台和模型
  const { platformId, model } = await resolveAgentPlatform(req.params.agentId);

  // 调用 LLM API（通过 Agent/Role 绑定的平台）
  const backendRouter = getBackendRouter();
  const response = await backendRouter.chat(platformId, {
    messages,
    model,
    temperature: 0.7,
  });

  // 保存 AI 回复到上下文
  await service.sendMessage(req.params.agentId, {
    content: response.content,
    role: 'agent',
  });

  res.json({ success: true, data: response });
}));

// 3. GET /api/dialog/:agentId/stream — SSE 流式调用 LLM API
router.get('/:agentId/stream', asyncHandler(async (req, res) => {
  const { message } = req.query;
  const service = getDialogService();

  // 保存用户消息
  await service.sendMessage(req.params.agentId, {
    content: message as string,
    role: 'user',
  });

  // 获取上下文
  const context = await service.getContext(req.params.agentId);
  const messages = (context?.messages || []).map((m: any) => ({
    role: m.role === 'agent' ? 'assistant' : m.role,
    content: m.content,
  }));

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // 解析 Agent 绑定的平台和模型
    const { platformId, model } = await resolveAgentPlatform(req.params.agentId);

    const backendRouter = getBackendRouter();
    let fullContent = '';

    for await (const chunk of backendRouter.chatStream(platformId, {
      messages,
      model,
      temperature: 0.7,
    })) {
      fullContent += chunk.content;
      res.write(`event: chat_chunk\ndata: ${JSON.stringify(chunk)}\n\n`);
    }

    // 保存完整回复到上下文
    await service.sendMessage(req.params.agentId, {
      content: fullContent,
      role: 'agent',
    });

    res.write(`event: chat_complete\ndata: {}\n\n`);
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
  }
  res.end();
}));

// 4. POST /api/dialog/:agentId/files — 上传附件
router.post('/:agentId/files', asyncHandler(async (req, res) => {
  const { fileId } = req.body;
  const service = getDialogService();
  await service.addAttachment(req.params.agentId, fileId);
  res.json({ success: true, data: { attached: true } });
}));

// 5. GET /api/dialog/:agentId/context — 获取上下文
router.get('/:agentId/context', asyncHandler(async (req, res) => {
  const service = getDialogService();
  const context = await service.getContext(req.params.agentId);
  if (!context) return res.status(404).json({ success: false, error: 'Context not found' });
  res.json({ success: true, data: context });
}));

// 6. DELETE /api/dialog/:agentId/context — 清除上下文
router.delete('/:agentId/context', asyncHandler(async (req, res) => {
  const service = getDialogService();
  const ok = await service.clearContext(req.params.agentId);
  if (!ok) return res.status(404).json({ success: false, error: 'Context not found' });
  res.json({ success: true, data: { cleared: true } });
}));

export default router;
