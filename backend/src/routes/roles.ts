import { Router } from 'express';
import { getRoleService } from '../services/RoleService';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// POST /api/teams/:id/roles — 添加角色
router.post('/:id/roles', asyncHandler(async (req, res) => {
  const { name, roleType, primaryEngine, systemPrompt, authorizedTools } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Role name is required' });
  }
  if (!roleType) {
    return res.status(400).json({ success: false, error: 'Role type is required' });
  }

  const service = getRoleService();
  const role = await service.create(req.params.id, {
    name: name.trim(),
    roleType,
    primaryEngine,
    systemPrompt,
    authorizedTools,
  });
  res.status(201).json({ success: true, data: role });
}));

// GET /api/roles/:id — 获取角色详情
router.get('/:id', asyncHandler(async (req, res) => {
  const service = getRoleService();
  const role = await service.getById(req.params.id);
  if (!role) return res.status(404).json({ success: false, error: 'Role not found' });
  res.json({ success: true, data: role });
}));

// PUT /api/roles/:id — 更新角色
router.put('/:id', asyncHandler(async (req, res) => {
  const service = getRoleService();
  const role = await service.update(req.params.id, req.body);
  if (!role) return res.status(404).json({ success: false, error: 'Role not found' });
  res.json({ success: true, data: role });
}));

// DELETE /api/roles/:id — 删除角色
router.delete('/:id', asyncHandler(async (req, res) => {
  const service = getRoleService();
  const ok = await service.delete(req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: 'Role not found' });
  res.status(204).send();
}));

// POST /api/roles/:id/execute — 执行角色任务
router.post('/:id/execute', asyncHandler(async (req, res) => {
  const { task } = req.body;
  if (!task || !task.trim()) {
    return res.status(400).json({ success: false, error: 'Task is required' });
  }
  const service = getRoleService();
  const result = await service.execute(req.params.id, task);
  res.json(result);
}));

// POST /api/roles/:id/chat — 与角色对话
router.post('/:id/chat', asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }
  const service = getRoleService();
  const result = await service.chat(req.params.id, message);
  res.json(result);
}));

export default router;
