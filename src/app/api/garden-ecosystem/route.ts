import { connection } from "next/server.js";
import { invokeBridge, type BridgeResponse } from "../../../lib/garden-ecosystem.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function handleBridgeRequest(
  request: Request,
  invoke: typeof invokeBridge = invokeBridge,
): Promise<Response> {
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > 16_384) {
      return Response.json({ ok: false, error: { type: "RequestTooLarge", message: "request exceeds 16 KiB" } }, { status: 400 });
    }
    const body = JSON.parse(text) as { action?: unknown; params?: unknown };
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.action !== "string") {
      return Response.json({ ok: false, error: { type: "InvalidRequest", message: "action is required" } }, { status: 400 });
    }
    const params = body.params ?? {};
    if (!params || typeof params !== "object" || Array.isArray(params)) {
      return Response.json({ ok: false, error: { type: "InvalidRequest", message: "params must be an object" } }, { status: 400 });
    }
    const response: BridgeResponse = await invoke(body.action, params as Record<string, unknown>);
    return Response.json(response, { status: response.ok ? 200 : 503 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return Response.json({ ok: false, error: { type: "InvalidRequest", message: "invalid bridge request" } }, { status: 400 });
    }
    return Response.json({ ok: false, error: { type: "BridgeError", message: "bridge request failed" } }, { status: 502 });
  }
}

export async function POST(request: Request): Promise<Response> {
  await connection();
  return handleBridgeRequest(request);
}
