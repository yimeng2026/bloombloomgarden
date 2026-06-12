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

// 4. POST /api/unified-api/:id/chat — 【已移除】统一聊天已迁移到 /api/dialog/:agentId/chat
router.post('/:id/chat', asyncHandler(async (req, res) => {
  res.status(410).json({
    success: false,
    error: '此端点已移除',
    message: '统一API聊天已废弃，请通过 Agent 绑定平台进行对话',
    alternative: '/api/dialog/:agentId/chat',
    docs: '/api/dialog',
  });
}));

// 5. POST /api/unified-api/:id/stream — 【已移除】统一流式聊天已迁移到 /api/dialog/:agentId/stream
router.post('/:id/stream', asyncHandler(async (req, res) => {
  res.status(410).json({
    success: false,
    error: '此端点已移除',
    message: '统一API流式聊天已废弃，请通过 Agent 绑定平台进行对话',
    alternative: '/api/dialog/:agentId/stream',
    docs: '/api/dialog',
  });
}));

// 6. GET /api/unified-api/:id/validate — 验证配置
router.get('/:id/validate', asyncHandler(async (req, res) => {
  const service = getUnifiedAPIService();
  const result = await service.validateBackend(req.params.id);
  res.json({ success: true, data: result });
}));

export default router;
