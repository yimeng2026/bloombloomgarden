"""Independently verify sparse gauge-transformation arrays and CLASS alignment."""

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


summary = json.loads((OUT / "gauge-transform-summary.json").read_text(encoding="utf-8"))
protocol = json.loads((OUT / "gauge-transform-protocol.json").read_text(encoding="utf-8"))
for filename, expected in protocol["input_sha256"].items():
    path = Path(filename)
    if not path.is_absolute():
        path = REPO / filename
    if sha256(path) != expected:
        raise ValueError(f"protocol input hash mismatch: {path}")

results = {}
for model, filename in CLASS_FILES.items():
    camb_path = CAMB_ROOT / model / "gauge-transform.npz"
    class_path = CLASS_ROOT / filename
    require_equal(summary["raw_output_sha256"][model]["camb_gauge_transform"], sha256(camb_path), f"{model} CAMB hash")
    require_equal(summary["raw_output_sha256"][model]["class_native_transfer"], sha256(class_path), f"{model} CLASS hash")
    camb = np.load(camb_path)
    manual = class_comoving_matter_density(
        camb["time_delta_c"],
        camb["time_delta_b"],
        camb["v_c"],
        camb["v_b"],
        float(camb["rho_c"]),
        float(camb["rho_b"]),
        camb["conformal_h"],
        camb["q_Mpc_inv"],
    )
    np.testing.assert_array_equal(manual, camb["comoving_manual"])
    rho_m = float(camb["rho_c"]) + float(camb["rho_b"])
    delta_m = (float(camb["rho_c"]) * camb["time_delta_c"] + float(camb["rho_b"]) * camb["time_delta_b"]) / rho_m
    np.testing.assert_array_equal(delta_m, camb["time_delta_m"])
    for key in ["manual_over_symbolic_class", "manual_over_symbolic_frame"]:
        reference_key = "comoving_symbolic_class" if key.endswith("class") else "comoving_symbolic_frame"
        expected = signed_error_summary(camb[reference_key], manual)
        require_equal(summary["records"][model][key], expected, f"{model} {key}")
    class_data = np.loadtxt(class_path, comments="#")
    class_d_m = class_data[:, 4] if model == "zero" else class_data[:, 5]
    class_aligned = np.interp(np.log(camb["k_h_per_Mpc"]), np.log(class_data[:, 0]), class_d_m)
    for index, row in enumerate(summary["records"][model]["rows"]):
        require_equal(row["class_d_m"], float(class_aligned[index]), f"{model} CLASS row {index}")
        require_equal(row["camb_comoving_manual"], float(manual[index]), f"{model} manual row {index}")
    require_equal(
        summary["records"][model]["sync_over_class"],
        signed_error_summary(class_aligned, camb["native_delta_m"]),
        f"{model} sync/CLASS",
    )
    require_equal(
        summary["records"][model]["comoving_over_class"],
        signed_error_summary(class_aligned, manual),
        f"{model} comoving/CLASS",
    )
    results[model] = {
        "manual_over_symbolic_class": summary["records"][model]["manual_over_symbolic_class"],
        "manual_over_symbolic_frame": summary["records"][model]["manual_over_symbolic_frame"],
        "sync_over_class_max_abs_fraction": summary["records"][model]["sync_over_class"]["max_abs_fraction"],
        "comoving_over_class_max_abs_fraction": summary["records"][model]["comoving_over_class"]["max_abs_fraction"],
    }
print(json.dumps({"verification": "passed", "records": results}, ensure_ascii=False, indent=2))
