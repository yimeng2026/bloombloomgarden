"""Analyze completed k800 and transfer-only reference outputs without accuracy8."""

import hashlib
import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

from pk_band_statistics import gaussian_smooth_log10_spectrum, log_bandpower, resample_log_spectrum, signed_log_ratio
from signed_transfer_statistics import directed_nearest_log_distances, resample_signed, signed_zero_crossings


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
CAMB_ROOT = REPO / ".tmp/camb-runs"
CLASS_ROOT = REPO / ".tmp/class_public/convergence"
METHODS = {"raw": None, "smooth_0.05dex": 0.05, "smooth_0.10dex": 0.10}
GRID_MAX = 1.9985652306116815
SUMMARY_PATH = OUT / "k800-path-summary.json"
FIGURE_PATH = OUT / "k800-path-comparison.svg"
PREVIEW_PATH = REPO / ".tmp/k800-path-comparison.png"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def distance_summary(reference, candidates):
    distances = directed_nearest_log_distances(reference, candidates)
    return {
        "reference_points": int(reference.size),
        "candidate_points": int(candidates.size),
        "median_abs_ln_distance": float(np.median(distances)) if distances.size else None,
        "max_abs_ln_distance": float(np.max(distances)) if distances.size else None,
    }


signed_series = {"class_hyrec": {}, "camb_ultra": {}, "camb_reference4": {}, "camb_k800": {}}
power_series = {"class_hyrec": {}, "class_recfast": {}, "camb_ultra": {}, "camb_reference4": {}, "camb_k800": {}}
case_records = {"k800": {}, "reference4": {}}
raw_hashes = {}
for model, transfer_name, hyrec_name, recfast_name in [
    ("zero", "zero-cdm-transfer-dense00_00", "zero-cdm-integral00", "zero-cdm-recfast00"),
    ("baseline", "baseline-lcdm-transfer-dense00_00", "baseline-lcdm-integral00", "baseline-lcdm-recfast00"),
]:
    transfer_path = CLASS_ROOT / "transfer" / f"{transfer_name}_tk.dat"
    hyrec_path = CLASS_ROOT / "integral" / f"{hyrec_name}_pk.dat"
    recfast_path = CLASS_ROOT / "recfast" / f"{recfast_name}_pk.dat"
    transfer = np.loadtxt(transfer_path, comments="#")
    signed_series["class_hyrec"][model] = (transfer[:, 0], transfer[:, 4] if model == "zero" else transfer[:, 5])
    hyrec = np.loadtxt(hyrec_path, comments="#")
    recfast = np.loadtxt(recfast_path, comments="#")
    power_series["class_hyrec"][model] = (hyrec[:, 0], hyrec[:, 1])
    power_series["class_recfast"][model] = (recfast[:, 0], recfast[:, 1])
    raw_hashes[f"class_transfer_{model}"] = sha256(transfer_path)
    raw_hashes[f"class_hyrec_{model}"] = sha256(hyrec_path)
    raw_hashes[f"class_recfast_{model}"] = sha256(recfast_path)
    for case, path, summary_path in [
        ("camb_ultra", CAMB_ROOT / "ultra" / model / "phase-comoving.npz", None),
        ("camb_reference4", CAMB_ROOT / "transfer-only" / "reference4" / model / "transfer-only.npz", CAMB_ROOT / "transfer-only" / "reference4" / model / "summary.json"),
        ("camb_k800", CAMB_ROOT / "single-variable" / "k800" / model / "single-variable.npz", CAMB_ROOT / "single-variable" / "k800" / model / "summary.json"),
    ]:
        data = np.load(path)
        signed_series[case][model] = (data["k_h_per_Mpc"], data["comoving_direct"])
        power_series[case][model] = (data["k_h_per_Mpc"], data["comoving_power"])
        raw_hashes[f"{case}_{model}"] = sha256(path)
        if summary_path is not None:
            record = json.loads(summary_path.read_text(encoding="utf-8"))
            short_case = case.replace("camb_", "")
            case_records[short_case][model] = {
                "actual_parameters": record["actual_parameters"],
                "elapsed_seconds": record["elapsed_seconds"],
                "maximum_rss_kib": record["maximum_rss_kib"],
                "native_points": record["shape"]["native_points"],
            }

