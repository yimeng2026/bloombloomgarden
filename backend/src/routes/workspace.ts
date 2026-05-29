import { Router } from 'express';
import { getWorkspaceService } from '../services';

const router = Router();

function asyncHandler(fn: (req: any, res: any, next: any) => Promise<void>) {
  return (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
}

// 1. POST /api/workspace/tasks — 创建任务
router.post('/tasks', asyncHandler(async (req, res) => {
  const { groupId, taskId } = req.body;
  const service = getWorkspaceService();
  const ws = await service.createTask(groupId, taskId || crypto.randomUUID());
  res.status(201).json({ success: true, data: ws });
}));

// 2. GET /api/workspace/tasks — 列出任务
router.get('/tasks', asyncHandler(async (req, res) => {
  const { groupId } = req.query;
  const service = getWorkspaceService();
  const tasks = await service.listTasks(groupId as string | undefined);
  res.json({ success: true, data: tasks });
}));

// 3. GET /api/workspace/tasks/:id — 任务详情
router.get('/tasks/:id', asyncHandler(async (req, res) => {
  const service = getWorkspaceService();
  const ws = await service.getTask(req.params.id);
  if (!ws) return res.status(404).json({ success: false, error: 'Task not found' });
  res.json({ success: true, data: ws });
}));

// 4. POST /api/workspace/tasks/:id/import — 导入文件
router.post('/tasks/:id/import', asyncHandler(async (req, res) => {
  const { sourceTaskId, fileFilter } = req.body;
  const service = getWorkspaceService();
  const result = await service.importFiles(req.params.id, sourceTaskId, fileFilter);
  if (!result) return res.status(404).json({ success: false, error: 'Task not found' });
  res.json({ success: true, data: result });
}));

// 5. GET /api/workspace/tasks/:id/download — 下载 zip
router.get('/tasks/:id/download', asyncHandler(async (req, res) => {
  const service = getWorkspaceService();
  const files = await service.buildDownload(req.params.id);
  if (!files || files.size === 0) return res.status(404).json({ success: false, error: 'No files to download' });
  // 简化：返回文件列表，实际应打包为 zip
  const fileList = Array.from(files.entries()).map(([path, content]) => ({ path, size: content.length }));
  res.json({ success: true, data: { files: fileList, totalSize: fileList.reduce((s, f) => s + f.size, 0) } });
}));

// 6-8. GET/PUT/DELETE /api/workspace/tasks/:id/files/* — 文件操作
router.get('/tasks/:id/files/*', asyncHandler(async (req, res) => {
  const service = getWorkspaceService();
  const filePath = req.params[0] || '';
  const file = await service.readFile(req.params.id, filePath);
  if (!file) return res.status(404).json({ success: false, error: 'File not found' });
  res.setHeader('Content-Type', file.mimeType);
  res.send(file.content);
}));

router.put('/tasks/:id/files/*', asyncHandler(async (req, res) => {
  const service = getWorkspaceService();
  const filePath = req.params[0] || '';
  const content = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const file = await service.writeFile(req.params.id, filePath, content, req.headers['content-type'] || 'text/plain');
  res.json({ success: true, data: file });
}));

router.delete('/tasks/:id/files/*', asyncHandler(async (req, res) => {
  const service = getWorkspaceService();
  const filePath = req.params[0] || '';
  const ok = await service.deleteFile(req.params.id, filePath);
  if (!ok) return res.status(404).json({ success: false, error: 'File not found' });
  res.json({ success: true, data: { deleted: true } });
}));

// 9. POST /api/workspace/merge — 合并工作空间
router.post('/merge', asyncHandler(async (req, res) => {
  const { groupAId, groupBId, newGroupId } = req.body;
  const service = getWorkspaceService();
  const merged = await service.mergeWorkspaces(groupAId, groupBId, newGroupId);
  res.json({ success: true, data: merged });
}));

export default router;
