"""Analyze frozen native CLASS/CAMB transfer outputs and their zero crossings."""

import hashlib
import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

from signed_transfer_statistics import (
    directed_nearest_log_distances,
    power_from_transfer,
    resample_signed,
    signed_zero_crossings,
)

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
CLASS_ROOT = REPO / ".tmp/class_public/convergence/transfer"
CAMB_ROOT = REPO / ".tmp/camb-runs"
PROTOCOL_PATH = OUT / "native-transfer-protocol.json"
SUMMARY_PATH = OUT / "native-transfer-summary.json"
FIGURE_PATH = OUT / "native-transfer-comparison.svg"
PREVIEW_PATH = REPO / ".tmp/native-transfer-comparison-preview.png"
H = 67.66 / 100.0
AS = 2.1e-9
NS = 0.9665
PIVOT = 0.05
CLASS_FILES = {
    "zero": "zero-cdm-transfer-dense00_00",
    "baseline": "baseline-lcdm-transfer-dense00_00",
}
LEVELS = ["fiducial", "high", "ultra"]


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


protocol = json.loads(PROTOCOL_PATH.read_text(encoding="utf-8"))
for filename, expected_hash in protocol["input_sha256"].items():
    if sha256(OUT / filename) != expected_hash:
        raise ValueError(f"Frozen input hash mismatch: {filename}")
if protocol["status"] != "frozen_before_native_transfer_run":
    raise ValueError("Unexpected native transfer protocol status")

log10_grid = np.linspace(
    np.log10(protocol["analysis"]["common_grid_min_k_h_per_Mpc"]),
    np.log10(protocol["analysis"]["common_grid_max_k_h_per_Mpc"]),
    protocol["analysis"]["common_grid_points"],
)
k_grid = 10.0**log10_grid
raw = {}
curves = {}
native_crossings = {}
grid_crossings = {}
power_errors = {}
source_records = {}
raw_hashes = {}

for model, prefix in CLASS_FILES.items():
    name = f"class_dense_{model}"
    transfer_path = CLASS_ROOT / f"{prefix}_tk.dat"
    pk_path = CLASS_ROOT / f"{prefix}_pk.dat"
    transfer_data = np.loadtxt(transfer_path, comments="#")
    pk_data = np.loadtxt(pk_path, comments="#")
    k_h = transfer_data[:, 0]
    d_m = transfer_data[:, 4] if model == "zero" else transfer_data[:, 5]
    if not np.allclose(k_h, pk_data[:, 0], rtol=1.0e-10, atol=1.0e-12):
        raise ValueError(f"CLASS transfer and power grids differ beyond text-rounding tolerance: {model}")
    _, reconstructed = power_from_transfer(k_h * H, d_m, AS, NS, PIVOT, H)
    fractional = reconstructed / pk_data[:, 1] - 1.0
    in_range = (k_h >= k_grid[0]) & (k_h <= k_grid[-1])
    raw[name] = (k_h, d_m)
    curves[name] = resample_signed(k_h, d_m, log10_grid)
    native_crossings[name] = signed_zero_crossings(k_h[in_range], d_m[in_range])
    grid_crossings[name] = signed_zero_crossings(k_grid, curves[name])
    power_errors[name] = (k_h[in_range], np.abs(fractional[in_range]))
    source_records[name] = {
        "kind": "CLASS d_m; Newtonian integration, default gauge-invariant comoving matter density",
        "native_points": int(k_h.size),
        "native_range_h_per_Mpc": [float(k_h[0]), float(k_h[-1])],
        "power_reconstruction": {
            "points": int(fractional.size),
            "median_abs_fraction": float(np.median(np.abs(fractional))),
            "p95_abs_fraction": float(np.percentile(np.abs(fractional), 95)),
            "max_abs_fraction": float(np.max(np.abs(fractional))),
        },
    }
    raw_hashes[name] = {
        "transfer": sha256(transfer_path),
        "power": sha256(pk_path),
    }

