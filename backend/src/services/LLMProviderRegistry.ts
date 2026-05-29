/**
 * LLMProviderRegistry.ts — 10大Provider统一注册与配置管理
 * 包含: OpenAI / Azure / Anthropic / DeepSeek / Moonshot / Kimi Code / Qwen / Gemini / GLM / OpenRouter
 * 参考: SYLVA Provider-Deep-Adaptation-v2.md 配置
 */

export interface ProviderOptimization {
  customHeaders: Record<string, string>;
  reasoningField: string | null;        // 'reasoning_content' | 'thinking' | 'reasoning' | null
  mergeStrategy: 'concat' | 'ignore' | 'separate';
  tokenBudgets: { simple: number; normal: number; code: number; long: number };
  timeouts: { simple: number; normal: number; code: number; long: number };
  streamingSupported: boolean;
  streamingPreferred: boolean;
  forbiddenParams: string[];
  requiredParams: string[];
  // 特殊适配
  endpointFormatter?: (baseUrl: string, model: string) => string;
  requestFormatter?: (messages: any[], options: any) => any;
  responseParser?: (response: any) => { content: string; reasoning?: string; usage: any };
}

export interface ProviderConfig {
  id: string;
  name: string;
  displayName: string;
  category: 'commercial' | 'open_source' | 'local' | 'aggregator';
  baseUrl: string;
  defaultModel: string;
  availableModels: string[];
  optimization: ProviderOptimization;
  authType: 'bearer' | 'api_key' | 'custom';
  authHeaderName: string;
  requiresUserAgent?: boolean;
  supportsSystemPrompt: boolean;
  supportsFunctions: boolean;
  supportsVision: boolean;
}

// ===================== 10 Provider 完整配置 =====================

