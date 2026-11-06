import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { freezeForwardCase } from "../src/lib/physical-intuition/forward-calibration.ts";
import { saveForwardCase } from "../src/lib/physical-intuition/forward-store.ts";

let fixtureNumber = 0;
function environment(t) {
  const directory = `.tmp/forward-demo-${process.pid}-${fixtureNumber++}`;
  const previousForward = process.env.PHYSICAL_INTUITION_FORWARD_DIR;
  const previousReview = process.env.PHYSICAL_INTUITION_AUDIT_DIR;
  process.env.PHYSICAL_INTUITION_FORWARD_DIR = directory;
  process.env.PHYSICAL_INTUITION_AUDIT_DIR = `${directory}/model-reviews`;
  fs.rmSync(directory, { recursive: true, force: true });
  t.after(() => {
    if (previousForward === undefined) delete process.env.PHYSICAL_INTUITION_FORWARD_DIR;
    else process.env.PHYSICAL_INTUITION_FORWARD_DIR = previousForward;
    if (previousReview === undefined) delete process.env.PHYSICAL_INTUITION_AUDIT_DIR;
    else process.env.PHYSICAL_INTUITION_AUDIT_DIR = previousReview;
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  return directory;
}

function run(args) {
  return spawnSync(process.execPath, [
    "--experimental-transform-types", "--import", "./tests/register-ts.mjs",
    "scripts/physical-intuition-forward-demo.mjs", ...args,
  ], { cwd: process.cwd(), env: process.env, encoding: "utf8" });
}

function frozenFixture() {
  return freezeForwardCase({
    caseId: "forward-matrix-demo-20261107",
    problemFamily: "synthetic-linear-algebra",
    authorId: "model:fixture",
    frozenAt: "2026-01-01T00:00:00.000Z",
    task: {
      taskId: "forward-matrix-demo-20261107",
      title: "Synthetic forward demo fixture",
      objective: "Test exact reveal without a model",
      observables: [{ name: "transition_table", dimension: {} }],
      constraints: [{ kind: "commutation", a: [[0, 1], [0, 0]], b: [[0, 0], [1, 0]], tolerance: 1e-12 }],
      baseline: { name: "classical_poisson_brackets", description: "Teaching baseline only" },
      evidence: [],
      triggers: { noncommutative: true },
    },
    decision: "propose",
    candidateKeys: ["matrix_states"],
    confidence: 0.75,
    falsificationCriteria: ["Exact certificate must match"],
    selectionRule: "fixture_rule_v1",
    reason: "Frozen synthetic clue",
  });
}

test("freeze without --live makes no model call and writes no audit", (t) => {
  const directory = environment(t);
  const result = run(["freeze"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /explicit --live/);
  assert.equal(fs.existsSync(directory), false);
});

test("reveal computes an exact certificate and cannot overwrite its outcome", (t) => {
  environment(t);
  const frozen = frozenFixture();
  const saved = saveForwardCase(frozen);
  const before = fs.readFileSync(saved.path, "utf8");
  const result = run(["reveal", saved.path]);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.kind, "hit");
  assert.equal(report.hitRate, 1);
  assert.equal(report.brierScore, 0.0625);
  assert.deepEqual(report.certificate.output, [2, 1]);
  assert.equal(report.evidenceUpgrade, false);
  assert.equal(fs.readFileSync(saved.path, "utf8"), before);
  const duplicate = run(["reveal", saved.path]);
  assert.equal(duplicate.status, 1);
  assert.match(duplicate.stderr, /cannot be overwritten/);
});
