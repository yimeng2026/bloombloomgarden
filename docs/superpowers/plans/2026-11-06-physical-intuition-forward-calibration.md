# Physical Intuition Forward Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze model or researcher structure predictions with bounded confidence, bind later holdout outcomes to the exact frozen case, and compute calibration metrics without converting ambiguous outcomes or synthetic demonstrations into scientific evidence.

**Architecture:** Optional model confidence is validated inside the existing typed proposal parser. A forward case hashes its complete frozen content; an outcome hashes and references that case hash, enforces post-freeze holdout access and separate reviewer metadata, and feeds deterministic hit/miss, Brier, coverage, and abstention statistics.

**Tech Stack:** TypeScript, existing physical-intuition core and model reports, canonical JSON/SHA-256, Node.js `node:test`; no new dependencies or paid calls in this plan.

## Global Constraints

- Existing research worktree and branch only; push `origin HEAD`, never `main`, never deploy or remove the worktree. No Agent/subagent.
- Follow TDD and observe missing-feature failures before implementation.
- Confidence is a bounded self-reported or declared score, not the probability that a physical theory is true.
- A proposed case has at least one registered structure and confidence in `[0,1]`; an abstaining case has no candidates and `confidence=null`.
- `caseHash` covers every frozen field. `outcomeHash` covers the outcome and the referenced `caseHash`.
- Holdout access must be strictly after freezing; observation cannot precede holdout access; review cannot precede observation. Reviewer id must differ from the case author and declare independence from that author.
- Hit, miss, near-miss, and inconclusive remain distinct. Only hit/miss enter hit rate and Brier score. Empty resolved sets return `null`, never fabricated zero scores.
- A hit means the declared discriminating criterion was met, not that a law, theory, or physical mapping was proved. `evidenceUpgrade=false` everywhere.
- Reviewer independence here is explicit method/tool separation metadata, not a claim of independent laboratory replication.
- No student training, new model call, source-permission change, API route, or operation-catalog change in this plan. A real prospective demonstration is a later task.

---

### Task 1: Bounded Model Confidence

**Files:**
- Modify: `src/lib/physical-intuition/types.ts`
- Modify: `src/lib/physical-intuition/model-proposal.ts`
- Test: `tests/physical-intuition-confidence.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tests/physical-intuition-confidence.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { proposeIntuitionWithModel } from "../src/lib/physical-intuition/model-proposal.ts";

function task() {
  return {
    taskId: "confidence-fixture",
    title: "Synthetic confidence fixture",
    objective: "Verify bounded prospective confidence",
    observables: [{ name: "position", dimension: { L: 1 } }],
    constraints: [],
    baseline: { name: "baseline", description: "Synthetic baseline" },
    evidence: [],
    triggers: { noncommutative: true },
  };
}

async function run(confidence) {
  const prompts = [];
  return proposeIntuitionWithModel({
    task: task(),
    chat: (request) => {
      prompts.push(request);
      return Promise.resolve({
        provider: "kimi",
        model: "kimi-for-coding",
        content: request.systemPrompt.includes("JSON")
          ? JSON.stringify({ proposals: [{ structureKey: "matrix_states", statement: "Test structure", rationale: "Test rationale", confidence }] })
          : "Bounded method review",
        finishReason: "stop",
        usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
        latencyMs: 12,
      });
    },
  }).then((report) => ({ report, prompts }));
}

test("model confidence is optional, bounded and cannot alter evidence state", async () => {
  const valid = await run(0.65);
  assert.equal(valid.report.proposals[0].confidence, 0.65);
  assert.ok(valid.prompts[0].systemPrompt.includes("confidence"));
  assert.equal(valid.report.status, "complete");
  assert.equal(valid.report.proposals[0].mathStatus, "proposal");
  assert.equal(valid.report.proposals[0].physicalStatus, "analogy");
  const invalid = await run(1.01);
  assert.equal(invalid.report.status, "partial");
  assert.deepEqual(invalid.report.proposals, []);
  assert.match(invalid.report.exchanges[0].error, /confidence/);
  assert.equal(invalid.report.evidenceUpgrade, false);
});
```

Run the test. Expected: failure because confidence is currently discarded and not mentioned by the prompt.

- [ ] **Step 2: Preserve optional confidence in typed model cards**

