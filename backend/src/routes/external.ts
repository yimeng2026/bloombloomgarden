/**
 * external.ts — 外部平台集成路由
 * 
 * 【修复】2026-06-10: 移除所有硬编码模拟数据，改为真实连接检测
 * 平台配置从 EXTERNAL_PLATFORMS 环境变量或外部配置文件读取
 * test 端点执行真实 HTTP 探测而非 Math.random()
 */

import { Router } from 'express';
import { asyncHandlerAny } from '../middleware/asyncHandler';

const router = Router();

// ═══════════════════════════════════════════════════════════════
// 平台配置 — 从环境变量读取，不再硬编码
// 格式: EXTERNAL_PLATFORMS=[{"id":"discord","name":"Discord","endpoint":"wss://gateway.discord.gg","features":["消息收发"],"configEnvPrefix":"DISCORD_"}]
// ═══════════════════════════════════════════════════════════════

interface ExternalPlatform {
  id: string;
  name: string;
  category: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending' | 'unknown';
  endpoint?: string;
  lastSync?: string;
  features: string[];
  config: Record<string, any>;
  configEnvPrefix?: string;
}

function loadPlatforms(): ExternalPlatform[] {
  const envConfig = process.env.EXTERNAL_PLATFORMS;
  if (envConfig) {
    try {
      const parsed = JSON.parse(envConfig);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      console.warn('[External] EXTERNAL_PLATFORMS 环境变量解析失败，使用默认空列表');
    }
  }
  // 默认返回空列表，不再硬编码任何平台
  return [];
}

let platforms: ExternalPlatform[] = loadPlatforms();

// 脱敏处理：移除config中的敏感信息
function sanitizeConfig(config: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(config).map(([k, v]) => [
      k,
      typeof v === 'string' && v.length > 3 && (k.toLowerCase().includes('token') || k.toLowerCase().includes('key') || k.toLowerCase().includes('secret') || k.toLowerCase().includes('password'))
        ? '***'
        : v,
    ])
  );
}

// ═══════════════════════════════════════════════════════════════
// 真实连接检测
// ═══════════════════════════════════════════════════════════════

async function testConnection(platform: ExternalPlatform): Promise<{ connected: boolean; latency: number; error?: string }> {
  const start = Date.now();
  
  if (!platform.endpoint) {
    return { connected: false, latency: -1, error: '未配置 endpoint' };
  }

  // WebSocket 端点
  if (platform.endpoint.startsWith('wss://') || platform.endpoint.startsWith('ws://')) {
    try {
      // Node.js 环境下使用 ws 库或简单 HTTP 探测
      const httpUrl = platform.endpoint.replace('wss://', 'https://').replace('ws://', 'http://');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(httpUrl, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeout);
      return { connected: res.ok || res.status < 500, latency: Date.now() - start };
    } catch (err: any) {
      return { connected: false, latency: Date.now() - start, error: err.message };
    }
  }

  // HTTP/HTTPS 端点
  if (platform.endpoint.startsWith('http://') || platform.endpoint.startsWith('https://')) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(platform.endpoint, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeout);
      return { connected: res.ok || res.status < 500, latency: Date.now() - start };
    } catch (err: any) {
      return { connected: false, latency: Date.now() - start, error: err.message };
    }
  }

  // S3 / 其他协议
  if (platform.endpoint.includes('amazonaws.com') || platform.id === 's3') {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`https://${platform.endpoint}`, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeout);
      return { connected: res.ok || res.status === 403, latency: Date.now() - start };
    } catch (err: any) {
      return { connected: false, latency: Date.now() - start, error: err.message };
    }
  }

  return { connected: false, latency: -1, error: '不支持的协议类型' };
}

// ═══════════════════════════════════════════════════════════════
// 路由
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/external/platforms
 * 列出所有外部平台（真实配置，非模拟）
 */
router.get('/platforms', (req, res) => {
  // 重新加载以获取最新环境变量配置
  platforms = loadPlatforms();
  
  const sanitized = platforms.map(p => ({
    ...p,
    config: sanitizeConfig(p.config),
  }));
  res.json({ success: true, data: sanitized, total: sanitized.length });
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
  res.json({ success: true, data: { ...p, config: sanitizeConfig(p.config) } });
});

/**
 * POST /api/external/platforms/:id/config
 * 更新平台配置（仅内存，不持久化到磁盘）
 */
router.post('/platforms/:id/config', (req, res) => {
  const p = platforms.find(x => x.id === req.params.id);
  if (!p) {
    return res.status(404).json({ success: false, error: 'Platform not found' });
  }
  p.config = { ...p.config, ...req.body };
  p.status = 'pending';
  res.json({ success: true, data: { ...p, config: sanitizeConfig(p.config) } });
});

/**
 * POST /api/external/platforms/:id/test
 * 测试连接 — 执行真实 HTTP/WebSocket 探测
 */
router.post('/platforms/:id/test', asyncHandlerAny(async (req, res) => {
  const p = platforms.find(x => x.id === req.params.id);
  if (!p) {
    return res.status(404).json({ success: false, error: 'Platform not found' });
  }

  const result = await testConnection(p);
  p.status = result.connected ? 'connected' : 'error';
  if (result.connected) {
    p.lastSync = new Date().toISOString();
  }

  res.json({
    success: true,
    data: {
      connected: result.connected,
      latency: result.latency,
      error: result.error,
      platform: p.id,
      status: p.status,
      testedAt: new Date().toISOString(),
    },
  });
}));

/**
 * POST /api/external/platforms/:id/toggle
 * 切换连接状态（手动控制）
 */
router.post('/platforms/:id/toggle', (req, res) => {
  const p = platforms.find(x => x.id === req.params.id);
  if (!p) {
    return res.status(404).json({ success: false, error: 'Platform not found' });
  }
  p.status = p.status === 'connected' ? 'disconnected' : 'connected';
  if (p.status === 'connected') p.lastSync = new Date().toISOString();
  res.json({ success: true, data: { ...p, config: sanitizeConfig(p.config) } });
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

/**
 * POST /api/external/platforms
 * 添加新平台配置
 */
router.post('/platforms', (req, res) => {
  const { id, name, category, endpoint, features, config } = req.body;
  if (!id || !name) {
    return res.status(400).json({ success: false, error: 'id and name are required' });
  }
  if (platforms.find(p => p.id === id)) {
    return res.status(409).json({ success: false, error: 'Platform already exists' });
  }
  const newPlatform: ExternalPlatform = {
    id,
    name,
    category: category || 'other',
    status: 'pending',
    endpoint,
    features: features || [],
    config: config || {},
    lastSync: new Date().toISOString(),
  };
  platforms.push(newPlatform);
  res.status(201).json({ success: true, data: { ...newPlatform, config: sanitizeConfig(newPlatform.config) } });
});

export default router;
