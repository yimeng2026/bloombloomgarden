# Physical Intuition Two-Step Forward Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist immutable frozen cases and later outcomes, then run one real two-phase model prediction followed by an independent exact synthetic certificate without leaking the result into the prediction prompt.

**Architecture:** A small filesystem store validates every case/outcome hash and rejects overwrites or unsafe paths. The CLI has separate `freeze --live` and `reveal <case-file>` commands: freezing saves the raw model review and case; revealing computes an exact linear algebra certificate, binds it to the frozen case hash, and calculates one-case process metrics.

**Tech Stack:** TypeScript, Node.js filesystem and `node:test`, existing `researchChat`, model reports, forward-calibration core, and audit secret checks.

## Global Constraints

- Existing `research/provider-main-integration-20261106` worktree; push only `origin HEAD`, never `main`, never deploy or remove the worktree. No Agent/subagent.
- Follow TDD: observe missing-module and missing-guard failures before implementation.
- `freeze` without `--live` must make no model call and write no audit. `reveal` never calls a model.
- Freeze stores raw model review before deriving the case. If confidence is missing, a role fails, or output is partial, no valid frozen case is manufactured.
- Case and outcome files are exclusive-write, content-validated, secret-screened, and cannot be overwritten. Read paths must remain directly inside the configured audit directory.
- Add `/data/physical-intuition/forward-calibration/` to `.gitignore`; never commit real model reviews, case/outcome records, keys, `.tmp/`, or user archives.
- The synthetic certificate is `(A+B)[1,2]=[2,1]`. It tests the calibration workflow only and is not evidence for quantum mechanics, dark matter, or any real physical system.
- `independent-exact-arithmetic-v1` is a separate deterministic checker, not a human team or independent laboratory replication.
- `evidenceUpgrade=false`; one case cannot justify training, general accuracy, or a physical law. `readyForTraining` remains unchanged and false.

---

### Task 1: Immutable Forward Case and Outcome Store

**Files:**
- Modify: `.gitignore`
- Create: `src/lib/physical-intuition/forward-store.ts`
- Test: `tests/physical-intuition-forward-store.test.mjs`

**Interfaces:**
- `saveForwardCase(record)`, `readForwardCase(filename)`, `saveForwardOutcome(caseRecord, outcome)`, `readForwardOutcome(caseRecord, filename)`.
- `PHYSICAL_INTUITION_FORWARD_DIR` defaults to `data/physical-intuition/forward-calibration`.

- [ ] **Step 1: Verify the new audit directory is not ignored, then protect it**

Run `! git check-ignore -q data/physical-intuition/forward-calibration/test.json` and expect success because no rule matches. Add `/data/physical-intuition/forward-calibration/` immediately after `/data/physical-intuition/model-reviews/` in `.gitignore`. Verify `git check-ignore -v` now matches it.

- [ ] **Step 2: Write the failing store tests**

