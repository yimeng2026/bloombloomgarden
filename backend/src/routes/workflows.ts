import { Router } from 'express';
import { getWorkflowService } from '../services/WorkflowService';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// GET /api/workflows — 列出所有工作流
router.get('/', asyncHandler(async (_req, res) => {
  const service = getWorkflowService();
  const workflows = await service.listWorkflows();
  res.json({ success: true, data: workflows, total: workflows.length });
}));

// POST /api/workflows — 创建工作流
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, definition, category, status, triggerType, cronExpression, teamId, createdBy } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Workflow name is required' });
  }

  const service = getWorkflowService();
  const workflow = await service.createWorkflow({
    name: name.trim(),
    description,
    definition,
    category,
    status,
    triggerType,
    cronExpression,
    teamId,
    createdBy,
  });
  res.status(201).json({ success: true, data: workflow });
}));

// GET /api/workflows/:id — 获取工作流详情
router.get('/:id', asyncHandler(async (req, res) => {
  const service = getWorkflowService();
  const workflow = await service.getWorkflow(req.params.id);
  if (!workflow) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ success: true, data: workflow });
}));

// PUT /api/workflows/:id — 更新工作流
router.put('/:id', asyncHandler(async (req, res) => {
  const service = getWorkflowService();
  const workflow = await service.updateWorkflow(req.params.id, req.body);
  if (!workflow) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ success: true, data: workflow });
}));

// DELETE /api/workflows/:id — 删除工作流
router.delete('/:id', asyncHandler(async (req, res) => {
  const service = getWorkflowService();
  const ok = await service.deleteWorkflow(req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.status(204).send();
}));

// POST /api/workflows/:id/execute — 执行工作流
router.post('/:id/execute', asyncHandler(async (req, res) => {
  const { input } = req.body;
  const service = getWorkflowService();
  const execution = await service.executeWorkflow(req.params.id, input || {});
  res.json({ success: true, data: execution });
}));

// GET /api/workflows/:id/executions — 获取执行历史
router.get('/:id/executions', asyncHandler(async (req, res) => {
  const service = getWorkflowService();
  const executions = await service.getExecutions(req.params.id);
  res.json({ success: true, data: executions, total: executions.length });
}));

// GET /api/workflows/executions/:executionId — 获取单个执行详情
router.get('/executions/:executionId', asyncHandler(async (req, res) => {
  const service = getWorkflowService();
  const execution = await service.getExecution(req.params.executionId);
  if (!execution) return res.status(404).json({ success: false, error: 'Execution not found' });
  res.json({ success: true, data: execution });
}));

export default router;
