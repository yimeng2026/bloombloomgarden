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

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const payload: any = {
      model: request.model || this.compatConfig.model || 'default',
      messages: this.normalizeMessages(request.messages),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2048,
    };

    const chatUrl = this.getChatUrl();
    const headers = this.buildHeaders();
    console.log('[Adapter] Chat request:', JSON.stringify({ url: chatUrl, model: payload.model, msgCount: payload.messages?.length, hasApiKey: !!(headers.Authorization || headers['x-api-key']) }));
    
    const response = await fetch(chatUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[Adapter] Chat error:', response.status, errText.substring(0, 300));
      throw new Error(`${this.compatConfig.provider} API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const message = data.choices?.[0]?.message || {};
    // GLM-5.1 等模型可能返回 reasoning_content 而非 content
    const content = message.content || message.reasoning_content || '';
    return {
      id: data.id || `${this.compatConfig.provider}-${Date.now()}`,
      content,
      usage: data.usage,
      finishReason: data.choices?.[0]?.finish_reason,
    };
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
    console.log('[Adapter] Chat request:', JSON.stringify({ url: chatUrl, model: payload.model, msgCount: payload.messages?.length, hasApiKey: !!(headers.Authorization || headers['x-api-key']) }));
    
    const response = await fetch(chatUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[Adapter] Chat error:', response.status, errText.substring(0, 300));
      throw new Error(`${this.compatConfig.provider} API error: ${response.status} ${response.statusText}`);
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
            const delta = parsed.choices?.[0]?.delta || {};
            // GLM-5.1 等模型可能返回 reasoning_content 而非 content
            const content = delta.content || delta.reasoning_content || '';
            if (content) {
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
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const start = Date.now();
    try {
      const response = await fetch(this.getModelsUrl(), {
        method: 'GET',
        headers: this.buildHeaders(),
      });
      return { status: response.ok ? 'healthy' : 'unhealthy', latency: Date.now() - start };
    } catch {
      return { status: 'unhealthy', latency: -1 };
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(this.getModelsUrl(), {
        headers: this.buildHeaders(),
      });
      if (!response.ok) return [this.compatConfig.model || 'default'];
      const data = await response.json() as any;
      return data.data?.map((m: any) => m.id) || [this.compatConfig.model || 'default'];
    } catch {
      return [this.compatConfig.model || 'default'];
    }
  }
}