Create `tests/physical-intuition-forward-store.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { freezeForwardCase, recordForwardOutcome } from "../src/lib/physical-intuition/forward-calibration.ts";
import { readForwardCase, readForwardOutcome, saveForwardCase, saveForwardOutcome } from "../src/lib/physical-intuition/forward-store.ts";

let fixtureNumber = 0;
function environment(t) {
  const directory = `.tmp/forward-store-${process.pid}-${fixtureNumber++}`;
  const previous = process.env.PHYSICAL_INTUITION_FORWARD_DIR;
  process.env.PHYSICAL_INTUITION_FORWARD_DIR = directory;
  fs.rmSync(directory, { recursive: true, force: true });
  t.after(() => {
    if (previous === undefined) delete process.env.PHYSICAL_INTUITION_FORWARD_DIR;
    else process.env.PHYSICAL_INTUITION_FORWARD_DIR = previous;
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  return directory;
}

function caseFixture(overrides = {}) {
  return freezeForwardCase({
    caseId: "store-fixture",
    problemFamily: "synthetic-linear-algebra",
    authorId: "model:fixture",
    frozenAt: "2026-01-01T00:00:00.000Z",
    task: {
      taskId: "store-fixture",
      title: "Synthetic store fixture",
      objective: "Verify immutable forward records",
      observables: [{ name: "transition_table", dimension: {} }],
      constraints: [{ kind: "commutation", a: [[0, 1], [0, 0]], b: [[0, 0], [1, 0]], tolerance: 1e-12 }],
      baseline: { name: "classical_poisson_brackets", description: "Teaching baseline only" },
      evidence: [],
      triggers: { noncommutative: true },
    },
    decision: "propose",
    candidateKeys: ["matrix_states"],
    confidence: 0.75,
    falsificationCriteria: ["Exact independent certificate must match"],
    selectionRule: "fixture_rule_v1",
    reason: "Frozen synthetic structure clue",
    ...overrides,
  });
}

function outcomeFixture(caseRecord) {
  return recordForwardOutcome(caseRecord, {
    caseId: caseRecord.caseId,
    caseHash: caseRecord.caseHash,
    observedAt: "2026-01-02T00:00:00.000Z",
    kind: "hit",
    holdout: {
      holdoutId: "exact-linear-certificate-v1",
      accessibleAt: "2026-01-01T12:00:00.000Z",
      evidence: { id: "exact-linear-certificate", role: "reconstruction", locator: "synthetic exact arithmetic" },
    },
    review: {
      reviewerId: "independent-exact-arithmetic-v1",
      independentFrom: [caseRecord.authorId],
      reviewedAt: "2026-01-03T00:00:00.000Z",
      verdict: "supported",
    },
  });
}

test("case records round-trip and duplicate writes cannot change the original", (t) => {
  environment(t);
  const frozen = caseFixture();
  const saved = saveForwardCase(frozen);
  const originalText = fs.readFileSync(saved.path, "utf8");
  const loaded = readForwardCase(saved.path);
  assert.deepEqual(loaded.record, frozen);
  assert.throws(() => saveForwardCase(frozen), /cannot be overwritten/);
  assert.equal(fs.readFileSync(saved.path, "utf8"), originalText);
});

test("outcome records bind the frozen hash and unsafe directories are rejected", (t) => {
  environment(t);
  const frozen = caseFixture();
  saveForwardCase(frozen);
  const outcome = outcomeFixture(frozen);
  const saved = saveForwardOutcome(frozen, outcome);
  const loaded = readForwardOutcome(frozen, saved.path);
  assert.deepEqual(loaded.record, outcome);
  process.env.PHYSICAL_INTUITION_FORWARD_DIR = "../outside";
  assert.throws(() => saveForwardCase(caseFixture({ caseId: "unsafe" })), /relative directory/);
});

test("tampered hashes, secret-like content and modified files are rejected", (t) => {
  const directory = environment(t);
  const frozen = caseFixture();
  assert.throws(() => saveForwardCase({ ...frozen, caseHash: "0".repeat(64) }), /caseHash/);
  assert.equal(fs.existsSync(directory), false);
  const secret = caseFixture({ reason: `sk-${"x".repeat(24)}` });
  assert.throws(() => saveForwardCase(secret), /secret/i);
  assert.equal(fs.existsSync(directory), false);
  const saved = saveForwardCase(frozen);
  const modified = { ...frozen, confidence: 0.99 };
  fs.writeFileSync(saved.path, JSON.stringify(modified), "utf8");
  assert.throws(() => readForwardCase(saved.path), /caseHash/);
});
```

- [ ] **Step 3: Verify RED**

Run the store test and expect `ERR_MODULE_NOT_FOUND` for `forward-store.ts`.

- [ ] **Step 4: Implement the immutable store**

