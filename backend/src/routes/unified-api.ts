import { Router } from 'express';
import { getUnifiedAPIService } from '../services';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.post('/detect', asyncHandler(async (req, res) => {
  const result = await getUnifiedAPIService().detectProvider(String(req.body?.url || ''));
  res.json({ success: true, data: result });
}));

router.post('/config', asyncHandler(async (req, res) => {
  const backend = await getUnifiedAPIService().addBackend(req.body || {});
  res.status(200).json({
    success: true,
    data: backend,
    note: 'Kimi-only registry; credentials remain in server environment',
  });
}));

router.get('/platforms', asyncHandler(async (_req, res) => {
  const service = getUnifiedAPIService();
  const backends = await service.listBackends();
  const health = await service.validateBackend('kimi-code');
  const platforms = backends.map(backend => ({
    id: backend.id,
    name: backend.name,
    provider: backend.provider,
    baseUrl: backend.baseUrl,
    model: backend.model,
    enabled: backend.enabled,
    healthy: health.valid,
    latency: health.latency ?? -1,
  }));
  res.json({ success: true, data: platforms, total: platforms.length });
}));

router.post('/:id/chat', asyncHandler(async (_req, res) => {
  res.status(410).json({ success: false, error: 'Use /api/dialog/:agentId/chat' });
}));

router.post('/:id/stream', asyncHandler(async (_req, res) => {
  res.status(410).json({ success: false, error: 'Use /api/dialog/:agentId/stream' });
}));

router.get('/:id/validate', asyncHandler(async (req, res) => {
  const result = await getUnifiedAPIService().validateBackend(req.params.id);
  res.status(result.valid ? 200 : 503).json({ success: result.valid, data: result });
}));

export default router;
