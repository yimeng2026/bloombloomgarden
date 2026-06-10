import { Router } from 'express';
import { getKnowledgeService } from '../services';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// 1. GET /api/knowledge-bases — 列表
router.get('/', asyncHandler(async (_req, res) => {
  const service = getKnowledgeService();
  const kbs = await service.listKBs();
  res.json({ success: true, data: kbs });
}));

// 2. POST /api/knowledge-bases — 创建
router.post('/', asyncHandler(async (req, res) => {
  const service = getKnowledgeService();
  const kb = await service.createKB(req.body);
  res.status(201).json({ success: true, data: kb });
}));

// 3. GET /api/knowledge-bases/:id — 详情
router.get('/:id', asyncHandler(async (req, res) => {
  const service = getKnowledgeService();
  const kb = await service.getKB(req.params.id);
  if (!kb) return res.status(404).json({ success: false, error: 'Knowledge base not found' });
  res.json({ success: true, data: kb });
}));

// 4. PUT /api/knowledge-bases/:id — 更新
router.put('/:id', asyncHandler(async (req, res) => {
  const service = getKnowledgeService();
  const kb = await service.updateKB(req.params.id, req.body);
  if (!kb) return res.status(404).json({ success: false, error: 'Knowledge base not found' });
  res.json({ success: true, data: kb });
}));

// 5. DELETE /api/knowledge-bases/:id — 删除
router.delete('/:id', asyncHandler(async (req, res) => {
  const service = getKnowledgeService();
  const ok = await service.deleteKB(req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: 'Knowledge base not found' });
  res.status(204).send();
}));

// 6. POST /api/knowledge-bases/:id/documents — 添加文档
router.post('/:id/documents', asyncHandler(async (req, res) => {
  const service = getKnowledgeService();
  const doc = await service.addDocument(req.params.id, req.body);
  res.status(201).json({ success: true, data: doc });
}));

// 7. DELETE /api/knowledge-bases/:id/documents/:docId — 删除文档
router.delete('/:id/documents/:docId', asyncHandler(async (req, res) => {
  const service = getKnowledgeService();
  const ok = await service.deleteDocument(req.params.id, req.params.docId);
  if (!ok) return res.status(404).json({ success: false, error: 'Document not found' });
  res.json({ success: true, data: { deleted: true } });
}));

// 8. POST /api/knowledge-bases/:id/search — 搜索
router.post('/:id/search', asyncHandler(async (req, res) => {
  const { query } = req.body;
  const service = getKnowledgeService();
  const results = await service.search(req.params.id, query);
  res.json({ success: true, data: results });
}));

// 9. POST /api/knowledge-bases/:id/upload — 上传文档到知识库
router.post('/:id/upload', asyncHandler(async (req, res) => {
  const { filename, contentType = 'text/markdown' } = req.body;
  const service = getKnowledgeService();
  const doc = await service.addDocument(req.params.id, {
    title: filename || '未命名文档',
    content: '',
    contentType,
    source: 'upload',
  });
  res.json({ success: true, data: { uploaded: true, documentId: doc.id, knowledgeBaseId: req.params.id } });
}));

export default router;
