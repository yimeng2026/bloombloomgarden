import { expect, test } from "bun:test";
import { buildLeanValidationPlan } from "../../scripts/lean-evidence.mjs";

test("Lean evidence plan links execution records without declaring axiom debt proved", () => {
  const source = {
    repository: "TOE-SYLVA",
    commit: "abc123",
    branch: "main",
    dirty: false,
    toolchain: "Lean 4.29.0",
    files: [{ path: "Core.lean", sha256: "deadbeef" }],
    manifestSha256: "feedface",
  };
  const plan = buildLeanValidationPlan({
    taskId: "task-1",
    source,
    build: { arguments: ["build", "A", "B"], stdoutTail: "Build completed successfully (2 jobs)." },
    cases: [
      { declaration: "A.clean", classification: "standard_only", axioms: ["propext"] },
      { declaration: "B.debt", classification: "declared_axiom_debt", axioms: ["B.debt"] },
    ],
  });
  expect(plan.group.strategy.academicTaskId).toBe("task-1");
  expect(plan.group.strategy.source.commit).toBe("abc123");
  expect(plan.group.strategy.confidenceMeaning).toContain("not scientific truth");
  expect(plan.results).toHaveLength(3);
  expect(plan.results[0].conclusion).toBe("verified");
  expect(plan.results[1].conclusion).toBe("verified");
  expect(plan.results[2].conclusion).toBe("inconclusive");
  expect(JSON.parse(plan.results[2].details).source.commit).toBe("abc123");
  expect(() => buildLeanValidationPlan({ taskId: "", source, build: {}, cases: [] })).toThrow("task ID");
});
