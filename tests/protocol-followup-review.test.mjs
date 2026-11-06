import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { buildProtocolFollowupAudit } from "../src/lib/protocol-followup-audit.ts";
import { saveProtocolFollowupAudit } from "../src/lib/protocol-followup-audit-store.ts";
import { runProtocolFollowupReview } from "../src/lib/protocol-followup-review.ts";
import { saveProtocolFollowupReview } from "../src/lib/protocol-followup-review-store.ts";
import { buildProtocolFollowups } from "../src/lib/protocol-followups.ts";

let fixtureNumber = 0;
function environment(t) {
  const directory = `.tmp/protocol-review-${process.pid}-${fixtureNumber++}`;
  const previous = process.env.PROTOCOL_FOLLOWUP_AUDIT_DIR;
  process.env.PROTOCOL_FOLLOWUP_AUDIT_DIR = directory;
  fs.rmSync(directory, { recursive: true, force: true });
  t.after(() => {
    if (previous === undefined) delete process.env.PROTOCOL_FOLLOWUP_AUDIT_DIR;
    else process.env.PROTOCOL_FOLLOWUP_AUDIT_DIR = previous;
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  return directory;
}

function auditFixture() {
  const request = {
    id: "review-fixture",
    title: "Review fixture; not experimental data",
    scenarioId: "protocol-rescue",
    status: "draft",
    documents: [{ documentChemblId: "CHEMBL1", title: "Synthetic paper", methodStatus: "method_incomplete" }],
    contacts: [{ name: "Private", email: "private@example.invalid", channel: "email" }],
    workItems: [],
    receipts: [],
    evidence: [],
    sourceReferences: [],
    createdAt: "2026-11-06T00:00:00.000Z",
    updatedAt: "2026-11-06T00:00:00.000Z",
  };
  return buildProtocolFollowupAudit({
    request,
    baseline: buildProtocolFollowups(request),
    baselinePath: "data/protocol-followups/review-fixture.json",
    createdAt: "2026-11-06T02:00:00.000Z",
  });
}

function successfulChat(request) {
  return Promise.resolve({
    provider: request.provider,
    model: request.model || "kimi-for-coding",
    content: `Verified review for ${request.systemPrompt.length}`,
    finishReason: "stop",
    usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
    latencyMs: 12,
  });
}

test("all three real response shapes produce complete and exclude private workflow data from prompts", async () => {
  const audit = auditFixture();
  const prompts = [];
  const record = await runProtocolFollowupReview({
    audit,
    generatedAt: "2026-11-06T03:00:00.000Z",
    chat: (request) => {
      prompts.push(request.userPrompt);
      return successfulChat(request);
    },
  });
  assert.equal(record.schemaVersion, "protocol-followup-review/v1");
  assert.equal(record.auditKey, audit.auditKey);
  assert.equal(record.status, "complete");
  assert.equal(record.reviews.length, 3);
  assert.equal(record.reviews[0].usage.total_tokens, 14);
  assert.equal(record.evidenceUpgrade, false);
  assert.equal(prompts.length, 3);
  assert.equal(prompts.every((prompt) => !prompt.includes("private@example.invalid")), true);
  assert.equal(prompts.every((prompt) => prompt.includes(audit.auditKey)), true);
});

test("truncation, empty content, and rejected roles are partial and redact errors", async () => {
  const audit = auditFixture();
  for (const mode of ["truncated", "empty", "rejected"]) {
    let calls = 0;
    const record = await runProtocolFollowupReview({
      audit,
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
    assert.equal(record.status, "partial");
    assert.equal(record.evidenceUpgrade, false);
    if (mode === "rejected") {
      assert.equal(record.reviews[1].error.includes("xxxxxxxx"), false);
      assert.match(record.reviews[1].error, /redacted/);
    }
  }
});

async function savedReviewFixture(t) {
  const directory = environment(t);
  const audit = auditFixture();
  const savedAudit = saveProtocolFollowupAudit(audit);
  const review = await runProtocolFollowupReview({ audit, chat: successfulChat });
  return { directory, audit, savedAudit, review };
}

test("review store creates monotonic attempts without changing the audit or earlier review", async (t) => {
  const { audit, savedAudit, review } = await savedReviewFixture(t);
  const originalAudit = fs.readFileSync(savedAudit.path, "utf8");
  const first = saveProtocolFollowupReview(audit, review);
  assert.equal(first.attempt, 1);
  const firstText = fs.readFileSync(first.path, "utf8");
  const second = saveProtocolFollowupReview(audit, review);
  assert.equal(second.attempt, 2);
  assert.notEqual(second.path, first.path);
  assert.equal(fs.readFileSync(savedAudit.path, "utf8"), originalAudit);
  assert.equal(fs.readFileSync(first.path, "utf8"), firstText);
  assert.equal(JSON.parse(fs.readFileSync(second.path, "utf8")).auditKey, audit.auditKey);
});

test("review store rejects a mismatched auditKey without creating a file", async (t) => {
  const { directory, audit, review } = await savedReviewFixture(t);
  const mismatched = { ...review, auditKey: "0".repeat(64) };
  assert.throws(() => saveProtocolFollowupReview(audit, mismatched), /auditKey/);
  assert.equal(fs.readdirSync(directory).filter((name) => name.includes("-review-")).length, 0);
});

test("review store rejects secret-like content without creating a file", async (t) => {
  const { directory, audit, review } = await savedReviewFixture(t);
  const secretReview = {
    ...review,
    reviews: review.reviews.map((item, index) => index === 0 ? { ...item, content: `sk-${"x".repeat(24)}` } : item),
  };
  assert.throws(() => saveProtocolFollowupReview(audit, secretReview), /secret/i);
  assert.equal(fs.readdirSync(directory).filter((name) => name.includes("-review-")).length, 0);
});

test("review store requires the underlying audit to exist first", (t) => {
  const directory = environment(t);
  const audit = auditFixture();
  return runProtocolFollowupReview({ audit, chat: successfulChat }).then((review) => {
    assert.throws(() => saveProtocolFollowupReview(audit, review), /audit.*exist|save.*audit/i);
    assert.equal(fs.existsSync(directory), false);
  });
});
