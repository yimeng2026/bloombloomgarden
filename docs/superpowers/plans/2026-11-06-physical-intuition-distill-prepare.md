# Physical Intuition Distillation Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add source-aware method-card injection and deterministic distillation-data screening with license, provenance, hard-check, duplicate, family/time split, and source-leakage gates while keeping student training locked.

**Architecture:** Optional typed method cards are included in real model-review prompts and stored in their reports. `prepareDistillation` validates those reports against licensed, excerpt-anchored method cards, retains positive, negative, and near-miss methods, and emits partitioned candidate samples plus every exclusion reason. A separate training gate remains `readyForTraining=false` until forward calibration and independent evaluation exist.

**Tech Stack:** TypeScript, existing `ModelProposalReport`, deterministic intuition checks, Node.js `node:test`, JSON source manifest, no new dependencies.

## Global Constraints

- Work in the existing `research/provider-main-integration-20261106` worktree; push only `origin HEAD`, never `main`, never deploy or delete the worktree.
- No Agent or subagent. Execute inline with `superpowers:executing-plans` and observe test failure before each implementation.
- Public accessibility does not imply training permission. Unverified or denied sources cannot enter eligible samples.
- Do not clone personalities or claim complete Zhihu profile coverage. Only method rules and bounded excerpts are represented; author/reply relationships remain explicit.
- A teacher report must be complete, validated against its deterministic evaluation, and linked to the exact method cards included in its prompt. Model votes do not replace source or independent review.
- Positive, negative, and near-miss cards are preserved. Hard-check failures, non-method factual claims, incomplete teachers, missing review, time leakage, duplicate content, and cross-partition source leakage are excluded with reasons.
- `readyForTraining` is always `false` in this plan. Partitioned samples are preparation artifacts, not permission to train; forward calibration and independent evaluation are still required.
- No new paid model call, student training, large model download, database write, API route, or operation-catalog change is included.
- Do not commit public-post archives, complete profile content, local model audits, credentials, `.tmp/`, or `data/zhihu-invites/`.
- The source manifest contains only three already documented public URLs as unverified leads, without excerpts or claims of verified authorship, permission, or complete coverage.

---

### Task 1: Bind Typed Method Cards to Model Reports

**Files:**
- Modify: `src/lib/physical-intuition/model-proposal.ts`
- Modify: `tests/physical-intuition-model-proposal.test.mjs`

**Interfaces:**
- Add `ModelMethodCard { cardId, ruleText, applicability }`.
- Add optional `methodCards` to `proposeIntuitionWithModel` input and `ModelProposalReport`; legacy reports without the property remain valid.
- The material sent to all three roles contains the same cloned cards. Reports preserve the exact card snapshots for later source validation.

- [ ] **Step 1: Extend the existing success test first**

In the first model-proposal test, add this input beside `task`:

```js
methodCards: [{
  cardId: "method-evidence-boundary",
  ruleText: "CHECK_SOURCE_BEFORE_CLAIM",
  applicability: "Synthetic method-prompt test only",
}],
```

Add these assertions:

```js
assert.deepEqual(report.methodCards, [{
  cardId: "method-evidence-boundary",
  ruleText: "CHECK_SOURCE_BEFORE_CLAIM",
  applicability: "Synthetic method-prompt test only",
}]);
assert.ok(prompts.every((prompt) => prompt.includes("CHECK_SOURCE_BEFORE_CLAIM")));
```

Run the model-proposal test. Expected: failure because `report.methodCards` is undefined and the marker is absent from prompts.

- [ ] **Step 2: Implement the optional method-card snapshot**

Add to `model-proposal.ts`:

```ts
export interface ModelMethodCard {
  cardId: string;
  ruleText: string;
  applicability: string;
}

function validateMethodCards(value: unknown): ModelMethodCard[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) throw new Error("One to twenty method cards are required");
  const ids = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Method cards must be objects");
    const card = item as Record<string, unknown>;
    if (typeof card.cardId !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(card.cardId) || ids.has(card.cardId)) {
      throw new Error("Method card ids must be unique safe identifiers");
    }
    if (typeof card.ruleText !== "string" || !card.ruleText.trim() || card.ruleText.length > 4000
      || typeof card.applicability !== "string" || !card.applicability.trim() || card.applicability.length > 2000) {
      throw new Error("Method card rules and applicability are required and bounded");
    }
    ids.add(card.cardId);
    return { cardId: card.cardId, ruleText: card.ruleText, applicability: card.applicability };
  });
}
```

Add `methodCards?: ModelMethodCard[]` to `ModelProposalReport`. In `assertModelProposalReport`, call `validateMethodCards(report.methodCards)` only when the property is not `undefined`.

Add `methodCards?: ModelMethodCard[]` to the input type of `proposeIntuitionWithModel`. Before constructing `material`, use:

```ts
const methodCards = input.methodCards === undefined ? undefined : validateMethodCards(input.methodCards);
```

Include `methodCards: methodCards || []` in the `JSON.stringify` material. Add this property to the returned report without changing the old schema version:

