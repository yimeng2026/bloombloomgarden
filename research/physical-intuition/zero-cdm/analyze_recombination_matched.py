"""Repeat the recombination comparison on the exact previous 2603-point grid."""

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
CLASS_ROOT = REPO / ".tmp/class_public/convergence"
BAND_EDGES = [0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28]
METHODS = {"raw": None, "smooth_0.05dex": 0.05, "smooth_0.10dex": 0.10}
GRID_MAX = 1.9985652306116815
SUMMARY_PATH = OUT / "recombination-matched-bandpower-summary.json"
FIGURE_PATH = OUT / "recombination-matched-bandpower-comparison.svg"
PREVIEW_PATH = REPO / ".tmp/recombination-matched-bandpower-comparison.png"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


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

log10_grid = np.linspace(np.log10(0.005), np.log10(GRID_MAX), 2603)
common_curves = {}
for name, models in series.items():
    common_curves[name] = {}
    for model in ["zero", "baseline"]:
        k, power = models[model]
        if power[-1] < 0.0 or k[-1] < GRID_MAX:
            raise ValueError(f"matched grid exceeds source range: {name} {model}")
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
        ratios = {name: record["sources"][name][method]["zero_over_baseline"] for name in series}
        record["signed_log_comparisons"][method] = {
            "class_recfast_over_class_hyrec": signed_log_ratio(ratios["class_recfast"], ratios["class_hyrec"]),
            "camb_comoving_over_class_recfast": signed_log_ratio(
                ratios["camb_comoving_recfast"], ratios["class_recfast"]
            ),
            "camb_comoving_over_class_hyrec": signed_log_ratio(
                ratios["camb_comoving_recfast"], ratios["class_hyrec"]
            ),
            "camb_synchronous_over_class_recfast": signed_log_ratio(
                ratios["camb_synchronous_recfast"], ratios["class_recfast"]
            ),
            "camb_synchronous_over_class_hyrec": signed_log_ratio(
                ratios["camb_synchronous_recfast"], ratios["class_hyrec"]
            ),
            "camb_comoving_over_synchronous": signed_log_ratio(
                ratios["camb_comoving_recfast"], ratios["camb_synchronous_recfast"]
            ),
        }
    bands.append(record)

robustness = {}
for name in bands[0]["signed_log_comparisons"]["raw"]:
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

endpoint = json.loads((OUT / "recombination-bandpower-summary.json").read_text(encoding="utf-8"))
endpoint_sensitivity = {
    "endpoint_grid_max_k_h_per_Mpc": endpoint["common_grid"]["actual_maximum_k_h_per_Mpc"],
    "matched_grid_max_k_h_per_Mpc": GRID_MAX,
    "highest_band_ratio_matched_over_endpoint": {
        name: bands[-1]["sources"][name]["smooth_0.05dex"]["zero_over_baseline"]
        / endpoint["band_statistics"][-1]["sources"][name]["smooth_0.05dex"]["zero_over_baseline"]
        for name in series
    },
    "highest_band_ln_matched_over_endpoint": {
        name: signed_log_ratio(
            bands[-1]["sources"][name]["smooth_0.05dex"]["zero_over_baseline"],
            endpoint["band_statistics"][-1]["sources"][name]["smooth_0.05dex"]["zero_over_baseline"],
        )
        for name in series
    },
}
summary = {
    "status": "computed_recombination_matched_grid_bandpowers_and_endpoint_sensitivity",
    "sources": {
        "class_hyrec": "CLASS HyRec 2020 integral mPk",
        "class_recfast": "CLASS RECFAST with identical precision include and physical inputs",
        "camb_comoving_recfast": "CAMB Recfast direct-velocity comoving power",
        "camb_synchronous_recfast": "CAMB Recfast synchronous power",
    },
    "common_grid": {
        "minimum_k_h_per_Mpc": 0.005,
        "actual_maximum_k_h_per_Mpc": GRID_MAX,
        "point_count": 2603,
        "log10_step_dex": float(log10_grid[1] - log10_grid[0]),
        "matches_comoving_bandpower_summary": True,
    },
    "methods": METHODS,
    "band_edges_h_per_Mpc": BAND_EDGES,
    "band_statistics": bands,
    "robustness": robustness,
    "endpoint_sensitivity": endpoint_sensitivity,
    "validation": {
        "all_bandpowers_finite_and_positive": all(
            np.isfinite(methods["zero_bandpower"]) and methods["zero_bandpower"] > 0.0
            and np.isfinite(methods["baseline_bandpower"]) and methods["baseline_bandpower"] > 0.0
            for band in bands for source in band["sources"].values() for methods in source.values()
        ),
        "zero_cdm_exactly_zero": True,
        "observational_likelihood_or_covariance_included": False,
    },
    "raw_output_sha256": endpoint["raw_output_sha256"] | {
        "endpoint_sensitivity_summary": sha256(OUT / "recombination-bandpower-summary.json"),
    },
    "analysis_runner_sha256": sha256(Path(__file__).resolve()),
    "boundaries": [
        "The matched grid isolates recombination effects from the separately recorded endpoint-grid sensitivity.",
        "CLASS RECFAST and CAMB Recfast remain distinct implementations.",
        "No likelihood, parameter search, joint BBN, nonlinear calculation, or model-family exclusion.",
    ],
}
SUMMARY_PATH.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

