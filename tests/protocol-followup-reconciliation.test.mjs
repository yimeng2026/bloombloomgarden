import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { NextRequest } from "next/server.js";
import { addProtocolEvidence, createProtocolRequest } from "../src/lib/protocol-requests.ts";
import { buildProtocolFollowups } from "../src/lib/protocol-followups.ts";

let fixtureNumber = 0;
const activity = {
  id: "activity-needing-context",
  endpoint: "Ki",
  valueRaw: "0.025",
  valueNumber: 0.025,
  qualifier: "exact",
  unit: "µM",
  targetSpecies: "human",
  targetIsoform: "CA II",
};

function fixture(t) {
  const store = `.tmp/protocol-followup-reconciliation-${process.pid}-${fixtureNumber++}`;
  const previousDirectory = process.env.PROTOCOL_REQUESTS_DIR;
  process.env.PROTOCOL_REQUESTS_DIR = store;
  fs.rmSync(store, { recursive: true, force: true });
  t.after(() => {
    if (previousDirectory === undefined) delete process.env.PROTOCOL_REQUESTS_DIR;
    else process.env.PROTOCOL_REQUESTS_DIR = previousDirectory;
    fs.rmSync(store, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  const request = createProtocolRequest({
    id: `followup-reconciliation-${fixtureNumber}`,
    title: "Followup reconciliation fixture; not experimental data",
    documents: [{ documentChemblId: "CHEMBL1", title: "Synthetic assay paper", methodStatus: "method_incomplete" }],
  });
  const saved = addProtocolEvidence(request.id, {
    documentKey: "CHEMBL1",
    level: "full_text",
    verification: "verified",
    sourceUrl: "https://example.com/original-activity-fixture",
    locator: "Table 2, row 3",
    quote: "Synthetic followup fixture only",
    coverage: "Activity row without context",
    lineage: { kind: "primary" },
    activityRecords: [{ ...activity }],
  });
  return { request, saved, previous: buildProtocolFollowups(saved) };
}

function supplement(request, previousEvidenceId) {
  return addProtocolEvidence(request.id, {
    documentKey: "CHEMBL1",
    level: "protocol",
    verification: "verified",
    sourceUrl: "https://example.com/derived-context-fixture",
    locator: "Supplement, Table S2",
    quote: "Synthetic derived context fixture only",
    coverage: "Compound and assay context for the earlier activity row",
    lineage: { kind: "primary", derivedFromEvidenceIds: [previousEvidenceId] },
    activityRecords: [{ ...activity, compoundRef: "compound-a", assayRef: "assay-a" }],
    compoundRecords: [{ compoundKey: "compound-a", name: "Synthetic inhibitor A" }],
    assayRecords: [{ assayKey: "assay-a", description: "Synthetic stopped-flow assay" }],
  });
}

test("all followups have deterministic keys independent of generation time", (t) => {
  const { saved } = fixture(t);
  const before = JSON.stringify(saved);
  const first = buildProtocolFollowups(saved);
  const second = buildProtocolFollowups(saved);
  assert.ok(first.followups.length > 0);
  assert.ok(first.followups.every((item) => /^[a-f0-9]{64}$/.test(item.followupKey)));
  assert.deepEqual(first.followups.map((item) => item.followupKey), second.followups.map((item) => item.followupKey));
  assert.equal(new Set(first.followups.map((item) => item.followupKey)).size, first.followups.length);
  const compound = first.followups.find((item) => item.contextField === "compoundIdentity");
  const assay = first.followups.find((item) => item.contextField === "assayContext");
  assert.notEqual(compound.followupKey, assay.followupKey);
  assert.equal(first.evidenceUpgrade, false);
  assert.equal(JSON.stringify(saved), before);
});

test("reconciles a previous context ask only through current primary derived evidence", async (t) => {
  const { request, saved, previous } = fixture(t);
  const previousEvidenceId = saved.evidence[0].id;
  const supplemented = supplement(request, previousEvidenceId);
  const supplementedEvidenceId = supplemented.evidence.at(-1).id;
  const { reconcileProtocolFollowups } = await import("../src/lib/protocol-followup-reconciliation.ts");
  const before = JSON.stringify(supplemented);
  const result = reconcileProtocolFollowups(supplemented, previous);
  assert.equal(result.summary.activityContextRequestCount, 0);
  assert.equal(result.summary.missingCompoundRequestCount, 0);
  assert.equal(result.summary.missingAssayRequestCount, 0);
  assert.equal(result.summary.missingFacetCount, 10);
  assert.equal(result.summary.followupCount, 10);
  assert.equal(result.summary.resolvedFollowupCount, 2);
  assert.equal(result.summary.reviewRequiredPreviousCount, 0);
  assert.equal(result.reconciliation.previousFollowupCount, 12);
  assert.equal(result.reconciliation.resolvedFollowups.length, 2);
  assert.ok(result.reconciliation.resolvedFollowups.every((item) => item.status === "satisfied"));
  assert.ok(result.reconciliation.resolvedFollowups.every((item) => item.resolution.evidenceId === supplementedEvidenceId));
  assert.ok(result.reconciliation.resolvedFollowups.every((item) => item.resolution.derivedFromEvidenceId === previousEvidenceId));
  assert.ok(result.reconciliation.resolvedFollowups.every((item) => item.resolution.locator === "Supplement, Table S2"));
  assert.equal(result.reconciliation.reviewRequired.length, 0);
  assert.equal(result.evidenceUpgrade, false);
  assert.equal(JSON.stringify(supplemented), before);

  const { POST } = await import("../src/app/api/research/protocol-requests/[id]/followups/reconcile/route.ts");
  const response = await POST(new NextRequest(`http://localhost/api/research/protocol-requests/${request.id}/followups/reconcile`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ previous }),
  }), { params: Promise.resolve({ id: request.id }) });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.summary.resolvedFollowupCount, 2);
  assert.equal(payload.data.summary.activityContextRequestCount, 0);
  assert.equal(payload.data.evidenceUpgrade, false);
});

