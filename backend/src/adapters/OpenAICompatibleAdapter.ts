import { BaseBackendAdapter, ChatRequest, ChatResponse, ChatChunk } from './BaseBackendAdapter';

export interface OpenAICompatibleConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  apiKeyHeader?: string;      // 默认 'Authorization'
  apiKeyPrefix?: string;      // 默认 'Bearer'
  chatPath?: string;           // 默认 '/chat/completions'
  modelsPath?: string;         // 默认 '/models'
  model?: string;
  extraHeaders?: Record<string, string>;
  systemRoleName?: string;     // 默认 'system'
  timeout?: number;            // 默认 30000ms
  maxRetries?: number;         // 默认 3
}

/**
 * 通用 OpenAI 兼容适配器
 * 支持所有使用 /v1/chat/completions 端点的平台
 */
export class OpenAICompatibleAdapter extends BaseBackendAdapter {
  private compatConfig: OpenAICompatibleConfig;

  constructor(config: OpenAICompatibleConfig) {
    super({
      provider: config.provider,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      timeout: config.timeout || 30000,
    });
    this.compatConfig = config;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.compatConfig.extraHeaders || {}),
    };

    const keyHeader = this.compatConfig.apiKeyHeader || 'Authorization';
    const keyPrefix = (this.compatConfig.apiKeyPrefix || 'Bearer').trim();
    
    if (keyHeader === 'x-api-key') {
      headers[keyHeader] = this.compatConfig.apiKey;
    } else {
      headers[keyHeader] = `${keyPrefix} ${this.compatConfig.apiKey}`;
    }

    return headers;
  }

  private getChatUrl(): string {
    const path = this.compatConfig.chatPath || '/v1/chat/completions';
    return `${this.compatConfig.baseUrl}${path}`;
  }

  private getModelsUrl(): string {
    const path = this.compatConfig.modelsPath || '/v1/models';
    return `${this.compatConfig.baseUrl}${path}`;
  }

  private normalizeMessages(messages: any[]): any[] {
    const systemRole = this.compatConfig.systemRoleName || 'system';
    return messages.map(m => ({
      role: m.role === 'agent' ? 'assistant' : m.role,
      content: m.content,
    }));
  }

  private getTimeout(): number {
    return this.compatConfig.timeout || 30000;
  }

  private getMaxRetries(): number {
    return this.compatConfig.maxRetries || 3;
  }

  private isRetryableError(err: any): boolean {
    if (!err) return false;
    const message = err.message || String(err);
    const retryablePatterns = [
      'timeout', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED',
      'ENOTFOUND', 'EAI_AGAIN', 'network', 'fetch failed',
      'rate limit', 'too many requests', '429', '500', '502', '503', '504',
    ];
    return retryablePatterns.some(p => message.toLowerCase().includes(p.toLowerCase()));
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(id);
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const payload: any = {
      model: request.model || this.compatConfig.model || 'default',
      messages: this.normalizeMessages(request.messages),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2048,
    };

    const chatUrl = this.getChatUrl();
    const headers = this.buildHeaders();
    const maxRetries = this.getMaxRetries();
    const timeoutMs = this.getTimeout();

    console.log(`[Adapter:${this.compatConfig.provider}] Chat request: ${JSON.stringify({ url: chatUrl, model: payload.model, msgCount: payload.messages?.length, hasApiKey: !!(headers.Authorization || headers['x-api-key']) })}`);

    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(chatUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        }, timeoutMs);

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          console.error(`[Adapter:${this.compatConfig.provider}] Chat HTTP error: ${response.status} ${response.statusText}, body: ${errText.substring(0, 300)}`);
          const httpError = new Error(`${this.compatConfig.provider} API error: ${response.status} ${response.statusText}`);
          if (this.isRetryableError(httpError) && attempt < maxRetries) {
            lastError = httpError;
            const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
            console.warn(`[Adapter:${this.compatConfig.provider}] Retryable error on attempt ${attempt}, retrying in ${delay.toFixed(0)}ms...`);
            await this.sleep(delay);
            continue;
          }
          throw httpError;
        }

        const data = await response.json() as any;
        const message = data.choices?.[0]?.message || {};
        // GLM-5.1 等模型可能返回 reasoning_content 而非 content
        const content = message.content || message.reasoning_content || '';
        console.log(`[Adapter:${this.compatConfig.provider}] Chat success: ${content.length} chars, finish_reason: ${data.choices?.[0]?.finish_reason || 'unknown'}`);
        return {
          id: data.id || `${this.compatConfig.provider}-${Date.now()}`,
          content,
          usage: data.usage,
          finishReason: data.choices?.[0]?.finish_reason,
        };
      } catch (err: any) {
        lastError = err;
        if (this.isRetryableError(err) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
          console.warn(`[Adapter:${this.compatConfig.provider}] Chat attempt ${attempt} failed (${err.message}), retrying in ${delay.toFixed(0)}ms...`);
          await this.sleep(delay);
          continue;
        }
        console.error(`[Adapter:${this.compatConfig.provider}] Chat failed after ${attempt} attempts: ${err.message}`);
        throw err;
      }
    }
    throw lastError || new Error('Chat failed after retries');
  }

  async *chatStream(request: ChatRequest): AsyncIterable<ChatChunk> {
    const payload: any = {
      model: request.model || this.compatConfig.model || 'default',
      messages: this.normalizeMessages(request.messages),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2048,
      stream: true,
    };

    const chatUrl = this.getChatUrl();
    const headers = this.buildHeaders();
    const maxRetries = this.getMaxRetries();
    const timeoutMs = this.getTimeout();

    console.log(`[Adapter:${this.compatConfig.provider}] ChatStream request: ${JSON.stringify({ url: chatUrl, model: payload.model, msgCount: payload.messages?.length, hasApiKey: !!(headers.Authorization || headers['x-api-key']) })}`);

    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(chatUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        }, timeoutMs);

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          console.error(`[Adapter:${this.compatConfig.provider}] ChatStream HTTP error: ${response.status} ${response.statusText}, body: ${errText.substring(0, 300)}`);
          const httpError = new Error(`${this.compatConfig.provider} API error: ${response.status} ${response.statusText}`);
          if (this.isRetryableError(httpError) && attempt < maxRetries) {
            lastError = httpError;
            const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
            console.warn(`[Adapter:${this.compatConfig.provider}] Retryable stream error on attempt ${attempt}, retrying in ${delay.toFixed(0)}ms...`);
            await this.sleep(delay);
            continue;
          }
          throw httpError;
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';
        let chunkCount = 0;

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
              if (data === '[DONE]') {
                console.log(`[Adapter:${this.compatConfig.provider}] ChatStream complete: ${chunkCount} chunks`);
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta || {};
                // GLM-5.1 等模型可能返回 reasoning_content 而非 content
                const content = delta.content || delta.reasoning_content || '';
                if (content) {
                  chunkCount++;
                  yield {
                    id: parsed.id || `${this.compatConfig.provider}-${Date.now()}`,
                    content,
                    finishReason: parsed.choices?.[0]?.finish_reason,
                  };
                }
              } catch {
                // ignore parse error
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
        // 如果成功完成，跳出重试循环
        return;
      } catch (err: any) {
        lastError = err;
        if (this.isRetryableError(err) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
          console.warn(`[Adapter:${this.compatConfig.provider}] ChatStream attempt ${attempt} failed (${err.message}), retrying in ${delay.toFixed(0)}ms...`);
          await this.sleep(delay);
          continue;
        }
        console.error(`[Adapter:${this.compatConfig.provider}] ChatStream failed after ${attempt} attempts: ${err.message}`);
        throw err;
      }
    }
    throw lastError || new Error('ChatStream failed after retries');
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const start = Date.now();
    try {
      const response = await this.fetchWithTimeout(this.getModelsUrl(), {
        method: 'GET',
        headers: this.buildHeaders(),
      }, this.getTimeout());
      return { status: response.ok ? 'healthy' : 'unhealthy', latency: Date.now() - start };
    } catch (err: any) {
      console.warn(`[Adapter:${this.compatConfig.provider}] Health check failed: ${err.message}`);
      return { status: 'unhealthy', latency: -1 };
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.fetchWithTimeout(this.getModelsUrl(), {
        headers: this.buildHeaders(),
      }, this.getTimeout());
      if (!response.ok) return [this.compatConfig.model || 'default'];
      const data = await response.json() as any;
      return data.data?.map((m: any) => m.id) || [this.compatConfig.model || 'default'];
    } catch (err: any) {
      console.warn(`[Adapter:${this.compatConfig.provider}] listModels failed: ${err.message}`);
      return [this.compatConfig.model || 'default'];
    }
  }
}
