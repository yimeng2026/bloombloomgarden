import { Router, Request, Response, NextFunction } from 'express';
import { getHandoffProtocol, getSwarmCoordinator, HandoffStatus } from '../services/CollabFramework';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// ─── 8 端点实现 ────────────────────────────────────────

// 1. POST /api/handoff/initiate — 发起交接
router.post('/initiate', asyncHandler(async (req, res) => {
  const { sourceChariotId, targetChariotId, task, initiatedBy, reason } = req.body;
  const handoff = getHandoffProtocol();
  const record = handoff.initiate({
    sourceChariotId,
    targetChariotId,
    task,
    initiatedBy,
    reason,
  });
  res.status(201).json({ success: true, data: record });
}));

// 2. POST /api/handoff/:id/accept — 接受
router.post('/:id/accept', asyncHandler(async (req, res) => {
  const { acceptedBy } = req.body;
  const handoff = getHandoffProtocol();
  const record = handoff.accept(req.params.id, acceptedBy || req.body.userId || 'system');
  res.json({ success: true, data: record });
}));

// 3. POST /api/handoff/:id/reject — 拒绝
router.post('/:id/reject', asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const handoff = getHandoffProtocol();
  const record = handoff.reject(req.params.id, reason);
  res.json({ success: true, data: record });
}));

// 4. POST /api/handoff/:id/start — 开始执行
router.post('/:id/start', asyncHandler(async (req, res) => {
  const handoff = getHandoffProtocol();
  const record = await handoff.start(req.params.id);
  res.json({ success: true, data: record });
}));

// 5. POST /api/handoff/:id/complete — 完成
router.post('/:id/complete', asyncHandler(async (req, res) => {
  const { result } = req.body;
  const handoff = getHandoffProtocol();
  const record = await handoff.complete(req.params.id, result);
  res.json({ success: true, data: record });
}));

// 6. POST /api/handoff/:id/cancel — 取消
router.post('/:id/cancel', asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const handoff = getHandoffProtocol();
  const record = handoff.cancel(req.params.id, reason);
  res.json({ success: true, data: record });
}));

// 7. GET /api/handoff/:id/status — 状态查询
router.get('/:id/status', asyncHandler(async (req, res) => {
  const handoff = getHandoffProtocol();
  const status = handoff.getStatus(req.params.id);
  res.json({ success: true, data: { handoffId: req.params.id, status } });
}));

// 8. GET /api/handoff/list — 记录列表
router.get('/list', asyncHandler(async (req, res) => {
  const { sourceChariotId, targetChariotId, status } = req.query;
  const handoff = getHandoffProtocol();
  const records = handoff.listRecords({
    sourceChariotId: sourceChariotId as string | undefined,
    targetChariotId: targetChariotId as string | undefined,
    status: status as HandoffStatus | undefined,
  });
  res.json({ success: true, data: records });
}));

// ─── 额外实用端点 ─────────────────────────────────────

// POST /api/handoff/:id/execute — 一键执行交接（start + execute + complete）
router.post('/:id/execute', asyncHandler(async (req, res) => {
  const handoff = getHandoffProtocol();
  const result = await handoff.executeHandoff(req.params.id);
  res.json({ success: true, data: result });
}));

// GET /api/handoff/chariot/:id/stats — 战车交接统计
router.get('/chariot/:id/stats', asyncHandler(async (req, res) => {
  const handoff = getHandoffProtocol();
  const stats = handoff.getChariotStats(req.params.id);
  res.json({ success: true, data: stats });
}));

export default router;
