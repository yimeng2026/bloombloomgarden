import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { compareLeanHistory } from "../../scripts/compare-lean-history.mjs";
import { exportLeanReviewMarkdown, renderLeanReviewMarkdown } from "../../scripts/lean-review-markdown.mjs";

function reviewResult() {
  return {
    before: { snapshotId: "before", commit: "commit-a" },
    after: { snapshotId: "after", commit: "commit-b" },
    comparison: { changeCount: 2 },
    review: {
      summary: { P1: 1, P2: 1, P3: 0, total: 2 },
      reviewQueue: [
        { id: "R-001", priority: "P1", category: "declaration_added", subject: "A`B", question: "是否假设过多？", evidence: { type: "declaration_added" } },
        { id: "R-002", priority: "P2", category: "file_added", subject: "A.lean", question: "边界是否准确？", evidence: { type: "file_added" } },
      ],
    },
  };
}

function snapshot(id, commit) {
  return {
    schemaVersion: 1,
    snapshotId: id,
    capturedAt: `2026-10-30T0${id === "a" ? 2 : 1}:00:00.000Z`,
    source: { repository: "TOE-SYLVA", commit, dirty: false, toolchain: "Lean", files: [], manifestSha256: commit },
    build: { status: "success", exitCode: 0, targets: ["A"], jobs: 1 },
    axiomCases: [],
    validation: { resultCount: 1, taskStatus: "completed" },
  };
}

test("Markdown checklist groups priorities and escapes inline code", () => {
  const markdown = renderLeanReviewMarkdown(reviewResult());
  expect(markdown).toContain("P1 1 项，P2 1 项，P3 0 项");
  expect(markdown).toContain("- [ ] **R-001");
  expect(markdown).toContain("A\\`B");
  expect(markdown).toContain("不修改任何原始快照");
});

test("Markdown export writes only a derived checklist in the history directory", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "garden-review-export-"));
  try {
    fs.writeFileSync(path.join(directory, "a.json"), JSON.stringify(snapshot("a", "commit-b")));
    fs.writeFileSync(path.join(directory, "b.json"), JSON.stringify(snapshot("b", "commit-a")));
    const before = new Set(fs.readdirSync(directory));
    const result = compareLeanHistory({ directory, review: true, markdown: "review.md" });
    expect(result.readOnly).toBe(false);
    expect(result.sourceReadOnly).toBe(true);
    expect(fs.existsSync(result.markdownFile)).toBe(true);
    expect(fs.readFileSync(result.markdownFile, "utf8")).toContain("# Lean 证据差异审查清单");
    expect(new Set([...before, "review.md"])).toEqual(new Set(fs.readdirSync(directory)));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("Markdown export rejects missing review, non-Markdown files and path escapes", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "garden-review-safe-"));
  try {
    expect(() => exportLeanReviewMarkdown({ result: reviewResult(), directory, filename: "../outside.md" })).toThrow("within");
    expect(() => exportLeanReviewMarkdown({ result: reviewResult(), directory, filename: "review.json" })).toThrow(".md");
    expect(() => compareLeanHistory({ directory, markdown: "review.md" })).toThrow("requires --review");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
