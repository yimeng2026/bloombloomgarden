"""Cross-check earlier same-run output against the new construction A/B artifacts."""

import hashlib
import json
from pathlib import Path

import numpy as np

from interpolator_construction import compare_power_curves


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
ROOT = REPO / ".tmp/camb-runs/ultra"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


records = {}
for model in ["zero", "baseline"]:
    run = ROOT / model
    old = np.load(run / "transfer-same-run.npz")
    new = np.load(run / "interpolator-construction.npz")
    frozen = np.load(run / "spectra.npz")
    old_k = old["k_h_per_Mpc"]
    native_nodes = frozen["camb_pk_native_k"]
    frozen_k = frozen["pk_k_h_per_Mpc"]
    mask = (
        np.isfinite(old["same_run_p"])
        & (old_k >= max(native_nodes[0], frozen_k[0]))
        & (old_k <= min(native_nodes[-1], frozen_k[-1]))
    )
    k = old_k[mask]
    new_k = new["aligned_k_h_per_Mpc"]
    if not np.array_equal(k, new_k):
        raise ValueError(f"aligned k grids differ for {model}: {np.max(np.abs(k / new_k - 1.0))}")
    old_native = old["native_reconstructed_p"][mask]
    old_same = old["same_run_p"][mask]
    old_frozen = old["frozen_p_interpolated"]
    new_native = new["aligned_native_reconstructed"]
    new_log = new["aligned_log_cubic"]
    new_frozen = new["aligned_previous_frozen_log_linear"]
    records[model] = {
        "aligned_points": int(k.size),
        "new_log_over_old_same_run": compare_power_curves(k, old_same, new_log),
        "new_native_over_old_native": compare_power_curves(k, old_native, new_native),
        "new_frozen_over_old_frozen": compare_power_curves(k, old_frozen, new_frozen),
        "old_same_run_over_old_native": compare_power_curves(k, old_native, old_same),
        "new_log_over_new_native": compare_power_curves(k, new_native, new_log),
        "old_frozen_over_old_same_run": compare_power_curves(k, old_same, old_frozen),
        "old_same_run_over_old_frozen": compare_power_curves(k, old_frozen, old_same),
        "new_frozen_over_new_log": compare_power_curves(k, new_log, new_frozen),
        "new_log_over_new_frozen": compare_power_curves(k, new_frozen, new_log),
    }

summary = {
    "status": "computed_crosscheck_of_old_same_run_and_new_construction_outputs",
    "records": records,
    "raw_output_sha256": {
        model: {
            "old_same_run": sha256(ROOT / model / "transfer-same-run.npz"),
            "new_construction": sha256(ROOT / model / "interpolator-construction.npz"),
            "frozen_spectra": sha256(ROOT / model / "spectra.npz"),
        }
        for model in ["zero", "baseline"]
    },
    "analysis_runner_sha256": sha256(Path(__file__).resolve()),
    "boundaries": [
        "This cross-check does not overwrite or reinterpret raw files; it compares their actual aligned values.",
        "Agreement of native transfer reconstruction alone does not prove equality of later power-spline outputs near deep zeros.",
    ],
}
path = OUT / "interpolator-run-crosscheck.json"
path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=2))
