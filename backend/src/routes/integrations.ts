import { Router } from 'express';
import { getIntegrationService } from '../services';
<<<<<<< HEAD
import prisma from '../config/prisma';
=======
>>>>>>> a83b659b1c1718f3a046b4befb9265461b588393

const router = Router();

function asyncHandler(fn: (req: any, res: any, next: any) => Promise<void>) {
  return (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
}

// 1. GET /api/integrations — 列表
router.get('/', asyncHandler(async (_req, res) => {
  const service = getIntegrationService();
  const integrations = await service.list();
  res.json({ success: true, data: integrations });
}));

<<<<<<< HEAD
// 1b. GET /api/integrations/by-protocol/:level
router.get('/by-protocol/:level', asyncHandler(async (req, res) => {
  const level = parseInt(req.params.level, 10);
  if (isNaN(level) || level < 0 || level > 3) {
    return res.status(400).json({ success: false, error: 'Protocol level must be 0, 1, 2, or 3' });
  }
  const service = getIntegrationService();
  const integrations = await service.getByProtocolLevel(level);
  res.json({ success: true, data: integrations, total: integrations.length });
}));

// 2. POST /api/integrations — 创建
router.post('/', asyncHandler(async (req, res) => {
  const { name, type, config, enabled, protocolLevel, threading, protocol, providerId } = req.body;
  const service = getIntegrationService();
  const integration = await service.create({
    name, type, config, enabled,
    protocolLevel: protocolLevel ?? 1,
    threading: threading ?? 'single',
    protocol: protocol ?? 'single-thread',
    providerId: providerId ?? '',
  });
=======
// 2. POST /api/integrations — 创建
router.post('/', asyncHandler(async (req, res) => {
  const service = getIntegrationService();
  const integration = await service.create(req.body);
>>>>>>> a83b659b1c1718f3a046b4befb9265461b588393
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

<<<<<<< HEAD
// 7. POST /api/integrations/sync — 批量同步（协议分层）
router.post('/sync', asyncHandler(async (req, res) => {
  const { filter, protocolLevel } = req.body;
  const service = getIntegrationService();
  const all = await service.list();
  const filtered = all.filter((i: any) => {
    if (protocolLevel !== undefined && (i.protocolLevel ?? 1) !== protocolLevel) return false;
    if (filter && filter.type && i.type !== filter.type) return false;
    return true;
  });
  res.json({ success: true, data: filtered, total: filtered.length });
}));

=======
>>>>>>> a83b659b1c1718f3a046b4befb9265461b588393
export default router;
