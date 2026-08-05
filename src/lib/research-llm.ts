/**
 * ResearchLLM — 千界花园学术协作专用 LLM 调用工具
 *
 * Provider 优先级（救援方案）：
 *   1. Kimi 网关（process.env.KIMI_API_KEY / KIMI_BASE_URL，model=kimi-for-coding，temperature 固定 1）
 *   2. 智谱 GLM-5.1（fallback，ZHIPU_API_KEY / GLM51_API_KEY_1 / GLM_API_KEY）
 *
 * 不依赖 backend 目录的 LLMClient（避免路径耦合），直接使用 fetch。
 */

import { getKimiGateway } from "./kimi-gateway";

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

/** 候选调用通道 */
interface LLMCandidate {
  provider: string;
  endpoint: string;
  apiKey: string;
  model: string;
  temperature: number;
}

/**
 * 解析候选通道：Kimi 网关（环境变量可用时）永远排第一，
 * 随后是调用方指定（或默认）的 GLM 通道作为 fallback。
 */
function resolveCandidates(req: ResearchLLMRequest): LLMCandidate[] {
  const env = process.env;
  const list: LLMCandidate[] = [];

  const kimi = getKimiGateway();
  if (kimi) {
    list.push({
      provider: "kimi",
      endpoint: kimi.chatUrl,
      apiKey: kimi.apiKey,
      model: kimi.model,          // 网关只服务 kimi-for-coding
      temperature: 1,             // 网关仅允许 temperature=1
    });
  }

  // fallback：调用方指定 provider，默认 zhipu/GLM
  const requested = req.provider || "zhipu";
  if (requested !== "kimi" && requested !== "moonshot") {
    const glmKey = env.ZHIPU_API_KEY || env.GLM51_API_KEY_1 || env.GLM_API_KEY;
    if (glmKey) {
      list.push({
        provider: "zhipu",
        endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        apiKey: glmKey,
        model: req.model || "glm-5.1",
        temperature: req.temperature ?? 0.3,
      });
    }
  } else if (list.length === 0) {
    // 显式要求 kimi/moonshot 但无网关环境变量：尝试公开 Moonshot 端点
    const mk = env.MOONSHOT_API_KEY;
    if (mk) {
      list.push({
        provider: "moonshot",
        endpoint: "https://api.moonshot.cn/v1/chat/completions",
        apiKey: mk,
        model: req.model || "kimi-k2-0905-preview",
        temperature: req.temperature ?? 0.3,
      });
    }
  }

  return list;
}

/** 带重试的 LLM 调用（Kimi 网关优先，GLM fallback） */
export async function researchChat(
  req: ResearchLLMRequest,
  options?: { maxRetries?: number; baseDelayMs?: number }
): Promise<ResearchLLMResponse> {
  const maxRetries = options?.maxRetries ?? 2;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const maxTokens = req.maxTokens ?? 4096;

  const messages: Array<{ role: string; content: string }> = [];
  if (req.systemPrompt) {
    messages.push({ role: "system", content: req.systemPrompt });
  }
  messages.push({ role: "user", content: req.userPrompt });

  const candidates = resolveCandidates(req);
  if (candidates.length === 0) {
    throw new Error(
      "No LLM provider available. Set KIMI_API_KEY + KIMI_BASE_URL (preferred) or ZHIPU_API_KEY env vars."
    );
  }

  let lastError: Error | null = null;

  for (const cand of candidates) {
    const body = {
      model: cand.model,
      messages,
      temperature: cand.temperature,
      max_tokens: maxTokens,
    };
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cand.apiKey}`,
    };
    const start = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(cand.endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const status = res.status;
          const text = await res.text().catch(() => res.statusText);

          // 429/401/500 时重试（不打印任何密钥信息）
          if ((status === 429 || status === 401 || status >= 500) && attempt < maxRetries) {
            const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
            console.log(
              `[ResearchLLM] ${cand.provider} retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms (HTTP ${status})`
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw new Error(`LLM API error ${status}: ${text.slice(0, 300)}`);
        }

        const data = (await res.json()) as any;
        const latencyMs = Date.now() - start;

        const choice = data.choices?.[0];
        const message = choice?.message || {};
        // Kimi 网关响应含 reasoning_content 字段
        const content = message.content || message.reasoning_content || message.reasoning || "";
        const reasoning = message.reasoning_content || message.reasoning || "";

        if (cand.provider !== candidates[0]?.provider || candidates.length > 1) {
          console.log(`[ResearchLLM] answered by provider=${cand.provider} model=${data.model || cand.model} latency=${latencyMs}ms`);
        }

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
          model: data.model || cand.model,
          provider: cand.provider,
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
    // 当前候选通道彻底失败，切换到下一个候选（fallback）
    console.warn(`[ResearchLLM] provider ${cand.provider} failed, trying next candidate if any.`);
  }

  throw lastError || new Error(`LLM call failed on all providers`);
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

/** 健康检查：测试 LLM 通道是否可用（Kimi 网关优先） */
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
    return { ok: true, provider: res.provider, model: res.model, latencyMs: Date.now() - start };
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
