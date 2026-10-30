import { describe, expect, test } from "bun:test";
import {
  generateModuleSyncData,
  generateTheoremSyncData,
  parseLeanFile,
  parseSYLVAProject,
} from "../../src/lib/sylva-parser.ts";

const source = `/-- Millennium Problem -/
theorem parsed_ok : True := by trivial

axiom unproved_assumption : False

theorem open_goal : False := by
  sorry

conjecture speculative : False

-- sorry in a comment
def text_literal : String := "sorry"
noncomputable def chshForm : String := "a real bilinear expression"

example : False := sorry
-- TODO(research): retain this task
`;

describe("SYLVA text parser evidence boundaries", () => {
  test("does not turn comments, strings, definitions or axioms into proofs", () => {
    const leanModule = parseLeanFile("Test.lean", source);
    const parsed = leanModule.theorems.find((item) => item.name === "parsed_ok");
    const axiom = leanModule.theorems.find((item) => item.name === "unproved_assumption");
    const open = leanModule.theorems.find((item) => item.name === "open_goal");
    const conjecture = leanModule.theorems.find((item) => item.name === "speculative");

    expect(leanModule.analysisMode).toBe("text_only_not_compiled");
    expect(leanModule.sorryCount).toBe(2);
    expect(leanModule.definitions).toHaveLength(2);
    expect(leanModule.definitions[0].hasSorry).toBe(false);
    expect(leanModule.definitions[1].name).toBe("chshForm");
    expect(generateTheoremSyncData(parsed, "module-1").status).toBe("parsed");
    expect(generateTheoremSyncData(axiom, "module-1").status).toBe("axiom");
    expect(generateTheoremSyncData(open, "module-1").status).toBe("research");
    expect(generateTheoremSyncData(conjecture, "module-1").status).toBe("conjecture");
    expect(generateModuleSyncData(leanModule).category).toBe("Millennium_Problem");

    const expectedSorryLine = source.split("\n").findIndex((line) => line === "  sorry") + 1;
    expect(open.sorryLines).toEqual([expectedSorryLine]);
  });

  test("excludes generated batches and does not classify every axiom as millennium", () => {
    const project = parseSYLVAProject([
      { path: "Test.lean", content: source },
      {
        path: "generated/SYLVA_ProvenAlgebraR12M3.lean",
        content: "theorem generated_noise : True := by trivial",
      },
    ]);

    expect(project.modules).toHaveLength(1);
    expect(project.skippedGeneratedFiles).toEqual(["generated/SYLVA_ProvenAlgebraR12M3.lean"]);
    expect(project.totalTheorems).toBe(2);
    expect(project.totalConjectures).toBe(1);
    expect(project.totalAxiom).toBe(1);
    expect(project.millenniumProblems.map((item) => item.name)).toEqual(["parsed_ok"]);
    expect(project.todoItems).toHaveLength(1);
  });
});
