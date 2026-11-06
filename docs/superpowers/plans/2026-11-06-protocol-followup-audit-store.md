# Protocol Followup Audit Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe baseline loading and an append-only, content-addressed local store for the existing deterministic protocol audit bundles.

**Architecture:** One focused store module constrains every path to the project, validates baseline fingerprints, verifies audit records on reads, and publishes new records through an exclusive same-directory hard link. Repeated valid saves return the existing record without touching it; malformed or tampered existing files fail closed without overwrite.

**Tech Stack:** TypeScript, Node.js 24 `node:fs`, `node:path`, `node:crypto`, `node:test`, existing `ProtocolFollowupAudit`, `verifyProtocolFollowupAudit`, and `protocolFollowupKey`.

## Global Constraints

- Worktree: `C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration` (also `D:\kimi-migration\workspace\provider-main-integration`). Run every command from this root.
- Branch: `research/provider-main-integration-20261106`; do not commit directly to `main` and do not deploy.
- Do not use Agent or subagent tools. Execute inline with `superpowers:executing-plans`.
- Follow TDD: write each failing test first, observe the expected failure, then write minimal production code.
- `evidenceUpgrade` remains `false`; storage never changes evidence, baselines, followups, `methodStatus`, or model reviews.
- Default audit directory: `data/protocol-followup-audits/`. Tests use `PROTOCOL_FOLLOWUP_AUDIT_DIR` with a project-local `.tmp/` directory.
- Baselines are read-only JSON files directly inside `data/protocol-followups/`; only a basename is accepted.
- New audit filenames are `<requestId>-<full 64-character auditKey>.json`; no short hashes or automatic v2/v3 fallback.
- Same exact input is idempotent. Existing invalid or tampered files are never overwritten.
- New records are written to an exclusive temporary file, fsynced, and published using an exclusive same-directory hard link; the temporary name is never used to evade a conflict.
- Secret-like content is rejected before writing without printing the matched value.
- No new HTTP route, dependency, model call, Next.js server, CLI, or model-review record is introduced by this plan.
- Do not stage `.tmp/`, `data/zhihu-invites/`, `.env.local`, real audit output, or credentials.
- Audit CLI and independent model-review storage remain separate follow-up plans.

---

### Task 1: Safe Baseline and Audit Readers

**Files:**
- Create: `src/lib/protocol-followup-audit-store.ts`
- Test: `tests/protocol-followup-audit-store.test.mjs`

**Interfaces:**
- Consumes: `ProtocolFollowupBaseline`, `ProtocolFollowupAudit`, `verifyProtocolFollowupAudit`, and `protocolFollowupKey`.
- Produces:
  - `validateProtocolFollowupBaseline(value: unknown, expectedRequestId?: string): ProtocolFollowupBaseline`
  - `readProtocolFollowupBaseline(filename: string, expectedRequestId?: string): { baseline: ProtocolFollowupBaseline; baselinePath: string }`
  - `readProtocolFollowupAudit(filename: string): { record: ProtocolFollowupAudit; path: string }`
  - Internal `protocolAuditDirectory(): string` reused by Task 2.

- [ ] **Step 1: Write the failing reader tests**

Create `tests/protocol-followup-audit-store.test.mjs`:

```js
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
```

- [ ] **Step 2: Run tests and verify RED**

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/protocol-followup-audit-store.test.mjs
```

Expected: `ERR_MODULE_NOT_FOUND` for `src/lib/protocol-followup-audit-store.ts`.

- [ ] **Step 3: Implement safe readers and validation**

Create `src/lib/protocol-followup-audit-store.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { verifyProtocolFollowupAudit, type ProtocolFollowupAudit } from "./protocol-followup-audit";
import { protocolFollowupKey } from "./protocol-followups";
import type { ProtocolFollowupBaseline } from "./protocol-followup-reconciliation";

function relativeProjectPath(target: string): string {
  return path.relative(process.cwd(), target).split(path.sep).join("/");
}

function safeJsonBasename(filename: string): string {
  if (typeof filename !== "string" || !filename.trim() || filename !== path.basename(filename) || !filename.endsWith(".json")) {
    throw new Error("A JSON basename without directory segments is required");
  }
  return filename;
}

function protocolAuditDirectory(): string {
  const directory = process.env.PROTOCOL_FOLLOWUP_AUDIT_DIR || "data/protocol-followup-audits";
  if (path.isAbsolute(directory) || directory.split(/[\\/]/).includes("..")) {
    throw new Error("PROTOCOL_FOLLOWUP_AUDIT_DIR must be a relative directory inside the project");
  }
  const resolved = path.resolve(process.cwd(), directory);
  const relative = path.relative(process.cwd(), resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Audit directory must stay inside the project and cannot be the project root");
  }
  return resolved;
}

