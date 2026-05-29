import { Router } from 'express';

const router = Router();

interface ExternalPlatform {
  id: string;
  name: string;
  category: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  endpoint?: string;
  lastSync?: string;
  features: string[];
  config: Record<string, any>;
}

const platforms: ExternalPlatform[] = [
  {
    id: 'discord', name: 'Discord', category: 'comm', status: 'connected',
    endpoint: 'wss://gateway.discord.gg', lastSync: new Date().toISOString(),
    features: ['消息收发', '频道管理', 'Webhook推送'],
    config: { botToken: '***', guildId: '' }
  },
  {
    id: 'slack', name: 'Slack', category: 'comm', status: 'disconnected',
    features: ['消息同步', '文件共享', 'Bot命令'],
    config: { token: '***', channel: '#general' }
  },
  {
    id: 'github', name: 'GitHub', category: 'dev', status: 'connected',
    endpoint: 'https://api.github.com', lastSync: new Date().toISOString(),
    features: ['Issue跟踪', 'PR审查', 'Webhook事件', '代码搜索'],
    config: { token: '***', org: 'thousand-realms' }
  },
  {
    id: 'gitlab', name: 'GitLab', category: 'dev', status: 'pending',
    features: ['CI/CD触发', 'MR管理', 'Wiki同步'],
    config: { url: '', token: '***' }
  },
  {
    id: 'notion', name: 'Notion', category: 'cloud', status: 'disconnected',
    features: ['页面同步', '数据库查询', '模板创建'],
    config: { token: '***', databaseId: '' }
  },
  {
    id: 'telegram', name: 'Telegram', category: 'comm', status: 'error',
    endpoint: 'https://api.telegram.org',
    features: ['Bot消息', '群组管理', '文件传输'],
    config: { botToken: '***' }
  },
  {
    id: 'jira', name: 'Jira', category: 'dev', status: 'disconnected',
    features: ['Issue创建', '状态同步', 'Sprint管理'],
    config: { url: '', email: '', token: '***' }
  },
  {
    id: 's3', name: 'AWS S3', category: 'storage', status: 'connected',
    endpoint: 's3.amazonaws.com', lastSync: new Date().toISOString(),
    features: ['文件上传', '桶管理', 'CDN分发'],
    config: { accessKey: '***', region: 'ap-northeast-1' }
  },
  {
    id: 'feishu', name: '飞书', category: 'comm', status: 'connected',
    endpoint: 'https://open.feishu.cn', lastSync: new Date().toISOString(),
    features: ['消息推送', '审批同步', '日历集成'],
    config: { appId: '***', appSecret: '***' }
  },
  {
    id: 'wechat_work', name: '企业微信', category: 'comm', status: 'disconnected',
    features: ['消息推送', '群机器人', '应用通知'],
    config: { corpId: '***', agentId: '' }
  }
];

/**
 * GET /api/external/platforms
 * 列出所有外部平台
 */
router.get('/platforms', (_req, res) => {
  // 脱敏处理：移除config中的敏感信息
  const sanitized = platforms.map(p => ({
    ...p,
    config: Object.fromEntries(
      Object.entries(p.config).map(([k, v]) => [k, typeof v === 'string' && v.length > 3 ? '***' : v])
    )
  }));
  res.json({ success: true, data: sanitized });
});

/**
 * GET /api/external/platforms/:id
 * 获取单个平台详情
 */
router.get('/platforms/:id', (req, res) => {
  const p = platforms.find(x => x.id === req.params.id);
  if (!p) {
    return res.status(404).json({ success: false, error: 'Platform not found' });
  }
  res.json({ success: true, data: p });
});

/**
 * POST /api/external/platforms/:id/config
 * 更新平台配置
 */
router.post('/platforms/:id/config', (req, res) => {
  const p = platforms.find(x => x.id === req.params.id);
  if (!p) {
    return res.status(404).json({ success: false, error: 'Platform not found' });
  }
  p.config = { ...p.config, ...req.body };
  p.status = 'pending';
  res.json({ success: true, data: p });
});

/**
 * POST /api/external/platforms/:id/test
 * 测试连接
 */
router.post('/platforms/:id/test', async (req, res) => {
  const p = platforms.find(x => x.id === req.params.id);
  if (!p) {
    return res.status(404).json({ success: false, error: 'Platform not found' });
  }
  // 模拟测试
  await new Promise(r => setTimeout(r, 1000));
  const success = Math.random() > 0.3;
  p.status = success ? 'connected' : 'error';
  if (success) p.lastSync = new Date().toISOString();
  res.json({
    success: true,
    data: { connected: success, latency: Math.floor(Math.random() * 500) + 50 }
  });
});

/**
 * POST /api/external/platforms/:id/toggle
 * 切换连接状态
 */
router.post('/platforms/:id/toggle', (req, res) => {
  const p = platforms.find(x => x.id === req.params.id);
  if (!p) {
    return res.status(404).json({ success: false, error: 'Platform not found' });
  }
  p.status = p.status === 'connected' ? 'disconnected' : 'connected';
  if (p.status === 'connected') p.lastSync = new Date().toISOString();
  res.json({ success: true, data: p });
});

/**
 * DELETE /api/external/platforms/:id
 * 删除平台配置
 */
router.delete('/platforms/:id', (req, res) => {
  const idx = platforms.findIndex(x => x.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Platform not found' });
  }
  platforms.splice(idx, 1);
  res.json({ success: true, message: 'Platform removed' });
});

export default router;
