"""Recompute fixed public bands after the explicit matter-comoving transformation."""

import hashlib
import json
from pathlib import Path

import matplotlib.pyplot as plt
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
CLASS_ROOT = REPO / ".tmp/class_public/convergence/integral"
BAND_EDGES = [0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28]
METHODS = {"raw": None, "smooth_0.05dex": 0.05, "smooth_0.10dex": 0.10}
SUMMARY_PATH = OUT / "comoving-bandpower-summary.json"
FIGURE_PATH = OUT / "comoving-bandpower-comparison.svg"
PREVIEW_PATH = REPO / ".tmp/comoving-bandpower-comparison.png"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


series = {name: {} for name in [
    "comoving_direct",
    "comoving_recovered",
    "synchronous_native",
    "log_cubic",
    "previous_frozen_log_linear",
    "class_integral",
]}
for model in ["zero", "baseline"]:
    new = np.load(CAMB_ROOT / model / "comoving-power.npz")
    k_new = new["k_h_per_Mpc"]
    for name, key in [
        ("comoving_direct", "comoving_direct_p"),
        ("comoving_recovered", "comoving_recovered_p"),
        ("synchronous_native", "synchronous_native_p"),
    ]:
        series[name][model] = (k_new, new[key])
    old = np.load(CAMB_ROOT / model / "interpolator-construction.npz")
    k_old = old["aligned_k_h_per_Mpc"]
    series["log_cubic"][model] = (k_old, old["aligned_log_cubic"])
    series["previous_frozen_log_linear"][model] = (
        k_old, old["aligned_previous_frozen_log_linear"]
    )
for model, prefix in [("zero", "zero-cdm-integral00"), ("baseline", "baseline-lcdm-integral00")]:
    data = np.loadtxt(CLASS_ROOT / f"{prefix}_pk.dat", comments="#")
    series["class_integral"][model] = (data[:, 0], data[:, 1])

grid_max = min(2.0, min(
    float(series[name][model][0][-1]) for name in series for model in ["zero", "baseline"]
))
log10_grid = np.linspace(np.log10(0.005), np.log10(grid_max), 2603)
common_curves = {}
for name, models in series.items():
    common_curves[name] = {}
    for model in ["zero", "baseline"]:
        k, power = models[model]
        log_power = resample_log_spectrum(k, power, log10_grid)
        common_curves[name][model] = {"raw": np.exp(log_power)}
        for method, sigma in METHODS.items():
            if sigma is not None:
                common_curves[name][model][method] = np.exp(
                    gaussian_smooth_log10_spectrum(log10_grid, log_power, sigma)
                )

bands = []
for lower, upper in zip(BAND_EDGES[:-1], BAND_EDGES[1:]):
    record = {
        "lower_k_h_per_Mpc": lower,
        "upper_k_h_per_Mpc": upper,
        "geometric_center_k_h_per_Mpc": float(np.sqrt(lower * upper)),
        "sources": {},
        "signed_log_comparisons": {},
    }
    for name in series:
        record["sources"][name] = {}
        for method in METHODS:
            zero = log_bandpower(10.0**log10_grid, common_curves[name]["zero"][method], lower, upper)
            baseline = log_bandpower(10.0**log10_grid, common_curves[name]["baseline"][method], lower, upper)
            record["sources"][name][method] = {
                "zero_bandpower": zero,
                "baseline_bandpower": baseline,
                "zero_over_baseline": zero / baseline,
            }
    for method in METHODS:
        ratios = {
            name: record["sources"][name][method]["zero_over_baseline"] for name in series
        }
        record["signed_log_comparisons"][method] = {
            "comoving_direct_over_synchronous_native": signed_log_ratio(
                ratios["comoving_direct"], ratios["synchronous_native"]
            ),
            "comoving_recovered_over_comoving_direct": signed_log_ratio(
                ratios["comoving_recovered"], ratios["comoving_direct"]
            ),
            "comoving_direct_over_log_cubic": signed_log_ratio(
                ratios["comoving_direct"], ratios["log_cubic"]
            ),
            "comoving_direct_over_class": signed_log_ratio(
                ratios["comoving_direct"], ratios["class_integral"]
            ),
            "comoving_recovered_over_class": signed_log_ratio(
                ratios["comoving_recovered"], ratios["class_integral"]
            ),
            "synchronous_native_over_class": signed_log_ratio(
                ratios["synchronous_native"], ratios["class_integral"]
            ),
            "log_cubic_over_class": signed_log_ratio(
                ratios["log_cubic"], ratios["class_integral"]
            ),
            "previous_frozen_log_linear_over_class": signed_log_ratio(
                ratios["previous_frozen_log_linear"], ratios["class_integral"]
            ),
        }
    bands.append(record)

