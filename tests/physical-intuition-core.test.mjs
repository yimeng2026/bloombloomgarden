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
