# Protocol Followup Audit CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an explicit local CLI that creates immutable protocol audits and replays or checks them against current evidence without a web server or model call.

**Architecture:** A single dependency-free `.mjs` entry point composes the existing audit core, safe readers, immutable store, and protocol-request store. Tests spawn the real CLI with a temporary copy of `ca-six-2026` and its existing baseline, so generation, replay, and drift are exercised end-to-end without modifying the real request.

**Tech Stack:** Node.js 24 `.mjs`, `node:child_process`, existing TypeScript modules loaded by `tests/register-ts.mjs`, `node:test`, and the existing `ca-six-2026` read-only fixture.

## Global Constraints

- Worktree: `C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration` (also `D:\kimi-migration\workspace\provider-main-integration`). Run every command from this root.
- Branch: `research/provider-main-integration-20261106`; do not commit directly to `main` and do not deploy.
- Do not use Agent or subagent tools. Execute inline with `superpowers:executing-plans`.
- Follow TDD: write each failing test first, observe the expected failure, then write minimal production code.
- CLI modes:
  - `--request-id <id> --baseline <basename.json>`: generate or reuse an immutable audit.
  - `--verify <audit-basename.json>`: verify a stored audit by replay.
  - `--check-current <audit-basename.json>`: compare the current request with the stored snapshot.
- Exactly one mode is allowed. `--request-id` and `--baseline` must appear together. All arguments require values; unknown arguments fail.
- No automatic baseline selection, model call, HTTP route, Next.js server, dependency, or database change.
- `evidenceUpgrade` remains `false`. CLI never modifies the baseline, current request, stored audit, or `methodStatus`.
- Tests use `PROTOCOL_REQUESTS_DIR` and `PROTOCOL_FOLLOWUP_AUDIT_DIR` under `.tmp/`; the real `data/protocol-requests/ca-six-2026.json` is copied read-only for test setup and never modified.
- The existing `data/protocol-followups/ca-six-2026-v3.json` is read only. Audit output stays in `.tmp/` and is not committed.
- Standard output is machine-readable JSON. Errors use JSON on standard error and a nonzero exit code, with secret-like patterns redacted.
- Do not stage `.tmp/`, `data/zhihu-invites/`, `.env.local`, real audit output, or credentials.
- Independent model-review records remain a separate follow-up plan.

---

### Task 1: Explicit Baseline Audit Generation

**Files:**
- Create: `tools/run-protocol-followup-audit.mjs`
- Test: `tests/protocol-followup-audit-cli.test.mjs`

**Interfaces:**
- Consumes: `getProtocolRequest`, `readProtocolFollowupBaseline`, `buildProtocolFollowupAudit`, and `saveProtocolFollowupAudit`.
- Produces: generation mode with JSON `{ ok, mode: "create", auditKey, path, created, summary, evidenceUpgrade: false }` and a stored audit filename for Task 2.

- [ ] **Step 1: Write failing real-CLI generation tests**

Create `tests/protocol-followup-audit-cli.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test and verify RED**

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/protocol-followup-audit-cli.test.mjs
```

Expected: both tests fail because the CLI process exits nonzero or cannot find `tools/run-protocol-followup-audit.mjs`.

- [ ] **Step 3: Implement explicit baseline generation**

Create `tools/run-protocol-followup-audit.mjs`:

```js
import { execFileSync } from "node:child_process";
import path from "node:path";
import { buildProtocolFollowupAudit } from "../src/lib/protocol-followup-audit.ts";
import { readProtocolFollowupBaseline, saveProtocolFollowupAudit } from "../src/lib/protocol-followup-audit-store.ts";
import { getProtocolRequest } from "../src/lib/protocol-requests.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
process.chdir(ROOT);

const OPTIONS = new Set(["--request-id", "--baseline"]);

function parseArguments(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    if (!OPTIONS.has(name)) throw new Error(`Unknown argument: ${name}`);
    const value = values[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
    parsed[name] = value;
    index += 1;
  }
  return parsed;
}

function sourceRevision() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unavailable";
  }
}

function safeError(error) {
  return (error instanceof Error ? error.message : String(error))
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, "[redacted]")
    .replace(/ghp_[A-Za-z0-9]{20,}/g, "[redacted]")
    .replace(/github_pat_[A-Za-z0-9_]{20,}/g, "[redacted]")
    .slice(0, 300);
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  const requestId = args["--request-id"];
  const baselineName = args["--baseline"];
  if (!requestId || !baselineName) {
    throw new Error("Generation mode requires both --request-id and --baseline; exactly one mode is required");
  }
  const { baseline, baselinePath } = readProtocolFollowupBaseline(baselineName, requestId);
  const request = getProtocolRequest(requestId);
  const audit = buildProtocolFollowupAudit({ request, baseline, baselinePath, sourceRevision: sourceRevision() });
  const saved = saveProtocolFollowupAudit(audit);
  console.log(JSON.stringify({
    ok: true,
    mode: "create",
    auditKey: audit.auditKey,
    path: saved.path,
    created: saved.created,
    summary: saved.record.deterministicResult.summary,
    evidenceUpgrade: false,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: safeError(error) }));
  process.exitCode = 1;
}
```