test("an unchanged baseline stays open without duplicate or premature resolution", async (t) => {
  const { saved, previous } = fixture(t);
  const { reconcileProtocolFollowups } = await import("../src/lib/protocol-followup-reconciliation.ts");
  const result = reconcileProtocolFollowups(saved, previous);
  assert.equal(result.summary.activityContextRequestCount, 2);
  assert.equal(result.summary.followupCount, 12);
  assert.equal(result.summary.resolvedFollowupCount, 0);
  assert.equal(result.summary.reviewRequiredPreviousCount, 0);
  assert.deepEqual(result.followups.map((item) => item.followupKey), previous.followups.map((item) => item.followupKey));
});

test("disappearing evidence and non-context asks require review rather than automatic resolution", async (t) => {
  const { saved, previous } = fixture(t);
  const { reconcileProtocolFollowups } = await import("../src/lib/protocol-followup-reconciliation.ts");
  const withoutEvidence = { ...saved, evidence: [] };
  const result = reconcileProtocolFollowups(withoutEvidence, previous);
  assert.equal(result.summary.resolvedFollowupCount, 0);
  assert.equal(result.summary.reviewRequiredPreviousCount, 12);
  assert.equal(result.reconciliation.reviewRequired.filter((item) => item.kind === "activity_context").length, 2);
  assert.equal(result.reconciliation.reviewRequired.filter((item) => item.kind === "method_facet").length, 10);
  assert.equal(result.summary.sourceDocumentRequestCount, 1);
  assert.equal(result.evidenceUpgrade, false);
});

test("rejects cross-request baselines and duplicate previous keys", async (t) => {
  const { saved, previous } = fixture(t);
  const { reconcileProtocolFollowups } = await import("../src/lib/protocol-followup-reconciliation.ts");
  assert.throws(() => reconcileProtocolFollowups(saved, { ...previous, requestId: "another-request" }), /requestId/);
  assert.throws(() => reconcileProtocolFollowups(saved, {
    ...previous,
    followups: [previous.followups[0], previous.followups[0]],
  }), /duplicate/i);
});
