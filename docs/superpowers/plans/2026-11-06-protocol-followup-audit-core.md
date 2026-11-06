# Protocol Followup Audit Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, replayable audit bundle that binds an explicit followup baseline to a minimal protocol-request snapshot without changing evidence.

**Architecture:** One focused TypeScript module creates a privacy-reduced request snapshot, canonicalizes JSON, derives a full SHA-256 audit key, builds the deterministic reconciliation result, verifies replay, and reports current-input drift. Storage, CLI, and model review are separate follow-up plans; this plan delivers a working library with tests and no file writes or network calls.

**Tech Stack:** TypeScript, Node.js 24 built-in `node:crypto`, `node:test`, existing `reconcileProtocolFollowups`, Next.js 16.2.9 project checks.

## Global Constraints

- Worktree: `C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration` (also exposed as `D:\kimi-migration\workspace\provider-main-integration`). Run every command from this root.
- Branch: `research/provider-main-integration-20261106`; do not commit directly to `main` and do not deploy.
- Do not use Agent or subagent tools. Execute inline with `superpowers:executing-plans` when implementation begins.
- Follow TDD: write each failing test first, observe the expected failure, then write minimal production code.
- Keep `evidenceUpgrade=false`. Audit, replay, and drift checks never modify evidence, baselines, followups, `methodStatus`, or model reviews.
- The audit key covers the exact baseline and request snapshot plus schema and algorithm versions. It excludes the audit record's own `createdAt` and `sourceRevision`.
- Baseline `generatedAt` remains part of the exact baseline. Only the deterministic result root `generatedAt` is excluded during replay comparison.
- The request snapshot replaces `contacts`, `receipts`, and `workItems` with empty arrays and omits `reviews`; all computation-relevant documents and evidence remain unchanged.
- No new HTTP route, database model, dependency, model call, or persistent file write is introduced by this plan.
- Do not stage `.tmp/`, `data/zhihu-invites/`, `.env.local`, or credentials.
- The immutable store, CLI, and model-review record are deliberately outside this plan and require their own plans.

---

### Task 1: Canonical JSON, Minimal Snapshot, and Audit Key

**Files:**
- Create: `src/lib/protocol-followup-audit.ts`
- Test: `tests/protocol-followup-audit.test.mjs`

**Interfaces:**
- Consumes: `ProtocolRequest` and `ProtocolFollowupBaseline` from existing modules.
- Produces:
  - `PROTOCOL_FOLLOWUP_AUDIT_SCHEMA = "protocol-followup-audit/v1"`
  - `PROTOCOL_FOLLOWUP_RECONCILIATION_VERSION = "protocol-followup-reconciliation/v1"`
  - `canonicalJson(value: unknown): string`
  - `snapshotProtocolRequest(request: ProtocolRequest): ProtocolRequest`
  - `computeProtocolFollowupAuditKey(input: { requestId: string; baseline: ProtocolFollowupBaseline; requestSnapshot: ProtocolRequest; algorithmVersion?: string }): string`
  - Internal `canonicalHash(value: unknown): string` for drift checks in Task 3.

- [ ] **Step 1: Write the failing test**

Create `tests/protocol-followup-audit.test.mjs` with this concrete fixture and tests:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { buildProtocolFollowups } from "../src/lib/protocol-followups.ts";
import {
  canonicalJson,
  computeProtocolFollowupAuditKey,
  snapshotProtocolRequest,
} from "../src/lib/protocol-followup-audit.ts";

export function auditFixture() {
  const request = {
    id: "audit-fixture",
    title: "Audit fixture; not experimental data",
    scenarioId: "protocol-rescue",
    status: "draft",
    documents: [{ documentChemblId: "CHEMBL1", title: "Synthetic paper", methodStatus: "method_incomplete" }],
    contacts: [{ name: "Fixture contact", email: "private@example.invalid", channel: "email" }],
    workItems: [{ id: "work", title: "Private workflow", kind: "task", integration: "local", purpose: "test", status: "pending" }],
    receipts: [{ id: "receipt", type: "note", channel: "local", occurredAt: "2026-11-06T00:00:00.000Z", note: "private receipt" }],
    evidence: [],
    reviews: [{ id: "review", role: "fixture", provider: "fixture", model: "fixture", content: "private review", createdAt: "2026-11-06T00:00:00.000Z" }],
    sourceReferences: [],
    createdAt: "2026-11-06T00:00:00.000Z",
    updatedAt: "2026-11-06T00:00:00.000Z",
  };
  return { request, baseline: buildProtocolFollowups(request) };
}

