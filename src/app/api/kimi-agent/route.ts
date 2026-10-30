import { NextResponse } from "next/server";
import { authorizeAgent } from "@/lib/agent-auth";
import { kimiChat, type KimiMessage } from "@/lib/kimi-gateway";
import { executeOperation, listOperations, type OperationRequest } from "@/lib/kimi-control";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "garden_catalog",
      description: "List real, allowlisted Garden operations. Use path filters and small limits instead of assuming an endpoint.",
      parameters: {
        type: "object",
        properties: {
          service: { type: "string", enum: ["research", "backend"] },
          method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
          path: { type: "string", description: "Case-sensitive substring filter" },
          offset: { type: "integer", minimum: 0 },
          limit: { type: "integer", minimum: 1, maximum: 50 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "garden_invoke",
      description: "Invoke one exact operation returned by garden_catalog. Non-GET requires both caller allowWrites and confirm=true.",
      parameters: {
        type: "object",
        properties: {
          service: { type: "string", enum: ["research", "backend"] },
          method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
          path: { type: "string" },
          query: { type: "object" },
          body: {},
          confirm: { type: "boolean" },
        },
        required: ["service", "method", "path"],
        additionalProperties: false,
      },
    },
  },
];

function textResult(value: unknown): string {
  const serialized = JSON.stringify(value);
  return serialized.length <= 20_000 ? serialized : `${serialized.slice(0, 20_000)}\n[truncated]`;
}

export async function POST(request: Request) {
  const auth = authorizeAgent(request);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > 100_000) {
      return NextResponse.json({ success: false, error: "message must contain 1-100000 characters" }, { status: 400 });
    }
    const allowWrites = body.allowWrites === true;
    const maxSteps = Math.max(1, Math.min(6, Number.isInteger(body.maxSteps) ? body.maxSteps : 4));
    const messages: KimiMessage[] = [
      {
        role: "system",
        content: "你是千界花园的 Kimi 操作员。先用 garden_catalog 查询真实操作，不得猜路径。读取默认允许；写操作只有在用户请求 allowWrites=true 时才可执行，并需 confirm=true。不得把推理字段当正文，不得虚构执行结果。",
      },
      { role: "user", content: message },
    ];
    const operationTrace: Array<{ operationId: string; status: number }> = [];
    let totalTokens = 0;

    for (let step = 1; step <= maxSteps; step++) {
      const response = await kimiChat({
        messages,
        tools: TOOLS,
        toolChoice: "auto",
        maxTokens: 4096,
      });
      totalTokens += response.usage?.total_tokens || 0;
      if (response.toolCalls.length === 0) {
        return NextResponse.json({
          success: true,
          answer: response.content,
          provider: response.provider,
          model: response.model,
          steps: step,
          operations: operationTrace,
          usage: { total_tokens: totalTokens },
        });
      }
      messages.push(response.rawMessage as KimiMessage);

      for (const call of response.toolCalls) {
        const callId = String(call.id || "");
        const fn = call.function as { name?: unknown; arguments?: unknown } | undefined;
        let output: unknown;
        try {
          const args = typeof fn?.arguments === "string" ? JSON.parse(fn.arguments) : {};
          if (fn?.name === "garden_catalog") {
            const offset = Math.max(0, Number(args.offset) || 0);
            const limit = Math.max(1, Math.min(50, Number(args.limit) || 20));
            const found = listOperations({ service: args.service, method: args.method, path: args.path });
            output = { total: found.length, offset, limit, operations: found.slice(offset, offset + limit) };
          } else if (fn?.name === "garden_invoke") {
            const operation = args as OperationRequest;
            if (operation.method !== "GET" && (!allowWrites || operation.confirm !== true)) {
              output = { error: "Write denied: caller allowWrites=true and operation confirm=true are both required" };
            } else {
              const result = await executeOperation(operation, { researchOrigin: new URL(request.url).origin });
              operationTrace.push({ operationId: result.operationId, status: result.status });
              output = result;
            }
          } else {
            output = { error: "Unknown tool; use garden_catalog or garden_invoke" };
          }
        } catch (error) {
          output = { error: error instanceof Error ? error.message : String(error) };
        }
        messages.push({ role: "tool", tool_call_id: callId, content: textResult(output) });
      }
    }
    return NextResponse.json({
      success: false,
      error: "Kimi tool loop reached maxSteps without a final answer",
      operations: operationTrace,
    }, { status: 422 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
