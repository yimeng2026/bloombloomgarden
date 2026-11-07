"""Independently verify paired kmax-limited accuracy outputs and common metrics."""

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
METHODS = {"raw": None, "smooth_0.05dex": 0.05, "smooth_0.10dex": 0.10}
TRANSFER_INDEX = {"delta_cdm": 1, "delta_baryon": 2, "delta_tot": 6, "v_baryon_cdm": 12}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def require_close(actual, expected, label):
    if not np.allclose(actual, expected, rtol=1.0e-10, atol=1.0e-14):
        raise ValueError(f"{label}: {actual} != {expected}")


summary = json.loads((OUT / "kmax-limited-summary.json").read_text(encoding="utf-8"))
protocol = json.loads((OUT / "kmax-limited-protocol.json").read_text(encoding="utf-8"))
for filename, expected in protocol["input_sha256"].items():
    path = Path(filename)
    if not path.is_absolute():
        path = REPO / filename
    if sha256(path) != expected:
        raise ValueError(f"protocol input hash mismatch: {path}")

signed_series = {"class_hyrec": {}, "camb_ultra": {}, "camb_k800": {}}
power_series = {"class_hyrec": {}, "class_recfast": {}, "camb_ultra": {}, "camb_k800": {}}
for model, transfer_name, hyrec_name, recfast_name in [
    ("zero", "zero-cdm-transfer-dense00_00", "zero-cdm-integral00", "zero-cdm-recfast00"),
    ("baseline", "baseline-lcdm-transfer-dense00_00", "baseline-lcdm-integral00", "baseline-lcdm-recfast00"),
]:
    transfer_path = CLASS_ROOT / "transfer" / f"{transfer_name}_tk.dat"
    hyrec_path = CLASS_ROOT / "integral" / f"{hyrec_name}_pk.dat"
    recfast_path = CLASS_ROOT / "recfast" / f"{recfast_name}_pk.dat"
    for key, path in [
        (f"class_transfer_{model}", transfer_path),
        (f"class_hyrec_{model}", hyrec_path),
        (f"class_recfast_{model}", recfast_path),
    ]:
        if summary["raw_output_sha256"][key] != sha256(path):
            raise ValueError(f"raw hash mismatch: {key}")
    transfer = np.loadtxt(transfer_path, comments="#")
    signed_series["class_hyrec"][model] = (transfer[:, 0], transfer[:, 4] if model == "zero" else transfer[:, 5])
    hyrec = np.loadtxt(hyrec_path, comments="#")
    recfast = np.loadtxt(recfast_path, comments="#")
    power_series["class_hyrec"][model] = (hyrec[:, 0], hyrec[:, 1])
    power_series["class_recfast"][model] = (recfast[:, 0], recfast[:, 1])
    for case, path in [
        ("camb_ultra", CAMB_ROOT / "ultra" / model / "phase-comoving.npz"),
        ("camb_k800", CAMB_ROOT / "single-variable" / "k800" / model / "single-variable.npz"),
    ]:
        if summary["raw_output_sha256"][f"{case}_{model}"] != sha256(path):
            raise ValueError(f"raw hash mismatch: {case} {model}")
        data = np.load(path)
        signed_series[case][model] = (data["k_h_per_Mpc"], data["comoving_direct"])
        power_series[case][model] = (data["k_h_per_Mpc"], data["comoving_power"])

for case, expected_boost in [("reference4", 4.0), ("accuracy8", 8.0)]:
    name = f"camb_{case}"
    signed_series[name] = {}
    power_series[name] = {}
    for model in ["zero", "baseline"]:
        path = CAMB_ROOT / "kmax-limited" / case / model / "kmax-limited.npz"
        run_summary_path = CAMB_ROOT / "kmax-limited" / case / model / "summary.json"
        if summary["raw_output_sha256"][f"{name}_{model}"] != sha256(path):
            raise ValueError(f"case hash mismatch: {case} {model}")
        run_summary = json.loads(run_summary_path.read_text(encoding="utf-8"))
        actual = run_summary["actual_parameters"]
        for key, value in [
            ("AccuracyBoost", expected_boost), ("lSampleBoost", 4.0),
            ("lAccuracyBoost", 4.0), ("k_per_logint", 400), ("kmax", 1.28), ("OnlyTransfers", True),
        ]:
            if actual[key] != value:
                raise ValueError(f"unexpected kmax-limited setting: {case} {model} {key}={actual[key]}")
        data = np.load(path)
        q = data["q_Mpc_inv"]
        transfer_data = data["transfer_data"]
        direct_v_b = q**2 * transfer_data[TRANSFER_INDEX["v_baryon_cdm"], :, 0]
        delta_c = q**2 * transfer_data[TRANSFER_INDEX["delta_cdm"], :, 0]
        delta_b = q**2 * transfer_data[TRANSFER_INDEX["delta_baryon"], :, 0]
        comoving = class_comoving_matter_density(
            delta_c, delta_b, np.zeros_like(direct_v_b), direct_v_b,
            float(data["rho_c"]), float(data["rho_b"]), float(data["conformal_h"]), q,
        )
        np.testing.assert_array_equal(comoving, data["comoving_direct"])
        config = run_summary["configuration"]
        k, power = power_from_transfer(
            q, comoving, config["As"], config["ns"], config["pivot_scalar"], float(data["h"])
        )
        np.testing.assert_array_equal(k, data["k_h_per_Mpc"])
        np.testing.assert_array_equal(power, data["comoving_power"])
        signed_series[name][model] = (k, comoving)
        power_series[name][model] = (k, power)

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
    for key, reference_name, candidate_name in [
        ("class_to_accuracy8", "class_hyrec", "camb_accuracy8"),
        ("full_ultra_to_reference4", "camb_ultra", "camb_reference4"),
        ("reference4_to_accuracy8", "camb_reference4", "camb_accuracy8"),
        ("reference4_to_k800", "camb_reference4", "camb_k800"),
    ]:
        distances = directed_nearest_log_distances(
            grid_crossings[reference_name][model], grid_crossings[candidate_name][model]
        )
        record = summary["crossing_comparisons"][model][key]
        if distances.size:
            require_close(record["median_abs_ln_distance"], np.median(distances), f"{key} median {model}")
            require_close(record["max_abs_ln_distance"], np.max(distances), f"{key} max {model}")
        elif record["median_abs_ln_distance"] is not None or record["max_abs_ln_distance"] is not None:
            raise ValueError(f"expected empty crossing distances: {key} {model}")

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
