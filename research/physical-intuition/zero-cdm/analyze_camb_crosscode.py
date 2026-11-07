"""Analyze frozen CAMB runs against the CLASS integral reference."""

import hashlib
import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
CAMB_ROOT = REPO / ".tmp/camb-runs"
CLASS_ROOT = REPO / ".tmp/class_public/convergence/integral"
LEVELS = ["fiducial", "high", "ultra"]
KS = [0.001, 0.01, 0.05, 0.1, 0.5, 1.0]
ELLS = [100, 200, 500, 1000, 2000]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pk_at(data, k):
    return float(np.exp(np.interp(np.log(k), np.log(data[:, 0]), np.log(data[:, 1]))))


def camb_pk_at(spectra, k):
    return float(np.exp(np.interp(
        np.log(k),
        np.log(spectra["pk_k_h_per_Mpc"]),
        np.log(spectra["pk_p_Mpc_over_h_cubed"]),
    )))


def cl_at(data, ell, column):
    index = int(np.argmin(np.abs(data[:, 0] - ell)))
    return float(data[index, column])


def peaks(data, start=50, stop=1500):
    records = []
    for i in range(1, len(data) - 1):
        ell = int(data[i, 0])
        if ell < start or ell > stop:
            continue
        if data[i, 1] >= data[i - 1, 1] and data[i, 1] > data[i + 1, 1]:
            records.append({"ell": ell, "value": float(data[i, 1])})
    return records[:4]


def camb_peaks(tt, start=50, stop=1500):
    return peaks(np.column_stack((np.arange(len(tt)), tt)), start=start, stop=stop)


def change(new, old):
    return new / old - 1.0


camb = {
    level: {
        model: {
            "spectra": np.load(CAMB_ROOT / level / model / "spectra.npz"),
            "summary": json.loads((CAMB_ROOT / level / model / "summary.json").read_text(encoding="utf-8")),
        }
        for model in ["zero", "baseline"]
    }
    for level in LEVELS
}
class_data = {
    model: {
        "cl": np.loadtxt(CLASS_ROOT / f"{prefix}_cl.dat", comments="#"),
        "pk": np.loadtxt(CLASS_ROOT / f"{prefix}_pk.dat", comments="#"),
    }
    for model, prefix in [("zero", "zero-cdm-integral00"), ("baseline", "baseline-lcdm-integral00")]
}
class_convergence = json.loads((OUT / "convergence-summary.json").read_text(encoding="utf-8"))
protocol = json.loads((OUT / "camb-crosscode-protocol.json").read_text(encoding="utf-8"))
amendment = json.loads((OUT / "camb-crosscode-amendment-04.json").read_text(encoding="utf-8"))

pk_records = []
for k in KS:
    class_zero = pk_at(class_data["zero"]["pk"], k)
    class_baseline = pk_at(class_data["baseline"]["pk"], k)
    class_ratio = class_zero / class_baseline
    row = {
        "k_h_per_Mpc": k,
        "class_integral": {
            "zero_p": class_zero,
            "baseline_p": class_baseline,
            "zero_over_baseline": class_ratio,
        },
        "camb_levels": {},
    }
    for level in LEVELS:
        zero = camb_pk_at(camb[level]["zero"]["spectra"], k)
        baseline = camb_pk_at(camb[level]["baseline"]["spectra"], k)
        ratio = zero / baseline
        row["camb_levels"][level] = {
            "zero_p": zero,
            "baseline_p": baseline,
            "zero_over_baseline": ratio,
            "camb_over_class_ratio_minus_1": change(ratio, class_ratio),
        }
    row["camb_internal_fractional_change"] = {
        "high_over_fiducial_minus_1": change(
            row["camb_levels"]["high"]["zero_over_baseline"],
            row["camb_levels"]["fiducial"]["zero_over_baseline"],
        ),
        "ultra_over_high_minus_1": change(
            row["camb_levels"]["ultra"]["zero_over_baseline"],
            row["camb_levels"]["high"]["zero_over_baseline"],
        ),
    }
    pk_records.append(row)

