import { BaseBackendAdapter, ChatRequest, ChatResponse, ChatChunk } from '../adapters/BaseBackendAdapter';
import { OpenAICompatibleAdapter, OpenAICompatibleConfig } from '../adapters/OpenAICompatibleAdapter';
import { KimiAdapter } from '../adapters/KimiAdapter';
import { ClaudeAdapter } from '../adapters/ClaudeAdapter';
import { OllamaAdapter } from '../adapters/OllamaAdapter';
import providersConfig from '../config/providers.json';

// ═══════════════════════════════════════════════════════════════
// 通用多Key轮询读取器
// 支持 {PREFIX}_API_KEY_1 ~ {PREFIX}_API_KEY_N 和 {PREFIX}_API_KEY（单Key）
// ═══════════════════════════════════════════════════════════════
function getProviderKeys(prefix: string, maxKeys: number = 10): string[] {
  const keys: string[] = [];
  // 多Key轮询: PROVIDER_API_KEY_1 ~ PROVIDER_API_KEY_N
  for (let i = 1; i <= maxKeys; i++) {
    const key = process.env[`${prefix}_API_KEY_${i}`];
    if (key && key.length > 10) keys.push(key);
  }
  // 单Key兼容: PROVIDER_API_KEY
  const singleKey = process.env[`${prefix}_API_KEY`];
  if (singleKey && singleKey.length > 10 && !keys.includes(singleKey)) {
    keys.push(singleKey);
  }
  // 旧格式兼容: 逗号分隔
  const legacyKeys = process.env[`${prefix}_API_KEYS`];
  if (legacyKeys) {
    legacyKeys.split(',').forEach(k => {
      const trimmed = k.trim();
      if (trimmed.length > 10 && !keys.includes(trimmed)) {
        keys.push(trimmed);
      }
    });
  }
  return keys;
}

// ═══════════════════════════════════════════════════════════════
// Kimi Code — 特殊适配器（自定义认证头）
// ═══════════════════════════════════════════════════════════════
const KIMI_KEYS = getProviderKeys('KIMI_CODE', 5);
const KIMI_BASE_URL = process.env.KIMI_CODE_BASE_URL || 'https://api.kimi.com/coding/v1';
const KIMI_DEFAULT_MODEL = process.env.KIMI_CODE_DEFAULT_MODEL || 'kimi-for-coding';

// ═══════════════════════════════════════════════════════════════
// GLM-5.1 (智谱AI) — 特殊适配器（Bearer Token）
// ═══════════════════════════════════════════════════════════════
const GLM51_KEYS = getProviderKeys('GLM51', 10);
const GLM51_BASE_URL = process.env.GLM51_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
const GLM51_DEFAULT_MODEL = process.env.GLM51_DEFAULT_MODEL || 'glm-4';

// ═══════════════════════════════════════════════════════════════
// Claude — 特殊适配器（x-api-key 认证头）
// ═══════════════════════════════════════════════════════════════
const CLAUDE_KEYS = getProviderKeys('CLAUDE', 5);
const CLAUDE_BASE_URL = process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com';

// ═══════════════════════════════════════════════════════════════
// DeepSeek — OpenAI兼容
// ═══════════════════════════════════════════════════════════════
const DEEPSEEK_KEYS = getProviderKeys('DEEPSEEK', 5);
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

// ═══════════════════════════════════════════════════════════════
// OpenAI — OpenAI兼容
// ═══════════════════════════════════════════════════════════════
const OPENAI_KEYS = getProviderKeys('OPENAI', 5);
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com';

