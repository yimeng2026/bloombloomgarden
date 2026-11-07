import { expect, test } from "bun:test";
import { buildReviewerFilter } from "../../src/lib/reviewer-filter.ts";

test("reviewer filters preserve board, role and specialty", () => {
  expect(buildReviewerFilter("board-1", "reviewer", "lean4")).toEqual({
    boardId: "board-1",
    role: "reviewer",
    specialty: "lean4",
  });
});

test("reviewer filters include only the board when optional filters are absent", () => {
  expect(buildReviewerFilter("board-1", null, null)).toEqual({ boardId: "board-1" });
});
