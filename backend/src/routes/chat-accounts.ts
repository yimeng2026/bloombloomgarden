import { Router } from 'express';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';
import prisma from '../config/prisma';

const router = Router();

// ─── 常量定义 ───────────────────────────────────────────

const VALID_CHANNEL_TYPES = [
  'wechat', 'discord', 'telegram', 'slack',
  'whatsapp', 'line', 'teams', 'matrix', 'irc',
];

const VALID_STATUSES = [
  'pending', 'configuring', 'connected', 'disconnected', 'error',
];

// ─── 辅助函数：遮罩 credentials ─────────────────────────

function maskCredentials(credentials: string): string {
  try {
    const creds = JSON.parse(credentials || '{}');
    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(creds)) {
      const str = String(value || '');
      if (str.length <= 8) {
        masked[key] = '***';
      } else {
        masked[key] = `${str.slice(0, 3)}...${str.slice(-4)}`;
      }
    }
    return JSON.stringify(masked);
  } catch {
    return '{}';
  }
}

function maskChatAccount(account: any) {
  return {
    ...account,
    credentials: maskCredentials(account.credentials),
  };
}

// ─── 辅助函数：验证 channelType ─────────────────────────

function validateChannelType(channelType: string): boolean {
  return VALID_CHANNEL_TYPES.includes(channelType);
}

// ─── 辅助函数：验证 token 格式（模拟）───────────────────

function validateTokenFormat(channelType: string, creds: Record<string, any>): { valid: boolean; error?: string } {
  switch (channelType) {
    case 'discord': {
      const token = creds.token || '';
      if (!token) return { valid: false, error: 'Discord token is required' };
      if (!token.startsWith('Bot ') && token.length < 30) {
        return { valid: false, error: 'Discord token format invalid (expected "Bot xxx" or long token)' };
      }
      return { valid: true };
    }
    case 'telegram': {
      const token = creds.token || '';
      if (!token) return { valid: false, error: 'Telegram bot token is required' };
      const parts = token.split(':');
      if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || parts[1].length < 10) {
        return { valid: false, error: 'Telegram token format invalid (expected "123456:ABC-DEF...")' };
      }
      return { valid: true };
    }
    case 'slack': {
      const token = creds.token || '';
      if (!token) return { valid: false, error: 'Slack token is required' };
      if (!token.startsWith('xoxb-') && !token.startsWith('xoxp-') && !token.startsWith('xapp-')) {
        return { valid: false, error: 'Slack token format invalid (expected xoxb- / xoxp- / xapp- prefix)' };
      }
      return { valid: true };
    }
    case 'wechat': {
      const appId = creds.appId || '';
      const appSecret = creds.appSecret || '';
      if (!appId || !appSecret) {
        return { valid: false, error: 'WeChat appId and appSecret are required' };
      }
      return { valid: true };
    }
    case 'whatsapp': {
      const token = creds.token || '';
      if (!token) return { valid: false, error: 'WhatsApp token is required' };
      return { valid: true };
    }
    case 'line': {
      const token = creds.token || '';
      if (!token) return { valid: false, error: 'LINE channel token is required' };
      return { valid: true };
    }
    case 'teams': {
      const token = creds.token || '';
      if (!token) return { valid: false, error: 'Teams token is required' };
      return { valid: true };
    }
    case 'matrix': {
      const token = creds.token || '';
      const userId = creds.userId || '';
      if (!token || !userId) return { valid: false, error: 'Matrix access token and userId are required' };
      return { valid: true };
    }
    case 'irc': {
      const server = creds.server || '';
      const nickname = creds.nickname || '';
      if (!server || !nickname) return { valid: false, error: 'IRC server and nickname are required' };
      return { valid: true };
    }
    default:
      return { valid: true };
  }
}

// ─── 1. GET /api/chat-accounts — 列表 ───────────────────

router.get('/', asyncHandler(async (req, res) => {
  const { platformId, channelType, status } = req.query;

  const where: any = {};
  if (platformId) where.platformId = platformId as string;
  if (channelType) where.channelType = channelType as string;
  if (status) where.status = status as string;

  const accounts = await prisma.chatAccount.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: accounts.map(maskChatAccount),
    total: accounts.length,
  });
}));

// ─── 2. GET /api/chat-accounts/:id — 详情 ───────────────

router.get('/:id', asyncHandler(async (req, res) => {
  const account = await prisma.chatAccount.findUnique({
    where: { id: req.params.id },
  });

  if (!account) {
    return res.status(404).json({ success: false, error: 'ChatAccount not found' });
  }

  res.json({ success: true, data: maskChatAccount(account) });
}));

// ─── 3. POST /api/chat-accounts — 创建 ──────────────────

