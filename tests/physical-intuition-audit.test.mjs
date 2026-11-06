import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { proposeIntuitionWithModel } from "../src/lib/physical-intuition/model-proposal.ts";
import { saveModelProposalReport } from "../src/lib/physical-intuition/intuition-audit.ts";

let fixtureNumber = 0;
function environment(t) {
  const directory = `.tmp/physical-intuition-audit-${process.pid}-${fixtureNumber++}`;
  const previous = process.env.PHYSICAL_INTUITION_AUDIT_DIR;
  process.env.PHYSICAL_INTUITION_AUDIT_DIR = directory;
  fs.rmSync(directory, { recursive: true, force: true });
  t.after(() => {
    if (previous === undefined) delete process.env.PHYSICAL_INTUITION_AUDIT_DIR;
    else process.env.PHYSICAL_INTUITION_AUDIT_DIR = previous;
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  return directory;
}

async function reportFixture() {
  return proposeIntuitionWithModel({
    task: {
      taskId: "audit-fixture",
      title: "Synthetic audit fixture",
      objective: "Verify immutable model review storage",
      observables: [{ name: "position", dimension: { L: 1 } }],
      constraints: [],
      baseline: null,
      evidence: [],
      triggers: { noncommutative: true },
    },
    generatedAt: "2026-11-06T12:30:00.000Z",
    chat: (request) => Promise.resolve({
      provider: request.provider || "kimi",
      model: request.model || "kimi-for-coding",
      content: request.systemPrompt.includes("JSON")
        ? JSON.stringify({ proposals: [{ structureKey: "matrix_states", statement: "Test a representation", rationale: "A testable clue" }] })
        : "A bounded method review",
      finishReason: "stop",
      usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
      latencyMs: 12,
    }),
  });
}

test("audit attempts are monotonic and never alter earlier records", async (t) => {
  environment(t);
  const report = await reportFixture();
  const before = JSON.stringify(report);
  const first = saveModelProposalReport(report);
  const firstText = fs.readFileSync(first.path, "utf8");
  const second = saveModelProposalReport(report);
  assert.equal(first.attempt, 1);
  assert.equal(second.attempt, 2);
  assert.notEqual(first.path, second.path);
  assert.equal(fs.readFileSync(first.path, "utf8"), firstText);
  assert.equal(JSON.stringify(report), before);
  assert.equal(JSON.parse(fs.readFileSync(second.path, "utf8")).evidenceUpgrade, false);
});

test("tampered deterministic results and fabricated completeness are rejected without files", async (t) => {
  const directory = environment(t);
  const report = await reportFixture();
  const tampered = structuredClone(report);
  tampered.evaluation.cards[0].mathStatus = "formal_verified";
  assert.throws(() => saveModelProposalReport(tampered), /Deterministic evaluation/);
  assert.throws(() => saveModelProposalReport({ ...report, status: "partial" }), /status/);
  assert.equal(fs.existsSync(directory), false);
});

test("secret-like opinions and unsafe audit directories cannot be persisted", async (t) => {
  const directory = environment(t);
  const report = await reportFixture();
  const secret = structuredClone(report);
  secret.exchanges[1].content = `sk-${"x".repeat(24)}`;
  assert.throws(() => saveModelProposalReport(secret), /secret/i);
  assert.equal(fs.existsSync(directory), false);
  process.env.PHYSICAL_INTUITION_AUDIT_DIR = "../outside";
  assert.throws(() => saveModelProposalReport(report), /relative directory/);
});
