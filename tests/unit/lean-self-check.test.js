import { expect, test } from "bun:test";
import {
  assertLeanAxioms,
  leanTargets,
  parseLeanAxioms,
  selectedLeanFiles,
} from "../../scripts/lean-self-check.mjs";

test("Lean axiom output accepts only the declared standard dependencies", () => {
  const output = "'example' depends on axioms: [propext, Classical.choice, Quot.sound]";
  expect(parseLeanAxioms(output)).toEqual(["propext", "Classical.choice", "Quot.sound"]);
  expect(assertLeanAxioms(output)).toHaveLength(3);
  expect(parseLeanAxioms("'example' does not depend on any axioms")).toEqual([]);
});

test("Lean self-check rejects sorryAx, custom axioms and option-shaped targets", () => {
  expect(() => assertLeanAxioms("'bad' depends on axioms: [sorryAx]")).toThrow("sorryAx");
  expect(() => assertLeanAxioms("'bad' depends on axioms: [CustomAssumption]")).toThrow("Unexpected Lean axioms");
  expect(leanTargets({ TOE_SYLVA_LEAN_TARGETS: "SYLVA_CHSHCore" })).toEqual(["SYLVA_CHSHCore"]);
  expect(() => leanTargets({ TOE_SYLVA_LEAN_TARGETS: "--force" })).toThrow("Invalid Lean target");
});

test("selected Lean text files stay bounded relative sources", () => {
  expect(selectedLeanFiles("SYLVA_CHSHCore.lean,Nested/Core.lean")).toEqual([
    "SYLVA_CHSHCore.lean",
    "Nested/Core.lean",
  ]);
  expect(() => selectedLeanFiles("../Outside.lean")).toThrow("Invalid selected Lean source");
  expect(() => selectedLeanFiles("C:\\Outside.lean")).toThrow("Invalid selected Lean source");
  expect(() => selectedLeanFiles("Notes.md")).toThrow("Invalid selected Lean source");
});
