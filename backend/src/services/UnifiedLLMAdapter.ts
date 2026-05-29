/**
 * UnifiedLLMAdapter.ts — 统一LLM适配器
 * 支持10大Provider统一调用、指数退避重试、熔断器、流式超时恢复
 * 参考: SYLVA Provider-Deep-Adaptation-v2.md / Portkey.ai / ResilientLLM
 */

import {
  getProviderConfig,
  calculateBackoffDelay,
  estimateTokens,
  checkTokenBudget,
} from './LLMProviderRegistry';

interface LLMRequest {
  provider: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  functions?: any[];
  extra?: Record<string, any>;
  fallbackProviders?: string[]; // 自动降级Provider列表
}

interface LLMResponse {
  content: string;
  reasoning?: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    reasoning_tokens?: number;
  };
  latencyMs: number;
  model: string;
  provider: string;
  finishReason: string;
  status: 'success' | 'partial' | 'error';
  partialContent?: string;
}

// ===================== 熔断器状态 =====================
type CircuitState = 'closed' | 'open' | 'half-open';

interface ProviderError {
  type: 'auth' | 'rate_limit' | 'timeout' | 'server' | 'content_filter' | 'network' | 'unknown';
  status?: number;
  retryable: boolean;
  retryAfterMs?: number;
  message: string;
}

function classifyError(status: number, errorText: string, errName?: string): ProviderError {
  // 429 限流
  if (status === 429) {
    const retryMatch = errorText.match(/retry[_\-]?after[:\s]*(\d+)/i);
    const retryAfter = retryMatch ? parseInt(retryMatch[1]) * 1000 : 5000;
    return { type: 'rate_limit', status, retryable: true, retryAfterMs: retryAfter, message: `Rate limited: ${errorText}` };
  }
  // 401/403 认证
  if (status === 401 || status === 403) {
    return { type: 'auth', status, retryable: false, message: `Auth failed (${status}): ${errorText}` };
  }
  // 408/524 超时
  if (status === 408 || status === 524 || errName === 'AbortError') {
    return { type: 'timeout', status, retryable: true, retryAfterMs: 2000, message: `Request timeout: ${errorText}` };
  }
  // 500/502/503/504 服务端
  if (status >= 500 && status < 600) {
    return { type: 'server', status, retryable: true, retryAfterMs: 3000, message: `Server error (${status}): ${errorText}` };
  }
  // 400 内容过滤
  if (status === 400 && /content_filter|safety|moderation/i.test(errorText)) {
    return { type: 'content_filter', status, retryable: false, message: `Content filtered: ${errorText}` };
  }
  // 网络/其他
  if (!status || errName === 'TypeError' || errName === 'FetchError') {
    return { type: 'network', retryable: true, retryAfterMs: 1000, message: `Network error: ${errorText}` };
  }
  return { type: 'unknown', status, retryable: false, message: `Unknown error (${status}): ${errorText}` };
}

class CircuitBreaker {
  state: CircuitState = 'closed';
  failCount = 0;
  lastFailTime = 0;
  readonly threshold = 5;
  readonly timeoutMs = 30000;
  consecutiveSuccess = 0;

  recordSuccess() {
    this.failCount = 0;
    this.consecutiveSuccess++;
    if (this.state === 'half-open' && this.consecutiveSuccess >= 2) {
      this.state = 'closed';
      this.consecutiveSuccess = 0;
    }
  }

  recordFailure(): boolean {
    this.failCount++;
    this.consecutiveSuccess = 0;
    this.lastFailTime = Date.now();
    if (this.failCount >= this.threshold) {
      this.state = 'open';
      return true;
    }
    return false;
  }

  canExecute(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'half-open') return true;
    if (Date.now() - this.lastFailTime >= this.timeoutMs) {
      this.state = 'half-open';
      return true;
    }
    return false;
  }
}

const circuitBreakers = new Map<string, CircuitBreaker>();

function getCircuitBreaker(provider: string): CircuitBreaker {
  if (!circuitBreakers.has(provider)) {
    circuitBreakers.set(provider, new CircuitBreaker());
  }
  return circuitBreakers.get(provider)!;
}

// ===================== 统一适配器 =====================
export class UnifiedLLMAdapter {
  private apiKeys = new Map<string, string>();

  setApiKey(provider: string, key: string) {
    this.apiKeys.set(provider.toLowerCase(), key);
  }

