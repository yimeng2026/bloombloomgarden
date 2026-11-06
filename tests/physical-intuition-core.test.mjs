import assert from "node:assert/strict";
import test from "node:test";
import { assertIntuitionTask } from "../src/lib/physical-intuition/types.ts";
import { getStructureCard, listStructureCards } from "../src/lib/physical-intuition/structure-registry.ts";

export function taskFixture(overrides = {}) {
  return {
    taskId: "oscillation-fixture",
    title: "Synthetic oscillation fixture; not a research result",
    objective: "Compare candidate state representations without claiming a physical discovery",
    observables: [
      { name: "position", unit: "m", dimension: { L: 1 } },
      { name: "time", unit: "s", dimension: { T: 1 } },
    ],
    constraints: [],
    baseline: { name: "linear_ode", description: "A conventional linear oscillator baseline" },
    evidence: [],
    triggers: { noncommutative: true, oscillatory: true },
    ...overrides,
  };
}

test("registry exposes six structured cards with typed usage labels and rejection boundaries", () => {
  const cards = listStructureCards();
  assert.equal(cards.length, 6);
  assert.deepEqual(cards.map((card) => card.key).sort(), [
    "causal_poset",
    "hamiltonian_dynamics",
    "matrix_states",
    "relation_graph",
    "sparse_symbolic_dynamics",
    "symmetry_invariants",
  ]);
  for (const card of cards) {
    assert.equal(typeof card.signature, "string");
    assert.equal(typeof card.baselineDifference, "string");
    assert.ok(card.possibleUses.some((use) => use.status === "candidate"));
    assert.ok(card.possibleUses.some((use) => use.status === "rejected"));
    assert.ok(card.quickChecks.length > 0);
  }
  const matrix = getStructureCard("matrix_states");
  assert.ok(matrix.possibleUses.some((use) => use.label.includes("跃迁")));
  assert.equal(getStructureCard("missing"), undefined);
});

test("valid task declarations preserve an explicit null baseline and validate evidence URLs", () => {
  const task = taskFixture({ baseline: null });
  assertIntuitionTask(task);
  assert.equal(task.baseline, null);
  assertIntuitionTask(taskFixture({
    evidence: [{ id: "paper", role: "context", sourceUrl: "https://example.com/source", locator: "abstract" }],
  }));
  assert.throws(() => assertIntuitionTask(taskFixture({
    evidence: [{ id: "bad", role: "lead", sourceUrl: "file:///secret", locator: "local" }],
  })), /HTTP|HTTPS|sourceUrl/i);
});

test("invalid task essentials are rejected before candidate generation", () => {
  for (const candidate of [
    taskFixture({ taskId: "bad id" }),
    taskFixture({ objective: " " }),
    taskFixture({ observables: [] }),
    taskFixture({ baseline: undefined }),
    taskFixture({ evidence: [{ id: "x", role: "observation", locator: "" }] }),
  ]) {
    assert.throws(() => assertIntuitionTask(candidate), /taskId|objective|observables?|baseline|locator/i);
  }
});

import { evaluateIntuitionTask } from "../src/lib/physical-intuition/evaluate.ts";

test("noncommutative clues yield a matrix candidate without claiming a quantum conclusion", () => {
  const result = evaluateIntuitionTask(taskFixture());
  const matrix = result.cards.find((card) => card.key === "matrix_states");
  assert.ok(matrix);
  assert.equal(matrix.mathStatus, "proposal");
  assert.equal(matrix.physicalStatus, "analogy");
  assert.equal(matrix.statement.includes("必然"), false);
  assert.ok(matrix.possibleUses.some((use) => use.status === "candidate"));
  assert.ok(matrix.nextDiscriminatingTest.includes("对易"));
  assert.equal(result.audit.algorithmVersion, "physical-intuition/v1");
  assert.match(result.audit.inputHash, /^[a-f0-9]{64}$/);
  assert.equal(result.evidenceUpgrade, false);
});

test("missing baseline and absent data produce explicit exploration boundaries and no input mutation", () => {
  const task = taskFixture({ baseline: null });
  const before = JSON.stringify(task);
  const first = evaluateIntuitionTask(task);
  const second = evaluateIntuitionTask(task);
  assert.equal(first.explorationOnly, true);
  assert.ok(first.issues.some((issue) => issue.code === "missing_baseline"));
  assert.equal(first.syntheticData, false);
  assert.equal(JSON.stringify(task), before);
  assert.deepEqual(first, second);
});

test("dimension mismatches and probability normalization failures are visible", () => {
  const dimensionFailure = evaluateIntuitionTask(taskFixture({
    constraints: [{ kind: "dimension", left: { L: 1 }, right: { T: 1 } }],
  }));
  assert.ok(dimensionFailure.cards[0].checks.some((check) => check.code === "dimension_mismatch" && check.status === "fail"));
  const probabilityFailure = evaluateIntuitionTask(taskFixture({
    constraints: [{ kind: "probabilities", values: [0.2, 0.2], tolerance: 1e-9 }],
  }));
  assert.ok(probabilityFailure.cards[0].checks.some((check) => check.code === "probability_not_normalized" && check.status === "fail"));
  const valid = evaluateIntuitionTask(taskFixture({
    constraints: [{ kind: "probabilities", values: [0.2, 0.8], tolerance: 1e-9 }],
  }));
  assert.ok(valid.cards[0].checks.some((check) => check.code === "probabilities_normalized" && check.status === "pass"));
});

test("non-finite values and invalid matrix shapes are rejected rather than hidden", () => {
  for (const constraint of [
    { kind: "probabilities", values: [Number.NaN], tolerance: 1e-9 },
    { kind: "probabilities", values: [-0.1, 1.1], tolerance: 1e-9 },
    { kind: "commutation", a: [[1, 2]], b: [[1, 2]], tolerance: 1e-9 },
  ]) {
    assert.throws(() => evaluateIntuitionTask(taskFixture({ constraints: [constraint] })), /finite|probabilit|rectangle|matrix/i);
  }
});

test("commutation reports residual and tolerance without declaring an exact zero", () => {
  const result = evaluateIntuitionTask(taskFixture({
    constraints: [{
      kind: "commutation",
      a: [[0, 1], [0, 0]],
      b: [[1, 0], [0, 0]],
      tolerance: 1e-12,
    }],
  }));
  const check = result.cards[0].checks.find((item) => item.code === "nonzero_commutator");
  assert.ok(check);
  assert.equal(check.status, "warning");
  assert.match(check.detail, /maxAbs=1/);
  assert.equal(check.detail.includes("exactly zero"), false);
});

test("synthetic data is labeled and cannot masquerade as a real observational discovery", () => {
  const result = evaluateIntuitionTask(taskFixture({
    data: { origin: "synthetic", trainAvailable: true, holdoutAvailable: true, samplingNote: "fixture only" },
  }));
  assert.equal(result.syntheticData, true);
  assert.ok(result.issues.some((issue) => issue.code === "synthetic_data"));
  assert.equal(result.evidenceUpgrade, false);
});
