"""Analyze paired kmax-limited accuracy cases against full ultra and k800."""

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
from signed_transfer_statistics import (
    directed_nearest_log_distances,
    resample_signed,
    signed_zero_crossings,
)


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
CAMB_ROOT = REPO / ".tmp/camb-runs"
CLASS_ROOT = REPO / ".tmp/class_public/convergence"
BAND_EDGES = [0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28]
METHODS = {"raw": None, "smooth_0.05dex": 0.05, "smooth_0.10dex": 0.10}
GRID_MAX = 1.28
SUMMARY_PATH = OUT / "kmax-limited-summary.json"
FIGURE_PATH = OUT / "kmax-limited-comparison.svg"
PREVIEW_PATH = REPO / ".tmp/kmax-limited-comparison.png"


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


signed_series = {"class_hyrec": {}, "camb_ultra": {}, "camb_k800": {}}
power_series = {"class_hyrec": {}, "class_recfast": {}, "camb_ultra": {}, "camb_k800": {}}
case_records = {}
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
    for case, path in [
        ("camb_ultra", CAMB_ROOT / "ultra" / model / "phase-comoving.npz"),
        ("camb_k800", CAMB_ROOT / "single-variable" / "k800" / model / "single-variable.npz"),
    ]:
        data = np.load(path)
        signed_series[case][model] = (data["k_h_per_Mpc"], data["comoving_direct"])
        power_series[case][model] = (data["k_h_per_Mpc"], data["comoving_power"])
        raw_hashes[f"{case}_{model}"] = sha256(path)
for case in ["reference4", "accuracy8"]:
    name = f"camb_{case}"
    signed_series[name] = {}
    power_series[name] = {}
    case_records[case] = {}
    for model in ["zero", "baseline"]:
        path = CAMB_ROOT / "kmax-limited" / case / model / "kmax-limited.npz"
        summary_path = CAMB_ROOT / "kmax-limited" / case / model / "summary.json"
        data = np.load(path)
        signed_series[name][model] = (data["k_h_per_Mpc"], data["comoving_direct"])
        power_series[name][model] = (data["k_h_per_Mpc"], data["comoving_power"])
        record = json.loads(summary_path.read_text(encoding="utf-8"))
        case_records[case][model] = {
            "configuration": record["configuration"],
            "actual_parameters": record["actual_parameters"],
            "elapsed_seconds": record["elapsed_seconds"],
            "maximum_rss_kib": record["maximum_rss_kib"],
            "native_points": record["shape"]["native_points"],
        }
        raw_hashes[f"{name}_{model}"] = sha256(path)

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
        "class_to_accuracy8": distance_summary(
            grid_crossings["class_hyrec"][model], grid_crossings["camb_accuracy8"][model]
        ),
        "full_ultra_to_reference4": distance_summary(
            grid_crossings["camb_ultra"][model], grid_crossings["camb_reference4"][model]
        ),
        "reference4_to_accuracy8": distance_summary(
            grid_crossings["camb_reference4"][model], grid_crossings["camb_accuracy8"][model]
        ),
        "reference4_to_k800": distance_summary(
            grid_crossings["camb_reference4"][model], grid_crossings["camb_k800"][model]
        ),
    }