  getApiKey(provider: string): string | undefined {
    return this.apiKeys.get(provider.toLowerCase());
  }

  // ── 主调用入口（增强版：自动Fallback降级）─────────────────────
  async chat(request: LLMRequest): Promise<LLMResponse> {
    const providers = [request.provider, ...(request.fallbackProviders || [])];
    let lastError: any;

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const config = getProviderConfig(provider);
      if (!config) {
        if (i === 0) throw new Error(`Unknown provider: ${provider}`);
        continue;
      }

      // 熔断器检查
      const cb = getCircuitBreaker(provider);
      if (!cb.canExecute()) {
        console.warn(`[Fallback] ${provider} circuit open, trying next...`);
        lastError = new Error(`Circuit breaker OPEN for provider: ${provider}`);
        continue;
      }

      // Token预算预检查
      const inputText = request.messages.map(m => m.content).join('\n');
      const tokenCheck = checkTokenBudget(inputText, request.max_tokens ?? 1500, request.max_tokens ?? 8192);
      if (!tokenCheck.ok) {
        throw new Error(`Token budget exceeded: estimated ${tokenCheck.total} > max ${request.max_tokens}`);
      }

      // 构建请求体
      const body = this.buildRequestBody(config, request);
      const headers = this.buildHeaders(config);
      const url = this.buildEndpoint(config, request.model);

      const startTime = Date.now();

      try {
        const response = await this.executeWithRetry(config, url, headers, body, { ...request, provider });
        const latencyMs = Date.now() - startTime;

        // 解析响应
        const parsed = this.parseResponse(config, response, { ...request, provider });
        const llmResponse: LLMResponse = {
          ...parsed,
          latencyMs,
          model: request.model,
          provider,
          status: 'success',
        };

        cb.recordSuccess();
        if (i > 0) {
          console.warn(`[Fallback] Successfully recovered using ${provider}`);
        }
        return llmResponse;
      } catch (error: any) {
        const isNewlyBroken = cb.recordFailure();
        if (isNewlyBroken) {
          console.warn(`[CircuitBreaker] ${provider} 进入熔断状态`);
        }
        lastError = error;
        // 如果是认证错误，不再fallback（换Provider也没用，通常是key问题）
        if (error?.message?.includes('[AUTH]')) {
          throw error;
        }
        // 内容过滤错误也不再fallback
        if (error?.message?.includes('[CONTENT_FILTER]')) {
          throw error;
        }
        console.warn(`[Fallback] ${provider} failed, trying next... (${error.message})`);
      }
    }

