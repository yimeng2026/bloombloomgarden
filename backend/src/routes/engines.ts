import { Router } from 'express';
import { getEngineScheduler } from '../services/EngineScheduler';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// GET /api/engines — 列出所有引擎
router.get('/', asyncHandler(async (_req, res) => {
  const scheduler = getEngineScheduler();
  const engines = await scheduler.listEngines();
  res.json({ success: true, data: engines, total: engines.length });
}));

// GET /api/engines/available — 列出可用引擎
router.get('/available', asyncHandler(async (_req, res) => {
  const scheduler = getEngineScheduler();
  const engines = await scheduler.listAvailable();
  res.json({ success: true, data: engines, total: engines.length });
}));

// POST /api/engines — 注册新引擎
router.post('/', asyncHandler(async (req, res) => {
  const scheduler = getEngineScheduler();
  const engine = await scheduler.registerEngine(req.body);
  res.status(201).json({ success: true, data: engine });
}));

// ─── 具体路由（必须放在 /:id 通配符之前）─────────────────

// POST /api/engines/:id/chat — 【已移除】引擎对话已统一迁移到 /api/dialog/:agentId/chat
router.post('/:id/chat', asyncHandler(async (req, res) => {
  res.status(410).json({
    success: false,
    error: '此端点已移除',
    message: '引擎独立对话已废弃，请通过 Agent 绑定平台进行对话',
    alternative: '/api/dialog/:agentId/chat',
    docs: '/api/dialog',
  });
}));

// POST /api/engines/:id/allocate — 分配引擎
router.post('/:id/allocate', asyncHandler(async (req, res) => {
  const { role, strategy } = req.body;
  const scheduler = getEngineScheduler();
  const engine = await scheduler.allocate(role, strategy);
  if (!engine) return res.status(503).json({ success: false, error: 'No available engine' });
  res.json({ success: true, data: engine });
}));

// POST /api/engines/:id/release — 释放引擎
router.post('/:id/release', asyncHandler(async (req, res) => {
  const scheduler = getEngineScheduler();
  await scheduler.release(req.params.id);
  res.json({ success: true, data: { released: true } });
}));

// GET /api/engines/:id/health — 健康检查
router.get('/:id/health', asyncHandler(async (req, res) => {
  const scheduler = getEngineScheduler();
  const health = await scheduler.healthCheck(req.params.id);
  res.json({ success: true, data: health });
}));

// POST /api/engines/:id/keys — 添加API Key
router.post('/:id/keys', asyncHandler(async (req, res) => {
  const { key, weight } = req.body;
  const scheduler = getEngineScheduler();
  const ok = await scheduler.addKey(req.params.id, { key, weight });
  if (!ok) return res.status(404).json({ success: false, error: 'Engine not found' });
  res.json({ success: true, data: { added: true } });
}));

// DELETE /api/engines/:id/keys/:keyId — 移除API Key
router.delete('/:id/keys/:keyId', asyncHandler(async (req, res) => {
  const scheduler = getEngineScheduler();
  const ok = await scheduler.removeKey(req.params.id, req.params.keyId);
  if (!ok) return res.status(404).json({ success: false, error: 'Engine or key not found' });
  res.json({ success: true, data: { removed: true } });
}));

// ─── 通配符路由（放在最后）─────────────────────────────

// GET /api/engines/:id — 获取引擎详情
router.get('/:id', asyncHandler(async (req, res) => {
  const scheduler = getEngineScheduler();
  const engine = await scheduler.getById(req.params.id);
  if (!engine) return res.status(404).json({ success: false, error: 'Engine not found' });
  res.json({ success: true, data: engine });
}));

// PUT /api/engines/:id — 更新引擎
router.put('/:id', asyncHandler(async (req, res) => {
  const scheduler = getEngineScheduler();
  const engine = await scheduler.updateEngine(req.params.id, req.body);
  if (!engine) return res.status(404).json({ success: false, error: 'Engine not found' });
  res.json({ success: true, data: engine });
}));

// DELETE /api/engines/:id — 删除引擎
router.delete('/:id', asyncHandler(async (req, res) => {
  const scheduler = getEngineScheduler();
  const ok = await scheduler.deleteEngine(req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: 'Engine not found' });
  res.status(204).send();
}));

export default router;
