import { BaseBackendAdapter, ChatRequest, ChatResponse, ChatChunk } from '../adapters/BaseBackendAdapter';
import { OpenAICompatibleAdapter, OpenAICompatibleConfig } from '../adapters/OpenAICompatibleAdapter';
import { KimiAdapter } from '../adapters/KimiAdapter';
import { ClaudeAdapter } from '../adapters/ClaudeAdapter';
import { OllamaAdapter } from '../adapters/OllamaAdapter';
import providersConfig from '../config/providers.json';

// ═══════════════════════════════════════════════════════════════
// Kimi Code API Keys — 从环境变量读取，不再硬编码
// 支持 KIMI_CODE_KEY_1 ~ KIMI_CODE_KEY_5
// ═══════════════════════════════════════════════════════════════
function getKimiCodeKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const key = process.env[`KIMI_CODE_KEY_${i}`];
    if (key && key.startsWith('sk-')) {
      keys.push(key);
    }
  }
  // 兼容旧环境变量名
  const legacyKeys = process.env.KIMI_CODE_API_KEYS;
  if (legacyKeys) {
    legacyKeys.split(',').forEach(k => {
      const trimmed = k.trim();
      if (trimmed.startsWith('sk-') && !keys.includes(trimmed)) {
        keys.push(trimmed);
      }
    });
  }
  if (keys.length === 0) {
    console.warn('[BackendRouter] ⚠️ 未配置 KIMI_CODE_KEY_1~5 环境变量，Kimi Code 适配器将不可用');
  }
  return keys;
}

const KIMI_CODE_KEYS = getKimiCodeKeys();
const KIMI_BASE_URL = process.env.KIMI_CODE_BASE_URL || 'https://api.kimi.com/coding/v1';
const KIMI_DEFAULT_MODEL = process.env.KIMI_CODE_DEFAULT_MODEL || 'kimi-for-coding';
const KIMI_MAX_RETRIES = parseInt(process.env.KIMI_CODE_MAX_RETRIES || '3', 10);
const KIMI_TIMEOUT = parseInt(process.env.KIMI_CODE_TIMEOUT || '60000', 10);

export interface BackendProfile {
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

  constructor() {
    this.initAllBackends();
  }

  private initAllBackends(): void {
    // === 特殊适配器（需要自定义认证头或协议） ===

    // Kimi Code — 从环境变量读取密钥，支持轮询
    if (KIMI_CODE_KEYS.length > 0) {
      this.registerBackend('kimi-code', new KimiAdapter(
        { provider: 'kimi-code', baseUrl: KIMI_BASE_URL, apiKey: KIMI_CODE_KEYS[0] },
        { baseUrl: KIMI_BASE_URL, apiKeys: KIMI_CODE_KEYS, defaultModel: KIMI_DEFAULT_MODEL, maxRetries: KIMI_MAX_RETRIES, timeout: KIMI_TIMEOUT },
      ));
    } else {
      console.warn('[BackendRouter] Kimi Code 适配器未注册：未找到有效的 KIMI_CODE_KEY 环境变量');
    }

    // Claude — 特殊 x-api-key 认证头
    this.registerBackend('claude', new ClaudeAdapter(
      { provider: 'claude', baseUrl: 'https://api.anthropic.com', apiKey: process.env.CLAUDE_API_KEY || '' },
    ));

    // Ollama — 本地部署，无认证
    this.registerBackend('ollama', new OllamaAdapter(
      { provider: 'ollama', baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434', apiKey: '' },
    ));

    // === 通用 OpenAI 兼容适配器（50+ 平台） ===

    const openAICompatibleProviders = providersConfig.providers.filter(
      (p: any) => !['kimi-code', 'claude', 'ollama'].includes(p.id)
    );

    for (const provider of openAICompatibleProviders) {
      const apiKey = this.resolveApiKey(provider.apiKeySource);
      // 即使没有API Key也注册后端（用户可以在设置页面配置）
      // 只有没有apiKeySource的才跳过

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

      this.registerBackend(provider.id, new OpenAICompatibleAdapter(config));
    }
  }

  private resolveApiKey(source: string): string | undefined {
    if (!source || source === 'none') return undefined;
    if (source.startsWith('env:')) {
      const envVar = source.slice(4);
      return process.env[envVar];
    }
    if (source === 'config') {
      // 从 kimiConfig 等特殊配置读取
      return undefined;
    }
    return undefined;
  }

  private registerBackend(id: string, adapter: BaseBackendAdapter): void {
    this.backends.set(id, adapter);
    this.startHealthCheck(id, adapter);
  }

  register(id: string, adapter: BaseBackendAdapter): void {
    this.registerBackend(id, adapter);
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

  async chat(backendId: string, request: ChatRequest): Promise<ChatResponse> {
    const backend = this.backends.get(backendId);
    if (!backend) throw new Error(`Backend ${backendId} not found`);
    return backend.chat(request);
  }

  async *chatStream(backendId: string, request: ChatRequest): AsyncIterable<ChatChunk> {
    const backend = this.backends.get(backendId);
    if (!backend) throw new Error(`Backend ${backendId} not found`);
    yield* backend.chatStream(request);
  }

  async routeChat(request: ChatRequest, preferences?: string[]): Promise<{ backendId: string; response: ChatResponse }> {
    const candidates = preferences || Array.from(this.backends.keys());
    for (const id of candidates) {
      const backend = this.backends.get(id);
      if (!backend) continue;
      const health = this.healthStatus.get(id);
      if (health?.status === 'unhealthy') continue;
      try {
        const response = await backend.chat(request);
        return { backendId: id, response };
      } catch {
        continue;
      }
    }
    throw new Error('All backends failed');
  }

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