export const PROVIDER_REGISTRY: Record<string, ProviderConfig> = {
  // ─── 1. OpenAI ───────────────────────────────────────────────
  openai: {
    id: 'openai',
    name: 'openai',
    displayName: 'OpenAI',
    category: 'commercial',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    availableModels: ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini', 'o3-mini', 'gpt-4-turbo'],
    optimization: {
      customHeaders: {},
      reasoningField: null,
      mergeStrategy: 'ignore',
      tokenBudgets: { simple: 500, normal: 1500, code: 4000, long: 4000 },
      timeouts: { simple: 30, normal: 60, code: 60, long: 90 },
      streamingSupported: true,
      streamingPreferred: true,
      forbiddenParams: ['temperature', 'top_p'], // o1/o3 禁用
      requiredParams: [],
      requestFormatter: (messages, options) => {
        const isO1 = options.model?.startsWith('o1') || options.model?.startsWith('o3');
        const body: any = {
          model: options.model || 'gpt-4o',
          messages,
          stream: options.stream ?? true,
        };
        if (!isO1) {
          body.temperature = options.temperature ?? 0.7;
          body.top_p = options.top_p ?? 1;
        }
        if (isO1) {
          body.max_completion_tokens = options.max_tokens ?? 4000;
        } else {
          body.max_tokens = options.max_tokens ?? 4000;
        }
        return body;
      },
    },
    authType: 'bearer',
    authHeaderName: 'Authorization',
    supportsSystemPrompt: true,
    supportsFunctions: true,
    supportsVision: true,
  },

  // ─── 2. Azure OpenAI ─────────────────────────────────────────
  azure: {
    id: 'azure',
    name: 'azure',
    displayName: 'Azure OpenAI',
    category: 'commercial',
    baseUrl: 'https://{resource}.openai.azure.com',
    defaultModel: 'gpt-4',
    availableModels: ['gpt-4', 'gpt-4-turbo', 'gpt-35-turbo'],
    optimization: {
      customHeaders: {},
      reasoningField: null,
      mergeStrategy: 'ignore',
      tokenBudgets: { simple: 500, normal: 1500, code: 4000, long: 4000 },
      timeouts: { simple: 30, normal: 60, code: 60, long: 90 },
      streamingSupported: true,
      streamingPreferred: true,
      forbiddenParams: [],
      requiredParams: [],
      endpointFormatter: (baseUrl, model) => {
        // Azure 需要动态拼接: /openai/deployments/{deployment}/chat/completions?api-version=2024-06-01
        return `${baseUrl}/openai/deployments/${model}/chat/completions?api-version=2024-06-01`;
      },
    },
    authType: 'api_key',
    authHeaderName: 'api-key',
    supportsSystemPrompt: true,
    supportsFunctions: true,
    supportsVision: true,
  },

  // ─── 3. Anthropic Claude ─────────────────────────────────────
  anthropic: {
    id: 'anthropic',
    name: 'anthropic',
    displayName: 'Anthropic Claude',
    category: 'commercial',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    availableModels: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    optimization: {
      customHeaders: { 'anthropic-version': '2023-06-01' },
      reasoningField: 'thinking', // content块中的thinking
      mergeStrategy: 'separate',   // thinking和content分开保留
      tokenBudgets: { simple: 500, normal: 1500, code: 4000, long: 4000 },
      timeouts: { simple: 30, normal: 60, code: 90, long: 120 },
      streamingSupported: true,
      streamingPreferred: true,
      forbiddenParams: [],
      requiredParams: ['system'], // 顶层system字段
      requestFormatter: (messages, options) => {
        const systemMsg = messages.find((m: any) => m.role === 'system');
        const chatMessages = messages.filter((m: any) => m.role !== 'system');
        const body: any = {
          model: options.model || 'claude-3-5-sonnet-20241022',
          messages: chatMessages,
          max_tokens: options.max_tokens ?? 4096,
          stream: options.stream ?? true,
        };
        if (systemMsg) {
          body.system = systemMsg.content;
        }
        if (options.thinking) {
          body.thinking = { type: 'enabled', budget_tokens: 16000 };
        }
        return body;
      },
      responseParser: (response) => {
        const content = response.content
          ?.filter((c: any) => c.type === 'text')
          ?.map((c: any) => c.text)
          ?.join('') || '';
        const thinking = response.content
          ?.filter((c: any) => c.type === 'thinking')
          ?.map((c: any) => c.thinking)
          ?.join('') || '';
        return { content, reasoning: thinking, usage: response.usage };
      },
    },
    authType: 'bearer',
    authHeaderName: 'x-api-key',
    supportsSystemPrompt: true,
    supportsFunctions: false, // Claude用tool_use
    supportsVision: true,
  },

  // ─── 4. DeepSeek ─────────────────────────────────────────────
  deepseek: {
    id: 'deepseek',
    name: 'deepseek',
    displayName: 'DeepSeek',
    category: 'commercial',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    availableModels: ['deepseek-chat', 'deepseek-reasoner'],
    optimization: {
      customHeaders: {},
      reasoningField: 'reasoning_content', // 和Kimi Code一致
      mergeStrategy: 'concat',
      tokenBudgets: { simple: 500, normal: 1500, code: 4000, long: 4000 },
      timeouts: { simple: 30, normal: 60, code: 120, long: 120 },
      streamingSupported: true,
      streamingPreferred: true,
      forbiddenParams: [],
      requiredParams: [],
      responseParser: (response) => {
        const msg = response.choices?.[0]?.message;
        return {
          content: msg?.content || '',
          reasoning: msg?.reasoning_content || '',
          usage: response.usage,
        };
      },
    },
    authType: 'bearer',
    authHeaderName: 'Authorization',
    supportsSystemPrompt: true,
    supportsFunctions: true,
    supportsVision: false,
  },

  // ─── 5. Moonshot (Kimi) ──────────────────────────────────────
  moonshot: {
    id: 'moonshot',
    name: 'moonshot',
    displayName: 'Moonshot (Kimi)',
    category: 'commercial',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-128k',
    availableModels: ['moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k'],
    optimization: {
      customHeaders: {},
      reasoningField: 'reasoning_content', // enable_thinking=true时
      mergeStrategy: 'concat',
      tokenBudgets: { simple: 500, normal: 1500, code: 4000, long: 4000 },
      timeouts: { simple: 30, normal: 60, code: 120, long: 120 },
      streamingSupported: true,
      streamingPreferred: true,
      forbiddenParams: [],
      requiredParams: [],
    },
    authType: 'bearer',
    authHeaderName: 'Authorization',
    supportsSystemPrompt: true,
    supportsFunctions: true,
    supportsVision: false,
  },

  // ─── 6. Kimi Code (CLI) ──────────────────────────────────────
  'kimi-code': {
    id: 'kimi-code',
    name: 'kimi-code',
    displayName: 'Kimi Code (CLI)',
    category: 'commercial',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'kimi-k2-code',
    availableModels: ['kimi-k2-code'],
    optimization: {
      customHeaders: {
        'User-Agent': 'claude-code/0.7.8',
        'X-Msh-Device-Id': 'kimi-code-client',
      },
      reasoningField: 'reasoning_content',
      mergeStrategy: 'concat',
      tokenBudgets: { simple: 500, normal: 1500, code: 4000, long: 4000 },
      timeouts: { simple: 30, normal: 60, code: 120, long: 120 },
      streamingSupported: true,
      streamingPreferred: true,
      forbiddenParams: [],
      requiredParams: [],
      requestFormatter: (messages, options) => {
        // Kimi Code 需要 content + reasoning_content 合并
        return {
          model: options.model || 'kimi-k2-code',
          messages,
          stream: options.stream ?? true,
          max_tokens: options.max_tokens ?? 4000,
          temperature: options.temperature ?? 0.7,
        };
      },
      responseParser: (response) => {
        const msg = response.choices?.[0]?.message;
        const content = msg?.content || '';
        const reasoning = msg?.reasoning_content || '';
        // 合并策略
        const merged = reasoning ? `${reasoning}\n\n${content}` : content;
        return {
          content: merged,
          reasoning,
          usage: response.usage,
        };
      },
    },
    authType: 'bearer',
    authHeaderName: 'Authorization',
    requiresUserAgent: true,
    supportsSystemPrompt: true,
    supportsFunctions: true,
    supportsVision: false,
  },

  // ─── 7. Qwen (阿里通义千问) ──────────────────────────────────
  qwen: {
    id: 'qwen',
    name: 'qwen',
    displayName: 'Qwen (通义千问)',
    category: 'commercial',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-max',
    availableModels: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
    optimization: {
      customHeaders: {},
      reasoningField: 'reasoning_content', // enable_thinking=true时
      mergeStrategy: 'concat',
      tokenBudgets: { simple: 500, normal: 1500, code: 4000, long: 4000 },
      timeouts: { simple: 30, normal: 60, code: 120, long: 120 },
      streamingSupported: true,
      streamingPreferred: true,
      forbiddenParams: [],
      requiredParams: [],
    },
    authType: 'bearer',
    authHeaderName: 'Authorization',
    supportsSystemPrompt: true,
    supportsFunctions: true,
    supportsVision: true,
  },

  // ─── 8. Gemini (Google) ──────────────────────────────────────
  gemini: {
    id: 'gemini',
    name: 'gemini',
    displayName: 'Google Gemini',
    category: 'commercial',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-1.5-pro',
    availableModels: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro-latest'],
    optimization: {
      customHeaders: {},
      reasoningField: null,
      mergeStrategy: 'ignore',
      tokenBudgets: { simple: 500, normal: 1500, code: 4096, long: 4096 },
      timeouts: { simple: 30, normal: 60, code: 60, long: 90 },
      streamingSupported: true,
      streamingPreferred: true,
      forbiddenParams: [],
      requiredParams: ['systemInstruction', 'contents'],
      endpointFormatter: (baseUrl, model) => {
        // Gemini 使用 streamGenerateContent 方法
        return `${baseUrl}/models/${model}:streamGenerateContent`;
      },
      requestFormatter: (messages, options) => {
        const systemMsg = messages.find((m: any) => m.role === 'system');
        const chatMessages = messages.filter((m: any) => m.role !== 'system');
        const body: any = {
          contents: chatMessages.map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            maxOutputTokens: options.max_tokens ?? 4096,
            temperature: options.temperature ?? 0.7,
          },
        };
        if (systemMsg) {
          body.systemInstruction = { parts: [{ text: systemMsg.content }] };
        }
        if (options.thinkingBudget) {
          body.generationConfig.thinkingBudget = options.thinkingBudget;
        }
        // Grounding
        if (options.grounding) {
          body.tools = [{ google_search: {} }];
        }
        return body;
      },
      responseParser: (response) => {
        const candidate = response.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const text = parts
          .filter((p: any) => p.text)
          .map((p: any) => p.text)
          .join('');
        const thinking = parts
          .filter((p: any) => p.thought)
          .map((p: any) => p.thought)
          .join('');
        return {
          content: text,
          reasoning: thinking,
          usage: {
            prompt_tokens: response.usageMetadata?.promptTokenCount || 0,
            completion_tokens: response.usageMetadata?.candidatesTokenCount || 0,
            total_tokens: response.usageMetadata?.totalTokenCount || 0,
          },
        };
      },
    },
    authType: 'api_key', // ?key=xxx query param
    authHeaderName: 'key',
    supportsSystemPrompt: true,
    supportsFunctions: true,
    supportsVision: true,
  },

  // ─── 9. GLM (智谱清言) ───────────────────────────────────────
  glm: {
    id: 'glm',
    name: 'glm',
    displayName: 'GLM (智谱)',
    category: 'commercial',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-plus',
    availableModels: ['glm-4-plus', 'glm-4-flash', 'glm-4-long', 'glm-4v-plus'],
    optimization: {
      customHeaders: {},
      reasoningField: null,
      mergeStrategy: 'ignore',
      tokenBudgets: { simple: 500, normal: 1500, code: 4000, long: 4000 },
      timeouts: { simple: 30, normal: 60, code: 60, long: 90 },
      streamingSupported: true,
      streamingPreferred: true,
      forbiddenParams: [],
      requiredParams: [],
      // GLM 最接近标准 OpenAI 格式，直接透传
      requestFormatter: (messages, options) => ({
        model: options.model || 'glm-4-plus',
        messages,
        stream: options.stream ?? true,
        max_tokens: options.max_tokens ?? 4000,
        temperature: options.temperature ?? 0.7,
      }),
    },
    authType: 'bearer',
    authHeaderName: 'Authorization',
    supportsSystemPrompt: true,
    supportsFunctions: true,
    supportsVision: true,
  },

  // ─── 10. OpenRouter ──────────────────────────────────────────
  openrouter: {
    id: 'openrouter',
    name: 'openrouter',
    displayName: 'OpenRouter',
    category: 'aggregator',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/auto',
    availableModels: ['openrouter/auto'],
    optimization: {
      customHeaders: {
        'HTTP-Referer': 'https://thousand-realms.garden',
        'X-Title': '千界花园',
      },
      reasoningField: 'reasoning', // choices[0].message.reasoning
      mergeStrategy: 'concat',
      tokenBudgets: { simple: 500, normal: 1500, code: 4000, long: 4000 },
      timeouts: { simple: 30, normal: 60, code: 120, long: 120 },
      streamingSupported: true,
      streamingPreferred: true,
      forbiddenParams: [],
      requiredParams: [],
      requestFormatter: (messages, options) => {
        const body: any = {
          model: options.model || 'openrouter/auto',
          messages,
          stream: options.stream ?? true,
          max_tokens: options.max_tokens ?? 4000,
          temperature: options.temperature ?? 0.7,
          extra_body: {},
        };
        // Provider 排序 + fallback
        if (options.providerOrder) {
          body.extra_body.provider = {
            order: options.providerOrder,
            allow_fallbacks: options.allowFallbacks ?? true,
          };
        }
        if (options.includeReasoning) {
          body.extra_body.include_reasoning = true;
        }
        return body;
      },
      responseParser: (response) => {
        const msg = response.choices?.[0]?.message;
        return {
          content: msg?.content || '',
          reasoning: msg?.reasoning || '',
          usage: response.usage,
        };
      },
    },
    authType: 'bearer',
    authHeaderName: 'Authorization',
    supportsSystemPrompt: true,
    supportsFunctions: true,
    supportsVision: true,
  },
};

