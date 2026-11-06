import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import * as math from "../src/lib/math-tournament.ts";

const challenge = {
  type: "egyptian_fraction",
  targetNumerator: 1,
  targetDenominator: 2,
  terms: 4,
  minDenominator: 2,
  maxDenominator: 200,
  requireDistinct: true,
};

const contestants = [
  { id: "kimi", name: "Kimi", provider: "kimi" },
  { id: "openai", name: "OpenAI", provider: "relay", model: "gpt-5.5" },
  { id: "claude", name: "Claude", provider: "relay", model: "claude-opus-5-5" },
];

function response(content, contestant) {
  return {
    content,
    provider: contestant.provider,
    model: contestant.model || "kimi-for-coding",
    toolCalls: [],
    rawMessage: {},
    finishReason: "stop",
    usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
    latencyMs: 2,
  };
}

test("unit-fraction certificates use exact integer arithmetic and enforce distinct bounded denominators", () => {
  assert.equal(typeof math.verifyEgyptianFraction, "function");
  const valid = math.verifyEgyptianFraction(challenge, { denominators: [3, 7, 78, 91] });
  assert.equal(valid.valid, true);
  assert.equal(valid.algorithm, "exact_bigint_fraction_sum");
  assert.deepEqual(valid.checks, ["exact_term_count", "safe_integer_denominators", "closed_denominator_bounds", "pairwise_distinct", "exact_bigint_unit_fraction_sum"]);
  assert.equal(valid.evidence.target, "1/2");
  assert.equal(valid.evidence.requiredTerms, 4);
  assert.equal(valid.evidence.submittedTerms, 4);
  assert.deepEqual(valid.evidence.denominatorBounds, [2, 200]);
  assert.equal(valid.evidence.requireDistinct, true);
  assert.equal(valid.evidence.numerator, "74529");
  assert.equal(valid.evidence.commonDenominator, "149058");
  assert.equal(valid.evidence.crossMultipliedLeft, "149058");
  assert.equal(valid.evidence.crossMultipliedRight, "149058");
  assert.equal(math.verifyEgyptianFraction(challenge, { denominators: ["4", "5", "30", "60"] }).valid, true);
  assert.equal(math.verifyEgyptianFraction(challenge, { denominators: [3, 7, 78, 90] }).valid, false);
  assert.equal(math.verifyEgyptianFraction(challenge, { denominators: [6, 6, 12, 12] }).valid, false);
  assert.equal(math.verifyEgyptianFraction(challenge, { denominators: [1, 7, 78, 91] }).valid, false);
  assert.equal(math.verifyEgyptianFraction(challenge, { denominators: [3, 7, 78] }).valid, false);
  assert.equal(math.verifyEgyptianFraction(challenge, { denominators: [3, 7, 78, "not-a-number"] }).valid, false);
  assert.throws(() => math.verifyEgyptianFraction({ ...challenge, targetDenominator: 0 }, { denominators: [3, 7, 78, 91] }), /target/);
  assert.throws(() => math.verifyEgyptianFraction({ ...challenge, terms: 0 }, { denominators: [3, 7, 78, 91] }), /terms/);
});

test("distinctness is explicit for new challenges and legacy records retain their original rule", () => {
  const allowed = math.verifyEgyptianFraction({ ...challenge, requireDistinct: false }, { denominators: [6, 6, 12, 12] });
  assert.equal(allowed.valid, true);
  assert.equal(allowed.evidence.requireDistinct, false);
  assert.equal(allowed.checks.includes("pairwise_distinct"), false);
  const legacy = { ...challenge };
  delete legacy.requireDistinct;
  assert.equal(math.verifyEgyptianFraction(legacy, { denominators: [6, 6, 12, 12] }).valid, false);
  assert.throws(() => math.verifyEgyptianFraction({ ...challenge, requireDistinct: "false" }, { denominators: [6, 6, 12, 12] }), /requireDistinct/);
});

test("the existing tournament scores and persists exact unit-fraction certificates", async (t) => {
  const storeDir = `.tmp/egyptian-fraction-tournament-${process.pid}`;
  fs.rmSync(storeDir, { recursive: true, force: true });
  t.after(() => fs.rmSync(storeDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }));
  const candidates = [[3, 7, 78, 91], [6, 6, 12, 12], [3, 7, 78, 90]];
  const prompts = [];
  const chat = async (request) => {
    if (request.userPrompt.includes("对抗复核")) return response("只审查精确验证的范围，不改变机器分数。", contestants[0]);
    const index = contestants.findIndex((item) => item.provider === request.provider && (item.model || "") === (request.model || ""));
    prompts.push(request.userPrompt);
    return response(JSON.stringify({ denominators: candidates[index], method: "candidate only" }), contestants[index]);
  };
  const result = await math.runMathTournament({ challenge, contestants }, { chat, storeDir, concurrency: 3 });
  assert.deepEqual(result.results.map((item) => item.score), [10, 0, 0]);
  assert.deepEqual(result.results.map((item) => item.verification.valid), [true, false, false]);
  assert.deepEqual(result.winners, ["Kimi"]);
  assert.equal(result.status, "complete");
  assert.equal(result.consensusLevel, 1 / 3);
  assert.equal(result.challenge.type, "egyptian_fraction");
  assert.equal(result.results[0].verification.algorithm, "exact_bigint_fraction_sum");
  assert.equal(result.results[0].verification.values.length, 4);
  assert.equal(prompts.every((prompt) => prompt.includes("互不相同") && prompt.includes("denominators")), true);
  assert.equal(math.getMathTournament(result.id, { storeDir }).id, result.id);
});

test("repeat challenges stay bounded, vary the target and have independently verified witnesses", () => {
  assert.equal(typeof math.createEgyptianFractionSeries, "function");
  assert.equal(typeof math.verifyCertificate, "function");
  const series = math.createEgyptianFractionSeries(2);
  assert.equal(series.length, 2);
  assert.deepEqual(series.map((item) => item.targetDenominator), [2, 3]);
  assert.equal(series.every((item) => item.requireDistinct === true), true);
  const witnesses = [[3, 7, 78, 91], [6, 12, 18, 36]];
  for (const [index, item] of series.entries()) {
    assert.equal(math.verifyCertificate(item, { denominators: witnesses[index] }).valid, true);
  }
  for (const repeat of [0, 1.5, 5, "2"]) {
    assert.throws(() => math.createEgyptianFractionSeries(repeat), /repeat/);
  }
});
