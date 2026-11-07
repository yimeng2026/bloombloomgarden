"""Frozen log-smoothed and band-power diagnostics for existing zero-CDM spectra.

Run `python analyze_pk_bandpowers.py --freeze` once before analysis. The normal
run refuses changed inputs, code, grid, bands, or smoothing definitions.
"""

import argparse
import hashlib
import json
from datetime import datetime
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
CLASS_ROOT = REPO / ".tmp/class_public/convergence"
CAMB_ROOT = REPO / ".tmp/camb-runs"
PROTOCOL_PATH = OUT / "pk-bandpower-protocol.json"
SUMMARY_PATH = OUT / "pk-bandpower-summary.json"
FIGURE_PATH = OUT / "pk-bandpower-comparison.svg"
METHODS = {"raw": None, "smooth_0.05dex": 0.05, "smooth_0.10dex": 0.10}
GRID = {"minimum_k": 0.005, "maximum_k": 2.0, "point_count": 2603}
BAND_EDGES = [0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28]
EXTREME_MIN_K = 0.16
COMPARISONS = {
    "camb_ultra_over_class_integral": ("camb_ultra", "class_integral"),
    "class_recfast_over_camb_ultra": ("class_recfast", "camb_ultra"),
    "class_recfast_over_class_integral": ("class_recfast", "class_integral"),
    "camb_ultra_over_camb_high": ("camb_ultra", "camb_high"),
    "camb_high_over_camb_fiducial": ("camb_high", "camb_fiducial"),
    "class_integral_over_class_pk_ref": ("class_integral", "class_pk_ref"),
}


def class_source(directory, zero_prefix, baseline_prefix):
    return {
        "kind": "class",
        "zero": CLASS_ROOT / directory / f"{zero_prefix}_pk.dat",
        "baseline": CLASS_ROOT / directory / f"{baseline_prefix}_pk.dat",
    }


def camb_source(level):
    return {
        "kind": "camb",
        "zero": CAMB_ROOT / level / "zero/spectra.npz",
        "baseline": CAMB_ROOT / level / "baseline/spectra.npz",
    }


SOURCES = {
    "class_pk_ref": class_source("pk_ref", "zero-cdm-pkref00", "baseline-lcdm-pkref00"),
    "class_integral": class_source("integral", "zero-cdm-integral00", "baseline-lcdm-integral00"),
    "class_recfast": class_source("recfast", "zero-cdm-recfast00", "baseline-lcdm-recfast00"),
    "camb_fiducial": camb_source("fiducial"),
    "camb_high": camb_source("high"),
    "camb_ultra": camb_source("ultra"),
}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def relative(path):
    return str(Path(path).relative_to(REPO)).replace("\\", "/")


def source_manifest():
    return {
        name: {
            model: {"path": relative(path), "sha256": sha256(path)}
            for model, path in spec.items()
            if model != "kind"
        } | {"kind": spec["kind"]}
        for name, spec in SOURCES.items()
    }