Add `confidence?: number` to `IntuitionCard`. Extend the structure-proposer JSON example with `"confidence":0.0` and explain that confidence is optional, in `[0,1]`, and never a physical-truth probability or evidence upgrade.

Inside the proposal map, after the required string checks, add:

```ts
const confidence = candidate.confidence;
if (confidence !== undefined && (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1)) {
  throw new Error("confidence must be finite and between zero and one");
}
```

Add `...(typeof confidence === "number" ? { confidence } : {})` to the returned model card. Existing deterministic cards and legacy reports without confidence remain valid.

- [ ] **Step 3: Verify and commit**

Run confidence, model-proposal, and audit tests plus TypeScript. Commit Task 1 with `feat: record bounded intuition confidence`.

---

### Task 2: Frozen Cases, Bound Outcomes, and Calibration Metrics

**Files:**
- Create: `src/lib/physical-intuition/forward-calibration.ts`
- Test: `tests/physical-intuition-forward-calibration.test.mjs`

**Interfaces:**
- `freezeForwardCase(input)`, `freezeModelForwardCase({ report, caseId, problemFamily, falsificationCriteria })`.
- `recordForwardOutcome(caseRecord, input)`, `assertForwardCase(record)`, `assertForwardOutcome(caseRecord, outcome)`.
- `calibrateForwardRecords(entries)` returns full records, counts, `hitRate`, `brierScore`, `meanConfidence`, `confidenceGap`, `coverage`, `abstentionRate`, and `allOutcomesRecorded`.

- [ ] **Step 1: Write the failing forward tests**