comparison_names = list(bands[0]["signed_log_comparisons"]["raw"])
robustness = {}
for name in comparison_names:
    robustness[name] = {}
    for method in METHODS:
        rows = [
            {
                "band": [band["lower_k_h_per_Mpc"], band["upper_k_h_per_Mpc"]],
                "difference": abs(band["signed_log_comparisons"][method][name]),
            }
            for band in bands
        ]
        maximum = max(rows, key=lambda row: row["difference"])
        extreme = max(rows[4:], key=lambda row: row["difference"])
        robustness[name][method] = {
            "max_abs_ln_difference_all_bands": maximum["difference"],
            "max_abs_ln_difference_band": maximum["band"],
            "max_abs_ln_difference_extreme_bands": extreme["difference"],
            "max_abs_ln_difference_extreme_band": extreme["band"],
        }

summary = {
    "status": "computed_comoving_native_common_grid_bandpowers_not_observational_fit",
    "sources": {
        "comoving_direct": "power reconstructed from full native CLASS-compatible comoving density using direct synchronous v_b",
        "comoving_recovered": "same transformation using Newtonian-subtracted velocity, retained as a diagnostic",
        "synchronous_native": "power reconstructed from full native synchronous delta_tot",
        "log_cubic": "previous same-run CAMB log-cubic power on aligned native k",
        "previous_frozen_log_linear": "old 2500-point output after its second log-linear resampling",
        "class_integral": "CLASS integral pk.dat with default gauge-invariant comoving delta_m",
    },
    "common_grid": {
        "minimum_k_h_per_Mpc": 0.005,
        "requested_maximum_k_h_per_Mpc": 2.0,
        "actual_maximum_k_h_per_Mpc": float(grid_max),
        "point_count": 2603,
        "log10_step_dex": float(log10_grid[1] - log10_grid[0]),
        "source_specific_native_grids_used_for_crosscode": False,
    },
    "methods": {
        "raw": "log-log interpolation to the common grid, no smoothing",
        "smooth_0.05dex": "Gaussian smoothing of ln(P) with sigma=0.05 dex before band integration",
        "smooth_0.10dex": "Gaussian smoothing of ln(P) with sigma=0.10 dex before band integration",
    },
    "band_edges_h_per_Mpc": BAND_EDGES,
    "band_statistics": bands,
    "robustness": robustness,
    "validation": {
        "all_bandpowers_finite_and_positive": all(
            np.isfinite(methods["zero_bandpower"]) and methods["zero_bandpower"] > 0.0
            and np.isfinite(methods["baseline_bandpower"]) and methods["baseline_bandpower"] > 0.0
            for band in bands for source in band["sources"].values() for methods in source.values()
        ),
        "zero_cdm_exactly_zero": True,
        "observational_likelihood_or_covariance_included": False,
    },
    "raw_output_sha256": {
        f"camb_{model}": sha256(CAMB_ROOT / model / "comoving-power.npz") for model in ["zero", "baseline"]
    } | {
        f"camb_interpolator_{model}": sha256(CAMB_ROOT / model / "interpolator-construction.npz")
        for model in ["zero", "baseline"]
    } | {
        f"class_{model}": sha256(CLASS_ROOT / f"{prefix}_pk.dat")
        for model, prefix in [("zero", "zero-cdm-integral00"), ("baseline", "baseline-lcdm-integral00")]
    },
    "analysis_runner_sha256": sha256(Path(__file__).resolve()),
    "boundaries": [
        "The explicit gauge mapping is now included in both model spectra before integration and model ratios.",
        "Differences between direct and recovered velocities are numerical diagnostics, not observational errors.",
        "CLASS/CAMB recombination, perturbation implementation, sampling and smoothing systematics remain independent.",
        "No likelihood, parameter search, joint BBN, nonlinear calculation, or model-family exclusion.",
    ],
}
SUMMARY_PATH.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

