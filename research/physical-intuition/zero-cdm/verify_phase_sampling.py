"""Independently verify level-wise comoving transfers, crossings, and highest bands."""

import hashlib
import json
from pathlib import Path

import numpy as np

from gauge_transform import class_comoving_matter_density
from pk_band_statistics import gaussian_smooth_log10_spectrum, log_bandpower, resample_log_spectrum
from signed_transfer_statistics import (
    directed_nearest_log_distances,
    power_from_transfer,
    resample_signed,
    signed_zero_crossings,
)


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
CAMB_ROOT = REPO / ".tmp/camb-runs"
CLASS_ROOT = REPO / ".tmp/class_public/convergence"
LEVELS = ["fiducial", "high", "ultra"]
METHODS = {"raw": None, "smooth_0.05dex": 0.05, "smooth_0.10dex": 0.10}
TRANSFER_INDEX = {"delta_cdm": 1, "delta_baryon": 2, "delta_tot": 6, "v_baryon_cdm": 12}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def require_close(actual, expected, label):
    if not np.allclose(actual, expected, rtol=1.0e-10, atol=1.0e-14):
        raise ValueError(f"{label}: {actual} != {expected}")


summary = json.loads((OUT / "phase-sampling-summary.json").read_text(encoding="utf-8"))
protocol = json.loads((OUT / "phase-sampling-protocol.json").read_text(encoding="utf-8"))
for filename, expected in protocol["input_sha256"].items():
    path = Path(filename)
    if not path.is_absolute():
        path = REPO / filename
    if sha256(path) != expected:
        raise ValueError(f"protocol input hash mismatch: {path}")

signed_series = {"class_hyrec": {}}
power_series = {"class_hyrec": {}, "class_recfast": {}}
for model, prefix, recfast_prefix in [
    ("zero", "zero-cdm-transfer-dense00_00", "zero-cdm-recfast00"),
    ("baseline", "baseline-lcdm-transfer-dense00_00", "baseline-lcdm-recfast00"),
]:
    transfer_path = CLASS_ROOT / "transfer" / f"{prefix}_tk.dat"
    pk_name = "zero-cdm-integral00_pk.dat" if model == "zero" else "baseline-lcdm-integral00_pk.dat"
    pk_path = CLASS_ROOT / "integral" / pk_name
    recfast_path = CLASS_ROOT / "recfast" / f"{recfast_prefix}_pk.dat"
    for key, path in [
        (f"class_hyrec_transfer_{model}", transfer_path),
        (f"class_hyrec_power_{model}", pk_path),
        (f"class_recfast_power_{model}", recfast_path),
    ]:
        if summary["raw_output_sha256"][key] != sha256(path):
            raise ValueError(f"raw output hash mismatch: {key}")
    transfer = np.loadtxt(transfer_path, comments="#")
    signed_series["class_hyrec"][model] = (transfer[:, 0], transfer[:, 4] if model == "zero" else transfer[:, 5])
    hyrec = np.loadtxt(pk_path, comments="#")
    recfast = np.loadtxt(recfast_path, comments="#")
    power_series["class_hyrec"][model] = (hyrec[:, 0], hyrec[:, 1])
    power_series["class_recfast"][model] = (recfast[:, 0], recfast[:, 1])

for level in LEVELS:
    signed_series[f"camb_{level}"] = {}
    power_series[f"camb_{level}"] = {}
    for model in ["zero", "baseline"]:
        path = CAMB_ROOT / level / model / "phase-comoving.npz"
        if summary["raw_output_sha256"][f"camb_{level}_{model}"] != sha256(path):
            raise ValueError(f"phase output hash mismatch: {level} {model}")
        raw = np.load(CAMB_ROOT / level / model / "transfer.npz")
        config = json.loads((CAMB_ROOT / level / model / "summary.json").read_text(encoding="utf-8"))["configuration"]
        saved = np.load(path)
        q = raw["q_Mpc_inv"]
        direct_v_b = q**2 * raw["transfer_data"][TRANSFER_INDEX["v_baryon_cdm"], :, 0]
        delta_c = q**2 * raw["transfer_data"][TRANSFER_INDEX["delta_cdm"], :, 0]
        delta_b = q**2 * raw["transfer_data"][TRANSFER_INDEX["delta_baryon"], :, 0]
        comoving = class_comoving_matter_density(
            delta_c, delta_b, np.zeros_like(direct_v_b), direct_v_b,
            config["omch2"], config["ombh2"], config["H0"] / 299792.458, q,
        )
        np.testing.assert_array_equal(comoving, saved["comoving_direct"])
        k, power = power_from_transfer(
            q, comoving, config["As"], config["ns"], config["pivot_scalar"], float(raw["h"])
        )
        np.testing.assert_array_equal(k, saved["k_h_per_Mpc"])
        np.testing.assert_array_equal(power, saved["comoving_power"])
        signed_series[f"camb_{level}"][model] = (k, comoving)
        power_series[f"camb_{level}"][model] = (k, power)

