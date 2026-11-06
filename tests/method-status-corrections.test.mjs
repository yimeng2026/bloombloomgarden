import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { NextRequest } from "next/server.js";
import {
  addProtocolEvidence,
  correctProtocolMethodStatus,
  createProtocolRequest,
  getProtocolRequest,
} from "../src/lib/protocol-requests.ts";
import { buildProtocolConsistencyReport } from "../src/lib/protocol-consistency.ts";
import { POST } from "../src/app/api/research/protocol-requests/[id]/method-status-corrections/route.ts";

const completeFacet = {
  assayFamily: "stopped_flow_co2_hydration",
  instrument: "Applied Photophysics",
  substrate: "CO2",
  readout: "pH",
  enzymeSource: "human CA II",
  pH: "7.4",
  temperature: "25 °C",
  incubation: "10 min",
  kiCalculation: "Cheng-Prusoff",
  replicates: "3",
};
let fixtureNumber = 0;

function fixture(t, methodStatus = "explicit_matched") {
  const store = `.tmp/method-status-corrections-${process.pid}-${fixtureNumber++}`;
  const previous = process.env.PROTOCOL_REQUESTS_DIR;
  process.env.PROTOCOL_REQUESTS_DIR = store;
  fs.rmSync(store, { recursive: true, force: true });
  t.after(() => {
    if (previous === undefined) delete process.env.PROTOCOL_REQUESTS_DIR;
    else process.env.PROTOCOL_REQUESTS_DIR = previous;
    fs.rmSync(store, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  return createProtocolRequest({
    id: `method-correction-${fixtureNumber}`,
    title: "Method correction fixture; not experimental data",
    documents: [{ documentChemblId: "CHEMBL1", title: "Synthetic paper", methodStatus }],
  });
}

function abstractEvidence(request) {
  return addProtocolEvidence(request.id, {
    documentKey: "CHEMBL1",
    level: "abstract",
    verification: "unverified",
    sourceUrl: "https://example.com/abstract-correction-fixture",
    locator: "Abstract",
    quote: "Synthetic abstract only; no protocol",
    coverage: "Abstract only",
    lineage: { kind: "primary" },
  });
}

function correctionInput(evidenceId, overrides = {}) {
  return {
    documentKey: "CHEMBL1",
    expectedPreviousStatus: "explicit_matched",
    nextStatus: "method_incomplete",
    reviewer: "Human reviewer",
    rationale: "The available abstract does not contain a complete experimental protocol",
    evidenceIds: [evidenceId],
    decisionSource: "human_review",
    ...overrides,
  };
}

test("explicit human correction preserves the original declaration and clears the consistency issue", async (t) => {
  const request = fixture(t);
  const saved = abstractEvidence(request);
  const evidenceId = saved.evidence[0].id;
  const before = JSON.stringify(saved.evidence);
  const result = correctProtocolMethodStatus(request.id, correctionInput(evidenceId));
  const document = result.request.documents[0];
  assert.equal(document.methodStatus, "method_incomplete");
  assert.equal(document.methodStatusHistory.length, 1);
  assert.equal(document.methodStatusHistory[0].previousStatus, "explicit_matched");
  assert.equal(document.methodStatusHistory[0].nextStatus, "method_incomplete");
  assert.equal(document.methodStatusHistory[0].reviewer, "Human reviewer");
  assert.equal(document.methodStatusHistory[0].decisionSource, "human_review");
  assert.deepEqual(document.methodStatusHistory[0].evidenceIds, [evidenceId]);
  assert.equal(result.correction.id, document.methodStatusHistory[0].id);
  assert.equal(result.evidenceUpgrade, false);
  assert.equal(JSON.stringify(result.request.evidence), before);
  assert.equal(buildProtocolConsistencyReport(result.request).summary.issueCount, 0);
  assert.equal(getProtocolRequest(request.id).documents[0].methodStatusHistory.length, 1);

  const response = await POST(new NextRequest(`http://localhost/api/research/protocol-requests/${request.id}/method-status-corrections`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(correctionInput(evidenceId, {
      expectedPreviousStatus: "method_incomplete",
      nextStatus: "method_incomplete",
    })),
  }), { params: Promise.resolve({ id: request.id }) });
  assert.equal(response.status, 400);
  const unknown = await POST(new NextRequest("http://localhost/api/research/protocol-requests/missing/method-status-corrections", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(correctionInput(evidenceId)),
  }), { params: Promise.resolve({ id: "missing" }) });
  assert.equal(unknown.status, 404);
});

test("cannot upgrade to explicit_matched without a complete primary method fingerprint", (t) => {
  const request = fixture(t, "method_incomplete");
  const saved = abstractEvidence(request);
  const before = JSON.stringify(getProtocolRequest(request.id));
  assert.throws(() => correctProtocolMethodStatus(request.id, correctionInput(saved.evidence[0].id, {
    expectedPreviousStatus: "method_incomplete",
    nextStatus: "explicit_matched",
  })), /complete.*fingerprint|primary/i);
  assert.equal(JSON.stringify(getProtocolRequest(request.id)), before);
});

test("complete primary evidence permits an explicit human upgrade with history", (t) => {
  const request = fixture(t, "method_incomplete");
  const saved = addProtocolEvidence(request.id, {
    documentKey: "CHEMBL1",
    level: "protocol",
    verification: "verified",
    sourceUrl: "https://example.com/full-protocol-correction-fixture",
    locator: "Methods",
    quote: "Complete synthetic protocol fixture",
    coverage: "All method fields",
    lineage: { kind: "primary" },
    methodFacet: completeFacet,
  });
  const result = correctProtocolMethodStatus(request.id, correctionInput(saved.evidence[0].id, {
    expectedPreviousStatus: "method_incomplete",
    nextStatus: "explicit_matched",
    rationale: "All ten method fields were verified in the primary protocol",
  }));
  assert.equal(result.request.documents[0].methodStatus, "explicit_matched");
  assert.equal(result.request.documents[0].methodStatusHistory[0].previousStatus, "method_incomplete");
  assert.equal(result.request.documents[0].methodStatusHistory[0].nextStatus, "explicit_matched");
  assert.equal(result.evidenceUpgrade, false);
});

test("rejects stale state, non-human decisions, empty rationale and unknown evidence without writing", (t) => {
  const request = fixture(t);
  const saved = abstractEvidence(request);
  const evidenceId = saved.evidence[0].id;
  const before = JSON.stringify(getProtocolRequest(request.id));
  for (const overrides of [
    { expectedPreviousStatus: "method_incomplete" },
    { decisionSource: "model_review" },
    { reviewer: " " },
    { rationale: " " },
    { evidenceIds: ["missing-evidence"] },
    { evidenceIds: [] },
  ]) {
    assert.throws(() => correctProtocolMethodStatus(request.id, correctionInput(evidenceId, overrides)), /expectedPreviousStatus|human|reviewer|rationale|evidence/i);
  }
  assert.equal(JSON.stringify(getProtocolRequest(request.id)), before);
});

test("API persists a valid correction and rejects missing body fields", async (t) => {
  const request = fixture(t);
  const saved = abstractEvidence(request);
  const input = correctionInput(saved.evidence[0].id);
  const response = await POST(new NextRequest(`http://localhost/api/research/protocol-requests/${request.id}/method-status-corrections`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  }), { params: Promise.resolve({ id: request.id }) });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.request.documents[0].methodStatus, "method_incomplete");
  assert.equal(payload.data.correction.previousStatus, "explicit_matched");
  assert.equal(payload.evidenceUpgrade, false);

  const invalid = await POST(new NextRequest(`http://localhost/api/research/protocol-requests/${request.id}/method-status-corrections`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ documentKey: "CHEMBL1" }),
  }), { params: Promise.resolve({ id: request.id }) });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).evidenceUpgrade, false);
});
