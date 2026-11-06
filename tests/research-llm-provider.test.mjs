import assert from "node:assert/strict";
import test from "node:test";
import { researchChat } from "../src/lib/research-llm.ts";
import { reloadPool } from "../src/lib/provider-pool.ts";

const KEYS = [
  "ZHIPU_API_KEY", "POOL_RELAY_BASE_URL", "POOL_RELAY_API_KEY", "POOL_RELAY_MODEL",
  "POOL_RELAY_API_STYLE", "POOL_RELAY_REASONING_EFFORT", "GARDEN_USE_CLUSTER",
  "KIMI_API_KEY", "KIMI_BASE_URL",
];

function preserveEnvironment(t) {
  const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    reloadPool();
  });
  process.env.GARDEN_USE_CLUSTER = "0";
  process.env.KIMI_API_KEY = "kimi-test-secret";
  process.env.KIMI_BASE_URL = "http://kimi.test/coding";
  process.env.POOL_RELAY_BASE_URL = "http://relay.test/v1";
  process.env.POOL_RELAY_API_KEY = "selected-provider-test-key";
  process.env.POOL_RELAY_MODEL = "gpt-5.4";
  process.env.POOL_RELAY_API_STYLE = "responses";
  process.env.POOL_RELAY_REASONING_EFFORT = "low";
}

test("researchChat pins an explicitly selected external provider and preserves the response contract", async (t) => {
  preserveEnvironment(t);
  process.env.ZHIPU_API_KEY = "unselected-provider-test-key";
  reloadPool();
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return Response.json({ model: "gpt-5.5", status: "completed", output_text: "bounded", usage: { input_tokens: 10, output_tokens: 2, total_tokens: 12 } });
  };
  const result = await researchChat({ provider: "relay", model: "gpt-5.5", userPrompt: "Audit without invention.", maxTokens: 64 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://relay.test/v1/responses");
  assert.equal(calls[0].body.model, "gpt-5.5");
  assert.equal(result.provider, "relay");
  assert.equal(result.content, "bounded");
  assert.deepEqual(result.toolCalls, []);
  assert.equal(result.rawMessage.content, "bounded");
});

test("Kimi-native default and legacy zhipu fallback do not leak model names", async (t) => {
  preserveEnvironment(t);
  delete process.env.ZHIPU_API_KEY;
  reloadPool();
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return Response.json({ model: "kimi-for-coding", choices: [{ message: { content: "bounded" }, finish_reason: "stop" }] });
  };
  const legacy = await researchChat({ provider: "zhipu", model: "glm-5.1", userPrompt: "Keep legacy fallback.", maxTokens: 64 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://kimi.test/coding/v1/chat/completions");
  assert.equal(calls[0].body.model, "kimi-for-coding");
  assert.equal(legacy.provider, "kimi");

  // Kimi-native compatibility: model alone never silently moves an existing call to a new vendor.
  const compatible = await researchChat({ model: "gpt-5.4", userPrompt: "Preserve native compatibility.", maxTokens: 64 });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, "http://kimi.test/coding/v1/chat/completions");
  assert.equal(calls[1].body.model, "kimi-for-coding");
  assert.equal(compatible.provider, "kimi");
});
