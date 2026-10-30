import { BaseBackendAdapter, ChatRequest, ChatResponse, ChatChunk } from '../adapters/BaseBackendAdapter';
import { KimiClusterAdapter } from '../adapters/KimiClusterAdapter';
import { loadKimiEndpoints } from '../KimiClusterOrchestrator';

const KIMI_MODEL = 'kimi-for-coding';
type Health = { status: 'healthy' | 'unhealthy' | 'unknown'; latency: number };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class BackendRouter {
  private backends = new Map<string, BaseBackendAdapter>();
  private healthChecks = new Map<string, NodeJS.Timeout>();
  private healthStatus = new Map<string, Health>();

  constructor() {
    if (loadKimiEndpoints().length === 0) return;
    this.register(
      'kimi-code',
      new KimiClusterAdapter(),
      process.env.GARDEN_KIMI_HEALTH_POLL === '1',
    );
  }

  register(id: string, adapter: BaseBackendAdapter, enableHealthCheck = true): void {
    if (id !== 'kimi-code' || !(adapter instanceof KimiClusterAdapter)) {
      throw new Error('Kimi-only mode: only kimi-code with KimiClusterAdapter can be registered');
    }
    this.stopHealthCheck(id);
    this.backends.set(id, adapter);
    this.healthStatus.set(id, { status: 'unknown', latency: -1 });
    if (enableHealthCheck) this.startHealthCheck(id, adapter);
  }

  unregister(id: string): boolean {
    this.stopHealthCheck(id);
    this.healthStatus.delete(id);
    return this.backends.delete(id);
  }

  getBackend(id: string): BaseBackendAdapter | undefined {
    return this.backends.get(id);
  }

  listBackends(): Array<{ id: string; provider: string; healthy: boolean; models: string[] }> {
    return Array.from(this.backends.keys()).map(id => ({
      id,
      provider: 'kimi',
      healthy: this.healthStatus.get(id)?.status === 'healthy',
      models: [KIMI_MODEL],
    }));
  }

  async listBackendsDetailed(): Promise<Array<{
    id: string;
    provider: string;
    healthy: boolean;
    models: string[];
    latency: number;
  }>> {
    const backend = this.backends.get('kimi-code');
    if (!backend) return [];
    const health = await backend.healthCheck();
    this.healthStatus.set('kimi-code', health);
    return [{
      id: 'kimi-code',
      provider: 'kimi',
      healthy: health.status === 'healthy',
      models: await backend.listModels(),
      latency: health.latency,
    }];
  }

  private isRetryableError(error: unknown): boolean {
    const message = errorMessage(error).toLowerCase();
    return [
      'timeout', 'etimedout', 'econnreset', 'econnrefused', 'enotfound',
      'eai_again', 'network', 'fetch failed', 'rate limit', 'too many requests',
      '429', '500', '502', '503', '504',
    ].some(pattern => message.includes(pattern));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async chatWithRetry(backend: BaseBackendAdapter, request: ChatRequest, maxRetries = 3): Promise<ChatResponse> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await backend.chat(request);
      } catch (error) {
        lastError = error;
        if (!this.isRetryableError(error) || attempt === maxRetries) throw error;
        await this.sleep(1000 * 2 ** (attempt - 1));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async *chatStreamWithRetry(request: ChatRequest, maxRetries = 3): AsyncIterable<ChatChunk> {
    const backend = this.backends.get('kimi-code');
    if (!backend) throw new Error('Kimi backend is not configured');
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        yield* backend.chatStream(request);
        return;
      } catch (error) {
        lastError = error;
        if (!this.isRetryableError(error) || attempt === maxRetries) throw error;
        await this.sleep(1000 * 2 ** (attempt - 1));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  async chat(backendId: string, request: ChatRequest, _fallbackIds?: string[]): Promise<ChatResponse> {
    if (backendId !== 'kimi-code') throw new Error('Kimi-only mode: use backendId=kimi-code');
    const backend = this.backends.get(backendId);
    if (!backend) throw new Error('Kimi backend is not configured; set KIMI_API_KEY');
    return this.chatWithRetry(backend, request);
  }

  async *chatStream(backendId: string, request: ChatRequest): AsyncIterable<ChatChunk> {
    if (backendId !== 'kimi-code') throw new Error('Kimi-only mode: use backendId=kimi-code');
    yield* this.chatStreamWithRetry(request);
  }

  async routeChat(request: ChatRequest, preferences?: string[]): Promise<{
    backendId: string;
    response: ChatResponse;
  }> {
    const candidates = preferences || ['kimi-code'];
    if (candidates.some(id => id !== 'kimi-code')) {
      throw new Error('Kimi-only mode: alternate-provider fallback is disabled');
    }
    const response = await this.chat('kimi-code', request);
    return { backendId: 'kimi-code', response };
  }

  private startHealthCheck(id: string, adapter: BaseBackendAdapter): void {
    const runCheck = async () => {
      try {
        this.healthStatus.set(id, await adapter.healthCheck());
      } catch {
        this.healthStatus.set(id, { status: 'unhealthy', latency: -1 });
      }
    };
    void runCheck();
    const interval = setInterval(() => void runCheck(), 30000);
    interval.unref();
    this.healthChecks.set(id, interval);
  }

  private stopHealthCheck(id: string): void {
    const interval = this.healthChecks.get(id);
    if (interval) clearInterval(interval);
    this.healthChecks.delete(id);
  }

  destroy(): void {
    for (const id of this.healthChecks.keys()) this.stopHealthCheck(id);
    this.healthChecks.clear();
    this.healthStatus.clear();
    this.backends.clear();
  }
}

let routerInstance: BackendRouter | null = null;

export function getBackendRouter(): BackendRouter {
  if (!routerInstance) routerInstance = new BackendRouter();
  return routerInstance;
}