- [ ] **Step 4: Run the tests and verify GREEN**

Run the command from Step 2.

Expected: 2 tests pass, 0 fail. The CLI output remains valid JSON despite Node warnings on standard error.

- [ ] **Step 5: Run focused checks and commit**

```bash
node --check tools/run-protocol-followup-audit.mjs
node node_modules/typescript/bin/tsc --noEmit
git add tools/run-protocol-followup-audit.mjs tests/protocol-followup-audit-cli.test.mjs
git diff --cached --check
git commit -m "feat: add protocol audit generation cli"
```

Expected: syntax and TypeScript checks exit 0; only the CLI and its test are committed.

---

### Task 2: Replay and Current-Drift Modes with Full Regression

**Files:**
- Modify: `tools/run-protocol-followup-audit.mjs`
- Modify: `tests/protocol-followup-audit-cli.test.mjs`

**Interfaces:**
- Consumes: Task 1 generation output `path` and auditKey; existing `readProtocolFollowupAudit`, `verifyProtocolFollowupAudit`, and `checkProtocolFollowupAuditDrift`.
- Produces:
  - Verify JSON `{ ok, mode: "verify", auditKey, path, evidenceUpgrade: false }`.
  - Drift JSON `{ ok, mode: "check-current", auditKey, status, recordedSnapshotHash, currentSnapshotHash, evidenceUpgrade: false }`.

- [ ] **Step 1: Append a failing replay and drift test**

Append to `tests/protocol-followup-audit-cli.test.mjs`:

```js
test("CLI verifies a stored audit and reports current drift without modifying either input", (t) => {
  const { requests, run } = cliEnvironment(t);
  const generated = run(["--request-id", "ca-six-2026", "--baseline", "ca-six-2026-v3.json"]);
  assert.equal(generated.status, 0, generated.stderr);
  const created = JSON.parse(generated.stdout);
  const filename = created.path.split("/").at(-1);
  const originalAuditText = fs.readFileSync(created.path, "utf8");

  const verified = run(["--verify", filename]);
  assert.equal(verified.status, 0, verified.stderr);
  const verification = JSON.parse(verified.stdout);
  assert.equal(verification.mode, "verify");
  assert.equal(verification.auditKey, created.auditKey);
  assert.equal(verification.evidenceUpgrade, false);

  const unchanged = run(["--check-current", filename]);
  assert.equal(unchanged.status, 0, unchanged.stderr);
  assert.equal(JSON.parse(unchanged.stdout).status, "unchanged");

  const requestPath = path.join(ROOT, requests, "ca-six-2026.json");
  const changedRequest = JSON.parse(fs.readFileSync(requestPath, "utf8"));
  changedRequest.documents[0].methodStatus = changedRequest.documents[0].methodStatus === "explicit_matched" ? "method_incomplete" : "explicit_matched";
  fs.writeFileSync(requestPath, JSON.stringify(changedRequest, null, 2));
  const drifted = run(["--check-current", filename]);
  assert.equal(drifted.status, 0, drifted.stderr);
  const drift = JSON.parse(drifted.stdout);
  assert.equal(drift.mode, "check-current");
  assert.equal(drift.status, "drifted");
  assert.notEqual(drift.recordedSnapshotHash, drift.currentSnapshotHash);
  assert.equal(drift.evidenceUpgrade, false);
  assert.equal(fs.readFileSync(created.path, "utf8"), originalAuditText);
  const replayedAgain = run(["--verify", filename]);
  assert.equal(replayedAgain.status, 0, replayedAgain.stderr);
});
```