cl_records = []
for ell in ELLS:
    class_zero_tt = cl_at(class_data["zero"]["cl"], ell, 1)
    class_baseline_tt = cl_at(class_data["baseline"]["cl"], ell, 1)
    class_zero_pp = cl_at(class_data["zero"]["cl"], ell, 5)
    class_baseline_pp = cl_at(class_data["baseline"]["cl"], ell, 5)
    class_tt_ratio = class_zero_tt / class_baseline_tt
    class_pp_ratio = class_zero_pp / class_baseline_pp
    row = {
        "ell": ell,
        "class_integral": {
            "zero_tt": class_zero_tt,
            "baseline_tt": class_baseline_tt,
            "zero_phiphi": class_zero_pp,
            "baseline_phiphi": class_baseline_pp,
            "zero_over_baseline_tt": class_tt_ratio,
            "zero_over_baseline_phiphi": class_pp_ratio,
        },
        "camb_levels": {},
    }
    for level in LEVELS:
        zero_tt = float(camb[level]["zero"]["spectra"]["tt_unlensed"][ell])
        baseline_tt = float(camb[level]["baseline"]["spectra"]["tt_unlensed"][ell])
        zero_pp = float(camb[level]["zero"]["spectra"]["pp_deflection"][ell] / (ell * (ell + 1)))
        baseline_pp = float(camb[level]["baseline"]["spectra"]["pp_deflection"][ell] / (ell * (ell + 1)))
        tt_ratio = zero_tt / baseline_tt
        pp_ratio = zero_pp / baseline_pp
        row["camb_levels"][level] = {
            "zero_tt": zero_tt,
            "baseline_tt": baseline_tt,
            "zero_phiphi_class_convention": zero_pp,
            "baseline_phiphi_class_convention": baseline_pp,
            "zero_over_baseline_tt": tt_ratio,
            "zero_over_baseline_phiphi": pp_ratio,
            "camb_over_class_tt_ratio_minus_1": change(tt_ratio, class_tt_ratio),
            "camb_over_class_phiphi_ratio_minus_1": change(pp_ratio, class_pp_ratio),
        }
    row["camb_internal_fractional_change"] = {}
    for name, ratio_key in [("tt", "zero_over_baseline_tt"), ("phiphi", "zero_over_baseline_phiphi")]:
        row["camb_internal_fractional_change"][name] = {
            "high_over_fiducial_minus_1": change(
                row["camb_levels"]["high"][ratio_key], row["camb_levels"]["fiducial"][ratio_key]
            ),
            "ultra_over_high_minus_1": change(
                row["camb_levels"]["ultra"][ratio_key], row["camb_levels"]["high"][ratio_key]
            ),
        }
    cl_records.append(row)

background = {}
for model in ["zero", "baseline"]:
    class_bg = class_convergence["backgrounds"]["integral"][model]
    background[model] = {"class_integral": class_bg, "camb_levels": {}}
    for level in LEVELS:
        camb_bg = camb[level][model]["summary"]["background_z0"]
        background[model]["camb_levels"][level] = {
            **camb_bg,
            "rho_de_camb_over_class_minus_1": change(
                camb_bg["rho_de_over_rho_tot"], class_bg["rho_lambda_over_rho_total"]
            ),
            "omega_m_camb_over_class_minus_1": change(camb_bg["Omega_matter"], class_bg["Omega_m"]),
            "growth_diagnostic_camb_over_class_f_minus_1": change(
                camb_bg["fsigma8_over_sigma8"], class_bg["growth_f"]
            ),
        }

