import assert from "node:assert/strict";
import test from "node:test";
import { buildActivityGraphFromRequest } from "../src/lib/activity-graph.ts";

const activity = {
  id: "shared-activity",
  endpoint: "Ki",
  valueRaw: "< 0.025",
  valueNumber: 0.025,
  qualifier: "less_than",
  unit: "µM",
  targetSpecies: "human",
  targetIsoform: "CA II",
  constructRef: "shared-construct",
  replicatesRaw: "n = 3",
};
const construct = {
  constructKey: "shared-construct",
  name: "Full-length human CA II",
  kind: "recombinant",
  species: "human",
  isoform: "CA II",
  expressionSystem: "E. coli",
  modifications: ["N-terminal His6 tag"],
};

function evidence(id, activityRecords = [{ ...activity }], constructRecords = [{ ...construct }]) {
  return {
    id,
    documentKey: "CHEMBL1",
    level: "full_text",
    verification: "verified",
    sourceUrl: `https://example.com/${id}`,
    locator: "Table 1, row 1",
    quote: "Synthetic graph fixture only",
    coverage: "Fixture activity and construct",
    independentWetExperiment: false,
    lineage: { kind: "primary" },
    activityRecords,
    constructRecords,
    createdAt: "2026-11-06T00:00:00.000Z",
  };
}

function request(evidenceRecords) {
  return {
    id: "activity-graph-fixture",
    title: "Activity graph fixture; not experimental data",
    scenarioId: "protocol-rescue",
    status: "draft",
    documents: [{ documentChemblId: "CHEMBL1", title: "Synthetic fixture", methodStatus: "method_incomplete" }],
    contacts: [],
    workItems: [],
    receipts: [],
    evidence: evidenceRecords,
    sourceReferences: [],
    createdAt: "2026-11-06T00:00:00.000Z",
    updatedAt: "2026-11-06T00:00:00.000Z",
  };
}

test("same labels remain separate evidence-scoped activity and construct nodes", () => {
  const input = request([evidence("evidence-a"), evidence("evidence-b")]);
  const before = JSON.stringify(input);
  const graph = buildActivityGraphFromRequest(input);
  const activities = graph.nodes.filter((node) => node.type === "activity_observation");
  const constructs = graph.nodes.filter((node) => node.type === "experimental_construct");
  assert.equal(activities.length, 2);
  assert.equal(constructs.length, 2);
  assert.equal(new Set(activities.map((node) => node.id)).size, 2);
  assert.equal(new Set(constructs.map((node) => node.id)).size, 2);
  assert.equal(activities[0].groupKey, activities[1].groupKey);
  assert.equal(activities[0].valueRaw, "< 0.025");
  assert.equal(activities[0].unit, "µM");
  assert.equal(activities[0].sourceUrl, "https://example.com/evidence-a");
  assert.equal(graph.summary.nodeCount, 7);
  assert.equal(graph.summary.edgeCount, 8);
  assert.equal(graph.summary.evidenceCount, 2);
  assert.equal(graph.summary.activityObservationCount, 2);
  assert.equal(graph.summary.constructCount, 2);
  assert.equal(graph.summary.independentWetExperimentCount, 0);
  assert.ok(graph.edges.some((edge) => edge.type === "DESCRIBES" && edge.from === "evidence:evidence-a" && edge.to === "document:CHEMBL1"));
  assert.equal(graph.edges.filter((edge) => edge.type === "REPORTS_ACTIVITY").length, 2);
  assert.equal(graph.edges.filter((edge) => edge.type === "USES_CONSTRUCT").length, 2);
  assert.equal(graph.edges.filter((edge) => edge.type === "DEFINES_CONSTRUCT").length, 2);
  assert.deepEqual(graph.graphRag, {
    mode: "read_only_evidence_projection",
    identity: "evidence_scoped",
    persistentWrite: false,
    modelExtraction: false,
    entityNameMerging: false,
  });
  assert.equal(graph.evidenceUpgrade, false);
  assert.equal(JSON.stringify(input), before);
});

test("keeps unreferenced constructs with provenance without inventing a use relation", () => {
  const graph = buildActivityGraphFromRequest(request([
    evidence("evidence-a", [{ ...activity, constructRef: undefined }], []),
    evidence("evidence-b", [], [{ ...construct, constructKey: "unreferenced" }]),
  ]));
  assert.equal(graph.nodes.filter((node) => node.type === "activity_observation").length, 1);
  const preserved = graph.nodes.find((node) => node.type === "experimental_construct");
  assert.equal(preserved.constructKey, "unreferenced");
  assert.equal(preserved.sourceEvidenceId, "evidence-b");
  assert.equal(preserved.sourceUrl, "https://example.com/evidence-b");
  assert.equal(graph.edges.filter((edge) => edge.type === "USES_CONSTRUCT").length, 0);
  assert.equal(graph.edges.filter((edge) => edge.type === "DEFINES_CONSTRUCT").length, 1);
  assert.equal(graph.summary.nodeCount, 5);
  assert.equal(graph.summary.edgeCount, 4);
});

test("rejects a dangling construct reference instead of creating a phantom graph node", () => {
  const input = request([evidence("evidence-a", [{ ...activity, constructRef: "missing" }], [])]);
  assert.throws(() => buildActivityGraphFromRequest(input), /constructRef.*evidence-a.*missing/);
});

test("does not infer independent wet experiments from abstract activity nodes", () => {
  const abstract = { ...evidence("evidence-abstract"), level: "abstract", verification: "unverified", independentWetExperiment: true };
  const graph = buildActivityGraphFromRequest(request([abstract]));
  assert.equal(graph.nodes.filter((node) => node.type === "activity_observation").length, 1);
  assert.equal(graph.summary.independentWetExperimentCount, 0);
  assert.equal(graph.summary.evidenceUpgrade, false);
  assert.equal(graph.evidenceUpgrade, false);
});
