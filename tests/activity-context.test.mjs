import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { addProtocolEvidence, createProtocolRequest } from "../src/lib/protocol-requests.ts";
import { buildActivityRegisterFromRequest } from "../src/lib/activity-register.ts";
import { buildActivityGraphFromRequest } from "../src/lib/activity-graph.ts";

let fixtureNumber = 0;
const compoundA = {
  compoundKey: "compound-a",
  name: "Synthetic inhibitor A",
  externalIds: [{ namespace: "ChEMBL", value: "CHEMBL-FIXTURE-A" }],
};
const compoundB = {
  compoundKey: "compound-b",
  name: "Synthetic inhibitor B",
  externalIds: [{ namespace: "ChEMBL", value: "CHEMBL-FIXTURE-B" }],
};
const assayA = {
  assayKey: "assay-a",
  description: "Synthetic stopped-flow CO2 hydration assay",
  typeRaw: "B",
  formatRaw: "stopped-flow",
};
const assayB = {
  assayKey: "assay-b",
  description: "Synthetic fluorescence assay",
  typeRaw: "B",
  formatRaw: "fluorescence",
};
const activity = {
  id: "activity-a",
  endpoint: "Ki",
  valueRaw: "0.025",
  valueNumber: 0.025,
  qualifier: "exact",
  unit: "µM",
  targetSpecies: "human",
  targetIsoform: "CA II",
  compoundRef: "compound-a",
  assayRef: "assay-a",
};

