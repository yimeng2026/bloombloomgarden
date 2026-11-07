"""Recompute common-grid bands for the CAMB interpolator-construction A/B test."""

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
SUMMARY_PATH = OUT / "interpolator-construction-summary.json"
FIGURE_PATH = OUT / "interpolator-construction-comparison.svg"
PREVIEW_PATH = REPO / ".tmp/interpolator-construction-comparison.png"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load_series():
    raw = {model: np.load(CAMB_ROOT / model / "interpolator-construction.npz") for model in ["zero", "baseline"]}
    class_data = {
        model: np.loadtxt(CLASS_ROOT / f"{prefix}_pk.dat", comments="#")
        for model, prefix in [
            ("zero", "zero-cdm-integral00"),
            ("baseline", "baseline-lcdm-integral00"),
        ]
    }
    series = {name: {} for name in [
        "native_reconstruction",
        "camb_power_nodes",
        "log_cubic",
        "linear_cubic",
        "power_nodes_log_linear",
        "previous_frozen_log_linear",
        "class_integral",
    ]}
    for model, data in raw.items():
        series["native_reconstruction"][model] = (
            data["aligned_k_h_per_Mpc"], data["aligned_native_reconstructed"]
        )
        series["camb_power_nodes"][model] = (data["k_nodes_h_per_Mpc"], data["p_nodes"])
        for name, key in [
            ("log_cubic", "aligned_log_cubic"),
            ("linear_cubic", "aligned_linear_cubic"),
            ("power_nodes_log_linear", "aligned_power_nodes_log_linear"),
            ("previous_frozen_log_linear", "aligned_previous_frozen_log_linear"),
        ]:
            values = np.asarray(data[key], dtype=float)
            if np.any(values <= 0.0):
                raise ValueError(f"common log-grid analysis requires positive {name} values for {model}")
            series[name][model] = (data["aligned_k_h_per_Mpc"], values)
    series["class_integral"] = {
        model: (class_data[model][:, 0], class_data[model][:, 1]) for model in ["zero", "baseline"]
    }
    return raw, series


raw, series = load_series()
grid_max = min(2.0, min(
    float(series[name][model][0][-1])
    for name in series
    for model in ["zero", "baseline"]
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
            zero = log_bandpower(
                10.0**log10_grid, common_curves[name]["zero"][method], lower, upper
            )
            baseline = log_bandpower(
                10.0**log10_grid, common_curves[name]["baseline"][method], lower, upper
            )
            record["sources"][name][method] = {
                "zero_bandpower": zero,
                "baseline_bandpower": baseline,
                "zero_over_baseline": zero / baseline,
            }
    for method in METHODS:
        native = record["sources"]["native_reconstruction"][method]["zero_over_baseline"]
        class_ratio = record["sources"]["class_integral"][method]["zero_over_baseline"]
        comparisons = {}
        for name in series:
            if name in ["native_reconstruction", "class_integral"]:
                continue
            ratio = record["sources"][name][method]["zero_over_baseline"]
            comparisons[f"{name}_over_native"] = signed_log_ratio(ratio, native)
            comparisons[f"{name}_over_class"] = signed_log_ratio(ratio, class_ratio)
        comparisons["native_over_class"] = signed_log_ratio(native, class_ratio)
        comparisons["linear_cubic_over_log_cubic"] = signed_log_ratio(
            record["sources"]["linear_cubic"][method]["zero_over_baseline"],
            record["sources"]["log_cubic"][method]["zero_over_baseline"],
        )
        record["signed_log_comparisons"][method] = comparisons
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
    "status": "computed_interpolator_construction_common_grid_bandpower_diagnostics_not_observational_fit",
    "sources": {
        "native_reconstruction": "same-run float32 native CAMB transfer rescaled and squared using the frozen adiabatic formula",
        "camb_power_nodes": "direct get_linear_matter_power_spectrum internal CAMB power nodes",
        "log_cubic": "same-result cubic spline of ln(P) versus ln(k), evaluated at aligned native k",
        "linear_cubic": "same-result cubic spline of P versus ln(k), evaluated at aligned native k",
        "power_nodes_log_linear": "log-log linear resampling of direct CAMB nodes",
        "previous_frozen_log_linear": "log-log linear resampling of the old 2500-point log-cubic output",
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
        f"camb_{model}": sha256(CAMB_ROOT / model / "interpolator-construction.npz")
        for model in ["zero", "baseline"]
    } | {
        f"class_{model}": sha256(CLASS_ROOT / f"{prefix}_pk.dat")
        for model, prefix in [("zero", "zero-cdm-integral00"), ("baseline", "baseline-lcdm-integral00")]
    },
    "analysis_runner_sha256": sha256(Path(__file__).resolve()),
    "boundaries": [
        "The A/B comparison separates log versus linear cubic output construction on one result object.",
        "The old second log-linear resampling stage remains a separate candidate; neither is silently called the solver answer.",
        "CLASS and CAMB output gauges differ at low k; no explicit gauge transformation or gauge-invariant cross-code proof is added.",
        "No likelihood, parameter search, joint BBN, nonlinear calculation, or model-family exclusion.",
    ],
}
SUMMARY_PATH.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

plt.rcParams.update({
    "font.size": 9,
    "font.sans-serif": ["Microsoft YaHei", "SimHei", "DejaVu Sans"],
    "svg.hashsalt": "interpolator-construction-v1",
})
fig, axes = plt.subplots(1, 2, figsize=(13, 5), constrained_layout=True)
for model, ax in [("zero", axes[0]), ("baseline", axes[1])]:
    data = raw[model]
    k = data["aligned_k_h_per_Mpc"]
    native = data["aligned_native_reconstructed"]
    for name, key, color, label in [
        ("log_cubic", "aligned_log_cubic", "#2563a6", "对数三次样条"),
        ("linear_cubic", "aligned_linear_cubic", "#2c7a5b", "线性值三次样条"),
        ("previous_frozen_log_linear", "aligned_previous_frozen_log_linear", "#c94f32", "旧冻结二次重采样"),
    ]:
        ax.loglog(k, np.abs(data[key] / native - 1.0), color=color, lw=1.0, label=label)
    ax.set(
        title=f"{'零模型' if model == 'zero' else 'ΛCDM 基线'}：相对原生重建",
        xlabel="k [h/Mpc]",
        ylabel="相对差绝对值",
    )
    ax.legend(frameon=False, fontsize=8)
    ax.grid(alpha=0.25, which="both")
fig.savefig(FIGURE_PATH, bbox_inches="tight", metadata={"Date": None})
FIGURE_PATH.write_text(
    "\n".join(line.rstrip() for line in FIGURE_PATH.read_text(encoding="utf-8").splitlines()) + "\n",
    encoding="utf-8",
)
PREVIEW_PATH.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(PREVIEW_PATH, dpi=150, bbox_inches="tight", metadata={"Software": "interpolator-construction-v1"})
print(json.dumps({
    "status": summary["status"],
    "validation": summary["validation"],
    "highest_band_smooth_0.05dex": {
        name: bands[-1]["sources"][name]["smooth_0.05dex"]["zero_over_baseline"]
        for name in series
    },
    "highest_band_signed_logs": bands[-1]["signed_log_comparisons"]["smooth_0.05dex"],
    "robustness": robustness,
    "summary": str(SUMMARY_PATH),
    "figure": str(FIGURE_PATH),
    "preview": str(PREVIEW_PATH),
}, ensure_ascii=False, indent=2))
