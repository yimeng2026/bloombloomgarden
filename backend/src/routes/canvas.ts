import { Router } from 'express';
import { getCanvasService } from '../services/CanvasService';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// GET /api/canvas — 列出所有画布
router.get('/', asyncHandler(async (_req, res) => {
  const service = getCanvasService();
  const canvases = await service.listCanvases();
  res.json({ success: true, data: canvases, total: canvases.length });
}));

// POST /api/canvas — 创建画布
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, content, ownerId, teamId, status, metadata } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Canvas name is required' });
  }

  const service = getCanvasService();
  const canvas = await service.createCanvas({
    name: name.trim(),
    description,
    content,
    ownerId,
    teamId,
    status,
    metadata,
  });
  res.status(201).json({ success: true, data: canvas });
}));

// GET /api/canvas/:id — 获取画布详情
router.get('/:id', asyncHandler(async (req, res) => {
  const service = getCanvasService();
  const canvas = await service.getCanvas(req.params.id);
  if (!canvas) return res.status(404).json({ success: false, error: 'Canvas not found' });
  res.json({ success: true, data: canvas });
}));

// PUT /api/canvas/:id — 更新画布
router.put('/:id', asyncHandler(async (req, res) => {
  const service = getCanvasService();
  const canvas = await service.updateCanvas(req.params.id, req.body);
  if (!canvas) return res.status(404).json({ success: false, error: 'Canvas not found' });
  res.json({ success: true, data: canvas });
}));

// DELETE /api/canvas/:id — 删除画布
router.delete('/:id', asyncHandler(async (req, res) => {
  const service = getCanvasService();
  const ok = await service.deleteCanvas(req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: 'Canvas not found' });
  res.status(204).send();
}));

// POST /api/canvas/:id/revisions — 创建版本快照
router.post('/:id/revisions', asyncHandler(async (req, res) => {
  const { content, changedBy, changeSummary } = req.body;
  if (!content || typeof content !== 'object') {
    return res.status(400).json({ success: false, error: 'Content object is required' });
  }

  const service = getCanvasService();
  const revision = await service.createRevision(req.params.id, content, changedBy, changeSummary);
  res.status(201).json({ success: true, data: revision });
}));

// GET /api/canvas/:id/revisions — 获取版本历史
router.get('/:id/revisions', asyncHandler(async (req, res) => {
  const service = getCanvasService();
  const revisions = await service.getRevisions(req.params.id);
  res.json({ success: true, data: revisions, total: revisions.length });
}));

// POST /api/canvas/:id/restore — 恢复到指定版本
router.post('/:id/restore', asyncHandler(async (req, res) => {
  const { revisionId } = req.body;
  if (!revisionId) {
    return res.status(400).json({ success: false, error: 'revisionId is required' });
  }

  const service = getCanvasService();
  const canvas = await service.restoreRevision(req.params.id, revisionId);
  res.json({ success: true, data: canvas });
}));

export default router;
