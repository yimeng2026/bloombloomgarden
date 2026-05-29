/**
 * APIKeyService.ts — API 密钥管理服务
 * 支持：增删改查、加密存储、自动连通性测试
 */

import crypto from 'crypto';
import { getProviderConfig } from './LLMProviderRegistry';

const ALGORITHM = 'aes-256-gcm';
const MASTER_KEY = process.env.API_KEY_MASTER_SECRET || crypto.randomBytes(32).toString('hex');

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

// 内存存储（生产环境应接入数据库）
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

export class APIKeyService {
  /**
   * 列出所有已保存的密钥（脱敏）
   */
  list(): Array<Omit<StoredKey, 'apiKey'> & { maskedKey: string }> {
    return Array.from(KEY_STORE.values()).map(k => {
      const { apiKey, ...rest } = k;
      const decrypted = decrypt(apiKey);
      const maskedKey = decrypted.length > 8
        ? decrypted.slice(0, 4) + '****' + decrypted.slice(-4)
        : '****';
      return { ...rest, maskedKey };
    });
  }

  /**
   * 根据 provider 获取有效密钥
   */
  getByProvider(provider: string): string | null {
    const key = Array.from(KEY_STORE.values()).find(
      k => k.provider === provider && k.isActive && k.isValid === true
    );
    if (!key) return null;
    try {
      return decrypt(key.apiKey);
    } catch {
      return null;
    }
  }

  /**
   * 保存密钥（新增或更新）
   */
  save(data: { provider: string; apiKey: string; baseUrl?: string; isActive?: boolean }): StoredKey {
    const config = getProviderConfig(data.provider);
    if (!config) {
      throw new Error(`不支持的 Provider: ${data.provider}`);
    }

    // 检查是否已存在同 provider 的 key，存在则更新
    const existing = Array.from(KEY_STORE.values()).find(k => k.provider === data.provider);
    const id = existing?.id || `key-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const stored: StoredKey = {
      id,
      provider: data.provider,
      providerName: config.name,
      displayName: config.displayName,
      apiKey: encrypt(data.apiKey),
      baseUrl: data.baseUrl || config.baseUrl,
      isActive: data.isActive !== false,
      isValid: existing ? existing.isValid : null,
      lastTestedAt: existing ? existing.lastTestedAt : null,
      latencyMs: existing ? existing.latencyMs : null,
      errorMessage: existing ? existing.errorMessage : null,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    KEY_STORE.set(id, stored);
    return stored;
  }

  /**
   * 删除密钥
   */
  delete(id: string): boolean {
    return KEY_STORE.delete(id);
  }

  /**
   * 切换激活状态
   */
  toggleActive(id: string): StoredKey | null {
    const key = KEY_STORE.get(id);
    if (!key) return null;
    key.isActive = !key.isActive;
    key.updatedAt = new Date().toISOString();
    return key;
  }

  /**
   * 自动测试密钥连通性
   */
  async test(id: string): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const key = KEY_STORE.get(id);
    if (!key) throw new Error('密钥不存在');

    const config = getProviderConfig(key.provider);
    if (!config) throw new Error('Provider 配置不存在');

    let decryptedKey: string;
    try {
      decryptedKey = decrypt(key.apiKey);
    } catch {
      throw new Error('密钥解密失败');
    }

    const start = Date.now();

    try {
      // 构建测试请求
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...config.optimization.customHeaders,
      };

      if (config.authType === 'bearer') {
        headers[config.authHeaderName] = `Bearer ${decryptedKey}`;
      } else if (config.authType === 'api_key') {
        headers[config.authHeaderName] = decryptedKey;
      }

      // 使用标准的 /chat/completions 端点测试（OpenAI兼容格式）
      const testEndpoint = key.baseUrl || config.baseUrl;
      let url = `${testEndpoint}/chat/completions`;
      let body: any;

      if (config.optimization.requestFormatter) {
        // 使用 provider 自定义格式
        body = config.optimization.requestFormatter(
          [{ role: 'user', content: '你好，这是一个连通性测试' }],
          { model: config.defaultModel, stream: false, max_tokens: 50 }
        );
      } else {
        body = {
          model: config.defaultModel,
          messages: [{ role: 'user', content: '你好，这是一个连通性测试' }],
          max_tokens: 50,
        };
      }

      // Gemini 特殊处理
      if (key.provider === 'gemini') {
        url = `${testEndpoint}/models/${config.defaultModel}:generateContent?key=${decryptedKey}`;
        delete headers.Authorization;
        body = {
          contents: [{ role: 'user', parts: [{ text: '你好' }] }],
        };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => '');
        key.isValid = false;
        key.errorMessage = `HTTP ${resp.status}: ${errorText.slice(0, 200)}`;
        key.lastTestedAt = new Date().toISOString();
        key.latencyMs = latencyMs;
        return { success: false, latencyMs, message: key.errorMessage };
      }

      const data = await resp.json() as any;
      key.isValid = true;
      key.errorMessage = null;
      key.lastTestedAt = new Date().toISOString();
      key.latencyMs = latencyMs;

      // 尝试提取响应内容用于展示
      let preview = '';
      if (data.choices?.[0]?.message?.content) {
        preview = data.choices[0].message.content.slice(0, 50);
      } else if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        preview = data.candidates[0].content.parts[0].text.slice(0, 50);
      }

      return {
        success: true,
        latencyMs,
        message: `连通性正常${preview ? ` — 响应: ${preview}...` : ''}`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      key.isValid = false;
      key.errorMessage = err.message || String(err);
      key.lastTestedAt = new Date().toISOString();
      key.latencyMs = latencyMs;
      return { success: false, latencyMs, message: key.errorMessage };
    }
  }

  /**
   * 批量测试所有密钥
   */
  async testAll(): Promise<Array<{ provider: string; success: boolean; latencyMs: number; message: string }>> {
    const keys = Array.from(KEY_STORE.values()).filter(k => k.isActive);
    return Promise.all(keys.map(async k => {
      const result = await this.test(k.id);
      return { provider: k.provider, ...result };
    }));
  }

  /**
   * 获取解密后的密钥（供服务层使用）
   */
  getDecrypted(id: string): { provider: string; apiKey: string; baseUrl?: string } | null {
    const key = KEY_STORE.get(id);
    if (!key || !key.isActive) return null;
    try {
      return {
        provider: key.provider,
        apiKey: decrypt(key.apiKey),
        baseUrl: key.baseUrl,
      };
    } catch {
      return null;
    }
  }
}

export const apiKeyService = new APIKeyService();
