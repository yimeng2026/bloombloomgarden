/** Kimi-only research calls. Formal answer text and reasoning remain separate. */

import { getKimiGateway, kimiChat, type KimiChatResponse } from "./kimi-gateway";

export interface ResearchLLMRequest {
  systemPrompt?: string;
  userPrompt: string;
  /** Compatibility field only; the configured Kimi model is always used. */
  model?: string;
  /** Compatibility field only; the Kimi gateway currently requires temperature=1. */
  temperature?: number;
  maxTokens?: number;
  provider?: "kimi";
  reasoningEffort?: "none" | "low" | "medium" | "high";
}

export type ResearchLLMResponse = KimiChatResponse;
export const DEFAULT_MAX_TOKENS = 12288;

export async function researchChat(
  req: ResearchLLMRequest,
  options?: { maxRetries?: number; baseDelayMs?: number },
): Promise<ResearchLLMResponse> {
  if (!req.userPrompt.trim()) throw new Error("Research userPrompt must not be empty");
  const messages: Array<{ role: string; content: string }> = [];
  if (req.systemPrompt?.trim()) messages.push({ role: "system", content: req.systemPrompt });
  messages.push({ role: "user", content: req.userPrompt });
  return kimiChat({
    messages,
    maxTokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
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

/** A real, billable health probe is made only when this function is explicitly called. */
export async function researchLLMHealthCheck(): Promise<{
  ok: boolean;
  provider: "kimi";
  model: string;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const response = await researchChat({ userPrompt: "Return OK only.", maxTokens: 10 });
    return {
      ok: true,
      provider: "kimi",
      model: response.model,
      latencyMs: response.latencyMs,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "kimi",
      model: getKimiGateway()?.model || "unconfigured",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