Create `tests/physical-intuition-forward-calibration.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { proposeIntuitionWithModel } from "../src/lib/physical-intuition/model-proposal.ts";
import {
  assertForwardCase,
  calibrateForwardRecords,
  freezeForwardCase,
  freezeModelForwardCase,
  recordForwardOutcome,
} from "../src/lib/physical-intuition/forward-calibration.ts";

function caseInput(id, overrides = {}) {
  return {
    caseId: id,
    problemFamily: "synthetic-algebra",
    authorId: "model:fixture",
    frozenAt: "2026-01-01T00:00:00.000Z",
    task: {
      taskId: id,
      title: "Synthetic frozen case",
      objective: "Test a pre-registered structural prediction",
      observables: [{ name: "transition_table", dimension: {} }],
      constraints: [],
      baseline: { name: "baseline", description: "Synthetic baseline" },
      evidence: [],
      triggers: { noncommutative: true },
    },
    decision: "propose",
    candidateKeys: ["matrix_states"],
    confidence: 0.8,
    falsificationCriteria: ["The exact later certificate must satisfy the declared matrix criterion"],
    selectionRule: "fixture_rule_v1",
    reason: "Frozen structural clue, not a physical conclusion",
    ...overrides,
  };
}

function makeOutcome(caseRecord, kind = "hit", overrides = {}) {
  const verdict = { hit: "supported", miss: "refuted", near_miss: "partial", inconclusive: "inconclusive" }[kind];
  return recordForwardOutcome(caseRecord, {
    caseId: caseRecord.caseId,
    caseHash: caseRecord.caseHash,
    observedAt: "2026-01-02T00:00:00.000Z",
    kind,
    holdout: {
      holdoutId: `holdout-${caseRecord.caseId}`,
      accessibleAt: "2026-01-01T12:00:00.000Z",
      evidence: { id: `evidence-${caseRecord.caseId}`, role: "reconstruction", locator: "synthetic exact certificate" },
    },
    review: {
      reviewerId: "independent-exact-checker",
      independentFrom: [caseRecord.authorId],
      reviewedAt: "2026-01-03T00:00:00.000Z",
      verdict,
    },
    ...overrides,
  });
}

async function modelReport(confidences = [0.8, 0.4], finishReason = "stop") {
  return proposeIntuitionWithModel({
    task: caseInput("model-forward-fixture").task,
    generatedAt: "2026-01-01T00:00:00.000Z",
    chat: (request) => Promise.resolve({
      provider: "relay",
      model: "gpt-5.5",
      content: request.systemPrompt.includes("JSON")
        ? JSON.stringify({ proposals: [
          { structureKey: "matrix_states", statement: "Matrix candidate", rationale: "Array clue", confidence: confidences[0] },
          { structureKey: "causal_poset", statement: "Order candidate", rationale: "Contrast", confidence: confidences[1] },
        ] })
        : "Bounded review",
      finishReason,
      usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
      latencyMs: 12,
    }),
  });
}

test("model cases freeze the highest confidence with deterministic tie breaking and immutable hashes", async () => {
  const report = await modelReport();
  const before = JSON.stringify(report);
  const frozen = freezeModelForwardCase({
    report,
    caseId: "model-case",
    problemFamily: "synthetic-algebra",
    falsificationCriteria: ["Later exact result must match the declared matrix criterion"],
  });
  assert.deepEqual(frozen.candidateKeys, ["matrix_states"]);
  assert.equal(frozen.confidence, 0.8);
  assert.equal(frozen.authorId, "model:relay:gpt-5.5");
  assert.match(frozen.caseHash, /^[a-f0-9]{64}$/);
  assert.equal(frozen.evidenceUpgrade, false);
  assert.equal(JSON.stringify(report), before);
  assert.doesNotThrow(() => assertForwardCase(frozen));
  const tied = freezeModelForwardCase({
    report: await modelReport([0.8, 0.8]),
    caseId: "tied-case",
    problemFamily: "synthetic-algebra",
    falsificationCriteria: ["Declared criterion"],
  });
  assert.deepEqual(tied.candidateKeys, ["causal_poset"]);
});

test("outcomes require post-freeze holdouts, separate reviewers, evidence and consistent verdicts", () => {
  const frozen = freezeForwardCase(caseInput("outcome-case"));
  const outcome = makeOutcome(frozen);
  assert.equal(outcome.caseHash, frozen.caseHash);
  assert.match(outcome.outcomeHash, /^[a-f0-9]{64}$/);
  assert.throws(() => makeOutcome(frozen, "hit", { holdout: { ...outcome.holdout, accessibleAt: "2025-12-31T00:00:00.000Z" } }), /after freezing/);
  assert.throws(() => makeOutcome(frozen, "hit", { review: { ...outcome.review, reviewerId: frozen.authorId } }), /independent/);
  assert.throws(() => makeOutcome(frozen, "hit", { review: { ...outcome.review, verdict: "refuted" } }), /verdict/);
  assert.throws(() => makeOutcome(frozen, "hit", { holdout: { ...outcome.holdout, evidence: { ...outcome.holdout.evidence, role: "lead" } } }), /evidence/);
  assert.throws(() => recordForwardOutcome(frozen, { ...outcome, caseHash: "0".repeat(64) }), /caseHash/);
});

test("calibration keeps hits, misses, near-misses, inconclusive, pending and abstentions distinct", () => {
  const hit = freezeForwardCase(caseInput("case-hit", { confidence: 0.8 }));
  const miss = freezeForwardCase(caseInput("case-miss", { confidence: 0.6 }));
  const near = freezeForwardCase(caseInput("case-near", { confidence: 0.7 }));
  const inconclusive = freezeForwardCase(caseInput("case-inconclusive", { confidence: 0.4 }));
  const pending = freezeForwardCase(caseInput("case-pending", { confidence: 0.5 }));
  const abstain = freezeForwardCase(caseInput("case-abstain", { decision: "abstain", candidateKeys: [], confidence: null }));
  const result = calibrateForwardRecords([
    { case: hit, outcome: makeOutcome(hit, "hit") },
    { case: miss, outcome: makeOutcome(miss, "miss") },
    { case: near, outcome: makeOutcome(near, "near_miss") },
    { case: inconclusive, outcome: makeOutcome(inconclusive, "inconclusive") },
    { case: pending },
    { case: abstain },
  ]);
  assert.deepEqual(result.counts, { total: 6, proposed: 5, resolved: 2, hit: 1, miss: 1, nearMiss: 1, inconclusive: 1, pending: 1, abstained: 1 });
  assert.equal(result.hitRate, 0.5);
  assert.equal(result.brierScore, 0.2);
  assert.equal(result.meanConfidence, 0.7);
  assert.equal(result.confidenceGap, 0.2);
  assert.ok(Math.abs(result.coverage - 1 / 3) < 1e-12);
  assert.ok(Math.abs(result.abstentionRate - 1 / 6) < 1e-12);
  assert.equal(result.allOutcomesRecorded, false);
  assert.equal(result.evidenceUpgrade, false);
});

test("empty resolved outcomes produce null metrics rather than fabricated zero scores", () => {
  const frozen = freezeForwardCase(caseInput("case-only-near"));
  const result = calibrateForwardRecords([{ case: frozen, outcome: makeOutcome(frozen, "near_miss") }]);
  assert.equal(result.hitRate, null);
  assert.equal(result.brierScore, null);
  assert.equal(result.meanConfidence, null);
  assert.equal(result.confidenceGap, null);
  assert.equal(result.coverage, 0);
  assert.equal(result.allOutcomesRecorded, true);
});

test("invalid decisions, missing model confidence and partial teachers cannot enter calibration", async () => {
  assert.throws(() => freezeForwardCase(caseInput("bad-propose", { candidateKeys: [] })), /candidate/);
  assert.throws(() => freezeForwardCase(caseInput("bad-abstain", { decision: "abstain" })), /abstain/);
  assert.throws(() => freezeForwardCase(caseInput("bad-confidence", { confidence: 1.2 })), /confidence/);
  assert.throws(() => freezeForwardCase(caseInput("bad-structure", { candidateKeys: ["invented"] })), /structure/);
  const valid = freezeForwardCase(caseInput("hash-case"));
  assert.throws(() => assertForwardCase({ ...valid, caseHash: "0".repeat(64) }), /caseHash/);
  const missing = await modelReport([undefined, 0.4]);
  assert.throws(() => freezeModelForwardCase({ report: missing, caseId: "missing-confidence", problemFamily: "synthetic-algebra", falsificationCriteria: ["criterion"] }), /confidence/);
  const partial = await modelReport([0.8, 0.4], "length");
  assert.throws(() => freezeModelForwardCase({ report: partial, caseId: "partial-teacher", problemFamily: "synthetic-algebra", falsificationCriteria: ["criterion"] }), /complete/);
});
```

