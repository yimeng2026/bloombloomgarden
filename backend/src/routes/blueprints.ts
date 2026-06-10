import { Router } from 'express';
import { getBlueprintService } from '../services';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// 1. GET /api/blueprints — 列表
router.get('/', asyncHandler(async (_req, res) => {
  const service = getBlueprintService();
  const blueprints = await service.list();
  res.json({ success: true, data: blueprints });
}));

// 2. POST /api/blueprints — 创建
router.post('/', asyncHandler(async (req, res) => {
  const service = getBlueprintService();
  const blueprint = await service.create(req.body);
  res.status(201).json({ success: true, data: blueprint });
}));

// 3. GET /api/blueprints/:id — 详情
router.get('/:id', asyncHandler(async (req, res) => {
  const service = getBlueprintService();
  const blueprint = await service.getById(req.params.id);
  if (!blueprint) return res.status(404).json({ success: false, error: 'Blueprint not found' });
  res.json({ success: true, data: blueprint });
}));

// 4. PUT /api/blueprints/:id — 更新
router.put('/:id', asyncHandler(async (req, res) => {
  const service = getBlueprintService();
  const blueprint = await service.update(req.params.id, req.body);
  if (!blueprint) return res.status(404).json({ success: false, error: 'Blueprint not found' });
  res.json({ success: true, data: blueprint });
}));

// 5. DELETE /api/blueprints/:id — 删除
router.delete('/:id', asyncHandler(async (req, res) => {
  const service = getBlueprintService();
  const ok = await service.delete(req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: 'Blueprint not found' });
  res.status(204).send();
}));

// 6. POST /api/blueprints/:id/execute — 执行
router.post('/:id/execute', asyncHandler(async (req, res) => {
  const service = getBlueprintService();
  const execution = await service.execute(req.params.id, req.body.variables);
  res.json({ success: true, data: execution });
}));

// 7. POST /api/blueprints/:id/pause — 暂停
router.post('/:id/pause', asyncHandler(async (req, res) => {
  const service = getBlueprintService();
  const execution = await service.pauseExecution(req.params.id);
  if (!execution) return res.status(404).json({ success: false, error: 'Execution not found' });
  res.json({ success: true, data: execution });
}));

// 8. POST /api/blueprints/:id/resume — 恢复
router.post('/:id/resume', asyncHandler(async (req, res) => {
  const service = getBlueprintService();
  const execution = await service.resumeExecution(req.params.id);
  if (!execution) return res.status(404).json({ success: false, error: 'Execution not found' });
  res.json({ success: true, data: execution });
}));

// 9. GET /api/blueprints/:id/executions — 执行历史
router.get('/:id/executions', asyncHandler(async (req, res) => {
  const service = getBlueprintService();
  const executions = service.getExecutions(req.params.id);
  res.json({ success: true, data: executions });
}));

// 10. GET /api/blueprints/presets — 预设
router.get('/presets', asyncHandler(async (_req, res) => {
  const service = getBlueprintService();
  const presets = service.getPresets();
  res.json({ success: true, data: presets });
}));

export default router;
