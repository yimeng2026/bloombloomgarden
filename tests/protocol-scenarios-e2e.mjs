import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PORT = 3100;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const STORE = path.join(".tmp", "protocol-e2e-store");
const LOG = path.join(ROOT, ".tmp", "protocol-e2e-next.log");
const TOKEN = "e2e-protocol-token-0123456789abcdef0123456789";
fs.mkdirSync(path.dirname(LOG), { recursive: true });
fs.rmSync(STORE, { recursive: true, force: true });
const log = fs.openSync(LOG, "w");
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(PORT)], {
  cwd: ROOT,
  env: {
    ...process.env,
    PROTOCOL_REQUESTS_DIR: STORE,
    GARDEN_AGENT_TOKEN: TOKEN,
    GARDEN_USE_CLUSTER: "0",
    POOL_RELAY_BASE_URL: "http://relay.test/v1",
    POOL_RELAY_API_KEY: "e2e-not-a-secret",
    ...Object.fromEntries(Array.from({ length: 11 }, (_, index) => [`POOL_RELAY_API_KEY_${index + 2}`, ""])),
    POOL_RELAY_MODEL: "gpt-5.5",
    POOL_RELAY_API_STYLE: "responses",
    POOL_RELAY_REASONING_EFFORT: "low",
  },
  stdio: ["ignore", log, log],
});

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function call(method, route, body) {
  const response = await fetch(`${ORIGIN}${route}`, {
    method,
    headers: { ...(body ? { "content-type": "application/json" } : {}), Authorization: `Bearer ${TOKEN}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  return { status: response.status, payload };
}
function ok(result, status = 200) {
  assert.equal(result.status, status, JSON.stringify(result.payload));
  assert.equal(result.payload.success, true, JSON.stringify(result.payload));
  return result.payload;
}

function stopTree(child) {
  if (!child || child.exitCode !== null || child.signalCode) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => child.kill(), 5000);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
    if (process.platform === "win32") {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      killer.once("error", () => child.kill());
    } else child.kill("SIGTERM");
  });
}

const documents = [
  { documentChemblId: "CHEMBL1146805", doi: "10.1016/j.bmcl.2004.04.106", title: "CA XIII study", methodStatus: "explicit_matched" },
  { documentChemblId: "CHEMBL1133556", doi: "10.1021/jm001051+", title: "Thiourea study", methodStatus: "method_incomplete" },
];

try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const response = await fetch(`${ORIGIN}/api/research/scenarios`, { headers: { Authorization: `Bearer ${TOKEN}` } });
      if (response.ok) { ready = true; break; }
    } catch { /* server is still starting */ }
    await pause(250);
  }
  assert.ok(ready, "Next.js did not start; inspect .tmp/protocol-e2e-next.log");

  const rootResponse = await fetch(`${ORIGIN}/`);
  assert.equal(rootResponse.status, 200, "API discovery route should remain available without the removed frontend");
  const discovery = await rootResponse.json();
  assert.equal(discovery.service, "BloomBloomGarden Kimi API");
  assert.ok(discovery.endpoints.some((endpoint) => endpoint.path === "/api/research/scenarios"));

  const scenarios = ok(await call("GET", "/api/research/scenarios"));
  assert.equal(scenarios.data.length, 6);
  assert.ok(scenarios.data.every((scenario) => scenario.workItems.length >= 4 && scenario.evidenceBoundaries.length >= 3));

  const providerStatus = await call("GET", "/api/llm-pool/status");
  assert.equal(providerStatus.status, 200, JSON.stringify(providerStatus.payload));
  assert.equal(providerStatus.payload.probed, false);
  assert.ok(providerStatus.payload.externalProviders.some((provider) => provider.id === "relay" && provider.keyCount === 1));
  assert.equal(JSON.stringify(providerStatus.payload).includes("e2e-not-a-secret"), false);

  const created = ok(await call("POST", "/api/research/scenarios", {
    scenarioId: "protocol-rescue",
    requestId: "e2e-protocol",
    title: "E2E protocol rescue",
    documents,
    contacts: [],
  }), 201);
  assert.equal(created.data.status, "draft");
  assert.equal(created.data.workItems.length, 5);

  ok(await call("PATCH", "/api/research/protocol-requests/e2e-protocol", { status: "ready" }));
  ok(await call("POST", "/api/research/protocol-requests/e2e-protocol/receipts", {
    type: "sent", channel: "e2e-test", note: "send receipt only; not delivery evidence",
  }), 201);

  ok(await call("POST", "/api/research/protocol-requests/e2e-protocol/evidence", {
    documentKey: "CHEMBL1146805",
    level: "partial_text",
    verification: "verified",
    sourceUrl: "https://example.com/ca13-snippet",
    locator: "publisher snippet",
    quote: "inhibition data against isozymes I, II, and IX have been published earlier",
    coverage: "partial text only",
  }), 201);

  const missingLineage = await call("GET", "/api/research/method-lineage");
  assert.equal(missingLineage.status, 400);
  const lineage = ok(await call("GET", "/api/research/method-lineage?requestId=e2e-protocol"));
  assert.equal(lineage.evidenceUpgrade, false);
  assert.equal(lineage.data.summary.documentCount, 2);
  assert.equal(lineage.data.summary.comparisonCounts.insufficient, 1);
  assert.equal(lineage.data.summary.independentWetExperimentCount, 0);

  const followups = ok(await call("GET", "/api/research/protocol-requests/e2e-protocol/followups"));
  assert.equal(followups.data.evidenceUpgrade, false);
  assert.equal(followups.data.summary.documentCount, 2);
  assert.equal(followups.data.summary.sourceDocumentRequestCount, 2);
  assert.equal(followups.data.summary.missingFacetCount, 0);
  assert.ok(followups.data.followups.every((item) => item.locators.every((locator) => locator.lineageKind && locator.level)));

  const dryReview = ok(await call("POST", "/api/research/protocol-requests/e2e-protocol/review", { dryRun: true }));
  assert.equal(dryReview.data.roles.length, 3);
  assert.deepEqual(dryReview.data.roles.map((role) => ({ role: role.id, provider: role.provider, model: role.model || "provider-default" })), [
    { role: "assay-specialist", provider: "kimi", model: "provider-default" },
    { role: "provenance-auditor", provider: "relay", model: "claude-opus-5-5" },
    { role: "skeptical-reviewer", provider: "relay", model: "gpt-5.5" },
  ]);
  assert.equal(dryReview.data.evidenceUpgrade, false);

  ok(await call("POST", "/api/research/protocol-requests/e2e-protocol/evidence", {
    documentKey: "CHEMBL1146805",
    level: "protocol",
    verification: "unverified",
    sourceUrl: "https://example.com/unverified-protocol",
    methodStatus: "explicit_matched",
  }), 201);
  let summary = ok(await call("GET", "/api/research/protocol-requests")).summary;
  assert.equal(summary.completeProtocolObtainedCount, 0, "unverified protocol must not count");

  ok(await call("POST", "/api/research/protocol-requests/e2e-protocol/evidence", {
    documentKey: "CHEMBL1146805",
    level: "protocol",
    verification: "verified",
    sourceUrl: "https://example.com/ca13-protocol",
    locator: "methods and Table 1",
    quote: "complete test protocol excerpt",
    coverage: "full method conditions for the test fixture",
    methodStatus: "explicit_matched",
  }), 201);
  const early = await call("PATCH", "/api/research/protocol-requests/e2e-protocol", { status: "complete" });
  assert.equal(early.status, 400, "one protocol out of two must not complete the request");

  ok(await call("POST", "/api/research/protocol-requests/e2e-protocol/evidence", {
    documentKey: "CHEMBL1133556",
    level: "protocol",
    verification: "verified",
    sourceUrl: "https://example.com/thiourea-protocol",
    locator: "methods and Table 1",
    quote: "second complete test protocol excerpt",
    coverage: "full method conditions for the second fixture",
    methodStatus: "explicit_matched",
  }), 201);
  ok(await call("POST", "/api/research/protocol-requests/e2e-protocol/receipts", {
    type: "response", channel: "e2e-test", note: "author replied; evidence still requires independent inspection",
  }), 201);
  const completed = ok(await call("PATCH", "/api/research/protocol-requests/e2e-protocol", { status: "complete" }));
  assert.equal(completed.data.status, "complete");
  assert.equal(completed.data.workItems.find((item) => item.id === "publication").status, "in_progress");

  summary = ok(await call("GET", "/api/research/protocol-requests")).summary;
  assert.equal(summary.fullTextObtainedCount, 0);
  assert.equal(summary.completeProtocolObtainedCount, 2);
  assert.equal(summary.independentWetExperimentCount, 0);
  assert.equal(summary.strictMethodMatchedCount, 2);
  assert.equal(summary.methodIncompleteCount, 0);

  const planned = ok(await call("POST", "/api/research/scenarios", {
    scenarioId: "proof-budget",
    target: { theorem: "fixture-only theorem" },
  }), 201);
  assert.equal(planned.data.status, "planned");
  assert.equal(planned.data.workItems.length, 4);
  console.log(JSON.stringify({ ok: true, scenarios: 6, lifecycle: "create→ready→sent→partial→review→protocol→complete", earlyCompletionBlocked: true, finalSummary: summary }, null, 2));
} finally {
  await stopTree(server);
  fs.closeSync(log);
  fs.rmSync(STORE, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