for level in LEVELS:
    for model in ["zero", "baseline"]:
        name = f"camb_{level}_{model}"
        transfer_path = CAMB_ROOT / level / model / "transfer.npz"
        spectra_path = CAMB_ROOT / level / model / "spectra.npz"
        transfer = np.load(transfer_path)
        spectra = np.load(spectra_path)
        k_h = transfer["k_h_per_Mpc"]
        density = transfer["delta_tot"]
        reconstructed = transfer["reconstructed_p_Mpc_over_h_cubed"]
        in_range = (k_h >= k_grid[0]) & (k_h <= k_grid[-1])
        reference = np.exp(np.interp(
            np.log(k_h[in_range]),
            np.log(spectra["pk_k_h_per_Mpc"]),
            np.log(spectra["pk_p_Mpc_over_h_cubed"]),
        ))
        fractional = reconstructed[in_range] / reference - 1.0
        raw[name] = (k_h, density)
        curves[name] = resample_signed(k_h, density, log10_grid)
        native_crossings[name] = signed_zero_crossings(k_h[in_range], density[in_range])
        grid_crossings[name] = signed_zero_crossings(k_grid, curves[name])
        power_errors[name] = (k_h[in_range], np.abs(fractional))
        source_records[name] = {
            "kind": "CAMB native synchronous-gauge delta_tot; q^2 times delta_tot/k^2",
            "native_points": int(k_h.size),
            "native_range_h_per_Mpc": [float(k_h[0]), float(k_h[-1])],
            "power_reconstruction": {
                "points": int(fractional.size),
                "median_abs_fraction": float(np.median(np.abs(fractional))),
                "p95_abs_fraction": float(np.percentile(np.abs(fractional), 95)),
                "max_abs_fraction": float(np.max(np.abs(fractional))),
            },
        }
        raw_hashes[name] = {
            "transfer": sha256(transfer_path),
            "power": sha256(spectra_path),
        }

for name, (k_h, values) in raw.items():
    in_range = (k_h >= k_grid[0]) & (k_h <= k_grid[-1])
    source_records[name].update({
        "signed_min_in_common_range": float(np.min(values[in_range])),
        "signed_max_in_common_range": float(np.max(values[in_range])),
        "has_positive_and_negative_in_common_range": bool(
            np.any(values[in_range] > 0.0) and np.any(values[in_range] < 0.0)
        ),
        "native_zero_crossing_count": int(native_crossings[name].size),
        "common_grid_zero_crossing_count": int(grid_crossings[name].size),
        "common_grid_zero_crossings_h_per_Mpc": grid_crossings[name].tolist(),
        "first_common_grid_zero_crossings_h_per_Mpc": grid_crossings[name][:12].tolist(),
    })

comparisons = {
    "class_zero_to_class_baseline": ("class_dense_zero", "class_dense_baseline"),
    "camb_ultra_zero_to_camb_ultra_baseline": ("camb_ultra_zero", "camb_ultra_baseline"),
    "camb_ultra_zero_to_class_zero": ("camb_ultra_zero", "class_dense_zero"),
    "camb_ultra_zero_to_camb_high_zero": ("camb_ultra_zero", "camb_high_zero"),
    "camb_high_zero_to_camb_fiducial_zero": ("camb_high_zero", "camb_fiducial_zero"),
}
comparison_records = {}
for comparison, (first, second) in comparisons.items():
    record = {
        "first": first,
        "second": second,
        "first_count": int(grid_crossings[first].size),
        "second_count": int(grid_crossings[second].size),
        "note": "Directed nearest-neighbor distances, not a one-to-one oscillation identification or a gauge-invariant phase difference.",
    }
    for direction, reference, candidates in [
        ("first_to_second", grid_crossings[first], grid_crossings[second]),
        ("second_to_first", grid_crossings[second], grid_crossings[first]),
    ]:
        distances = directed_nearest_log_distances(reference, candidates)
        record[direction] = {
            "count": int(distances.size),
            "median_abs_ln_k_distance": float(np.median(distances)) if distances.size else None,
            "max_abs_ln_k_distance": float(np.max(distances)) if distances.size else None,
        }
    comparison_records[comparison] = record

summary = {
    "status": "computed_native_signed_transfer_and_zero_crossings_not_observational_fit",
    "protocol": "native-transfer-protocol.json",
    "protocol_sha256": sha256(PROTOCOL_PATH),
    "analysis_runner_sha256": sha256(Path(__file__).resolve()),
    "variable_mapping": protocol["variable_mapping"],
    "common_grid": {
        "min_k_h_per_Mpc": float(k_grid[0]),
        "max_k_h_per_Mpc": float(k_grid[-1]),
        "points": int(k_grid.size),
        "interpolation": "signed values linear in log10(k), no smoothing and no extrapolation",
    },
    "sources": source_records,
    "crossing_comparisons": comparison_records,
    "raw_output_sha256": raw_hashes,
    "validation": {
        "all_native_values_finite": all(np.isfinite(values).all() for _, values in raw.values()),
        "all_common_grid_values_finite": all(np.isfinite(values).all() for values in curves.values()),
        "class_transfer_and_power_grids_close_rtol_1e-10": True,
        "frozen_input_hashes_match": True,
        "zero_cdm_not_replaced_by_nonzero_component": True,
        "full_hilbert_phase_computed": False,
        "observational_likelihood_or_covariance_included": False,
    },
    "boundaries": protocol["boundaries"] + [
        "Cross-code signed curves use different output gauges and are diagnostics, not a direct gauge-invariant amplitude comparison.",
        "Zero crossings can depend on sampling and implementation; unequal counts are reported rather than suppressed.",
        "CAMB transfer_data is float32 and the saved reference P(k) is interpolated, especially near deep minima.",
    ],
}
SUMMARY_PATH.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