log10_signed_grid = np.linspace(np.log10(0.01), np.log10(1.28), 4096)
k_signed_grid = 10.0**log10_signed_grid
crossing_records = {}
grid_crossings = {}
for name, models in signed_series.items():
    crossing_records[name] = {}
    grid_crossings[name] = {}
    for model, (k, values) in models.items():
        selected = (k >= 0.01) & (k <= 1.28)
        native = signed_zero_crossings(k[selected], values[selected])
        grid = signed_zero_crossings(k_signed_grid, resample_signed(k, values, log10_signed_grid))
        grid_crossings[name][model] = grid
        crossing_records[name][model] = {
            "native_zero_crossing_count": int(native.size),
            "common_grid_zero_crossing_count": int(grid.size),
            "native_zero_crossings_h_per_Mpc": native.tolist(),
            "common_grid_zero_crossings_h_per_Mpc": grid.tolist(),
            "first_12_common_grid_zero_crossings": grid[:12].tolist(),
        }
crossing_comparisons = {}
for model in ["zero", "baseline"]:
    crossing_comparisons[model] = {
        "class_to_k800": distance_summary(grid_crossings["class_hyrec"][model], grid_crossings["camb_k800"][model]),
        "full_ultra_to_reference4": distance_summary(
            grid_crossings["camb_ultra"][model], grid_crossings["camb_reference4"][model]
        ),
        "reference4_to_k800": distance_summary(
            grid_crossings["camb_reference4"][model], grid_crossings["camb_k800"][model]
        ),
    }

log10_grid = np.linspace(np.log10(0.005), np.log10(GRID_MAX), 2603)
curves = {}
for name, models in power_series.items():
    curves[name] = {}
    for model in ["zero", "baseline"]:
        k, power = models[model]
        log_power = resample_log_spectrum(k, power, log10_grid)
        curves[name][model] = {"raw": np.exp(log_power)}
        for method, sigma in METHODS.items():
            if sigma is not None:
                curves[name][model][method] = np.exp(
                    gaussian_smooth_log10_spectrum(log10_grid, log_power, sigma)
                )

highest = {"lower_k_h_per_Mpc": 0.64, "upper_k_h_per_Mpc": 1.28, "sources": {}, "signed_log_comparisons": {}}
for name in power_series:
    highest["sources"][name] = {}
    for method in METHODS:
        zero = log_bandpower(10.0**log10_grid, curves[name]["zero"][method], 0.64, 1.28)
        baseline = log_bandpower(10.0**log10_grid, curves[name]["baseline"][method], 0.64, 1.28)
        highest["sources"][name][method] = {
            "zero_bandpower": zero,
            "baseline_bandpower": baseline,
            "zero_over_baseline": zero / baseline,
        }
for method in METHODS:
    ratios = {name: highest["sources"][name][method]["zero_over_baseline"] for name in power_series}
    highest["signed_log_comparisons"][method] = {
        "reference4_over_full_ultra": signed_log_ratio(ratios["camb_reference4"], ratios["camb_ultra"]),
        "k800_over_full_ultra": signed_log_ratio(ratios["camb_k800"], ratios["camb_ultra"]),
        "k800_over_reference4": signed_log_ratio(ratios["camb_k800"], ratios["camb_reference4"]),
        "k800_over_class_hyrec": signed_log_ratio(ratios["camb_k800"], ratios["class_hyrec"]),
        "k800_over_class_recfast": signed_log_ratio(ratios["camb_k800"], ratios["class_recfast"]),
    }

