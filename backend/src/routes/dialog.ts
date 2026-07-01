import { Router } from 'express';
import { getDialogService, getAgentService, getRoleService } from '../services';
import { getBackendRouter } from '../services/BackendRouter';
import { apiKeyService } from '../services/APIKeyService';
import { OpenAICompatibleAdapter } from '../adapters/OpenAICompatibleAdapter';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// 辅助函数：动态注册后端（从 APIKeyService 获取 Key）
async function ensureBackendRegistered(platformId: string): Promise<boolean> {
  const backendRouter = getBackendRouter();
  if (backendRouter.getBackend(platformId)) {
    return true; // 已注册
  }

  // 从 APIKeyService 查找 Key
  const keyData = apiKeyService.getDecryptedByProvider(platformId);
  if (!keyData) {
    return false; // 没有配置 Key
  }

  // 从 providers.json 获取平台配置
  const providersConfig = require('../config/providers.json');
  const provider = (providersConfig.providers || []).find((p: any) => p.id === platformId);
  if (!provider) {
    return false;
  }

  // 创建 OpenAI 兼容适配器
  const config = {
    provider: platformId,
    baseUrl: keyData.baseUrl || provider.baseUrl || 'https://api.openai.com',
    apiKey: keyData.apiKey,
    defaultModel: provider.defaultModel || 'gpt-4o',
    maxRetries: 3,
    timeout: 60000,
    apiKeyPrefix: provider.apiKeyPrefix || 'Bearer',
    chatPath: '/chat/completions',
    modelsPath: '/models',
    extraHeaders: provider.extraHeaders || {},
  };

  backendRouter.register(platformId, new OpenAICompatibleAdapter(config), true);
  console.log(`[dialog] Dynamically registered backend ${platformId} with APIKeyService key`);
  return true;
}

// 辅助函数：获取 Agent 绑定的平台和模型
async function resolveAgentPlatform(agentId: string): Promise<{ platformId: string; model: string; apiKeyId?: string; systemPrompt?: string }> {
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
  if (!platformId && (agent.config?.llmConfig as any)?.provider) {
    platformId = (agent.config?.llmConfig as any).provider as string;
  }
  if (!model && (agent.config?.llmConfig as any)?.model) {
    model = (agent.config?.llmConfig as any).model as string;
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

  // 5. 检查 L2 编排器：需要从 config 中读取 L1 引擎
  if (platformId) {
    const providersConfig = require('../config/providers.json');
    const provider = (providersConfig.providers || []).find((p: any) => p.id === platformId);
    if (provider && (provider.protocolLevel === 2 || provider.category === 'orchestrator')) {
      // 是 L2 编排器，需要解析 L1 引擎
      const l1EngineId = (agent.config?.engineId as string) || (agent.config?.orchestratedEngines as string[])?.[0];
      if (l1EngineId) {
        const { getEngineScheduler } = require('../services');
        const scheduler = getEngineScheduler();
        const engine = await scheduler.getById(l1EngineId);
        if (engine) {
          platformId = engine.brand;
          model = engine.model;
        } else {
          throw new Error(`L2 编排器配置的 L1 引擎 ${l1EngineId} 未找到，请检查引擎配置`);
        }
      } else {
        throw new Error(`L2 编排器 ${platformId} 需要配置 L1 引擎，请在创建 Agent 时选择引擎或在 config 中设置 engineId / orchestratedEngines`);
      }
    }
  }

  // 6. 收集 systemPrompt（如果 Agent 有个性化配置）
  const systemPrompt = agent.systemPrompt || undefined;

  return { platformId, model, apiKeyId, systemPrompt };
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
    
    // 确保后端已注册（支持从 APIKeyService 动态获取 Key）
    const hasBackend = await ensureBackendRegistered(platformId);
    if (!hasBackend) {
      return res.status(400).json({ 
        success: false, 
        error: `未找到 ${platformId} 的后端配置，请先在 API Keys 页面配置密钥` 
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
      res.write(`event: error\ndata: ${JSON.stringify({ error: `未找到 ${platformId} 的后端配置，请先在 API Keys 页面配置密钥` })}\n\n`);
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