Create `forward-store.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { assertNoAuditSecrets, relativeProjectPath } from "../protocol-followup-audit-store";
import { assertForwardCase, assertForwardOutcome, type ForwardCase, type ForwardOutcome } from "./forward-calibration";

export function forwardAuditDirectory(): string {
  const directory = process.env.PHYSICAL_INTUITION_FORWARD_DIR || "data/physical-intuition/forward-calibration";
  if (path.isAbsolute(directory) || directory.split(/[\\/]/).includes("..")) throw new Error("PHYSICAL_INTUITION_FORWARD_DIR must be a relative directory inside the project");
  const resolved = path.resolve(process.cwd(), directory);
  const relative = path.relative(process.cwd(), resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Forward audit directory must stay inside the project and cannot be the project root");
  return resolved;
}

function readTarget(filename: string, suffix: string): string {
  if (typeof filename !== "string" || !filename || path.isAbsolute(filename) || filename.split(/[\\/]/).includes("..") || !filename.endsWith(suffix)) throw new Error("Invalid forward audit filename");
  const directory = forwardAuditDirectory();
  const target = path.basename(filename) === filename ? path.join(directory, filename) : path.resolve(process.cwd(), filename);
  const relative = path.relative(directory, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || relative !== path.basename(relative)) throw new Error("Forward audit file must stay directly inside its audit directory");
  return target;
}

function writeImmutable(filename: string, value: unknown): string {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  assertNoAuditSecrets(serialized);
  const directory = forwardAuditDirectory();
  const target = path.join(directory, filename);
  if (fs.existsSync(target)) throw new Error("Forward audit already exists and cannot be overwritten");
  fs.mkdirSync(directory, { recursive: true });
  const descriptor = fs.openSync(target, "wx");
  try {
    fs.writeFileSync(descriptor, serialized, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  return relativeProjectPath(target);
}

export function saveForwardCase(record: ForwardCase) {
  assertForwardCase(record);
  const filename = `${record.caseId}-${record.caseHash.slice(0, 16)}.case.json`;
  return { record, path: writeImmutable(filename, record) };
}

export function readForwardCase(filename: string) {
  const target = readTarget(filename, ".case.json");
  const record = JSON.parse(fs.readFileSync(target, "utf8")) as ForwardCase;
  assertForwardCase(record);
  return { record, path: relativeProjectPath(target) };
}

export function saveForwardOutcome(caseRecord: ForwardCase, outcome: ForwardOutcome) {
  assertForwardOutcome(caseRecord, outcome);
  const filename = `${outcome.caseId}-${outcome.caseHash.slice(0, 16)}.outcome.json`;
  return { record: outcome, path: writeImmutable(filename, outcome) };
}

export function readForwardOutcome(caseRecord: ForwardCase, filename: string) {
  const target = readTarget(filename, ".outcome.json");
  const record = JSON.parse(fs.readFileSync(target, "utf8")) as ForwardOutcome;
  assertForwardOutcome(caseRecord, record);
  return { record, path: relativeProjectPath(target) };
}
```

- [ ] **Step 5: Verify and commit**

Run store and forward-calibration tests plus TypeScript. Commit Task 1 with `feat: persist frozen intuition cases`.

---

### Task 2: Separate Freeze and Reveal Commands

**Files:**
- Create: `scripts/physical-intuition-forward-demo.mjs`
- Test: `tests/physical-intuition-forward-demo.test.mjs`

**Interfaces:**
- `freeze --live`: three real model roles, save raw review, derive and save one frozen case, print only metadata.
- `reveal <case-file>`: no model; exact matrix-vector certificate, immutable outcome, one-case metrics.

- [ ] **Step 1: Write failing CLI tests**

Create `tests/physical-intuition-forward-demo.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { freezeForwardCase } from "../src/lib/physical-intuition/forward-calibration.ts";
import { saveForwardCase } from "../src/lib/physical-intuition/forward-store.ts";

let fixtureNumber = 0;
function environment(t) {
  const directory = `.tmp/forward-demo-${process.pid}-${fixtureNumber++}`;
  const previousForward = process.env.PHYSICAL_INTUITION_FORWARD_DIR;
  const previousReview = process.env.PHYSICAL_INTUITION_AUDIT_DIR;
  process.env.PHYSICAL_INTUITION_FORWARD_DIR = directory;
  process.env.PHYSICAL_INTUITION_AUDIT_DIR = `${directory}/model-reviews`;
  fs.rmSync(directory, { recursive: true, force: true });
  t.after(() => {
    if (previousForward === undefined) delete process.env.PHYSICAL_INTUITION_FORWARD_DIR;
    else process.env.PHYSICAL_INTUITION_FORWARD_DIR = previousForward;
    if (previousReview === undefined) delete process.env.PHYSICAL_INTUITION_AUDIT_DIR;
    else process.env.PHYSICAL_INTUITION_AUDIT_DIR = previousReview;
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  return directory;
}

function run(args) {
  return spawnSync(process.execPath, [
    "--experimental-transform-types", "--import", "./tests/register-ts.mjs",
    "scripts/physical-intuition-forward-demo.mjs", ...args,
  ], { cwd: process.cwd(), env: process.env, encoding: "utf8" });
}

function frozenFixture() {
  return freezeForwardCase({
    caseId: "forward-matrix-demo-20261107",
    problemFamily: "synthetic-linear-algebra",
    authorId: "model:fixture",
    frozenAt: "2026-01-01T00:00:00.000Z",
    task: {
      taskId: "forward-matrix-demo-20261107",
      title: "Synthetic forward demo fixture",
      objective: "Test exact reveal without a model",
      observables: [{ name: "transition_table", dimension: {} }],
      constraints: [{ kind: "commutation", a: [[0, 1], [0, 0]], b: [[0, 0], [1, 0]], tolerance: 1e-12 }],
      baseline: { name: "classical_poisson_brackets", description: "Teaching baseline only" },
      evidence: [],
      triggers: { noncommutative: true },
    },
    decision: "propose",
    candidateKeys: ["matrix_states"],
    confidence: 0.75,
    falsificationCriteria: ["Exact certificate must match"],
    selectionRule: "fixture_rule_v1",
    reason: "Frozen synthetic clue",
  });
}

test("freeze without --live makes no model call and writes no audit", (t) => {
  const directory = environment(t);
  const result = run(["freeze"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /explicit --live/);
  assert.equal(fs.existsSync(directory), false);
});

test("reveal computes an exact certificate and cannot overwrite its outcome", (t) => {
  environment(t);
  const frozen = frozenFixture();
  const saved = saveForwardCase(frozen);
  const before = fs.readFileSync(saved.path, "utf8");
  const result = run(["reveal", saved.path]);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.kind, "hit");
  assert.equal(report.hitRate, 1);
  assert.equal(report.brierScore, 0.0625);
  assert.deepEqual(report.certificate.output, [2, 1]);
  assert.equal(report.evidenceUpgrade, false);
  assert.equal(fs.readFileSync(saved.path, "utf8"), before);
  const duplicate = run(["reveal", saved.path]);
  assert.equal(duplicate.status, 1);
  assert.match(duplicate.stderr, /cannot be overwritten/);
});
```

