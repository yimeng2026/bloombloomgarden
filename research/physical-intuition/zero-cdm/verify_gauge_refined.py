"""Verify the refined direct-velocity map, sign convention, and CLASS rows."""

import hashlib
import json
from pathlib import Path

import numpy as np

from gauge_transform import class_comoving_matter_density, signed_error_summary


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


def require_equal(actual, expected, label):
    if actual != expected:
        raise ValueError(f"{label}: {actual} != {expected}")


summary = json.loads((OUT / "gauge-refined-crosscode-summary.json").read_text(encoding="utf-8"))
protocol = json.loads((OUT / "gauge-refined-protocol.json").read_text(encoding="utf-8"))
for filename, expected in protocol["input_sha256"].items():
    path = Path(filename)
    if not path.is_absolute():
        path = REPO / filename
    if sha256(path) != expected:
        raise ValueError(f"protocol input hash mismatch: {path}")

results = {}
for model, filename in CLASS_FILES.items():
    camb_path = CAMB_ROOT / model / "gauge-transform-refined.npz"
    run_summary_path = CAMB_ROOT / model / "gauge-transform-refined-summary.json"
    class_path = CLASS_ROOT / filename
    for key, path in [
        ("camb_gauge_transform_refined", camb_path),
        ("camb_gauge_refined_run_summary", run_summary_path),
        ("class_native_transfer", class_path),
    ]:
        require_equal(summary["raw_output_sha256"][model][key], sha256(path), f"{model} {key}")
    run_summary = json.loads(run_summary_path.read_text(encoding="utf-8"))
    for key in [
        "all_outputs_finite",
        "pressureless_symbolic_identity",
        "direct_native_velocity_used",
        "newtonian_subtraction_used_for_final_transform",
        "class_sign_applied_only_to_signed_crosscode_output",
        "zero_model_omch2_exactly_zero",
    ]:
        expected = False if key == "newtonian_subtraction_used_for_final_transform" else True
        require_equal(run_summary["validation"][key], expected, f"{model} {key}")
    camb = np.load(camb_path)
    direct = class_comoving_matter_density(
        camb["delta_c"], camb["delta_b"], np.zeros_like(camb["direct_v_baryon_cdm"]),
        camb["direct_v_baryon_cdm"], float(camb["rho_c"]), float(camb["rho_b"]),
        float(camb["conformal_h"]), camb["q_Mpc_inv"],
    )
    np.testing.assert_array_equal(direct, camb["comoving_direct_v_b"])
    np.testing.assert_array_equal(-direct, camb["class_signed_comoving"])
    np.testing.assert_array_equal(-camb["native_delta_m"], camb["class_signed_synchronous"])
    require_equal(
        summary["records"][model]["comoving_recovered_over_direct_full"],
        signed_error_summary(direct, camb["comoving_recovered_v_b"]),
        f"{model} recovered/direct comoving",
    )
    class_data = np.loadtxt(class_path, comments="#")
    class_d_m = class_data[:, 4] if model == "zero" else class_data[:, 5]
    k = camb["sparse_k_h_per_Mpc"]
    class_aligned = np.interp(np.log(k), np.log(class_data[:, 0]), class_d_m)
    indices = camb["native_indices"]
    for index, row in enumerate(summary["records"][model]["rows"]):
        require_equal(row["class_d_m"], float(class_aligned[index]), f"{model} CLASS row {index}")
        require_equal(row["camb_comoving_in_class_normalization"], float(-direct[indices[index]]), f"{model} row {index}")
    require_equal(
        summary["records"][model]["sync_over_class"],
        signed_error_summary(class_aligned, -camb["native_delta_m"][indices]),
        f"{model} sync/CLASS",
    )
    require_equal(
        summary["records"][model]["comoving_over_class"],
        signed_error_summary(class_aligned, -direct[indices]),
        f"{model} comoving/CLASS",
    )
    fractions = np.array([row["comoving_over_class_minus_1"] for row in summary["records"][model]["rows"]])
    results[model] = {
        "native_points": int(direct.size),
        "max_abs_comoving_over_class_all_sparse": float(np.max(np.abs(fractions))),
        "max_abs_comoving_over_class_k_le_0.01": float(np.max(np.abs(fractions[k <= 0.0101]))),
        "comoving_recovered_over_direct_max_abs_difference": summary["records"][model]["comoving_recovered_over_direct_full"]["max_abs_difference"],
    }
print(json.dumps({"verification": "passed", "records": results}, ensure_ascii=False, indent=2))
