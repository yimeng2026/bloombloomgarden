import { expect, test } from "bun:test";
import { buildReviewFilter, buildReviewPromptContext } from "../../src/lib/review-board.ts";

test("review filters include only supplied constraints", () => {
  expect(buildReviewFilter("board-1", "target-1", "accept", "2")).toEqual({
    boardId: "board-1",
    targetId: "target-1",
    decision: "accept",
    round: 2,
  });
  expect(buildReviewFilter("board-1", null, null, null)).toEqual({ boardId: "board-1" });
});

test("prompt context preserves reviewer and target information", () => {
  const context = buildReviewPromptContext(
    {
      domain: "mathematics",
      reviewMode: "double_blind",
      reviewers: [{ role: "lead_reviewer", specialty: "lean4" }],
    },
    "proof",
    "target-1",
    "Review title",
    2,
    null,
  );
  expect(context).toMatchObject({
    topic: "Review title",
    domain: "mathematics",
    mode: "double_blind",
    role: "lead_reviewer",
    specialty: "lean4",
    targetType: "proof",
    content: "评审对象：proof (ID: target-1)",
    roundNumber: 2,
    title: "Review title",
  });
});

test("empty reviewers and optional board fields use explicit defaults", () => {
  const context = buildReviewPromptContext(
    { domain: "", reviewMode: "", reviewers: [] },
    "code",
    "target-2",
    "Fallback title",
    3,
    { title: "Resolved title", content: "Resolved content" },
  );
  expect(context).toMatchObject({
    domain: "general",
    mode: "single_blind",
    role: "reviewer",
    specialty: "general",
    content: "Resolved content",
    title: "Resolved title",
    roundNumber: 3,
  });
});