Run the test. Expected: `ERR_MODULE_NOT_FOUND` for `forward-calibration.ts`.

- [ ] **Step 2: Implement the forward-calibration types and hashing**

Create `forward-calibration.ts`:

```ts
import { createHash } from "node:crypto";
import { canonicalJson } from "../protocol-followup-audit";
import { evaluateIntuitionTask } from "./evaluate";
import { assertModelProposalReport, type ModelProposalReport } from "./model-proposal";
import { getStructureCard } from "./structure-registry";
import type { EvidenceLink, IntuitionTask } from "./types";

export interface ForwardCase {
  schemaVersion: "physical-intuition-forward-case/v1";
  caseId: string;
  problemFamily: string;
  authorId: string;
  frozenAt: string;
  task: IntuitionTask;
  decision: "propose" | "abstain";
  candidateKeys: string[];
  confidence: number | null;
  falsificationCriteria: string[];
  selectionRule: string;
  reason: string;
  caseHash: string;
  evidenceUpgrade: false;
}
export interface ForwardOutcome {
  schemaVersion: "physical-intuition-forward-outcome/v1";
  caseId: string;
  caseHash: string;
  observedAt: string;
  kind: "hit" | "miss" | "near_miss" | "inconclusive";
  holdout: { holdoutId: string; accessibleAt: string; evidence: EvidenceLink };
  review: { reviewerId: string; independentFrom: string[]; reviewedAt: string; verdict: "supported" | "refuted" | "partial" | "inconclusive" };
  notes?: string;
  outcomeHash: string;
  evidenceUpgrade: false;
}
export type ForwardCaseInput = Omit<ForwardCase, "schemaVersion" | "caseHash" | "evidenceUpgrade">;
export type ForwardOutcomeInput = Omit<ForwardOutcome, "schemaVersion" | "outcomeHash" | "evidenceUpgrade">;
export interface ForwardCalibrationRecord {
  case: ForwardCase;
  outcome?: ForwardOutcome;
  status: "pending" | "abstained" | ForwardOutcome["kind"];
}
export interface ForwardCalibration {
  schemaVersion: "physical-intuition-forward-calibration/v1";
  records: ForwardCalibrationRecord[];
  counts: { total: number; proposed: number; resolved: number; hit: number; miss: number; nearMiss: number; inconclusive: number; pending: number; abstained: number };
  hitRate: number | null;
  brierScore: number | null;
  meanConfidence: number | null;
  confidenceGap: number | null;
  coverage: number | null;
  abstentionRate: number | null;
  allOutcomesRecorded: boolean;
  evidenceUpgrade: false;
  boundaries: string[];
}

function iso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try { return new Date(value).toISOString() === value; } catch { return false; }
}
function hash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}
function assertEvidence(evidence: EvidenceLink): void {
  if (!evidence || typeof evidence.id !== "string" || !evidence.id.trim() || typeof evidence.locator !== "string" || !evidence.locator.trim()) throw new Error("Outcome evidence id and locator are required");
  if (!["observation", "reconstruction", "interpretation", "context", "lead"].includes(evidence.role)) throw new Error("Invalid outcome evidence role");
  if (evidence.sourceUrl !== undefined) {
    let url: URL;
    try { url = new URL(evidence.sourceUrl); } catch { throw new Error("Outcome evidence URL must be valid"); }
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Outcome evidence URL must use HTTP or HTTPS");
  }
}

export function assertForwardCase(record: ForwardCase): void {
  if (!record || record.schemaVersion !== "physical-intuition-forward-case/v1") throw new Error("Unsupported forward case schema");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(record.caseId) || !record.problemFamily?.trim() || !record.authorId?.trim()) throw new Error("Forward case identifiers are required");
  if (!iso(record.frozenAt)) throw new Error("frozenAt must be an exact ISO timestamp");
  evaluateIntuitionTask(record.task);
  if (!Array.isArray(record.candidateKeys) || new Set(record.candidateKeys).size !== record.candidateKeys.length || record.candidateKeys.some((key) => !getStructureCard(key))) throw new Error("Candidate structure keys must be unique and registered");
  if (record.decision === "propose" && (record.candidateKeys.length === 0 || typeof record.confidence !== "number" || !Number.isFinite(record.confidence) || record.confidence < 0 || record.confidence > 1)) throw new Error("A proposed case needs candidates and bounded confidence");
  if (record.decision === "abstain" && (record.candidateKeys.length !== 0 || record.confidence !== null)) throw new Error("An abstain case must have no candidates and null confidence");
  if (!["propose", "abstain"].includes(record.decision)) throw new Error("Invalid forward decision");
  if (!Array.isArray(record.falsificationCriteria) || record.falsificationCriteria.length === 0 || record.falsificationCriteria.some((item) => typeof item !== "string" || !item.trim())) throw new Error("Falsification criteria are required");
  if (!record.selectionRule?.trim() || !record.reason?.trim()) throw new Error("Selection rule and reason are required");
  if (record.evidenceUpgrade !== false) throw new Error("Forward cases cannot upgrade evidence");
  const { caseHash, ...payload } = record;
  if (caseHash !== hash(payload)) throw new Error("Forward caseHash does not match frozen content");
}

export function freezeForwardCase(input: ForwardCaseInput): ForwardCase {
  const body = structuredClone(input);
  const record = { schemaVersion: "physical-intuition-forward-case/v1" as const, ...body, caseHash: hash({ schemaVersion: "physical-intuition-forward-case/v1", ...body }), evidenceUpgrade: false as const };
  assertForwardCase(record);
  return record;
}

export function freezeModelForwardCase(input: { report: ModelProposalReport; caseId: string; problemFamily: string; falsificationCriteria: string[] }): ForwardCase {
  assertModelProposalReport(input.report);
  if (input.report.status !== "complete") throw new Error("A complete model report is required for forward calibration");
  const proposer = input.report.exchanges.find((exchange) => exchange.role === "structure_proposer")!;
  if (input.report.proposals.length === 0 || input.report.proposals.some((proposal) => typeof proposal.confidence !== "number")) throw new Error("Every model proposal needs explicit confidence for forward calibration");
  const ranked = input.report.proposals.map((proposal) => ({ key: proposal.key, confidence: proposal.confidence, reason: proposal.triggerRationale })).sort((left, right) => (right.confidence ?? -1) - (left.confidence ?? -1) || left.key.localeCompare(right.key));
  const selected = ranked[0];
  if (!selected || typeof selected.confidence !== "number") throw new Error("Model proposals need explicit confidence for forward calibration");
  return freezeForwardCase({
    caseId: input.caseId,
    problemFamily: input.problemFamily,
    authorId: `model:${proposer.provider || proposer.request.provider}:${proposer.model || proposer.request.model || "unreported"}`,
    frozenAt: input.report.generatedAt,
    task: structuredClone(input.report.task),
    decision: "propose",
    candidateKeys: [selected.key],
    confidence: selected.confidence,
    falsificationCriteria: [...input.falsificationCriteria],
    selectionRule: "max_reported_confidence_then_structure_key",
    reason: selected.reason,
  });
}

export function assertForwardOutcome(caseRecord: ForwardCase, outcome: ForwardOutcome): void {
  assertForwardCase(caseRecord);
  if (!outcome || outcome.schemaVersion !== "physical-intuition-forward-outcome/v1") throw new Error("Unsupported forward outcome schema");
  if (outcome.caseId !== caseRecord.caseId || outcome.caseHash !== caseRecord.caseHash) throw new Error("Outcome caseId or caseHash does not match the frozen case");
  if (!iso(outcome.observedAt) || !iso(outcome.holdout?.accessibleAt) || !iso(outcome.review?.reviewedAt)) throw new Error("Outcome timestamps must be exact ISO timestamps");
  if (!(outcome.holdout.accessibleAt > caseRecord.frozenAt)) throw new Error("Holdout access must be after freezing");
  if (!(outcome.observedAt >= outcome.holdout.accessibleAt) || !(outcome.review.reviewedAt >= outcome.observedAt)) throw new Error("Outcome observation and review chronology is invalid");
  if (!outcome.holdout.holdoutId?.trim()) throw new Error("A holdout identifier is required");
  assertEvidence(outcome.holdout.evidence);
  if (["hit", "miss", "near_miss"].includes(outcome.kind) && !["observation", "reconstruction"].includes(outcome.holdout.evidence.role)) throw new Error("Resolved outcomes need observation or reconstruction evidence");
  if (!outcome.review.reviewerId?.trim() || outcome.review.reviewerId === caseRecord.authorId || !outcome.review.independentFrom?.includes(caseRecord.authorId)) throw new Error("Outcome reviewer must be independent of the case author");
  const verdict = { hit: "supported", miss: "refuted", near_miss: "partial", inconclusive: "inconclusive" }[outcome.kind];
  if (!verdict || outcome.review.verdict !== verdict) throw new Error("Outcome kind and review verdict are inconsistent");
  if (outcome.notes !== undefined && (typeof outcome.notes !== "string" || !outcome.notes.trim() || outcome.notes.length > 4000)) throw new Error("Outcome notes must be nonempty and bounded");
  if (outcome.evidenceUpgrade !== false) throw new Error("Forward outcomes cannot upgrade evidence");
  const { outcomeHash, ...payload } = outcome;
  if (outcomeHash !== hash(payload)) throw new Error("Forward outcomeHash does not match outcome content");
}

export function recordForwardOutcome(caseRecord: ForwardCase, input: ForwardOutcomeInput): ForwardOutcome {
  const body = structuredClone(input);
  const outcome = { schemaVersion: "physical-intuition-forward-outcome/v1" as const, ...body, outcomeHash: hash({ schemaVersion: "physical-intuition-forward-outcome/v1", ...body }), evidenceUpgrade: false as const };
  assertForwardOutcome(caseRecord, outcome);
  return outcome;
}

export function calibrateForwardRecords(entries: Array<{ case: ForwardCase; outcome?: ForwardOutcome }>): ForwardCalibration {
  const ids = new Set<string>();
  const records = [...entries].sort((left, right) => left.case.caseId.localeCompare(right.case.caseId)).map((entry) => {
    if (ids.has(entry.case.caseId)) throw new Error(`Duplicate forward case: ${entry.case.caseId}`);
    ids.add(entry.case.caseId);
    assertForwardCase(entry.case);
    if (entry.case.decision === "abstain") {
      if (entry.outcome) throw new Error("An abstain case cannot have a hit/miss outcome");
      return { case: structuredClone(entry.case), status: "abstained" as const };
    }
    if (!entry.outcome) return { case: structuredClone(entry.case), status: "pending" as const };
    assertForwardOutcome(entry.case, entry.outcome);
    return { case: structuredClone(entry.case), outcome: structuredClone(entry.outcome), status: entry.outcome.kind };
  });
  const counts = {
    total: records.length,
    proposed: records.filter((record) => record.case.decision === "propose").length,
    resolved: records.filter((record) => ["hit", "miss"].includes(record.status)).length,
    hit: records.filter((record) => record.status === "hit").length,
    miss: records.filter((record) => record.status === "miss").length,
    nearMiss: records.filter((record) => record.status === "near_miss").length,
    inconclusive: records.filter((record) => record.status === "inconclusive").length,
    pending: records.filter((record) => record.status === "pending").length,
    abstained: records.filter((record) => record.status === "abstained").length,
  };
  const resolved = records.filter((record) => ["hit", "miss"].includes(record.status));
  const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const hitRate = counts.resolved ? counts.hit / counts.resolved : null;
  const meanConfidence = mean(resolved.map((record) => record.case.confidence!));
  return {
    schemaVersion: "physical-intuition-forward-calibration/v1",
    records,
    counts,
    hitRate,
    brierScore: mean(resolved.map((record) => (record.case.confidence! - (record.status === "hit" ? 1 : 0)) ** 2)),
    meanConfidence,
    confidenceGap: meanConfidence === null || hitRate === null ? null : meanConfidence - hitRate,
    coverage: counts.total ? counts.resolved / counts.total : null,
    abstentionRate: counts.total ? counts.abstained / counts.total : null,
    allOutcomesRecorded: counts.total > 0 && counts.pending === 0,
    evidenceUpgrade: false,
    boundaries: [
      "hit 只表示预先声明的判别条件被满足，不表示数学定理、物理定律或真实系统得到证明。",
      "只有 hit／miss 进入命中率和 Brier 分数；近 miss、无法判定、待揭示和弃权分别保留。",
      "时间和角色分离是本地审计元数据，不等于独立实验室复现；合成任务只能验证校准流程。",
    ],
  };
}
```

