import { Router } from 'express';
import { getSkillService } from '../services';

const router = Router();

function asyncHandler(fn: (req: any, res: any, next: any) => Promise<void>) {
  return (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
}

// 1. GET /api/skills — 列表
router.get('/', asyncHandler(async (_req, res) => {
  const service = getSkillService();
  const skills = await service.list();
  res.json({ success: true, data: skills });
}));

// 2. POST /api/skills — 创建
router.post('/', asyncHandler(async (req, res) => {
  const service = getSkillService();
  const skill = await service.create(req.body);
  res.status(201).json({ success: true, data: skill });
}));

// 3. DELETE /api/skills/:id — 删除
router.delete('/:id', asyncHandler(async (req, res) => {
  const service = getSkillService();
  const ok = await service.delete(req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: 'Skill not found' });
  res.status(204).send();
}));

// 4. PUT /api/skills/:id/config — 更新配置
router.put('/:id/config', asyncHandler(async (req, res) => {
  const service = getSkillService();
  const skill = await service.updateConfig(req.params.id, req.body);
  if (!skill) return res.status(404).json({ success: false, error: 'Skill not found' });
  res.json({ success: true, data: skill });
}));

// 5. GET /api/skills/:id/status — 状态
router.get('/:id/status', asyncHandler(async (req, res) => {
  const service = getSkillService();
  const status = await service.getStatus(req.params.id);
  if (!status) return res.status(404).json({ success: false, error: 'Skill not found' });
  res.json({ success: true, data: status });
}));

export default router;
