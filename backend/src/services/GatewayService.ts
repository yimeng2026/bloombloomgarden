import { EventEmitter } from 'events';
import { getEngineScheduler } from './EngineScheduler';

const providersConfig = require('../config/providers.json');

export interface ChatRequest {
  engineId: string;
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  model: string;
  engineId: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  latency?: number;
}

/** 从环境变量获取指定 provider 的 API Key */
function getApiKeyForProvider(providerId: string): string | undefined {
  const env = process.env;
  // 直接匹配
  const directKey = env[`${providerId.toUpperCase().replace(/-/g, '_')}_API_KEY`];
  if (directKey) return directKey;
  // 别名映射
  if (providerId === 'zhipu') {
    return env.ZHIPU_API_KEY || env.GLM51_API_KEY_1;
  }
  if (providerId === 'deepseek') return env.DEEPSEEK_API_KEY;
  if (providerId === 'siliconflow') return env.SILICONFLOW_API_KEY;
  if (providerId === 'openai') return env.OPENAI_API_KEY;
  if (providerId === 'kimi' || providerId === 'moonshot') return env.MOONSHOT_API_KEY || env.KIMI_API_KEY;
  if (providerId === 'anthropic' || providerId === 'claude') return env.CLAUDE_API_KEY || env.ANTHROPIC_API_KEY;
  // 通用 fallback：遍历所有 GLM51 keys 返回第一个
  for (let i = 1; i <= 20; i++) {
    const key = env[`GLM51_API_KEY_${i}`];
    if (key) return key;
  }
  return undefined;
}

/** 获取 provider 的所有可用 Key（用于轮换） */
function getAllKeysForProvider(providerId: string): string[] {
  const keys: string[] = [];
  const single = getApiKeyForProvider(providerId);
  if (single) keys.push(single);
  // 智谱多 Key 轮换
  if (providerId === 'zhipu' || providerId === 'glm') {
    for (let i = 1; i <= 20; i++) {
      const k = process.env[`GLM51_API_KEY_${i}`];
      if (k && !keys.includes(k)) keys.push(k);
    }
  }
  return keys;
}

export class GatewayService extends EventEmitter {
  // 统一聊天入口（非流式）
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const scheduler = getEngineScheduler();
    const engine = await scheduler.getById(request.engineId);

    if (!engine) {
      throw new Error(`Engine ${request.engineId} not found`);
    }

    const provider = providersConfig.providers.find((p: any) => p.id === engine.brand);
    if (!provider) {
      throw new Error(`Provider config for ${engine.brand} not found`);
    }

    // 获取 API Key（优先使用 engine keyPool，否则环境变量）
    let apiKey = scheduler.rotateKey(engine);
    if (!apiKey) {
      apiKey = getApiKeyForProvider(engine.brand);
    }
    if (!apiKey) {
      throw new Error(`No API key available for provider ${engine.brand}`);
    }

    this.emit('gateway:request', {
      engineId: request.engineId,
      model: request.model || engine.model,
      messageCount: request.messages.length,
      timestamp: new Date(),
    });

    const providerRequest = this.convertToProviderFormat(provider, request);
    const endpoint = this.buildEndpoint(provider, false);
    const headers = this.buildHeaders(provider, apiKey);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(providerRequest),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Provider HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      const latency = Date.now() - startTime;