- [ ] **Step 3: Verify GREEN and commit**

Run the new forward test, all physical-intuition tests, and TypeScript. Expected: all pass, including the new confidence test. Commit Task 2 with `feat: add frozen physical intuition calibration`.

---

### Task 3: Documentation and Full Regression

**Files:**
- Modify: `research/physical-intuition/MATH_PHYSICS_WORLDVIEW_2026.md`

- [ ] **Step 1: Add the exact implementation note**

Add to §12.2 immediately before the paragraph beginning `这些指标必须按问题族`:

```markdown
校准核心现提供 `freezeForwardCase`、`freezeModelForwardCase`、`recordForwardOutcome` 和 `calibrateForwardRecords`。模型提议可携带 `[0,1]` 的 `confidence`，但它只是待校准的自报分数。冻结案例包含全部候选、判别条件、选择规则和时间，并计算内容哈希；结果必须引用同一案例哈希，且留出访问晚于冻结、结果观察不早于留出访问、复核不早于观察。复核角色必须与预测作者分离。

只有 `hit` 和 `miss` 进入命中率与 Brier 分数；`near_miss`、`inconclusive`、待揭示和弃权分别计数。没有可判定结果时，指标为 `null`，不能写成“零成功率”。`allOutcomesRecorded` 只说明记录完整，不表示样本足够、可以训练或物理理论得到验证。真实前瞻演示仍须在冻结后揭示结果；此前的合成实调不能冒充物理前瞻证据。
```

- [ ] **Step 2: Run full verification and push**

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

Expected: 113 Node/protocol tests, 58 project tests, six protocol scenarios, 457 operations, clean type/lint/build/diff checks. Commit documentation with `docs: describe frozen intuition calibration`, push `origin HEAD`, verify remote/local equality, and preserve the worktree for the real prospective demonstration.

## Explicitly Outside This Plan

1. No claim that one synthetic case, self-reported confidence, or separate tool review establishes a scientific law or independent laboratory replication.
2. No real model call or claim of real prospective accuracy yet; the next task must freeze first and reveal second.
3. No change to `readyForTraining=false`, source permissions, or student training.
