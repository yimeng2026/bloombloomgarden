import { Router } from 'express';
import { getDialogService, getAgentService } from '../services';
import { getBackendRouter } from '../services/BackendRouter';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

async function ensureBackendRegistered(platformId: string): Promise<boolean> {
  return platformId === 'kimi-code' && Boolean(getBackendRouter().getBackend('kimi-code'));
}

// 辅助函数：获取 Agent 绑定的平台和模型
async function resolveAgentPlatform(agentId: string): Promise<{
  platformId: 'kimi-code';
  model: 'kimi-for-coding';
  systemPrompt?: string;
}> {
  if (agentId === 'general') {
    return { platformId: 'kimi-code', model: 'kimi-for-coding' };
  }
  const agent = await getAgentService().getById(agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);
  return {
    platformId: 'kimi-code',
    model: 'kimi-for-coding',
    systemPrompt: agent.systemPrompt || undefined,
  };
}

// 辅助函数：将 systemPrompt 注入为第一条 system 消息
function injectSystemPrompt(messages: any[], systemPrompt?: string): any[] {
  if (!systemPrompt || typeof systemPrompt !== 'string' || !systemPrompt.trim()) {
    return messages;
  }
  // 如果已有 system 消息，插入在第一个 system 之前
  const hasSystem = messages.some(m => m.role === 'system');
  if (hasSystem) {
    return messages.map(m => (m.role === 'system' ? { ...m, content: `${systemPrompt}\n\n${m.content}` } : m));
  }
  return [{ role: 'system', content: systemPrompt }, ...messages];
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
  // 建立内存上下文，使 GET /api/dialog 能列出此会话
  const service = getDialogService();
  await service.getOrCreateContext(agentId);
  res.json({ success: true, data: session });
}));

// 2. POST /api/dialog/:agentId/chat — 调用 LLM API（非流式，支持 systemPrompt）
router.post('/:agentId/chat', asyncHandler(async (req, res) => {
  try {
    const { content, role = 'user' } = req.body;
    const service = getDialogService();

    // 保存用户消息到上下文
    await service.sendMessage(req.params.agentId, { content, role });

    // 获取完整上下文
    const context = await service.getContext(req.params.agentId);
    let messages = (context?.messages || []).map((m: any) => ({
      role: m.role === 'agent' ? 'assistant' : m.role,
      content: m.content,
    }));

    // 解析 Agent 绑定的平台和模型
    const { platformId, model, systemPrompt } = await resolveAgentPlatform(req.params.agentId);

    // 注入 Agent 的 systemPrompt（如果存在）
    messages = injectSystemPrompt(messages, systemPrompt);

    // 调用 LLM API（通过 Agent/Role 绑定的平台）
    const backendRouter = getBackendRouter();

    const hasBackend = await ensureBackendRegistered(platformId);
    if (!hasBackend) {
      return res.status(400).json({
        success: false,
        error: `未配置 Kimi 后端，请设置服务端 KIMI_API_KEY`,
      });
    }

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
  } catch (err: any) {
    console.error(`[dialog] Chat error for agent ${req.params.agentId}:`, err.message);
    res.status(400).json({ success: false, error: err.message || '对话失败' });
  }
}));

// 3. GET /api/dialog/:agentId/stream — SSE 流式调用 LLM API
// ⚠️ DEPRECATED: 使用 GET 传递消息会暴露到 URL 和日志中。请改用 POST /:agentId/stream
router.get('/:agentId/stream', asyncHandler(async (req, res) => {
  const { message } = req.query;
  if (!message) {
    return res.status(400).json({ success: false, error: 'Missing message query parameter' });
  }
  // 转发到 POST 处理逻辑
  req.body = { message };
  // 注意：这里不能直接调用下一个handler，所以我们手动复用逻辑
  // 在 POST handler 中定义共享逻辑
  return handleStream(req, res, message as string);
}));

// 3b. POST /api/dialog/:agentId/stream — SSE 流式调用 LLM API（安全版本，支持 systemPrompt）
router.post('/:agentId/stream', asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing message in request body' });
  }
  return handleStream(req, res, message);
}));

// 共享的 SSE 流式处理逻辑
async function handleStream(req: any, res: any, message: string) {
  const service = getDialogService();

  try {
    // 保存用户消息
    await service.sendMessage(req.params.agentId, {
      content: message,
      role: 'user',
    });

    // 获取上下文
    const context = await service.getContext(req.params.agentId);
    let messages = (context?.messages || []).map((m: any) => ({
      role: m.role === 'agent' ? 'assistant' : m.role,
      content: m.content,
    }));

    // 解析 Agent 绑定的平台和模型
    const { platformId, model, systemPrompt } = await resolveAgentPlatform(req.params.agentId);

    // 注入 Agent 的 systemPrompt（如果存在）
    messages = injectSystemPrompt(messages, systemPrompt);

    // 确保后端已注册（支持从 APIKeyService 动态获取 Key）
    const hasBackend = await ensureBackendRegistered(platformId);
    if (!hasBackend) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`event: error\ndata: ${JSON.stringify({ error: `未配置 Kimi 后端，请设置服务端 KIMI_API_KEY` })}\n\n`);
      res.end();
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

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
    res.end();
  } catch (err) {
    // 统一错误处理：确保 SSE 格式返回错误
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
    }
    res.write(`event: error\ndata: ${JSON.stringify({ error: (err as Error).message || '对话处理失败' })}\n\n`);
    res.end();
  }
}

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
