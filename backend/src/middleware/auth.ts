import { Request, Response, NextFunction } from 'express';
import { createHash, randomBytes } from 'crypto';

// ─── JWT 模拟（生产环境应使用 jsonwebtoken 库） ──────

interface JWTPayload {
  userId: string;
  role: string;
  iat: number;
  exp: number;
}

const SECRET = process.env.JWT_SECRET || 'thousand-realms-garden-secret-key-' + randomBytes(32).toString('hex');
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24小时

export function generateToken(userId: string, role: string = 'user'): string {
  const payload: JWTPayload = {
    userId,
    role,
    iat: Date.now(),
    exp: Date.now() + TOKEN_EXPIRY,
  };
  // 简化实现：base64(payload) + signature
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHash('sha256').update(payloadB64 + SECRET).digest('base64url');
  return `${payloadB64}.${signature}`;
}

function verifyToken(token: string): JWTPayload | null {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;
    const expectedSig = createHash('sha256').update(payloadB64 + SECRET).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload: JWTPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── 认证中间件 ────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; role: string };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ success: false, error: 'Authorization header missing' });
    return;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ success: false, error: 'Invalid authorization format' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  req.user = { userId: payload.userId, role: payload.role };
  next();
}

// ─── 可选认证（不强制，但解析用户信息） ───────────────

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const [scheme, token] = authHeader.split(' ');
    if (scheme === 'Bearer' && token) {
      const payload = verifyToken(token);
      if (payload) {
        req.user = { userId: payload.userId, role: payload.role };
      }
    }
  }
  next();
}

// ─── 管理员权限检查 ───────────────────────────────────

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin permission required' });
    return;
  }
  next();
}

// ─── API Key 认证（用于外部集成和机器人） ─────────────

const API_KEYS = new Set<string>(process.env.API_KEYS?.split(',') || []);

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    res.status(401).json({ success: false, error: 'API key missing' });
    return;
  }
  if (!API_KEYS.has(apiKey)) {
    res.status(401).json({ success: false, error: 'Invalid API key' });
    return;
  }
  next();
}

// ─── 速率限制（内存实现，生产环境用 Redis） ───────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}

export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = options.keyGenerator?.(req) || req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - options.windowMs;

    let entry = rateLimitMap.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + options.windowMs };
    }

    if (entry.count >= options.maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
      return;
    }

    entry.count++;
    rateLimitMap.set(key, entry);
    res.setHeader('X-RateLimit-Limit', options.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (options.maxRequests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', entry.resetAt.toString());
    next();
  };
}

// 清理过期的限流记录
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(key);
    }
  }
}, 60 * 1000); // 每分钟清理一次
