import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  assertLeanAxioms,
  evaluateLeanAxiomCase,
  leanAxiomCases,
  leanTargets,
  parseLeanAxioms,
  selectedLeanFiles,
  withLeanManifest,
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

test("multi-declaration axiom output is evaluated independently", () => {
  const output = "'A.clean' depends on axioms: [propext, Classical.choice, Quot.sound]\n'B.debt' depends on axioms: [propext,\n Classical.choice,\n Quot.sound,\n B.debt]";
  expect(evaluateLeanAxiomCase(output, {
    target: "A",
    declaration: "A.clean",
    mode: "standard_only",
  }).classification).toBe("standard_only");
  expect(evaluateLeanAxiomCase(output, {
    target: "B",
    declaration: "B.debt",
    mode: "declared",
    expectedAxioms: ["propext", "Classical.choice", "Quot.sound", "B.debt"],
  }).customAxioms).toEqual(["B.debt"]);
  expect(() => evaluateLeanAxiomCase(output, {
    target: "B",
    declaration: "B.debt",
    mode: "declared",
    expectedAxioms: ["Other.debt"],
  })).toThrow("mismatch");
});

test("axiom case manifests retain declared debt without weakening standard checks", () => {
  const env = {
    TOE_SYLVA_LEAN_TARGETS: "SYLVA_Causality",
    TOE_SYLVA_AXIOM_CASES: JSON.stringify([{
      target: "SYLVA_Causality",
      declaration: "Example.debt",
      mode: "declared",
      expectedAxioms: ["Example.debt"],
    }]),
  };
  expect(leanAxiomCases(env)[0].mode).toBe("declared");
  expect(() => evaluateLeanAxiomCase("'Example.debt' depends on axioms: [Example.debt]", {
    target: "SYLVA_Causality",
    declaration: "Example.debt",
    mode: "standard_only",
  })).toThrow("Unexpected Lean axioms");
  expect(() => evaluateLeanAxiomCase("'Example.debt' depends on axioms: [sorryAx]", {
    target: "SYLVA_Causality",
    declaration: "Example.debt",
    mode: "declared",
    expectedAxioms: ["sorryAx"],
  })).toThrow("sorryAx");
});

test("a Lean manifest is reproducible and explicit environment values take precedence", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "garden-lean-manifest-"));
  const manifestPath = path.join(temporary, "manifest.json");
  try {
    fs.writeFileSync(manifestPath, JSON.stringify({
      textFiles: ["SYLVA_CHSHCore.lean"],
      targets: ["SYLVA_CHSHCore"],
      axiomCases: [{
        target: "SYLVA_CHSHCore",
        declaration: "Sylva.SYLVACHSHCore.chsh_abs_le_two_sqrt_two",
        mode: "standard_only",
      }],
    }), "utf8");
    const env = withLeanManifest({ TOE_SYLVA_LEAN_MANIFEST: manifestPath });
    expect(env.TOE_SYLVA_TEXT_FILES).toBe("SYLVA_CHSHCore.lean");
    expect(env.TOE_SYLVA_LEAN_TARGETS).toBe("SYLVA_CHSHCore");
    expect(JSON.parse(env.TOE_SYLVA_AXIOM_CASES)).toHaveLength(1);
    const overridden = withLeanManifest({
      TOE_SYLVA_LEAN_MANIFEST: manifestPath,
      TOE_SYLVA_LEAN_TARGETS: "Custom.Target",
    });
    expect(overridden.TOE_SYLVA_LEAN_TARGETS).toBe("Custom.Target");
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
