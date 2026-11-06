# Protocol Followup Model Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bind real three-role model reviews to an exact protocol audit key while preserving finish status, usage, errors, and the immutable deterministic audit.

**Architecture:** A review runner accepts an injectable chat function for offline tests and uses the real `researchChat` only in the explicit CLI. A separate append-only store writes `<auditKey>-review-<attempt>.json` after the underlying audit exists, rejects mismatched keys and secret-like content, and never modifies the audit or earlier reviews.

**Tech Stack:** TypeScript, Node.js 24 `node:fs` and `node:test`, existing `researchChat`, `ProtocolFollowupAudit`, immutable audit store, and a real `.mjs` CLI.

## Global Constraints

- Worktree: `C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration` (also `D:\kimi-migration\workspace\provider-main-integration`). Run every command from this root.
- Branch: `research/provider-main-integration-20261106`; do not commit directly to `main` and do not deploy.
- Do not use Agent or subagent tools. Execute inline with `superpowers:executing-plans`.
- Follow TDD: write failing tests first, observe expected failures, then write minimal production code.
- Offline tests inject deterministic chat outcomes because external model calls are unavoidable side effects; no test claims a live model succeeded.
- Real model calls occur only when explicitly running `tools/run-protocol-followup-review.mjs --audit <basename.json>` after implementation.
- `complete` means all three roles returned nonempty content with `stop`, `completed`, or `end_turn`; it does not mean the opinions are correct.
- Empty content, truncation, unknown finish status, or any rejected role produces `partial` and preserves the actual results.
- `evidenceUpgrade` remains `false`. Reviews cannot modify evidence, followups, `methodStatus`, audit bundles, or reconciliation outcomes.
- Default output directory remains `data/protocol-followup-audits/`; tests override `PROTOCOL_FOLLOWUP_AUDIT_DIR` with project-local `.tmp/` paths.
- Review filenames are `<full auditKey>-review-<attempt>.json`; attempts are monotonic and existing reviews are never overwritten.
- Secrets are rejected before writing without printing the matched value. Model errors are redacted before storage.
- No new HTTP route, database model, dependency, Next.js server, automatic baseline selection, or scheduled task.
- Do not stage `.tmp/`, `data/zhihu-invites/`, `.env.local`, credentials, or uninspected model output.
- Real model output is committed only after reading the record, checking its `auditKey`, `evidenceUpgrade`, role statuses, and secret scan outcome.

---

### Task 1: Review Runner and Append-Only Review Store

**Files:**
- Create: `src/lib/protocol-followup-review.ts`
- Create: `src/lib/protocol-followup-review-store.ts`
- Modify: `src/lib/protocol-followup-audit-store.ts` (export existing path helpers without behavior changes)
- Test: `tests/protocol-followup-review.test.mjs`

**Interfaces:**
- Consumes: `researchChat`, `ResearchLLMRequest`, `ResearchLLMResponse`, `ProtocolFollowupAudit`, `saveProtocolFollowupAudit`, `verifyProtocolFollowupAudit`, and `assertNoAuditSecrets`.
- Produces:
  - `DEFAULT_PROTOCOL_REVIEW_ROLES`
  - `runProtocolFollowupReview({ audit, chat?, roles?, generatedAt? }): Promise<ProtocolFollowupReview>`
  - `saveProtocolFollowupReview(audit, review): { record, path, attempt }`
  - Existing audit-store `protocolAuditDirectory()` and `relativeProjectPath()` become exported without changing behavior.

- [ ] **Step 1: Write failing runner and store tests**

Create `tests/protocol-followup-review.test.mjs` with a local fixture and six tests:

