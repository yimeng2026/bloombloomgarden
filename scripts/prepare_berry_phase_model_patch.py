"""Refine BerryPhase with an actual integral equation and a structure-level gauge theorem."""

import argparse
import difflib
import hashlib
import json
from pathlib import Path


LEGACY_STRUCTURE_DOC = "/-- Berry 相位：当 k 沿闭合路径"
STRUCTURE_DOC = "/-- **定义**：带实际态曲线和相位积分等式的 Berry 相位模型。"
THEOREM_DOC = "/-- **定理**：结构模型的规范相位积分"
PHASE_DEFINITION_DOC = "/-- **定义**：态曲线在参数区间 `[0,1]` 上的 Berry 相位积分。"
PHASE_THEOREM_DOC = "/-- **定理**：若规范相位在闭合参数区间两端相等"
SECTION6 = "-- ============================================\n-- Section 6: Berry 联络的数学抽象\n-- ============================================"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def run_all_tests():
    parser = argparse.ArgumentParser()
    parser.add_argument("--structured", required=True, type=Path)
    parser.add_argument("--proof", required=True, type=Path)
    parser.add_argument("--patched-output", required=True, type=Path)
    parser.add_argument("--patch-output", required=True, type=Path)
    args = parser.parse_args()

    structured = args.structured.read_text(encoding="utf-8")
    original_structured = structured
    structured_line_count = len(structured.splitlines())
    proof = args.proof.read_text(encoding="utf-8")
    for marker in [LEGACY_STRUCTURE_DOC, SECTION6, PHASE_DEFINITION_DOC, PHASE_THEOREM_DOC]:
        if structured.count(marker) != 1:
            raise ValueError(f"Expected exactly one original marker: {marker}")
    for marker in [STRUCTURE_DOC, THEOREM_DOC]:
        if proof.count(marker) != 1:
            raise ValueError(f"Expected exactly one model marker: {marker}")

    structure_start = proof.index(STRUCTURE_DOC)
    theorem_start = proof.index(THEOREM_DOC)
    structure = proof[structure_start:theorem_start].replace("BerryPhaseModel", "BerryPhase")
    theorem = proof[theorem_start:proof.rindex("\nend BerryConnection")]
    theorem = theorem.replace("BerryPhase_GaugeInvariance_refined_model", "BerryPhase_GaugeInvariance_refined")
    theorem = theorem.replace("BerryPhaseModel", "BerryPhase")
    theorem = theorem.replace("BerryPhase_GaugeInvariance_model", "BerryPhase_GaugeInvariance")

    integral_start = structured.index(PHASE_DEFINITION_DOC)
    integral_end = structured.index(PHASE_THEOREM_DOC, integral_start)
    integral_definition = structured[integral_start:integral_end]
    structured = structured[:integral_start] + structured[integral_end:]
    legacy_start = structured.index(LEGACY_STRUCTURE_DOC)
    legacy_end = structured.index("  definition : Prop", legacy_start) + len("  definition : Prop")
    patched = structured[:legacy_start] + integral_definition + structure + structured[legacy_end:]
    patched = patched.replace(SECTION6, theorem + "\n\n" + SECTION6, 1)
    if patched.index("noncomputable def berryPhaseIntegral") > patched.index("structure BerryPhase"):
        raise ValueError("berryPhaseIntegral must precede the refined BerryPhase structure")

    for required in [
        "state : BlochTheorem.CrystalMomentum2D → H",
        "definition : phase = berryPhaseIntegral (fun t => state (path t))",
        "theorem BerryPhase_GaugeInvariance_refined",
        "apply BerryPhase_GaugeInvariance\n",
    ]:
        if required not in patched:
            raise ValueError(f"Missing refined Berry-phase ingredient: {required}")
    if "definition : Prop" in structure or "sorry" in structure + theorem:
        raise ValueError("The refined Berry-phase replacement contains a placeholder")

    args.patched_output.parent.mkdir(parents=True, exist_ok=True)
    args.patch_output.parent.mkdir(parents=True, exist_ok=True)
    args.patched_output.write_text(patched, encoding="utf-8")
    diff = "\n".join(difflib.unified_diff(
        original_structured.splitlines(), patched.splitlines(),
        fromfile="a/BerryConnection.lean", tofile="b/BerryConnection.lean", lineterm="",
    )) + "\n"
    args.patch_output.write_text(diff, encoding="utf-8")
    print(json.dumps({
        "structuredSha256": sha256(args.structured),
        "proofSha256": sha256(args.proof),
        "patchedSha256": sha256(args.patched_output),
        "patchSha256": sha256(args.patch_output),
        "structuredLines": structured_line_count,
        "patchedLines": len(patched.splitlines()),
        "patchLines": len(diff.splitlines()),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    run_all_tests()
