import { expect, test } from "bun:test";
import { createLeanReview } from "../../scripts/lean-review.mjs";
import { parseHistoryArguments } from "../../scripts/compare-lean-history.mjs";

test("unchanged evidence requires no review queue", () => {
  const review = createLeanReview({ hasChanges: false, changeCount: 0, changes: [] });
  expect(review.requiresHumanReview).toBe(false);
  expect(review.reviewQueue).toEqual([]);
});

test("failed builds, sorryAx, new axiom debt and dirty sources are P1", () => {
  const review = createLeanReview({
    hasChanges: true,
    changeCount: 4,
    changes: [
      { type: "build_status_changed", before: "success", after: "failed" },
      { type: "declaration_dependencies_changed", before: [], after: ["sorryAx"], subject: "A.bad" },
      { type: "declaration_added", before: undefined, after: "declared_axiom_debt", subject: "B.debt" },
      { type: "source_dirty_changed", before: false, after: true },
    ],
  });
  expect(review.summary.P1).toBe(4);
  expect(review.requiresHumanReview).toBe(true);
  expect(review.reviewQueue[0].id).toBe("R-001");
  expect(review.priorityMeaning.P1).toContain("not automatic falsification");
});

test("coverage and metadata changes receive lower review priorities", () => {
  const review = createLeanReview({
    hasChanges: true,
    changeCount: 4,
    changes: [
      { type: "file_added", after: "hash", subject: "A.lean" },
      { type: "build_target_removed", before: "A", subject: "A" },
      { type: "build_jobs_changed", before: 10, after: 12 },
      { type: "source_commit_changed", before: "a", after: "b" },
    ],
  });
  expect(review.summary).toEqual({ P1: 0, P2: 2, P3: 2, total: 4 });
  expect(review.reviewQueue.map((item) => item.priority)).toEqual(["P2", "P2", "P3", "P3"]);
  expect(parseHistoryArguments(["--review"]).review).toBe(true);
});