    throw lastError || new Error('All providers and fallbacks exhausted');
  }

  // ── 带重试的执行（增强版：智能退避 + 错误分类 + 降级恢复）────────────────
  private async executeWithRetry(
    config: any,
    url: string,
    headers: Record<string, string>,
    body: any,
    request: LLMRequest,
    maxRetries = 3
  ): Promise<any> {
    let lastError: ProviderError | null = null;
    const provider = request.provider;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutMs = this.getTimeout(config, request);
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const resp = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!resp.ok) {
          const errorText = await resp.text().catch(() => '');
          const classified = classifyError(resp.status, errorText);

          // 不可重试的错误直接抛出
          if (!classified.retryable) {
            throw classified;
          }

          // 429 特殊处理：使用Retry-After
          if (classified.type === 'rate_limit' && resp.headers.get('retry-after')) {
            classified.retryAfterMs = parseInt(resp.headers.get('retry-after')!) * 1000;
          }

          throw classified;
        }

        return await resp.json();
      } catch (err: any) {
        // 标准化错误
        let pError: ProviderError;
        if (err?.type && ['auth', 'rate_limit', 'timeout', 'server', 'content_filter', 'network', 'unknown'].includes(err.type)) {
          pError = err;
        } else {
          pError = classifyError(0, err.message || String(err), err.name);
        }
        lastError = pError;

        // 记录错误日志
        console.warn(`[UnifiedLLMAdapter] ${provider} attempt ${attempt}/${maxRetries + 1} failed: ${pError.type} (${pError.message})`);

        // 非重试错误直接终止
        if (!pError.retryable || attempt > maxRetries) {
          break;
        }

        // 智能退避：优先使用错误建议的等待时间，其次指数退避
        const baseDelay = pError.retryAfterMs || calculateBackoffDelay(attempt);
        // 添加±20%抖动避免惊群
        const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1);
        const delay = Math.max(500, Math.floor(baseDelay + jitter));

        console.log(`[Retry] ${provider} waiting ${delay}ms before attempt ${attempt + 1}`);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    // 构造最终错误
    const finalError = lastError || { type: 'unknown', retryable: false, message: 'All retries exhausted' };
    throw new Error(`[${finalError.type.toUpperCase()}] ${finalError.message}`);
  }

  // ── 构建请求体 ──────────────────────────────────────────────
  private buildRequestBody(config: any, request: LLMRequest): any {
    const opt = config.optimization;

    // 使用Provider自定义的requestFormatter
    if (opt.requestFormatter) {
      return opt.requestFormatter(request.messages, {
        model: request.model,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        stream: request.stream ?? opt.streamingPreferred,
        ...request.extra,
      });
    }

    // 默认OpenAI兼容格式
    const body: any = {
      model: request.model,
      messages: request.messages,
    };

    if (!isParamForbidden(config.id, 'temperature') && request.temperature !== undefined) {
      body.temperature = request.temperature;
    }
    if (request.max_tokens) {
      body.max_tokens = request.max_tokens;
    }
    if (request.functions) {
      body.tools = request.functions.map((f: any) => ({
        type: 'function',
        function: f,
      }));
    }
    if (request.stream ?? opt.streamingPreferred) {
      body.stream = true;
    }

    return body;
  }

  // ── 构建Headers ─────────────────────────────────────────────
  private buildHeaders(config: any): Record<string, string> {
    const apiKey = this.getApiKey(config.id);
    if (!apiKey) {
      throw new Error(`API key not set for provider: ${config.id}`);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.optimization.customHeaders,
    };

    // Auth
    if (config.authType === 'bearer') {
      headers[config.authHeaderName] = `Bearer ${apiKey}`;
    } else if (config.authType === 'api_key') {
      headers[config.authHeaderName] = apiKey;
    }

    return headers;
  }

  // ── 构建Endpoint ──────────────────────────────────────────
  private buildEndpoint(config: any, model: string): string {
    if (config.optimization.endpointFormatter) {
      return config.optimization.endpointFormatter(config.baseUrl, model);
    }
    return `${config.baseUrl}/chat/completions`;
  }

  // ── 解析响应 ────────────────────────────────────────────────
  private parseResponse(config: any, response: any, request: LLMRequest): { content: string; reasoning?: string; usage: any; finishReason: string } {
    const opt = config.optimization;

    // 使用Provider自定义的responseParser
    if (opt.responseParser) {
      return opt.responseParser(response);
    }

    // 默认OpenAI兼容格式
    const choice = response.choices?.[0];
    const msg = choice?.message;
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    let content = msg?.content || '';
    let reasoning = '';

    // 提取reasoning字段
    if (opt.reasoningField && msg) {
      reasoning = msg[opt.reasoningField] || '';
    }

    // 合并策略
    if (opt.mergeStrategy === 'concat' && reasoning) {
      content = reasoning + (content ? '\n\n' + content : '');
    }

    // 更新usage中的reasoning_tokens
    if (reasoning) {
      const reasoningTokens = estimateTokens(reasoning);
      usage.reasoning_tokens = reasoningTokens;
    }

    return {
      content,
      reasoning: opt.mergeStrategy === 'separate' ? reasoning : undefined,
      usage,
      finishReason: choice?.finish_reason || 'stop',
    };
  }

  // ── 获取超时时间 ─────────────────────────────────────────────
  private getTimeout(config: any, request: LLMRequest): number {
    // 根据task类型推断：简单判断代码生成任务
    const isCode = request.messages.some(m =>
      m.content.includes('```') ||
      m.content.includes('代码') ||
      m.content.includes('function') ||
      m.content.includes('class')
    );
    const isLong = (request.max_tokens ?? 0) > 3000;
    const taskType: 'simple' | 'normal' | 'code' | 'long' =
      isLong ? 'long' : isCode ? 'code' : 'normal';

    return (config.optimization.timeouts[taskType] ?? 60) * 1000;
  }
}

// ===================== 工具导出 =====================

function isParamForbidden(providerId: string, param: string): boolean {
  const config = getProviderConfig(providerId);
  return config?.optimization.forbiddenParams.includes(param) ?? false;
}