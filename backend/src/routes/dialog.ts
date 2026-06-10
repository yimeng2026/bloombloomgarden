import { Router } from 'express';
import { getDialogService } from '../services';
import { getBackendRouter } from '../services/BackendRouter';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

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
  const { content, role = 'user', platformId = 'openrouter', model = 'deepseek/deepseek-chat-v3-0324' } = req.body;
  const service = getDialogService();

  // 保存用户消息到上下文
  await service.sendMessage(req.params.agentId, { content, role });

  // 获取完整上下文
  const context = await service.getContext(req.params.agentId);
  const messages = (context?.messages || []).map((m: any) => ({
    role: m.role === 'agent' ? 'assistant' : m.role,
    content: m.content,
  }));

  // 调用 LLM API（优先使用指定平台，回退到 OpenRouter）
  const backendRouter = getBackendRouter();
  const backendId = platformId || 'openrouter';
  const chatModel = model || 'deepseek/deepseek-chat-v3-0324';
  const response = await backendRouter.chat(backendId, {
    messages,
    model: chatModel,
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
  const { message, platformId = 'openrouter', model = 'deepseek/deepseek-chat-v3-0324' } = req.query;
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
    const backendRouter = getBackendRouter();
    let fullContent = '';
    const backendId = (platformId as string) || 'openrouter';
    const chatModel = (model as string) || 'deepseek/deepseek-chat-v3-0324';

    for await (const chunk of backendRouter.chatStream(backendId, {
      messages,
      model: chatModel,
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