def protocol_definition():
    return {
        "status": "frozen_before_any_bandpower_statistic",
        "frozen_at_local": datetime.now().astimezone().isoformat(),
        "analysis_runner": relative(Path(__file__).resolve()),
        "analysis_runner_sha256": sha256(Path(__file__).resolve()),
        "statistics_helper_sha256": sha256(OUT / "pk_band_statistics.py"),
        "unit_tests_sha256": sha256(OUT / "tests/test_pk_band_statistics.py"),
        "grid": GRID,
        "band_edges_h_per_Mpc": BAND_EDGES,
        "extreme_band_lower_edge_h_per_Mpc": EXTREME_MIN_K,
        "smoothing": {
            "coordinate": "uniform log10(k)",
            "quantity": "natural log of each positive P(k), separately for zero and baseline",
            "sigmas_dex": [0.05, 0.10],
            "primary_sigma_dex": 0.05,
            "truncate_at_sigma": 3.0,
            "edge_rule": "renormalize the available truncated Gaussian weights; no reflection or extrapolation",
            "sensitivity_rule": "0.10 dex is a registered sensitivity check, not a post-hoc choice",
        },
        "integration": {
            "dimensionless_power": "Delta^2(k) = k^3 P(k)/(2 pi^2)",
            "band_statistic": "mean of Delta^2 over dln(k) between exact band edges",
            "interpolation": "linear in log(k) and log(P); add exact band edges before trapezoid integration",
            "ratio_rule": "integrate zero and baseline separately, then divide; never average point ratios",
            "not_a_survey_window": "fixed log-band diagnostic, not survey band powers, top-hat variance, or observational errors",
        },
        "signed_statistics": {
            "model_ratio": "ln[(zero band power)/(baseline band power)]",
            "comparison": "ln[(first model ratio)/(second model ratio)]; orientation is explicit in comparison names",
            "information_boundary": "P(k) is positive and does not encode the sign of delta(k); these are signed log ratios, not signed density transfer functions",
        },
        "comparisons": COMPARISONS,
        "sources": source_manifest(),
        "source_limitations": [
            "CAMB spectra are 2500-point samples of the saved matter-power interpolator, not saved signed transfer functions.",
            "CLASS pk.dat contains positive matter power spectra, not signed density transfer functions.",
            "CLASS Newtonian and CAMB synchronous densities are not naively gauge identical; k>=0.01 remains the registered comparison range.",
            "The bands and smoothing diagnose numerical stability only; they do not create an observational likelihood.",
        ],
        "boundaries": [
            "No new physical run, parameter fitting, or retuning is performed.",
            "No likelihood, covariance, parameter search, joint BBN, nonlinear calculation, or model-family exclusion.",
            "Smoothing sensitivity and cross-code differences remain visible; no single extreme point is promoted to a best answer.",
        ],
    }