function fixture(t) {
  const store = `.tmp/activity-context-${process.pid}-${fixtureNumber++}`;
  const previous = process.env.PROTOCOL_REQUESTS_DIR;
  process.env.PROTOCOL_REQUESTS_DIR = store;
  fs.rmSync(store, { recursive: true, force: true });
  t.after(() => {
    if (previous === undefined) delete process.env.PROTOCOL_REQUESTS_DIR;
    else process.env.PROTOCOL_REQUESTS_DIR = previous;
    fs.rmSync(store, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  return createProtocolRequest({
    id: `activity-context-${fixtureNumber}`,
    title: "Activity context fixture; not experimental data",
    documents: [{ documentChemblId: "CHEMBL1", title: "Synthetic fixture", methodStatus: "method_incomplete" }],
  });
}

function addEvidence(request, overrides = {}) {
  const {
    activityRecords = [{ ...activity }],
    compoundRecords = [{ ...compoundA, externalIds: compoundA.externalIds.map((item) => ({ ...item })) }],
    assayRecords = [{ ...assayA }],
    constructRecords = [],
    ...evidenceOverrides
  } = overrides;
  return addProtocolEvidence(request.id, {
    documentKey: "CHEMBL1",
    level: "full_text",
    verification: "verified",
    sourceUrl: "https://example.com/activity-context-fixture",
    locator: "Table 1 and Methods",
    quote: "Synthetic context fixture only",
    coverage: "Compound, activity and assay fields",
    lineage: { kind: "primary" },
    activityRecords,
    compoundRecords,
    assayRecords,
    constructRecords,
    ...evidenceOverrides,
  });
}

test("persists raw compound identifiers, assay descriptions and local activity references", (t) => {
  const request = fixture(t);
  const saved = addEvidence(request);
  const evidence = saved.evidence[0];
  assert.deepEqual(evidence.compoundRecords, [compoundA]);
  assert.deepEqual(evidence.assayRecords, [assayA]);
  assert.equal(evidence.activityRecords[0].compoundRef, "compound-a");
  assert.equal(evidence.activityRecords[0].assayRef, "assay-a");
  assert.equal(evidence.activityRecords[0].targetSpecies, "human");
  assert.equal(evidence.activityRecords[0].targetIsoform, "CA II");
});

test("separates equal values by compound and assay without converting or ranking them", (t) => {
  const request = fixture(t);
  const saved = addEvidence(request, {
    compoundRecords: [compoundA, compoundB],
    assayRecords: [assayA, assayB],
    activityRecords: [
      { ...activity },
      { ...activity, id: "activity-b", compoundRef: "compound-b" },
      { ...activity, id: "activity-c", assayRef: "assay-b" },
      { ...activity, id: "activity-d", compoundRef: "compound-b", assayRef: "assay-b" },
    ],
  });
  const register = buildActivityRegisterFromRequest(saved);
  assert.equal(register.summary.recordCount, 4);
  assert.equal(register.summary.groupCount, 4);
  assert.equal(new Set(register.groups.map((group) => group.compoundRef)).size, 2);
  assert.equal(new Set(register.groups.map((group) => group.assayRef)).size, 2);
  assert.ok(register.groups.every((group) => group.endpoint === "Ki" && group.unit === "µM"));
  assert.ok(register.groups.every((group) => group.rawValues[0].valueRaw === "0.025"));
});

test("rejects unknown references, duplicate context keys and empty external identifiers", (t) => {
  const request = fixture(t);
  assert.throws(() => addEvidence(request, {
    activityRecords: [{ ...activity, compoundRef: "unknown-compound" }],
  }), /compoundRef.*unknown-compound/);
  assert.throws(() => addEvidence(request, {
    activityRecords: [{ ...activity, assayRef: "unknown-assay" }],
  }), /assayRef.*unknown-assay/);
  assert.throws(() => addEvidence(request, {
    compoundRecords: [compoundA, compoundA],
  }), /compoundKey.*unique/);
  assert.throws(() => addEvidence(request, {
    assayRecords: [assayA, assayA],
  }), /assayKey.*unique/);
  assert.throws(() => addEvidence(request, {
    compoundRecords: [{ ...compoundA, externalIds: [{ namespace: "ChEMBL", value: " " }] }],
  }), /externalIds.*value/);
});

test("projects evidence-scoped compound and assay nodes with explicit measurement edges", (t) => {
  const request = fixture(t);
  let saved = addEvidence(request);
  saved = addProtocolEvidence(request.id, {
    documentKey: "CHEMBL1",
    level: "partial_text",
    verification: "unverified",
    sourceUrl: "https://example.com/second-context-fixture",
    locator: "Results paragraph",
    quote: "Second synthetic context fixture",
    coverage: "Partial fixture context",
    lineage: { kind: "primary" },
    activityRecords: [{ ...activity }],
    compoundRecords: [compoundA],
    assayRecords: [assayA],
  });
  const before = JSON.stringify(saved);
  const graph = buildActivityGraphFromRequest(saved);
  const compounds = graph.nodes.filter((node) => node.type === "test_compound");
  const assays = graph.nodes.filter((node) => node.type === "assay_context");
  assert.equal(compounds.length, 2);
  assert.equal(assays.length, 2);
  assert.equal(new Set(compounds.map((node) => node.id)).size, 2);
  assert.equal(new Set(assays.map((node) => node.id)).size, 2);
  assert.ok(compounds.every((node) => node.compoundKey === "compound-a"));
  assert.ok(assays.every((node) => node.assayKey === "assay-a"));
  assert.equal(graph.edges.filter((edge) => edge.type === "TESTS_COMPOUND").length, 2);
  assert.equal(graph.edges.filter((edge) => edge.type === "MEASURED_IN_ASSAY").length, 2);
  assert.equal(graph.edges.filter((edge) => edge.type === "DEFINES_COMPOUND").length, 2);
  assert.equal(graph.edges.filter((edge) => edge.type === "DEFINES_ASSAY").length, 2);
  assert.equal(graph.summary.nodeCount, 9);
  assert.equal(graph.summary.edgeCount, 12);
  assert.equal(graph.summary.compoundCount, 2);
  assert.equal(graph.summary.assayCount, 2);
  assert.equal(graph.summary.independentWetExperimentCount, 0);
  assert.equal(graph.graphRag.persistentWrite, false);
  assert.equal(graph.evidenceUpgrade, false);
  assert.equal(JSON.stringify(saved), before);
});

test("keeps unreferenced compound and assay definitions without inventing measurements", (t) => {
  const request = fixture(t);
  const saved = addEvidence(request, { activityRecords: [] });
  const graph = buildActivityGraphFromRequest(saved);
  assert.equal(graph.nodes.filter((node) => node.type === "test_compound").length, 1);
  assert.equal(graph.nodes.filter((node) => node.type === "assay_context").length, 1);
  assert.equal(graph.edges.filter((edge) => edge.type === "TESTS_COMPOUND").length, 0);
  assert.equal(graph.edges.filter((edge) => edge.type === "MEASURED_IN_ASSAY").length, 0);
  assert.equal(graph.edges.filter((edge) => edge.type === "DEFINES_COMPOUND").length, 1);
  assert.equal(graph.edges.filter((edge) => edge.type === "DEFINES_ASSAY").length, 1);
});