```js
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { buildProtocolFollowupAudit } from "../src/lib/protocol-followup-audit.ts";
import { saveProtocolFollowupAudit } from "../src/lib/protocol-followup-audit-store.ts";
import { runProtocolFollowupReview } from "../src/lib/protocol-followup-review.ts";
import { saveProtocolFollowupReview } from "../src/lib/protocol-followup-review-store.ts";
import { buildProtocolFollowups } from "../src/lib/protocol-followups.ts";

let fixtureNumber = 0;
function environment(t) {
  const directory = `.tmp/protocol-review-${process.pid}-${fixtureNumber++}`;
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

function auditFixture() {
  const request = {
    id: "review-fixture",
    title: "Review fixture; not experimental data",
    scenarioId: "protocol-rescue",
    status: "draft",
    documents: [{ documentChemblId: "CHEMBL1", title: "Synthetic paper", methodStatus: "method_incomplete" }],
    contacts: [{ name: "Private", email: "private@example.invalid", channel: "email" }],
    workItems: [],
    receipts: [],
    evidence: [],
    sourceReferences: [],
    createdAt: "2026-11-06T00:00:00.000Z",
    updatedAt: "2026-11-06T00:00:00.000Z",
  };
  return buildProtocolFollowupAudit({
    request,
    baseline: buildProtocolFollowups(request),
    baselinePath: "data/protocol-followups/review-fixture.json",
    createdAt: "2026-11-06T02:00:00.000Z",
  });
}

function successfulChat(request) {
  return Promise.resolve({
    provider: request.provider,
    model: request.model || "kimi-for-coding",
    content: `Verified review for ${request.systemPrompt.length}`,
    finishReason: "stop",
    usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
    latencyMs: 12,
  });
}

test("all three real response shapes produce complete and exclude private workflow data from prompts", async () => {
  const audit = auditFixture();
  const prompts = [];
  const record = await runProtocolFollowupReview({
    audit,
    generatedAt: "2026-11-06T03:00:00.000Z",
    chat: (request) => {
      prompts.push(request.userPrompt);
      return successfulChat(request);
    },
  });
  assert.equal(record.schemaVersion, "protocol-followup-review/v1");
  assert.equal(record.auditKey, audit.auditKey);
  assert.equal(record.status, "complete");
  assert.equal(record.reviews.length, 3);
  assert.equal(record.reviews[0].usage.total_tokens, 14);
  assert.equal(record.evidenceUpgrade, false);
  assert.equal(prompts.length, 3);
  assert.equal(prompts.every((prompt) => !prompt.includes("private@example.invalid")), true);
  assert.equal(prompts.every((prompt) => prompt.includes(audit.auditKey)), true);
});

test("truncation, empty content, and rejected roles are partial and redact errors", async () => {
  const audit = auditFixture();
  for (const mode of ["truncated", "empty", "rejected"]) {
    let calls = 0;
    const record = await runProtocolFollowupReview({
      audit,
      chat: (request) => {
        calls += 1;
        if (mode === "rejected" && calls === 2) return Promise.reject(new Error(`upstream sk-${"x".repeat(24)}`));
        return successfulChat(request).then((response) => ({
          ...response,
          content: mode === "empty" ? " " : response.content,
          finishReason: mode === "truncated" ? "length" : response.finishReason,
        }));
      },
    });
    assert.equal(record.status, "partial");
    assert.equal(record.evidenceUpgrade, false);
    if (mode === "rejected") {
      assert.equal(record.reviews[1].error.includes("xxxxxxxx"), false);
      assert.match(record.reviews[1].error, /redacted/);
    }
  }
});

async function savedReviewFixture(t) {
  const directory = environment(t);
  const audit = auditFixture();
  const savedAudit = saveProtocolFollowupAudit(audit);
  const review = await runProtocolFollowupReview({ audit, chat: successfulChat });
  return { directory, audit, savedAudit, review };
}

test("review store creates monotonic attempts without changing the audit or earlier review", async (t) => {
  const { audit, savedAudit, review } = await savedReviewFixture(t);
  const originalAudit = fs.readFileSync(savedAudit.path, "utf8");
  const first = saveProtocolFollowupReview(audit, review);
  assert.equal(first.attempt, 1);
  const firstText = fs.readFileSync(first.path, "utf8");
  const second = saveProtocolFollowupReview(audit, review);
  assert.equal(second.attempt, 2);
  assert.notEqual(second.path, first.path);
  assert.equal(fs.readFileSync(savedAudit.path, "utf8"), originalAudit);
  assert.equal(fs.readFileSync(first.path, "utf8"), firstText);
  assert.equal(JSON.parse(fs.readFileSync(second.path, "utf8")).auditKey, audit.auditKey);
});

test("review store rejects a mismatched auditKey without creating a file", async (t) => {
  const { directory, audit, review } = await savedReviewFixture(t);
  const mismatched = { ...review, auditKey: "0".repeat(64) };
  assert.throws(() => saveProtocolFollowupReview(audit, mismatched), /auditKey/);
  assert.equal(fs.readdirSync(directory).filter((name) => name.includes("-review-")).length, 0);
});

test("review store rejects secret-like content without creating a file", async (t) => {
  const { directory, audit, review } = await savedReviewFixture(t);
  const secretReview = {
    ...review,
    reviews: review.reviews.map((item, index) => index === 0 ? { ...item, content: `sk-${"x".repeat(24)}` } : item),
  };
  assert.throws(() => saveProtocolFollowupReview(audit, secretReview), /secret/i);
  assert.equal(fs.readdirSync(directory).filter((name) => name.includes("-review-")).length, 0);
});

test("review store requires the underlying audit to exist first", (t) => {
  const directory = environment(t);
  const audit = auditFixture();
  return runProtocolFollowupReview({ audit, chat: successfulChat }).then((review) => {
    assert.throws(() => saveProtocolFollowupReview(audit, review), /audit.*exist|save.*audit/i);
    assert.equal(fs.existsSync(directory), false);
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/protocol-followup-review.test.mjs
```