```ts
...(methodCards ? { methodCards: structuredClone(methodCards) } : {}),
```

- [ ] **Step 3: Verify and commit**

Run the model-proposal, audit, and saved-live-record validation tests. Expected: existing tests pass, the new assertions pass, and the previous live record without `methodCards` remains valid. Commit Task 1 with `feat: bind method cards to intuition reviews`.

---

### Task 2: Deterministic Distillation Screening

**Files:**
- Create: `src/lib/physical-intuition/distill-prepare.ts`
- Test: `tests/physical-intuition-distill-prepare.test.mjs`

**Interfaces:**
- `prepareDistillation({ sources, methodCards, candidates, partitionAssignments, cutoffs }): DistillPreparation`.
- Input candidates carry a complete `teacherReport`, a selected `teacherRole`, and explicit independent review metadata.
- Output contains `samples`, `excluded`, per-source usability, partition/kind counts, `sourceAndLeakagePassed`, and constant `readyForTraining: false`.

- [ ] **Step 1: Write failing tests**

Create `tests/physical-intuition-distill-prepare.test.mjs` with the following complete offline test file:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { proposeIntuitionWithModel } from "../src/lib/physical-intuition/model-proposal.ts";
import { prepareDistillation } from "../src/lib/physical-intuition/distill-prepare.ts";

function sourceFixture(id, overrides = {}) {
  return {
    sourceId: id,
    sourceUrl: `https://example.invalid/${id}`,
    authorLabel: "Synthetic fixture author",
    recordState: "reviewed",
    registeredAt: "2026-01-01T00:00:00.000Z",
    coverage: "Synthetic method excerpt only",
    authorship: "source_author",
    excerpt: { text: `Bounded method excerpt for ${id}`, locator: "fixture paragraph 1" },
    permission: { status: "licensed", identifier: "CC-BY-4.0", evidenceLocator: `Fixture license record for ${id}` },
    ...overrides,
  };
}

function cardFixture(id, sourceId, family, kind = "positive") {
  return {
    cardId: id,
    ruleText: `Method rule ${id}`,
    applicability: `Scope ${id}`,
    kind,
    problemFamily: family,
    sourceIds: [sourceId],
    review: { status: "verified", reviewerId: "independent-fixture-reviewer", reviewedAt: "2026-01-02T00:00:00.000Z" },
  };
}

function responseFixture(request, content) {
  return {
    provider: "kimi",
    model: "kimi-for-coding",
    content: request.systemPrompt.includes("JSON")
      ? JSON.stringify({ proposals: [{ structureKey: "matrix_states", statement: "Test structure", rationale: "Test rationale" }] })
      : content,
    finishReason: "stop",
    usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
    latencyMs: 12,
  };
}

async function candidateFixture(id, family, cards, generatedAt, content, overrides = {}) {
  const methodCards = cards.map(({ cardId, ruleText, applicability }) => ({ cardId, ruleText, applicability }));
  const teacherReport = await proposeIntuitionWithModel({
    task: {
      taskId: id,
      title: "Synthetic distillation fixture",
      objective: "Verify source-aware method sample filtering",
      observables: [{ name: "position", dimension: { L: 1 } }],
      constraints: [],
      baseline: { name: "baseline", description: "Synthetic baseline" },
      evidence: [],
      triggers: { noncommutative: true },
      ...overrides.task,
    },
    generatedAt,
    methodCards,
    chat: overrides.chat || ((request) => Promise.resolve(responseFixture(request, content))),
  });
  if (overrides.mutateReport) overrides.mutateReport(teacherReport);
  return {
    sampleId: id,
    problemFamily: family,
    teacherReport,
    teacherRole: "evidence_skeptic",
    review: {
      reviewerId: "independent-data-reviewer",
      sourceVerified: true,
      contradictionCheck: "passed",
      leakageCheck: "passed",
      claimMode: "method_only",
    },
    ...overrides.candidate,
  };
}

const split = {
  partitionAssignments: {
    trainProblemFamilies: ["family-a"],
    validationProblemFamilies: ["family-b"],
    testProblemFamilies: ["family-c"],
  },
  cutoffs: { trainBefore: "2026-02-01T00:00:00.000Z", validationBefore: "2026-03-01T00:00:00.000Z" },
};

function exclusion(result, sampleId) {
  return result.excluded.find((item) => item.sampleId === sampleId)?.reasons || [];
}

