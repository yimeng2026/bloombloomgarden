import assert from "node:assert/strict";
import test from "node:test";
import { getPoolStatus, loadPoolFromEnv, poolChat, reloadPool } from "../src/lib/provider-pool.ts";

const ENV_NAMES = [
  "POOL_RELAY_BASE_URL", "POOL_RELAY_API_KEY", "POOL_RELAY_MODEL",
  "POOL_RELAY_API_STYLE", "POOL_RELAY_REASONING_EFFORT", "POOL_RELAY_TEMPERATURE",
  "POOL_RELAY_RESPONSES_MODELS", "POOL_RELAY_OMIT_TEMPERATURE_MODELS",
];

function configure() {
  process.env.POOL_RELAY_BASE_URL = "http://provider.test/v1/";
  process.env.POOL_RELAY_API_KEY = "relay-test-secret";
  process.env.POOL_RELAY_MODEL = "gpt-5.4";
  process.env.POOL_RELAY_API_STYLE = "responses";
  process.env.POOL_RELAY_REASONING_EFFORT = "low";
}

test("ProviderPool protocol compatibility", async (t) => {
  const saved = Object.fromEntries(ENV_NAMES.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  configure();
  t.after(() => {
    globalThis.fetch = originalFetch;
    for (const key of ENV_NAMES) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    reloadPool();
  });

  await t.test("loads an explicit Responses provider without exposing its secret", () => {
    const provider = loadPoolFromEnv().find((item) => item.id === "relay");
    assert.equal(provider.apiStyle, "responses");
    assert.equal(provider.supportsReasoningEffort, true);
    assert.equal(provider.supportsTemperature, false);
    reloadPool();
    assert.equal(JSON.stringify(getPoolStatus()).includes("relay-test-secret"), false);
  });

  await t.test("loads up to twelve distinct key slots and deduplicates repeated values", () => {
    const names = ["POOL_RELAY_API_KEY", ...Array.from({ length: 12 }, (_, index) => `POOL_RELAY_API_KEY_${index + 2}`)];
    const previous = names.map((name) => process.env[name]);
    try {
      names.forEach((name, index) => { process.env[name] = `slot-key-${index + 1}`; });
      process.env.POOL_RELAY_API_KEY_13 = process.env.POOL_RELAY_API_KEY;
      const provider = loadPoolFromEnv().find((item) => item.id === "relay");
      assert.equal(provider.keys.length, 12);
      assert.equal(new Set(provider.keys.map((key) => key.apiKey)).size, 12);
      process.env.POOL_RELAY_API_KEY_9 = process.env.POOL_RELAY_API_KEY;
      const deduplicated = loadPoolFromEnv().find((item) => item.id === "relay");
      assert.equal(deduplicated.keys.length, 11);
      assert.equal(new Set(deduplicated.keys.map((key) => key.apiKey)).size, 11);
    } finally {
      names.forEach((name, index) => {
        if (previous[index] === undefined) delete process.env[name];
        else process.env[name] = previous[index];
      });
      reloadPool();
    }
  });

  await t.test("sends Responses input and normalizes output_text and token usage", async () => {
    let request;
    globalThis.fetch = async (url, init) => {
      request = { url, body: JSON.parse(init.body) };
      return Response.json({
        model: "gpt-5.4-2026-03-05",
        status: "completed",
        output_text: "Same esterase method is not independently established.",
        output: [{ type: "message", content: [{ type: "output_text", text: "Same esterase method is not independently established." }] }],
        usage: { input_tokens: 41, output_tokens: 9 },
      });
    };
    const result = await poolChat({ providerId: "relay", systemPrompt: "Audit the evidence.", userPrompt: "What is missing?", maxTokens: 64 });
    assert.equal(request.url, "http://provider.test/v1/responses");
    assert.deepEqual(request.body, {
      model: "gpt-5.4",
      instructions: "Audit the evidence.",
      input: [{ role: "user", content: "What is missing?" }],
      max_output_tokens: 64,
      reasoning: { effort: "low" },
    });
    assert.equal(result.content, "Same esterase method is not independently established.");
    assert.deepEqual(result.usage, { prompt_tokens: 41, completion_tokens: 9, total_tokens: 50 });
    assert.equal(result.finishReason, "completed");
  });

  await t.test("extracts nested message text and reports an incomplete response", async () => {
    globalThis.fetch = async () => Response.json({
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output: [
        { type: "reasoning", summary: [{ text: "hidden summary is not the answer" }] },
        { type: "message", content: [{ type: "output_text", text: "First paragraph." }, { type: "output_text", text: "Second paragraph." }] },
      ],
      usage: { input_tokens: 15, output_tokens: 12, total_tokens: 27 },
    });
    const result = await poolChat({ providerId: "relay", userPrompt: "Audit this.", maxTokens: 32 });
    assert.equal(result.content, "First paragraph.\nSecond paragraph.");
    assert.equal(result.finishReason, "incomplete:max_output_tokens");
    assert.equal(result.reasoning, "");
  });

  await t.test("preserves the existing Chat Completions request contract", async () => {
    process.env.POOL_RELAY_API_STYLE = "chat_completions";
    process.env.POOL_RELAY_TEMPERATURE = "0.3";
    reloadPool();
    let request;
    globalThis.fetch = async (url, init) => {
      request = { url, body: JSON.parse(init.body) };
      return Response.json({ model: "gpt-5.4", choices: [{ message: { content: "ok" }, finish_reason: "stop" }], usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 } });
    };
    const result = await poolChat({ providerId: "relay", userPrompt: "Hi", maxTokens: 8 });
    assert.equal(request.url, "http://provider.test/v1/chat/completions");
    assert.equal(request.body.max_tokens, 8);
    assert.equal(request.body.temperature, 0.3);
    assert.equal("max_output_tokens" in request.body, false);
    assert.equal(result.content, "ok");
    delete process.env.POOL_RELAY_TEMPERATURE;
    process.env.POOL_RELAY_API_STYLE = "responses";
    reloadPool();
  });

  await t.test("selects Responses only for declared models on a shared gateway", async () => {
    process.env.POOL_RELAY_API_STYLE = "chat_completions";
    process.env.POOL_RELAY_RESPONSES_MODELS = "gpt-5.4,gpt-5.5";
    reloadPool();
    let request;
    globalThis.fetch = async (url, init) => {
      request = { url, body: JSON.parse(init.body) };
      return Response.json({ status: "completed", output_text: "ok", usage: { input_tokens: 3, output_tokens: 1 } });
    };
    await poolChat({ providerId: "relay", model: "gpt-5.4", userPrompt: "Hi", maxTokens: 8 });
    assert.equal(request.url, "http://provider.test/v1/responses");
    assert.equal(request.body.reasoning.effort, "low");
    assert.equal("temperature" in request.body, false);
  });

  await t.test("omits sampling and reasoning overrides for declared restricted models", async () => {
    const previous = process.env.POOL_RELAY_REASONING_MODELS;
    process.env.POOL_RELAY_REASONING_MODELS = "gpt-5.4,gpt-5.5";
    process.env.POOL_RELAY_OMIT_TEMPERATURE_MODELS = "claude-opus-5-5,kimi-k3.1-pro";
    reloadPool();
    let request;
    globalThis.fetch = async (url, init) => {
      request = { url, body: JSON.parse(init.body) };
      return Response.json({ choices: [{ message: { content: "ok" }, finish_reason: "stop" }] });
    };
    try {
      await poolChat({ providerId: "relay", model: "claude-opus-5-5", userPrompt: "Hi", maxTokens: 8 });
      assert.equal(request.url, "http://provider.test/v1/chat/completions");
      assert.equal("temperature" in request.body, false);
      assert.equal("reasoning_effort" in request.body, false);
      await assert.rejects(poolChat({ providerId: "relay", model: "claude-opus-5-5", userPrompt: "Hi", temperature: 0.3 }), /temperature/);
    } finally {
      if (previous === undefined) delete process.env.POOL_RELAY_REASONING_MODELS;
      else process.env.POOL_RELAY_REASONING_MODELS = previous;
    }
  });

  await t.test("rejects unsupported protocol and temperature combinations before spending", async () => {
    process.env.POOL_RELAY_API_STYLE = "unsupported";
    assert.throws(() => loadPoolFromEnv(), /POOL_RELAY_API_STYLE/);
    process.env.POOL_RELAY_API_STYLE = "responses";
    await assert.rejects(poolChat({ providerId: "relay", userPrompt: "Hi", temperature: 0.3 }), /temperature/);
  });

  await t.test("bounds key attempts for time-limited research roles", async () => {
    const previous = process.env.POOL_RELAY_API_KEY_2;
    process.env.POOL_RELAY_API_KEY_2 = "second-slot-test-secret";
    reloadPool();
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return calls === 1 ? new Response("temporary failure", { status: 500 }) : Response.json({ status: "completed", output_text: "second key" });
    };
    try {
      await assert.rejects(poolChat({ providerId: "relay", userPrompt: "Hi", maxTokens: 8 }, { maxProviders: 1, maxKeysPerProvider: 1 }));
      assert.equal(calls, 1);
    } finally {
      if (previous === undefined) delete process.env.POOL_RELAY_API_KEY_2;
      else process.env.POOL_RELAY_API_KEY_2 = previous;
      reloadPool();
    }
  });

  await t.test("redacts credentials if an upstream error reflects them", async () => {
    reloadPool();
    globalThis.fetch = async () => new Response("bad credential: relay-test-secret", { status: 401 });
    await assert.rejects(poolChat({ providerId: "relay", userPrompt: "Hi", maxTokens: 8 }), (error) => {
      assert.equal(error.message.includes("relay-test-secret"), false);
      assert.match(error.message, /\[redacted\]/);
      return true;
    });
  });
});
