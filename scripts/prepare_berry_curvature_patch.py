"""Build a narrowly scoped patch replacing the original Berry gauge placeholder."""

import argparse
import difflib
import hashlib
import json
from pathlib import Path


START_MARKER = "/-- **Berry Curvature Gauge Invariance (Schwarz Theorem / d² = 0).**"
END_MARKER = "    True := by trivial"


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
    start = original.index(START_MARKER)
    end = original.index(END_MARKER, start) + len(END_MARKER)
    replacement_start = proof.index("/-- **定义**：`CrystalMomentum2D`")
    replacement_end = proof.rindex("\nend BerryCurvature")
    replacement = proof[replacement_start:replacement_end].rstrip() + "\n"
    patched = original[:start] + replacement + original[end:]
    if patched == original:
        raise ValueError("The placeholder replacement did not change the source")
    if patched.count("theorem BerryCurvature_GaugeInvariance") != 1:
        raise ValueError("Expected exactly one gauge-invariance theorem after patching")
    if "theorem BerryCurvature_GaugeInvariance\n    (L : BlochTheorem.Lattice2D) (Ω" in patched:
        raise ValueError("The vacuous original theorem signature remains")

    args.patched_output.parent.mkdir(parents=True, exist_ok=True)
    args.patch_output.parent.mkdir(parents=True, exist_ok=True)
    args.patched_output.write_text(patched, encoding="utf-8")
    diff = "\n".join(difflib.unified_diff(
        original.splitlines(),
        patched.splitlines(),
        fromfile="a/BerryCurvature.lean",
        tofile="b/BerryCurvature.lean",
        lineterm="",
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
