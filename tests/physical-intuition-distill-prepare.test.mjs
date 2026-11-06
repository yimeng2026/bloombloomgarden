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