plt.rcParams.update({
    "font.size": 9,
    "font.sans-serif": ["Microsoft YaHei", "SimHei", "DejaVu Sans"],
    "svg.hashsalt": "recombination-matched-bandpower-v1",
})
fig, axes = plt.subplots(1, 2, figsize=(13, 5), constrained_layout=True)
centers = np.array([band["geometric_center_k_h_per_Mpc"] for band in bands])
for name, color, label in [
    ("class_hyrec", "#111827", "CLASS HyRec"),
    ("class_recfast", "#c94f32", "CLASS RECFAST"),
    ("camb_comoving_recfast", "#2c7a5b", "CAMB Recfast 共动"),
    ("camb_synchronous_recfast", "#6b4fa1", "CAMB Recfast 同步"),
]:
    ratios = [band["sources"][name]["smooth_0.05dex"]["zero_over_baseline"] for band in bands]
    axes[0].loglog(centers, ratios, color=color, marker="o", lw=1.2, label=label)
axes[0].set(
    title="同网格复合实现带功率（0.05 dex）",
    xlabel="带几何中心 k [h/Mpc]", ylabel="零模型／ΛCDM 带功率比",
)
axes[0].legend(frameon=False, fontsize=8)
for name, color, label in [
    ("class_recfast_over_class_hyrec", "#c94f32", "CLASS RECFAST／HyRec"),
    ("camb_comoving_over_class_recfast", "#2c7a5b", "CAMB／CLASS RECFAST"),
    ("camb_comoving_over_class_hyrec", "#2563a6", "CAMB／CLASS HyRec"),
]:
    values = [abs(band["signed_log_comparisons"]["smooth_0.05dex"][name]) for band in bands]
    axes[1].plot(centers, values, color=color, marker="o", lw=1.2, label=label)
axes[1].set(
    title="同网格复合实现差异（0.05 dex）",
    xlabel="带几何中心 k [h/Mpc]", ylabel="|ln(R_first / R_second)|", xscale="log",
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
fig.savefig(PREVIEW_PATH, dpi=150, bbox_inches="tight", metadata={"Software": "recombination-matched-bandpower-v1"})
print(json.dumps({
    "status": summary["status"],
    "highest_band_smooth_0.05dex": {
        name: bands[-1]["sources"][name]["smooth_0.05dex"]["zero_over_baseline"] for name in series
    },
    "highest_band_signed_logs": bands[-1]["signed_log_comparisons"]["smooth_0.05dex"],
    "endpoint_sensitivity": endpoint_sensitivity,
    "robustness": robustness,
    "summary": str(SUMMARY_PATH),
    "figure": str(FIGURE_PATH),
    "preview": str(PREVIEW_PATH),
}, ensure_ascii=False, indent=2))