Run the demo tests and expect `ERR_MODULE_NOT_FOUND` for the script.

- [ ] **Step 2: Implement the two separate commands**

Create `scripts/physical-intuition-forward-demo.mjs`:

```js
import { proposeIntuitionWithModel } from "../src/lib/physical-intuition/model-proposal.ts";
import { saveModelProposalReport } from "../src/lib/physical-intuition/intuition-audit.ts";
import { calibrateForwardRecords, freezeModelForwardCase, recordForwardOutcome } from "../src/lib/physical-intuition/forward-calibration.ts";
import { readForwardCase, saveForwardCase, saveForwardOutcome } from "../src/lib/physical-intuition/forward-store.ts";

const [command, argument] = process.argv.slice(2);
const CASE_ID = "forward-matrix-demo-20261107";
const CRITERIA = [
  "当且仅当冻结选择为 matrix_states 且独立证书 (A+B)[1,2]=[2,1] 时记为 hit；其他有效结构选择记为 miss；无法复核记为 inconclusive",
  "该合成代数任务只验证前瞻流程，不支持量子力学、暗物质或其他真实物理结论",
];

if (command === "freeze") {
  if (argument !== "--live") throw new Error("Refusing a billable model call without the explicit --live flag");
  const report = await proposeIntuitionWithModel({
    task: {
      taskId: CASE_ID,
      title: "Synthetic noncommutative forward task; not an empirical result",
      objective: "Freeze the most useful structure for a later indexed linear-update certificate; do not infer a real quantum system",
      observables: [{ name: "transition_table", dimension: {} }],
      constraints: [{ kind: "commutation", a: [[0, 1], [0, 0]], b: [[0, 0], [1, 0]], tolerance: 1e-12 }],
      baseline: { name: "classical_poisson_brackets", description: "Teaching comparison only; not physical evidence" },
      evidence: [],
      data: { origin: "synthetic", trainAvailable: false, holdoutAvailable: false, samplingNote: "Holdout result is not available at freeze time" },
      triggers: { noncommutative: true },
    },
    roles: [
      { id: "structure_proposer", provider: "relay", model: "gpt-5.5" },
      { id: "evidence_skeptic", provider: "kimi" },
      { id: "theory_gardener", provider: "relay", model: "gpt-5.5" },
    ],
  });
  const savedReport = saveModelProposalReport(report);
  const frozen = freezeModelForwardCase({ report, caseId: CASE_ID, problemFamily: "synthetic-linear-algebra", falsificationCriteria: CRITERIA });
  const savedCase = saveForwardCase(frozen);
  console.log(JSON.stringify({
    command: "freeze",
    caseFile: savedCase.path,
    reportFile: savedReport.path,
    caseHash: frozen.caseHash,
    candidateKeys: frozen.candidateKeys,
    confidence: frozen.confidence,
    evidenceUpgrade: frozen.evidenceUpgrade,
  }, null, 2));
} else if (command === "reveal") {
  if (!argument) throw new Error("A frozen .case.json filename is required");
  const { record: frozen } = readForwardCase(argument);
  const constraint = frozen.task.constraints.find((item) => item.kind === "commutation");
  if (!constraint) throw new Error("The frozen case has no exact commutation input");
  const matrix = constraint.a.map((row, i) => row.map((value, j) => value + constraint.b[i][j]));
  const input = [1, 2];
  const output = matrix.map((row) => row.reduce((sum, value, index) => sum + value * input[index], 0));
  if (output.length !== 2 || output[0] !== 2 || output[1] !== 1) throw new Error("Unexpected exact certificate; do not score it");
  const hit = frozen.candidateKeys.length === 1 && frozen.candidateKeys[0] === "matrix_states";
  const now = new Date().toISOString();
  const outcome = recordForwardOutcome(frozen, {
    caseId: frozen.caseId,
    caseHash: frozen.caseHash,
    observedAt: now,
    kind: hit ? "hit" : "miss",
    holdout: {
      holdoutId: "exact-linear-certificate-v1",
      accessibleAt: now,
      evidence: {
        id: "exact-linear-certificate",
        role: "reconstruction",
        locator: "scripts/physical-intuition-forward-demo.mjs#exact-holdout-check",
        note: JSON.stringify({ operation: "(A+B)v", input, output }),
      },
    },
    review: {
      reviewerId: "independent-exact-arithmetic-v1",
      independentFrom: [frozen.authorId],
      reviewedAt: now,
      verdict: hit ? "supported" : "refuted",
    },
    notes: "仅验证合成校准流程，不是独立实验室复现或物理证据",
  });
  const savedOutcome = saveForwardOutcome(frozen, outcome);
  const calibration = calibrateForwardRecords([{ case: frozen, outcome }]);
  console.log(JSON.stringify({
    command: "reveal",
    outcomeFile: savedOutcome.path,
    caseHash: frozen.caseHash,
    kind: outcome.kind,
    hitRate: calibration.hitRate,
    brierScore: calibration.brierScore,
    certificate: { input, output },
    evidenceUpgrade: calibration.evidenceUpgrade,
  }, null, 2));
} else {
  throw new Error("Use freeze --live or reveal <case-file>");
}
```

