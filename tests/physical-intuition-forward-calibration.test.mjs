import assert from "node:assert/strict";
import test from "node:test";
import { proposeIntuitionWithModel } from "../src/lib/physical-intuition/model-proposal.ts";
import {
  assertForwardCase,
  calibrateForwardRecords,
  freezeForwardCase,
  freezeModelForwardCase,
  recordForwardOutcome,
} from "../src/lib/physical-intuition/forward-calibration.ts";

function caseInput(id, overrides = {}) {
  return {
    caseId: id,
    problemFamily: "synthetic-algebra",
    authorId: "model:fixture",
    frozenAt: "2026-01-01T00:00:00.000Z",
    task: {
      taskId: id,
      title: "Synthetic frozen case",
      objective: "Test a pre-registered structural prediction",
      observables: [{ name: "transition_table", dimension: {} }],
      constraints: [],
      baseline: { name: "baseline", description: "Synthetic baseline" },
      evidence: [],
      triggers: { noncommutative: true },
    },
    decision: "propose",
    candidateKeys: ["matrix_states"],
    confidence: 0.8,
    falsificationCriteria: ["The exact later certificate must satisfy the declared matrix criterion"],
    selectionRule: "fixture_rule_v1",
    reason: "Frozen structural clue, not a physical conclusion",
    ...overrides,
  };
}

function makeOutcome(caseRecord, kind = "hit", overrides = {}) {
  const verdict = { hit: "supported", miss: "refuted", near_miss: "partial", inconclusive: "inconclusive" }[kind];
  return recordForwardOutcome(caseRecord, {
    caseId: caseRecord.caseId,
    caseHash: caseRecord.caseHash,
    observedAt: "2026-01-02T00:00:00.000Z",
    kind,
    holdout: {
      holdoutId: `holdout-${caseRecord.caseId}`,
      accessibleAt: "2026-01-01T12:00:00.000Z",
      evidence: { id: `evidence-${caseRecord.caseId}`, role: "reconstruction", locator: "synthetic exact certificate" },
    },
    review: {
      reviewerId: "independent-exact-checker",
      independentFrom: [caseRecord.authorId],
      reviewedAt: "2026-01-03T00:00:00.000Z",
      verdict,
    },
    ...overrides,
  });
}

async function modelReport(confidences = [0.8, 0.4], finishReason = "stop") {
  return proposeIntuitionWithModel({
    task: caseInput("model-forward-fixture").task,
    generatedAt: "2026-01-01T00:00:00.000Z",
    chat: (request) => Promise.resolve({
      provider: "relay",
      model: "gpt-5.5",
      content: request.systemPrompt.includes("JSON")
        ? JSON.stringify({ proposals: [
          { structureKey: "matrix_states", statement: "Matrix candidate", rationale: "Array clue", confidence: confidences[0] },
          { structureKey: "causal_poset", statement: "Order candidate", rationale: "Contrast", confidence: confidences[1] },
        ] })
        : "Bounded review",
      finishReason,
      usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
      latencyMs: 12,
    }),
  });
}

test("model cases freeze the highest confidence with deterministic tie breaking and immutable hashes", async () => {
  const report = await modelReport();
  const before = JSON.stringify(report);
  const frozen = freezeModelForwardCase({
    report,
    caseId: "model-case",
    problemFamily: "synthetic-algebra",
    falsificationCriteria: ["Later exact result must match the declared matrix criterion"],
  });
  assert.deepEqual(frozen.candidateKeys, ["matrix_states"]);
  assert.equal(frozen.confidence, 0.8);
  assert.equal(frozen.authorId, "model:relay:gpt-5.5");
  assert.match(frozen.caseHash, /^[a-f0-9]{64}$/);
  assert.equal(frozen.evidenceUpgrade, false);
  assert.equal(JSON.stringify(report), before);
  assert.doesNotThrow(() => assertForwardCase(frozen));
  const tied = freezeModelForwardCase({
    report: await modelReport([0.8, 0.8]),
    caseId: "tied-case",
    problemFamily: "synthetic-algebra",
    falsificationCriteria: ["Declared criterion"],
  });
  assert.deepEqual(tied.candidateKeys, ["causal_poset"]);
});