max_pk_cross = max(abs(row["camb_levels"]["ultra"]["camb_over_class_ratio_minus_1"]) for row in pk_records)
max_tt_cross = max(abs(row["camb_levels"]["ultra"]["camb_over_class_tt_ratio_minus_1"]) for row in cl_records)
max_pp_cross = max(abs(row["camb_levels"]["ultra"]["camb_over_class_phiphi_ratio_minus_1"]) for row in cl_records)
max_camb_pk_internal = max(abs(row["camb_internal_fractional_change"]["ultra_over_high_minus_1"]) for row in pk_records)
max_camb_pp_internal = max(
    abs(row["camb_internal_fractional_change"]["phiphi"]["ultra_over_high_minus_1"]) for row in cl_records
)
primary_pk = [row for row in pk_records if 0.01 <= row["k_h_per_Mpc"] <= 0.1]
max_primary_pk_cross = max(abs(row["camb_levels"]["ultra"]["camb_over_class_ratio_minus_1"]) for row in primary_pk)
summary = {
    "status": "computed_crosscode_fixed_inputs_corrected_tt_not_observational_fit",
    "tt_convention": "CAMB unlensed_scalar compared with CLASS cl.dat；CAMB lensed_scalar 只能与 CLASS cl_lensed.dat 比较。旧混合口径由 amendment-04 修正。",
    "matter_density_convention": "CLASS mPk uses delta_m; with default matter_source_in_current_gauge=false it is the gauge-invariant comoving matter density even when integration is Newtonian. CAMB delta_tot is synchronous gauge. See amendment-05.",
    "camb_version": "2.0.5",
    "camb_source_commit": "72b5a4ca5df1335674e2eacad9b9a887194f9677",
    "class_source_commit": "2d88c3f650b691d2b13165e826697f43ef2530c4",
    "class_reference_level": "integral",
    "best_available_camb_level": "ultra",
    "best_available_is_not_convergence_claim": True,
    "recombination_systematic": "CLASS HyRec 2020 versus CAMB Recfast; PyPI wheel lacked optional HyRec.",
    "change_units": "All change fields are fractions, not percentages; 0.01 means 1%.",
    "pk_comparisons": pk_records,
    "cl_comparisons": cl_records,
    "background_comparisons": background,
    "tt_peaks": {
        "class_integral": {
            model: peaks(class_data[model]["cl"]) for model in ["zero", "baseline"]
        },
        "camb_levels": {
            level: {
                model: camb_peaks(camb[level][model]["spectra"]["tt_unlensed"]) for model in ["zero", "baseline"]
            }
            for level in LEVELS
        },
    },
    "robustness": {
        "max_primary_pk_crosscode_fraction_k_0.01_to_0.1": max_primary_pk_cross,
        "primary_pk_crosscode_within_0.5_percent": max_primary_pk_cross <= 0.005,
        "max_ultra_tt_crosscode_fraction": max_tt_cross,
        "max_ultra_phiphi_crosscode_fraction": max_pp_cross,
        "max_ultra_over_high_pk_internal_fraction": max_camb_pk_internal,
        "max_ultra_over_high_phiphi_internal_fraction": max_camb_pp_internal,
        "extreme_pk_not_crosscode_robust": max_pk_cross > 0.05 and max_camb_pk_internal > 0.05,
        "phiphi_crosscode_agreement_is_not_internal_convergence": max_camb_pp_internal > 0.01,
        "max_ultra_over_class_background_fraction": max(
            abs(model["camb_levels"]["ultra"][key])
            for model in background.values()
            for key in ["rho_de_camb_over_class_minus_1", "omega_m_camb_over_class_minus_1"]
        ),
    },
    "validation": {
        "all_camb_summaries_finite": all(
            camb[level][model]["summary"]["validation"]["all_output_finite"]
            for level in LEVELS for model in ["zero", "baseline"]
        ),
        "zero_model_omch2_exactly_zero": all(
            camb[level]["zero"]["summary"]["actual_parameters"]["omch2"] == 0.0
            and camb[level]["zero"]["summary"]["validation"]["omch2_exactly_zero"]
            for level in LEVELS
        ),
        "nonlinear_disabled_all_levels": all(
            camb[level][model]["summary"]["validation"]["nonlinear_disabled"]
            for level in LEVELS for model in ["zero", "baseline"]
        ),
        "runner_hash_matches_frozen_ultra_amendment": sha256(OUT / "camb_crosscode.py") == amendment["updated_runner_sha256"],
        "class_reference_hash_matches_protocol": sha256(OUT / "convergence-summary.json") == protocol["class_convergence_summary_sha256"],
    },
    "resource_usage": {
        level: {
            model: {
                "elapsed_seconds": camb[level][model]["summary"]["elapsed_seconds"],
                "maximum_rss_kib": camb[level][model]["summary"]["maximum_rss_kib"],
            }
            for model in ["zero", "baseline"]
        }
        for level in LEVELS
    },
    "raw_output_sha256": {
        level: {
            model: {
                "spectra.npz": sha256(CAMB_ROOT / level / model / "spectra.npz"),
                "summary.json": sha256(CAMB_ROOT / level / model / "summary.json"),
                "parameters.ini": sha256(CAMB_ROOT / level / model / "parameters.ini"),
            }
            for model in ["zero", "baseline"]
        }
        for level in LEVELS
    },
    "analysis_runner_sha256": sha256(Path(__file__).resolve()),
    "boundaries": [
        "k=0.001 is secondary because CLASS delta_m is gauge-invariant comoving by default while CAMB delta_tot is synchronous; Newtonian is the CLASS integration gauge, not the default mPk output gauge.",
        "Extreme P(k) point ratios near deep oscillation minima are not robust across codes or CAMB accuracy levels.",
        "High-ell lensing agreement at ultra does not erase the large high-to-ultra internal change.",
        "TT differences may include recombination systematics; the current comparison does not prove their origin.",
        "No likelihood, parameter search, joint BBN, nonlinear calculation, or observational exclusion.",
    ],
}
(OUT / "camb-crosscode-summary.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)

plt.rcParams.update({
    "font.size": 9,
    "font.sans-serif": ["Microsoft YaHei", "SimHei", "DejaVu Sans"],
    "svg.hashsalt": "camb-class-crosscode-v1",
})
fig, axes = plt.subplots(1, 3, figsize=(16, 4.7), constrained_layout=True)
colors = {"class": "#111827", "fiducial": "#6b7280", "high": "#2563a6", "ultra": "#c94f32"}
k_dense = np.logspace(-3, 0, 300)
class_ratio_dense = np.exp(np.interp(np.log(k_dense), np.log(class_data["zero"]["pk"][:, 0]), np.log(class_data["zero"]["pk"][:, 1]))) / np.exp(np.interp(np.log(k_dense), np.log(class_data["baseline"]["pk"][:, 0]), np.log(class_data["baseline"]["pk"][:, 1])))
axes[0].loglog(k_dense, class_ratio_dense, color=colors["class"], lw=1.5, label="CLASS integral")
for level in LEVELS:
    ratio = np.exp(np.interp(np.log(k_dense), np.log(camb[level]["zero"]["spectra"]["pk_k_h_per_Mpc"]), np.log(camb[level]["zero"]["spectra"]["pk_p_Mpc_over_h_cubed"]))) / np.exp(np.interp(np.log(k_dense), np.log(camb[level]["baseline"]["spectra"]["pk_k_h_per_Mpc"]), np.log(camb[level]["baseline"]["spectra"]["pk_p_Mpc_over_h_cubed"])))
    axes[0].loglog(k_dense, ratio, color=colors[level], lw=1.15, label=f"CAMB {level}")
axes[0].set(title="物质谱比值：零模型／ΛCDM", xlabel="k [h/Mpc]", ylabel="比值")
axes[0].legend(frameon=False, fontsize=8)
for level in LEVELS:
    axes[1].loglog(
        KS,
        [abs(row["camb_levels"][level]["camb_over_class_ratio_minus_1"]) * 100 for row in pk_records],
        color=colors[level], marker="o", lw=1.15, label=f"CAMB {level}／CLASS−1",
    )
axes[1].axhline(5.0, color="#444444", ls="--", lw=1, label="5% 复查线")
axes[1].set(title="物质谱比值的跨代码差异", xlabel="k [h/Mpc]", ylabel="差异绝对值 [%]")
axes[1].legend(frameon=False, fontsize=8)
axes[2].loglog(
    ELLS,
    [abs(row["camb_levels"]["ultra"]["camb_over_class_tt_ratio_minus_1"]) * 100 for row in cl_records],
    color="#c94f32", marker="o", lw=1.2, label="TT：ultra／CLASS−1",
)
for level, color in [("high", "#2563a6"), ("ultra", "#2c7a5b")]:
    axes[2].loglog(
        ELLS,
        [abs(row["camb_levels"][level]["camb_over_class_phiphi_ratio_minus_1"]) * 100 for row in cl_records],
        color=color, marker="s", lw=1.2, label=f"透镜：{level}／CLASS−1",
    )
axes[2].axhline(5.0, color="#444444", ls="--", lw=1)
axes[2].set(title="CMB 比值的跨代码差异", xlabel="多极矩 ℓ", ylabel="差异绝对值 [%]")
axes[2].legend(frameon=False, fontsize=8)
for ax in axes:
    ax.grid(alpha=0.25, which="both")
fig.suptitle("CLASS–CAMB 固定输入对照；极端点值仍需保留不确定性", fontsize=13)
svg_path = OUT / "camb-crosscode-comparison.svg"
fig.savefig(svg_path, bbox_inches="tight", metadata={"Date": None})
svg_path.write_text("\n".join(line.rstrip() for line in svg_path.read_text(encoding="utf-8").splitlines()) + "\n", encoding="utf-8")
print(json.dumps({
    "robustness": summary["robustness"],
    "ultra_pk_ratios": {row["k_h_per_Mpc"]: row["camb_levels"]["ultra"]["zero_over_baseline"] for row in pk_records},
    "class_pk_ratios": {row["k_h_per_Mpc"]: row["class_integral"]["zero_over_baseline"] for row in pk_records},
    "ultra_peaks": summary["tt_peaks"]["camb_levels"]["ultra"],
    "class_peaks": summary["tt_peaks"]["class_integral"],
}, ensure_ascii=False, indent=2))
