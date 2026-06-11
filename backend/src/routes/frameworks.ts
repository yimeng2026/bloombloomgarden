import { Router } from 'express';
import { getFrameworkService } from '../services/FrameworkService';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// GET /api/frameworks — 列出所有框架
router.get('/', asyncHandler(async (_req, res) => {
  const service = getFrameworkService();
  const frameworks = await service.list();
  res.json({ success: true, data: frameworks, total: frameworks.length });
}));

// GET /api/frameworks/:brand — 获取框架详情
router.get('/:brand', asyncHandler(async (req, res) => {
  const service = getFrameworkService();
  const fw = await service.getByBrand(req.params.brand);
  if (!fw) return res.status(404).json({ success: false, error: 'Framework not found' });
  res.json({ success: true, data: fw });
}));

// GET /api/frameworks/:brand/templates — 获取框架预设模板
router.get('/:brand/templates', asyncHandler(async (req, res) => {
  const service = getFrameworkService();
  const templates = await service.getTemplates(req.params.brand);
  res.json({ success: true, data: templates });
}));

// GET /api/frameworks/:brand/config — 获取框架配置
router.get('/:brand/config', asyncHandler(async (req, res) => {
  const service = getFrameworkService();
  const config = await service.getConfig(req.params.brand);
  res.json({ success: true, data: config });
}));

// POST /api/frameworks/:brand/config — 更新框架配置
router.post('/:brand/config', asyncHandler(async (req, res) => {
  const service = getFrameworkService();
  await service.updateConfig(req.params.brand, req.body);
  res.json({ success: true, data: { updated: true } });
}));

// GET /api/frameworks/:brand/engines — 获取框架可用引擎
router.get('/:brand/engines', asyncHandler(async (req, res) => {
  const service = getFrameworkService();
  const engines = await service.getAvailableEngines(req.params.brand);
  res.json({ success: true, data: engines, total: engines.length });
}));

export default router;