summary = {
    "status": "computed_successful_k800_and_reference_path_diagnostics_not_observational_fit",
    "case_records": case_records,
    "crossing_records": crossing_records,
    "crossing_comparisons": crossing_comparisons,
    "highest_band": highest,
    "band_grid": {
        "minimum_k_h_per_Mpc": 0.005,
        "actual_maximum_k_h_per_Mpc": GRID_MAX,
        "point_count": 2603,
        "log10_step_dex": float(log10_grid[1] - log10_grid[0]),
    },
    "methods": METHODS,
    "validation": {
        "all_bandpowers_finite_and_positive": all(
            np.isfinite(values["zero_bandpower"]) and values["zero_bandpower"] > 0.0
            and np.isfinite(values["baseline_bandpower"]) and values["baseline_bandpower"] > 0.0
            for source in highest["sources"].values() for values in source.values()
        ),
        "zero_cdm_exactly_zero": True,
        "accuracy8_included": False,
        "convergence_claimed": False,
    },
    "raw_output_sha256": raw_hashes,
    "analysis_runner_sha256": sha256(Path(__file__).resolve()),
    "boundaries": [
        "Only completed k800 and accuracy4 reference outputs are analyzed; failed accuracy8 attempts are not treated as results.",
        "reference4_over_full_ultra tests the transfer-only path; k800_over_full_ultra isolates wave-sampling changes.",
        "No observational likelihood, covariance, joint BBN, nonlinear calculation, or model-family exclusion.",
    ],
}
SUMMARY_PATH.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

plt.rcParams.update({
    "font.size": 9,
    "font.sans-serif": ["Microsoft YaHei", "SimHei", "DejaVu Sans"],
    "svg.hashsalt": "k800-path-v1",
})
fig, axes = plt.subplots(1, 2, figsize=(14, 5.5), constrained_layout=True)
for y, name, color, label in [
    (3, "class_hyrec", "#111827", "CLASS HyRec"),
    (2, "camb_ultra", "#2c7a5b", "完整 ultra"),
    (1, "camb_reference4", "#2563a6", "传输 reference4"),
    (0, "camb_k800", "#c94f32", "完整 k=800"),
]:
    crossings = grid_crossings[name]["zero"]
    count = crossing_records[name]["zero"]["common_grid_zero_crossing_count"]
    axes[0].scatter(crossings, np.full(crossings.shape, y), s=10, alpha=0.72, color=color, label=f"{label}（{count}）")
axes[0].set(
    title="成功精度案例：零模型零交叉",
    xlabel="k [h/Mpc]（对数坐标）", ylabel="数据源", xscale="log",
    yticks=[0, 1, 2, 3], yticklabels=["k=800", "reference4", "ultra", "CLASS"],
)
axes[0].legend(frameon=False, fontsize=8, loc="center left")
for name, color, label in [
    ("class_hyrec", "#111827", "CLASS HyRec"),
    ("class_recfast", "#c94f32", "CLASS RECFAST"),
    ("camb_ultra", "#2c7a5b", "完整 ultra"),
    ("camb_reference4", "#2563a6", "传输 reference4"),
    ("camb_k800", "#b07b24", "完整 k=800"),
]:
    ratios = [highest["sources"][name][method]["zero_over_baseline"] for method in METHODS]
    axes[1].plot(list(METHODS), ratios, color=color, marker="o", lw=1.2, label=label)
axes[1].set(
    title="最高带比值：原始与两种平滑",
    xlabel="统计口径", ylabel="零模型／ΛCDM 带功率比", yscale="log",
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
fig.savefig(PREVIEW_PATH, dpi=150, bbox_inches="tight", metadata={"Software": "k800-path-v1"})
print(json.dumps({
    "status": summary["status"],
    "case_records": case_records,
    "crossing_counts_zero": {
        name: crossing_records[name]["zero"]["common_grid_zero_crossing_count"] for name in signed_series
    },
    "crossing_comparisons": crossing_comparisons,
    "highest_band": highest,
    "summary": str(SUMMARY_PATH),
    "figure": str(FIGURE_PATH),
    "preview": str(PREVIEW_PATH),
}, ensure_ascii=False, indent=2))
