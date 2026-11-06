import assert from "node:assert/strict";
import test from "node:test";
import { proposeIntuitionWithModel } from "../src/lib/physical-intuition/model-proposal.ts";

function fixture() {
  return {
    taskId: "model-review-fixture",
    title: "Synthetic structure proposal; not a physics result",
    objective: "Test typed structure suggestions under noncommutative clues",
    observables: [{ name: "position", unit: "m", dimension: { L: 1 } }],
    constraints: [],
    baseline: { name: "linear_ode", description: "Teaching baseline only" },
    evidence: [],
    triggers: { noncommutative: true },
  };
}

const proposalJson = JSON.stringify({ proposals: [
  { structureKey: "matrix_states", statement: "Compare indexed transitions", rationale: "Noncommutativity is a clue, not a conclusion" },
  { structureKey: "causal_poset", statement: "Compare a discrete order", rationale: "A contrasting representation can generate a discriminating test" },
] });

function successfulChat(request) {
  const isProposer = request.systemPrompt.includes("JSON");
  return Promise.resolve({
    provider: request.provider || "kimi",
    model: request.model || "kimi-for-coding",
    content: isProposer ? proposalJson : `Method review for ${request.systemPrompt.slice(0, 30)}`,
    finishReason: "stop",
    usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
    latencyMs: 12,
  });
}

test("typed model proposals stay separate from deterministic results and retain all raw opinions", async () => {
  const task = fixture();
  const before = JSON.stringify(task);
  const prompts = [];
  const report = await proposeIntuitionWithModel({
    task,
    generatedAt: "2026-11-06T12:00:00.000Z",
    roles: [
      { id: "structure_proposer", provider: "relay", model: "gpt-5.5" },
      { id: "evidence_skeptic", provider: "kimi" },
      { id: "theory_gardener", provider: "relay", model: "gpt-5.5" },
    ],
    chat: (request) => { prompts.push(request.userPrompt); return successfulChat(request); },
  });
  assert.equal(report.status, "complete");
  assert.equal(report.evaluation.cards.length, 1);
  assert.equal(report.proposals.length, 2);
  assert.equal(report.exchanges.length, 3);
  assert.deepEqual(report.exchanges.map((item) => item.role), ["structure_proposer", "evidence_skeptic", "theory_gardener"]);
  assert.equal(report.exchanges[0].provider, "relay");
  assert.equal(report.exchanges[0].usage.total_tokens, 14);
  assert.equal(report.exchanges[0].latencyMs, 12);
  assert.equal(report.exchanges[0].finishReason, "stop");
  assert.ok(report.proposals.every((card) => card.mathStatus === "proposal" && card.physicalStatus === "analogy"));
  assert.equal(report.evidenceUpgrade, false);
  assert.equal(JSON.stringify(task), before);
  assert.equal(prompts.length, 3);
  assert.ok(prompts.every((prompt) => !prompt.includes("wa9527we") && !prompt.includes("沧海红尘")));
});

test("malformed JSON and unknown structures cannot create candidates", async () => {
  for (const content of [
    "{not-json",
    JSON.stringify({ proposals: [{ structureKey: "invented", statement: "Unsupported", rationale: "Unsupported" }] }),
  ]) {
    const report = await proposeIntuitionWithModel({
      task: fixture(),
      chat: (request) => successfulChat(request).then((response) => ({
        ...response,
        content: request.systemPrompt.includes("JSON") ? content : response.content,
      })),
    });
    assert.equal(report.status, "partial");
    assert.deepEqual(report.proposals, []);
    assert.match(report.exchanges[0].error, /Invalid model proposal/);
    assert.equal(report.evaluation.cards.length, 1);
    assert.equal(report.evidenceUpgrade, false);
  }
});

test("truncation, empty content and rejected calls are partial and redact credential-like errors", async () => {
  for (const mode of ["truncated", "empty", "rejected"]) {
    let calls = 0;
    const report = await proposeIntuitionWithModel({
      task: fixture(),
      chat: (request) => {
        calls += 1;
        if (mode === "rejected" && calls === 2) return Promise.reject(new Error(`upstream sk-${"x".repeat(24)}`));
        return successfulChat(request).then((response) => ({
          ...response,
          content: mode === "empty" ? " " : response.content,
          finishReason: mode === "truncated" ? "length" : response.finishReason,
        }));
      },
    });
    assert.equal(report.status, "partial");
    assert.equal(report.evaluation.cards.length, 1);
    assert.equal(report.evidenceUpgrade, false);
    if (mode === "rejected") {
      assert.equal(report.exchanges[1].error.includes("xxxxxxxx"), false);
      assert.match(report.exchanges[1].error, /redacted/);
    }
  }
});
