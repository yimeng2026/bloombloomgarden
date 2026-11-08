"""Patch FirstChernNumber to carry its measure and integral-to-integer equation."""

import argparse
import difflib
import hashlib
import json
from pathlib import Path


STRUCTURE_MARKER = "structure FirstChernNumber (L : BlochTheorem.Lattice2D) where"
AXIOM_MARKER = "/-- **First Chern Number Integrality Theorem"
CONCRETE_NAME = "FirstChernNumber_Integrality_model"
ORIGINAL_NAME = "FirstChernNumber_Integrality"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--original", required=True, type=Path)
    parser.add_argument("--proof", required=True, type=Path)
    parser.add_argument("--patched-output", required=True, type=Path)
    parser.add_argument("--patch-output", required=True, type=Path)
    args = parser.parse_args()

    original = args.original.read_text(encoding="utf-8")
    proof = args.proof.read_text(encoding="utf-8")
    integral_start = proof.index("/-- **定义**：测度 `μ` 下 Berry 曲率实部的积分。")
    structure_start_in_proof = proof.index("/-- **定义**：带积分—整数定义关系的第一陈数模型。")
    structure_end = proof.index("/-- **定义**：零曲率实例使用的零联络。")
    structure_definition = proof[structure_start_in_proof:structure_end].replace("FirstChernNumberModel", "FirstChernNumber")
    structure_definition = structure_definition.replace("structure FirstChernNumber where", "structure FirstChernNumber (L : BlochTheorem.Lattice2D) where")
    integral_definition = proof[integral_start:structure_start_in_proof]
    definitions = integral_definition + structure_definition
    theorem_start = proof.index("/-- **定理**：第一陈数模型的曲率通量")
    theorem_end = proof.rindex("\nend BerryCurvature")
    theorem = proof[theorem_start:theorem_end].replace(CONCRETE_NAME, ORIGINAL_NAME)
    theorem = theorem.replace("FirstChernNumberModel", "FirstChernNumber")

    structure_start = original.index(STRUCTURE_MARKER)
    structure_end = original.index("  definition : Prop", structure_start) + len("  definition : Prop")
    patched = original[:structure_start] + definitions + original[structure_end:]
    axiom_start = patched.index(AXIOM_MARKER)
    axiom_end = patched.index("    True", axiom_start) + len("    True")
    patched = patched[:axiom_start] + theorem + patched[axiom_end:]
    legacy_doc_start = patched.index("/-- 第一陈数（First Chern Number）：")
    legacy_doc_end = patched.index("    `IntervalIntegral` 提供了一维参数化积分。 -/", legacy_doc_start) + len("    `IntervalIntegral` 提供了一维参数化积分。 -/")
    patched = patched[:legacy_doc_start] + "-- First Chern number with an explicit integral-to-integer definition.\n" + patched[legacy_doc_end:]
    patched = patched.replace(
        "namespace BerryCurvature\n",
        "namespace BerryCurvature\n\ninstance : MeasurableSpace BlochTheorem.Position2D :=\n  inferInstanceAs (MeasurableSpace (ℝ × ℝ))\n",
    )
    for required in [
        "noncomputable def curvatureIntegral",
        "measure : Measure BlochTheorem.Position2D",
        "definition : (1 / (2 * Real.pi)) * curvatureIntegral measure berryCurvature = (value : ℝ)",
        f"theorem {ORIGINAL_NAME}\n",
    ]:
        if required not in patched:
            raise ValueError(f"Missing Chern-structure ingredient: {required}")
    if "definition : Prop" in definitions:
        raise ValueError("The extracted Chern definitions contain an unconstrained Prop")
    args.patched_output.parent.mkdir(parents=True, exist_ok=True)
    args.patch_output.parent.mkdir(parents=True, exist_ok=True)
    args.patched_output.write_text(patched, encoding="utf-8")
    diff = "\n".join(difflib.unified_diff(
        original.splitlines(), patched.splitlines(),
        fromfile="a/BerryCurvature.lean", tofile="b/BerryCurvature.lean", lineterm="",
    )) + "\n"
    args.patch_output.write_text(diff, encoding="utf-8")
    print(json.dumps({
        "original_sha256": sha256(args.original),
        "proof_sha256": sha256(args.proof),
        "patched_sha256": sha256(args.patched_output),
        "patch_sha256": sha256(args.patch_output),
        "original_lines": len(original.splitlines()),
        "patched_lines": len(patched.splitlines()),
        "patch_lines": len(diff.splitlines()),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
