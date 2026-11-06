import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server.js";
import { GET as getStructures } from "../src/app/api/research/physical-intuition/structures/route.ts";
import { POST as evaluate } from "../src/app/api/research/physical-intuition/evaluate/route.ts";

function fixture(overrides = {}) {
  return {
    taskId: "route-fixture",
    title: "Route fixture; not a research result",
    objective: "Check typed candidate generation through HTTP",
    observables: [{ name: "position", unit: "m", dimension: { L: 1 } }],
    constraints: [],
    baseline: { name: "linear_ode", description: "Conventional baseline" },
    evidence: [],
    triggers: { noncommutative: true },
    ...overrides,
  };
}

function post(body) {
  return new NextRequest("http://localhost/api/research/physical-intuition/evaluate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("structures GET returns all six typed cards without upgrading evidence", async () => {
  const response = await getStructures();
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.structures.length, 6);
  assert.ok(payload.data.structures.every((card) => card.possibleUses.some((use) => use.status === "rejected")));
  assert.equal(payload.evidenceUpgrade, false);
});

test("evaluate POST returns a matrix candidate, exploration boundary and canonical hash", async () => {
  const task = fixture();
  const before = JSON.stringify(task);
  const response = await evaluate(post(task));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.requestId, "route-fixture");
  assert.equal(payload.data.cards[0].key, "matrix_states");
  assert.equal(payload.data.cards[0].mathStatus, "proposal");
  assert.equal(payload.data.explorationOnly, true);
  assert.match(payload.data.audit.inputHash, /^[a-f0-9]{64}$/);
  assert.equal(payload.evidenceUpgrade, false);
  assert.equal(JSON.stringify(task), before);
});

test("invalid JSON and missing essentials return 400 without fabricated cards", async () => {
  for (const request of [
    post("{not-json"),
    post(fixture({ taskId: "bad id" })),
    post(fixture({ baseline: undefined })),
    post(fixture({ evidence: [{ id: "bad", role: "lead", sourceUrl: "file:///secret", locator: "local" }] })),
  ]) {
    const response = await evaluate(request);
    const payload = await response.json();
    assert.equal(response.status, 400);
    assert.equal(payload.success, false);
    assert.equal(payload.evidenceUpgrade, false);
    assert.equal(Object.hasOwn(payload, "data"), false);
  }
});

test("invalid numeric values and unknown constraints return 400", async () => {
  const invalidProbability = await evaluate(post(fixture({
    constraints: [{ kind: "probabilities", values: [-0.1, 1.1], tolerance: 1e-9 }],
  })));
  assert.equal(invalidProbability.status, 400);
  const unknown = await evaluate(post(fixture({ constraints: [{ kind: "invented_check" }] })));
  assert.equal(unknown.status, 400);
  const nonFinite = await evaluate(new NextRequest("http://localhost/api/research/physical-intuition/evaluate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(fixture({ constraints: [{ kind: "probabilities", values: [1e999], tolerance: 1e-9 }] })),
  }));
  assert.equal(nonFinite.status, 400);
});
