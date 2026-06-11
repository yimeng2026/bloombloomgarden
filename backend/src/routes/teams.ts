import { Router } from 'express';
import { getTeamService } from '../services/TeamService';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// POST /api/teams — 创建团队
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, frameworkId, collaborationMode, engineStrategy, roles } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Team name is required' });
  }
  if (!frameworkId) {
    return res.status(400).json({ success: false, error: 'Framework ID is required' });
  }
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one role is required' });
  }

  const service = getTeamService();
  const team = await service.create({
    name: name.trim(),
    description,
    frameworkId,
    collaborationMode,
    engineStrategy,
    roles,
  });
  res.status(201).json({ success: true, data: team });
}));

// GET /api/teams — 列出团队
router.get('/', asyncHandler(async (_req, res) => {
  const service = getTeamService();
  const teams = await service.list();
  res.json({ success: true, data: teams, total: teams.length });
}));

// GET /api/teams/:id — 获取团队详情
router.get('/:id', asyncHandler(async (req, res) => {
  const service = getTeamService();
  const team = await service.getById(req.params.id);
  if (!team) return res.status(404).json({ success: false, error: 'Team not found' });
  res.json({ success: true, data: team });
}));

// PUT /api/teams/:id — 更新团队
router.put('/:id', asyncHandler(async (req, res) => {
  const service = getTeamService();
  const team = await service.update(req.params.id, req.body);
  if (!team) return res.status(404).json({ success: false, error: 'Team not found' });
  res.json({ success: true, data: team });
}));

// DELETE /api/teams/:id — 删除团队
router.delete('/:id', asyncHandler(async (req, res) => {
  const service = getTeamService();
  const ok = await service.delete(req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: 'Team not found' });
  res.status(204).send();
}));

// POST /api/teams/:id/execute — 启动团队
router.post('/:id/execute', asyncHandler(async (req, res) => {
  const service = getTeamService();
  const team = await service.execute(req.params.id, req.body.task);
  if (!team) return res.status(404).json({ success: false, error: 'Team not found' });
  res.json({ success: true, data: team });
}));

// POST /api/teams/:id/pause — 暂停团队
router.post('/:id/pause', asyncHandler(async (req, res) => {
  const service = getTeamService();
  const team = await service.pause(req.params.id);
  if (!team) return res.status(404).json({ success: false, error: 'Team not found' });
  res.json({ success: true, data: team });
}));

// POST /api/teams/:id/resume — 恢复团队
router.post('/:id/resume', asyncHandler(async (req, res) => {
  const service = getTeamService();
  const team = await service.resume(req.params.id);
  if (!team) return res.status(404).json({ success: false, error: 'Team not found' });
  res.json({ success: true, data: team });
}));

// GET /api/teams/:id/status — 获取团队状态
router.get('/:id/status', asyncHandler(async (req, res) => {
  const service = getTeamService();
  const status = await service.getStatus(req.params.id);
  if (!status) return res.status(404).json({ success: false, error: 'Team not found' });
  res.json({ success: true, data: status });
}));

// GET /api/teams/:id/collaboration — 获取协作流
router.get('/:id/collaboration', asyncHandler(async (req, res) => {
  const service = getTeamService();
  const events = await service.getCollaborationStream(req.params.id);
  res.json({ success: true, data: events });
}));

// POST /api/teams/:id/intervene — 人工干预
router.post('/:id/intervene', asyncHandler(async (req, res) => {
  const { action, data } = req.body;
  const service = getTeamService();
  const result = await service.intervene(req.params.id, action, data);
  res.json(result);
}));

export default router;