Expected: `ERR_MODULE_NOT_FOUND` for `src/lib/protocol-followup-review.ts` or `src/lib/protocol-followup-review-store.ts`.

- [ ] **Step 3: Implement the review runner**

Create `src/lib/protocol-followup-review.ts`:

```ts
import { verifyProtocolFollowupAudit, type ProtocolFollowupAudit } from "./protocol-followup-audit";
import { researchChat, type ResearchLLMRequest, type ResearchLLMResponse } from "./research-llm";

export interface ProtocolReviewRole {
  id: string;
  provider: "kimi" | "relay";
  model?: string;
  instruction: string;
}

export const DEFAULT_PROTOCOL_REVIEW_ROLES: ProtocolReviewRole[] = [
  { id: "method-gap-auditor", provider: "kimi", instruction: "只检查求援项是否与原始证据一致，逐项指出错误证据归属，不补写任何实验字段。" },
  { id: "provenance-reviewer", provider: "relay", model: "claude-opus-5-5", instruction: "审查求援项的来源边界。引用、数据库、讲座和其他研究不能被当成目标原始协议，不补写方法。" },
  { id: "skeptical-reviewer", provider: "relay", model: "gpt-5.5", instruction: "作为反方检查求援项是否遗漏证据边界、错误晋升证据或产生无依据结论。只指出可验证的问题。" },
];

type ReviewChat = (request: ResearchLLMRequest) => Promise<ResearchLLMResponse>;

export interface ProtocolFollowupReview {
  schemaVersion: "protocol-followup-review/v1";
  auditKey: string;
  requestId: string;
  generatedAt: string;
  status: "complete" | "partial";
  reviews: Array<{
    role: string;
    provider: string;
    model: string;
    instruction: string;
    finishReason?: string;
    usage?: ResearchLLMResponse["usage"];
    latencyMs?: number;
    content?: string;
    error?: string;
  }>;
  evidenceUpgrade: false;
  boundaries: string[];
}

function redactError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, "[redacted]")
    .replace(/ghp_[A-Za-z0-9]{20,}/g, "[redacted]")
    .replace(/github_pat_[A-Za-z0-9_]{20,}/g, "[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]{16,}/gi, "Bearer [redacted]")
    .slice(0, 300);
}

export async function runProtocolFollowupReview(input: {
  audit: ProtocolFollowupAudit;
  chat?: ReviewChat;
  roles?: ProtocolReviewRole[];
  generatedAt?: string;
}): Promise<ProtocolFollowupReview> {
  verifyProtocolFollowupAudit(input.audit);
  const chat = input.chat || researchChat;
  const roles = input.roles || DEFAULT_PROTOCOL_REVIEW_ROLES;
  const material = JSON.stringify({
    auditKey: input.audit.auditKey,
    deterministicResult: input.audit.deterministicResult,
    requestSnapshot: input.audit.inputs.requestSnapshot,
  });
  const settled = await Promise.allSettled(roles.map((role) => chat({
    provider: role.provider,
    model: role.model,
    systemPrompt: role.instruction,
    userPrompt: `请审查下列确定性求援结果及原始证据，只指出与材料不符的求援项、来源边界和必须补证的事项，不把建议写成事实，不提升证据等级。请聚焦实质差异，避免逐文档重复模板。材料：${material}`,
    maxTokens: 4096,
    timeoutMs: 120000,
    providerAttempts: 1,
    reasoningEffort: "low",
  })));
  const reviews = settled.map((outcome, index) => {
    const role = roles[index];
    if (outcome.status === "fulfilled") {
      return {
        role: role.id,
        provider: outcome.value.provider,
        model: outcome.value.model,
        instruction: role.instruction,
        finishReason: outcome.value.finishReason,
        usage: outcome.value.usage,
        latencyMs: outcome.value.latencyMs,
        content: outcome.value.content,
      };
    }
    return {
      role: role.id,
      provider: role.provider,
      model: role.model || "kimi-for-coding",
      instruction: role.instruction,
      error: redactError(outcome.reason),
    };
  });
  const complete = roles.length > 0 && reviews.length === roles.length && reviews.every((review) =>
    review.content?.trim() && ["stop", "completed", "end_turn"].includes(review.finishReason || ""));
  return {
    schemaVersion: "protocol-followup-review/v1",
    auditKey: input.audit.auditKey,
    requestId: input.audit.requestId,
    generatedAt: input.generatedAt || new Date().toISOString(),
    status: complete ? "complete" : "partial",
    reviews,
    evidenceUpgrade: false,
    boundaries: [
      "complete 只表示全部角色正常结束且意见非空，不表示意见正确或证据升级。",
      "模型意见不能核销求援、修改证据、methodStatus 或确定性审计结果。",
      "复核输入只包含确定性结果和最小请求快照，不包含联系人、回执或历史评论。",
    ],
  };
}
```

