"""Patch TotalChernNumber with a real sum equation and a conditional zero-sum theorem."""

import argparse
import difflib
import hashlib
import json
from pathlib import Path


STRUCTURE_DOC = "/-- **定义**：带实际求和等式的总陈数模型。"
THEOREM_DOC = "/-- **定理**：若各带陈数整数值之和已有零和证据"
LEGACY_STRUCTURE_DOC = "/-- 多带占据时的总陈数："
LEGACY_THEOREM_DOC = "/-- **Total Chern Number Vanishing for Full Band Occupation."
MODEL_NAME = "TotalChernNumber_FullBandVanishing_model"
ORIGINAL_NAME = "TotalChernNumber_FullBandVanishing"
OPEN_LINE = "open Real Complex Set MeasureTheory intervalIntegral\n"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--structured", required=True, type=Path)
    parser.add_argument("--proof", required=True, type=Path)
    parser.add_argument("--patched-output", required=True, type=Path)
    parser.add_argument("--patch-output", required=True, type=Path)
    args = parser.parse_args()

    structured = args.structured.read_text(encoding="utf-8")
    proof = args.proof.read_text(encoding="utf-8")
    for marker in [LEGACY_STRUCTURE_DOC, LEGACY_THEOREM_DOC]:
        if structured.count(marker) != 1:
            raise ValueError(f"Expected exactly one original marker: {marker}")
    for marker in [STRUCTURE_DOC, THEOREM_DOC]:
        if proof.count(marker) != 1:
            raise ValueError(f"Expected exactly one model marker: {marker}")

    structure_start = proof.index(STRUCTURE_DOC)
    theorem_start = proof.index(THEOREM_DOC)
    theorem_end = proof.rindex("\nend BerryCurvature")
    structure = proof[structure_start:theorem_start]
    theorem = proof[theorem_start:theorem_end]
    for original, replacement in [
        ("TotalChernNumberModel", "TotalChernNumber"),
        ("FirstChernNumberModel", "FirstChernNumber"),
        (MODEL_NAME, ORIGINAL_NAME),
    ]:
        structure = structure.replace(original, replacement)
        theorem = theorem.replace(original, replacement)

    legacy_structure_start = structured.index(LEGACY_STRUCTURE_DOC)
    legacy_structure_end = structured.index("  definition : Prop", legacy_structure_start) + len("  definition : Prop")
    patched = structured[:legacy_structure_start] + structure + structured[legacy_structure_end:]
    legacy_theorem_start = patched.index(LEGACY_THEOREM_DOC)
    legacy_theorem_end = patched.index("    True := by trivial", legacy_theorem_start) + len("    True := by trivial")
    patched = patched[:legacy_theorem_start] + theorem + patched[legacy_theorem_end:]
    if "open scoped BigOperators" not in patched:
        if OPEN_LINE not in patched:
            raise ValueError("Cannot locate the open-declaration line for BigOperators")
        patched = patched.replace(OPEN_LINE, OPEN_LINE + "open scoped BigOperators\n", 1)

    for required in [
        "definition : totalValue = ∑ i, (individualChern i).value",
        "(hfull : ∑ i, (total.individualChern i).value = 0)",
        "total.totalValue = 0 := by",
        "open scoped BigOperators",
    ]:
        if required not in patched:
            raise ValueError(f"Missing total-Chern ingredient: {required}")
    extracted = structure + theorem
    if "definition : Prop" in extracted or "True := by trivial" in extracted or "sorry" in extracted:
        raise ValueError("The total-Chern replacement contains a placeholder")

    args.patched_output.parent.mkdir(parents=True, exist_ok=True)
    args.patch_output.parent.mkdir(parents=True, exist_ok=True)
    args.patched_output.write_text(patched, encoding="utf-8")
    diff = "\n".join(difflib.unified_diff(
        structured.splitlines(), patched.splitlines(),
        fromfile="a/BerryCurvature.lean", tofile="b/BerryCurvature.lean", lineterm="",
    )) + "\n"
    args.patch_output.write_text(diff, encoding="utf-8")
    print(json.dumps({
        "structured_sha256": sha256(args.structured),
        "proof_sha256": sha256(args.proof),
        "patched_sha256": sha256(args.patched_output),
        "patch_sha256": sha256(args.patch_output),
        "structured_lines": len(structured.splitlines()),
        "patched_lines": len(patched.splitlines()),
        "patch_lines": len(diff.splitlines()),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