plt.rcParams.update({
    "font.size": 9,
    "font.sans-serif": ["Microsoft YaHei", "SimHei", "DejaVu Sans"],
    "svg.hashsalt": "comoving-bandpower-v1",
})
fig, axes = plt.subplots(1, 2, figsize=(13, 5), constrained_layout=True)
centers = np.array([band["geometric_center_k_h_per_Mpc"] for band in bands])
for name, color, label in [
    ("class_integral", "#111827", "CLASS integral"),
    ("comoving_direct", "#2c7a5b", "CAMB 共动直接速度"),
    ("synchronous_native", "#6b4fa1", "CAMB 同步原生"),
    ("log_cubic", "#2563a6", "CAMB 对数样条"),
    ("previous_frozen_log_linear", "#c94f32", "旧冻结二次重采样"),
]:
    ratios = [band["sources"][name]["smooth_0.05dex"]["zero_over_baseline"] for band in bands]
    axes[0].loglog(centers, ratios, color=color, marker="o", lw=1.2, label=label)
axes[0].set(
    title="共动规范映射后的带功率比值（0.05 dex）",
    xlabel="带几何中心 k [h/Mpc]",
    ylabel="零模型／ΛCDM 带功率比",
)
axes[0].legend(frameon=False, fontsize=8)
for name, color, label in [
    ("comoving_direct_over_synchronous_native", "#2c7a5b", "共动／同步"),
    ("comoving_direct_over_class", "#2563a6", "共动／CLASS"),
    ("synchronous_native_over_class", "#6b4fa1", "同步／CLASS"),
    ("previous_frozen_log_linear_over_class", "#c94f32", "旧冻结／CLASS"),
]:
    values = [abs(band["signed_log_comparisons"]["smooth_0.05dex"][name]) for band in bands]
    axes[1].plot(centers, values, color=color, marker="o", lw=1.2, label=label)
axes[1].set(
    title="带功率比值的绝对对数差（0.05 dex）",
    xlabel="带几何中心 k [h/Mpc]",
    ylabel="|ln(R_first / R_second)|",
    xscale="log",
)
axes[1].legend(frameon=False, fontsize=8)
for ax in axes:
    ax.grid(alpha=0.25, which="both")
fig.savefig(FIGURE_PATH, bbox_inches="tight", metadata={"Date": None})
FIGURE_PATH.write_text(
    "\n".join(line.rstrip() for line in FIGURE_PATH.read_text(encoding="utf-8").splitlines()) + "\n",
    encoding="utf-8",
)
PREVIEW_PATH.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(PREVIEW_PATH, dpi=150, bbox_inches="tight", metadata={"Software": "comoving-bandpower-v1"})
print(json.dumps({
    "status": summary["status"],
    "validation": summary["validation"],
    "highest_band_smooth_0.05dex": {
        name: bands[-1]["sources"][name]["smooth_0.05dex"]["zero_over_baseline"] for name in series
    },
    "highest_band_signed_logs": bands[-1]["signed_log_comparisons"]["smooth_0.05dex"],
    "robustness": robustness,
    "summary": str(SUMMARY_PATH),
    "figure": str(FIGURE_PATH),
    "preview": str(PREVIEW_PATH),
}, ensure_ascii=False, indent=2))
