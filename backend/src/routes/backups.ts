import { Router } from 'express';

const router = Router();

interface BackupJob {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'running' | 'completed' | 'failed' | 'scheduled';
  size: string;
  createdAt: string;
  completedAt?: string;
  schedule?: string;
  target: string;
}

let backups: BackupJob[] = [
  {
    id: '1',
    name: '完整系统备份 #2024-05-28',
    type: 'full',
    status: 'completed',
    size: '2.4 GB',
    createdAt: '2024-05-28T02:00:00Z',
    completedAt: '2024-05-28T02:35:00Z',
    target: 'local:///backups/full'
  },
  {
    id: '2',
    name: '知识库增量备份',
    type: 'incremental',
    status: 'running',
    size: '156 MB',
    createdAt: '2024-05-29T08:00:00Z',
    target: 'local:///backups/incremental'
  },
  {
    id: '3',
    name: 'Agent状态每日备份',
    type: 'differential',
    status: 'scheduled',
    size: '-',
    createdAt: '2024-05-29T06:00:00Z',
    schedule: '0 6 * * *',
    target: 'local:///backups/agents'
  }
];

/**
 * GET /api/backups
 * 列出所有备份
 */
router.get('/', (_req, res) => {
  res.json({ success: true, data: backups });
});

/**
 * POST /api/backups
 * 创建新备份任务
 */
router.post('/', (req, res) => {
  const { name, type, target } = req.body;
  const newBackup: BackupJob = {
    id: Date.now().toString(),
    name: name || `${type} backup #${new Date().toISOString()}`,
    type: type || 'full',
    status: 'running',
    size: '计算中...',
    createdAt: new Date().toISOString(),
    target: target || 'local:///backups/manual'
  };
  backups.unshift(newBackup);

  // 模拟异步完成
  setTimeout(() => {
    const b = backups.find(x => x.id === newBackup.id);
    if (b) {
      b.status = 'completed';
      b.size = type === 'full' ? '2.5 GB' : '180 MB';
      b.completedAt = new Date().toISOString();
    }
  }, 5000);

  res.status(201).json({ success: true, data: newBackup });
});

/**
 * POST /api/backups/:id/restore
 * 从备份恢复
 */
router.post('/:id/restore', (req, res) => {
  const backup = backups.find(b => b.id === req.params.id);
  if (!backup) {
    return res.status(404).json({ success: false, error: 'Backup not found' });
  }
  if (backup.status !== 'completed') {
    return res.status(400).json({ success: false, error: 'Backup not completed yet' });
  }
  res.json({ success: true, message: `Restore from ${backup.name} initiated`, data: { jobId: `restore-${backup.id}` } });
});

/**
 * DELETE /api/backups/:id
 * 删除备份
 */
router.delete('/:id', (req, res) => {
  const idx = backups.findIndex(b => b.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Backup not found' });
  }
  backups.splice(idx, 1);
  res.json({ success: true, message: 'Backup deleted' });
});

/**
 * GET /api/backups/:id
 * 获取备份详情
 */
router.get('/:id', (req, res) => {
  const backup = backups.find(b => b.id === req.params.id);
  if (!backup) {
    return res.status(404).json({ success: false, error: 'Backup not found' });
  }
  res.json({ success: true, data: backup });
});

export default router;
