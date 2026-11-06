import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { buildProtocolFollowups } from "../src/lib/protocol-followups.ts";
import {
  readProtocolFollowupAudit,
  readProtocolFollowupBaseline,
  validateProtocolFollowupBaseline,
} from "../src/lib/protocol-followup-audit-store.ts";

export function storeFixture() {
  const request = {
    id: "audit-store-fixture",
    title: "Audit store fixture; not experimental data",
    scenarioId: "protocol-rescue",
    status: "draft",
    documents: [{ documentChemblId: "CHEMBL1", title: "Synthetic paper", methodStatus: "method_incomplete" }],
    contacts: [],
    workItems: [],
    receipts: [],
    evidence: [],
    sourceReferences: [],
    createdAt: "2026-11-06T00:00:00.000Z",
    updatedAt: "2026-11-06T00:00:00.000Z",
  };
  return { request, baseline: buildProtocolFollowups(request) };
}

let fixtureNumber = 0;
export function auditStoreEnvironment(t) {
  const directory = `.tmp/protocol-audit-store-${process.pid}-${fixtureNumber++}`;
  const previous = process.env.PROTOCOL_FOLLOWUP_AUDIT_DIR;
  process.env.PROTOCOL_FOLLOWUP_AUDIT_DIR = directory;
  fs.rmSync(directory, { recursive: true, force: true });
  t.after(() => {
    if (previous === undefined) delete process.env.PROTOCOL_FOLLOWUP_AUDIT_DIR;
    else process.env.PROTOCOL_FOLLOWUP_AUDIT_DIR = previous;
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  return directory;
}

test("baseline reader returns a project-relative path and rejects unsafe filenames", () => {
  const loaded = readProtocolFollowupBaseline("ca-six-2026-v3.json", "ca-six-2026");
  assert.equal(loaded.baseline.requestId, "ca-six-2026");
  assert.equal(loaded.baselinePath, "data/protocol-followups/ca-six-2026-v3.json");
  assert.equal(Array.isArray(loaded.baseline.followups), true);
  for (const filename of ["../protocol-requests/ca-six-2026.json", "/absolute/audit.json", "ca-six-2026-v3.txt", "nested/audit.json"]) {
    assert.throws(() => readProtocolFollowupBaseline(filename), /filename|JSON|basename/i);
  }
});

test("baseline validation rejects cross-request and duplicate semantic fingerprints", () => {
  const { baseline } = storeFixture();
  assert.equal(validateProtocolFollowupBaseline(baseline, "audit-store-fixture").requestId, "audit-store-fixture");
  assert.throws(() => validateProtocolFollowupBaseline(baseline, "another-request"), /requestId/);
  assert.throws(() => validateProtocolFollowupBaseline({ ...baseline, followups: [baseline.followups[0], baseline.followups[0]] }), /duplicate/i);
  assert.throws(() => validateProtocolFollowupBaseline({ requestId: "audit-store-fixture" }), /followups/);
});

test("audit reader rejects a missing record before any write occurs", (t) => {
  const directory = auditStoreEnvironment(t);
  assert.throws(() => readProtocolFollowupAudit("missing.json"), /ENOENT/);
  assert.equal(fs.existsSync(directory), false);
});
