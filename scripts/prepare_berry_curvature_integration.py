"""Prepare one read-only-source integration of the existing Berry-curvature patches."""

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess


PATCHES = [
    "berry-curvature-gauge-invariance.patch",
    "berry-curvature-gauge-invariance-3d.patch",
    "first-chern-invariance.patch",
    "total-chern-number.patch",
]


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def run_all_tests():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sylva-root", required=True, type=Path)
    parser.add_argument("--output-directory", required=True, type=Path)
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    source_root = args.sylva_root.resolve()
    output = args.output_directory.resolve()
    if output == repo_root or not output.is_relative_to(repo_root):
        raise ValueError("The integration output must be a subdirectory of this repository")
    if output == source_root or output.is_relative_to(source_root):
        raise ValueError("The integration output cannot modify the external SYLVA source tree")

    originals = {
        "BerryCurvature.lean": source_root / "BerryCurvature.lean",
        "TOE_SYLVA_Solutions/BerryCurvature_GaugeInvariance.lean": source_root / "TOE_SYLVA_Solutions/BerryCurvature_GaugeInvariance.lean",
    }
    for original in originals.values():
        if not original.is_file():
            raise FileNotFoundError(original)
    output.mkdir(parents=True, exist_ok=True)
    original_hashes = {}
    for relative, original in originals.items():
        original_hashes[relative] = sha256(original)
        destination = output / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(original, destination)

    stages = []
    for name in PATCHES:
        patch = repo_root / "research" / "formalization" / name
        for action in ["--check", None]:
            command = ["git", "apply"]
            if action:
                command.append(action)
            command.append(patch.as_posix())
            result = subprocess.run(command, cwd=output, capture_output=True, text=True, encoding="utf-8", check=False)
            if result.returncode != 0:
                raise RuntimeError(f"git apply {action or 'apply'} failed for {name}: {result.stdout}{result.stderr}")
        stages.append({"patch": name, "exitCode": 0, "sha256": sha256(patch)})

    report = {
        "status": "success",
        "patches": PATCHES,
        "stages": stages,
        "originalSha256": original_hashes,
        "mainSha256": sha256(output / "BerryCurvature.lean"),
        "threeDSha256": sha256(output / "TOE_SYLVA_Solutions/BerryCurvature_GaugeInvariance.lean"),
        "externalSourceModified": False,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    run_all_tests()
