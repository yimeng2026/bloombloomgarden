import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { NextRequest } from "next/server.js";
import { addProtocolEvidence, createProtocolRequest } from "../src/lib/protocol-requests.ts";

const fixtureId = "followups-fixture";

test("missing evidence becomes precise source and method-field followups without upgrading evidence", async (t) => {
  assert.equal(fs.existsSync(new URL("../src/lib/protocol-followups.ts", import.meta.url)), true, "protocol followups module is not implemented");
  const { buildProtocolFollowups } = await import("../src/lib/protocol-followups.ts");
  const store = `.tmp/protocol-followups-${process.pid}`;
  const previous = process.env.PROTOCOL_REQUESTS_DIR;
  process.env.PROTOCOL_REQUESTS_DIR = store;
  fs.rmSync(store, { recursive: true, force: true });
  t.after(() => {
    if (previous === undefined) delete process.env.PROTOCOL_REQUESTS_DIR;
    else process.env.PROTOCOL_REQUESTS_DIR = previous;
    fs.rmSync(store, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  let request = createProtocolRequest({
    id: fixtureId,
    title: "Protocol followups fixture",
    documents: [
      { documentChemblId: "CHEMBL1", title: "Primary assay paper", methodStatus: "method_incomplete" },
      { documentChemblId: "CHEMBL2", title: "Citation-only paper", methodStatus: "method_incomplete" },
    ],
  });
  const first = addProtocolEvidence(fixtureId, {
    documentKey: "CHEMBL1", level: "protocol", verification: "verified",
    sourceUrl: "https://example.com/primary-a", locator: "methods p. 4", quote: "pH 7.4", coverage: "assay family and pH",
    lineage: { kind: "primary" }, methodFacet: { assayFamily: "stopped_flow_co2_hydration", pH: "7.4" },
  });
  const second = addProtocolEvidence(fixtureId, {
    documentKey: "CHEMBL1", level: "protocol", verification: "verified",
    sourceUrl: "https://example.com/primary-b", locator: "supplement p. 8", quote: "pH 7.5", coverage: "pH variant",
    lineage: { kind: "primary" }, methodFacet: { pH: "7.5" },
  });
  request = second;
  request = addProtocolEvidence(fixtureId, {
    documentKey: "CHEMBL2", level: "full_text", verification: "verified",
    sourceUrl: "https://example.com/citation", locator: "cited work", quote: "secondary report", coverage: "secondary only",
    lineage: { kind: "citation" }, methodFacet: { instrument: "external instrument must not be adopted" },
  });
  const before = JSON.stringify(request);
  const result = buildProtocolFollowups(request);
  assert.equal(JSON.stringify(request), before);
  assert.equal(result.evidenceUpgrade, false);
  assert.equal(result.summary.sourceDocumentRequestCount, 1);
  assert.equal(result.summary.conflictFacetCount, 1);
  assert.equal(result.summary.missingFacetCount, 8);
  const sourceRequest = result.followups.find((item) => item.kind === "source_document");
  assert.equal(sourceRequest.documentKey, "CHEMBL2");
  assert.ok(sourceRequest.ask.includes("原始"));
  assert.ok(sourceRequest.ask.includes("早期文献"));
  assert.equal(sourceRequest.citationEvidenceIds.length, 1);
  assert.equal(sourceRequest.contextEvidenceIds.length, 0);
  assert.equal(sourceRequest.targetPrimaryEvidenceIds.length, 0);
  assert.equal(sourceRequest.locators.every((item) => item.lineageKind === "citation" && item.level === "full_text"), true);
  const conflict = result.followups.find((item) => item.kind === "resolve_conflict");
  assert.equal(conflict.field, "pH");
  assert.deepEqual(conflict.existingValues, ["7.4", "7.5"]);
  assert.deepEqual(conflict.evidenceIds, [first.evidence.at(-1).id, second.evidence.at(-1).id]);
  const instrument = result.followups.find((item) => item.kind === "method_facet" && item.field === "instrument");
  assert.ok(instrument.ask.includes("仪器"));
  assert.ok(instrument.ask.includes("定位"));
  assert.equal(result.followups.some((item) => String(item.existingValues || []).includes("external instrument must not be adopted")), false);

  const { GET } = await import("../src/app/api/research/protocol-requests/[id]/followups/route.ts");
  const response = await GET(new NextRequest(`http://localhost/api/research/protocol-requests/${fixtureId}/followups`), { params: Promise.resolve({ id: fixtureId }) });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.success, true);
  assert.equal(payload.data.evidenceUpgrade, false);
  assert.equal(payload.data.summary.missingFacetCount, 8);
  const missing = await GET(new NextRequest("http://localhost/api/research/protocol-requests/missing/followups"), { params: Promise.resolve({ id: "missing" }) });
  assert.equal(missing.status, 404);
});
