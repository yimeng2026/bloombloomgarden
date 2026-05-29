import { BaseBackendAdapter, ChatRequest, ChatResponse, ChatChunk } from './BaseBackendAdapter';

interface KimiConfig {
  baseUrl: string;
  apiKeys: string[];
  defaultModel: string;
  maxRetries: number;
  timeout: number;
  models?: string[];
}

export class KimiAdapter extends BaseBackendAdapter {
  private keyIndex = 0;
  private keyFailures = new Map<number, number>();

  constructor(
    config: { provider: string; baseUrl: string; apiKey: string },
    private kimiConfig?: KimiConfig,
  ) {
    super(config);
  }

  private getCurrentKey(): string {
    if (this.kimiConfig && this.kimiConfig.apiKeys.length > 0) {
      return this.kimiConfig.apiKeys[this.keyIndex % this.kimiConfig.apiKeys.length];
    }
    return this.config.apiKey;
  }

  private rotateKey(): void {
    if (this.kimiConfig && this.kimiConfig.apiKeys.length > 1) {
      this.keyIndex = (this.keyIndex + 1) % this.kimiConfig.apiKeys.length;
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.getCurrentKey()}`,
      'Content-Type': 'application/json',
    };
  }

  private getBaseUrl(): string {
    return this.kimiConfig?.baseUrl || this.config.baseUrl || 'https://api.kimi.com/coding/v1';
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model || this.kimiConfig?.defaultModel || 'kimi-for-coding';
    const payload = {
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2048,
    };

    const maxRetries = this.kimiConfig?.maxRetries || 1;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          if (response.status === 429 || response.status === 401) {
            this.rotateKey();
            continue;
          }
          throw new Error(`Kimi API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        return {
          id: data.id,
          content: data.choices?.[0]?.message?.content || '',
          usage: data.usage,
          finishReason: data.choices?.[0]?.finish_reason,
        };
      } catch (err) {
        lastError = err as Error;
        if (attempt < maxRetries - 1) {
          this.rotateKey();
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('Kimi API failed after all retries');
  }

  async *chatStream(request: ChatRequest): AsyncIterable<ChatChunk> {
    const model = request.model || this.kimiConfig?.defaultModel || 'kimi-for-coding';
    const payload = {
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2048,
      stream: true,
    };

    const maxRetries = this.kimiConfig?.maxRetries || 1;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          if (response.status === 429 || response.status === 401) {
            this.rotateKey();
            continue;
          }
          throw new Error(`Kimi API error: ${response.status} ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') return;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                if (delta) {
                  yield {
                    id: parsed.id || crypto.randomUUID(),
                    content: delta,
                    finishReason: parsed.choices?.[0]?.finish_reason,
                  };
                }
              } catch {
                // 忽略解析失败的行
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
        return;
      } catch (err) {
        lastError = err as Error;
        if (attempt < maxRetries - 1) {
          this.rotateKey();
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('Kimi stream failed after all retries');
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.getBaseUrl()}/models`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        latency: Date.now() - start,
      };
    } catch {
      return { status: 'unhealthy', latency: -1 };
    }
  }

  async listModels(): Promise<string[]> {
    return this.kimiConfig?.models || ['kimi-for-coding'];
  }
}