def freeze_protocol():
    if PROTOCOL_PATH.exists():
        raise FileExistsError(f"Refusing to overwrite frozen protocol: {PROTOCOL_PATH}")
    PROTOCOL_PATH.write_text(
        json.dumps(protocol_definition(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(PROTOCOL_PATH)


def validate_protocol(protocol):
    # JSON turns comparison tuples into arrays; compare the serialized domain model.
    expected = json.loads(json.dumps(protocol_definition(), ensure_ascii=False))
    for key in [
        "analysis_runner_sha256",
        "statistics_helper_sha256",
        "unit_tests_sha256",
        "grid",
        "band_edges_h_per_Mpc",
        "extreme_band_lower_edge_h_per_Mpc",
        "smoothing",
        "integration",
        "signed_statistics",
        "comparisons",
        "sources",
    ]:
        if protocol[key] != expected[key]:
            raise ValueError(f"Frozen protocol mismatch: {key}")
    if protocol["status"] != "frozen_before_any_bandpower_statistic":
        raise ValueError("Unexpected protocol status")


def read_spectrum(spec, model):
    path = spec[model]
    if spec["kind"] == "class":
        data = np.loadtxt(path, comments="#")
        return data[:, 0], data[:, 1]
    data = np.load(path)
    return data["pk_k_h_per_Mpc"], data["pk_p_Mpc_over_h_cubed"]


def prepare_curves(protocol):
    grid_spec = protocol["grid"]
    log10_k = np.linspace(
        np.log10(grid_spec["minimum_k"]),
        np.log10(grid_spec["maximum_k"]),
        grid_spec["point_count"],
    )
    k = 10.0**log10_k
    curves = {}
    for name, spec in SOURCES.items():
        curves[name] = {}
        for model in ["zero", "baseline"]:
            source_k, source_power = read_spectrum(spec, model)
            raw_log_power = resample_log_spectrum(source_k, source_power, log10_k)
            curves[name][model] = {"raw": raw_log_power}
            for method, sigma in METHODS.items():
                if sigma is not None:
                    curves[name][model][method] = gaussian_smooth_log10_spectrum(
                        log10_k,
                        raw_log_power,
                        sigma,
                        protocol["smoothing"]["truncate_at_sigma"],
                    )
    return k, log10_k, curves


def calculate_band_statistics(k, curves, edges):
    bands = []
    for lower, upper in zip(edges[:-1], edges[1:]):
        record = {
            "lower_k_h_per_Mpc": lower,
            "upper_k_h_per_Mpc": upper,
            "geometric_center_k_h_per_Mpc": float(np.sqrt(lower * upper)),
            "sources": {},
            "comparisons": {},
        }
        for name, models in curves.items():
            record["sources"][name] = {}
            for method in METHODS:
                zero = log_bandpower(k, np.exp(models["zero"][method]), lower, upper)
                baseline = log_bandpower(k, np.exp(models["baseline"][method]), lower, upper)
                record["sources"][name][method] = {
                    "zero_bandpower": zero,
                    "baseline_bandpower": baseline,
                    "zero_over_baseline": zero / baseline,
                    "signed_ln_zero_over_baseline": signed_log_ratio(zero, baseline),
                }
        for comparison, (first, second) in COMPARISONS.items():
            record["comparisons"][comparison] = {}
            for method in METHODS:
                first_ratio = record["sources"][first][method]["zero_over_baseline"]
                second_ratio = record["sources"][second][method]["zero_over_baseline"]
                record["comparisons"][comparison][method] = {
                    "signed_ln_ratio_difference": signed_log_ratio(first_ratio, second_ratio)
                }
        bands.append(record)
    return bands


def robustness_statistics(bands):
    output = {}
    for comparison in COMPARISONS:
        output[comparison] = {}
        for method in METHODS:
            rows = [
                {
                    "lower_k": band["lower_k_h_per_Mpc"],
                    "upper_k": band["upper_k_h_per_Mpc"],
                    "absolute_signed_ln_difference": abs(
                        band["comparisons"][comparison][method]["signed_ln_ratio_difference"]
                    ),
                }
                for band in bands
            ]
            extreme = [row for row in rows if row["lower_k"] >= EXTREME_MIN_K]
            maximum = max(rows, key=lambda row: row["absolute_signed_ln_difference"])
            maximum_extreme = max(extreme, key=lambda row: row["absolute_signed_ln_difference"])
            output[comparison][method] = {
                "max_abs_ln_difference_all_bands": maximum["absolute_signed_ln_difference"],
                "max_abs_ln_difference_band": [maximum["lower_k"], maximum["upper_k"]],
                "max_abs_ln_difference_extreme_bands": maximum_extreme["absolute_signed_ln_difference"],
                "max_abs_ln_difference_extreme_band": [
                    maximum_extreme["lower_k"],
                    maximum_extreme["upper_k"],
                ],
            }
    return output


def make_figure(k, curves, bands):
    plt.rcParams.update({
        "font.size": 9,
        "font.sans-serif": ["Microsoft YaHei", "SimHei", "DejaVu Sans"],
        "svg.hashsalt": "zero-cdm-bandpower-v1",
    })
    fig, axes = plt.subplots(2, 2, figsize=(13, 9), constrained_layout=True)
    shown = {
        "class_integral": ("CLASS HyRec integral", "#111827"),
        "class_recfast": ("CLASS RECFAST", "#2c7a5b"),
        "camb_ultra": ("CAMB Recfast ultra", "#c94f32"),
    }
    selected = (k >= BAND_EDGES[0]) & (k <= BAND_EDGES[-1])
    for method, ax in [("raw", axes[0, 0]), ("smooth_0.05dex", axes[0, 1])]:
        for name, (label, color) in shown.items():
            ratio = np.exp(curves[name]["zero"][method] - curves[name]["baseline"][method])
            ax.loglog(k[selected], ratio[selected], color=color, lw=1.25, label=label)
        ax.set(xlabel="k [h/Mpc]", ylabel="零模型／ΛCDM")
        ax.legend(frameon=False, fontsize=8)
    axes[0, 0].set_title("未平滑的对数插值谱")
    axes[0, 1].set_title("0.05 dex 高斯平滑后的谱")
    centers = np.array([band["geometric_center_k_h_per_Mpc"] for band in bands])
    for name, (label, color) in shown.items():
        for method, marker, fill in [("raw", "o", "none"), ("smooth_0.05dex", "s", color)]:
            ratios = [band["sources"][name][method]["zero_over_baseline"] for band in bands]
            axes[1, 0].loglog(
                centers,
                ratios,
                marker=marker,
                color=color,
                lw=1.0 if method == "raw" else 1.5,
                markersize=5,
                markerfacecolor=fill,
                label=f"{label}；{'原始' if method == 'raw' else '平滑'}",
            )
    axes[1, 0].set(
        title="先积分再求比的固定对数带功率",
        xlabel="带几何中心 k [h/Mpc]",
        ylabel="零模型／ΛCDM 带功率比",
    )
    axes[1, 0].legend(frameon=False, fontsize=7, ncol=2)
    comparison_styles = {
        "camb_ultra_over_class_integral": ("CAMB ultra／CLASS integral", "#c94f32"),
        "camb_ultra_over_camb_high": ("CAMB ultra／high", "#2563a6"),
        "class_integral_over_class_pk_ref": ("CLASS integral／pk_ref", "#6b4fa1"),
    }
    for comparison, (label, color) in comparison_styles.items():
        for method, linestyle in [("raw", ":"), ("smooth_0.05dex", "-")]:
            differences = [
                abs(band["comparisons"][comparison][method]["signed_ln_ratio_difference"])
                for band in bands
            ]
            axes[1, 1].plot(
                centers,
                differences,
                color=color,
                linestyle=linestyle,
                marker="o",
                lw=1.4,
                label=f"{label}；{'原始' if method == 'raw' else '平滑'}",
            )
    axes[1, 1].set(
        title="带功率比值的有符号对数偏差（绝对值绘图）",
        xlabel="带几何中心 k [h/Mpc]",
        ylabel="|ln(R_first / R_second)|",
        xscale="log",
    )
    axes[1, 1].legend(frameon=False, fontsize=7)
    for ax in axes.flat:
        ax.grid(alpha=0.25, which="both")
    fig.suptitle("零模型物质谱：平滑与带功率诊断；无观测误差棒", fontsize=14)
    preview_path = REPO / ".tmp/pk-bandpower-comparison-preview.png"
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(
        preview_path,
        dpi=150,
        bbox_inches="tight",
        metadata={"Software": "zero-cdm-bandpower-v1"},
    )
    fig.savefig(FIGURE_PATH, bbox_inches="tight", metadata={"Date": None})
    FIGURE_PATH.write_text(
        "\n".join(line.rstrip() for line in FIGURE_PATH.read_text(encoding="utf-8").splitlines()) + "\n",
        encoding="utf-8",
    )


def analyze():
    protocol = json.loads(PROTOCOL_PATH.read_text(encoding="utf-8"))
    validate_protocol(protocol)
    k, log10_k, curves = prepare_curves(protocol)
    bands = calculate_band_statistics(k, curves, protocol["band_edges_h_per_Mpc"])
    robustness = robustness_statistics(bands)
    summary = {
        "status": "computed_frozen_log_smoothed_bandpower_diagnostics_not_observational_fit",
        "protocol": relative(PROTOCOL_PATH),
        "protocol_sha256": sha256(PROTOCOL_PATH),
        "analysis_runner_sha256": sha256(Path(__file__).resolve()),
        "statistics_helper_sha256": sha256(OUT / "pk_band_statistics.py"),
        "grid": protocol["grid"],
        "grid_log10_step_dex": float(log10_k[1] - log10_k[0]),
        "band_statistics": bands,
        "robustness": robustness,
        "validation": {
            "all_bandpowers_finite_and_positive": all(
                np.isfinite(values[key]) and values[key] > 0.0
                for band in bands
                for methods in band["sources"].values()
                for values in methods.values()
                for key in ["zero_bandpower", "baseline_bandpower", "zero_over_baseline"]
            ),
            "source_and_code_hashes_match_frozen_protocol": True,
            "signed_density_transfer_available": False,
            "signed_values_are_log_ratios_only": True,
            "observational_errors_or_covariance_included": False,
        },
        "boundaries": protocol["boundaries"] + protocol["source_limitations"],
    }
    SUMMARY_PATH.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    make_figure(k, curves, bands)
    compact_bands = [
        {
            "band": [band["lower_k_h_per_Mpc"], band["upper_k_h_per_Mpc"]],
            "ratios_smooth_0.05dex": {
                name: band["sources"][name]["smooth_0.05dex"]["zero_over_baseline"]
                for name in ["class_integral", "class_recfast", "camb_ultra"]
            },
        }
        for band in bands
    ]
    print(json.dumps({
        "status": summary["status"],
        "validation": summary["validation"],
        "robustness": robustness,
        "bands": compact_bands,
        "summary": str(SUMMARY_PATH),
        "figure": str(FIGURE_PATH),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--freeze", action="store_true", help="freeze inputs and definitions before analysis")
    args = parser.parse_args()
    if args.freeze:
        freeze_protocol()
    else:
        analyze()
