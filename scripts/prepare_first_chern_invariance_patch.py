"""Add the proved continuous-integer invariance theorem to the Chern structure patch."""

import argparse
import difflib
import hashlib
import json
from pathlib import Path


INVARIANCE_DOC = "/-- **First Chern Number Topological Invariance"
MODEL_DOC = "/-- **定理**：连续整数值陈数模型族"
MODEL_NAME = "FirstChernNumber_TopologicalInvariance_model"
ORIGINAL_NAME = "FirstChernNumber_TopologicalInvariance"
PLACEHOLDER_END = "    True := by trivial"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--original", required=True, type=Path)
    parser.add_argument("--structured", required=True, type=Path)
    parser.add_argument("--proof", required=True, type=Path)
    parser.add_argument("--patched-output", required=True, type=Path)
    parser.add_argument("--patch-output", required=True, type=Path)
    args = parser.parse_args()

    original = args.original.read_text(encoding="utf-8")
    structured = args.structured.read_text(encoding="utf-8")
    proof = args.proof.read_text(encoding="utf-8")
    if structured.count(INVARIANCE_DOC) != 1 or proof.count(MODEL_DOC) != 1:
        raise ValueError("Expected exactly one source theorem and one model theorem")

    theorem_start = proof.index(MODEL_DOC)
    theorem_end = proof.rindex("\nend BerryCurvature")
    theorem = proof[theorem_start:theorem_end]
    theorem = theorem.replace(MODEL_NAME, ORIGINAL_NAME)
    theorem = theorem.replace("FirstChernNumberModel", "FirstChernNumber")

    placeholder_start = structured.index(INVARIANCE_DOC)
    placeholder_end = structured.index(PLACEHOLDER_END, placeholder_start) + len(PLACEHOLDER_END)
    patched = structured[:placeholder_start] + theorem + structured[placeholder_end:]

    for required in [
        f"theorem {ORIGINAL_NAME}\n",
        "(C : ℝ → FirstChernNumber (L := L))",
        "(C 0).value = (C 1).value",
        "IsLocallyConstant.iff_continuous",
        "isPreconnected_Icc",
    ]:
        if required not in patched:
            raise ValueError(f"Missing invariance ingredient: {required}")
    replaced_region = patched[placeholder_start:placeholder_start + len(theorem)]
    if PLACEHOLDER_END in replaced_region or "sorry" in replaced_region:
        raise ValueError("The invariance replacement still contains a placeholder")

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
        "structured_sha256": sha256(args.structured),
        "proof_sha256": sha256(args.proof),
        "patched_sha256": sha256(args.patched_output),
        "patch_sha256": sha256(args.patch_output),
        "original_lines": len(original.splitlines()),
        "patched_lines": len(patched.splitlines()),
        "patch_lines": len(diff.splitlines()),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