- [ ] **Step 3: Verify offline tests and commit**

Run the two demo tests and all forward tests. Expected: the no-cost guard and exact reveal pass without network. Commit Task 2 with `feat: add two-step intuition forward demo`.

---

### Task 3: Real Freeze, Later Reveal, and Regression

**Files:**
- Modify: `research/physical-intuition/MATH_PHYSICS_WORLDVIEW_2026.md`

- [ ] **Step 1: Run one real freeze**

```bash
node --env-file=.env.local --experimental-transform-types --import ./tests/register-ts.mjs scripts/physical-intuition-forward-demo.mjs freeze --live
```

Expected: one real report and one immutable case. If a role or confidence fails, preserve the raw report but do not manufacture a case. Record the printed case filename without printing credentials or raw opinions.

- [ ] **Step 2: Reveal the same case in a separate process**

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs scripts/physical-intuition-forward-demo.mjs reveal <case-file>
```

Expected: the case hash is unchanged, exact output is `[2,1]`, outcome matches the frozen structure, and the outcome file is new. A duplicate reveal must fail without overwriting.

- [ ] **Step 3: Record the implementation boundary**

Add to the paper's calibration implementation note:

```markdown
两步演示现以 `freeze --live` 和 `reveal <case-file>` 分离预测与结果：真实模型只先看到任务，原始复核与冻结案例先落盘；另一进程再计算精确合成证书并绑定同一案例哈希。案例与结果文件均不可覆盖，真实运行目录不进入 Git。单例命中或失误只说明流程按预期执行，不构成普遍准确率、独立实验复现或物理证实。
```

If the real run does not produce a valid case, document the actual failure instead of claiming a successful demo.

- [ ] **Step 4: Run complete verification and push**

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/*.test.mjs
npm test
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js src/lib/physical-intuition
npm run build
node tests/protocol-scenarios-e2e.mjs
node scripts/generate-kimi-operations.mjs --check
git diff --check
```

Expected: 118 Node/protocol tests, 58 project tests, six end-to-end scenarios, 457 operations, and clean type/lint/build/diff checks. Commit documentation with `docs: record two-step intuition demo`, push `origin HEAD`, verify remote/local equality, and keep real audits local and ignored.

## Explicitly Outside This Plan

1. No claim that a simple matrix clue or a one-case hit predicts physical structure with established general accuracy.
2. No claim of independent human or laboratory replication; the checker only performs exact deterministic arithmetic.
3. No student training or permission change based on this single demonstration.
