import assert from "node:assert/strict";
import test from "node:test";
import { proposeIntuitionWithModel } from "../src/lib/physical-intuition/model-proposal.ts";

function task() {
  return {
    taskId: "confidence-fixture",
    title: "Synthetic confidence fixture",
    objective: "Verify bounded prospective confidence",
    observables: [{ name: "position", dimension: { L: 1 } }],
    constraints: [],
    baseline: { name: "baseline", description: "Synthetic baseline" },
    evidence: [],
    triggers: { noncommutative: true },
  };
}

async function run(confidence) {
  const prompts = [];
  return proposeIntuitionWithModel({
    task: task(),
    chat: (request) => {
      prompts.push(request);
      return Promise.resolve({
        provider: "kimi",
        model: "kimi-for-coding",
        content: request.systemPrompt.includes("JSON")
          ? JSON.stringify({ proposals: [{ structureKey: "matrix_states", statement: "Test structure", rationale: "Test rationale", confidence }] })
          : "Bounded method review",
        finishReason: "stop",
        usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
        latencyMs: 12,
      });
    },
  }).then((report) => ({ report, prompts }));
}

test("model confidence is optional, bounded and cannot alter evidence state", async () => {
  const valid = await run(0.65);
  assert.equal(valid.report.proposals[0].confidence, 0.65);
  assert.ok(valid.prompts[0].systemPrompt.includes("confidence"));
  assert.equal(valid.report.status, "complete");
  assert.equal(valid.report.proposals[0].mathStatus, "proposal");
  assert.equal(valid.report.proposals[0].physicalStatus, "analogy");
  const invalid = await run(1.01);
  assert.equal(invalid.report.status, "partial");
  assert.deepEqual(invalid.report.proposals, []);
  assert.match(invalid.report.exchanges[0].error, /confidence/);
  assert.equal(invalid.report.evidenceUpgrade, false);
});
