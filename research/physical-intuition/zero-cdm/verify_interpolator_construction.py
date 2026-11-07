"""Independently verify hashes and highest-band interpolator-construction results."""

import hashlib
import json
from pathlib import Path

import numpy as np

from pk_band_statistics import (
    gaussian_smooth_log10_spectrum,
    log_bandpower,
    resample_log_spectrum,
)


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
CAMB_ROOT = REPO / ".tmp/camb-runs/ultra"
CLASS_ROOT = REPO / ".tmp/class_public/convergence/integral"
METHODS = {"raw": None, "smooth_0.05dex": 0.05, "smooth_0.10dex": 0.10}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def require_close(actual, expected, label):
    if not np.allclose(actual, expected, rtol=1.0e-10, atol=1.0e-14):
        raise ValueError(f"{label}: {actual} != {expected}")


def load_raw_series_independently():
    series = {name: {} for name in [
        "native_reconstruction", "camb_power_nodes", "log_cubic", "linear_cubic",
        "power_nodes_log_linear", "previous_frozen_log_linear", "class_integral",
    ]}
    for model in ["zero", "baseline"]:
        data = np.load(CAMB_ROOT / model / "interpolator-construction.npz")
        k = data["aligned_k_h_per_Mpc"]
        series["native_reconstruction"][model] = (k, data["aligned_native_reconstructed"])
        series["camb_power_nodes"][model] = (data["k_nodes_h_per_Mpc"], data["p_nodes"])
        for name, key in [
            ("log_cubic", "aligned_log_cubic"),
            ("linear_cubic", "aligned_linear_cubic"),
            ("power_nodes_log_linear", "aligned_power_nodes_log_linear"),
            ("previous_frozen_log_linear", "aligned_previous_frozen_log_linear"),
        ]:
            series[name][model] = (k, data[key])
    for model, prefix in [("zero", "zero-cdm-integral00"), ("baseline", "baseline-lcdm-integral00")]:
        data = np.loadtxt(CLASS_ROOT / f"{prefix}_pk.dat", comments="#")
        series["class_integral"][model] = (data[:, 0], data[:, 1])
    return series


summary = json.loads((OUT / "interpolator-construction-summary.json").read_text(encoding="utf-8"))
protocol = json.loads((OUT / "interpolator-construction-protocol.json").read_text(encoding="utf-8"))
for filename, expected in protocol["input_sha256"].items():
    path = Path(filename)
    if not path.is_absolute():
        path = REPO / filename
    if sha256(path) != expected:
        raise ValueError(f"protocol input hash mismatch: {path}")
for key, relative in {
    "camb_zero": ".tmp/camb-runs/ultra/zero/interpolator-construction.npz",
    "camb_baseline": ".tmp/camb-runs/ultra/baseline/interpolator-construction.npz",
    "class_zero": ".tmp/class_public/convergence/integral/zero-cdm-integral00_pk.dat",
    "class_baseline": ".tmp/class_public/convergence/integral/baseline-lcdm-integral00_pk.dat",
}.items():
    if summary["raw_output_sha256"][key] != sha256(REPO / relative):
        raise ValueError(f"raw output hash mismatch: {key}")

series = load_raw_series_independently()
log10_grid = np.linspace(np.log10(0.005), np.log10(summary["common_grid"]["actual_maximum_k_h_per_Mpc"]), 2603)
highest = summary["band_statistics"][-1]
for name, models in series.items():
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
            ratios[0] / ratios[1],
            highest["sources"][name][method]["zero_over_baseline"],
            f"ratio {name} {method}",
        )

print(json.dumps({
    "verification": "passed",
    "checked_sources": len(series),
    "checked_methods": len(METHODS),
    "highest_band": [0.64, 1.28],
    "ratios": {
        name: highest["sources"][name]["smooth_0.05dex"]["zero_over_baseline"]
        for name in series
    },
    "signed_logs": highest["signed_log_comparisons"]["smooth_0.05dex"],
}, ensure_ascii=False, indent=2))
