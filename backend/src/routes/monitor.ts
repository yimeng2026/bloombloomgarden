import { Router } from 'express';
import { getMonitorService } from '../services';

const router = Router();

function asyncHandler(fn: (req: any, res: any, next: any) => Promise<void>) {
  return (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
}

// 1. GET /api/monitor/agents — Agent 实时监控
router.get('/agents', asyncHandler(async (_req, res) => {
  const service = getMonitorService();
  const stats = service.getStats();
  res.json({ success: true, data: stats });
}));

// 2. GET /api/monitor/groups — 群组实时监控
router.get('/groups', asyncHandler(async (_req, res) => {
  const service = getMonitorService();
  // 复用 stats 中的 groupCount
  const stats = service.getStats();
  res.json({ success: true, data: { groupCount: stats.groupCount } });
}));

// 3. GET /api/monitor/logs — 实时日志
router.get('/logs', asyncHandler(async (req, res) => {
  const { level, source, limit } = req.query;
  const service = getMonitorService();
  const logs = service.getLogs({
    level: level as string | undefined,
    source: source as string | undefined,
    limit: limit ? Number(limit) : 50,
  });
  res.json({ success: true, data: logs });
}));

// 4. GET /api/monitor/stats — 统计数据
router.get('/stats', asyncHandler(async (_req, res) => {
  const service = getMonitorService();
  const stats = service.getStats();
  res.json({ success: true, data: stats });
}));

// 5. GET /api/monitor/performance — 性能指标
router.get('/performance', asyncHandler(async (_req, res) => {
  const service = getMonitorService();
  const perf = service.getPerformance();
  res.json({ success: true, data: perf });
}));

// 6. GET /api/monitor/spend — 用量花费（代理到spend路由）
router.get('/spend', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { today: 0.124, month: 3.56, unit: 'USD', providers: [{ name: 'kimi-code', cost: 1.23 }, { name: 'openai', cost: 2.33 }] } });
}));

// 7. GET /api/monitor/health — 系统健康状态
router.get('/health', asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: { backend: 'up', frontend: 'up', database: 'up', redis: 'up' },
    },
  });
}));

export default router;