- [ ] **Step 4: Implement the append-only review store**

In `src/lib/protocol-followup-audit-store.ts`, change only these two declarations to exports:

```ts
export function relativeProjectPath(target: string): string
export function protocolAuditDirectory(): string
```

Create `src/lib/protocol-followup-review-store.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { verifyProtocolFollowupAudit, type ProtocolFollowupAudit } from "./protocol-followup-audit";
import { assertNoAuditSecrets, protocolAuditDirectory, relativeProjectPath } from "./protocol-followup-audit-store";
import type { ProtocolFollowupReview } from "./protocol-followup-review";

export function saveProtocolFollowupReview(audit: ProtocolFollowupAudit, review: ProtocolFollowupReview) {
  verifyProtocolFollowupAudit(audit);
  if (review.schemaVersion !== "protocol-followup-review/v1") throw new Error("Unsupported review schema version");
  if (review.auditKey !== audit.auditKey) throw new Error("Review auditKey does not match the audit");
  if (review.requestId !== audit.requestId) throw new Error("Review requestId does not match the audit");
  if (review.evidenceUpgrade !== false) throw new Error("Review evidenceUpgrade must remain false");
  if (!["complete", "partial"].includes(review.status)) throw new Error("Invalid review status");
  const directory = protocolAuditDirectory();
  const auditTarget = path.join(directory, `${audit.requestId}-${audit.auditKey}.json`);
  if (!fs.existsSync(auditTarget)) throw new Error("The underlying audit must exist before saving a review");
  const attempts = fs.readdirSync(directory)
    .map((name) => name.match(new RegExp(`^${audit.auditKey}-review-(\\d+)\\.json$`)))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => Number(match[1]));
  const attempt = attempts.length ? Math.max(...attempts) + 1 : 1;
  const target = path.join(directory, `${audit.auditKey}-review-${attempt}.json`);
  const serialized = `${JSON.stringify(review, null, 2)}\n`;
  assertNoAuditSecrets(serialized);
  const descriptor = fs.openSync(target, "wx");
  try {
    fs.writeFileSync(descriptor, serialized, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  return { record: review, path: relativeProjectPath(target), attempt };
}
```

- [ ] **Step 5: Run tests and static checks, then commit**

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/protocol-followup-review.test.mjs
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js src/lib/protocol-followup-review.ts src/lib/protocol-followup-review-store.ts src/lib/protocol-followup-audit-store.ts
git add src/lib/protocol-followup-review.ts src/lib/protocol-followup-review-store.ts src/lib/protocol-followup-audit-store.ts tests/protocol-followup-review.test.mjs
git diff --cached --check
git commit -m "feat: add append-only protocol review records"
```

Expected: 6 tests pass, 0 fail; static checks exit 0; only the four implementation/test files are committed.

---

### Task 2: Explicit Real-Model CLI and Full Validation

**Files:**
- Create: `tools/run-protocol-followup-review.mjs`
- Test: `tests/protocol-followup-review-cli.test.mjs`
- Create after real execution: two JSON records under `data/protocol-followup-audits/`, using the exact paths returned by the CLI.

**Interfaces:**
- Consumes: Task 1 `runProtocolFollowupReview`, `saveProtocolFollowupReview`, and existing `readProtocolFollowupAudit`.
- Produces: explicit `--audit` and `--help` modes; JSON output with `auditKey`, `path`, `attempt`, `status`, role statuses, and `evidenceUpgrade=false`.

- [ ] **Step 1: Write failing no-model CLI tests**

Create `tests/protocol-followup-review-cli.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
function run(args) {
  return spawnSync(process.execPath, [
    "--experimental-transform-types",
    "--import", "./tests/register-ts.mjs",
    "tools/run-protocol-followup-review.mjs",
    ...args,
  ], { cwd: ROOT, env: { ...process.env, NODE_NO_WARNINGS: "1" }, encoding: "utf8", timeout: 30000 });
}

