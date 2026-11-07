"""Replace the vacuous general Berry gauge-law axiom with the Hilbert proof."""

import argparse
import difflib
import hashlib
import json
from pathlib import Path


START_MARKER = "/-- **Berry Connection Gauge Transformation Law.**"
END_MARKER = "    True"
CONCRETE_NAME = "BerryConnection_GaugeTransformationLaw_physical"
ORIGINAL_NAME = "BerryConnection_GaugeTransformationLaw"


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
    replacement_start = proof.index("variable {M : Type*}")
    replacement_end = proof.rindex("\nend BerryConnection")
    replacement = proof[replacement_start:replacement_end].rstrip() + "\n"
    replacement = replacement.replace(CONCRETE_NAME, ORIGINAL_NAME)
    patched = original[:start] + replacement + original[end:]
    patched = patched.replace("A_n 变换为 A_n + ∇_k θ", "A_n 变换为 A_n - ∇_k θ")
    patched = patched.replace("因此：A' = A + dθ（作为 1-形式）。", "因此：A' = A - dθ（作为 1-形式）。")
    patched = patched.replace("A 变换为 A + dθ，即 \"联络在规范变换下加恰当形式\"", "A 变换为 A - dθ，即 \"联络在规范变换下加恰当形式\"")
    for required in [
        "noncomputable def berryConnection",
        "noncomputable def phaseFactor",
        "InnerProductSpace ℂ H",
        "hnorm : inner ℂ (u k) (u k) = 1",
        "hIθ'.cexp",
        "hphase.smul hu.hasFDerivAt",
        f"theorem {ORIGINAL_NAME}\n",
    ]:
        if required not in patched:
            raise ValueError(f"Missing physical gauge-law ingredient: {required}")
    for outdated_sign in ["A_n 变换为 A_n + ∇_k θ", "因此：A' = A + dθ（作为 1-形式）。", "A 变换为 A + dθ，即 \"联络在规范变换下加恰当形式\""]:
        if outdated_sign in patched:
            raise ValueError(f"Outdated gauge-sign documentation remains: {outdated_sign}")
    args.patched_output.parent.mkdir(parents=True, exist_ok=True)
    args.patch_output.parent.mkdir(parents=True, exist_ok=True)
    args.patched_output.write_text(patched, encoding="utf-8")
    diff = "\n".join(difflib.unified_diff(
        original.splitlines(), patched.splitlines(),
        fromfile="a/BerryConnection.lean", tofile="b/BerryConnection.lean", lineterm="",
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
