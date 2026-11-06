import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { addProtocolEvidence, createProtocolRequest, getProtocolRequest } from "../src/lib/protocol-requests.ts";
import { buildMethodLineage, buildMethodLineageFromRequest } from "../src/lib/method-lineage.ts";

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

test("real six-document project keeps context out of target method fingerprints", () => {
  const graph = buildMethodLineage("ca-six-2026");
  assert.equal(graph.summary.documentCount, 6);
  assert.equal(graph.summary.evidenceCount, 8);
  assert.equal(graph.summary.externalContextExcluded, 2);
  assert.equal(graph.summary.fingerprintCompleteCount, 0);
  assert.equal(graph.summary.independentWetExperimentCount, 0);
  assert.equal(graph.summary.comparisonCount, 15);
  assert.equal(graph.summary.comparisonCounts.insufficient, 15);
  assert.equal(graph.summary.evidenceUpgrade, false);
});

test("method matches remain candidates until independent wet experiments are explicit", (t) => {
  const store = `.tmp/method-lineage-${process.pid}`;
  const previous = process.env.PROTOCOL_REQUESTS_DIR;
  process.env.PROTOCOL_REQUESTS_DIR = store;
  fs.rmSync(store, { recursive: true, force: true });
  t.after(() => {
    if (previous === undefined) delete process.env.PROTOCOL_REQUESTS_DIR;
    else process.env.PROTOCOL_REQUESTS_DIR = previous;
    fs.rmSync(store, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  let request = createProtocolRequest({
    id: "method-fixture",
    title: "Method lineage fixture",
    documents: [
      { documentChemblId: "CHEMBL1", title: "A", methodStatus: "method_incomplete" },
      { documentChemblId: "CHEMBL2", title: "B", methodStatus: "method_incomplete" },
    ],
  });
  const primaryIds = [];
  for (const documentKey of ["CHEMBL1", "CHEMBL2"]) {
    request = addProtocolEvidence(request.id, {
      documentKey,
      level: "protocol",
      verification: "verified",
      sourceUrl: `https://example.com/${documentKey}`,
      locator: "methods",
      quote: "complete fixture protocol",
      coverage: "all fixture method fields",
      lineage: { kind: "primary" },
      methodFacet: completeFacet,
      independentWetExperiment: false,
    });
    primaryIds.push(request.evidence.at(-1).id);
  }
  request = addProtocolEvidence(request.id, {
    documentKey: "CHEMBL1",
    level: "protocol",
    verification: "verified",
    sourceUrl: "https://example.com/external-context",
    locator: "external methods",
    quote: "another study uses a different method",
    coverage: "context only",
    lineage: { kind: "context", derivedFromEvidenceIds: [primaryIds[0]] },
    methodFacet: { ...completeFacet, assayFamily: "different_external_assay" },
  });
  assert.throws(() => addProtocolEvidence(request.id, {
    documentKey: "CHEMBL1", level: "lead", verification: "unverified", sourceUrl: "https://example.com/bad",
    lineage: { kind: "citation", derivedFromEvidenceIds: ["missing-parent"] },
  }), /derivedFromEvidenceIds/);
  let graph = buildMethodLineageFromRequest(request);
  assert.equal(graph.summary.fingerprintCompleteCount, 2);
  assert.equal(graph.summary.comparisonCounts.method_match_candidate, 1);
  assert.equal(graph.summary.independentWetExperimentCount, 0);
  assert.equal(graph.summary.externalContextExcluded, 1);
  assert.ok(graph.edges.some((edge) => edge.type === "DERIVED_FROM" && edge.to === primaryIds[0]));

  request = addProtocolEvidence(request.id, {
    documentKey: "CHEMBL1",
    level: "protocol",
    verification: "verified",
    sourceUrl: "https://example.com/alternate-primary",
    locator: "methods",
    quote: "a different pH is explicitly reported",
    coverage: "all fixture method fields",
    lineage: { kind: "primary" },
    methodFacet: { ...completeFacet, pH: "7.5" },
  });
  graph = buildMethodLineageFromRequest(request);
  assert.equal(graph.methodFingerprints.find((item) => item.documentKey === "CHEMBL1").status, "conflict");
  assert.equal(graph.summary.comparisonCounts.conflict, 1);
});
