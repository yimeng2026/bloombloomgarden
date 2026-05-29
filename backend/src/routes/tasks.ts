import { Router } from 'express';

const router = Router();

// GET /api/tasks — 任务列表
router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: [
      { id: '1', title: '数据分析任务', status: 'completed', priority: 'high', createdAt: new Date().toISOString() },
      { id: '2', title: '代码审查', status: 'in_progress', priority: 'medium', createdAt: new Date().toISOString() },
      { id: '3', title: '文档生成', status: 'pending', priority: 'low', createdAt: new Date().toISOString() },
    ],
  });
});

// POST /api/tasks — 创建任务
router.post('/', (req, res) => {
  const { title, priority = 'medium' } = req.body;
  res.json({
    success: true,
    data: { id: Date.now().toString(), title, status: 'pending', priority, createdAt: new Date().toISOString() },
  });
});

// GET /api/tasks/:id — 获取单个任务
router.get('/:id', (req, res) => {
  res.json({
    success: true,
    data: { id: req.params.id, title: '示例任务', status: 'in_progress', priority: 'high', createdAt: new Date().toISOString() },
  });
});

// PUT /api/tasks/:id — 更新任务
router.put('/:id', (req, res) => {
  const { title, status, priority } = req.body;
  res.json({
    success: true,
    data: { id: req.params.id, title: title || '更新后任务', status: status || 'in_progress', priority: priority || 'medium', updatedAt: new Date().toISOString() },
  });
});

// DELETE /api/tasks/:id — 删除任务
router.delete('/:id', (req, res) => {
  res.json({ success: true, data: { deleted: true, id: req.params.id } });
});

// POST /api/tasks/:id/execute — 执行任务
router.post('/:id/execute', (req, res) => {
  res.json({
    success: true,
    data: { id: req.params.id, executionId: `exec_${Date.now()}`, status: 'running', startedAt: new Date().toISOString() },
  });
});

export default router;
