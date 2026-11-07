"""Compare same-run CAMB power on the frozen common log-k grid."""

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
SUMMARY_PATH = OUT / "same-run-power-summary.json"
FIGURE_PATH = OUT / "same-run-power-comparison.svg"
PREVIEW_PATH = REPO / ".tmp/same-run-power-comparison.png"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


camb = {
    model: np.load(CAMB_ROOT / model / "transfer-same-run.npz")
    for model in ["zero", "baseline"]
}
class_data = {
    model: np.loadtxt(CLASS_ROOT / f"{prefix}_pk.dat", comments="#")
    for model, prefix in [
        ("zero", "zero-cdm-integral00"),
        ("baseline", "baseline-lcdm-integral00"),
    ]
}
frozen_masks = {}
for model in ["zero", "baseline"]:
    existing = np.load(CAMB_ROOT / model / "spectra.npz")
    k_h = camb[model]["k_h_per_Mpc"]
    frozen_masks[model] = (
        np.isfinite(camb[model]["same_run_p"])
        & (k_h >= existing["pk_k_h_per_Mpc"][0])
        & (k_h <= existing["pk_k_h_per_Mpc"][-1])
    )

series = {
    "native_reconstruction": {
        model: (
            camb[model]["k_h_per_Mpc"][frozen_masks[model]],
            camb[model]["native_reconstructed_p"][frozen_masks[model]],
        )
        for model in ["zero", "baseline"]
    },
    "same_run": {
        model: (
            camb[model]["k_h_per_Mpc"][frozen_masks[model]],
            camb[model]["same_run_p"][frozen_masks[model]],
        )
        for model in ["zero", "baseline"]
    },
    "previous_frozen": {
        model: (
            camb[model]["k_h_per_Mpc"][frozen_masks[model]],
            camb[model]["frozen_p_interpolated"],
        )
        for model in ["zero", "baseline"]
    },
    "class_integral": {
        model: (class_data[model][:, 0], class_data[model][:, 1])
        for model in ["zero", "baseline"]
    },
}

grid_max = min(2.0, min(models[model][0][-1] for models in series.values() for model in ["zero", "baseline"]))
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
            zero_power = common_curves[name]["zero"][method]
            baseline_power = common_curves[name]["baseline"][method]
            zero = log_bandpower(10.0**log10_grid, zero_power, lower, upper)
            baseline = log_bandpower(10.0**log10_grid, baseline_power, lower, upper)
            record["sources"][name][method] = {
                "zero_bandpower": zero,
                "baseline_bandpower": baseline,
                "zero_over_baseline": zero / baseline,
            }
    for method in METHODS:
        native = record["sources"]["native_reconstruction"][method]["zero_over_baseline"]
        class_ratio = record["sources"]["class_integral"][method]["zero_over_baseline"]
        same = record["sources"]["same_run"][method]["zero_over_baseline"]
        frozen = record["sources"]["previous_frozen"][method]["zero_over_baseline"]
        record["signed_log_comparisons"][method] = {
            "same_run_over_native": signed_log_ratio(same, native),
            "previous_frozen_over_native": signed_log_ratio(frozen, native),
            "native_over_class": signed_log_ratio(native, class_ratio),
            "same_run_over_class": signed_log_ratio(same, class_ratio),
            "previous_frozen_over_class": signed_log_ratio(frozen, class_ratio),
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
    "status": "computed_same_run_common_grid_power_and_bandpower_diagnostics_not_observational_fit",
    "sources": {
        "native_reconstruction": "float32 native CAMB transfer rescaled and squared using the frozen adiabatic formula",
        "same_run": "get_matter_power_interpolator on the same get_results object",
        "previous_frozen": "the previously frozen log-log interpolated power, aligned to native k",
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
            for band in bands
            for source in band["sources"].values()
            for methods in source.values()
        ),
        "zero_cdm_exactly_zero": True,
        "observational_likelihood_or_covariance_included": False,
    },
    "raw_output_sha256": {
        "camb_zero": sha256(CAMB_ROOT / "zero/transfer-same-run.npz"),
        "camb_baseline": sha256(CAMB_ROOT / "baseline/transfer-same-run.npz"),
        "class_zero": sha256(CLASS_ROOT / "zero-cdm-integral00_pk.dat"),
        "class_baseline": sha256(CLASS_ROOT / "baseline-lcdm-integral00_pk.dat"),
    },
    "analysis_runner_sha256": sha256(Path(__file__).resolve()),
    "boundaries": [
        "Differences between same-run and previous frozen interpolation are numerical diagnostics, not observational errors.",
        "The comparison identifies interpolation sensitivity near deep minima; it does not uniquely prove every source of the old discrepancy.",
        "CLASS and CAMB output gauges differ at low k; no new gauge-invariant cross-code proof is claimed.",
        "No likelihood, parameter search, joint BBN, nonlinear calculation, or model-family exclusion.",
    ],
}
SUMMARY_PATH.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