// ===================== 工具函数 =====================

export function getProviderConfig(providerId: string): ProviderConfig | undefined {
  return PROVIDER_REGISTRY[providerId.toLowerCase()];
}

export function getAllProviders(): ProviderConfig[] {
  return Object.values(PROVIDER_REGISTRY);
}

export function getProvidersByCategory(category: ProviderConfig['category']): ProviderConfig[] {
  return Object.values(PROVIDER_REGISTRY).filter(p => p.category === category);
}

export function getRecommendedTimeout(providerId: string, taskType: 'simple' | 'normal' | 'code' | 'long'): number {
  const config = getProviderConfig(providerId);
  return config?.optimization.timeouts[taskType] ?? 60;
}

export function getRecommendedMaxTokens(providerId: string, taskType: 'simple' | 'normal' | 'code' | 'long'): number {
  const config = getProviderConfig(providerId);
  return config?.optimization.tokenBudgets[taskType] ?? 1500;
}

export function shouldMergeReasoning(providerId: string): boolean {
  const config = getProviderConfig(providerId);
  return config?.optimization.mergeStrategy === 'concat';
}

export function isParamForbidden(providerId: string, param: string): boolean {
  const config = getProviderConfig(providerId);
  return config?.optimization.forbiddenParams.includes(param) ?? false;
}

// 指数退避重试延迟计算（来自 Portkey/ResilientLLM）
export function calculateBackoffDelay(attempt: number): number {
  const baseDelay = 1000;
  const maxDelay = 16000;
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  const jitter = delay * 0.25;
  return delay + (Math.random() * 2 - 1) * jitter;
}

// Token 预估（来自 llm-api / Fenic）
export function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars * 1.5 + otherChars * 1);
}

// 检查Token预算是否足够
export function checkTokenBudget(inputText: string, expectedOutput: number, maxTokens: number): { ok: boolean; estimatedInput: number; total: number } {
  const estimatedInput = estimateTokens(inputText);
  const total = estimatedInput + expectedOutput;
  return { ok: total <= maxTokens, estimatedInput, total };
}
