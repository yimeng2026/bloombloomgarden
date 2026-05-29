import { Router } from 'express';

const router = Router();

interface SystemEvent {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  category: 'system' | 'agent' | 'api' | 'security' | 'backup' | 'integration';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  relatedId?: string;
  acknowledged: boolean;
}

let events: SystemEvent[] = [
  {
    id: 'evt-001', level: 'info', category: 'system',
    title: '系统启动完成', message: '千界花园后端服务启动成功',
    timestamp: '2024-05-29T08:00:00Z', source: 'SystemBootstrap', acknowledged: true
  },
  {
    id: 'evt-002', level: 'info', category: 'agent',
    title: 'Agent SYLVA 已激活', message: 'Agent SYLVA 已完成初始化',
    timestamp: '2024-05-29T08:01:15Z', source: 'AgentService', relatedId: 'agent-sylva', acknowledged: true
  },
  {
    id: 'evt-003', level: 'warning', category: 'api',
    title: 'Kimi Code API 响应延迟偏高', message: '最近5次请求平均响应时间 3.2s，超过阈值 2.0s',
    timestamp: '2024-05-29T08:15:30Z', source: 'KimiClusterOrchestrator', acknowledged: false
  },
  {
    id: 'evt-004', level: 'error', category: 'integration',
    title: 'Discord 连接中断', message: 'WebSocket连接异常关闭，正在自动重试...',
    timestamp: '2024-05-29T08:20:00Z', source: 'BridgeAdapter', acknowledged: false
  },
  {
    id: 'evt-005', level: 'critical', category: 'security',
    title: '异常登录尝试 detected', message: 'IP 192.168.x.x 连续5次登录失败，已自动加入临时黑名单',
    timestamp: '2024-05-29T08:25:10Z', source: 'SecurityService', acknowledged: false
  }
];

/**
 * GET /api/events
 * 获取事件列表，支持筛选
 */
router.get('/', (req, res) => {
  let result = [...events];
  const { level, category, acknowledged, search } = req.query;

  if (level) result = result.filter(e => e.level === level);
  if (category) result = result.filter(e => e.category === category);
  if (acknowledged !== undefined) result = result.filter(e => e.acknowledged === (acknowledged === 'true'));
  if (search) {
    const s = (search as string).toLowerCase();
    result = result.filter(e => e.title.toLowerCase().includes(s) || e.message.toLowerCase().includes(s));
  }

  res.json({ success: true, data: result, total: result.length });
});

/**
 * GET /api/events/stream
 * SSE 实时事件流
 */
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event: SystemEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // 发送当前所有未确认事件
  events.filter(e => !e.acknowledged).forEach(sendEvent);

  // 每5秒发送心跳
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 5000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

/**
 * PATCH /api/events/:id/acknowledge
 * 确认事件
 */
router.patch('/:id/acknowledge', (req, res) => {
  const event = events.find(e => e.id === req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }
  event.acknowledged = true;
  res.json({ success: true, data: event });
});

/**
 * PATCH /api/events/acknowledge-all
 * 批量确认所有事件
 */
router.patch('/acknowledge-all', (_req, res) => {
  events.forEach(e => e.acknowledged = true);
  res.json({ success: true, message: 'All events acknowledged' });
});

/**
 * POST /api/events
 * 创建新事件（内部使用）
 */
router.post('/', (req, res) => {
  const newEvent: SystemEvent = {
    id: `evt-${Date.now()}`,
    timestamp: new Date().toISOString(),
    acknowledged: false,
    ...req.body
  };
  events.unshift(newEvent);
  // 限制存储数量
  if (events.length > 1000) events = events.slice(0, 1000);
  res.status(201).json({ success: true, data: newEvent });
});

/**
 * DELETE /api/events/:id
 * 删除事件
 */
router.delete('/:id', (req, res) => {
  const idx = events.findIndex(e => e.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }
  events.splice(idx, 1);
  res.json({ success: true, message: 'Event deleted' });
});

export default router;
