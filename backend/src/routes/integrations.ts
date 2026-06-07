import { Router } from 'express';
import { getIntegrationService } from '../services';

const router = Router();

function asyncHandler(fn: (req: any, res: any, next: any) => Promise<void>) {
  return (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ===== 变更点: GET /api/integrations 支持 protocolLevel 过滤 =====
router.get('/', asyncHandler(async (req, res) => {
  const service = getIntegrationService();
  const filters: { protocolLevel?: number; threading?: string; protocol?: string } = {};

  if (req.query.protocolLevel !== undefined) {
    const pl = Number(req.query.protocolLevel);
    if (!isNaN(pl)) filters.protocolLevel = pl;
  }
  if (req.query.threading) filters.threading = String(req.query.threading);
  if (req.query.protocol) filters.protocol = String(req.query.protocol);

  const integrations = await service.list(Object.keys(filters).length > 0 ? filters : undefined);
  res.json({ success: true, data: integrations });
}));

// ===== 变更点: 新增 GET /api/integrations/available?mode=single =====
// 返回适合该 Agent 创建模式的已配置平台
router.get('/available', asyncHandler(async (req, res) => {
  const service = getIntegrationService();
  const mode = String(req.query.mode || 'single');
  const result = await service.getAvailablePlatformsForAgent(mode);
  res.json({ success: true, data: result.platforms, message: result.message });
}));

router.post('/', asyncHandler(async (req, res) => {
  const service = getIntegrationService();
  const integration = await service.create(req.body);
  res.status(201).json({ success: true, data: integration });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const service = getIntegrationService();
  const integration = await service.update(req.params.id, req.body);
  if (!integration) return res.status(404).json({ success: false, error: 'Integration not found' });
  res.json({ success: true, data: integration });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const service = getIntegrationService();
  const ok = await service.delete(req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: 'Integration not found' });
  res.status(204).send();
}));

router.post('/:id/test', asyncHandler(async (req, res) => {
  const service = getIntegrationService();
  const result = await service.testConnection(req.params.id);
  res.json({ success: true, data: result });
}));

router.get('/types', asyncHandler(async (_req, res) => {
  const service = getIntegrationService();
  const types = service.getTypes();
  res.json({ success: true, data: types });
}));

// ===== 变更点: 新增 POST /api/integrations/validate =====
// 验证平台连接规则（如 L2 只能连 L1）
router.post('/validate', asyncHandler(async (req, res) => {
  const service = getIntegrationService();
  const { sourceLevel, targetLevel } = req.body;
  if (typeof sourceLevel !== 'number' || typeof targetLevel !== 'number') {
    return res.status(400).json({ success: false, error: 'sourceLevel and targetLevel must be numbers' });
  }
  const result = service.validateConnection(sourceLevel, targetLevel);
  res.json({ success: true, data: result });
}));

export default router;