test("licensed method samples retain negative and near-miss cards with family and time isolation", async () => {
  const sources = [sourceFixture("source-a"), sourceFixture("source-b"), sourceFixture("source-c")];
  const cards = [
    cardFixture("card-a", "source-a", "family-a", "positive"),
    cardFixture("card-b", "source-b", "family-b", "negative"),
    cardFixture("card-c", "source-c", "family-c", "near_miss"),
  ];
  const candidates = [
    await candidateFixture("sample-a", "family-a", [cards[0]], "2026-01-01T00:00:00.000Z", "Unique method review A"),
    await candidateFixture("sample-b", "family-b", [cards[1]], "2026-02-01T00:00:00.000Z", "Unique method review B"),
    await candidateFixture("sample-c", "family-c", [cards[2]], "2026-03-01T00:00:00.000Z", "Unique method review C"),
  ];
  const input = { sources, methodCards: cards, candidates, ...split };
  const before = JSON.stringify(input);
  const result = prepareDistillation(input);
  assert.equal(result.samples.length, 3);
  assert.deepEqual(Object.fromEntries(result.samples.map((sample) => [sample.problemFamily, sample.partition])), {
    "family-a": "train",
    "family-b": "validation",
    "family-c": "test",
  });
  assert.deepEqual(result.kindCounts, { positive: 1, negative: 1, near_miss: 1 });
  assert.deepEqual(result.partitionCounts, { train: 1, validation: 1, test: 1 });
  assert.ok(result.sources.every((source) => source.usable));
  assert.equal(result.sourceAndLeakagePassed, true);
  assert.equal(result.readyForTraining, false);
  assert.equal(result.evidenceUpgrade, false);
  assert.equal(JSON.stringify(input), before);
});

test("permission, excerpt, method review, and independent review failures stay out of eligible samples", async () => {
  const baseCard = cardFixture("card-a", "source-a", "family-a");
  const cases = [
    {
      expected: "permission_unverified",
      source: sourceFixture("source-a", { permission: { status: "unverified", identifier: "unverified", evidenceLocator: "" } }),
      card: baseCard,
      candidate: {},
    },
    { expected: "missing_source_excerpt", source: sourceFixture("source-a", { excerpt: undefined }), card: baseCard, candidate: {} },
    {
      expected: "method_card_unverified",
      source: sourceFixture("source-a"),
      card: { ...baseCard, review: { ...baseCard.review, status: "pending" } },
      candidate: {},
    },
    {
      expected: "independent_review_required",
      source: sourceFixture("source-a"),
      card: baseCard,
      candidate: { review: { reviewerId: "reviewer", sourceVerified: false, contradictionCheck: "passed", leakageCheck: "passed", claimMode: "method_only" } },
    },
    {
      expected: "non_method_claim",
      source: sourceFixture("source-a"),
      card: baseCard,
      candidate: { review: { reviewerId: "reviewer", sourceVerified: true, contradictionCheck: "passed", leakageCheck: "passed", claimMode: "fact" } },
    },
  ];
  for (const [index, item] of cases.entries()) {
    const candidate = await candidateFixture(`sample-${index}`, "family-a", [item.card], "2026-01-01T00:00:00.000Z", `Review ${index}`, { candidate: item.candidate });
    const result = prepareDistillation({ sources: [item.source], methodCards: [item.card], candidates: [candidate], ...split });
    assert.equal(result.samples.length, 0);
    assert.ok(exclusion(result, candidate.sampleId).includes(item.expected), `${item.expected}: ${JSON.stringify(result.excluded)}`);
    assert.equal(result.readyForTraining, false);
  }
});

test("incomplete teachers and hard constraint failures cannot be hidden by review flags", async () => {
  const source = sourceFixture("source-a");
  const card = cardFixture("card-a", "source-a", "family-a");
  const incomplete = await candidateFixture("sample-incomplete", "family-a", [card], "2026-01-01T00:00:00.000Z", "Truncated review", {
    chat: (request) => Promise.resolve({ ...responseFixture(request, "Truncated review"), finishReason: "length" }),
  });
  const incompleteResult = prepareDistillation({ sources: [source], methodCards: [card], candidates: [incomplete], ...split });
  assert.ok(exclusion(incompleteResult, "sample-incomplete").includes("incomplete_teacher"));

  const failed = await candidateFixture("sample-failed", "family-a", [card], "2026-01-01T00:00:00.000Z", "Failed constraint review", {
    task: { constraints: [{ kind: "probabilities", values: [0.2, 0.3], tolerance: 1e-9 }] },
  });
  const failedResult = prepareDistillation({ sources: [source], methodCards: [card], candidates: [failed], ...split });
  assert.ok(exclusion(failedResult, "sample-failed").includes("hard_constraint_failure"));
  assert.equal(failedResult.samples.length, 0);
});