      const message = data.choices?.[0]?.message || {};
      const content = message.content || message.reasoning || '';
      const usage = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens ?? 0,
            completionTokens: data.usage.completion_tokens ?? 0,
            totalTokens: data.usage.total_tokens ?? 0,
          }
        : undefined;

      const response: ChatResponse = {
        content,
        model: data.model || request.model || engine.model,
        engineId: request.engineId,
        usage,
        latency,
      };

      this.emit('gateway:response', {
        engineId: request.engineId,
        latency,
        tokens: usage?.totalTokens,
        timestamp: new Date(),
      });

      return response;
    } catch (err) {
      this.emit('gateway:error', {
        engineId: request.engineId,
        error: (err as Error).message,
        timestamp: new Date(),
      });
      throw err;
    }
  }

  // 流式聊天（SSE）
  async chatStream(
    request: ChatRequest,
    onChunk: (chunk: { content: string; done: boolean }) => void
  ): Promise<void> {
    const scheduler = getEngineScheduler();
    const engine = await scheduler.getById(request.engineId);
    if (!engine) throw new Error(`Engine ${request.engineId} not found`);

    const provider = providersConfig.providers.find((p: any) => p.id === engine.brand);
    if (!provider) throw new Error(`Provider config for ${engine.brand} not found`);

    let apiKey = scheduler.rotateKey(engine);
    if (!apiKey) {
      apiKey = getApiKeyForProvider(engine.brand);
    }
    if (!apiKey) {
      throw new Error(`No API key available for provider ${engine.brand}`);
    }

    this.emit('gateway:stream:start', { engineId: request.engineId });

    const providerRequest = this.convertToProviderFormat(provider, request);
    providerRequest.stream = true;
    const endpoint = this.buildEndpoint(provider, true);
    const headers = this.buildHeaders(provider, apiKey);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(providerRequest),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Provider HTTP ${res.status}: ${text}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Response body unreadable');

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
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (!trimmed.startsWith('data:')) continue;

            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);
              const delta = data.choices?.[0]?.delta;
              const content = delta?.content || delta?.reasoning || '';
              const finishReason = data.choices?.[0]?.finish_reason;

              onChunk({ content, done: !!finishReason });
            } catch {
              // ignore malformed JSON lines
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      onChunk({ content: '', done: true });
      this.emit('gateway:stream:end', { engineId: request.engineId });
    } catch (err) {
      this.emit('gateway:stream:error', {
        engineId: request.engineId,
        error: (err as Error).message,
      });
      throw err;
    }
  }

  // 构建请求端点
  private buildEndpoint(provider: any, stream: boolean): string {
    const base = (provider.baseUrl || '').replace(/\/+$/, '');
    // 本地/基础设施 provider 不支持真实调用
    if (base.startsWith('local://') || base.startsWith('http://localhost')) {
      throw new Error(`Provider ${provider.id} is local-only and does not support remote chat`);
    }
    // OpenAI 兼容格式统一使用 /chat/completions
    if (provider.protocol === 'single-thread' || provider.protocol === 'gateway' || provider.protocol === 'openai-compatible') {
      return `${base}/chat/completions`;
    }
    // 默认 fallback
    return `${base}/chat/completions`;
  }

  // 构建请求头
  private buildHeaders(provider: any, apiKey: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    // 智谱特殊头
    if (provider.id === 'zhipu' || provider.baseUrl?.includes('bigmodel.cn')) {
      // 智谱使用标准 Bearer token，无需额外头
    }

    // Claude 特殊头
    if (provider.id === 'claude' || provider.id === 'anthropic') {
      headers['anthropic-version'] = provider.extraHeaders?.['anthropic-version'] || '2023-06-01';
      headers['x-api-key'] = apiKey;
      delete headers['Authorization'];
    }

    // OpenRouter 额外头
    if (provider.id === 'openrouter' || provider.baseUrl?.includes('openrouter')) {
      headers['HTTP-Referer'] = 'https://bloombloomgarden.vercel.app';
      headers['X-Title'] = 'Thousand Realms Garden';
    }

    // provider 自定义 extraHeaders
    if (provider.extraHeaders) {
      for (const [k, v] of Object.entries(provider.extraHeaders)) {
        headers[k] = v as string;
      }
    }

    return headers;
  }

  // 协议转换：统一格式 → 提供商格式
  private convertToProviderFormat(provider: any, request: ChatRequest): any {
    const body: any = {
      model: request.model || provider.defaultModel,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4096,
      stream: request.stream ?? false,
    };

    // 智谱特殊参数
    if (provider.id === 'zhipu' || provider.baseUrl?.includes('bigmodel.cn')) {
      // 智谱支持标准 OpenAI 格式，无需额外转换
    }

    // Claude 格式转换
    if (provider.id === 'claude' || provider.id === 'anthropic') {
      body.max_tokens = request.maxTokens ?? 4096; // Claude 要求 max_tokens
    }

    return body;
  }

  // 批量调用（用于蜂群协作）
  async batchChat(requests: ChatRequest[]): Promise<ChatResponse[]> {
    return Promise.all(requests.map(r => this.chat(r)));
  }

  // 故障转移调用
  async chatWithFallback(
    primaryEngineId: string,
    fallbackEngineIds: string[],
    request: Omit<ChatRequest, 'engineId'>
  ): Promise<ChatResponse> {
    try {
      return await this.chat({ ...request, engineId: primaryEngineId });
    } catch (err) {
      this.emit('gateway:fallback', { primaryEngineId, error: (err as Error).message });
      for (const fallbackId of fallbackEngineIds) {
        try {
          return await this.chat({ ...request, engineId: fallbackId });
        } catch {
          continue;
        }
      }
      throw new Error('All engines failed');
    }
  }
}

let gatewayService: GatewayService | null = null;
export function getGatewayService(): GatewayService {
  if (!gatewayService) gatewayService = new GatewayService();
  return gatewayService;
}
