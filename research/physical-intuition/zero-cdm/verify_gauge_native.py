"""Independently verify native velocity recovery, comoving density, and CLASS rows."""

import hashlib
import json
from pathlib import Path

import numpy as np

from gauge_transform import (
    class_comoving_matter_density,
    signed_error_summary,
    synchronous_baryon_velocity_from_newtonian,
)


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


summary = json.loads((OUT / "gauge-native-crosscode-summary.json").read_text(encoding="utf-8"))
protocol = json.loads((OUT / "gauge-transform-native-protocol.json").read_text(encoding="utf-8"))
for filename, expected in protocol["input_sha256"].items():
    path = Path(filename)
    if not path.is_absolute():
        path = REPO / filename
    if sha256(path) != expected:
        raise ValueError(f"protocol input hash mismatch: {path}")

results = {}
for model, filename in CLASS_FILES.items():
    camb_path = CAMB_ROOT / model / "gauge-transform-native.npz"
    class_path = CLASS_ROOT / filename
    require_equal(summary["raw_output_sha256"][model]["camb_gauge_transform_native"], sha256(camb_path), f"{model} CAMB hash")
    require_equal(summary["raw_output_sha256"][model]["class_native_transfer"], sha256(class_path), f"{model} CLASS hash")
    run_summary = json.loads((CAMB_ROOT / model / "gauge-transform-native-summary.json").read_text(encoding="utf-8"))
    for key in [
        "all_outputs_finite",
        "symbolic_frame_expression_identical_to_class",
        "zero_model_omch2_exactly_zero",
        "weighted_density_within_2e-5",
        "recovered_velocity_within_2e-5",
        "full_native_grid_transformed",
    ]:
        require_equal(run_summary["validation"][key], True, f"{model} {key}")
    camb = np.load(camb_path)
    v_b = synchronous_baryon_velocity_from_newtonian(
        camb["v_newtonian_cdm"], camb["v_newtonian_baryon"], float(camb["conformal_h"]), camb["q_Mpc_inv"]
    )
    np.testing.assert_array_equal(v_b, camb["recovered_v_b"])
    comoving = class_comoving_matter_density(
        camb["delta_c"], camb["delta_b"], camb["synchronous_v_c"], v_b,
        float(camb["rho_c"]), float(camb["rho_b"]), float(camb["conformal_h"]), camb["q_Mpc_inv"],
    )
    np.testing.assert_array_equal(comoving, camb["comoving_manual"])
    weighted = (float(camb["rho_c"]) * camb["delta_c"] + float(camb["rho_b"]) * camb["delta_b"]) / (
        float(camb["rho_c"]) + float(camb["rho_b"])
    )
    np.testing.assert_array_equal(weighted, camb["weighted_delta_m"])
    require_equal(
        summary["records"][model]["weighted_delta_m_over_native_delta_tot"],
        signed_error_summary(camb["native_delta_m"], weighted),
        f"{model} weighted density",
    )
    require_equal(
        summary["records"][model]["recovered_v_b_over_direct_v_baryon_cdm"],
        signed_error_summary(camb["direct_v_baryon_cdm"], v_b),
        f"{model} recovered velocity",
    )
    class_data = np.loadtxt(class_path, comments="#")
    class_d_m = class_data[:, 4] if model == "zero" else class_data[:, 5]
    class_aligned = np.interp(np.log(camb["sparse_k_h_per_Mpc"]), np.log(class_data[:, 0]), class_d_m)
    indices = camb["native_indices"]
    for index, row in enumerate(summary["records"][model]["rows"]):
        require_equal(row["class_d_m"], float(class_aligned[index]), f"{model} CLASS row {index}")
        require_equal(row["camb_comoving"], float(comoving[indices[index]]), f"{model} comoving row {index}")
    require_equal(
        summary["records"][model]["sync_over_class"],
        signed_error_summary(class_aligned, camb["sparse_native_delta_m"]),
        f"{model} sync/CLASS",
    )
    require_equal(
        summary["records"][model]["comoving_over_class"],
        signed_error_summary(class_aligned, comoving[indices]),
        f"{model} comoving/CLASS",
    )
    results[model] = {
        "native_points": int(comoving.size),
        "recovered_velocity_max_abs_fraction": summary["records"][model]["recovered_v_b_over_direct_v_baryon_cdm"]["max_abs_fraction"],
        "weighted_density_max_abs_fraction": summary["records"][model]["weighted_delta_m_over_native_delta_tot"]["max_abs_fraction"],
        "sync_over_class_max_abs_fraction": summary["records"][model]["sync_over_class"]["max_abs_fraction"],
        "comoving_over_class_max_abs_fraction": summary["records"][model]["comoving_over_class"]["max_abs_fraction"],
    }
print(json.dumps({"verification": "passed", "records": results}, ensure_ascii=False, indent=2))
