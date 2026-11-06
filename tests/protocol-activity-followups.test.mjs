import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { NextRequest } from "next/server.js";
import { addProtocolEvidence, createProtocolRequest } from "../src/lib/protocol-requests.ts";
import { buildProtocolFollowups } from "../src/lib/protocol-followups.ts";
import { GET } from "../src/app/api/research/protocol-requests/[id]/followups/route.ts";

let fixtureNumber = 0;
const activity = {
  id: "activity-without-context",
  endpoint: "Ki",
  valueRaw: "0.025",
  valueNumber: 0.025,
  qualifier: "exact",
  unit: "µM",
  targetSpecies: "human",
  targetIsoform: "CA II",
};

function fixture(t) {
  const store = `.tmp/protocol-activity-followups-${process.pid}-${fixtureNumber++}`;
  const previous = process.env.PROTOCOL_REQUESTS_DIR;
  process.env.PROTOCOL_REQUESTS_DIR = store;
  fs.rmSync(store, { recursive: true, force: true });
  t.after(() => {
    if (previous === undefined) delete process.env.PROTOCOL_REQUESTS_DIR;
    else process.env.PROTOCOL_REQUESTS_DIR = previous;
    fs.rmSync(store, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  return createProtocolRequest({
    id: `activity-followups-${fixtureNumber}`,
    title: "Activity context followups fixture; not experimental data",
    documents: [{ documentChemblId: "CHEMBL1", title: "Synthetic assay paper", methodStatus: "method_incomplete" }],
  });
}

function addActivityEvidence(request, overrides = {}) {
  return addProtocolEvidence(request.id, {
    documentKey: "CHEMBL1",
    level: "full_text",
    verification: "verified",
    sourceUrl: "https://example.com/activity-followup-fixture",
    locator: "Table 2, row 3",
    quote: "Synthetic activity followup fixture only",
    coverage: "Activity row; context deliberately incomplete",
    lineage: { kind: "primary" },
    activityRecords: [{ ...activity }],
    ...overrides,
  });
}

test("creates separate compound and assay asks for a primary activity row with unknown context", async (t) => {
  const request = fixture(t);
  const saved = addActivityEvidence(request);
  const evidenceId = saved.evidence[0].id;
  const before = JSON.stringify(saved);
  const result = buildProtocolFollowups(saved);
  const contexts = result.followups.filter((item) => item.kind === "activity_context");
  assert.equal(contexts.length, 2);
  assert.equal(result.summary.sourceDocumentRequestCount, 0);
  assert.equal(result.summary.missingFacetCount, 10);
  assert.equal(result.summary.activityContextRequestCount, 2);
  assert.equal(result.summary.missingCompoundRequestCount, 1);
  assert.equal(result.summary.missingAssayRequestCount, 1);
  assert.equal(result.summary.followupCount, 12);
  assert.deepEqual(contexts.map((item) => item.contextField).sort(), ["assayContext", "compoundIdentity"]);
  assert.ok(contexts.every((item) => item.documentKey === "CHEMBL1"));
  assert.ok(contexts.every((item) => item.activityRef.evidenceId === evidenceId));
  assert.ok(contexts.every((item) => item.activityRef.activityId === activity.id));
  assert.ok(contexts.every((item) => item.evidenceIds.length === 1 && item.evidenceIds[0] === evidenceId));
  assert.ok(contexts.every((item) => item.locators.length === 1 && item.locators[0].locator === "Table 2, row 3"));
  assert.ok(contexts.every((item) => item.ask.includes("原始") && item.ask.includes("定位")));
  assert.ok(contexts.every((item) => item.ask.includes("0.025") && item.ask.includes("µM")));
  assert.equal(result.evidenceUpgrade, false);
  assert.equal(JSON.stringify(saved), before);

  const response = await GET(new NextRequest(`http://localhost/api/research/protocol-requests/${request.id}/followups`), {
    params: Promise.resolve({ id: request.id }),
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.data.summary.activityContextRequestCount, 2);
  assert.equal(payload.data.followups.filter((item) => item.kind === "activity_context").length, 2);
  assert.equal(payload.data.evidenceUpgrade, false);
});

test("does not ask for context already referenced by the activity row", (t) => {
  const request = fixture(t);
  const saved = addActivityEvidence(request, {
    activityRecords: [
      {
        ...activity,
        id: "activity-complete-context",
        compoundRef: "compound-a",
        assayRef: "assay-a",
      },
      {
        ...activity,
        id: "activity-only-assay-missing",
        compoundRef: "compound-a",
      },
    ],
    compoundRecords: [{ compoundKey: "compound-a", name: "Synthetic inhibitor A" }],
    assayRecords: [{ assayKey: "assay-a", description: "Synthetic stopped-flow assay" }],
  });
  const result = buildProtocolFollowups(saved);
  const contexts = result.followups.filter((item) => item.kind === "activity_context");
  assert.equal(contexts.length, 1);
  assert.equal(contexts[0].contextField, "assayContext");
  assert.equal(contexts[0].activityRef.activityId, "activity-only-assay-missing");
  assert.equal(result.summary.missingCompoundRequestCount, 0);
  assert.equal(result.summary.missingAssayRequestCount, 1);
  assert.equal(result.summary.activityContextRequestCount, 1);
  assert.equal(result.summary.missingFacetCount, 10);
  assert.equal(result.summary.followupCount, 11);
});

test("abstract activity still asks for the original document before context fields", (t) => {
  const request = fixture(t);
  const saved = addActivityEvidence(request, {
    level: "abstract",
    verification: "unverified",
    locator: "Abstract, results",
    quote: "Synthetic abstract fixture",
    coverage: "Abstract activity only",
  });
  const result = buildProtocolFollowups(saved);
  assert.equal(result.summary.sourceDocumentRequestCount, 1);
  assert.equal(result.summary.missingFacetCount, 0);
  assert.equal(result.summary.activityContextRequestCount, 0);
  assert.equal(result.summary.missingCompoundRequestCount, 0);
  assert.equal(result.summary.missingAssayRequestCount, 0);
  assert.equal(result.summary.followupCount, 1);
  assert.equal(result.followups[0].kind, "source_document");
  assert.equal(result.evidenceUpgrade, false);
});
