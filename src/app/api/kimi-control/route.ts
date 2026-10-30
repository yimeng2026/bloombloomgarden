import { NextResponse } from "next/server";
import { authorizeAgent } from "@/lib/agent-auth";
import {
  ControlError,
  executeOperation,
  listOperations,
  type OperationRequest,
} from "@/lib/kimi-control";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authResponse(request: Request): NextResponse | null {
  const result = authorizeAgent(request);
  return result.ok ? null : NextResponse.json({ success: false, error: result.error }, { status: result.status });
}

/** Authenticated machine-readable catalog; no browser UI is required. */
export async function GET(request: Request) {
  const denied = authResponse(request);
  if (denied) return denied;
  const url = new URL(request.url);
  const operations = listOperations({
    service: url.searchParams.get("service") || undefined,
    method: url.searchParams.get("method") || undefined,
    path: url.searchParams.get("path") || undefined,
  });
  return NextResponse.json({
    success: true,
    provider: "kimi",
    schemaVersion: 1,
    count: operations.length,
    operations,
    usage: {
      writeConfirmation: "Every non-GET operation requires confirm: true",
      example: {
        service: "research",
        method: "GET",
        path: "/api/research/stats",
      },
    },
  });
}

/** Execute only a generated, real API operation; arbitrary URLs are rejected. */
export async function POST(request: Request) {
  const denied = authResponse(request);
  if (denied) return denied;
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 2 * 1024 * 1024) {
      throw new ControlError(413, "Control request exceeds the 2 MiB limit");
    }
    const input = await request.json() as OperationRequest;
    const result = await executeOperation(input, {
      researchOrigin: new URL(request.url).origin,
    });
    return NextResponse.json({ success: result.status < 400, result });
  } catch (error) {
    const status = error instanceof ControlError
      ? error.status
      : error instanceof Error && /Invalid operation path|Path traversal/.test(error.message)
      ? 400
      : 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status },
    );
  }
}
