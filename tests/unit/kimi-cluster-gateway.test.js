import { expect, test } from "bun:test";
import { kimiChat } from "../../src/lib/kimi-gateway.ts";

test("cluster gateway retries a transient connection failure without losing tools", async () => {
  const originalFetch = globalThis.fetch;
  const previous = {
    token: process.env.GARDEN_AGENT_TOKEN,
    backend: process.env.GARDEN_BACKEND_URL,
    cluster: process.env.GARDEN_USE_CLUSTER,
  };
  let calls = 0;
  let forwarded;
  globalThis.fetch = async (_url, init) => {
    calls += 1;
    if (calls === 1) throw new TypeError("fetch failed");
    forwarded = JSON.parse(init.body);
    return Response.json({
      success: true,
      data: {
        model: "kimi-for-coding",
        choices: [{ message: { content: "集群已恢复" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 },
      },
    });
  };
  process.env.GARDEN_AGENT_TOKEN = "d".repeat(40);
  process.env.GARDEN_BACKEND_URL = "http://127.0.0.1:3001";
  delete process.env.GARDEN_USE_CLUSTER;
  try {
    const result = await kimiChat({
      messages: [{ role: "user", content: "读取统计" }],
      tools: [{ type: "function", function: { name: "garden_catalog", parameters: { type: "object" } } }],
      toolChoice: "auto",
      maxTokens: 256,
      maxRetries: 1,
    });
    expect(result.content).toBe("集群已恢复");
    expect(calls).toBe(2);
    expect(forwarded.payload.messages[0].content).toBe("读取统计");
    expect(forwarded.payload.tools).toHaveLength(1);
    expect(forwarded.payload.toolChoice).toBe("auto");
    expect(forwarded.payload.maxTokens).toBe(256);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries({
      GARDEN_AGENT_TOKEN: previous.token,
      GARDEN_BACKEND_URL: previous.backend,
      GARDEN_USE_CLUSTER: previous.cluster,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
