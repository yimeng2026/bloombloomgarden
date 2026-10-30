import crypto from "node:crypto";

export type AgentAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** GARDEN_AGENT_TOKEN is separate from the outbound KIMI_API_KEY. */
export function authorizeAgent(request: Request): AgentAuthResult {
  const expected = process.env.GARDEN_AGENT_TOKEN?.trim() || "";
  if (expected.length < 32) {
    return { ok: false, status: 503, error: "GARDEN_AGENT_TOKEN is missing or shorter than 32 characters" };
  }
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const headerKey = request.headers.get("x-garden-agent-key")?.trim() || "";
  const presented = bearer || headerKey;
  if (!presented || !safeEqual(presented, expected)) {
    return { ok: false, status: 401, error: "Valid agent authorization required" };
  }
  return { ok: true };
}
