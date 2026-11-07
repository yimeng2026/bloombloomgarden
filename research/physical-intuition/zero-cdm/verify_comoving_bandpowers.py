"""Independently verify comoving power reconstruction and highest-band statistics."""

import hashlib
import json
from pathlib import Path

import numpy as np

from pk_band_statistics import gaussian_smooth_log10_spectrum, log_bandpower, resample_log_spectrum
from signed_transfer_statistics import power_from_transfer


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


summary = json.loads((OUT / "comoving-bandpower-summary.json").read_text(encoding="utf-8"))
protocol = json.loads((OUT / "comoving-bandpower-protocol.json").read_text(encoding="utf-8"))
for filename, expected in protocol["input_sha256"].items():
    path = Path(filename)
    if not path.is_absolute():
        path = REPO / filename
    if sha256(path) != expected:
        raise ValueError(f"protocol input hash mismatch: {path}")

series = {name: {} for name in [
    "comoving_direct", "comoving_recovered", "synchronous_native",
    "log_cubic", "previous_frozen_log_linear", "class_integral",
]}
for model in ["zero", "baseline"]:
    require_equal = summary["raw_output_sha256"][f"camb_{model}"]
    if require_equal != sha256(CAMB_ROOT / model / "comoving-power.npz"):
        raise ValueError(f"comoving power hash mismatch: {model}")
    if summary["raw_output_sha256"][f"camb_interpolator_{model}"] != sha256(
        CAMB_ROOT / model / "interpolator-construction.npz"
    ):
        raise ValueError(f"interpolator hash mismatch: {model}")
    refined = np.load(CAMB_ROOT / model / "gauge-transform-refined.npz")
    frozen = json.loads((CAMB_ROOT / model / "summary.json").read_text(encoding="utf-8"))["configuration"]
    saved = np.load(CAMB_ROOT / model / "comoving-power.npz")
    for name, transfer_key, power_key in [
        ("comoving_direct", "comoving_direct_v_b", "comoving_direct_p"),
        ("comoving_recovered", "comoving_recovered_v_b", "comoving_recovered_p"),
        ("synchronous_native", "native_delta_m", "synchronous_native_p"),
    ]:
        k, power = power_from_transfer(
            refined["q_Mpc_inv"], refined[transfer_key], frozen["As"], frozen["ns"],
            frozen["pivot_scalar"], frozen["H0"] / 100.0,
        )
        np.testing.assert_array_equal(k, saved["k_h_per_Mpc"])
        np.testing.assert_array_equal(power, saved[power_key])
        series[name][model] = (k, power)
    old = np.load(CAMB_ROOT / model / "interpolator-construction.npz")
    series["log_cubic"][model] = (old["aligned_k_h_per_Mpc"], old["aligned_log_cubic"])
    series["previous_frozen_log_linear"][model] = (
        old["aligned_k_h_per_Mpc"], old["aligned_previous_frozen_log_linear"]
    )
for model, prefix in [("zero", "zero-cdm-integral00"), ("baseline", "baseline-lcdm-integral00")]:
    path = CLASS_ROOT / f"{prefix}_pk.dat"
    if summary["raw_output_sha256"][f"class_{model}"] != sha256(path):
        raise ValueError(f"CLASS hash mismatch: {model}")
    data = np.loadtxt(path, comments="#")
    series["class_integral"][model] = (data[:, 0], data[:, 1])

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
            ratios[0] / ratios[1], highest["sources"][name][method]["zero_over_baseline"],
            f"ratio {name} {method}",
        )
print(json.dumps({
    "verification": "passed",
    "checked_sources": len(series),
    "checked_methods": len(METHODS),
    "highest_band": [0.64, 1.28],
    "ratios": {
        name: highest["sources"][name]["smooth_0.05dex"]["zero_over_baseline"] for name in series
    },
    "signed_logs": highest["signed_log_comparisons"]["smooth_0.05dex"],
}, ensure_ascii=False, indent=2))
