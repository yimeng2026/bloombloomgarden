"""Replace the exterior-derivative axiom with computable definitions and a gauge-invariance proof."""

import argparse
import difflib
import hashlib
import json
from pathlib import Path


DEFINITION_DOC = "/-- **定义**"
AXIOM_DOC = "/-- **Berry Curvature as Exterior Derivative of Berry Connection."
MODEL_DEFINITION = "exteriorDerivativeOfBerryConnection_model"
ORIGINAL_DEFINITION = "exteriorDerivativeOfBerryConnection"
MODEL_TRANSFORM = "gaugeTransform1Form_model"
ORIGINAL_TRANSFORM = "gaugeTransform1Form"
MODEL_THEOREM = "exteriorDerivativeOfBerryConnection_gauge_invariant_model"
ORIGINAL_THEOREM = "exteriorDerivativeOfBerryConnection_gauge_invariant"


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
    proof = args.proof.read_text(encoding="utf-8")
    if structured.count(AXIOM_DOC) != 1 or proof.count(MODEL_DEFINITION) < 1:
        raise ValueError("Expected one original axiom and one exterior-derivative model")
    replacement = proof[proof.index(DEFINITION_DOC):proof.rindex("\nend BerryConnection")]
    for original, renamed in [
        (MODEL_DEFINITION, ORIGINAL_DEFINITION),
        (MODEL_TRANSFORM, ORIGINAL_TRANSFORM),
        (MODEL_THEOREM, ORIGINAL_THEOREM),
    ]:
        replacement = replacement.replace(original, renamed)

    axiom_start = structured.index(AXIOM_DOC)
    axiom_end = structured.index("    True", axiom_start) + len("    True")
    patched = structured[:axiom_start] + replacement + structured[axiom_end:]
    for required in [
        f"noncomputable def {ORIGINAL_DEFINITION}\n",
        f"noncomputable def {ORIGINAL_TRANSFORM}\n",
        f"theorem {ORIGINAL_THEOREM}\n",
        "mixed_partials_commute_of_contDiff2_complex",
        "fderiv_add",
    ]:
        if required not in patched:
            raise ValueError(f"Missing exterior-derivative ingredient: {required}")
    if "sorry" in replacement or "axiom" in replacement:
        raise ValueError("The exterior-derivative replacement contains a placeholder or new axiom")

    args.patched_output.parent.mkdir(parents=True, exist_ok=True)
    args.patch_output.parent.mkdir(parents=True, exist_ok=True)
    args.patched_output.write_text(patched, encoding="utf-8")
    diff = "\n".join(difflib.unified_diff(
        structured.splitlines(), patched.splitlines(),
        fromfile="a/BerryConnection.lean", tofile="b/BerryConnection.lean", lineterm="",
    )) + "\n"
    args.patch_output.write_text(diff, encoding="utf-8")
    print(json.dumps({
        "structuredSha256": sha256(args.structured),
        "proofSha256": sha256(args.proof),
        "patchedSha256": sha256(args.patched_output),
        "patchSha256": sha256(args.patch_output),
        "structuredLines": len(structured.splitlines()),
        "patchedLines": len(patched.splitlines()),
        "patchLines": len(diff.splitlines()),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    run_all_tests()
