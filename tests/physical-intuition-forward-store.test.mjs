import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { freezeForwardCase, recordForwardOutcome } from "../src/lib/physical-intuition/forward-calibration.ts";
import { readForwardCase, readForwardOutcome, saveForwardCase, saveForwardOutcome } from "../src/lib/physical-intuition/forward-store.ts";

let fixtureNumber = 0;
function environment(t) {
  const directory = `.tmp/forward-store-${process.pid}-${fixtureNumber++}`;
  const previous = process.env.PHYSICAL_INTUITION_FORWARD_DIR;
  process.env.PHYSICAL_INTUITION_FORWARD_DIR = directory;
  fs.rmSync(directory, { recursive: true, force: true });
  t.after(() => {
    if (previous === undefined) delete process.env.PHYSICAL_INTUITION_FORWARD_DIR;
    else process.env.PHYSICAL_INTUITION_FORWARD_DIR = previous;
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  return directory;
}

function caseFixture(overrides = {}) {
  return freezeForwardCase({
    caseId: "store-fixture",
    problemFamily: "synthetic-linear-algebra",
    authorId: "model:fixture",
    frozenAt: "2026-01-01T00:00:00.000Z",
    task: {
      taskId: "store-fixture",
      title: "Synthetic store fixture",
      objective: "Verify immutable forward records",
      observables: [{ name: "transition_table", dimension: {} }],
      constraints: [{ kind: "commutation", a: [[0, 1], [0, 0]], b: [[0, 0], [1, 0]], tolerance: 1e-12 }],
      baseline: { name: "classical_poisson_brackets", description: "Teaching baseline only" },
      evidence: [],
      triggers: { noncommutative: true },
    },
    decision: "propose",
    candidateKeys: ["matrix_states"],
    confidence: 0.75,
    falsificationCriteria: ["Exact independent certificate must match"],
    selectionRule: "fixture_rule_v1",
    reason: "Frozen synthetic structure clue",
    ...overrides,
  });
}

function outcomeFixture(caseRecord) {
  return recordForwardOutcome(caseRecord, {
    caseId: caseRecord.caseId,
    caseHash: caseRecord.caseHash,
    observedAt: "2026-01-02T00:00:00.000Z",
    kind: "hit",
    holdout: {
      holdoutId: "exact-linear-certificate-v1",
      accessibleAt: "2026-01-01T12:00:00.000Z",
      evidence: { id: "exact-linear-certificate", role: "reconstruction", locator: "synthetic exact arithmetic" },
    },
    review: {
      reviewerId: "independent-exact-arithmetic-v1",
      independentFrom: [caseRecord.authorId],
      reviewedAt: "2026-01-03T00:00:00.000Z",
      verdict: "supported",
    },
  });
}

test("case records round-trip and duplicate writes cannot change the original", (t) => {
  environment(t);
  const frozen = caseFixture();
  const saved = saveForwardCase(frozen);
  const originalText = fs.readFileSync(saved.path, "utf8");
  const loaded = readForwardCase(saved.path);
  assert.deepEqual(loaded.record, frozen);
  assert.throws(() => saveForwardCase(frozen), /cannot be overwritten/);
  assert.equal(fs.readFileSync(saved.path, "utf8"), originalText);
});

test("outcome records bind the frozen hash and unsafe directories are rejected", (t) => {
  environment(t);
  const frozen = caseFixture();
  saveForwardCase(frozen);
  const outcome = outcomeFixture(frozen);
  const saved = saveForwardOutcome(frozen, outcome);
  const loaded = readForwardOutcome(frozen, saved.path);
  assert.deepEqual(loaded.record, outcome);
  process.env.PHYSICAL_INTUITION_FORWARD_DIR = "../outside";
  assert.throws(() => saveForwardCase(caseFixture({ caseId: "unsafe" })), /relative directory/);
});

test("tampered hashes, secret-like content and modified files are rejected", (t) => {
  const directory = environment(t);
  const frozen = caseFixture();
  assert.throws(() => saveForwardCase({ ...frozen, caseHash: "0".repeat(64) }), /caseHash/);
  assert.equal(fs.existsSync(directory), false);
  const secret = caseFixture({ reason: `sk-${"x".repeat(24)}` });
  assert.throws(() => saveForwardCase(secret), /secret/i);
  assert.equal(fs.existsSync(directory), false);
  const saved = saveForwardCase(frozen);
  const modified = { ...frozen, confidence: 0.99 };
  fs.writeFileSync(saved.path, JSON.stringify(modified), "utf8");
  assert.throws(() => readForwardCase(saved.path), /caseHash/);
});
