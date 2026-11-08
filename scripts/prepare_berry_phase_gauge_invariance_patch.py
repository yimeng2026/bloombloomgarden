"""Replace the Berry-phase gauge axiom with the proved closed-interval integral theorem."""

import argparse
import difflib
import hashlib
import json
from pathlib import Path


DEFINITION_DOC = "/-- **定义**：态曲线在参数区间"
AXIOM_DOC = "/-- **Berry Phase Gauge Invariance"
MODEL_NAME = "BerryPhase_GaugeInvariance_model"
ORIGINAL_NAME = "BerryPhase_GaugeInvariance"


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
    if structured.count(AXIOM_DOC) != 1 or proof.count(DEFINITION_DOC) != 1:
        raise ValueError("Expected exactly one Berry-phase axiom and one integral definition")

    replacement = proof[proof.index(DEFINITION_DOC):proof.rindex("\nend BerryConnection")]
    replacement = replacement.replace(MODEL_NAME, ORIGINAL_NAME)
    axiom_start = structured.index(AXIOM_DOC)
    axiom_end = structured.index("    True", axiom_start) + len("    True")
    patched = structured[:axiom_start] + replacement + structured[axiom_end:]

    for required in [
        "noncomputable def berryPhaseIntegral",
        f"theorem {ORIGINAL_NAME}\n",
        "(hclosed : θ 1 = θ 0)",
        "intervalIntegral.integral_deriv_eq_sub",
        "BerryConnection_GaugeTransformationLaw",
    ]:
        if required not in patched:
            raise ValueError(f"Missing Berry-phase ingredient: {required}")
    if "sorry" in replacement or "axiom" in replacement:
        raise ValueError("The Berry-phase replacement contains a placeholder or new axiom")

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
