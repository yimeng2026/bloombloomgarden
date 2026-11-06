import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { NextRequest } from "next/server.js";
import { addProtocolEvidence, createProtocolRequest } from "../src/lib/protocol-requests.ts";
import { buildActivityRegisterFromRequest } from "../src/lib/activity-register.ts";
import { GET } from "../src/app/api/research/activity-register/route.ts";

let fixtureNumber = 0;
const humanCaIIConstruct = {
  constructKey: "hcaii-full-length",
  name: "Full-length human CA II",
  kind: "recombinant",
  species: "human",
  isoform: "CA II",
  expressionSystem: "E. coli",
  modifications: ["N-terminal His6 tag"],
};
const kiActivity = {
  id: "activity-ki-1",
  endpoint: "Ki",
  valueRaw: "0.025",
  valueNumber: 0.025,
  qualifier: "exact",
  unit: "µM",
  targetSpecies: "human",
  targetIsoform: "CA II",
  constructRef: "hcaii-full-length",
  replicatesRaw: "n = 3",
};

function fixture(t) {
  const store = `.tmp/activity-register-${process.pid}-${fixtureNumber++}`;
  const previous = process.env.PROTOCOL_REQUESTS_DIR;
  process.env.PROTOCOL_REQUESTS_DIR = store;
  fs.rmSync(store, { recursive: true, force: true });
  t.after(() => {
    if (previous === undefined) delete process.env.PROTOCOL_REQUESTS_DIR;
    else process.env.PROTOCOL_REQUESTS_DIR = previous;
    fs.rmSync(store, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  return createProtocolRequest({
    id: `activity-fixture-${fixtureNumber}`,
    title: "Activity register fixture; not experimental data",
    documents: [{ documentChemblId: "CHEMBL1", title: "Synthetic fixture", methodStatus: "method_incomplete" }],
  });
}

function addEvidence(request, overrides = {}) {
  const { activityRecords, constructRecords, ...evidenceOverrides } = overrides;
  return addProtocolEvidence(request.id, {
    documentKey: "CHEMBL1",
    level: "full_text",
    verification: "verified",
    sourceUrl: "https://example.com/synthetic-fixture",
    locator: "Table 1, row 1",
    quote: "Synthetic fixture for schema validation only",
    coverage: "Activity and construct fields only",
    lineage: { kind: "primary" },
    activityRecords: activityRecords === undefined ? [kiActivity] : activityRecords,
    constructRecords: constructRecords === undefined ? [humanCaIIConstruct] : constructRecords,
    ...evidenceOverrides,
  });
}

test("persists exact activity text, unit, species, isoform and a local construct reference", (t) => {
  const request = fixture(t);
  const saved = addEvidence(request);
  const evidence = saved.evidence.at(-1);
  assert.deepEqual(evidence.activityRecords, [kiActivity]);
  assert.deepEqual(evidence.constructRecords, [humanCaIIConstruct]);
  assert.equal(evidence.independentWetExperiment, false);
  const register = buildActivityRegisterFromRequest(saved);
  assert.equal(register.records[0].valueRaw, "0.025");
  assert.equal(register.records[0].unit, "µM");
  assert.equal(register.records[0].targetSpecies, "human");
  assert.equal(register.records[0].targetIsoform, "CA II");
  assert.equal(register.records[0].constructRef, "hcaii-full-length");
  assert.equal(register.records[0].sourceEvidenceId, evidence.id);
  assert.equal(register.summary.recordCount, 1);
  assert.equal(register.summary.independentWetExperimentCount, 0);
  assert.equal(register.evidenceUpgrade, false);
});

test("does not merge endpoints, units, isoforms or unregistered aliases", (t) => {
  const request = fixture(t);
  const saved = addEvidence(request, {
    activityRecords: [
      kiActivity,
      { ...kiActivity, id: "activity-ic50", endpoint: "IC50" },
      { ...kiActivity, id: "activity-nm", valueRaw: "25", valueNumber: 25, unit: "nM" },
      { ...kiActivity, id: "activity-cai", targetIsoform: "CA I", constructRef: undefined },
      { ...kiActivity, id: "activity-human-cai", targetSpecies: "human CA I", targetIsoform: undefined, constructRef: undefined },
      { ...kiActivity, id: "activity-native", constructRef: undefined },
    ],
  });
  const register = buildActivityRegisterFromRequest(saved);
  assert.equal(register.summary.recordCount, 6);
  assert.equal(register.summary.groupCount, 6);
  assert.equal(register.groups.find((group) => group.endpoint === "Ki" && group.unit === "µM").rawValues.length, 1);
  assert.equal(register.groups.find((group) => group.endpoint === "IC50").rawValues.length, 1);
  assert.equal(register.groups.find((group) => group.unit === "nM").rawValues[0].valueRaw, "25");
  assert.ok(register.groups.some((group) => group.targetIsoform === "CA I"));
  assert.ok(register.groups.some((group) => group.targetSpecies === "human CA I"));
  assert.equal(register.groups.find((group) => group.unit === "nM").rawValues[0].unit, "nM");
  assert.ok(!Object.hasOwn(register.summary, "mean"));
  assert.ok(!Object.hasOwn(register.summary, "median"));
});

test("keeps inequalities and ranges as distinct raw observations", (t) => {
  const request = fixture(t);
  const saved = addEvidence(request, {
    activityRecords: [
      { ...kiActivity, qualifier: "less_than", valueRaw: "< 0.025" },
      { ...kiActivity, id: "activity-range", qualifier: "range", valueRaw: "0.02–0.03", valueNumber: undefined },
    ],
  });
  const register = buildActivityRegisterFromRequest(saved);
  assert.equal(register.summary.recordCount, 2);
  assert.equal(register.summary.groupCount, 1);
  assert.equal(register.summary.rangeCount, 1);
  assert.deepEqual(register.groups[0].rawValues.map((item) => [item.valueRaw, item.qualifier, item.valueNumber]), [
    ["< 0.025", "less_than", 0.025],
    ["0.02–0.03", "range", undefined],
  ]);
});

test("rejects collapsed ranges, non-finite numbers and dangling construct references", (t) => {
  const request = fixture(t);
  for (const activityRecords of [
    [{ ...kiActivity, qualifier: "range", valueRaw: "0.02–0.03" }],
    [{ ...kiActivity, valueNumber: Number.NaN }],
    [{ ...kiActivity, valueNumber: Number.POSITIVE_INFINITY }],
    [{ ...kiActivity, constructRef: "not-in-this-evidence" }],
  ]) {
    assert.throws(() => addEvidence(request, { activityRecords }), /range|finite|constructRef/);
  }
  assert.throws(() => addEvidence(request, {
    constructRecords: [humanCaIIConstruct, humanCaIIConstruct],
  }), /constructKey.*unique/);
  assert.throws(() => addEvidence(request, {
    constructRecords: [{ ...humanCaIIConstruct, modifications: ["His6", " "] }],
  }), /modifications/);
  assert.throws(() => addEvidence(request, {
    activityRecords: [{ ...kiActivity, targetSpecies: " " }],
  }), /targetSpecies/);
  assert.throws(() => addEvidence(request, {
    activityRecords: [{ ...kiActivity, id: "duplicate" }, { ...kiActivity, id: "duplicate" }],
  }), /activity.*unique/i);
});

test("rejects activity or constructs from leads, metadata and non-primary lineage", (t) => {
  const request = fixture(t);
  for (const overrides of [
    { level: "lead", verification: "unverified" },
    { level: "metadata", verification: "unverified" },
    { lineage: { kind: "curation" } },
    { lineage: { kind: "context" } },
    { lineage: undefined },
    { level: "abstract", verification: "unverified", lineage: { kind: "context" }, constructRecords: [humanCaIIConstruct], activityRecords: [] },
  ]) {
    assert.throws(() => addEvidence(request, overrides), /primary.*abstract|activity|construct/i, JSON.stringify(overrides));
  }
  assert.equal(request.evidence.length, 0);
});

test("abstract activity never promotes evidence or counts as an independent wet experiment", (t) => {
  const request = fixture(t);
  let saved = addEvidence(request, {
    level: "abstract",
    verification: "unverified",
    locator: "Abstract, results",
    quote: "Synthetic abstract fixture",
    coverage: "Abstract only",
    independentWetExperiment: true,
  });
  assert.equal(buildActivityRegisterFromRequest(saved).summary.independentWetExperimentCount, 0);
  saved = addProtocolEvidence(request.id, {
    documentKey: "CHEMBL1",
    level: "protocol",
    verification: "verified",
    sourceUrl: "https://example.com/explicit-independent-fixture",
    locator: "Methods",
    quote: "Explicit synthetic provenance fixture",
    coverage: "Provenance declaration only",
    lineage: { kind: "primary" },
    independentWetExperiment: true,
  });
  const before = JSON.stringify(saved);
  const register = buildActivityRegisterFromRequest(saved);
  assert.equal(register.summary.independentWetExperimentCount, 1);
  assert.equal(register.summary.evidenceUpgrade, false);
  assert.equal(register.evidenceUpgrade, false);
  assert.equal(JSON.stringify(saved), before);
});

test("GET returns exact groups and distinguishes missing, unknown and invalid requests", async (t) => {
  const request = fixture(t);
  const saved = addEvidence(request, {
    activityRecords: [kiActivity, { ...kiActivity, id: "activity-ic50", endpoint: "IC50" }],
  });
  const response = await GET(new NextRequest(`http://localhost/api/research/activity-register?requestId=${request.id}`));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.summary.groupCount, 2);
  assert.equal(payload.data.groups.find((group) => group.endpoint === "Ki").rawValues[0].sourceEvidenceId, saved.evidence[0].id);
  assert.equal(payload.evidenceUpgrade, false);

  const missing = await GET(new NextRequest("http://localhost/api/research/activity-register"));
  assert.equal(missing.status, 400);
  assert.equal((await missing.json()).evidenceUpgrade, false);
  const unknown = await GET(new NextRequest("http://localhost/api/research/activity-register?requestId=not-a-real-request"));
  assert.equal(unknown.status, 404);
  assert.equal((await unknown.json()).evidenceUpgrade, false);
  const invalid = await GET(new NextRequest("http://localhost/api/research/activity-register?requestId=not%20valid"));
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).evidenceUpgrade, false);
});
