import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { getMathTournament, isPrime, runMathTournament, verifyPrimeQuadruple } from "../src/lib/math-tournament.ts";

const challenge = { type: "prime_quadruple", start: 2, end: 200 };
const contestants = [
  { id: "kimi", name: "Kimi", provider: "kimi" },
  { id: "openai", name: "OpenAI", provider: "relay", model: "gpt-5.5" },
  { id: "claude", name: "Claude", provider: "relay", model: "claude-opus-5-5" },
];

function response(content, contestant, finishReason = "stop") {
  return { content, provider: contestant.provider, model: contestant.model || "kimi-for-coding", toolCalls: [], rawMessage: {}, finishReason, usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 }, latencyMs: 2 };
}

test("primality and prime-quadruple certificates are independently checked", () => {
  for (const prime of [2, 3, 5, 11, 13, 17, 19, 101, 103, 107, 109]) assert.equal(isPrime(prime), true, String(prime));
  for (const composite of [1, 0, 4, 21, 105, 111, 121, 171]) assert.equal(isPrime(composite), false, String(composite));
  const validCertificate = verifyPrimeQuadruple(challenge, { p: 11 });
  assert.equal(validCertificate.valid, true);
  assert.equal(validCertificate.algorithm, "trial_division_to_sqrt");
  assert.deepEqual(validCertificate.values.map((value) => value.trialDivisionLimit), [3, 3, 4, 4]);
  assert.equal(verifyPrimeQuadruple(challenge, { p: 101 }).valid, true);
  assert.equal(verifyPrimeQuadruple(challenge, { p: 12 }).valid, false);
  assert.equal(verifyPrimeQuadruple(challenge, { p: 12 }).values[0].smallestFactor, 2);
  assert.equal(verifyPrimeQuadruple(challenge, { p: 201 }).valid, false);
  assert.throws(() => verifyPrimeQuadruple({ type: "prime_quadruple", start: 2, end: 5000 }, { p: 11 }), /range/);
});

test("adversarial math tournament scores only verified certificates and persists provenance", async (t) => {
  const storeDir = `.tmp/math-tournament-${process.pid}`;
  fs.rmSync(storeDir, { recursive: true, force: true });
  t.after(() => fs.rmSync(storeDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }));
  const candidates = [11, 12, 101];
  let active = 0;
  let peak = 0;
  let reviewPrompt = "";
  const chat = async (request) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 3));
    active -= 1;
    if (request.userPrompt.includes("对抗复核")) {
      reviewPrompt = request.userPrompt;
      const reviewer = request.provider === "kimi" ? contestants[0] : contestants[1];
      return response("只审查验证范围；不改变机器分数。", reviewer);
    }
    const index = contestants.findIndex((item) => item.provider === request.provider && (item.model || "") === (request.model || ""));
    return response(`\`\`\`json\n{"p":${candidates[index]},"reason":"candidate {not evidence}"}\n\`\`\``, contestants[index], request.provider === "relay" && request.model === "gpt-5.5" ? "completed" : "stop");
  };
  const result = await runMathTournament({ competitionId: "fixture-competition", challenge, contestants }, { chat, storeDir, concurrency: 3 });
  assert.equal(peak <= 3, true);
  assert.deepEqual(result.results.map((item) => item.score), [10, 0, 10]);
  assert.deepEqual(result.results.map((item) => item.certificate?.p), [11, 12, 101]);
  assert.equal(result.status, "complete");
  assert.equal(result.modelCallsSucceeded, true);
  assert.equal(result.consensusLevel, 1 / 3);
  assert.deepEqual(result.winners, ["Kimi", "Claude"]);
  assert.equal(result.reviews.length, 2);
  assert.ok(reviewPrompt.includes('"algorithm":"trial_division_to_sqrt"'));
  assert.ok(reviewPrompt.includes('"start":2'));
  assert.equal(result.claimScope, "known_answer_certificate_benchmark");
  assert.equal(getMathTournament(result.id, { storeDir }).id, result.id);
});

test("model failure or truncation never triggers a random or simulated score", async (t) => {
  const storeDir = `.tmp/math-tournament-errors-${process.pid}`;
  t.after(() => fs.rmSync(storeDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }));
  const chat = async (request) => {
    if (request.userPrompt.includes("对抗复核")) return response("复核意见", contestants[0]);
    const index = contestants.findIndex((item) => item.provider === request.provider && (item.model || "") === (request.model || ""));
    if (index === 0) throw new Error("simulated network failure");
    if (index === 1) return response('{"p":11}', contestants[index], "length");
    return response('{"p":11}', contestants[index]);
  };
  const result = await runMathTournament({ challenge, contestants }, { chat, storeDir, concurrency: 3 });
  assert.equal(result.results[0].status, "error");
  assert.equal(result.results[1].status, "incomplete");
  assert.equal(result.results[2].verification.valid, true);
  assert.deepEqual(result.results.map((item) => item.score), [0, 0, 10]);
  assert.equal(result.status, "partial");
  assert.equal(result.modelCallsSucceeded, false);
  assert.equal(JSON.stringify(result).includes("simulated network failure"), true);
});
