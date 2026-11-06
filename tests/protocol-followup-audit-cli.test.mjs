import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");

export function cliEnvironment(t) {
  const directory = `.tmp/protocol-audit-cli-${process.pid}`;
  const requests = `${directory}/requests`;
  const audits = `${directory}/audits`;
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(requests, { recursive: true });
  const realRequest = path.join(ROOT, "data", "protocol-requests", "ca-six-2026.json");
  const originalRequestText = fs.readFileSync(realRequest, "utf8");
  fs.copyFileSync(realRequest, path.join(ROOT, requests, "ca-six-2026.json"));
  const env = {
    ...process.env,
    NODE_NO_WARNINGS: "1",
    PROTOCOL_REQUESTS_DIR: requests,
    PROTOCOL_FOLLOWUP_AUDIT_DIR: audits,
  };
  t.after(() => {
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    assert.equal(fs.readFileSync(realRequest, "utf8"), originalRequestText);
  });
  function run(args) {
    return spawnSync(process.execPath, [
      "--experimental-transform-types",
      "--import", "./tests/register-ts.mjs",
      "tools/run-protocol-followup-audit.mjs",
      ...args,
    ], { cwd: ROOT, env, encoding: "utf8", timeout: 30000 });
  }
  return { directory, requests, audits, run };
}

test("CLI creates an immutable audit from an explicit baseline and reuses it on rerun", (t) => {
  const { run } = cliEnvironment(t);
  const args = ["--request-id", "ca-six-2026", "--baseline", "ca-six-2026-v3.json"];
  const first = run(args);
  assert.equal(first.status, 0, first.stderr);
  const created = JSON.parse(first.stdout);
  assert.equal(created.ok, true);
  assert.equal(created.mode, "create");
  assert.equal(created.created, true);
  assert.match(created.auditKey, /^[a-f0-9]{64}$/);
  assert.equal(created.summary.sourceDocumentRequestCount, 6);
  assert.equal(created.summary.followupCount, 6);
  assert.equal(created.summary.resolvedFollowupCount, 0);
  assert.equal(created.summary.reviewRequiredPreviousCount, 0);
  assert.equal(created.evidenceUpgrade, false);
  assert.equal(fs.existsSync(created.path), true);
  const content = fs.readFileSync(created.path, "utf8");
  const mtime = fs.statSync(created.path).mtimeMs;

  const second = run(args);
  assert.equal(second.status, 0, second.stderr);
  const reused = JSON.parse(second.stdout);
  assert.equal(reused.created, false);
  assert.equal(reused.auditKey, created.auditKey);
  assert.equal(reused.path, created.path);
  assert.equal(fs.readFileSync(created.path, "utf8"), content);
  assert.equal(fs.statSync(created.path).mtimeMs, mtime);
});

test("CLI rejects unsafe baselines and incomplete arguments without creating an audit", (t) => {
  const { audits, run } = cliEnvironment(t);
  const traversal = run(["--request-id", "ca-six-2026", "--baseline", "../secret.json"]);
  assert.notEqual(traversal.status, 0);
  assert.equal(JSON.parse(traversal.stdout || "{}").ok, undefined);
  assert.match(JSON.parse(traversal.stderr).error, /basename|directory|JSON/i);
  const incomplete = run(["--request-id", "ca-six-2026"]);
  assert.notEqual(incomplete.status, 0);
  assert.match(JSON.parse(incomplete.stderr).error, /baseline|mode|required/i);
  assert.equal(fs.existsSync(audits), false);
});
