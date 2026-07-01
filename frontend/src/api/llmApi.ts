/**
 * llmApi.ts — 通用 OpenAI 兼容 LLM API 客户端
 * 支持前端直连模式，SSE 流式输出
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: any[];
}

export interface LLMConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
  provider: 'openai' | 'kimi' | 'deepseek' | 'zhipu' | 'anthropic' | 'custom';
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  timeout?: number;
}

export interface LLMResponseChunk {
  content: string;
  done: boolean;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  model?: string;
}

export interface LLMStreamCallbacks {
  onChunk: (chunk: LLMResponseChunk) => void;
  onError?: (error: Error) => void;
  onComplete?: (fullText: string) => void;
}

// Provider 默认配置
const PROVIDER_DEFAULTS: Record<string, { baseURL: string; model: string }> = {
  openai: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o' },
  kimi: { baseURL: 'https://api.moonshot.cn/v1', model: 'kimi-latest' },
  deepseek: { baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  zhipu: { baseURL: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  anthropic: { baseURL: 'https://api.anthropic.com/v1', model: 'claude-3-5-sonnet-20241022' },
};

function getHeaders(config: LLMConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  switch (config.provider) {
    case 'anthropic':
      headers['x-api-key'] = config.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      break;
    case 'zhipu':
      headers['Authorization'] = `Bearer ${config.apiKey}`;
      break;
    default:
      headers['Authorization'] = `Bearer ${config.apiKey}`;
      break;
  }

  return headers;
}

function buildRequestBody(config: LLMConfig, messages: LLMMessage[]): any {
  const baseURL = config.baseURL || PROVIDER_DEFAULTS[config.provider]?.baseURL;
  const isAnthropic = config.provider === 'anthropic';

  if (isAnthropic) {
    return {
      model: config.model,
      messages: messages.filter((m) => m.role !== 'system'),
      system: messages.find((m) => m.role === 'system')?.content,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature,
      top_p: config.topP,
      stream: true,
    };
  }

  return {
    model: config.model,
    messages,
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens || 4096,
    top_p: config.topP ?? 1,
    stream: true,
  };
}

function getChatEndpoint(config: LLMConfig): string {
  const baseURL = config.baseURL || PROVIDER_DEFAULTS[config.provider]?.baseURL;

  if (config.provider === 'anthropic') {
    return `${baseURL}/messages`;
  }
  return `${baseURL}/chat/completions`;
}

/**
 * SSE 流式聊天
 */
export async function chatStream(
  config: LLMConfig,
  messages: LLMMessage[],
  callbacks: LLMStreamCallbacks,
): Promise<void> {
  const { onChunk, onError, onComplete } = callbacks;
  const abortController = new AbortController();
  const timeout = config.timeout || 120000;

  const timeoutId = setTimeout(() => {
    abortController.abort();
    onError?.(new Error('Request timeout'));
  }, timeout);

  try {
    const endpoint = getChatEndpoint(config);
    const body = buildRequestBody(config, messages);
    const headers = getHeaders(config);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

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

        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          let content = '';
          let finishReason = null;

          if (config.provider === 'anthropic') {
            // Anthropic SSE format
            if (parsed.type === 'content_block_delta') {
              content = parsed.delta?.text || '';
            } else if (parsed.type === 'message_stop') {
              finishReason = 'stop';
            }
          } else {
            // OpenAI compatible format
            const delta = parsed.choices?.[0]?.delta;
            content = delta?.content || '';
            finishReason = parsed.choices?.[0]?.finish_reason;
          }

          if (content) {
            fullText += content;
            onChunk({ content, done: false });
          }

          if (finishReason) {
            onChunk({ content: '', done: true, usage: parsed.usage, model: parsed.model });
          }
        } catch (e) {
          // 忽略解析失败的行
        }
      }
    }

    onComplete?.(fullText);
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      onError?.(err);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 非流式聊天（一次性返回）
 */
export async function chat(
  config: LLMConfig,
  messages: LLMMessage[],
): Promise<{ content: string; usage?: any; model?: string }> {
  return new Promise((resolve, reject) => {
    let fullText = '';

    chatStream(config, messages, {
      onChunk: (chunk) => {
        if (!chunk.done) {
          fullText += chunk.content;
        }
      },
      onError: reject,
      onComplete: (text) => {
        resolve({ content: text || fullText });
      },
    }).catch(reject);
  });
}

/**
 * 检测 Provider 可用性
 */
export async function testProvider(config: LLMConfig): Promise<{ ok: boolean; latency: number; error?: string }> {
  const start = performance.now();
  try {
    const endpoint = getChatEndpoint(config);
    const headers = getHeaders(config);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    });

    const latency = Math.round(performance.now() - start);
    if (response.ok) {
      return { ok: true, latency };
    }
    const errorText = await response.text().catch(() => 'Unknown');
    return { ok: false, latency, error: `HTTP ${response.status}: ${errorText}` };
  } catch (err: any) {
    return { ok: false, latency: Math.round(performance.now() - start), error: err.message };
  }
}

/**
 * 获取 Provider 默认配置
 */
export function getProviderDefaults(provider: string): { baseURL: string; model: string } | null {
  return PROVIDER_DEFAULTS[provider] || null;
}

/**
 * 支持的 Provider 列表
 */
export const SUPPORTED_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'] },
  { id: 'kimi', name: 'Moonshot/Kimi', models: ['kimi-latest', 'kimi-k2'] },
  { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'zhipu', name: '智谱AI', models: ['glm-4-flash', 'glm-4-plus', 'glm-5.1'] },
  { id: 'anthropic', name: 'Anthropic', models: ['claude-3-5-sonnet', 'claude-3-opus'] },
  { id: 'custom', name: '自定义', models: ['custom'] },
];
