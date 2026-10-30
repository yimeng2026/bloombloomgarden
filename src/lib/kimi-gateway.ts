import { requireLlmText } from "./llm-content";

export interface KimiGatewayConfig {
  apiKey: string;
  baseUrl: string;
  chatUrl: string;
  model: string;
  temperature: 1;
}

export interface KimiMessage {
  role: string;
  content: unknown;
  [key: string]: unknown;
}

export interface KimiChatRequest {
  messages: KimiMessage[];
  maxTokens?: number;
  reasoningEffort?: "none" | "low" | "medium" | "high";
  tools?: Array<Record<string, unknown>>;
  toolChoice?: "auto" | "required" | "none";
  responseFormat?: Record<string, unknown>;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface KimiChatResponse {
  content: string;
  reasoning?: string;
  toolCalls: Array<Record<string, unknown>>;
  /** Raw assistant message is used only for the tool-call protocol, never displayed as reasoning. */
  rawMessage: Record<string, unknown>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  model: string;
  provider: "kimi";
  latencyMs: number;
  finishReason?: string;
}

export const KIMI_GATEWAY_MODEL = "kimi-for-coding";

export function getKimiGateway(): KimiGatewayConfig | null {
  const apiKey = process.env.KIMI_API_KEY?.trim();
  if (!apiKey) return null;
  const rawBase = process.env.KIMI_BASE_URL?.trim() || "https://api.kimi.com/coding";
  const baseUrl = rawBase.replace(/\/+$/, "");
  const v1Base = /\/v1$/i.test(baseUrl) ? baseUrl : `${baseUrl}/v1`;
  return {
    apiKey,
    baseUrl,
    chatUrl: `${v1Base}/chat/completions`,
    model: KIMI_GATEWAY_MODEL,
    temperature: 1,
  };
}

export function kimiGatewayAvailable(): boolean {
  return getKimiGateway() !== null;
}

class KimiRequestError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}

function waitAfterFailure(retryAfter: string | null, attempt: number): number {
  const seconds = retryAfter ? Number(retryAfter) : Number.NaN;
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
  return 1000 * 2 ** attempt;
}

async function kimiChatViaCluster(request: KimiChatRequest): Promise<KimiChatResponse> {
  const agentToken = process.env.GARDEN_AGENT_TOKEN?.trim();
  if (!agentToken) throw new Error("GARDEN_AGENT_TOKEN is required for the shared Kimi cluster");
  const base = (process.env.GARDEN_BACKEND_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");
  const start = Date.now();
  const response = await fetch(`${base}/api/kimi-cluster/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Garden-Agent-Key": agentToken,
    },
    body: JSON.stringify({
      agentId: "garden-research",
      taskType: "chat",
      payload: {
        messages: request.messages,
        maxTokens: request.maxTokens,
        reasoningEffort: request.reasoningEffort,
        tools: request.tools,
        toolChoice: request.toolChoice,
        responseFormat: request.responseFormat,
      },
    }),
    signal: AbortSignal.timeout(request.timeoutMs ?? 120_000),
  });
  const envelope = await response.json().catch(() => ({}));
  if (!response.ok || envelope.success === false) {
    throw new Error(`Shared Kimi cluster HTTP ${response.status}: ${JSON.stringify(envelope).slice(0, 300)}`);
  }
  const data = envelope.data;
  const message = data?.choices?.[0]?.message;
  const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
  const content = toolCalls.length > 0 && (message?.content == null || message?.content === "")
    ? ""
    : requireLlmText(message?.content, "kimi");
  return {
    content,
    reasoning: typeof message?.reasoning_content === "string" ? message.reasoning_content : undefined,
    toolCalls,
    rawMessage: message as Record<string, unknown>,
    usage: data?.usage ? {
      prompt_tokens: Number(data.usage.prompt_tokens) || 0,
      completion_tokens: Number(data.usage.completion_tokens) || 0,
      total_tokens: Number(data.usage.total_tokens) || 0,
    } : undefined,
    model: typeof data?.model === "string" ? data.model : KIMI_GATEWAY_MODEL,
    provider: "kimi",
    latencyMs: Date.now() - start,
    finishReason: data?.choices?.[0]?.finish_reason,
  };
}

/** Kimi-only call. Cluster code may supply a server-resolved node configuration. */
export async function kimiChat(
  request: KimiChatRequest,
  resolvedConfig?: KimiGatewayConfig,
): Promise<KimiChatResponse> {
  if (!resolvedConfig && process.env.GARDEN_USE_CLUSTER !== "0") {
    return kimiChatViaCluster(request);
  }
  const config = resolvedConfig || getKimiGateway();
  if (!config) throw new Error("Kimi is not configured: set KIMI_API_KEY (and optionally KIMI_BASE_URL)");
  if (!request.messages.length) throw new Error("Kimi messages must not be empty");
  if (request.maxTokens !== undefined && (!Number.isInteger(request.maxTokens) || request.maxTokens < 1)) {
    throw new Error("maxTokens must be a positive integer");
  }

  const maxRetries = request.maxRetries ?? 2;
  const timeoutMs = request.timeoutMs ?? 120_000;
  const start = Date.now();
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(config.chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: request.messages,
          temperature: 1,
          max_tokens: request.maxTokens ?? 12288,
          stream: false,
          ...(request.reasoningEffort ? { reasoning_effort: request.reasoningEffort } : {}),
          ...(request.tools?.length ? { tools: request.tools } : {}),
          ...(request.toolChoice ? { tool_choice: request.toolChoice } : {}),
          ...(request.responseFormat ? { response_format: request.responseFormat } : {}),
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, waitAfterFailure(response.headers.get("Retry-After"), attempt)));
          continue;
        }
        throw new KimiRequestError(`Kimi API HTTP ${response.status}: ${text.slice(0, 300)}`, retryable);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const message = choice?.message;
      const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
      const content = toolCalls.length > 0 && (message?.content == null || message?.content === "")
        ? ""
        : requireLlmText(message?.content, "kimi");
      return {
        content,
        reasoning: typeof message?.reasoning_content === "string" ? message.reasoning_content : undefined,
        toolCalls,
        rawMessage: message as Record<string, unknown>,
        usage: data.usage ? {
          prompt_tokens: Number(data.usage.prompt_tokens) || 0,
          completion_tokens: Number(data.usage.completion_tokens) || 0,
          total_tokens: Number(data.usage.total_tokens) || 0,
        } : undefined,
        model: typeof data.model === "string" ? data.model : config.model,
        provider: "kimi",
        latencyMs: Date.now() - start,
        finishReason: choice?.finish_reason,
      };
    } catch (error) {
      const retryable = error instanceof KimiRequestError
        ? error.retryable
        : error instanceof TypeError || (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name));
      if (!retryable || attempt >= maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, waitAfterFailure(null, attempt)));
    }
  }
  throw new Error("Kimi request failed after retries");
}
