/**
 * APIKeyService.ts — API 密钥管理服务
 * 支持：增删改查、加密存储、自动连通性测试
 * 【修复】统一 providers.json 和 LLMProviderRegistry 数据源
 * 【新增】从数据库加载已保存的 Key，持久化存储
 */

import crypto from 'crypto';
import { prisma } from './PrismaService';
import { getProviderConfig } from './LLMProviderRegistry';
import providersData from '../config/providers.json';

const ALGORITHM = 'aes-256-gcm';
const MASTER_KEY = process.env.API_KEY_MASTER_SECRET || crypto.randomBytes(32).toString('hex');

const allProviders: any[] = (providersData as any).providers || [];

export interface StoredKey {
  id: string;
  provider: string;
  providerName: string;
  displayName: string;
  apiKey: string;          // 加密存储
  baseUrl?: string;        // 可选自定义 endpoint
  isActive: boolean;
  isValid: boolean | null; // 上次验证结果
  lastTestedAt: string | null;
  latencyMs: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// 内存缓存
const KEY_STORE = new Map<string, StoredKey>();

function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(MASTER_KEY.slice(0, 64), 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(MASTER_KEY.slice(0, 64), 'hex'), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * 统一解析 Provider 配置
 */
function resolveProviderConfig(providerId: string): {
  id: string; name: string; displayName: string; baseUrl: string;
  defaultModel: string; authType: 'bearer' | 'api_key' | 'custom';
  authHeaderName: string; category: string; optimization?: any;
  supportsVision?: boolean; supportsFunctions?: boolean; requiresUserAgent?: boolean;
} | null {
  const registry = getProviderConfig(providerId);
  if (registry) {
    return {
      id: registry.id, name: registry.name, displayName: registry.displayName,
      baseUrl: registry.baseUrl, defaultModel: registry.defaultModel,
      authType: registry.authType, authHeaderName: registry.authHeaderName,
      category: registry.category, optimization: registry.optimization,
      supportsVision: registry.supportsVision, supportsFunctions: registry.supportsFunctions,
      requiresUserAgent: registry.requiresUserAgent,
    };
  }
  const jsonProvider = allProviders.find((p: any) => p.id === providerId);
  if (jsonProvider) {
    return {
      id: jsonProvider.id, name: jsonProvider.id,
      displayName: jsonProvider.name || jsonProvider.id,
      baseUrl: jsonProvider.baseUrl || '', defaultModel: jsonProvider.defaultModel || 'default',
      authType: 'bearer', authHeaderName: 'Authorization',
      category: jsonProvider.category || 'cloud', optimization: undefined,
      supportsVision: true, supportsFunctions: true, requiresUserAgent: false,
    };
  }
  return null;
}

export class APIKeyService {
  constructor() {
    this.loadFromDatabase().catch(err => {
      console.error('[APIKeyService] Failed to load from database:', err.message);
    });
  }

  private async loadFromDatabase(): Promise<void> {
    const dbKeys = await prisma.apiKey.findMany({
      where: { status: { in: ['active', 'revoked'] } },
    });

    for (const dbKey of dbKeys) {
      let extra: any = {};
      try { extra = JSON.parse(dbKey.permissions || '{}'); } catch { /* ignore */ }

      const stored: StoredKey = {
        id: dbKey.id, provider: dbKey.providerId,
        providerName: extra.providerName || dbKey.providerId,
        displayName: dbKey.name || dbKey.providerId,
        apiKey: dbKey.keyHash, baseUrl: extra.baseUrl || undefined,
        isActive: dbKey.status === 'active',
        isValid: extra.isValid ?? null, lastTestedAt: extra.lastTestedAt || null,
        latencyMs: extra.latencyMs ?? null, errorMessage: extra.errorMessage || null,
        createdAt: dbKey.createdAt.toISOString(), updatedAt: dbKey.updatedAt.toISOString(),
      };
      KEY_STORE.set(stored.id, stored);
    }

    console.log(`[APIKeyService] Loaded ${dbKeys.length} keys from database`);
  }

  list(): Array<Omit<StoredKey, 'apiKey'> & { maskedKey: string }> {
    return Array.from(KEY_STORE.values()).map(k => {
      const { apiKey, ...rest } = k;
      let decrypted = '';
      try { decrypted = decrypt(apiKey); } catch { decrypted = '****'; }
      const maskedKey = decrypted.length > 8 ? decrypted.slice(0, 4) + '****' + decrypted.slice(-4) : '****';
      return { ...rest, maskedKey };
    });
  }

  getByProvider(provider: string): string | null {
    const key = Array.from(KEY_STORE.values()).find(
      k => k.provider === provider && k.isActive && k.isValid === true
    );
    if (!key) return null;
    try { return decrypt(key.apiKey); } catch { return null; }
  }

  async save(data: { provider: string; apiKey: string; baseUrl?: string; isActive?: boolean }): Promise<StoredKey> {
    const config = resolveProviderConfig(data.provider);
    if (!config) throw new Error(`不支持的 Provider: ${data.provider}`);

    const existing = Array.from(KEY_STORE.values()).find(k => k.provider === data.provider);
    const id = existing?.id || `key-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const encryptedKey = encrypt(data.apiKey);
    const stored: StoredKey = {
      id, provider: data.provider, providerName: config.name, displayName: config.displayName,
      apiKey: encryptedKey, baseUrl: data.baseUrl || config.baseUrl,
      isActive: data.isActive !== false, isValid: existing ? existing.isValid : null,
      lastTestedAt: existing ? existing.lastTestedAt : null,
      latencyMs: existing ? existing.latencyMs : null,
      errorMessage: existing ? existing.errorMessage : null,
      createdAt: existing ? existing.createdAt : now, updatedAt: now,
    };

    KEY_STORE.set(id, stored);

    try {
      await prisma.apiKey.upsert({
        where: { id },
        update: {
          name: stored.displayName, keyHash: encryptedKey, providerId: data.provider,
          status: stored.isActive ? 'active' : 'revoked',
          permissions: JSON.stringify({
            providerName: config.name, baseUrl: stored.baseUrl,
            isValid: stored.isValid, lastTestedAt: stored.lastTestedAt,
            latencyMs: stored.latencyMs, errorMessage: stored.errorMessage,
          }),
        },
        create: {
          id, name: stored.displayName, keyHash: encryptedKey, providerId: data.provider,
          status: stored.isActive ? 'active' : 'revoked',
          permissions: JSON.stringify({ providerName: config.name, baseUrl: stored.baseUrl }),
        },
      });
    } catch (err: any) {
      console.error(`[APIKeyService] Failed to save to database: ${err.message}`);
    }

    return stored;
  }

  async delete(id: string): Promise<boolean> {
    const existed = KEY_STORE.delete(id);
    if (!existed) return false;
    try { await prisma.apiKey.delete({ where: { id } }).catch(() => {}); } catch {}
    return true;
  }

  async toggleActive(id: string): Promise<StoredKey | null> {
    const key = KEY_STORE.get(id);
    if (!key) return null;
    key.isActive = !key.isActive;
    key.updatedAt = new Date().toISOString();

    try {
      await prisma.apiKey.update({
        where: { id },
        data: {
          status: key.isActive ? 'active' : 'revoked',
          permissions: JSON.stringify({
            providerName: key.providerName, baseUrl: key.baseUrl,
            isValid: key.isValid, lastTestedAt: key.lastTestedAt,
            latencyMs: key.latencyMs, errorMessage: key.errorMessage,
          }),
        },
      });
    } catch (err: any) {
      console.error(`[APIKeyService] Failed to update status: ${err.message}`);
    }
    return key;
  }

  async test(id: string): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const key = KEY_STORE.get(id);
    if (!key) throw new Error('密钥不存在');

    const config = resolveProviderConfig(key.provider);
    if (!config) throw new Error('Provider 配置不存在');

    let decryptedKey: string;
    try { decryptedKey = decrypt(key.apiKey); } catch { throw new Error('密钥解密失败'); }

    const start = Date.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(config.optimization?.customHeaders || {}),
      };

      if (config.authType === 'bearer') {
        headers[config.authHeaderName] = `Bearer ${decryptedKey}`;
      } else if (config.authType === 'api_key') {
        headers[config.authHeaderName] = decryptedKey;
      }

      const testEndpoint = key.baseUrl || config.baseUrl;
      let url = `${testEndpoint}/chat/completions`;
      let body: any = {
        model: config.defaultModel,
        messages: [{ role: 'user', content: '你好，这是一个连通性测试' }],
        max_tokens: 50,
      };

      if (key.provider === 'gemini') {
        url = `${testEndpoint}/models/${config.defaultModel}:generateContent?key=${decryptedKey}`;
        delete headers.Authorization;
        body = { contents: [{ role: 'user', parts: [{ text: '你好' }] }] };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const resp = await fetch(url, {
        method: 'POST', headers, body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => '');
        key.isValid = false;
        key.errorMessage = `HTTP ${resp.status}: ${errorText.slice(0, 200)}`;
        key.lastTestedAt = new Date().toISOString(); key.latencyMs = latencyMs;
        await this.persistTestResult(id, key);
        return { success: false, latencyMs, message: key.errorMessage };
      }

      const data = await resp.json() as any;
      key.isValid = true; key.errorMessage = null;
      key.lastTestedAt = new Date().toISOString(); key.latencyMs = latencyMs;
      await this.persistTestResult(id, key);

      let preview = '';
      if (data.choices?.[0]?.message?.content) preview = data.choices[0].message.content.slice(0, 50);
      else if (data.candidates?.[0]?.content?.parts?.[0]?.text) preview = data.candidates[0].content.parts[0].text.slice(0, 50);

      return { success: true, latencyMs, message: `连通性正常${preview ? ` — 响应: ${preview}...` : ''}` };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      key.isValid = false; key.errorMessage = err.message || String(err);
      key.lastTestedAt = new Date().toISOString(); key.latencyMs = latencyMs;
      await this.persistTestResult(id, key);
      return { success: false, latencyMs, message: key.errorMessage };
    }
  }

  private async persistTestResult(id: string, key: StoredKey): Promise<void> {
    try {
      await prisma.apiKey.update({
        where: { id },
        data: {
          permissions: JSON.stringify({
            providerName: key.providerName, baseUrl: key.baseUrl,
            isValid: key.isValid, lastTestedAt: key.lastTestedAt,
            latencyMs: key.latencyMs, errorMessage: key.errorMessage,
          }),
        },
      });
    } catch (err: any) {
      console.error(`[APIKeyService] Failed to persist test result: ${err.message}`);
    }
  }

  async testAll(): Promise<Array<{ provider: string; success: boolean; latencyMs: number; message: string }>> {
    const keys = Array.from(KEY_STORE.values()).filter(k => k.isActive);
    return Promise.all(keys.map(async k => {
      const result = await this.test(k.id);
      return { provider: k.provider, ...result };
    }));
  }

  getDecryptedByProvider(provider: string): { provider: string; apiKey: string; baseUrl?: string } | null {
    const key = Array.from(KEY_STORE.values()).find(k => k.provider === provider && k.isActive);
    if (!key) return null;
    try { return { provider: key.provider, apiKey: decrypt(key.apiKey), baseUrl: key.baseUrl }; } catch { return null; }
  }
}

export const apiKeyService = new APIKeyService();