test("unassigned families, time leakage and cross-partition source reuse are rejected", async () => {
  const unassignedSource = sourceFixture("source-unassigned");
  const unassignedCard = cardFixture("card-unassigned", "source-unassigned", "family-unknown");
  const unassigned = await candidateFixture("sample-unassigned", "family-unknown", [unassignedCard], "2026-01-01T00:00:00.000Z", "Unassigned review");
  const unassignedResult = prepareDistillation({ sources: [unassignedSource], methodCards: [unassignedCard], candidates: [unassigned], ...split });
  assert.ok(exclusion(unassignedResult, "sample-unassigned").includes("unassigned_problem_family"));

  const lateSource = sourceFixture("source-late");
  const lateCard = cardFixture("card-late", "source-late", "family-a");
  const late = await candidateFixture("sample-late", "family-a", [lateCard], "2026-02-02T00:00:00.000Z", "Late review");
  const lateResult = prepareDistillation({ sources: [lateSource], methodCards: [lateCard], candidates: [late], ...split });
  assert.ok(exclusion(lateResult, "sample-late").includes("time_leakage"));

  const sharedSource = sourceFixture("source-shared");
  const trainCard = cardFixture("card-shared-train", "source-shared", "family-a");
  const testCard = cardFixture("card-shared-test", "source-shared", "family-c");
  const sharedCandidates = [
    await candidateFixture("sample-shared-train", "family-a", [trainCard], "2026-01-01T00:00:00.000Z", "Shared source train review"),
    await candidateFixture("sample-shared-test", "family-c", [testCard], "2026-03-01T00:00:00.000Z", "Shared source test review"),
  ];
  const leaked = prepareDistillation({ sources: [sharedSource], methodCards: [trainCard, testCard], candidates: sharedCandidates, ...split });
  assert.equal(leaked.samples.length, 0);
  assert.ok(exclusion(leaked, "sample-shared-train").includes("source_leakage"));
  assert.ok(exclusion(leaked, "sample-shared-test").includes("source_leakage"));
  assert.equal(leaked.sourceAndLeakagePassed, false);
});

test("duplicate content and tampered teacher reports leave an exclusion trail", async () => {
  const sources = [sourceFixture("source-a"), sourceFixture("source-b"), sourceFixture("source-c")];
  const cards = [cardFixture("card-a", "source-a", "family-a"), cardFixture("card-b", "source-b", "family-b"), cardFixture("card-c", "source-c", "family-c")];
  const candidates = [
    await candidateFixture("sample-a", "family-a", [cards[0]], "2026-01-01T00:00:00.000Z", "Duplicated method opinion"),
    await candidateFixture("sample-b", "family-b", [cards[1]], "2026-02-01T00:00:00.000Z", "Duplicated method opinion"),
    await candidateFixture("sample-c", "family-c", [cards[2]], "2026-03-01T00:00:00.000Z", "Tampered report opinion", {
      mutateReport: (report) => { report.evaluation.cards[0].mathStatus = "formal_verified"; },
    }),
  ];
  const result = prepareDistillation({ sources, methodCards: cards, candidates, ...split });
  assert.equal(result.samples.length, 1);
  assert.ok(exclusion(result, "sample-b").includes("duplicate_content"));
  assert.ok(exclusion(result, "sample-c").includes("invalid_teacher_report"));
  assert.doesNotMatch(JSON.stringify(result.excluded), /sk-|ghp_|Bearer\s+[A-Za-z0-9]/);
  assert.equal(result.readyForTraining, false);
});

test("missing method provenance cannot be replaced by a same-named card", async () => {
  const sources = [sourceFixture("source-a"), sourceFixture("source-b")];
  const cards = [cardFixture("card-a", "source-a", "family-a"), cardFixture("card-b", "source-b", "family-b")];
  const missing = await candidateFixture("sample-a", "family-a", [cards[0]], "2026-01-01T00:00:00.000Z", "Missing provenance", {
    mutateReport: (report) => { delete report.methodCards; },
  });
  const mismatched = await candidateFixture("sample-b", "family-b", [cards[1]], "2026-02-01T00:00:00.000Z", "Mismatched provenance", {
    mutateReport: (report) => { report.methodCards[0].ruleText = "Tampered method rule"; },
  });
  const result = prepareDistillation({ sources, methodCards: cards, candidates: [missing, mismatched], ...split });
  assert.equal(result.samples.length, 0);
  assert.ok(exclusion(result, "sample-a").includes("missing_method_provenance"));
  assert.ok(exclusion(result, "sample-b").includes("method_provenance_mismatch"));
  assert.equal(result.readyForTraining, false);
});
```

Every candidate-level failure is returned in `excluded` rather than aborting unrelated valid candidates. Globally duplicate source/card/sample ids, overlapping family assignments, and invalid cutoffs throw configuration errors.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/physical-intuition-distill-prepare.test.mjs
```

Expected: `ERR_MODULE_NOT_FOUND` for `distill-prepare.ts`.

- [ ] **Step 3: Implement the source and sample types**

Create `distill-prepare.ts` with these exact public types:

