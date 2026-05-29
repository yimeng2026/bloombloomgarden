import { Router } from 'express';

const router = Router();

interface SecurityEvent {
  id: string;
  type: 'login_attempt' | 'api_abuse' | 'privilege_escalation' | 'data_exfiltration' | 'config_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  sourceIp?: string;
  userAgent?: string;
  timestamp: string;
  resolved: boolean;
  action?: string;
}

let securityEvents: SecurityEvent[] = [
  {
    id: 'sec-001', type: 'login_attempt', severity: 'medium',
    title: '多次登录失败', description: '用户 admin 连续3次登录失败',
    sourceIp: '192.168.1.105', userAgent: 'Mozilla/5.0...',
    timestamp: '2024-05-29T08:10:00Z', resolved: true, action: '临时锁定5分钟'
  },
  {
    id: 'sec-002', type: 'api_abuse', severity: 'high',
    title: 'API调用频率超限', description: 'IP 203.0.113.45 在1分钟内发起1200次API请求',
    sourceIp: '203.0.113.45', userAgent: 'python-requests/2.31.0',
    timestamp: '2024-05-29T08:20:00Z', resolved: true, action: 'IP加入黑名单'
  },
  {
    id: 'sec-003', type: 'config_change', severity: 'low',
    title: '系统配置变更', description: '管理员修改了Kimi集群的负载均衡策略',
    sourceIp: '192.168.1.100',
    timestamp: '2024-05-29T08:30:00Z', resolved: true, action: '记录审计日志'
  },
  {
    id: 'sec-004', type: 'login_attempt', severity: 'critical',
    title: '异常登录尝试', description: '未知IP尝试使用默认凭证登录',
    sourceIp: '45.142.214.58', userAgent: 'curl/7.68.0',
    timestamp: '2024-05-29T08:25:10Z', resolved: false, action: '自动封禁IP'
  }
];

const blockedIps: string[] = ['45.142.214.58', '203.0.113.45'];

/**
 * GET /api/security/events
 * 安全事件列表
 */
router.get('/events', (req, res) => {
  let result = [...securityEvents];
  const { severity, type, resolved } = req.query;
  if (severity) result = result.filter(e => e.severity === severity);
  if (type) result = result.filter(e => e.type === type);
  if (resolved !== undefined) result = result.filter(e => e.resolved === (resolved === 'true'));
  res.json({ success: true, data: result, total: result.length });
});

/**
 * GET /api/security/blocked-ips
 * 被封禁IP列表
 */
router.get('/blocked-ips', (_req, res) => {
  res.json({ success: true, data: blockedIps });
});

/**
 * POST /api/security/blocked-ips
 * 添加封禁IP
 */
router.post('/blocked-ips', (req, res) => {
  const { ip, reason } = req.body;
  if (!ip) {
    return res.status(400).json({ success: false, error: 'IP required' });
  }
  if (!blockedIps.includes(ip)) {
    blockedIps.push(ip);
    securityEvents.unshift({
      id: `sec-${Date.now()}`,
      type: 'api_abuse',
      severity: 'medium',
      title: 'IP手动封禁',
      description: reason || `管理员手动封禁IP ${ip}`,
      sourceIp: ip,
      timestamp: new Date().toISOString(),
      resolved: true,
      action: '手动封禁'
    });
  }
  res.json({ success: true, data: blockedIps });
});

/**
 * DELETE /api/security/blocked-ips/:ip
 * 解封IP
 */
router.delete('/blocked-ips/:ip', (req, res) => {
  const idx = blockedIps.indexOf(req.params.ip);
  if (idx > -1) blockedIps.splice(idx, 1);
  res.json({ success: true, message: `IP ${req.params.ip} unblocked` });
});

/**
 * GET /api/security/audit-log
 * 审计日志
 */
router.get('/audit-log', (_req, res) => {
  const logs = securityEvents.map(e => ({
    id: e.id,
    action: e.title,
    actor: e.sourceIp || 'system',
    target: 'system',
    result: e.resolved ? 'success' : 'pending',
    timestamp: e.timestamp
  }));
  res.json({ success: true, data: logs });
});

/**
 * GET /api/security/overview
 * 安全概览
 */
router.get('/overview', (_req, res) => {
  const data = {
    totalEvents: securityEvents.length,
    unresolved: securityEvents.filter(e => !e.resolved).length,
    blockedIps: blockedIps.length,
    bySeverity: {
      critical: securityEvents.filter(e => e.severity === 'critical').length,
      high: securityEvents.filter(e => e.severity === 'high').length,
      medium: securityEvents.filter(e => e.severity === 'medium').length,
      low: securityEvents.filter(e => e.severity === 'low').length,
    },
    byType: {} as Record<string, number>
  };
  securityEvents.forEach(e => {
    data.byType[e.type] = (data.byType[e.type] || 0) + 1;
  });
  res.json({ success: true, data });
});

/**
 * PATCH /api/security/events/:id/resolve
 * 标记事件为已解决
 */
router.patch('/events/:id/resolve', (req, res) => {
  const evt = securityEvents.find(e => e.id === req.params.id);
  if (!evt) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }
  evt.resolved = true;
  res.json({ success: true, data: evt });
});

export default router;
