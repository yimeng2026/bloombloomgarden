import { KimiAdapter } from './KimiAdapter';
import { ChatChunk, ChatRequest, ChatResponse } from './BaseBackendAdapter';
import { KimiClusterOrchestrator, loadKimiEndpoints } from '../KimiClusterOrchestrator';

/** Adapter used by BackendRouter; all calls share the one Garden Kimi cluster. */
export class KimiClusterAdapter extends KimiAdapter {
  private readonly cluster: KimiClusterOrchestrator;

  constructor() {
    const endpoints = loadKimiEndpoints();
    if (!endpoints.length) throw new Error('No Kimi cluster credentials configured');
    const first = endpoints[0];
    super(
      { provider: 'kimi-code', baseUrl: first.baseUrl, apiKey: first.apiKey },
      {
        baseUrl: first.baseUrl,
        apiKeys: endpoints.map(endpoint => endpoint.apiKey),
        defaultModel: 'kimi-for-coding',
        maxRetries: 1,
        timeout: 60000,
      },
    );
    this.cluster = new KimiClusterOrchestrator(endpoints);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const data = await this.cluster.execute('backend-dialog', 'chat', { messages: request.messages });
    const message = data?.choices?.[0]?.message;
    return {
      id: String(data?.id || crypto.randomUUID()),
      content: typeof message?.content === 'string' ? message.content : '',
      usage: data?.usage,
      finishReason: data?.choices?.[0]?.finish_reason,
    };
  }

  async *chatStream(request: ChatRequest): AsyncIterable<ChatChunk> {
    const queue: ChatChunk[] = [];
    const id = crypto.randomUUID();
    let wake: (() => void) | undefined;
    let done = false;
    let failure: unknown;
    const producer = (async () => {
      try {
        await this.cluster.executeStream('backend-dialog', 'chat', { messages: request.messages }, chunk => {
          queue.push({ id, content: String(chunk.content) });
          wake?.();
          wake = undefined;
        });
      } catch (error) {
        failure = error;
      } finally {
        done = true;
        wake?.();
        wake = undefined;
      }
    })();

    while (!done || queue.length > 0) {
      if (queue.length > 0) {
        yield queue.shift()!;
        continue;
      }
      await new Promise<void>(resolve => { wake = resolve; });
    }
    await producer;
    if (failure) throw failure;
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    return this.cluster.healthCheck();
  }

  async listModels(): Promise<string[]> {
    return this.cluster.getStats().models;
  }
}
