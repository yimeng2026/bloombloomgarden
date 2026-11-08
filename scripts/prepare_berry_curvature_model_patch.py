"""Refine BerryCurvature with a derivative equation and a computable zero instance."""

import argparse
import difflib
import hashlib
import json
from pathlib import Path


DEFINITION_DOC = "/-- **定义**"
LEGACY_STRUCTURE_DOC = "/-- Berry 曲率（Abel 版本）："


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
    if structured.count(LEGACY_STRUCTURE_DOC) != 1 or "BerryCurvatureModel" not in proof:
        raise ValueError("Expected one original BerryCurvature and one refined model")
    replacement = proof[proof.index(DEFINITION_DOC):proof.rindex("\nend BerryCurvature")]
    replacement = replacement.replace("curvatureXYFromBerryConnection_model", "curvatureXYFromBerryConnection")
    replacement = replacement.replace("BerryCurvatureModel (L", "BerryCurvature (L")

    legacy_start = structured.index(LEGACY_STRUCTURE_DOC)
    legacy_end = structured.index("  definition : Prop", legacy_start) + len("  definition : Prop")
    patched = structured[:legacy_start] + replacement + structured[legacy_end:]
    for required in [
        "noncomputable def curvatureXYFromBerryConnection\n",
        "definition : curvatureXY = fun k => curvatureXYFromBerryConnection berryConnection k",
        "noncomputable def zeroBerryCurvatureModel",
    ]:
        if required not in patched:
            raise ValueError(f"Missing Berry-curvature ingredient: {required}")
    if "definition : Prop" in replacement or "sorry" in replacement:
        raise ValueError("The Berry-curvature replacement contains a placeholder")

    args.patched_output.parent.mkdir(parents=True, exist_ok=True)
    args.patch_output.parent.mkdir(parents=True, exist_ok=True)
    args.patched_output.write_text(patched, encoding="utf-8")
    diff = "\n".join(difflib.unified_diff(
        structured.splitlines(), patched.splitlines(),
        fromfile="a/BerryCurvature.lean", tofile="b/BerryCurvature.lean", lineterm="",
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