test("outcomes require post-freeze holdouts, separate reviewers, evidence and consistent verdicts", () => {
  const frozen = freezeForwardCase(caseInput("outcome-case"));
  const outcome = makeOutcome(frozen);
  assert.equal(outcome.caseHash, frozen.caseHash);
  assert.match(outcome.outcomeHash, /^[a-f0-9]{64}$/);
  assert.throws(() => makeOutcome(frozen, "hit", { holdout: { ...outcome.holdout, accessibleAt: "2025-12-31T00:00:00.000Z" } }), /after freezing/);
  assert.throws(() => makeOutcome(frozen, "hit", { review: { ...outcome.review, reviewerId: frozen.authorId } }), /independent/);
  assert.throws(() => makeOutcome(frozen, "hit", { review: { ...outcome.review, verdict: "refuted" } }), /verdict/);
  assert.throws(() => makeOutcome(frozen, "hit", { holdout: { ...outcome.holdout, evidence: { ...outcome.holdout.evidence, role: "lead" } } }), /evidence/);
  assert.throws(() => recordForwardOutcome(frozen, { ...outcome, caseHash: "0".repeat(64) }), /caseHash/);
});

test("calibration keeps hits, misses, near-misses, inconclusive, pending and abstentions distinct", () => {
  const hit = freezeForwardCase(caseInput("case-hit", { confidence: 0.8 }));
  const miss = freezeForwardCase(caseInput("case-miss", { confidence: 0.6 }));
  const near = freezeForwardCase(caseInput("case-near", { confidence: 0.7 }));
  const inconclusive = freezeForwardCase(caseInput("case-inconclusive", { confidence: 0.4 }));
  const pending = freezeForwardCase(caseInput("case-pending", { confidence: 0.5 }));
  const abstain = freezeForwardCase(caseInput("case-abstain", { decision: "abstain", candidateKeys: [], confidence: null }));
  const result = calibrateForwardRecords([
    { case: hit, outcome: makeOutcome(hit, "hit") },
    { case: miss, outcome: makeOutcome(miss, "miss") },
    { case: near, outcome: makeOutcome(near, "near_miss") },
    { case: inconclusive, outcome: makeOutcome(inconclusive, "inconclusive") },
    { case: pending },
    { case: abstain },
  ]);
  assert.deepEqual(result.counts, { total: 6, proposed: 5, resolved: 2, hit: 1, miss: 1, nearMiss: 1, inconclusive: 1, pending: 1, abstained: 1 });
  assert.equal(result.hitRate, 0.5);
  assert.ok(Math.abs(result.brierScore - 0.2) < 1e-12);
  assert.ok(Math.abs(result.meanConfidence - 0.7) < 1e-12);
  assert.ok(Math.abs(result.confidenceGap - 0.2) < 1e-12);
  assert.ok(Math.abs(result.coverage - 1 / 3) < 1e-12);
  assert.ok(Math.abs(result.abstentionRate - 1 / 6) < 1e-12);
  assert.equal(result.allOutcomesRecorded, false);
  assert.equal(result.evidenceUpgrade, false);
});

test("empty resolved outcomes produce null metrics rather than fabricated zero scores", () => {
  const frozen = freezeForwardCase(caseInput("case-only-near"));
  const result = calibrateForwardRecords([{ case: frozen, outcome: makeOutcome(frozen, "near_miss") }]);
  assert.equal(result.hitRate, null);
  assert.equal(result.brierScore, null);
  assert.equal(result.meanConfidence, null);
  assert.equal(result.confidenceGap, null);
  assert.equal(result.coverage, 0);
  assert.equal(result.allOutcomesRecorded, true);
});

test("invalid decisions, missing model confidence and partial teachers cannot enter calibration", async () => {
  assert.throws(() => freezeForwardCase(caseInput("bad-propose", { candidateKeys: [] })), /candidate/);
  assert.throws(() => freezeForwardCase(caseInput("bad-abstain", { decision: "abstain" })), /abstain/);
  assert.throws(() => freezeForwardCase(caseInput("bad-confidence", { confidence: 1.2 })), /confidence/);
  assert.throws(() => freezeForwardCase(caseInput("bad-structure", { candidateKeys: ["invented"] })), /structure/);
  const valid = freezeForwardCase(caseInput("hash-case"));
  assert.throws(() => assertForwardCase({ ...valid, caseHash: "0".repeat(64) }), /caseHash/);
  const missing = await modelReport([undefined, 0.4]);
  assert.throws(() => freezeModelForwardCase({ report: missing, caseId: "missing-confidence", problemFamily: "synthetic-algebra", falsificationCriteria: ["criterion"] }), /confidence/);
  const partial = await modelReport([0.8, 0.4], "length");
  assert.throws(() => freezeModelForwardCase({ report: partial, caseId: "partial-teacher", problemFamily: "synthetic-algebra", falsificationCriteria: ["criterion"] }), /complete/);
});