```ts
import { canonicalJson } from "../protocol-followup-audit";
import { assertModelProposalReport, type IntuitionModelRole, type ModelMethodCard, type ModelProposalReport } from "./model-proposal";

export type PermissionStatus = "project_owned" | "licensed" | "public_domain" | "permission_granted" | "unverified" | "denied";
export interface MethodSourceRecord {
  sourceId: string;
  sourceUrl: string;
  authorLabel: string;
  recordState: "lead" | "reviewed";
  registeredAt?: string;
  publishedAt?: string;
  lastCheckedAt?: string;
  coverage: string;
  authorship: "source_author" | "project_reply" | "third_party" | "unknown";
  replyTo?: { url: string; relationship: "reply_to_source" | "project_reply" | "quoted_exchange" };
  excerpt?: { text: string; locator: string };
  permission: { status: PermissionStatus; identifier: string; evidenceLocator: string; notes?: string };
}
export interface DistillMethodCard extends ModelMethodCard {
  kind: "positive" | "negative" | "near_miss";
  problemFamily: string;
  sourceIds: string[];
  review: { status: "verified" | "pending" | "rejected"; reviewerId: string; reviewedAt: string };
}
export interface DistillCandidate {
  sampleId: string;
  problemFamily: string;
  teacherReport: ModelProposalReport;
  teacherRole: IntuitionModelRole;
  review: {
    reviewerId: string;
    sourceVerified: boolean;
    contradictionCheck: "passed" | "failed" | "pending";
    leakageCheck: "passed" | "failed" | "pending";
    claimMode: "method_only" | "hypothesis" | "fact";
  };
}
export interface DistillSample extends DistillCandidate {
  partition: "train" | "validation" | "test";
  methodCards: DistillMethodCard[];
  sourceIds: string[];
}
export interface DistillPreparation {
  schemaVersion: "physical-intuition-distill-preparation/v1";
  samples: DistillSample[];
  excluded: Array<{ sampleId: string; reasons: string[] }>;
  sources: Array<{ source: MethodSourceRecord; usable: boolean; reasons: string[] }>;
  partitionCounts: Record<"train" | "validation" | "test", number>;
  kindCounts: Record<"positive" | "negative" | "near_miss", number>;
  sourceAndLeakagePassed: boolean;
  readyForTraining: false;
  evidenceUpgrade: false;
  boundaries: string[];
}
export interface DistillPreparationInput {
  sources: MethodSourceRecord[];
  methodCards: DistillMethodCard[];
  candidates: DistillCandidate[];
  partitionAssignments: { trainProblemFamilies: string[]; validationProblemFamilies: string[]; testProblemFamilies: string[] };
  cutoffs: { trainBefore: string; validationBefore: string };
}
```

- [ ] **Step 4: Implement deterministic source and configuration validation**

Use these complete validation helpers after the public types:

```ts
const ALLOWED_PERMISSIONS = new Set<PermissionStatus>(["project_owned", "licensed", "public_domain", "permission_granted"]);
const FINISH_REASONS = new Set(["stop", "completed", "end_turn"]);

type Partition = DistillSample["partition"];

function iso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try { return new Date(value).toISOString() === value; } catch { return false; }
}

function webUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

function uniqueBy<T>(items: T[], key: (item: T) => string, label: string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    const id = key(item);
    if (!id || map.has(id)) throw new Error(`Duplicate or empty ${label}: ${id}`);
    map.set(id, item);
  }
  return map;
}

function normalized(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function sourceReasons(source: MethodSourceRecord): string[] {
  const reasons: string[] = [];
  if (!/^[a-z0-9][a-z0-9-]*$/.test(source.sourceId) || !webUrl(source.sourceUrl) || !source.authorLabel?.trim() || !source.coverage?.trim()) reasons.push("invalid_source");
  if (source.recordState !== "reviewed") reasons.push("source_not_reviewed");
  const permission = source.permission?.status;
  if (!permission || !ALLOWED_PERMISSIONS.has(permission)) reasons.push(`permission_${permission || "unknown"}`);
  if (permission && ALLOWED_PERMISSIONS.has(permission) && (!source.permission.identifier?.trim() || !source.permission.evidenceLocator?.trim())) reasons.push("missing_permission_evidence");
  if (!source.excerpt?.text?.trim() || !source.excerpt.locator?.trim()) reasons.push("missing_source_excerpt");
  else if (source.excerpt.text.length > 2000) reasons.push("excerpt_too_long");
  if (source.recordState === "reviewed" && !iso(source.registeredAt)) reasons.push("invalid_registration_date");
  for (const value of [source.publishedAt, source.lastCheckedAt]) if (value !== undefined && !iso(value)) reasons.push("invalid_source_date");
  if (!["source_author", "project_reply", "third_party", "unknown"].includes(source.authorship)) reasons.push("invalid_authorship");
  if (source.replyTo && (!webUrl(source.replyTo.url) || !["reply_to_source", "project_reply", "quoted_exchange"].includes(source.replyTo.relationship))) reasons.push("invalid_reply_relationship");
  return [...new Set(reasons)];
}

function validateSplit(input: DistillPreparationInput): { byFamily: Map<string, Partition>; trainTime: number; validationTime: number } {
  if (!iso(input.cutoffs.trainBefore) || !iso(input.cutoffs.validationBefore)) throw new Error("Split cutoffs must be exact ISO timestamps");
  const trainTime = Date.parse(input.cutoffs.trainBefore);
  const validationTime = Date.parse(input.cutoffs.validationBefore);
  if (trainTime >= validationTime) throw new Error("trainBefore must precede validationBefore");
  const byFamily = new Map<string, Partition>();
  const groups: Array<[Partition, string[]]> = [
    ["train", input.partitionAssignments.trainProblemFamilies],
    ["validation", input.partitionAssignments.validationProblemFamilies],
    ["test", input.partitionAssignments.testProblemFamilies],
  ];
  for (const [partition, families] of groups) {
    for (const family of families) {
      if (!family.trim() || byFamily.has(family)) throw new Error(`Duplicate or empty problem family assignment: ${family}`);
      byFamily.set(family, partition);
    }
  }
  return { byFamily, trainTime, validationTime };
}
```

