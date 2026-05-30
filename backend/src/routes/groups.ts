import { Router } from 'express';
import { GroupService, GroupStatus } from '../services/GroupService';
import { getGroupService, getAgentService } from '../services';

const router = Router();

function asyncHandler(fn: (req: any, res: any, next: any) => Promise<void>) {
  return (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
}

// 1. GET /api/groups — 列表
router.get('/', asyncHandler(async (_req, res) => {
  const service = new GroupService();
  const groups = await service.list();
  res.json({ success: true, data: groups, total: groups.length });
}));

// 2. POST /api/groups — 创建
router.post('/', asyncHandler(async (req, res) => {
  const service = new GroupService();
  const group = await service.create(req.body);
  res.status(201).json({ success: true, data: group });
}));

// 3. GET /api/groups/:id — 详情
router.get('/:id', asyncHandler(async (req, res) => {
  const service = new GroupService();
  const group = await service.getById(req.params.id);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  res.json({ success: true, data: group });
}));

// 4. PUT /api/groups/:id — 更新
router.put('/:id', asyncHandler(async (req, res) => {
  const service = new GroupService();
  const group = await service.update(req.params.id, req.body);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  res.json({ success: true, data: group });
}));

// 5. DELETE /api/groups/:id — 删除
router.delete('/:id', asyncHandler(async (req, res) => {
  const service = new GroupService();
  const ok = await service.delete(req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: 'Group not found' });
  res.status(204).send();
}));

// 6. POST /api/groups/:id/agents — 添加 Agent
router.post('/:id/agents', asyncHandler(async (req, res) => {
  const { agentId } = req.body;
  const service = new GroupService();
  const group = await service.addAgent(req.params.id, agentId);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  res.json({ success: true, data: group });
}));

// 7. DELETE /api/groups/:id/agents/:agentId — 移除 Agent
router.delete('/:id/agents/:agentId', asyncHandler(async (req, res) => {
  const service = new GroupService();
  const group = await service.removeAgent(req.params.id, req.params.agentId);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  res.json({ success: true, data: group });
}));

// 8. POST /api/groups/:id/coordinator — 指定协调员
router.post('/:id/coordinator', asyncHandler(async (req, res) => {
  const { agentId } = req.body;
  const service = new GroupService();
  const group = await service.setCoordinator(req.params.id, agentId);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  res.json({ success: true, data: group });
}));

// 额外：POST /api/groups/:id/nest — 嵌套子群组
router.post('/:id/nest', asyncHandler(async (req, res) => {
  const { childGroupId } = req.body;
  const service = new GroupService();
  const group = await service.nestGroup(req.params.id, childGroupId);
  if (!group) return res.status(404).json({ success: false, error: 'Group or child not found' });
  res.json({ success: true, data: group });
}));

// 5. POST /api/groups/:id/execute — 执行群组编排
router.post('/:id/execute', asyncHandler(async (req, res) => {
  const { mode = 'sequential', input = '' } = req.body;
  const service = getGroupService();
  const result = await service.execute(req.params.id, { mode, input });
  res.json({ success: true, data: result });
}));

// 6a. GET /api/groups/:id/agents — 获取组内 Agent 列表
router.get('/:id/agents', asyncHandler(async (req, res) => {
  const service = getGroupService();
  const group = await service.getById(req.params.id);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  const agentService = getAgentService();
  const agents = await agentService.list();
  const groupAgents = agents.filter((a: any) => group.agentIds?.includes(a.id));
  res.json({ success: true, data: groupAgents, total: groupAgents.length });
}));

// 7. POST /api/groups/:id/pause — 暂停群组
router.post('/:id/pause', asyncHandler(async (req, res) => {
  const service = getGroupService();
  const group = await service.update(req.params.id, { status: GroupStatus.PAUSED });
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  res.json({ success: true, data: group });
}));

// 8. POST /api/groups/:id/resume — 恢复群组
router.post('/:id/resume', asyncHandler(async (req, res) => {
  const service = getGroupService();
  const group = await service.update(req.params.id, { status: GroupStatus.ACTIVE });
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  res.json({ success: true, data: group });
}));

export default router;