test("canonical JSON sorts object keys without reordering arrays", () => {
  assert.equal(canonicalJson({ b: [2, 1], a: { d: 1, c: 2 } }), '{"a":{"c":2,"d":1},"b":[2,1]}');
  assert.equal(canonicalJson({ "😀": 1, a: 2 }), '{"a":2,"😀":1}');
  assert.equal(canonicalJson({ "10": 1, "2": 2 }), '{"10":1,"2":2}');
  assert.throws(() => canonicalJson(undefined), /top-level JSON value/);
});

test("snapshot removes private workflow data without mutating the request", () => {
  const { request } = auditFixture();
  const before = JSON.stringify(request);
  const snapshot = snapshotProtocolRequest(request);
  assert.deepEqual(snapshot.contacts, []);
  assert.deepEqual(snapshot.receipts, []);
  assert.deepEqual(snapshot.workItems, []);
  assert.equal(Object.hasOwn(snapshot, "reviews"), false);
  assert.deepEqual(snapshot.documents, request.documents);
  assert.deepEqual(snapshot.evidence, request.evidence);
  assert.equal(JSON.stringify(request), before);
});

test("audit keys are deterministic and include exact baseline and snapshot content", () => {
  const { request, baseline } = auditFixture();
  const requestSnapshot = snapshotProtocolRequest(request);
  const input = { requestId: request.id, baseline, requestSnapshot };
  const first = computeProtocolFollowupAuditKey(input);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(computeProtocolFollowupAuditKey(input), first);
  assert.notEqual(computeProtocolFollowupAuditKey({
    ...input,
    algorithmVersion: "protocol-followup-reconciliation/v2",
  }), first);
  assert.notEqual(computeProtocolFollowupAuditKey({
    ...input,
    baseline: { ...baseline, generatedAt: "2026-11-06T01:00:00.000Z" },
  }), first);
  assert.notEqual(computeProtocolFollowupAuditKey({
    ...input,
    requestSnapshot: {
      ...requestSnapshot,
      documents: [{ ...requestSnapshot.documents[0], methodStatus: "explicit_matched" }],
    },
  }), first);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/protocol-followup-audit.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/protocol-followup-audit.ts`.

- [ ] **Step 3: Implement the minimal canonicalization, snapshot, and key functions**

Create `src/lib/protocol-followup-audit.ts`:

```ts
import { createHash } from "node:crypto";
import type { ProtocolFollowupBaseline } from "./protocol-followup-reconciliation";
import type { ProtocolRequest } from "./protocol-requests";

export const PROTOCOL_FOLLOWUP_AUDIT_SCHEMA = "protocol-followup-audit/v1";
export const PROTOCOL_FOLLOWUP_RECONCILIATION_VERSION = "protocol-followup-reconciliation/v1";

function compareCodePoints(left: string, right: string): number {
  const a = Array.from(left);
  const b = Array.from(right);
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const difference = a[index].codePointAt(0)! - b[index].codePointAt(0)!;
    if (difference) return difference;
  }
  return a.length - b.length;
}

function serializeJson(value: unknown, arrayElement = false): string | undefined {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    return arrayElement ? "null" : undefined;
  }
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  const withToJson = value as { toJSON?: () => unknown };
  if (typeof withToJson.toJSON === "function") return serializeJson(withToJson.toJSON(), arrayElement);
  if (Array.isArray(value)) {
    return `[${value.map((item) => serializeJson(item, true) || "null").join(",")}]`;
  }
  const entries = Object.entries(value)
    .filter(([, item]) => item !== undefined && typeof item !== "function" && typeof item !== "symbol")
    .sort(([left], [right]) => compareCodePoints(left, right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${serializeJson(item)}`).join(",")}}`;
}

export function canonicalJson(value: unknown): string {
  const serialized = serializeJson(value);
  if (serialized === undefined) throw new Error("A top-level JSON value is required");
  return serialized;
}

function canonicalHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

export function snapshotProtocolRequest(request: ProtocolRequest): ProtocolRequest {
  const snapshot = structuredClone(request);
  snapshot.contacts = [];
  snapshot.receipts = [];
  snapshot.workItems = [];
  delete snapshot.reviews;
  return snapshot;
}

export function computeProtocolFollowupAuditKey(input: {
  requestId: string;
  baseline: ProtocolFollowupBaseline;
  requestSnapshot: ProtocolRequest;
  algorithmVersion?: string;
}): string {
  if (!input.requestId?.trim()) throw new Error("requestId is required for an audit key");
  if (input.baseline?.requestId !== input.requestId) throw new Error("Baseline requestId must match the audit requestId");
  return canonicalHash({
    schemaVersion: PROTOCOL_FOLLOWUP_AUDIT_SCHEMA,
    algorithmVersion: input.algorithmVersion || PROTOCOL_FOLLOWUP_RECONCILIATION_VERSION,
    requestId: input.requestId,
    baseline: input.baseline,
    requestSnapshot: input.requestSnapshot,
  });
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run the command from Step 2.

Expected: 3 tests pass, 0 fail. The exported fixture does not create a fourth test.

- [ ] **Step 5: Run focused static checks and commit**

```bash
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js src/lib/protocol-followup-audit.ts
git add src/lib/protocol-followup-audit.ts tests/protocol-followup-audit.test.mjs
git diff --cached --check
git commit -m "feat: add deterministic protocol audit keys"
```

Expected: TypeScript and ESLint exit 0; commit contains only the two files.

---

### Task 2: Audit Bundle Construction and Replay Verification

**Files:**
- Modify: `src/lib/protocol-followup-audit.ts`
- Modify: `tests/protocol-followup-audit.test.mjs`

**Interfaces:**
- Consumes: Task 1 constants, `computeProtocolFollowupAuditKey`, `snapshotProtocolRequest`, `canonicalJson`; existing `reconcileProtocolFollowups(request, baseline)`.
- Produces:
  - `ProtocolFollowupAudit` with `inputs.baseline`, `inputs.requestSnapshot`, `inputs.baselinePath`, and `deterministicResult`.
  - `buildProtocolFollowupAudit(input): ProtocolFollowupAudit`
  - `verifyProtocolFollowupAudit(record: ProtocolFollowupAudit): { ok: true; auditKey: string }`

- [ ] **Step 1: Append failing bundle and replay tests**

Add these imports and tests to `tests/protocol-followup-audit.test.mjs`:

```js
import {
  buildProtocolFollowupAudit,
  verifyProtocolFollowupAudit,
} from "../src/lib/protocol-followup-audit.ts";

test("audit bundle replays the same deterministic result while ignoring only result root generatedAt", () => {
  const { request, baseline } = auditFixture();
  const before = JSON.stringify({ request, baseline });
  const audit = buildProtocolFollowupAudit({
    request,
    baseline,
    baselinePath: "data/protocol-followups/audit-fixture.json",
    sourceRevision: "fixture-revision",
    createdAt: "2026-11-06T02:00:00.000Z",
  });
  assert.equal(audit.requestId, request.id);
  assert.equal(audit.sourceRevision, "fixture-revision");
  assert.equal(audit.evidenceUpgrade, false);
  assert.deepEqual(audit.inputs.requestSnapshot.contacts, []);
  assert.equal(verifyProtocolFollowupAudit(audit).ok, true);

  const timestampsChanged = structuredClone(audit);
  timestampsChanged.createdAt = "2026-11-06T03:00:00.000Z";
  timestampsChanged.deterministicResult.generatedAt = "2026-11-06T03:00:00.000Z";
  assert.equal(verifyProtocolFollowupAudit(timestampsChanged).ok, true);

  const tampered = structuredClone(audit);
  tampered.deterministicResult.followups[0].ask = "tampered ask";
  assert.throws(() => verifyProtocolFollowupAudit(tampered), /deterministic result/i);

  const wrongVersion = structuredClone(audit);
  wrongVersion.algorithmVersion = "protocol-followup-reconciliation/v999";
  assert.throws(() => verifyProtocolFollowupAudit(wrongVersion), /algorithm version/i);
  assert.equal(JSON.stringify({ request, baseline }), before);
});
```

Keep the Task 1 imports; consolidate duplicate imports from the same module into one import statement during implementation.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/protocol-followup-audit.test.mjs
```

Expected: FAIL with `buildProtocolFollowupAudit is not a function` or a module export error. Task 1 tests must remain green.

- [ ] **Step 3: Implement audit bundle construction and verification**

Add this import at the top of `src/lib/protocol-followup-audit.ts`:

```ts
import { reconcileProtocolFollowups } from "./protocol-followup-reconciliation";
```

Append these complete interfaces and functions:

```ts
export interface ProtocolFollowupAudit {
  schemaVersion: typeof PROTOCOL_FOLLOWUP_AUDIT_SCHEMA;
  algorithmVersion: typeof PROTOCOL_FOLLOWUP_RECONCILIATION_VERSION;
  auditKey: string;
  requestId: string;
  createdAt: string;
  sourceRevision?: string;
  inputs: {
    baselinePath: string;
    baseline: ProtocolFollowupBaseline;
    requestSnapshot: ProtocolRequest;
  };
  deterministicResult: ReturnType<typeof reconcileProtocolFollowups>;
  evidenceUpgrade: false;
  boundaries: string[];
}

export function buildProtocolFollowupAudit(input: {
  request: ProtocolRequest;
  baseline: ProtocolFollowupBaseline;
  baselinePath: string;
  sourceRevision?: string;
  createdAt?: string;
}): ProtocolFollowupAudit {
  const requestSnapshot = snapshotProtocolRequest(input.request);
  const baseline = structuredClone(input.baseline);
  const auditKey = computeProtocolFollowupAuditKey({
    requestId: input.request.id,
    baseline,
    requestSnapshot,
  });
  return {
    schemaVersion: PROTOCOL_FOLLOWUP_AUDIT_SCHEMA,
    algorithmVersion: PROTOCOL_FOLLOWUP_RECONCILIATION_VERSION,
    auditKey,
    requestId: input.request.id,
    createdAt: input.createdAt || new Date().toISOString(),
    sourceRevision: input.sourceRevision,
    inputs: { baselinePath: input.baselinePath, baseline, requestSnapshot },
    deterministicResult: reconcileProtocolFollowups(requestSnapshot, baseline),
    evidenceUpgrade: false,
    boundaries: [
      "审计束只绑定显式基线与最小计算快照，不修改原证据或历史求援。",
      "核销只表示求援条件已补全，不表示实验真实、独立、可复现或理论成立。",
      "模型意见不属于确定性审计结果，不能改变求援或证据状态。",
    ],
  };
}

function comparableResult(record: ProtocolFollowupAudit["deterministicResult"]): string {
  return canonicalJson({ ...record, generatedAt: undefined });
}

export function verifyProtocolFollowupAudit(record: ProtocolFollowupAudit): { ok: true; auditKey: string } {
  if (record.schemaVersion !== PROTOCOL_FOLLOWUP_AUDIT_SCHEMA) throw new Error("Unsupported audit schema version");
  if (record.algorithmVersion !== PROTOCOL_FOLLOWUP_RECONCILIATION_VERSION) throw new Error("Unsupported audit algorithm version");
  if (record.evidenceUpgrade !== false) throw new Error("Audit evidenceUpgrade must remain false");
  const expectedKey = computeProtocolFollowupAuditKey({
    requestId: record.requestId,
    baseline: record.inputs.baseline,
    requestSnapshot: record.inputs.requestSnapshot,
    algorithmVersion: record.algorithmVersion,
  });
  if (record.auditKey !== expectedKey) throw new Error("Audit key does not match audit inputs");
  const replayed = reconcileProtocolFollowups(record.inputs.requestSnapshot, record.inputs.baseline);
  if (comparableResult(replayed) !== comparableResult(record.deterministicResult)) {
    throw new Error("Audit deterministic result does not match replay");
  }
  return { ok: true, auditKey: record.auditKey };
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run the command from Step 2.

Expected: 4 tests pass, 0 fail.

- [ ] **Step 5: Run focused static checks and commit**

```bash
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js src/lib/protocol-followup-audit.ts
git add src/lib/protocol-followup-audit.ts tests/protocol-followup-audit.test.mjs
git diff --cached --check
git commit -m "feat: add replayable protocol audit bundles"
```

Expected: all commands exit 0; only the audit module and its test are committed.

---

### Task 3: Current-Input Drift Checks and Full Regression

**Files:**
- Modify: `src/lib/protocol-followup-audit.ts`
- Modify: `tests/protocol-followup-audit.test.mjs`

**Interfaces:**
- Consumes: Task 2 `ProtocolFollowupAudit`, `verifyProtocolFollowupAudit`; Task 1 `snapshotProtocolRequest` and internal `canonicalHash`.
- Produces: `checkProtocolFollowupAuditDrift(record, currentRequest)` returning `unchanged` or `drifted` with both snapshot hashes.

- [ ] **Step 1: Append failing drift tests**

Add `checkProtocolFollowupAuditDrift` to the audit-module imports and append:

```js
test("drift checks compare only computation-relevant snapshots and do not mutate the audit", () => {
  const { request, baseline } = auditFixture();
  const audit = buildProtocolFollowupAudit({
    request,
    baseline,
    baselinePath: "data/protocol-followups/audit-fixture.json",
    createdAt: "2026-11-06T02:00:00.000Z",
  });
  const before = JSON.stringify(audit);
  const contactOnlyChange = structuredClone(request);
  contactOnlyChange.contacts[0].email = "changed@example.invalid";
  assert.deepEqual(checkProtocolFollowupAuditDrift(audit, contactOnlyChange), {
    status: "unchanged",
    recordedSnapshotHash: checkProtocolFollowupAuditDrift(audit, request).recordedSnapshotHash,
    currentSnapshotHash: checkProtocolFollowupAuditDrift(audit, request).currentSnapshotHash,
  });
  const changed = structuredClone(request);
  changed.documents[0].methodStatus = "explicit_matched";
  const drift = checkProtocolFollowupAuditDrift(audit, changed);
  assert.equal(drift.status, "drifted");
  assert.match(drift.recordedSnapshotHash, /^[a-f0-9]{64}$/);
  assert.match(drift.currentSnapshotHash, /^[a-f0-9]{64}$/);
  assert.notEqual(drift.recordedSnapshotHash, drift.currentSnapshotHash);
  assert.equal(JSON.stringify(audit), before);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/protocol-followup-audit.test.mjs
```

Expected: FAIL with `checkProtocolFollowupAuditDrift is not a function` or a module export error.

- [ ] **Step 3: Implement the minimal drift check**

Append to `src/lib/protocol-followup-audit.ts`:

```ts
export function checkProtocolFollowupAuditDrift(
  record: ProtocolFollowupAudit,
  currentRequest: ProtocolRequest,
): {
  status: "unchanged" | "drifted";
  recordedSnapshotHash: string;
  currentSnapshotHash: string;
} {
  verifyProtocolFollowupAudit(record);
  const recordedSnapshotHash = canonicalHash(record.inputs.requestSnapshot);
  const currentSnapshotHash = canonicalHash(snapshotProtocolRequest(currentRequest));
  return {
    status: recordedSnapshotHash === currentSnapshotHash ? "unchanged" : "drifted",
    recordedSnapshotHash,
    currentSnapshotHash,
  };
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the command from Step 2.

Expected: 5 tests pass, 0 fail.

- [ ] **Step 5: Run the complete project verification**

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/*.test.mjs
npm test
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js src/lib/protocol-followup-audit.ts
npm run build
node tests/protocol-scenarios-e2e.mjs
node scripts/generate-kimi-operations.mjs --check
git diff --check
```

Expected:

- Existing 48 Node／protocol tests plus the new 5 tests: 53 pass, 0 fail.
- Project unit tests: 58 pass, 0 fail.
- TypeScript, ESLint, production build, and six end-to-end scenarios pass.
- Operation catalog remains at 453 operations because this plan adds no HTTP route.
- `git diff --check` exits 0.

- [ ] **Step 6: Review, commit, and push the research branch**

```bash
git status --short
git diff -- src/lib/protocol-followup-audit.ts tests/protocol-followup-audit.test.mjs
git add src/lib/protocol-followup-audit.ts tests/protocol-followup-audit.test.mjs
git diff --cached --check
git commit -m "feat: check protocol audit input drift"
git push origin HEAD
```

Expected: only the audit module and its tests are committed. `.tmp/`, `data/zhihu-invites/`, and `.env.local` remain untracked or ignored. Push updates `research/provider-main-integration-20261106`, not `main`.

## Follow-up Plans Explicitly Outside This One

1. **Immutable audit store and safe baseline loading:** content-addressed exclusive publication, idempotent reads, tamper rejection, secret scanning, and path containment.
2. **Audit CLI:** explicit baseline selection, replay, current-drift reporting, safe source revision metadata, and no persistent development server.
3. **Independent model review records:** exact `auditKey` linkage, real provider/model/finishReason/usage capture, partial-on-truncation, append-only review files, and no authority over evidence.