- [ ] **Step 5: Implement candidate filtering, partitioning, and leakage removal**

Append this complete exported function:

```ts
export function prepareDistillation(input: DistillPreparationInput): DistillPreparation {
  const sourceMap = uniqueBy(input.sources, (source) => source.sourceId, "source id");
  const cardMap = uniqueBy(input.methodCards, (card) => card.cardId, "method card id");
  uniqueBy(input.candidates, (candidate) => candidate.sampleId, "sample id");
  const split = validateSplit(input);
  const sourceAssessments = input.sources.map((source) => {
    const reasons = sourceReasons(source);
    return { source: structuredClone(source), usable: reasons.length === 0, reasons };
  });
  const assessmentBySource = new Map(sourceAssessments.map((assessment) => [assessment.source.sourceId, assessment]));
  const excluded: Array<{ sampleId: string; reasons: string[] }> = [];
  const provisional: DistillSample[] = [];
  const seenContent = new Set<string>();

  for (const candidate of [...input.candidates].sort((left, right) => left.sampleId.localeCompare(right.sampleId))) {
    const reasons = new Set<string>();
    let report: ModelProposalReport;
    try {
      assertModelProposalReport(candidate.teacherReport);
      if (!iso(candidate.teacherReport.generatedAt)) throw new Error("Teacher generatedAt must be exact ISO");
      report = candidate.teacherReport;
    } catch {
      excluded.push({ sampleId: candidate.sampleId, reasons: ["invalid_teacher_report"] });
      continue;
    }

    if (report.status !== "complete") reasons.add("incomplete_teacher");
    const teacher = report.exchanges.find((exchange) => exchange.role === candidate.teacherRole);
    const content = teacher?.content?.trim() || "";
    if (!content || !FINISH_REASONS.has(teacher?.finishReason || "") || teacher?.error) reasons.add("invalid_teacher_role");
    if (!candidate.review?.reviewerId?.trim() || candidate.review.sourceVerified !== true) reasons.add("independent_review_required");
    if (candidate.review?.contradictionCheck !== "passed") reasons.add("contradiction_unresolved");
    if (candidate.review?.leakageCheck !== "passed") reasons.add("leakage_screen_required");
    if (candidate.review?.claimMode !== "method_only") reasons.add("non_method_claim");
    if (report.evaluation.cards.some((card) => card.checks.some((check) => check.status === "fail"))) reasons.add("hard_constraint_failure");

    const usedCards: DistillMethodCard[] = [];
    if (!report.methodCards?.length) {
      reasons.add("missing_method_provenance");
    } else {
      for (const stored of report.methodCards) {
        const registered = cardMap.get(stored.cardId);
        if (!registered) {
          reasons.add("unknown_method_card");
          continue;
        }
        const snapshot = { cardId: registered.cardId, ruleText: registered.ruleText, applicability: registered.applicability };
        if (canonicalJson(stored) !== canonicalJson(snapshot)) reasons.add("method_provenance_mismatch");
        if (registered.review?.status !== "verified" || !registered.review.reviewerId?.trim() || !iso(registered.review.reviewedAt)) reasons.add("method_card_unverified");
        if (registered.problemFamily !== candidate.problemFamily) reasons.add("problem_family_mismatch");
        usedCards.push(registered);
      }
    }

    const sourceIds = new Set<string>();
    for (const card of usedCards) {
      if (!Array.isArray(card.sourceIds) || card.sourceIds.length === 0) {
        reasons.add("missing_source");
        continue;
      }
      for (const sourceId of card.sourceIds) {
        sourceIds.add(sourceId);
        if (!sourceMap.has(sourceId)) {
          reasons.add("unknown_source");
          continue;
        }
        for (const reason of assessmentBySource.get(sourceId)!.reasons) reasons.add(reason);
      }
    }

    const partition = split.byFamily.get(candidate.problemFamily);
    if (!partition) reasons.add("unassigned_problem_family");
    const generatedTime = Date.parse(report.generatedAt);
    if (partition) {
      const timeValid = partition === "train"
        ? generatedTime < split.trainTime
        : partition === "validation"
          ? generatedTime >= split.trainTime && generatedTime < split.validationTime
          : generatedTime >= split.validationTime;
      if (!timeValid) reasons.add("time_leakage");
    }

    if (reasons.size === 0) {
      const fingerprint = normalized(content);
      if (seenContent.has(fingerprint)) reasons.add("duplicate_content");
      else {
        seenContent.add(fingerprint);
        provisional.push({
          ...structuredClone(candidate),
          partition: partition!,
          methodCards: structuredClone(usedCards),
          sourceIds: [...sourceIds].sort(),
        });
      }
    }
    if (reasons.size > 0) excluded.push({ sampleId: candidate.sampleId, reasons: [...reasons] });
  }

  const partitionsBySource = new Map<string, Set<Partition>>();
  for (const sample of provisional) {
    for (const sourceId of sample.sourceIds) {
      const partitions = partitionsBySource.get(sourceId) || new Set<Partition>();
      partitions.add(sample.partition);
      partitionsBySource.set(sourceId, partitions);
    }
  }
  const leakedSources = new Set([...partitionsBySource].filter(([, partitions]) => partitions.size > 1).map(([sourceId]) => sourceId));
  const samples: DistillSample[] = [];
  for (const sample of provisional) {
    if (sample.sourceIds.some((sourceId) => leakedSources.has(sourceId))) {
      excluded.push({ sampleId: sample.sampleId, reasons: ["source_leakage"] });
    } else samples.push(sample);
  }

  const partitionCounts: Record<Partition, number> = { train: 0, validation: 0, test: 0 };
  const kindCounts: DistillPreparation["kindCounts"] = { positive: 0, negative: 0, near_miss: 0 };
  for (const sample of samples) {
    partitionCounts[sample.partition] += 1;
    for (const kind of new Set(sample.methodCards.map((card) => card.kind))) kindCounts[kind] += 1;
  }
  const sourceAndLeakagePassed = partitionCounts.train > 0 && partitionCounts.validation > 0 && partitionCounts.test > 0;
  return {
    schemaVersion: "physical-intuition-distill-preparation/v1",
    samples,
    excluded,
    sources: sourceAssessments,
    partitionCounts,
    kindCounts,
    sourceAndLeakagePassed,
    readyForTraining: false,
    evidenceUpgrade: false,
    boundaries: [
      "样本通过来源和泄漏筛选不等于允许训练；前瞻校准和独立评测仍未完成。",
      "教师意见只作为方法工作流候选，不作为数学定理、物理事实或真实用户立场。",
      "负例和近 miss 保留类型标签；模型投票不能替代来源、硬约束和独立复核。",
    ],
  };
}
```