router.post('/', asyncHandler(async (req, res) => {
  const {
    name, platformId, channelType,
    credentials, config, metadata,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'name is required' });
  }
  if (!platformId || !platformId.trim()) {
    return res.status(400).json({ success: false, error: 'platformId is required' });
  }
  if (!channelType || !channelType.trim()) {
    return res.status(400).json({ success: false, error: 'channelType is required' });
  }
  if (!validateChannelType(channelType)) {
    return res.status(400).json({
      success: false,
      error: `Invalid channelType. Must be one of: ${VALID_CHANNEL_TYPES.join(', ')}`,
    });
  }

  // 检查 platformId 是否存在（通过 providers.json 验证）
  const providersData = (await import('../config/providers.json')).default;
  const allProviders = (providersData as any).providers || [];
  const platformExists = allProviders.some((p: any) => p.id === platformId);
  if (!platformExists) {
    return res.status(400).json({ success: false, error: `Platform "${platformId}" not found in providers.json` });
  }

  const safeCredentials = credentials && typeof credentials === 'object'
    ? JSON.stringify(credentials)
    : '{}';
  const safeConfig = config && typeof config === 'object'
    ? JSON.stringify(config)
    : '{}';
  const safeMetadata = metadata && typeof metadata === 'object'
    ? JSON.stringify(metadata)
    : '{}';

  const account = await prisma.chatAccount.create({
    data: {
      name: name.trim(),
      platformId: platformId.trim(),
      channelType: channelType.trim(),
      credentials: safeCredentials,
      config: safeConfig,
      metadata: safeMetadata,
    },
  });

  res.status(201).json({ success: true, data: maskChatAccount(account) });
}));

// ─── 4. PUT /api/chat-accounts/:id — 更新 ───────────────

router.put('/:id', asyncHandler(async (req, res) => {
  const { name, credentials, config, metadata, status, errorMessage } = req.body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (credentials !== undefined) {
    updateData.credentials = typeof credentials === 'object'
      ? JSON.stringify(credentials)
      : String(credentials || '{}');
  }
  if (config !== undefined) {
    updateData.config = typeof config === 'object'
      ? JSON.stringify(config)
      : String(config || '{}');
  }
  if (metadata !== undefined) {
    updateData.metadata = typeof metadata === 'object'
      ? JSON.stringify(metadata)
      : String(metadata || '{}');
  }
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }
    updateData.status = status;
  }
  if (errorMessage !== undefined) updateData.errorMessage = errorMessage;

  try {
    const account = await prisma.chatAccount.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json({ success: true, data: maskChatAccount(account) });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'ChatAccount not found' });
    }
    throw err;
  }
}));

// ─── 5. DELETE /api/chat-accounts/:id — 删除 ──────────────

router.delete('/:id', asyncHandler(async (req, res) => {
  try {
    await prisma.chatAccount.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'ChatAccount not found' });
    }
    throw err;
  }
}));

// ─── 6. POST /api/chat-accounts/:id/connect — 连接 ──────

router.post('/:id/connect', asyncHandler(async (req, res) => {
  const account = await prisma.chatAccount.findUnique({
    where: { id: req.params.id },
  });

  if (!account) {
    return res.status(404).json({ success: false, error: 'ChatAccount not found' });
  }

  const creds = JSON.parse(account.credentials || '{}');
  let newStatus = account.status;
  let errorMsg: string | null = null;

  switch (account.channelType) {
    case 'wechat': {
      // WeChat: pending -> configuring (等待扫码) -> connected
      const tokenCheck = validateTokenFormat('wechat', creds);
      if (!tokenCheck.valid) {
        newStatus = 'error';
        errorMsg = tokenCheck.error;
      } else {
        newStatus = 'configuring';
      }
      break;
    }
    case 'discord': {
      const tokenCheck = validateTokenFormat('discord', creds);
      if (!tokenCheck.valid) {
        newStatus = 'error';
        errorMsg = tokenCheck.error;
      } else {
        newStatus = 'connected';
      }
      break;
    }
    case 'telegram': {
      const tokenCheck = validateTokenFormat('telegram', creds);
      if (!tokenCheck.valid) {
        newStatus = 'error';
        errorMsg = tokenCheck.error;
      } else {
        newStatus = 'connected';
      }
      break;
    }
    case 'slack': {
      const tokenCheck = validateTokenFormat('slack', creds);
      if (!tokenCheck.valid) {
        newStatus = 'error';
        errorMsg = tokenCheck.error;
      } else {
        newStatus = 'connected';
      }
      break;
    }
    case 'whatsapp':
    case 'line':
    case 'teams':
    case 'matrix':
    case 'irc': {
      const tokenCheck = validateTokenFormat(account.channelType, creds);
      if (!tokenCheck.valid) {
        newStatus = 'error';
        errorMsg = tokenCheck.error;
      } else {
        newStatus = 'connected';
      }
      break;
    }
    default:
      newStatus = 'error';
      errorMsg = `Unsupported channel type: ${account.channelType}`;
  }

  const updated = await prisma.chatAccount.update({
    where: { id: req.params.id },
    data: {
      status: newStatus,
      errorMessage: errorMsg,
      connectedAt: newStatus === 'connected' ? new Date() : account.connectedAt,
      lastMessageAt: newStatus === 'connected' ? new Date() : account.lastMessageAt,
    },
  });

  res.json({
    success: true,
    data: {
      ...maskChatAccount(updated),
      simulated: true,
      message: newStatus === 'connected'
        ? 'Connection established (simulated)'
        : newStatus === 'configuring'
          ? 'Waiting for QR code scan'
          : `Connection failed: ${errorMsg}`,
    },
  });
}));

