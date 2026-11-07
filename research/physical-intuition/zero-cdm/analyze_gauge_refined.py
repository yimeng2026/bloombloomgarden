"""Analyze the direct-velocity gauge map in CLASS's signed normalization."""

import hashlib
import json
from pathlib import Path

import numpy as np

from gauge_transform import signed_error_summary


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
CAMB_ROOT = REPO / ".tmp/camb-runs/ultra"
CLASS_ROOT = REPO / ".tmp/class_public/convergence/transfer"
CLASS_FILES = {
    "zero": "zero-cdm-transfer-dense00_00_tk.dat",
    "baseline": "baseline-lcdm-transfer-dense00_00_tk.dat",
}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


records = {}
raw_hashes = {}
for model, filename in CLASS_FILES.items():
    camb_path = CAMB_ROOT / model / "gauge-transform-refined.npz"
    run_summary_path = CAMB_ROOT / model / "gauge-transform-refined-summary.json"
    class_path = CLASS_ROOT / filename
    camb = np.load(camb_path)
    run_summary = json.loads(run_summary_path.read_text(encoding="utf-8"))
    class_data = np.loadtxt(class_path, comments="#")
    class_k = class_data[:, 0]
    class_d_m = class_data[:, 4] if model == "zero" else class_data[:, 5]
    k = camb["sparse_k_h_per_Mpc"]
    if k[0] < class_k[0] or k[-1] > class_k[-1]:
        raise ValueError(f"CLASS interpolation would extrapolate for {model}")
    class_aligned = np.interp(np.log(k), np.log(class_k), class_d_m)
    sync = camb["sparse_class_signed_synchronous"]
    comoving = camb["sparse_class_signed_comoving"]
    rows = []
    for index, k_value in enumerate(k):
        class_value = float(class_aligned[index])
        sync_value = float(sync[index])
        comoving_value = float(comoving[index])
        rows.append({
            "index": index,
            "k_h_per_Mpc": float(k_value),
            "class_d_m": class_value,
            "camb_synchronous_in_class_normalization": sync_value,
            "camb_comoving_in_class_normalization": comoving_value,
            "gauge_correction_in_class_normalization": comoving_value - sync_value,
            "sync_over_class_minus_1": sync_value / class_value - 1.0 if class_value != 0.0 else None,
            "comoving_over_class_minus_1": comoving_value / class_value - 1.0 if class_value != 0.0 else None,
            "sync_power_over_class_power": (sync_value / class_value) ** 2 if class_value != 0.0 else None,
            "comoving_power_over_class_power": (comoving_value / class_value) ** 2 if class_value != 0.0 else None,
            "class_and_comoving_same_sign": bool(class_value * comoving_value > 0.0),
        })
    records[model] = {
        "rows": rows,
        "sync_over_class": signed_error_summary(class_aligned, sync),
        "comoving_over_class": signed_error_summary(class_aligned, comoving),
        "comoving_recovered_over_direct_full": run_summary["comoving_recovered_over_direct_full"],
        "range_diagnostics": run_summary["range_diagnostics"],
        "symbolic_check": run_summary["symbolic_check"],
        "class_interpolation": "signed d_m linearly interpolated in ln(k), without log-abs, smoothing, or extrapolation",
        "normalization": "CAMB signed transfers multiplied by -1 to match CLASS initial curvature +1; power unchanged",
    }
    raw_hashes[model] = {
        "camb_gauge_transform_refined": sha256(camb_path),
        "camb_gauge_refined_run_summary": sha256(run_summary_path),
        "class_native_transfer": sha256(class_path),
    }

summary = {
    "status": "computed_refined_gauge_map_and_sign_normalized_sparse_crosscode_comparison",
    "records": records,
    "raw_output_sha256": raw_hashes,
    "analysis_runner_sha256": sha256(Path(__file__).resolve()),
    "validation": {
        "models": ["zero", "baseline"],
        "sparse_points_per_model": 9,
        "all_values_finite": all(
            np.isfinite([value for key, value in row.items() if key not in ["index", "class_and_comoving_same_sign"] and value is not None]).all()
            for model in records.values()
            for row in model["rows"]
        ),
        "class_sign_applied": True,
        "direct_native_velocity_used": True,
        "whole_spectrum_convergence_claimed": False,
        "observational_likelihood_or_covariance_included": False,
    },
    "boundaries": [
        "The sign mapping fixes initial-curvature normalization, not a physical phase or an implementation residual.",
        "The direct native velocity avoids Newtonian-output cancellation; recovered-velocity diagnostics remain visible by k range.",
        "Sparse CLASS comparison and full-grid transformation do not establish full-spectrum convergence or model viability.",
        "No joint BBN, nonlinear calculation, parameter search, or model-family exclusion.",
    ],
}
path = OUT / "gauge-refined-crosscode-summary.json"
path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=2))
