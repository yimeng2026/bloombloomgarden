/**
 * tasks.ts — 任务管理路由
 * 
 * 【修复】2026-06-10: 移除硬编码静态数据，连接真实 TaskService
 * 所有端点调用 TaskService 实例，返回真实任务数据
 */

import { Router } from 'express';
import { asyncHandlerAny } from '../middleware/asyncHandler';
import { getTaskService } from '../services';

const router = Router();

// GET /api/tasks — 任务列表（真实数据）
router.get('/', asyncHandlerAny(async (req, res) => {
  const service = getTaskService();
  const { status, priority, agentId, workspaceId, search, page = '1', pageSize = '20' } = req.query;
  
  const result = service.listTasks(
    {
      status: status as any,
      priority: priority as any,
      agentId: agentId as string,
      workspaceId: workspaceId as string,
      search: search as string,
    },
    parseInt(page as string, 10) || 1,
    parseInt(pageSize as string, 10) || 20,
  );
  
  res.json({ success: true, data: result.tasks, total: result.total, page: result.page, pageSize: result.pageSize });
}));

// POST /api/tasks — 创建任务
router.post('/', asyncHandlerAny(async (req, res) => {
  const { name, description, priority = 'normal', agentId, workspaceId, payload, scheduledAt, maxRetries } = req.body;
  
  if (!name) {
    return res.status(400).json({ success: false, error: 'name is required' });
  }
  
  const service = getTaskService();
  const task = service.createTask({
    name,
    description,
    priority,
    agentId,
    workspaceId,
    payload,
    scheduledAt,
    maxRetries,
  });
  
  res.status(201).json({ success: true, data: task });
}));

// GET /api/tasks/:id — 获取单个任务
router.get('/:id', asyncHandlerAny(async (req, res) => {
  const service = getTaskService();
  const task = service.getTask(req.params.id);
  
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  
  res.json({ success: true, data: task });
}));

// PUT /api/tasks/:id — 更新任务
router.put('/:id', asyncHandlerAny(async (req, res) => {
  const { name, description, priority, agentId, workspaceId, payload, scheduledAt } = req.body;
  const service = getTaskService();
  
  const task = service.updateTask(req.params.id, {
    name,
    description,
    priority,
    agentId,
    workspaceId,
    payload,
    scheduledAt,
  });
  
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  
  res.json({ success: true, data: task });
}));

// DELETE /api/tasks/:id — 删除任务
router.delete('/:id', asyncHandlerAny(async (req, res) => {
  const service = getTaskService();
  const deleted = service.deleteTask(req.params.id);
  
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  
  res.json({ success: true, data: { deleted: true, id: req.params.id } });
}));

// POST /api/tasks/:id/execute — 执行任务
router.post('/:id/execute', asyncHandlerAny(async (req, res) => {
  const service = getTaskService();
  const task = await service.executeTask(req.params.id);
  
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found or not in pending status' });
  }
  
  res.json({ success: true, data: task });
}));

// POST /api/tasks/:id/cancel — 取消任务
router.post('/:id/cancel', asyncHandlerAny(async (req, res) => {
  const service = getTaskService();
  const task = service.cancelTask(req.params.id);
  
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found or already completed' });
  }
  
  res.json({ success: true, data: task });
}));

// POST /api/tasks/:id/retry — 重试失败任务
router.post('/:id/retry', asyncHandlerAny(async (req, res) => {
  const service = getTaskService();
  const task = service.retryTask(req.params.id);
  
  if (!task) {
    return res.status(400).json({ success: false, error: 'Task not found or not in failed status / max retries exceeded' });
  }
  
  res.json({ success: true, data: task });
}));

// GET /api/tasks/stats — 任务统计
router.get('/stats/overview', asyncHandlerAny(async (_req, res) => {
  const service = getTaskService();
  const stats = service.getStats();
  const queue = service.getQueueStatus();
  
  res.json({
    success: true,
    data: {
      ...stats,
      queue,
      timestamp: new Date().toISOString(),
    },
  });
}));

export default router;
