import { afterEach, beforeEach, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  MAX_TOTAL_OUTPUT_BUDGET,
  generateManuscriptInSegments,
  normalizeGenerationOptions,
} from "../../src/lib/manuscript-generation.ts";

let root;
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), "manuscript-generation-")); });
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

function request(overrides = {}) {
  return {
    pipelineId: "pipeline-test",
    stageId: "stage-test",
    stageName: "draft",
    topic: "可恢复长文",
    targetModule: "test",
    previousContent: "只允许使用给定证据",
    checkpointRoot: root,
    ...overrides,
  };
}

function generator(texts = ["甲", "乙", "丙"], failAt = -1) {
  const calls = [];
  const fn = async (_type, context, options) => {
    const match = context.previousContent.match(/第 (\d+)\//);
    const index = match ? Number(match[1]) - 1 : calls.length;
    calls.push({ context, options });
    if (index === failAt) throw new Error("simulated segment failure");
    return {
      content: `${texts[index] || `段${index + 1}`}（${context.previousContent.includes("已完成片段") ? "续写" : "首段"}）`,
      model: "test-model",
      provider: "kimi",
      latencyMs: 10,
      finishReason: "stop",
      usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
    };
  };
  fn.calls = calls;
  return fn;
}

test("one hundred million token budget is accepted but not confused with one giant call", () => {
  const plan = normalizeGenerationOptions({ maxTokens: MAX_TOTAL_OUTPUT_BUDGET, targetOutputTokens: MAX_TOTAL_OUTPUT_BUDGET });
  expect(plan.totalOutputBudget).toBe(100_000_000);
  expect(plan.segmentMaxTokens).toBe(100_000_000);
  expect(plan.segmentCount).toBe(1);
  expect(() => normalizeGenerationOptions({ totalOutputBudget: 100_000_001 })).toThrow("totalOutputBudget");
});

test("larger targets use bounded segments and aggregate real usage", async () => {
  const generate = generator();
  const result = await generateManuscriptInSegments(request({
    targetOutputTokens: 25000,
    segmentMaxTokens: 12288,
    generate,
  }));
  expect(result.segmentCount).toBe(3);
  expect(generate.calls).toHaveLength(3);
  expect(result.content).toContain("甲");
  expect(result.content).toContain("乙");
  expect(result.content).toContain("丙");
  expect(result.usage.total_tokens).toBe(45);
  expect(result.resumedSegmentCount).toBe(0);
});

test("a failed segment resumes only missing work with the same evidence fingerprint", async () => {
  const first = generator(["甲", "乙"], 1);
  await expect(generateManuscriptInSegments(request({ targetOutputTokens: 20000, segmentMaxTokens: 12288, generate: first }))).rejects.toThrow("simulated segment failure");
  const firstCheckpoint = JSON.parse(fs.readFileSync(path.join(root, "pipeline-test", "stage-test.json"), "utf8"));
  expect(firstCheckpoint.segments).toHaveLength(1);
  expect(firstCheckpoint.status).toBe("in_progress");

  const second = generator(["甲", "乙"], -1);
  const result = await generateManuscriptInSegments(request({ targetOutputTokens: 20000, segmentMaxTokens: 12288, generate: second }));
  expect(second.calls).toHaveLength(1);
  expect(result.content).toContain("甲");
  expect(result.content).toContain("乙");
  expect(result.resumedSegmentCount).toBe(1);
  const completed = JSON.parse(fs.readFileSync(path.join(root, "pipeline-test", "stage-test.json"), "utf8"));
  expect(completed.status).toBe("completed");
  expect(completed.segments).toHaveLength(2);
  expect(completed.segments[0].content).toBe("甲（首段）");
  expect(completed.segments[1].content).toBe("乙（续写）");
});

test("changed source evidence cannot reuse a checkpoint", async () => {
  await generateManuscriptInSegments(request({ targetOutputTokens: 12288, generate: generator(["旧证据"]) }));
  const next = generator(["新证据"]);
  await generateManuscriptInSegments(request({ previousContent: "新证据版本", targetOutputTokens: 12288, generate: next }));
  expect(next.calls).toHaveLength(1);
  expect(next.calls[0].context.previousContent).toContain("新证据版本");
  expect(next.calls[0].context.previousContent).not.toContain("旧证据");
});

test("resume=false deliberately restarts all segments", async () => {
  await generateManuscriptInSegments(request({ targetOutputTokens: 12288, generate: generator(["旧运行"]) }));
  const next = generator(["新运行"]);
  await generateManuscriptInSegments(request({ targetOutputTokens: 12288, resume: false, generate: next }));
  expect(next.calls).toHaveLength(1);
  expect(next.calls[0].options.maxRetries).toBeUndefined();
});

test("timeouts, retries and checkpoint files contain no credentials", async () => {
  const generate = generator();
  await generateManuscriptInSegments(request({ targetOutputTokens: 12288, timeoutMs: 600000, maxRetries: 0, generate }));
  expect(generate.calls[0].options.timeoutMs).toBe(600000);
  expect(generate.calls[0].options.maxRetries).toBe(0);
  const checkpoint = fs.readFileSync(path.join(root, "pipeline-test", "stage-test.json"), "utf8");
  expect(checkpoint).not.toContain("apiKey");
  expect(checkpoint).not.toContain("KIMI_API_KEY");
  expect(() => normalizeGenerationOptions({ timeoutMs: 999 })).toThrow("timeoutMs");
  expect(() => normalizeGenerationOptions({ maxRetries: -1 })).toThrow("maxRetries");
});
