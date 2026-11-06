import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server.js";
import { getProtocolRequest } from "../src/lib/protocol-requests.ts";
import { buildProtocolConsistencyReport } from "../src/lib/protocol-consistency.ts";
import { GET } from "../src/app/api/research/protocol-consistency/route.ts";

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

function requestWithEvidence(methodStatus, evidence) {
  return {
    id: "consistency-fixture",
    title: "Consistency fixture; not experimental data",
    scenarioId: "protocol-rescue",
    status: "draft",
    documents: [{ documentChemblId: "CHEMBL1", title: "Synthetic paper", methodStatus }],
    contacts: [],
    workItems: [],
    receipts: [],
    evidence,
    sourceReferences: [],
    createdAt: "2026-11-06T00:00:00.000Z",
    updatedAt: "2026-11-06T00:00:00.000Z",
  };
}

function primaryEvidence(overrides = {}) {
  return {
    id: "primary-evidence",
    documentKey: "CHEMBL1",
    level: "protocol",
    verification: "verified",
    sourceUrl: "https://example.com/consistency-fixture",
    locator: "Methods",
    quote: "Synthetic protocol fixture",
    coverage: "All method fields",
    independentWetExperiment: false,
    lineage: { kind: "primary" },
    methodFacet: completeFacet,
    createdAt: "2026-11-06T00:00:00.000Z",
    ...overrides,
  };
}

test("real project flags explicit_matched without a complete primary method fingerprint", async () => {
  const request = getProtocolRequest("ca-six-2026");
  const before = JSON.stringify(request);
  const report = buildProtocolConsistencyReport(request);
  assert.equal(report.summary.documentCount, 6);
  assert.equal(report.summary.issueCount, 1);
  assert.equal(report.summary.methodStatusReviewCount, 1);
  assert.equal(report.summary.independentWetReviewCount, 0);
  assert.equal(report.summary.autoCorrectionCount, 0);
  assert.equal(report.issues[0].kind, "method_status_without_complete_fingerprint");
  assert.equal(report.issues[0].documentKey, "CHEMBL1146805");
  assert.equal(report.issues[0].fingerprintStatus, "insufficient");
  assert.deepEqual(report.issues[0].primaryEvidenceIds, []);
  assert.deepEqual(report.autoCorrections, []);
  assert.equal(report.evidenceUpgrade, false);
  assert.equal(JSON.stringify(request), before);

  const response = await GET(new NextRequest("http://localhost/api/research/protocol-consistency?requestId=ca-six-2026"));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.summary.issueCount, 1);
  assert.equal(payload.evidenceUpgrade, false);
  const missing = await GET(new NextRequest("http://localhost/api/research/protocol-consistency"));
  assert.equal(missing.status, 400);
  const unknown = await GET(new NextRequest("http://localhost/api/research/protocol-consistency?requestId=missing-request"));
  assert.equal(unknown.status, 404);
});

test("complete primary method evidence and an explicit independent experiment produce no issue", () => {
  const request = requestWithEvidence("explicit_matched", [primaryEvidence({ independentWetExperiment: true })]);
  const report = buildProtocolConsistencyReport(request);
  assert.equal(report.summary.issueCount, 0);
  assert.equal(report.summary.methodStatusReviewCount, 0);
  assert.equal(report.summary.independentWetReviewCount, 0);
  assert.equal(report.summary.autoCorrectionCount, 0);
  assert.deepEqual(report.issues, []);
});

test("an abstract independent_wet flag is review-only and never auto-corrected", () => {
  const request = requestWithEvidence("method_incomplete", [primaryEvidence({
    level: "abstract",
    verification: "unverified",
    independentWetExperiment: true,
    methodFacet: undefined,
  })]);
  const before = JSON.stringify(request);
  const report = buildProtocolConsistencyReport(request);
  assert.equal(report.summary.issueCount, 1);
  assert.equal(report.summary.independentWetReviewCount, 1);
  assert.equal(report.issues[0].kind, "independent_wet_evidence_mismatch");
  assert.equal(report.issues[0].level, "abstract");
  assert.equal(report.issues[0].verification, "unverified");
  assert.equal(report.issues[0].lineageKind, "primary");
  assert.equal(report.summary.autoCorrectionCount, 0);
  assert.equal(JSON.stringify(request), before);
});

test("explicit_matched with conflicting primary fields is reported as a conflict", () => {
  const request = requestWithEvidence("explicit_matched", [
    primaryEvidence(),
    primaryEvidence({ id: "primary-variant", methodFacet: { ...completeFacet, pH: "7.5" } }),
  ]);
  const report = buildProtocolConsistencyReport(request);
  assert.equal(report.summary.issueCount, 1);
  assert.equal(report.summary.methodStatusReviewCount, 1);
  assert.equal(report.issues[0].fingerprintStatus, "conflict");
  assert.deepEqual(report.issues[0].primaryEvidenceIds.sort(), ["primary-evidence", "primary-variant"].sort());
  assert.equal(report.summary.autoCorrectionCount, 0);
});