plt.rcParams.update({
    "font.size": 9,
    "font.sans-serif": ["Microsoft YaHei", "SimHei", "DejaVu Sans"],
    "svg.hashsalt": "same-run-power-v2",
})
fig, axes = plt.subplots(2, 2, figsize=(13, 9), constrained_layout=True)
for model, ax in [("zero", axes[0, 0]), ("baseline", axes[0, 1])]:
    data = camb[model]
    mask = frozen_masks[model]
    k = data["k_h_per_Mpc"][mask]
    same = data["same_run_p"][mask]
    frozen = data["frozen_p_interpolated"]
    native = data["native_reconstructed_p"][mask]
    ax.loglog(k, np.abs(native / same - 1.0), color="#111827", lw=1.0, label="原生重建／同次功率−1")
    ax.loglog(k, np.abs(same / frozen - 1.0), color="#c94f32", lw=1.0, label="同次／旧冻结功率−1")
    ax.set(
        title=f"{'零模型' if model == 'zero' else 'ΛCDM 基线'}：功率比较误差",
        xlabel="k [h/Mpc]",
        ylabel="相对差绝对值",
    )
    ax.legend(frameon=False, fontsize=8)
centers = np.array([band["geometric_center_k_h_per_Mpc"] for band in bands])
for name, color, label in [
    ("class_integral", "#111827", "CLASS integral"),
    ("native_reconstruction", "#2c7a5b", "CAMB 原生重建"),
    ("same_run", "#2563a6", "CAMB 同次功率"),
    ("previous_frozen", "#c94f32", "旧冻结插值"),
]:
    ratios = [band["sources"][name]["smooth_0.05dex"]["zero_over_baseline"] for band in bands]
    axes[1, 0].loglog(centers, ratios, color=color, marker="o", lw=1.2, label=label)
axes[1, 0].set(
    title="同次功率对 0.05 dex 平滑带功率比值的影响",
    xlabel="带几何中心 k [h/Mpc]",
    ylabel="零模型／ΛCDM 带功率比",
)
axes[1, 0].legend(frameon=False, fontsize=8)
for name, color, label in [
    ("native_over_class", "#2c7a5b", "原生／CLASS"),
    ("same_run_over_class", "#2563a6", "同次／CLASS"),
    ("previous_frozen_over_class", "#c94f32", "旧冻结／CLASS"),
    ("previous_frozen_over_native", "#6b4fa1", "旧冻结／原生"),
]:
    values = [abs(band["signed_log_comparisons"]["smooth_0.05dex"][name]) for band in bands]
    axes[1, 1].plot(centers, values, color=color, marker="o", lw=1.2, label=label)
axes[1, 1].set(
    title="带功率比值的绝对对数差（0.05 dex）",
    xlabel="带几何中心 k [h/Mpc]",
    ylabel="|ln(R_first / R_second)|",
    xscale="log",
)
axes[1, 1].legend(frameon=False, fontsize=8)
for ax in axes.flat:
    ax.grid(alpha=0.25, which="both")
fig.suptitle("同次 CAMB 功率与旧冻结插值：公共网格带功率诊断", fontsize=14)
fig.savefig(FIGURE_PATH, bbox_inches="tight", metadata={"Date": None})
FIGURE_PATH.write_text(
    "\n".join(line.rstrip() for line in FIGURE_PATH.read_text(encoding="utf-8").splitlines()) + "\n",
    encoding="utf-8",
)
PREVIEW_PATH.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(PREVIEW_PATH, dpi=150, bbox_inches="tight", metadata={"Software": "same-run-power-v2"})
print(json.dumps({
    "status": summary["status"],
    "validation": summary["validation"],
    "robustness": robustness,
    "band_table_smooth_0.05dex": [
        {
            "band": [band["lower_k_h_per_Mpc"], band["upper_k_h_per_Mpc"]],
            "ratios": {
                name: band["sources"][name]["smooth_0.05dex"]["zero_over_baseline"]
                for name in series
            },
            "signed_logs": band["signed_log_comparisons"]["smooth_0.05dex"],
        }
        for band in bands
    ],
    "summary": str(SUMMARY_PATH),
    "figure": str(FIGURE_PATH),
    "preview": str(PREVIEW_PATH),
}, ensure_ascii=False, indent=2))
