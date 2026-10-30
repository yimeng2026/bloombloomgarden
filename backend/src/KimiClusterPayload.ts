export interface KimiExecutionPayload {
  messages?: Array<{ role: string; content: unknown }>;
  message?: unknown;
  maxTokens?: number;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
  tools?: Array<Record<string, unknown>>;
  toolChoice?: 'auto' | 'required' | 'none';
  responseFormat?: Record<string, unknown>;
}

interface ExecutionBody {
  payload?: unknown;
  messages?: KimiExecutionPayload['messages'];
  message?: unknown;
}

/** Preserve the nested gateway protocol while retaining the legacy flat form. */
export function normalizeKimiExecutionPayload(body: ExecutionBody = {}): KimiExecutionPayload {
  if (body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)) {
    const payload = body.payload as KimiExecutionPayload;
    return {
      messages: payload.messages,
      message: payload.message,
      maxTokens: payload.maxTokens,
      reasoningEffort: payload.reasoningEffort,
      tools: payload.tools,
      toolChoice: payload.toolChoice,
      responseFormat: payload.responseFormat,
    };
  }
  return { messages: body.messages, message: body.message };
}
