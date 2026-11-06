import assert from "node:assert/strict";
import test from "node:test";
import { buildProtocolFollowups } from "../src/lib/protocol-followups.ts";
import {
  buildProtocolFollowupAudit,
  canonicalJson,
  computeProtocolFollowupAuditKey,
  snapshotProtocolRequest,
  verifyProtocolFollowupAudit,
} from "../src/lib/protocol-followup-audit.ts";

export function auditFixture() {
  const request = {
    id: "audit-fixture",
    title: "Audit fixture; not experimental data",
    scenarioId: "protocol-rescue",
    status: "draft",
    documents: [{ documentChemblId: "CHEMBL1", title: "Synthetic paper", methodStatus: "method_incomplete" }],
    contacts: [{ name: "Fixture contact", email: "private@example.invalid", channel: "email" }],
    workItems: [{ id: "work", title: "Private workflow", kind: "task", integration: "local", purpose: "test", status: "pending" }],
    receipts: [{ id: "receipt", type: "note", channel: "local", occurredAt: "2026-11-06T00:00:00.000Z", note: "private receipt" }],
    evidence: [],
    reviews: [{ id: "review", role: "fixture", provider: "fixture", model: "fixture", content: "private review", createdAt: "2026-11-06T00:00:00.000Z" }],
    sourceReferences: [],
    createdAt: "2026-11-06T00:00:00.000Z",
    updatedAt: "2026-11-06T00:00:00.000Z",
  };
  return { request, baseline: buildProtocolFollowups(request) };
}

test("canonical JSON sorts object keys without reordering arrays", () => {
  assert.equal(canonicalJson({ b: [2, 1], a: { d: 1, c: 2 } }), '{"a":{"c":2,"d":1},"b":[2,1]}');
  assert.equal(canonicalJson({ "😀": 1, a: 2 }), '{"a":2,"😀":1}');
  assert.equal(canonicalJson({ "10": 1, "2": 2 }), '{"10":1,"2":2}');
  assert.throws(() => canonicalJson(undefined), /top-level JSON value/);
});

test("snapshot removes private workflow data without mutating the request", () => {
  const { request } = auditFixture();
  const before = JSON.stringify(request);
  const snapshot = snapshotProtocolRequest(request);
  assert.deepEqual(snapshot.contacts, []);
  assert.deepEqual(snapshot.receipts, []);
  assert.deepEqual(snapshot.workItems, []);
  assert.equal(Object.hasOwn(snapshot, "reviews"), false);
  assert.deepEqual(snapshot.documents, request.documents);
  assert.deepEqual(snapshot.evidence, request.evidence);
  assert.equal(JSON.stringify(request), before);
});

test("audit keys are deterministic and include exact baseline and snapshot content", () => {
  const { request, baseline } = auditFixture();
  const requestSnapshot = snapshotProtocolRequest(request);
  const input = { requestId: request.id, baseline, requestSnapshot };
  const first = computeProtocolFollowupAuditKey(input);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(computeProtocolFollowupAuditKey(input), first);
  assert.notEqual(computeProtocolFollowupAuditKey({
    ...input,
    algorithmVersion: "protocol-followup-reconciliation/v2",
  }), first);
  assert.notEqual(computeProtocolFollowupAuditKey({
    ...input,
    baseline: { ...baseline, generatedAt: "2026-11-06T01:00:00.000Z" },
  }), first);
  assert.notEqual(computeProtocolFollowupAuditKey({
    ...input,
    requestSnapshot: {
      ...requestSnapshot,
      documents: [{ ...requestSnapshot.documents[0], methodStatus: "explicit_matched" }],
    },
  }), first);
});

test("audit bundle replays the same deterministic result while ignoring only result root generatedAt", () => {
  const { request, baseline } = auditFixture();
  const before = JSON.stringify({ request, baseline });
  const audit = buildProtocolFollowupAudit({
    request,
    baseline,
    baselinePath: "data/protocol-followups/audit-fixture.json",
    sourceRevision: "fixture-revision",
    createdAt: "2026-11-06T02:00:00.000Z",
  });
  assert.equal(audit.requestId, request.id);
  assert.equal(audit.sourceRevision, "fixture-revision");
  assert.equal(audit.evidenceUpgrade, false);
  assert.deepEqual(audit.inputs.requestSnapshot.contacts, []);
  assert.equal(verifyProtocolFollowupAudit(audit).ok, true);

  const timestampsChanged = structuredClone(audit);
  timestampsChanged.createdAt = "2026-11-06T03:00:00.000Z";
  timestampsChanged.deterministicResult.generatedAt = "2026-11-06T03:00:00.000Z";
  assert.equal(verifyProtocolFollowupAudit(timestampsChanged).ok, true);

  const tampered = structuredClone(audit);
  tampered.deterministicResult.followups[0].ask = "tampered ask";
  assert.throws(() => verifyProtocolFollowupAudit(tampered), /deterministic result/i);

  const wrongVersion = structuredClone(audit);
  wrongVersion.algorithmVersion = "protocol-followup-reconciliation/v999";
  assert.throws(() => verifyProtocolFollowupAudit(wrongVersion), /algorithm version/i);
  assert.equal(JSON.stringify({ request, baseline }), before);
});
