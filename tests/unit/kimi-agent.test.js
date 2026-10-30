import { expect, test } from "bun:test";
import { POST } from "../../src/app/api/kimi-agent/route.ts";

function toolMessage(name, args, reasoning = "internal-only") {
  return {
    choices: [{
      message: {
        role: "assistant",
        content: "",
        reasoning_content: reasoning,
        tool_calls: [{
          id: "call-1",
          type: "function",
          function: { name, arguments: JSON.stringify(args) },
        }],
      },
    }],
    usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
  };
}

async function withMockedKimi(message, expectedToolName) {
  const previous = {
    key: process.env.KIMI_API_KEY,
    base: process.env.KIMI_BASE_URL,
    token: process.env.GARDEN_AGENT_TOKEN,
    cluster: process.env.GARDEN_USE_CLUSTER,
  };
  const originalFetch = globalThis.fetch;
  const bodies = [];
  let call = 0;
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    bodies.push(body);
    call += 1;
    if (call === 1) {
      expect(body.model).toBe("kimi-for-coding");
      expect(body.temperature).toBe(1);
      expect(body.tools).toHaveLength(2);
      const args = expectedToolName === "garden_catalog"
        ? { path: "/api/research/stats", limit: 2 }
        : {
            service: "research",
            method: "POST",
            path: "/api/research/tasks",
            body: { title: "must not execute" },
            confirm: true,
          };
      return Response.json(toolMessage(expectedToolName, args));
    }
    expect(call).toBe(2);
    const tool = body.messages.find((item) => item.role === "tool");
    expect(tool.tool_call_id).toBe("call-1");
    if (expectedToolName === "garden_catalog") {
      expect(tool.content).toContain("/api/research/stats");
    } else {
      expect(tool.content).toContain("Write denied");
    }
    return Response.json({
      choices: [{ message: { role: "assistant", content: "已按权限边界完成" } }],
      usage: { prompt_tokens: 8, completion_tokens: 3, total_tokens: 11 },
    });
  };
  process.env.KIMI_API_KEY = "test-kimi-key";
  process.env.KIMI_BASE_URL = "https://kimi.test";
  process.env.GARDEN_AGENT_TOKEN = "c".repeat(40);
  process.env.GARDEN_USE_CLUSTER = "0";
  try {
    const response = await POST(new Request("http://localhost/api/kimi-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${"c".repeat(40)}` },
      body: JSON.stringify({ message, allowWrites: false }),
    }));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.answer).toBe("已按权限边界完成");
    expect(payload.steps).toBe(2);
    expect(payload.usage.total_tokens).toBe(23);
    expect(JSON.stringify(payload)).not.toContain("internal-only");
    expect(bodies).toHaveLength(2);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries({ KIMI_API_KEY: previous.key, KIMI_BASE_URL: previous.base, GARDEN_AGENT_TOKEN: previous.token, GARDEN_USE_CLUSTER: previous.cluster })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("Kimi discovers real operations and completes a protocol-valid tool loop", async () => {
  await withMockedKimi("查询研究统计的真实操作", "garden_catalog");
});

test("model-supplied confirmation cannot override caller write denial", async () => {
  await withMockedKimi("未经读取权限允许就创建任务", "garden_invoke");
});