- [ ] **Step 6: Verify and commit**

Run the new test and all physical-intuition tests, then TypeScript. Expected: all existing tests plus six new tests pass. Commit Task 2 with `feat: screen physical intuition distillation data`.

---

### Task 3: Public-Source Lead Manifest and Usage Documentation

**Files:**
- Create: `research/physical-intuition/method-source-manifest.json`
- Create: `scripts/physical-intuition-distill-prepare.mjs`
- Modify: `research/physical-intuition/MATH_PHYSICS_WORLDVIEW_2026.md`
- Test: `tests/physical-intuition-source-manifest.test.mjs`

**Interfaces:**
- The manifest has `{ sources, methodCards: [], candidates: [], partitionAssignments: { trainProblemFamilies: [], validationProblemFamilies: [], testProblemFamilies: [] }, cutoffs }`.
- The CLI calls `prepareDistillation` without a model or training run and prints only source ids/reasons and gate counts, not excerpts.

- [ ] **Step 1: Write the failing manifest test**

Create `tests/physical-intuition-source-manifest.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";

test("documented public entries remain unverified leads and cannot authorize training", () => {
  const result = spawnSync(process.execPath, [
    "--experimental-transform-types", "--import", "./tests/register-ts.mjs",
    "scripts/physical-intuition-distill-prepare.mjs",
  ], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.sources.length, 3);
  assert.ok(report.sources.every((source) => source.usable === false));
  assert.ok(report.sources.every((source) => source.reasons.includes("permission_unverified")));
  assert.equal(report.sampleCount, 0);
  assert.equal(report.sourceAndLeakagePassed, false);
  assert.equal(report.readyForTraining, false);
  assert.equal(report.evidenceUpgrade, false);
});
```

Run the test and confirm failure because the script/manifest do not exist.

- [ ] **Step 2: Register the three leads without public-text archives**

Create `method-source-manifest.json` with this complete content. Do not add excerpts, publication dates, verified reply relationships, or claims of complete profile coverage:

```json
{
  "sources": [
    {
      "sourceId": "zhihu-wa9527we-discussion-lead",
      "sourceUrl": "https://zhuanlan.zhihu.com/p/2079855144901011157",
      "authorLabel": "wa9527we（既有研究文档中的账号标识，待原文复核）",
      "recordState": "lead",
      "coverage": "既有研究文档登记的公开讨论入口；不是完整主页或训练语料",
      "authorship": "unknown",
      "permission": {
        "status": "unverified",
        "identifier": "unverified",
        "evidenceLocator": "",
        "notes": "公开可访问不等于训练授权；待原文与许可复核"
      }
    },
    {
      "sourceId": "zhihu-canghaihongchen-article-lead",
      "sourceUrl": "https://zhuanlan.zhihu.com/p/2091384018986182648",
      "authorLabel": "沧海红尘（既有研究文档中的账号标识，待原文复核）",
      "recordState": "lead",
      "coverage": "既有研究文档登记的公开文章入口；不是完整主页或训练语料",
      "authorship": "unknown",
      "permission": {
        "status": "unverified",
        "identifier": "unverified",
        "evidenceLocator": "",
        "notes": "公开可访问不等于训练授权；待原文与许可复核"
      }
    },
    {
      "sourceId": "zhihu-reply-exchange-lead",
      "sourceUrl": "https://zhuanlan.zhihu.com/p/2098087169327888097",
      "authorLabel": "公开回复交流（具体作者关系待原文复核）",
      "recordState": "lead",
      "coverage": "既有研究文档登记的公开回复入口；不据此认定双方完整观点或作者关系",
      "authorship": "unknown",
      "permission": {
        "status": "unverified",
        "identifier": "unverified",
        "evidenceLocator": "",
        "notes": "回复信不能误标为对方原文；公开可访问不等于训练授权"
      }
    }
  ],
  "methodCards": [],
  "candidates": [],
  "partitionAssignments": {
    "trainProblemFamilies": [],
    "validationProblemFamilies": [],
    "testProblemFamilies": []
  },
  "cutoffs": {
    "trainBefore": "2027-01-01T00:00:00.000Z",
    "validationBefore": "2027-02-01T00:00:00.000Z"
  }
}
```

