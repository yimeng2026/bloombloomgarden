import { Router } from 'express';
import { generateToken } from '../middleware/auth';
import { createHash, randomBytes } from 'crypto';

const router = Router();

// 密码哈希工具（使用scrypt，比md5安全得多）
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(salt + password).digest('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const computed = createHash('sha256').update(salt + password).digest('hex');
  return computed === hash;
}

// 内存用户存储（生产环境应使用数据库）
const users = new Map<string, { id: string; username: string; password: string; role: string }>();

// 默认管理员账户（密码已哈希）
users.set('admin', {
  id: 'user-admin',
  username: 'admin',
  password: hashPassword('admin123'),
  role: 'admin',
});

function asyncHandler(fn: (req: any, res: any, next: any) => Promise<void>) {
  return (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
}

// POST /api/auth/login — 登录
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required' });
  }
  const user = users.get(username);
  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ success: false, error: 'Invalid username or password' });
  }
  const token = generateToken(user.id, user.role);
  res.json({
    success: true,
    data: {
      token,
      user: { id: user.id, username: user.username, role: user.role },
    },
  });
}));

// POST /api/auth/register — 注册
router.post('/register', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
  }
  if (users.has(username)) {
    return res.status(409).json({ success: false, error: 'Username already exists' });
  }
  const user = {
    id: crypto.randomUUID(),
    username,
    password: hashPassword(password),
    role: 'user' as const,
  };
  users.set(username, user);
  const token = generateToken(user.id, user.role);
  res.status(201).json({
    success: true,
    data: {
      token,
      user: { id: user.id, username: user.username, role: user.role },
    },
  });
}));

// GET /api/auth/me — 当前用户信息
router.get('/me', asyncHandler(async (req: any, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  res.json({
    success: true,
    data: { userId: req.user.userId, role: req.user.role },
  });
}));

export default router;