export function validateProtocolFollowupBaseline(value: unknown, expectedRequestId?: string): ProtocolFollowupBaseline {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Baseline must be an object");
  const baseline = value as ProtocolFollowupBaseline;
  if (typeof baseline.requestId !== "string" || !baseline.requestId.trim()) throw new Error("Baseline requestId is required");
  if (expectedRequestId !== undefined && baseline.requestId !== expectedRequestId) throw new Error("Baseline requestId does not match the current request");
  if (!Array.isArray(baseline.followups)) throw new Error("Baseline followups must be an array");
  const keys = new Set<string>();
  for (const item of baseline.followups) {
    const key = protocolFollowupKey(baseline.requestId, item);
    if (keys.has(key)) throw new Error(`Duplicate baseline followup fingerprint: ${key}`);
    keys.add(key);
  }
  return baseline;
}

export function readProtocolFollowupBaseline(filename: string, expectedRequestId?: string) {
  const safeName = safeJsonBasename(filename);
  const target = path.join(process.cwd(), "data", "protocol-followups", safeName);
  const baseline = validateProtocolFollowupBaseline(JSON.parse(fs.readFileSync(target, "utf8")), expectedRequestId);
  return { baseline, baselinePath: relativeProjectPath(target) };
}

export function readProtocolFollowupAudit(filename: string): { record: ProtocolFollowupAudit; path: string } {
  const safeName = safeJsonBasename(filename);
  const target = path.join(protocolAuditDirectory(), safeName);
  const record = JSON.parse(fs.readFileSync(target, "utf8")) as ProtocolFollowupAudit;
  verifyProtocolFollowupAudit(record);
  return { record, path: relativeProjectPath(target) };
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run the command from Step 2.

Expected: 3 tests pass, 0 fail. Helper exports do not create additional tests.

- [ ] **Step 5: Run static checks and commit**

```bash
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js src/lib/protocol-followup-audit-store.ts
git add src/lib/protocol-followup-audit-store.ts tests/protocol-followup-audit-store.test.mjs
git diff --cached --check
git commit -m "feat: add safe protocol audit readers"
```

Expected: static checks exit 0; only the store module and its test are committed.

---

### Task 2: Exclusive Immutable Publication, Idempotency, and Full Regression

**Files:**
- Modify: `src/lib/protocol-followup-audit-store.ts`
- Modify: `tests/protocol-followup-audit-store.test.mjs`

**Interfaces:**
- Consumes: Task 1 `protocolAuditDirectory`, `safeJsonBasename`, `relativeProjectPath`, `readProtocolFollowupAudit`; existing `buildProtocolFollowupAudit` and `verifyProtocolFollowupAudit`.
- Produces:
  - `assertNoAuditSecrets(serialized: string): void`
  - `saveProtocolFollowupAudit(record: ProtocolFollowupAudit): { record: ProtocolFollowupAudit; path: string; created: boolean }`

- [ ] **Step 1: Append failing save and immutability tests**

Add these imports to `tests/protocol-followup-audit-store.test.mjs` and consolidate the store-module import into one statement:

```js
import { buildProtocolFollowupAudit } from "../src/lib/protocol-followup-audit.ts";
import { saveProtocolFollowupAudit } from "../src/lib/protocol-followup-audit-store.ts";

function auditRecord() {
  const { request, baseline } = storeFixture();
  return buildProtocolFollowupAudit({
    request,
    baseline,
    baselinePath: "data/protocol-followups/audit-store-fixture.json",
    createdAt: "2026-11-06T02:00:00.000Z",
  });
}

test("save publishes a verifiable record that can be read back", (t) => {
  auditStoreEnvironment(t);
  const record = auditRecord();
  const before = JSON.stringify(record);
  const saved = saveProtocolFollowupAudit(record);
  assert.equal(saved.created, true);
  assert.equal(saved.record.evidenceUpgrade, false);
  assert.equal(fs.existsSync(saved.path), true);
  const loaded = readProtocolFollowupAudit(`${record.requestId}-${record.auditKey}.json`);
  assert.equal(loaded.record.auditKey, record.auditKey);
  assert.equal(JSON.stringify(record), before);
});

test("valid repeated saves are idempotent and preserve content and modification time", (t) => {
  auditStoreEnvironment(t);
  const record = auditRecord();
  const first = saveProtocolFollowupAudit(record);
  const content = fs.readFileSync(first.path, "utf8");
  const mtime = fs.statSync(first.path).mtimeMs;
  const second = saveProtocolFollowupAudit(record);
  assert.equal(second.created, false);
  assert.equal(fs.readFileSync(first.path, "utf8"), content);
  assert.equal(fs.statSync(first.path).mtimeMs, mtime);
});

test("tampered or invalid existing records cause conflict and are never overwritten", (t) => {
  auditStoreEnvironment(t);
  const record = auditRecord();
  const saved = saveProtocolFollowupAudit(record);
  const tampered = JSON.parse(fs.readFileSync(saved.path, "utf8"));
  tampered.deterministicResult.followups[0].ask = "tampered on disk";
  fs.writeFileSync(saved.path, JSON.stringify(tampered));
  const tamperedContent = fs.readFileSync(saved.path, "utf8");
  assert.throws(() => saveProtocolFollowupAudit(record), /conflict|replay/i);
  assert.equal(fs.readFileSync(saved.path, "utf8"), tamperedContent);
  fs.writeFileSync(saved.path, "not JSON");
  assert.throws(() => saveProtocolFollowupAudit(record), /conflict|JSON/i);
  assert.equal(fs.readFileSync(saved.path, "utf8"), "not JSON");
});

test("unsafe directories and secret-like content are rejected without creating files", (t) => {
  const directory = auditStoreEnvironment(t);
  const record = auditRecord();
  process.env.PROTOCOL_FOLLOWUP_AUDIT_DIR = "../outside-audit";
  assert.throws(() => saveProtocolFollowupAudit(record), /relative directory|inside the project/);
  process.env.PROTOCOL_FOLLOWUP_AUDIT_DIR = directory;
  const secretRecord = { ...record, sourceRevision: `sk-${"x".repeat(24)}` };
  assert.throws(() => saveProtocolFollowupAudit(secretRecord), /secret/i);
  assert.equal(fs.existsSync(directory), false);
});
```

- [ ] **Step 2: Run tests and verify RED**

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/protocol-followup-audit-store.test.mjs
```

Expected: `saveProtocolFollowupAudit is not a function` or a module export error. Task 1 tests remain green.

- [ ] **Step 3: Implement secret scanning and exclusive publication**

Add this import at the top of `src/lib/protocol-followup-audit-store.ts`:

```ts
import { randomUUID } from "node:crypto";
```

Append these complete functions:

```ts
export function assertNoAuditSecrets(serialized: string): void {
  const patterns = [
    /\bsk-[A-Za-z0-9_-]{16,}/,
    /\bghp_[A-Za-z0-9]{20,}/,
    /\bgithub_pat_[A-Za-z0-9_]{20,}/,
    /\bBearer\s+[A-Za-z0-9._-]{16,}/i,
  ];
  if (patterns.some((pattern) => pattern.test(serialized))) {
    throw new Error("Potential secret material detected; audit was not written");
  }
}

function existingAudit(target: string, auditKey: string): { record: ProtocolFollowupAudit; path: string; created: false } {
  try {
    const record = JSON.parse(fs.readFileSync(target, "utf8")) as ProtocolFollowupAudit;
    verifyProtocolFollowupAudit(record);
    if (record.auditKey !== auditKey) throw new Error("Existing audit key differs from the requested record");
    return { record, path: relativeProjectPath(target), created: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Existing audit conflict: ${message}`);
  }
}

export function saveProtocolFollowupAudit(record: ProtocolFollowupAudit): {
  record: ProtocolFollowupAudit;
  path: string;
  created: boolean;
} {
  verifyProtocolFollowupAudit(record);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(record.requestId)) throw new Error("Invalid audit requestId");
  if (!/^[a-f0-9]{64}$/.test(record.auditKey)) throw new Error("Invalid audit key format");
  const serialized = `${JSON.stringify(record, null, 2)}\n`;
  assertNoAuditSecrets(serialized);
  const directory = protocolAuditDirectory();
  const target = path.join(directory, `${record.requestId}-${record.auditKey}.json`);
  if (fs.existsSync(target)) return existingAudit(target, record.auditKey);

  fs.mkdirSync(directory, { recursive: true });
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(temporary, "wx");
    fs.writeFileSync(descriptor, serialized, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    try {
      fs.linkSync(temporary, target);
      return { record, path: relativeProjectPath(target), created: true };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") return existingAudit(target, record.auditKey);
      throw error;
    }
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run the command from Step 2.

Expected: 7 tests pass, 0 fail across Tasks 1 and 2.

- [ ] **Step 5: Run focused static checks**

```bash
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js src/lib/protocol-followup-audit-store.ts
```

Expected: both commands exit 0.

- [ ] **Step 6: Run complete project verification**

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/*.test.mjs
npm test
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js src/lib/protocol-followup-audit-store.ts
npm run build
node tests/protocol-scenarios-e2e.mjs
node scripts/generate-kimi-operations.mjs --check
git diff --check
```

Expected:

- Existing 53 Node／protocol tests plus the new 7 tests: 60 pass, 0 fail.
- Project unit tests: 58 pass, 0 fail.
- TypeScript, ESLint, production build, and six end-to-end scenarios pass.
- Operation catalog remains at 453 operations because no HTTP route is added.
- `git diff --check` exits 0.

- [ ] **Step 7: Review, commit, and push**

```bash
git status --short
git diff -- src/lib/protocol-followup-audit-store.ts tests/protocol-followup-audit-store.test.mjs
git add src/lib/protocol-followup-audit-store.ts tests/protocol-followup-audit-store.test.mjs
git diff --cached --check
git commit -m "feat: add immutable protocol audit storage"
git push origin HEAD
```

Expected: only the store module and its tests are committed. Temporary audit files and user-local data are excluded. Push updates the research branch, not `main`.

## Follow-up Plans Explicitly Outside This One

1. **Audit CLI:** explicit baseline selection, `sourceRevision` capture, replay, current-drift reporting, and no persistent development server.
2. **Independent model review records:** exact `auditKey` linkage, real finish status and token usage, partial-on-truncation, append-only review files, and no authority over evidence.
