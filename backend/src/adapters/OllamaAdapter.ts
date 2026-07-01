import { BaseBackendAdapter, ChatRequest, ChatResponse, ChatChunk } from './BaseBackendAdapter';

export class OllamaAdapter extends BaseBackendAdapter {
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model || 'llama3',
        messages: request.messages,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 2048,
        },
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    return {
      id: crypto.randomUUID(),
      content: data.message?.content || '',
      usage: data.eval_count ? {
        prompt_tokens: data.prompt_eval_count || 0,
        completion_tokens: data.eval_count || 0,
        total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      } : undefined,
      finishReason: data.done ? 'stop' : undefined,
    };
  }

  async *chatStream(request: ChatRequest): AsyncIterable<ChatChunk> {
    const response = await fetch(`${this.config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model || 'llama3',
        messages: request.messages,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 2048,
        },
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
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
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);
            const content = parsed.message?.content || '';
            if (content) {
              yield {
                id: crypto.randomUUID(),
                content,
                finishReason: parsed.done ? 'stop' : undefined,
              };
            }
            if (parsed.done) return;
          } catch {
            // ignore
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
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      return { status: response.ok ? 'healthy' : 'unhealthy', latency: Date.now() - start };
    } catch {
      return { status: 'unhealthy', latency: -1 };
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      const data = await response.json() as any;
      return data.models?.map((m: any) => m.name) || ['llama3', 'mistral', 'codellama'];
    } catch {
      return ['llama3', 'mistral', 'codellama'];
    }
  }
}