log10_grid = np.linspace(np.log10(0.005), np.log10(GRID_MAX), 2603)
common_curves = {}
for name, models in power_series.items():
    common_curves[name] = {}
    for model in ["zero", "baseline"]:
        k, power = models[model]
        if k[-1] < GRID_MAX:
            raise ValueError(f"band grid exceeds source range: {name} {model}")
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
    for name in power_series:
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
        ratios = {name: record["sources"][name][method]["zero_over_baseline"] for name in power_series}
        record["signed_log_comparisons"][method] = {
            "reference4_over_full_ultra": signed_log_ratio(
                ratios["camb_reference4"], ratios["camb_ultra"]
            ),
            "accuracy8_over_reference4": signed_log_ratio(
                ratios["camb_accuracy8"], ratios["camb_reference4"]
            ),
            "accuracy8_over_full_ultra": signed_log_ratio(
                ratios["camb_accuracy8"], ratios["camb_ultra"]
            ),
            "k800_over_full_ultra": signed_log_ratio(
                ratios["camb_k800"], ratios["camb_ultra"]
            ),
            "accuracy8_over_class_hyrec": signed_log_ratio(
                ratios["camb_accuracy8"], ratios["class_hyrec"]
            ),
            "accuracy8_over_class_recfast": signed_log_ratio(
                ratios["camb_accuracy8"], ratios["class_recfast"]
            ),
            "k800_over_accuracy8": signed_log_ratio(
                ratios["camb_k800"], ratios["camb_accuracy8"]
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

summary = {
    "status": "computed_kmax_limited_accuracy_pair_and_full_ultra_comparison_not_observational_fit",
    "case_records": case_records,
    "crossing_records": crossing_records,
    "crossing_comparisons": crossing_comparisons,
    "band_grid": {
        "minimum_k_h_per_Mpc": 0.005,
        "actual_maximum_k_h_per_Mpc": GRID_MAX,
        "point_count": 2603,
        "log10_step_dex": float(log10_grid[1] - log10_grid[0]),
    },
    "band_edges_h_per_Mpc": BAND_EDGES,
    "methods": METHODS,
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
        "convergence_claimed": False,
    },
    "raw_output_sha256": raw_hashes,
    "analysis_runner_sha256": sha256(Path(__file__).resolve()),
    "boundaries": [
        "reference4_over_full_ultra tests the kmax-limited path; accuracy8_over_reference4 isolates the AccuracyBoost effect on that path.",
        "No CMB l,k power outputs are generated for the kmax-limited pair.",
        "Crossing counts and nearest-neighbor distances do not prove complete phase convergence or observational viability.",
    ],
}
SUMMARY_PATH.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

plt.rcParams.update({
    "font.size": 9,
    "font.sans-serif": ["Microsoft YaHei", "SimHei", "DejaVu Sans"],
    "svg.hashsalt": "kmax-limited-v1",
})
fig, axes = plt.subplots(1, 2, figsize=(14, 5.5), constrained_layout=True)
for y, name, color, label in [
    (4, "class_hyrec", "#111827", "CLASS HyRec"),
    (3, "camb_ultra", "#2c7a5b", "完整 ultra"),
    (2, "camb_reference4", "#2563a6", "传输 reference4"),
    (1, "camb_accuracy8", "#6b4fa1", "传输 AccuracyBoost=8"),
    (0, "camb_k800", "#c94f32", "完整 k=800"),
]:
    crossings = grid_crossings[name]["zero"]
    count = crossing_records[name]["zero"]["common_grid_zero_crossing_count"]
    axes[0].scatter(crossings, np.full(crossings.shape, y), s=10, alpha=0.72, color=color, label=f"{label}（{count}）")
axes[0].set(
    title="传输单变量实验：零模型零交叉",
    xlabel="k [h/Mpc]（对数坐标）", ylabel="数据源", xscale="log",
    yticks=[0, 1, 2, 3, 4], yticklabels=["k=800", "Accuracy=8", "reference4", "ultra", "CLASS"],
)
axes[0].legend(frameon=False, fontsize=8, loc="center left")
centers = np.array([band["geometric_center_k_h_per_Mpc"] for band in bands])
for name, color, label in [
    ("class_hyrec", "#111827", "CLASS HyRec"),
    ("class_recfast", "#c94f32", "CLASS RECFAST"),
    ("camb_ultra", "#2c7a5b", "完整 ultra"),
    ("camb_reference4", "#2563a6", "传输 reference4"),
    ("camb_accuracy8", "#6b4fa1", "传输 AccuracyBoost=8"),
    ("camb_k800", "#b07b24", "完整 k=800"),
]:
    ratios = [band["sources"][name]["smooth_0.05dex"]["zero_over_baseline"] for band in bands]
    axes[1].loglog(centers, ratios, color=color, marker="o", lw=1.2, label=label)
axes[1].set(
    title="传输单变量实验：共动带功率（0.05 dex）",
    xlabel="带几何中心 k [h/Mpc]", ylabel="零模型／ΛCDM 带功率比",
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
fig.savefig(PREVIEW_PATH, dpi=150, bbox_inches="tight", metadata={"Software": "kmax-limited-v1"})
print(json.dumps({
    "status": summary["status"],
    "case_records": case_records,
    "crossing_counts_zero": {
        name: crossing_records[name]["zero"]["common_grid_zero_crossing_count"] for name in signed_series
    },
    "crossing_comparisons": crossing_comparisons,
    "highest_band_smooth_0.05dex": {
        name: bands[-1]["sources"][name]["smooth_0.05dex"]["zero_over_baseline"] for name in power_series
    },
    "highest_band_signed_logs": bands[-1]["signed_log_comparisons"]["smooth_0.05dex"],
    "robustness": robustness,
    "summary": str(SUMMARY_PATH),
    "figure": str(FIGURE_PATH),
    "preview": str(PREVIEW_PATH),
}, ensure_ascii=False, indent=2))
