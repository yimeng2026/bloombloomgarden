"""Generate the exact 3D gauge-invariance patch and verify its semantic guards."""

import argparse
import difflib
import hashlib
import json
import re
from pathlib import Path


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--original", required=True, type=Path)
    parser.add_argument("--proof", required=True, type=Path)
    parser.add_argument("--patch-output", required=True, type=Path)
    args = parser.parse_args()

    original = args.original.read_text(encoding="utf-8")
    proof = args.proof.read_text(encoding="utf-8")
    if "axiom curl_linear_subtraction" not in original:
        raise ValueError("The original curl-linearity axiom was not found")
    if re.search(r"(?m)^\s*(axiom|postulate|sorry)\b", proof):
        raise ValueError("The corrected proof still contains an axiom, postulate, or sorry")
    for required in [
        "theorem curl_linear_subtraction",
        "(hA : DifferentiableAt ℝ A k) (hB : DifferentiableAt ℝ B k)",
        "differentiableAt_pi.mp hA",
        "(hA : DifferentiableAt ℝ A k)",
        "curl_linear_subtraction A (gradient3D φ) k hA hgrad",
    ]:
        if required not in proof:
            raise ValueError(f"Missing corrected-proof ingredient: {required}")
    diff = "\n".join(difflib.unified_diff(
        original.splitlines(),
        proof.splitlines(),
        fromfile="a/TOE_SYLVA_Solutions/BerryCurvature_GaugeInvariance.lean",
        tofile="b/TOE_SYLVA_Solutions/BerryCurvature_GaugeInvariance.lean",
        lineterm="",
    )) + "\n"
    args.patch_output.parent.mkdir(parents=True, exist_ok=True)
    args.patch_output.write_text(diff, encoding="utf-8")
    print(json.dumps({
        "original_sha256": sha256(args.original),
        "proof_sha256": sha256(args.proof),
        "patch_sha256": sha256(args.patch_output),
        "original_lines": len(original.splitlines()),
        "proof_lines": len(proof.splitlines()),
        "patch_lines": len(diff.splitlines()),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