test("review CLI help does not call a model", () => {
  const result = run(["--help"]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.mode, "help");
  assert.match(payload.usage, /--audit <basename.json>/);
});

test("review CLI requires an audit before loading credentials or calling a model", () => {
  const result = run([]);
  assert.notEqual(result.status, 0);
  assert.match(JSON.parse(result.stderr).error, /--audit.*required/);
});
```

- [ ] **Step 2: Run tests and verify RED**

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/protocol-followup-review-cli.test.mjs
```

Expected: both tests fail because `tools/run-protocol-followup-review.mjs` does not exist.

- [ ] **Step 3: Implement the explicit real-model CLI**

Create `tools/run-protocol-followup-review.mjs`:

```js
import fs from "node:fs";
import path from "node:path";
import { readProtocolFollowupAudit } from "../src/lib/protocol-followup-audit-store.ts";
import { saveProtocolFollowupReview } from "../src/lib/protocol-followup-review-store.ts";
import { runProtocolFollowupReview } from "../src/lib/protocol-followup-review.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
process.chdir(ROOT);
const USAGE = "node --experimental-transform-types --import ./tests/register-ts.mjs tools/run-protocol-followup-review.mjs --audit <basename.json>";

function loadCredentials() {
  for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}

function safeError(error) {
  return (error instanceof Error ? error.message : String(error))
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, "[redacted]")
    .replace(/ghp_[A-Za-z0-9]{20,}/g, "[redacted]")
    .replace(/github_pat_[A-Za-z0-9_]{20,}/g, "[redacted]")
    .slice(0, 300);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    console.log(JSON.stringify({ ok: true, mode: "help", usage: USAGE }, null, 2));
    return;
  }
  if (args.length !== 2 || args[0] !== "--audit" || !args[1] || args[1].startsWith("--")) {
    throw new Error("--audit <basename.json> is required and must be the only mode");
  }
  const loaded = readProtocolFollowupAudit(args[1]);
  loadCredentials();
  const review = await runProtocolFollowupReview({ audit: loaded.record });
  const saved = saveProtocolFollowupReview(loaded.record, review);
  console.log(JSON.stringify({
    ok: true,
    auditKey: review.auditKey,
    path: saved.path,
    attempt: saved.attempt,
    status: review.status,
    evidenceUpgrade: false,
    reviews: review.reviews.map((item) => ({
      role: item.role,
      provider: item.provider,
      model: item.model,
      finishReason: item.finishReason,
      hasContent: Boolean(item.content?.trim()),
      error: item.error,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: safeError(error) }));
  process.exitCode = 1;
});
```

- [ ] **Step 4: Run no-model tests and commit the CLI**

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/protocol-followup-review.test.mjs tests/protocol-followup-review-cli.test.mjs
node --check tools/run-protocol-followup-review.mjs
node node_modules/typescript/bin/tsc --noEmit
git add tools/run-protocol-followup-review.mjs tests/protocol-followup-review-cli.test.mjs
git diff --cached --check
git commit -m "feat: add protocol audit review cli"
```

Expected: all 8 new tests pass, 0 fail; no model is called by the help or missing-argument tests.

- [ ] **Step 5: Run complete offline verification before the real call**

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/*.test.mjs
npm test
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js src/lib/protocol-followup-review.ts src/lib/protocol-followup-review-store.ts src/lib/protocol-followup-audit-store.ts
npm run build
node tests/protocol-scenarios-e2e.mjs
node scripts/generate-kimi-operations.mjs --check
git diff --check
```

Expected: existing 63 Node／protocol tests plus 8 new tests = 71 pass, 0 fail; 58 project unit tests pass; build and six end-to-end scenarios pass; catalog remains at 453 operations.