- [ ] **Step 2: Run tests and verify RED**

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/protocol-followup-audit-cli.test.mjs
```

Expected: the new test fails with an unknown argument or invalid mode error for `--verify`; the first two tests remain green.

- [ ] **Step 3: Implement replay and drift modes**

Change the imports at the top of `tools/run-protocol-followup-audit.mjs` to include:

```js
import {
  buildProtocolFollowupAudit,
  checkProtocolFollowupAuditDrift,
  verifyProtocolFollowupAudit,
} from "../src/lib/protocol-followup-audit.ts";
import {
  readProtocolFollowupAudit,
  readProtocolFollowupBaseline,
  saveProtocolFollowupAudit,
} from "../src/lib/protocol-followup-audit-store.ts";
```

Change `OPTIONS` to:

```js
const OPTIONS = new Set(["--request-id", "--baseline", "--verify", "--check-current"]);
```

Replace `main()` with this complete function while preserving the other helpers:

```js
function main() {
  const args = parseArguments(process.argv.slice(2));
  const requestId = args["--request-id"];
  const baselineName = args["--baseline"];
  const verifyName = args["--verify"];
  const checkCurrentName = args["--check-current"];
  const modeCount = [Boolean(requestId || baselineName), Boolean(verifyName), Boolean(checkCurrentName)].filter(Boolean).length;
  if (modeCount !== 1) throw new Error("Exactly one CLI mode is required");

  if (verifyName) {
    const loaded = readProtocolFollowupAudit(verifyName);
    const verification = verifyProtocolFollowupAudit(loaded.record);
    console.log(JSON.stringify({ ok: true, mode: "verify", auditKey: verification.auditKey, path: loaded.path, evidenceUpgrade: false }, null, 2));
    return;
  }

  if (checkCurrentName) {
    const loaded = readProtocolFollowupAudit(checkCurrentName);
    const currentRequest = getProtocolRequest(loaded.record.requestId);
    const drift = checkProtocolFollowupAuditDrift(loaded.record, currentRequest);
    console.log(JSON.stringify({ ok: true, mode: "check-current", auditKey: loaded.record.auditKey, ...drift, evidenceUpgrade: false }, null, 2));
    return;
  }

  if (!requestId || !baselineName) throw new Error("Generation mode requires both --request-id and --baseline");
  const { baseline, baselinePath } = readProtocolFollowupBaseline(baselineName, requestId);
  const request = getProtocolRequest(requestId);
  const audit = buildProtocolFollowupAudit({ request, baseline, baselinePath, sourceRevision: sourceRevision() });
  const saved = saveProtocolFollowupAudit(audit);
  console.log(JSON.stringify({
    ok: true,
    mode: "create",
    auditKey: audit.auditKey,
    path: saved.path,
    created: saved.created,
    summary: saved.record.deterministicResult.summary,
    evidenceUpgrade: false,
  }, null, 2));
}
```

- [ ] **Step 4: Run the tests and verify GREEN**

Run the command from Step 2.

Expected: 3 tests pass, 0 fail across Tasks 1 and 2.

- [ ] **Step 5: Run complete project verification**

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/*.test.mjs
npm test
node --check tools/run-protocol-followup-audit.mjs
node node_modules/typescript/bin/tsc --noEmit
npm run build
node tests/protocol-scenarios-e2e.mjs
node scripts/generate-kimi-operations.mjs --check
git diff --check
```

Expected:

- Existing 60 Node／protocol tests plus the new 3 tests: 63 pass, 0 fail.
- Project unit tests: 58 pass, 0 fail.
- CLI syntax, TypeScript, production build, and six end-to-end scenarios pass.
- Operation catalog remains at 453 operations because no HTTP route is added.
- `git diff --check` exits 0.

- [ ] **Step 6: Review, commit, and push**

```bash
git status --short
git diff -- tools/run-protocol-followup-audit.mjs tests/protocol-followup-audit-cli.test.mjs
git add tools/run-protocol-followup-audit.mjs tests/protocol-followup-audit-cli.test.mjs
git diff --cached --check
git commit -m "feat: add protocol audit replay and drift cli"
git push origin HEAD
```

Expected: only the CLI and its test are committed. Temporary requests, audit files, user-local data, and credentials are excluded. Push updates the research branch, not `main`.

## Follow-up Plan Explicitly Outside This One

**Independent model review records:** exact `auditKey` linkage, real provider/model/finishReason/usage capture, partial-on-truncation, append-only review files, safe model errors, and no authority over evidence or deterministic audit results.
