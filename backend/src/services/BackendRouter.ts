import { BaseBackendAdapter, ChatRequest, ChatResponse, ChatChunk } from '../adapters/BaseBackendAdapter';
import { OpenAICompatibleAdapter, OpenAICompatibleConfig } from '../adapters/OpenAICompatibleAdapter';
import { KimiAdapter } from '../adapters/KimiAdapter';
import { ClaudeAdapter } from '../adapters/ClaudeAdapter';
import { OllamaAdapter } from '../adapters/OllamaAdapter';
import kimiConfig from '../config/kimi.config.json';
import providersConfig from '../config/providers.json';

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

    // Kimi Code — 5 密钥轮询
    this.registerBackend('kimi-code', new KimiAdapter(
      { provider: 'kimi-code', baseUrl: kimiConfig.baseUrl, apiKey: kimiConfig.apiKeys[0] },
      { baseUrl: kimiConfig.baseUrl, apiKeys: kimiConfig.apiKeys, defaultModel: kimiConfig.defaultModel, maxRetries: kimiConfig.maxRetries, timeout: kimiConfig.timeout },
    ));

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
      if (!apiKey && provider.apiKeySource !== 'none') {
        // 未配置密钥，跳过注册（但保留配置信息）
        continue;
      }

      const config: OpenAICompatibleConfig = {
        provider: provider.id,
        baseUrl: provider.baseUrl,
        apiKey: apiKey || '',
        model: provider.defaultModel,
        apiKeyHeader: provider.apiKeyHeader,
        apiKeyPrefix: provider.apiKeyPrefix,
        chatPath: '/v1/chat/completions',
        modelsPath: '/v1/models',
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
}

// ─── 单例 ────────────────────────────────────────────

let routerInstance: BackendRouter | null = null;

export function getBackendRouter(): BackendRouter {
  if (!routerInstance) routerInstance = new BackendRouter();
  return routerInstance;
}
