"""Verify matched-grid recombination bands and endpoint-sensitivity records."""

import hashlib
import json
from pathlib import Path

import numpy as np

from pk_band_statistics import (
    gaussian_smooth_log10_spectrum,
    log_bandpower,
    resample_log_spectrum,
    signed_log_ratio,
)


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
CAMB_ROOT = REPO / ".tmp/camb-runs/ultra"
CLASS_ROOT = REPO / ".tmp/class_public/convergence"
METHODS = {"raw": None, "smooth_0.05dex": 0.05, "smooth_0.10dex": 0.10}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def require_close(actual, expected, label):
    if not np.allclose(actual, expected, rtol=1.0e-10, atol=1.0e-14):
        raise ValueError(f"{label}: {actual} != {expected}")


summary = json.loads((OUT / "recombination-matched-bandpower-summary.json").read_text(encoding="utf-8"))
endpoint = json.loads((OUT / "recombination-bandpower-summary.json").read_text(encoding="utf-8"))
protocol = json.loads((OUT / "recombination-matched-protocol.json").read_text(encoding="utf-8"))
for filename, expected in protocol["input_sha256"].items():
    path = Path(filename)
    if not path.is_absolute():
        path = REPO / filename
    if sha256(path) != expected:
        raise ValueError(f"protocol input hash mismatch: {path}")
for key, expected in endpoint["raw_output_sha256"].items():
    if summary["raw_output_sha256"][key] != expected:
        raise ValueError(f"raw hash mismatch: {key}")
if summary["raw_output_sha256"]["endpoint_sensitivity_summary"] != sha256(OUT / "recombination-bandpower-summary.json"):
    raise ValueError("endpoint sensitivity summary hash mismatch")

series = {name: {} for name in [
    "class_hyrec", "class_recfast", "camb_comoving_recfast", "camb_synchronous_recfast"
]}
for model, hyrec_prefix, recfast_prefix in [
    ("zero", "zero-cdm-integral00", "zero-cdm-recfast00"),
    ("baseline", "baseline-lcdm-integral00", "baseline-lcdm-recfast00"),
]:
    hyrec = np.loadtxt(CLASS_ROOT / "integral" / f"{hyrec_prefix}_pk.dat", comments="#")
    recfast = np.loadtxt(CLASS_ROOT / "recfast" / f"{recfast_prefix}_pk.dat", comments="#")
    series["class_hyrec"][model] = (hyrec[:, 0], hyrec[:, 1])
    series["class_recfast"][model] = (recfast[:, 0], recfast[:, 1])
    camb = np.load(CAMB_ROOT / model / "comoving-power.npz")
    series["camb_comoving_recfast"][model] = (camb["k_h_per_Mpc"], camb["comoving_direct_p"])
    series["camb_synchronous_recfast"][model] = (camb["k_h_per_Mpc"], camb["synchronous_native_p"])

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
    expected_ln = signed_log_ratio(
        highest["sources"][name]["smooth_0.05dex"]["zero_over_baseline"],
        endpoint["band_statistics"][-1]["sources"][name]["smooth_0.05dex"]["zero_over_baseline"],
    )
    require_close(expected_ln, summary["endpoint_sensitivity"]["highest_band_ln_matched_over_endpoint"][name], f"endpoint {name}")
print(json.dumps({
    "verification": "passed",
    "checked_sources": len(series),
    "checked_methods": len(METHODS),
    "highest_band": [0.64, 1.28],
    "ratios": {
        name: highest["sources"][name]["smooth_0.05dex"]["zero_over_baseline"] for name in series
    },
    "signed_logs": highest["signed_log_comparisons"]["smooth_0.05dex"],
    "endpoint_sensitivity_ln": summary["endpoint_sensitivity"]["highest_band_ln_matched_over_endpoint"],
}, ensure_ascii=False, indent=2))
