/**
 * ResearchLLM — 千界花园学术协作专用 LLM 调用工具
 * 
 * 直接调用智谱 GLM-5.1 / Kimi API，为学术协作系统提供真实 LLM 能力。
 * 不依赖 backend 目录的 LLMClient（避免路径耦合），直接使用 fetch。
 */

export interface ResearchLLMRequest {
  systemPrompt?: string;
  userPrompt: string;
  model?: string;           // default: "glm-5.1"
  temperature?: number;     // default: 0.3（学术任务需要低温度）
  maxTokens?: number;       // default: 4096
  provider?: "zhipu" | "kimi"; // default: "zhipu"
}

export interface ResearchLLMResponse {
  content: string;
  reasoning?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  provider: string;
  latencyMs: number;
  finishReason?: string;
}

/** 从环境变量获取 API Key */
function getApiKey(provider: string): string | undefined {
  const env = process.env;
  if (provider === "zhipu" || provider === "glm") {
    return env.ZHIPU_API_KEY || env.GLM51_API_KEY_1 || env.GLM_API_KEY;
  }
  if (provider === "kimi" || provider === "moonshot") {
    return env.MOONSHOT_API_KEY || env.KIMI_API_KEY;
  }
  return undefined;
}

/** 获取 Provider Endpoint */
function getEndpoint(provider: string): string {
  if (provider === "zhipu" || provider === "glm") {
    return "https://open.bigmodel.cn/api/paas/v4/chat/completions";
  }
  if (provider === "kimi" || provider === "moonshot") {
    return (
      env.KIMI_BASE_URL || "https://api.kimi.com/coding/v1"
    ) + "/chat/completions";
  }
  throw new Error(`Unknown provider: ${provider}`);
}

/** 构建请求体 */
function buildBody(
  req: ResearchLLMRequest,
  apiKey: string
): { body: object; headers: Record<string, string> } {
  const provider = req.provider || "zhipu";
  const model = req.model || "glm-5.1";
  const temperature = req.temperature ?? 0.3;
  const maxTokens = req.maxTokens ?? 4096;

  const messages: Array<{ role: string; content: string }> = [];
  if (req.systemPrompt) {
    messages.push({ role: "system", content: req.systemPrompt });
  }
  messages.push({ role: "user", content: req.userPrompt });

  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  return { body, headers };
}

/** 带重试的 LLM 调用 */
export async function researchChat(
  req: ResearchLLMRequest,
  options?: { maxRetries?: number; baseDelayMs?: number }
): Promise<ResearchLLMResponse> {
  const provider = req.provider || "zhipu";
  const model = req.model || "glm-5.1";
  const maxRetries = options?.maxRetries ?? 2;
  const baseDelayMs = options?.baseDelayMs ?? 1000;

  const apiKey = getApiKey(provider);
  if (!apiKey) {
    throw new Error(
      `No API key for provider ${provider}. Set ZHIPU_API_KEY or MOONSHOT_API_KEY env var.`
    );
  }

  const endpoint = getEndpoint(provider);
  const { body, headers } = buildBody(req, apiKey);

  const start = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const status = res.status;
        const text = await res.text().catch(() => res.statusText);

        // 429/401/500 时重试
        if ((status === 429 || status === 401 || status >= 500) && attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
          console.log(
            `[ResearchLLM] ${provider} retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms (HTTP ${status})`
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw new Error(`LLM API error ${status}: ${text}`);
      }

      const data = (await res.json()) as any;
      const latencyMs = Date.now() - start;

      const choice = data.choices?.[0];
      const message = choice?.message || {};
      const content = message.content || message.reasoning || "";
      const reasoning = message.reasoning || "";

      return {
        content,
        reasoning,
        usage: data.usage
          ? {
              prompt_tokens: data.usage.prompt_tokens ?? 0,
              completion_tokens: data.usage.completion_tokens ?? 0,
              total_tokens: data.usage.total_tokens ?? 0,
            }
          : undefined,
        model: data.model || model,
        provider,
        latencyMs,
        finishReason: choice?.finish_reason,
      };
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error(`LLM call failed after ${maxRetries + 1} attempts`);
}

/** 批量并行调用（用于专家组/竞赛等多成员场景） */
export async function researchChatBatch(
  requests: ResearchLLMRequest[],
  options?: { maxRetries?: number; baseDelayMs?: number; concurrency?: number }
): Promise<ResearchLLMResponse[]> {
  const concurrency = options?.concurrency ?? 3;
  const results: ResearchLLMResponse[] = [];

  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((req) =>
        researchChat(req, options).catch((err) => {
          console.error("[ResearchLLM Batch] error:", err.message);
          return {
            content: `【LLM 调用失败】${err.message}`,
            model: req.model || "glm-5.1",
            provider: req.provider || "zhipu",
            latencyMs: 0,
          } as ResearchLLMResponse;
        })
      )
    );
    results.push(...batchResults);
  }

  return results;
}

/** 健康检查：测试 API Key 是否可用 */
export async function researchLLMHealthCheck(
  provider?: "zhipu" | "kimi"
): Promise<{ ok: boolean; provider: string; model: string; latencyMs: number; error?: string }> {
  const p = provider || "zhipu";
  const start = Date.now();
  try {
    const res = await researchChat({
      provider: p,
      userPrompt: "Hello",
      maxTokens: 10,
    });
    return { ok: true, provider: p, model: res.model, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      provider: p,
      model: "unknown",
      latencyMs: Date.now() - start,
      error: (err as Error).message,
    };
  }
}

const env = process.env;