log10_signed_grid = np.linspace(np.log10(0.01), np.log10(1.28), 4096)
k_signed_grid = 10.0**log10_signed_grid
grid_crossings = {}
for name, models in signed_series.items():
    grid_crossings[name] = {}
    for model, (k, values) in models.items():
        selected = (k >= 0.01) & (k <= 1.28)
        native = signed_zero_crossings(k[selected], values[selected])
        grid = signed_zero_crossings(k_signed_grid, resample_signed(k, values, log10_signed_grid))
        record = summary["crossing_records"][name][model]
        if record["native_zero_crossing_count"] != native.size or record["common_grid_zero_crossing_count"] != grid.size:
            raise ValueError(f"crossing count mismatch: {name} {model}")
        require_close(record["native_zero_crossings_h_per_Mpc"], native, f"native crossings {name} {model}")
        require_close(record["common_grid_zero_crossings_h_per_Mpc"], grid, f"grid crossings {name} {model}")
        grid_crossings[name][model] = grid

for model in ["zero", "baseline"]:
    comparisons = {"class_hyrec": grid_crossings["class_hyrec"][model]}
    for level in LEVELS:
        distances = directed_nearest_log_distances(
            comparisons["class_hyrec"], grid_crossings[f"camb_{level}"][model]
        )
        record = summary["crossing_comparisons"][model][f"class_to_camb_{level}"]
        if distances.size:
            require_close(record["median_abs_ln_distance"], np.median(distances), f"class/{level} median {model}")
            require_close(record["max_abs_ln_distance"], np.max(distances), f"class/{level} max {model}")
        elif record["median_abs_ln_distance"] is not None or record["max_abs_ln_distance"] is not None:
            raise ValueError(f"expected empty crossing distances: class/{level} {model}")

log10_grid = np.linspace(np.log10(0.005), np.log10(summary["band_grid"]["actual_maximum_k_h_per_Mpc"]), 2603)
highest = summary["band_statistics"][-1]
for name, models in power_series.items():
    for method, sigma in METHODS.items():
        ratios = []
        for model in ["zero", "baseline"]:
            k, power = models[model]
            log_power = resample_log_spectrum(k, power, log10_grid)
            if sigma is not None:
                log_power = gaussian_smooth_log10_spectrum(log10_grid, log_power, sigma)
            bandpower = log_bandpower(10.0**log10_grid, np.exp(log_power), 0.64, 1.28)
            expected_key = "zero_bandpower" if model == "zero" else "baseline_bandpower"
            require_close(bandpower, highest["sources"][name][method][expected_key], f"{name} {method} {model}")
            ratios.append(bandpower)
        require_close(
            ratios[0] / ratios[1], highest["sources"][name][method]["zero_over_baseline"],
            f"ratio {name} {method}",
        )
print(json.dumps({
    "verification": "passed",
    "checked_sources": len(power_series),
    "checked_methods": len(METHODS),
    "crossing_counts_zero": {
        name: summary["crossing_records"][name]["zero"]["common_grid_zero_crossing_count"]
        for name in signed_series
    },
    "highest_band": [0.64, 1.28],
    "ratios": {
        name: highest["sources"][name]["smooth_0.05dex"]["zero_over_baseline"]
        for name in power_series
    },
    "signed_logs": highest["signed_log_comparisons"]["smooth_0.05dex"],
}, ensure_ascii=False, indent=2))