// ─── 7. POST /api/chat-accounts/:id/disconnect — 断开 ───

router.post('/:id/disconnect', asyncHandler(async (req, res) => {
  try {
    const updated = await prisma.chatAccount.update({
      where: { id: req.params.id },
      data: {
        status: 'disconnected',
        connectedAt: null,
        errorMessage: null,
      },
    });
    res.json({ success: true, data: maskChatAccount(updated) });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'ChatAccount not found' });
    }
    throw err;
  }
}));

// ─── 8. POST /api/chat-accounts/:id/qr-code — 生成二维码 ──

router.post('/:id/qr-code', asyncHandler(async (req, res) => {
  const account = await prisma.chatAccount.findUnique({
    where: { id: req.params.id },
  });

  if (!account) {
    return res.status(404).json({ success: false, error: 'ChatAccount not found' });
  }

  if (!['wechat', 'line', 'whatsapp'].includes(account.channelType)) {
    return res.status(400).json({
      success: false,
      error: `QR code generation not supported for channel type: ${account.channelType}`,
    });
  }

  // 模拟生成二维码（Base64占位）
  const qrCodeBase64 = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==`;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟过期

  const updated = await prisma.chatAccount.update({
    where: { id: req.params.id },
    data: {
      qrCodeData: qrCodeBase64,
      qrCodeExpiresAt: expiresAt,
      status: 'configuring',
    },
  });

  res.json({
    success: true,
    data: {
      id: updated.id,
      qrCodeData: qrCodeBase64,
      qrCodeExpiresAt: expiresAt.toISOString(),
      status: 'configuring',
      simulated: true,
      message: 'QR code generated (simulated). In production, this would return a real QR code image.',
    },
  });
}));

// ─── 9. GET /api/chat-accounts/:id/qr-status — 扫码状态 ─

router.get('/:id/qr-status', asyncHandler(async (req, res) => {
  const account = await prisma.chatAccount.findUnique({
    where: { id: req.params.id },
  });

  if (!account) {
    return res.status(404).json({ success: false, error: 'ChatAccount not found' });
  }

  const isExpired = account.qrCodeExpiresAt
    ? new Date() > new Date(account.qrCodeExpiresAt)
    : true;

  // 模拟状态：如果还没过期，50% 概率已扫码
  const scanned = !isExpired && Math.random() > 0.5;

  let status: string;
  if (isExpired) {
    status = 'expired';
  } else if (scanned) {
    status = 'scanned';
  } else {
    status = 'waiting';
  }

  // 如果已扫码，自动更新账号状态为 connected
  if (status === 'scanned' && account.status !== 'connected') {
    await prisma.chatAccount.update({
      where: { id: req.params.id },
      data: {
        status: 'connected',
        connectedAt: new Date(),
        qrCodeData: null,
        qrCodeExpiresAt: null,
      },
    });
  }

  res.json({
    success: true,
    data: {
      id: account.id,
      qrStatus: status,
      isExpired,
      scanned,
      simulated: true,
      expiresAt: account.qrCodeExpiresAt?.toISOString() || null,
      accountStatus: status === 'scanned' ? 'connected' : account.status,
    },
  });
}));

// ─── 10. GET /api/chat-accounts/platforms/:platformId ───

router.get('/platforms/:platformId', asyncHandler(async (req, res) => {
  const { platformId } = req.params;

  const accounts = await prisma.chatAccount.findMany({
    where: { platformId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: accounts.map(maskChatAccount),
    total: accounts.length,
  });
}));

// ─── 11. POST /api/chat-accounts/:id/test — 测试连接 ─────

router.post('/:id/test', asyncHandler(async (req, res) => {
  const account = await prisma.chatAccount.findUnique({
    where: { id: req.params.id },
  });

  if (!account) {
    return res.status(404).json({ success: false, error: 'ChatAccount not found' });
  }

  const creds = JSON.parse(account.credentials || '{}');
  const validation = validateTokenFormat(account.channelType, creds);

  const result = {
    id: account.id,
    channelType: account.channelType,
    platformId: account.platformId,
    status: account.status,
    credentialsValid: validation.valid,
    credentialsError: validation.error || null,
    simulated: true,
    message: validation.valid
      ? `Test passed for ${account.channelType} (simulated)`
      : `Test failed: ${validation.error}`,
  };

  res.json({ success: true, data: result });
}));

export default router;
