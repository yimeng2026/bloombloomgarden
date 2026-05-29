import { Router } from 'express';

const router = Router();

// 内存存储
const treeData: any[] = [];
const alerts: any[] = [];
const approvals: any[] = [];

// GET /api/hierarchical/tree — 层级树
router.get('/tree', (req, res) => {
  res.json({ success: true, data: treeData });
});

// GET /api/hierarchical/stats — 统计
router.get('/stats', (req, res) => {
  res.json({ success: true, data: { totalNodes: treeData.length, alerts: alerts.length, approvals: approvals.length } });
});

// GET /api/hierarchical/alerts — 告警列表
router.get('/alerts', (req, res) => {
  const acknowledged = req.query.acknowledged === 'true';
  const data = alerts.filter(a => a.acknowledged === acknowledged);
  res.json({ success: true, data });
});

// GET /api/hierarchical/approvals — 审批列表
router.get('/approvals', (req, res) => {
  res.json({ success: true, data: approvals });
});

// GET /api/hierarchical/approvals/:id — 审批详情
router.get('/approvals/:id', (req, res) => {
  const item = approvals.find(a => a.id === req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, data: item });
});

// POST /api/hierarchical/approvals/:id — 处理审批
router.post('/approvals/:id', (req, res) => {
  const idx = approvals.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Not found' });
  approvals[idx] = { ...approvals[idx], ...req.body, updatedAt: new Date().toISOString() };
  res.json({ success: true, data: approvals[idx] });
});

// POST /api/hierarchical/alerts/:id/acknowledge — 确认告警
router.post('/alerts/:id/acknowledge', (req, res) => {
  const idx = alerts.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Not found' });
  alerts[idx] = { ...alerts[idx], acknowledged: true, acknowledgedAt: new Date().toISOString() };
  res.json({ success: true, data: alerts[idx] });
});

// POST /api/hierarchical/intervene — 人工干预
router.post('/intervene', (req, res) => {
  const { agentId, level, action, reason } = req.body;
  res.json({ success: true, data: { id: `int-${Date.now()}`, agentId, level, action, reason, status: 'executed' } });
});

// GET /api/hierarchical/status — 状态
router.get('/status', (req, res) => {
  res.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() } });
});

export default router;
