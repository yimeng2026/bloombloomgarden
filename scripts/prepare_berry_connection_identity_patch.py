"""Generate a narrow patch replacing the Berry-connection identity placeholder."""

import argparse
import difflib
import hashlib
import json
from pathlib import Path


START_MARKER = "/-- 恒等规范变换（θ ≡ 0）下，Berry 联络保持不变。"
END_MARKER = "    True := by trivial"
CONCRETE_NAME = "BerryConnection_GaugeTransformationIdentity_concrete"
ORIGINAL_NAME = "BerryConnection_GaugeTransformationIdentity"


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
    replacement_start = proof.index("/-- **定义**：恢复 `CrystalMomentum2D=ℝ×ℝ`")
    replacement_end = proof.rindex("\nend BerryConnection")
    replacement = proof[replacement_start:replacement_end].rstrip() + "\n"
    replacement = replacement.replace(CONCRETE_NAME, ORIGINAL_NAME)
    patched = original[:start] + replacement + original[end:]
    if patched.count(f"theorem {ORIGINAL_NAME}\n") != 1:
        raise ValueError("Expected exactly one concrete identity theorem after patching")
    if "let idGauge : GaugeTransformation L := { theta := fun _ => 0, smoothness := True }\n    -- 恒等规范变换下联络不变：A' = A + d(0) = A\n    True := by trivial" in patched:
        raise ValueError("The original vacuous identity remains")
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