plt.rcParams.update({
    "font.size": 9,
    "font.sans-serif": ["Microsoft YaHei", "SimHei", "DejaVu Sans"],
    "svg.hashsalt": "native-zero-cdm-transfer-v1",
})
fig, axes = plt.subplots(2, 2, figsize=(13, 9), constrained_layout=True)
styles = {
    "class_dense_zero": ("CLASS 零模型 d_m", "#111827", "-"),
    "class_dense_baseline": ("CLASS 基线 d_m", "#6b7280", "--"),
    "camb_ultra_zero": ("CAMB ultra 零模型 Δ_tot", "#c94f32", "-"),
    "camb_ultra_baseline": ("CAMB ultra 基线 Δ_tot", "#2563a6", "--"),
    "camb_high_zero": ("CAMB high 零模型", "#2c7a5b", ":"),
    "camb_fiducial_zero": ("CAMB fiducial 零模型", "#6b4fa1", ":"),
}
for name in ["class_dense_zero", "class_dense_baseline"]:
    label, color, linestyle = styles[name]
    axes[0, 0].plot(k_grid, curves[name], label=label, color=color, linestyle=linestyle, lw=1.1)
axes[0, 0].set_title("CLASS：默认共动规范不变物质密度")
for name in ["camb_ultra_zero", "camb_ultra_baseline"]:
    label, color, linestyle = styles[name]
    axes[0, 1].plot(k_grid, curves[name], label=label, color=color, linestyle=linestyle, lw=1.1)
axes[0, 1].set_title("CAMB：原生同步规范 delta_tot")
for name in ["class_dense_zero", "camb_fiducial_zero", "camb_high_zero", "camb_ultra_zero"]:
    label, color, linestyle = styles[name]
    axes[1, 0].plot(k_grid, curves[name], label=label, color=color, linestyle=linestyle, lw=1.1)
axes[1, 0].set_title("零模型符号与零交叉：不同输出规范仅作诊断")
for name in ["class_dense_zero", "class_dense_baseline", "camb_ultra_zero", "camb_ultra_baseline"]:
    k_values, errors = power_errors[name]
    label, color, linestyle = styles[name]
    axes[1, 1].loglog(k_values, errors, label=label, color=color, linestyle=linestyle, lw=1.0)
axes[1, 1].set_title("原生传输重建功率／保存功率−1（绝对值）")
for ax in axes.flat:
    ax.set_xscale("log")
    ax.set_yscale("symlog", linscale=1.0e-3)
    ax.set_xlabel("k [h/Mpc]")
    ax.grid(alpha=0.25, which="both")
    ax.legend(frameon=False, fontsize=7)
for ax in axes[0, :]:
    ax.set_ylabel("单位曲率下的带符号密度传输")
    ax.set_yscale("symlog", linscale=1.0e-3)
axes[1, 0].set_ylabel("带符号密度传输")
axes[1, 1].set_ylabel("相对差绝对值")
axes[1, 1].set_yscale("log")
fig.suptitle("原生传输函数与零交叉；symlog 仅用于显示，不进入统计", fontsize=14)
fig.savefig(FIGURE_PATH, bbox_inches="tight", metadata={"Date": None})
FIGURE_PATH.write_text(
    "\n".join(line.rstrip() for line in FIGURE_PATH.read_text(encoding="utf-8").splitlines()) + "\n",
    encoding="utf-8",
)
PREVIEW_PATH.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(PREVIEW_PATH, dpi=150, bbox_inches="tight", metadata={"Software": "native-transfer-v1"})

print(json.dumps({
    "status": summary["status"],
    "sources": {
        name: {
            "native_points": record["native_points"],
            "native_zero_crossing_count": record["native_zero_crossing_count"],
            "common_grid_zero_crossing_count": record["common_grid_zero_crossing_count"],
            "power_reconstruction": record["power_reconstruction"],
        }
        for name, record in source_records.items()
    },
    "crossing_comparisons": comparison_records,
    "summary": str(SUMMARY_PATH),
    "figure": str(FIGURE_PATH),
    "preview": str(PREVIEW_PATH),
}, ensure_ascii=False, indent=2))
