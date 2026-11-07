"""Verify same-run power hashes and independently recompute the highest band."""

import hashlib
import json
from pathlib import Path

import numpy as np

from pk_band_statistics import gaussian_smooth_log10_spectrum, log_bandpower, resample_log_spectrum, signed_log_ratio

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


summary = json.loads((OUT / "same-run-power-summary.json").read_text(encoding="utf-8"))
protocol = json.loads((OUT / "same-run-transfer-protocol.json").read_text(encoding="utf-8"))
for filename, expected in protocol["input_sha256"].items():
    if sha256(OUT / filename) != expected:
        raise ValueError(f"protocol input hash mismatch: {filename}")
for key, path in {
    "camb_zero": CAMB_ROOT / "zero/transfer-same-run.npz",
    "camb_baseline": CAMB_ROOT / "baseline/transfer-same-run.npz",
    "class_zero": CLASS_ROOT / "zero-cdm-integral00_pk.dat",
    "class_baseline": CLASS_ROOT / "baseline-lcdm-integral00_pk.dat",
}.items():
    if summary["raw_output_sha256"][key] != sha256(path):
        raise ValueError(f"raw output hash mismatch: {key}")

camb = {model: np.load(CAMB_ROOT / model / "transfer-same-run.npz") for model in ["zero", "baseline"]}
class_data = {
    model: np.loadtxt(CLASS_ROOT / f"{prefix}_pk.dat", comments="#")
    for model, prefix in [("zero", "zero-cdm-integral00"), ("baseline", "baseline-lcdm-integral00")]
}
series = {}
for model in ["zero", "baseline"]:
    existing = np.load(CAMB_ROOT / model / "spectra.npz")
    k_h = camb[model]["k_h_per_Mpc"]
    mask = (
        np.isfinite(camb[model]["same_run_p"])
        & (k_h >= existing["pk_k_h_per_Mpc"][0])
        & (k_h <= existing["pk_k_h_per_Mpc"][-1])
    )
    for name, key in [
        ("native_reconstruction", "native_reconstructed_p"),
        ("same_run", "same_run_p"),
        ("previous_frozen", "frozen_p_interpolated"),
    ]:
        values = camb[model][key] if name == "previous_frozen" else camb[model][key][mask]
        series.setdefault(name, {})[model] = (k_h[mask], values)
series["class_integral"] = {
    model: (class_data[model][:, 0], class_data[model][:, 1]) for model in ["zero", "baseline"]
}

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
        require_close(ratios[0] / ratios[1], highest["sources"][name][method]["zero_over_baseline"], f"ratio {name} {method}")

expected = summary["robustness"]["previous_frozen_over_native"]["smooth_0.05dex"]
require_close(
    abs(signed_log_ratio(
        highest["sources"]["previous_frozen"]["smooth_0.05dex"]["zero_over_baseline"],
        highest["sources"]["native_reconstruction"]["smooth_0.05dex"]["zero_over_baseline"],
    )),
    expected["max_abs_ln_difference_all_bands"],
    "previous frozen/native high-band log difference",
)
require_close(
    abs(signed_log_ratio(
        highest["sources"]["same_run"]["smooth_0.05dex"]["zero_over_baseline"],
        highest["sources"]["class_integral"]["smooth_0.05dex"]["zero_over_baseline"],
    )),
    summary["robustness"]["same_run_over_class"]["smooth_0.05dex"]["max_abs_ln_difference_all_bands"],
    "same-run/CLASS high-band log difference",
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
    "previous_frozen_over_native_ln": expected["max_abs_ln_difference_all_bands"],
    "same_run_over_class_ln": summary["robustness"]["same_run_over_class"]["smooth_0.05dex"]["max_abs_ln_difference_all_bands"],
}, ensure_ascii=False, indent=2))
