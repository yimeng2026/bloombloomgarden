/** Kimi-native research calls with optional, explicitly selected external providers. */

import { getKimiGateway, kimiChat, type KimiChatResponse } from "./kimi-gateway";
import { requireLlmText } from "./llm-content";
import { getPool, poolChat } from "./provider-pool";

export interface ResearchLLMRequest {
  systemPrompt?: string;
  userPrompt: string;
  /** Compatibility field for Kimi; an external model requires an explicit external provider. */
  model?: string;
  /** Compatibility field for Kimi; external models obey their own model policy. */
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** 外部 Provider 最多尝试几枚密钥；数学等限时任务可设为 1，缺省保留正常容错。 */
  providerAttempts?: number;
  /** Omit for Kimi. External values must match a POOL_<ID> lowercase identifier. */
  provider?: "kimi" | "kimi-gateway" | "relay" | "zhipu" | "moonshot" | (string & {});
  reasoningEffort?: "none" | "low" | "medium" | "high";
}

export interface ResearchLLMResponse extends Omit<KimiChatResponse, "provider"> {
  provider: string;
}
export const DEFAULT_MAX_TOKENS = 12288;

export async function researchChat(
  req: ResearchLLMRequest,
  options?: { maxRetries?: number; baseDelayMs?: number },
): Promise<ResearchLLMResponse> {
  if (!req.userPrompt.trim()) throw new Error("Research userPrompt must not be empty");
  const maxTokens = req.maxTokens ?? DEFAULT_MAX_TOKENS;
  if (!Number.isInteger(maxTokens) || maxTokens < 1) throw new Error("maxTokens must be a positive integer");
  const externalProvider = req.provider && !["kimi", "kimi-gateway"].includes(req.provider)
    ? req.provider
    : undefined;
  const hasLegacyZhipu = getPool().some((provider) => provider.id === "zhipu");

  if (externalProvider && (externalProvider !== "zhipu" || hasLegacyZhipu)) {
    const response = await poolChat({
      systemPrompt: req.systemPrompt,
      userPrompt: req.userPrompt,
      model: req.model,
      temperature: req.temperature,
      maxTokens,
      reasoningEffort: req.reasoningEffort,
      providerId: externalProvider,
      timeoutMs: req.timeoutMs,
    }, { maxProviders: 1, maxKeysPerProvider: req.providerAttempts });
    const content = requireLlmText(response.content, response.provider);
    return {
      content,
      reasoning: response.reasoning,
      toolCalls: [],
      rawMessage: { role: "assistant", content },
      usage: response.usage,
      model: response.model,
      provider: response.provider,
      latencyMs: response.latencyMs,
      finishReason: response.finishReason,
    };
  }

  // Default Kimi behavior is unchanged. A legacy zhipu request without GLM also lands here.
  const messages: Array<{ role: string; content: string }> = [];
  if (req.systemPrompt?.trim()) messages.push({ role: "system", content: req.systemPrompt });
  messages.push({ role: "user", content: req.userPrompt });
  return kimiChat({
    messages,
    maxTokens,
    timeoutMs: req.timeoutMs,
    reasoningEffort: req.reasoningEffort,
    maxRetries: options?.maxRetries ?? 2,
  });
}

/** Parallel batch calls reject on failure; errors are never disguised as answer text. */
export async function researchChatBatch(
  requests: ResearchLLMRequest[],
  options?: { maxRetries?: number; baseDelayMs?: number; concurrency?: number },
): Promise<ResearchLLMResponse[]> {
  const concurrency = options?.concurrency ?? 3;
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("concurrency must be a positive integer");
  }
  const results: ResearchLLMResponse[] = [];
  for (let i = 0; i < requests.length; i += concurrency) {
    results.push(...await Promise.all(requests.slice(i, i + concurrency).map((req) => researchChat(req, options))));
  }
  return results;
}

/** A real, billable health probe is made only when explicitly requested. */
export async function researchLLMHealthCheck(
  provider?: ResearchLLMRequest["provider"],
): Promise<{ ok: boolean; provider: string; model: string; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const response = await researchChat({ provider, userPrompt: "Return OK only.", maxTokens: 10 });
    return {
      ok: true,
      provider: response.provider,
      model: response.model,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      ok: false,
      provider: provider || "kimi",
      model: (provider && !["kimi", "kimi-gateway"].includes(provider)
        ? getPool().find((item) => item.id === provider)?.model
        : getKimiGateway()?.model) || "unconfigured",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