- [ ] **Step 6: Generate a real audit and run the real three-role review once**

Create or reuse the real audit, capture its actual path, and run the three-role review once:

```bash
CREATE_OUTPUT=$(node --experimental-transform-types --import ./tests/register-ts.mjs tools/run-protocol-followup-audit.mjs --request-id ca-six-2026 --baseline ca-six-2026-v3.json)
AUDIT_PATH=$(CREATE_OUTPUT="$CREATE_OUTPUT" node -e 'const data = JSON.parse(process.env.CREATE_OUTPUT); console.log(data.path)')
AUDIT_FILE=$(CREATE_OUTPUT="$CREATE_OUTPUT" node -e 'const data = JSON.parse(process.env.CREATE_OUTPUT); console.log(data.path.split("/").at(-1))')
AUDIT_SHA_BEFORE=$(AUDIT_PATH="$AUDIT_PATH" node -e 'const fs = require("node:fs"); const crypto = require("node:crypto"); console.log(crypto.createHash("sha256").update(fs.readFileSync(process.env.AUDIT_PATH)).digest("hex"))')
REVIEW_OUTPUT=$(node --experimental-transform-types --import ./tests/register-ts.mjs tools/run-protocol-followup-review.mjs --audit "$AUDIT_FILE")
REVIEW_PATH=$(REVIEW_OUTPUT="$REVIEW_OUTPUT" node -e 'const data = JSON.parse(process.env.REVIEW_OUTPUT); console.log(data.path)')
```

Expected:

- The deterministic audit is created or reused without modifying the request.
- The three real providers are attempted once each.
- The returned `status` is based only on observed finish reasons and nonempty content.
- A new review record is written with the exact `auditKey`; no success is inferred for failed or truncated roles.
- No Next.js server remains running.

If the upstream fails, preserve the partial record and report the actual error; do not fabricate a complete review or repeatedly retry in a tight loop.

- [ ] **Step 7: Inspect and commit the actual records**

Verify both actual JSON objects, the role outcomes, and the audit hash before and after review:

```bash
AUDIT_PATH="$AUDIT_PATH" REVIEW_PATH="$REVIEW_PATH" AUDIT_SHA_BEFORE="$AUDIT_SHA_BEFORE" node --input-type=module -e '
import fs from "node:fs";
import crypto from "node:crypto";
const audit = JSON.parse(fs.readFileSync(process.env.AUDIT_PATH, "utf8"));
const review = JSON.parse(fs.readFileSync(process.env.REVIEW_PATH, "utf8"));
if (audit.auditKey !== review.auditKey) throw new Error("auditKey mismatch");
if (audit.schemaVersion !== "protocol-followup-audit/v1") throw new Error("audit schema mismatch");
if (review.schemaVersion !== "protocol-followup-review/v1") throw new Error("review schema mismatch");
if (audit.evidenceUpgrade !== false || review.evidenceUpgrade !== false) throw new Error("evidenceUpgrade boundary violated");
if (!Array.isArray(review.reviews) || review.reviews.length !== 3) throw new Error("three role records are required");
if (review.status === "complete" && review.reviews.some((item) => !item.content?.trim() || !["stop", "completed", "end_turn"].includes(item.finishReason))) {
  throw new Error("complete review contains an incomplete role");
}
const after = crypto.createHash("sha256").update(fs.readFileSync(process.env.AUDIT_PATH)).digest("hex");
if (after !== process.env.AUDIT_SHA_BEFORE) throw new Error("review modified the deterministic audit");
console.log(JSON.stringify({ auditKey: review.auditKey, status: review.status, roles: review.reviews.map((item) => ({ role: item.role, provider: item.provider, model: item.model, finishReason: item.finishReason, hasContent: Boolean(item.content?.trim()), error: item.error })) }, null, 2));
'

git status --short
git add -- "$AUDIT_PATH" "$REVIEW_PATH"
git diff --cached --check
git commit -m "chore: record protocol audit review"
git push origin HEAD
```

Expected: only the inspected audit and review records are committed. A partial review is reported as partial, not complete. No secrets, `.tmp/`, `.env.local`, or unrelated user files are staged.

## Completion Boundary

This plan completes both offline validation and one real, auditable three-role review. It does not treat model findings as corrections, does not auto-resolve followups from review text, and does not complete the broader garden research objective.
