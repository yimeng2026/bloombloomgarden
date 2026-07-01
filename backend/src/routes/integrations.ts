import { Router } from 'express';
import { getIntegrationService } from '../services';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// 1. GET /api/integrations — 列表
router.get('/', asyncHandler(async (_req, res) => {
  const service = getIntegrationService();
  const integrations = await service.list();
  res.json({ success: true, data: integrations });
}));

// 2. POST /api/integrations — 创建
router.post('/', asyncHandler(async (req, res) => {
  const service = getIntegrationService();
  const integration = await service.create(req.body);
  res.status(201).json({ success: true, data: integration });
}));

// 3. PUT /api/integrations/:id — 更新
router.put('/:id', asyncHandler(async (req, res) => {
  const service = getIntegrationService();
  const integration = await service.update(req.params.id, req.body);
  if (!integration) return res.status(404).json({ success: false, error: 'Integration not found' });
  res.json({ success: true, data: integration });
}));

// 4. DELETE /api/integrations/:id — 删除
router.delete('/:id', asyncHandler(async (req, res) => {
  const service = getIntegrationService();
  const ok = await service.delete(req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: 'Integration not found' });
  res.status(204).send();
}));

// 5. POST /api/integrations/:id/test — 测试连接
router.post('/:id/test', asyncHandler(async (req, res) => {
  const service = getIntegrationService();
  const result = await service.testConnection(req.params.id);
  res.json({ success: true, data: result });
}));

// 6. GET /api/integrations/types — 支持的集成类型
router.get('/types', asyncHandler(async (_req, res) => {
  const service = getIntegrationService();
  const types = service.getTypes();
  res.json({ success: true, data: types });
}));

export default router;
