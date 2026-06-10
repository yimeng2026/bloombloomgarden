import { Router } from 'express';
import { getUnifiedAPIService } from '../services';
import { getBackendRouter } from '../services/BackendRouter';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// 1. POST /api/unified-api/detect — 自动检测 provider
router.post('/detect', asyncHandler(async (req, res) => {
  const { url } = req.body;
  const service = getUnifiedAPIService();
  const result = await service.detectProvider(url);
  res.json({ success: true, data: result });
}));

// 2. POST /api/unified-api/config — 配置统一 API
router.post('/config', asyncHandler(async (req, res) => {
  const service = getUnifiedAPIService();
  const backend = await service.addBackend(req.body);
  res.status(201).json({ success: true, data: backend });
}));

// 3. GET /api/unified-api/platforms — 列出 50+ 支持平台
router.get('/platforms', asyncHandler(async (_req, res) => {
  const router = getBackendRouter();
  const backends = await router.listBackendsDetailed();
  const config = (await import('../config/providers.json')).default;
  
  const platforms = config.providers.map((p: any) => {
    const registered = backends.find(b => b.id === p.id);
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      baseUrl: p.baseUrl,
      defaultModel: p.defaultModel,
      models: p.models,
      apiKeySource: p.apiKeySource,
      enabled: !!registered,
      healthy: registered?.healthy || false,
      latency: registered?.latency || -1,
    };
  });
  
  res.json({ success: true, data: platforms, total: platforms.length });
}));

// 4. POST /api/unified-api/:id/chat — 统一聊天（真实后端调用）
router.post('/:id/chat', asyncHandler(async (req, res) => {
  const { messages, model, temperature, maxTokens } = req.body;
  const router = getBackendRouter();
  try {
    const response = await router.chat(req.params.id, {
      messages,
      model,
      temperature,
      maxTokens,
    });
    res.json({ success: true, data: response });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Chat failed' });
  }
}));

// 5. POST /api/unified-api/:id/stream — 统一流式聊天（真实 SSE）
router.post('/:id/stream', asyncHandler(async (req, res) => {
  const { messages, model, temperature, maxTokens } = req.body;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const router = getBackendRouter();
    for await (const chunk of router.chatStream(req.params.id, {
      messages,
      model,
      temperature,
      maxTokens,
    })) {
      res.write(`event: chat_chunk\ndata: ${JSON.stringify(chunk)}\n\n`);
    }
    res.write(`event: chat_complete\ndata: {}\n\n`);
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
  }
  res.end();
}));

// 6. GET /api/unified-api/:id/validate — 验证配置
router.get('/:id/validate', asyncHandler(async (req, res) => {
  const service = getUnifiedAPIService();
  const result = await service.validateBackend(req.params.id);
  res.json({ success: true, data: result });
}));

export default router;