// ═══════════════════════════════════════════════════════════════
// Ollama — 本地部署
// ═══════════════════════════════════════════════════════════════
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export interface ProviderInfo {
  id: string;
  provider: string;
  name: string;
  model: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export class BackendRouter {
  private backends = new Map<string, BaseBackendAdapter>();
  private healthChecks = new Map<string, NodeJS.Timeout>();
  private healthStatus = new Map<string, { status: 'healthy' | 'unhealthy'; latency: number }>();
  private keyIndices = new Map<string, number>(); // 轮询索引

  constructor() {
    this.initAllBackends();
  }

  private initAllBackends(): void {
    // === 特殊适配器（需要自定义认证头或协议） ===

    // Kimi Code — 多Key轮询
    if (KIMI_KEYS.length > 0) {
      this.registerBackend('kimi-code', new KimiAdapter(
        { provider: 'kimi-code', baseUrl: KIMI_BASE_URL, apiKey: KIMI_KEYS[0] },
        { baseUrl: KIMI_BASE_URL, apiKeys: KIMI_KEYS, defaultModel: KIMI_DEFAULT_MODEL, maxRetries: 3, timeout: 60000 },
      ));
    } else {
      console.warn('[BackendRouter] Kimi Code 适配器未注册：未找到有效的 KIMI_CODE_API_KEY 环境变量');
    }

    // Claude — 多Key轮询
    if (CLAUDE_KEYS.length > 0) {
      this.registerBackend('claude', new ClaudeAdapter(
        { provider: 'claude', baseUrl: CLAUDE_BASE_URL, apiKey: CLAUDE_KEYS[0] },
      ));
    } else {
      console.warn('[BackendRouter] Claude 适配器未注册：未找到有效的 CLAUDE_API_KEY 环境变量');
    }

    // Ollama — 本地部署，无认证
    this.registerBackend('ollama', new OllamaAdapter(
      { provider: 'ollama', baseUrl: OLLAMA_BASE_URL, apiKey: '' },
    ));

    // GLM-5.1 (智谱AI) — 多Key轮询
    // 智谱 API Key 格式: api_key.secret_key，Header 中使用完整 Key
    const GLM51_API_KEYS = GLM51_KEYS.filter(k => k.length > 10);
    if (GLM51_API_KEYS.length > 0) {
      this.registerBackend('zhipu', new OpenAICompatibleAdapter({
        provider: 'zhipu',
        baseUrl: GLM51_BASE_URL,
        apiKey: GLM51_API_KEYS[0],
        model: GLM51_DEFAULT_MODEL,
        apiKeyHeader: 'Authorization',
        apiKeyPrefix: 'Bearer ',
        chatPath: '/chat/completions',
        modelsPath: '/models',
      }));
      console.log(`[BackendRouter] GLM-5.1 适配器已注册，${GLM51_API_KEYS.length} 个Key可用`);
    } else {
      console.warn('[BackendRouter] GLM-5.1 适配器未注册：未找到有效的 GLM51_API_KEY 环境变量');
    }

    // DeepSeek — 多Key轮询
    if (DEEPSEEK_KEYS.length > 0) {
      this.registerBackend('deepseek', new OpenAICompatibleAdapter({
        provider: 'deepseek',
        baseUrl: DEEPSEEK_BASE_URL,
        apiKey: DEEPSEEK_KEYS[0],
        model: 'deepseek-chat',
        chatPath: '/chat/completions',
        modelsPath: '/models',
      }));
      console.log(`[BackendRouter] DeepSeek 适配器已注册，${DEEPSEEK_KEYS.length} 个Key可用`);
    }

    // OpenAI — 多Key轮询
    if (OPENAI_KEYS.length > 0) {
      this.registerBackend('openai', new OpenAICompatibleAdapter({
        provider: 'openai',
        baseUrl: OPENAI_BASE_URL,
        apiKey: OPENAI_KEYS[0],
        model: 'gpt-4o',
        chatPath: '/v1/chat/completions',
        modelsPath: '/v1/models',
      }));
      console.log(`[BackendRouter] OpenAI 适配器已注册，${OPENAI_KEYS.length} 个Key可用`);
    }

    // === providers.json 中的其他 provider ===
    const openAICompatibleProviders = providersConfig.providers.filter(
      (p: any) => !['kimi-code', 'claude', 'ollama', 'zhipu', 'deepseek', 'openai'].includes(p.id)
    );

    for (const provider of openAICompatibleProviders) {
      const apiKey = this.resolveApiKey(provider.apiKeySource);
      const hasKey = !!apiKey && apiKey.length > 10;

      const config: OpenAICompatibleConfig = {
        provider: provider.id,
        baseUrl: provider.baseUrl,
        apiKey: apiKey || '',
        model: provider.defaultModel,
        apiKeyHeader: provider.apiKeyHeader,
        apiKeyPrefix: provider.apiKeyPrefix,
        chatPath: provider.baseUrl.includes('/v1') ? '/chat/completions' : '/v1/chat/completions',
        modelsPath: provider.baseUrl.includes('/v1') ? '/models' : '/v1/models',
        extraHeaders: provider.extraHeaders,
      };

      // 只有有API Key的才启动健康检查，避免未配置provider拖垮系统
      this.registerBackend(provider.id, new OpenAICompatibleAdapter(config), hasKey);
      if (!hasKey) {
        console.log(`[BackendRouter] ${provider.id} 已注册（未配置API Key，跳过健康检查）`);
      }
    }
  }

  private resolveApiKey(source: string): string | undefined {
    if (!source || source === 'none') return undefined;
    if (source.startsWith('env:')) {
      const envVar = source.slice(4);
      return process.env[envVar];
    }
    if (source === 'config') {
      return undefined;
    }
    return undefined;
  }

  private registerBackend(id: string, adapter: BaseBackendAdapter, enableHealthCheck: boolean = true): void {
    this.backends.set(id, adapter);
    if (enableHealthCheck) {
      this.startHealthCheck(id, adapter);
    } else {
      this.healthStatus.set(id, { status: 'healthy', latency: 0 });
    }
  }

  // ─── 动态注册/注销 ────────────────────────────────────
  register(id: string, adapter: BaseBackendAdapter, enableHealthCheck: boolean = true): void {
    this.registerBackend(id, adapter, enableHealthCheck);
  }

  unregister(id: string): boolean {
    this.stopHealthCheck(id);
    return this.backends.delete(id);
  }

  getBackend(id: string): BaseBackendAdapter | undefined {
    return this.backends.get(id);
  }

  listBackends(): Array<{ id: string; provider: string; healthy: boolean; models: string[] }> {
    return Array.from(this.backends.entries()).map(([id, backend]) => ({
      id,
      provider: id,
      healthy: this.healthStatus.get(id)?.status === 'healthy',
      models: [],
    }));
  }

  async listBackendsDetailed(): Promise<Array<{ id: string; provider: string; healthy: boolean; models: string[]; latency: number }>> {
    const results = await Promise.all(
      Array.from(this.backends.entries()).map(async ([id, backend]) => {
        const health = await backend.healthCheck();
        const models = await backend.listModels();
        return { id, provider: id, healthy: health.status === 'healthy', models, latency: health.latency };
      }),
    );
    return results;
  }

  // ─── 多Key轮询获取下一个Key ────────────────────────────
  private getNextKey(providerId: string, keys: string[]): string {
    const idx = this.keyIndices.get(providerId) || 0;
    const nextIdx = (idx + 1) % keys.length;
    this.keyIndices.set(providerId, nextIdx);
    return keys[nextIdx];
  }

  // ─── 带重试的聊天调用 ─────────────────────────────────
  private async chatWithRetry(
    backend: BaseBackendAdapter,
    request: ChatRequest,
    maxRetries: number = 3,
  ): Promise<ChatResponse> {
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await backend.chat(request);
      } catch (err: any) {
        lastError = err;
        const isRetryable = this.isRetryableError(err);
        if (!isRetryable || attempt >= maxRetries) {
          throw err;
        }
        // 指数退避: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
        console.warn(`[BackendRouter] chat attempt ${attempt} failed (${err.message}), retrying in ${delay.toFixed(0)}ms...`);
        await this.sleep(delay);
      }
    }
    throw lastError || new Error('Chat failed after retries');
  }

  private async *chatStreamWithRetry(
    backendId: string,
    request: ChatRequest,
    maxRetries: number = 3,
  ): AsyncIterable<ChatChunk> {
    const backend = this.backends.get(backendId);
    if (!backend) throw new Error(`Backend ${backendId} not found`);

    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        yield* backend.chatStream(request);
        return;
      } catch (err: any) {
        lastError = err;
        const isRetryable = this.isRetryableError(err);
        if (!isRetryable || attempt >= maxRetries) {
          throw err;
        }
        const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
        console.warn(`[BackendRouter] chatStream attempt ${attempt} failed (${err.message}), retrying in ${delay.toFixed(0)}ms...`);
        await this.sleep(delay);
      }
    }
    throw lastError || new Error('Chat stream failed after retries');
  }

  private isRetryableError(err: any): boolean {
    if (!err) return false;
    const message = err.message || String(err);
    // 网络错误、超时、速率限制、服务端错误
    const retryablePatterns = [
      'timeout',
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'ENOTFOUND',
      'EAI_AGAIN',
      'network',
      'fetch failed',
      'rate limit',
      'too many requests',
      '429',
      '500',
      '502',
      '503',
      '504',
    ];
    return retryablePatterns.some(p => message.toLowerCase().includes(p.toLowerCase()));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ─── 聊天（支持fallback + 重试）────────────────────────
  async chat(backendId: string, request: ChatRequest, fallbackIds?: string[]): Promise<ChatResponse> {
    const backend = this.backends.get(backendId);
    if (!backend) {
      // 尝试fallback
      if (fallbackIds && fallbackIds.length > 0) {
        const routed = await this.routeChat(request, fallbackIds);
        return routed.response;
      }
      // 自动降级到 zhipu（如果配置了 Key）
      const zhipuFallback = this.backends.get('zhipu');
      if (zhipuFallback) {
        console.warn(`[BackendRouter] ${backendId} not found, auto-falling back to zhipu`);
        return await this.chatWithRetry(zhipuFallback, request);
      }
      throw new Error(`Backend ${backendId} not found`);
    }
    try {
      return await this.chatWithRetry(backend, request);
    } catch (err: any) {
      // 主provider失败，尝试fallback
      if (fallbackIds && fallbackIds.length > 0) {
        console.warn(`[BackendRouter] ${backendId} failed after retries, trying fallback: ${fallbackIds.join(', ')}`);
        const routed = await this.routeChat(request, fallbackIds);
        return routed.response;
      }
      // 自动降级到 zhipu
      const zhipuFallback = this.backends.get('zhipu');
      if (zhipuFallback && backendId !== 'zhipu') {
        console.warn(`[BackendRouter] ${backendId} failed, auto-falling back to zhipu`);
        try {
          return await this.chatWithRetry(zhipuFallback, request);
        } catch (fallbackErr: any) {
          console.error(`[BackendRouter] zhipu fallback also failed: ${fallbackErr.message}`);
        }
      }
      throw err;
    }
  }

  async *chatStream(backendId: string, request: ChatRequest): AsyncIterable<ChatChunk> {
    const backend = this.backends.get(backendId);
    if (!backend) {
      // 自动降级到 zhipu（如果配置了 Key）
      const zhipuFallback = this.backends.get('zhipu');
      if (zhipuFallback) {
        console.warn(`[BackendRouter] ${backendId} not found for stream, auto-falling back to zhipu`);
        yield* this.chatStreamWithRetry('zhipu', request);
        return;
      }
      throw new Error(`Backend ${backendId} not found`);
    }
    yield* this.chatStreamWithRetry(backendId, request);
  }

  // ─── 路由选择（支持fallback链）───────────────────────────
  async routeChat(request: ChatRequest, preferences?: string[]): Promise<{ backendId: string; response: ChatResponse }> {
    const candidates = preferences || Array.from(this.backends.keys());
    const errors: string[] = [];
    for (const id of candidates) {
      const backend = this.backends.get(id);
      if (!backend) continue;
      const health = this.healthStatus.get(id);
      if (health?.status === 'unhealthy') continue;
      try {
        const response = await this.chatWithRetry(backend, request);
        return { backendId: id, response };
      } catch (err: any) {
        errors.push(`${id}: ${err.message}`);
        continue;
      }
    }
    throw new Error(`All backends failed: ${errors.join('; ')}`);
  }

  // ─── 健康检查 ─────────────────────────────────────────
  private startHealthCheck(id: string, adapter: BaseBackendAdapter): void {
    const runCheck = async () => {
      try {
        const health = await adapter.healthCheck();
        this.healthStatus.set(id, health);
        if (health.status === 'unhealthy') {
          console.warn(`⚠️ Backend ${id} unhealthy (${health.latency}ms)`);
        }
      } catch {
        this.healthStatus.set(id, { status: 'unhealthy', latency: -1 });
      }
    };
    runCheck();
    const interval = setInterval(runCheck, 30000);
    this.healthChecks.set(id, interval);
  }

  private stopHealthCheck(id: string): void {
    const interval = this.healthChecks.get(id);
    if (interval) {
      clearInterval(interval);
      this.healthChecks.delete(id);
    }
  }

  destroy(): void {
    for (const [id] of this.healthChecks) {
      this.stopHealthCheck(id);
    }
    this.healthChecks.clear();
    this.healthStatus.clear();
    this.backends.clear();
  }
}

// ─── 单例 ────────────────────────────────────────────

let routerInstance: BackendRouter | null = null;

export function getBackendRouter(): BackendRouter {
  if (!routerInstance) routerInstance = new BackendRouter();
  return routerInstance;
}