- [ ] **Step 3: Add the read-only preparation CLI**

Create `scripts/physical-intuition-distill-prepare.mjs`:

```js
import fs from "node:fs";
import { prepareDistillation } from "../src/lib/physical-intuition/distill-prepare.ts";

const manifest = JSON.parse(fs.readFileSync("research/physical-intuition/method-source-manifest.json", "utf8"));
const result = prepareDistillation(manifest);
console.log(JSON.stringify({
  sources: result.sources.map((item) => ({ sourceId: item.source.sourceId, usable: item.usable, reasons: item.reasons })),
  sampleCount: result.samples.length,
  excluded: result.excluded,
  partitionCounts: result.partitionCounts,
  sourceAndLeakagePassed: result.sourceAndLeakagePassed,
  readyForTraining: result.readyForTraining,
  evidenceUpgrade: result.evidenceUpgrade,
}, null, 2));
```

- [ ] **Step 4: Document the implementation boundary and usage**

Append the following note to `MATH_PHYSICS_WORLDVIEW_2026.md` §11.3:

```markdown
#### 实现状态与使用边界（2026-11-06）

方法卡现在可以通过 `proposeIntuitionWithModel({ task, methodCards, ... })` 进入三个模型角色的共同输入。每张卡只有 `cardId`、`ruleText` 和 `applicability` 三个提示字段；报告保存其快照，旧报告没有该字段时仍可按原格式校验。模型只看到方法规则，不因此获得原作者身份、完整主页或事实核验权。

`prepareDistillation(manifest)` 是确定性的蒸馏准备接口。它接收 `sources`、`methodCards`、`candidates`、`partitionAssignments` 和 `cutoffs`，检查教师报告完整性、提示词中的方法卡快照、来源摘录与许可、独立复核、硬约束、重复内容、问题族与时间隔离，以及跨分区来源复用。输出同时保留候选样本和逐项剔除原因；`positive`、`negative` 和 `near_miss` 不被混成一种正例。

可以用以下命令读取当前来源清单，不调用模型，也不训练学生：

node --experimental-transform-types --import ./tests/register-ts.mjs scripts/physical-intuition-distill-prepare.mjs

当前清单中的三个知乎入口都只是 `lead / unverified`：它们来自前述研究记录，不代表已重新核验作者、原文、回复关系、完整主页或训练授权，也没有保存公开文章全文。只有补齐来源定位、必要摘录、作者与回复关系、许可证据和独立复核后，相关材料才可能进入方法样本。

仓库现有 MIT 许可适用于其自有贡献，并需保留版权与许可声明；它不会把第三方文章重新许可给本项目。即使 `sourceAndLeakagePassed=true`，当前 `readyForTraining` 仍固定为 `false`。这只是“数据准备通过”，不是“允许训练”；还必须另有冻结预测、独立留出结果、前瞻校准和独立评测证据。当前没有执行学生训练。
```

In the actual Markdown document, place the command in a `bash` fenced code block. Replace the stale closing paragraph with this exact text:

```markdown
**当前交付仍不是已经训练完成的学生模型，也不是经过实验证实的统一物理理论。** 确定性任务与结构接口、真实模型提议与双方法复核、不可覆盖审计、方法卡提示词快照和蒸馏数据筛选已经实现并通过固定测试；公开来源仍只有待核验线索。CAS／更多数值检查器、真实前瞻校准、来源授权核验和学生训练尚未完成，不能把现有合成示例或模型意见当成物理验证。
```

- [ ] **Step 5: Verify and push**

Run the manifest test, then the complete regression:

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

Expected: 107 Node/protocol tests, 58 project tests, six end-to-end scenarios, 457 operations, and clean TypeScript, ESLint, production build, and diff checks. Commit Task 3 with `docs: register physical intuition distillation boundaries`, push `origin HEAD`, and verify remote/local equality.

## Explicitly Outside This Plan

1. No claim of complete Zhihu profile collection, source/license approval, personality distillation, or real-user endorsement.
2. No claim that train/validation/test partitioning alone constitutes forward calibration or independent scientific evaluation.
3. No student training. `readyForTraining` stays false until a later forward-calibration gate supplies frozen predictions, outcomes, holdouts, and independent review.
