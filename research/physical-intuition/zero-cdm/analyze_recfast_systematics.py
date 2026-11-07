"""Evaluate whether CLASS RECFAST closes the CLASS–CAMB TT residual."""

import hashlib
import json
import re
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
CLASS_ROOT = REPO / ".tmp/class_public/convergence"
CAMB_ROOT = REPO / ".tmp/camb-runs/ultra"
ELLS = [100, 200, 500, 1000, 2000]
KS = [0.001, 0.01, 0.05, 0.1, 0.5, 1.0]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_class(level, model, kind):
    prefixes = {
        "hyrec": {"zero": "zero-cdm-integral00", "baseline": "baseline-lcdm-integral00"},
        "recfast": {"zero": "zero-cdm-recfast00", "baseline": "baseline-lcdm-recfast00"},
    }
    directory = "integral" if level == "hyrec" else "recfast"
    return np.loadtxt(CLASS_ROOT / directory / f"{prefixes[level][model]}_{kind}.dat", comments="#")


def cl_at(data, ell, column):
    return float(data[int(np.argmin(np.abs(data[:, 0] - ell))), column])


def pk_at(data, k):
    return float(np.exp(np.interp(np.log(k), np.log(data[:, 0]), np.log(data[:, 1]))))


def camb_pk_at(spectra, k):
    return float(np.exp(np.interp(
        np.log(k), np.log(spectra["pk_k_h_per_Mpc"]), np.log(spectra["pk_p_Mpc_over_h_cubed"])
    )))


def peaks(data, start=50, stop=1500):
    records = []
    for i in range(1, len(data) - 1):
        ell = int(data[i, 0])
        if ell < start or ell > stop:
            continue
        if data[i, 1] >= data[i - 1, 1] and data[i, 1] > data[i + 1, 1]:
            records.append({"ell": ell, "value": float(data[i, 1])})
    return records[:4]


def change(new, old):
    return new / old - 1.0


def class_background(model):
    data = load_class("recfast", model, "background")
    row = data[np.argmin(np.abs(data[:, 0]))]
    offset = 1 if model == "baseline" else 0
    return {
        "rho_lambda_over_rho_total": float(row[10 + offset] / row[13 + offset]),
        "Omega_m": float(row[17 + offset]),
        "growth_f": float(row[19 + offset]),
    }


def resource(model):
    prefix = "baseline-lcdm" if model == "baseline" else "zero-cdm"
    text = (CLASS_ROOT / f"recfast/{prefix}-recfast.run.log").read_text(encoding="utf-8")
    maximum = re.search(r"Maximum resident set size \(kbytes\): (\d+)", text)
    status = re.search(r"Exit status: (\d+)", text)
    elapsed = re.search(r"Elapsed \(wall clock\) time.*: ([^\n]+)", text)
    return {
        "maximum_rss_kib": int(maximum.group(1)),
        "exit_status": int(status.group(1)),
        "elapsed": elapsed.group(1).strip(),
    }


A = {model: {"cl": load_class("hyrec", model, "cl"), "pk": load_class("hyrec", model, "pk")} for model in ["zero", "baseline"]}
C = {model: {"cl": load_class("recfast", model, "cl"), "pk": load_class("recfast", model, "pk")} for model in ["zero", "baseline"]}
B = {model: np.load(CAMB_ROOT / model / "spectra.npz") for model in ["zero", "baseline"]}
class_convergence = json.loads((OUT / "convergence-summary.json").read_text(encoding="utf-8"))
crosscode = json.loads((OUT / "camb-crosscode-summary.json").read_text(encoding="utf-8"))
protocol = json.loads((OUT / "class-recfast-protocol.json").read_text(encoding="utf-8"))

cl_records = []
for ell in ELLS:
    row = {"ell": ell}
    for name, data in [("A_class_hyrec", A), ("C_class_recfast", C)]:
        zero_tt = cl_at(data["zero"]["cl"], ell, 1)
        baseline_tt = cl_at(data["baseline"]["cl"], ell, 1)
        zero_pp = cl_at(data["zero"]["cl"], ell, 5)
        baseline_pp = cl_at(data["baseline"]["cl"], ell, 5)
        row[name] = {
            "zero_over_baseline_tt": zero_tt / baseline_tt,
            "zero_over_baseline_phiphi": zero_pp / baseline_pp,
        }
    zero_tt = float(B["zero"]["tt"][ell])
    baseline_tt = float(B["baseline"]["tt"][ell])
    zero_pp = float(B["zero"]["pp_deflection"][ell] / (ell * (ell + 1)))
    baseline_pp = float(B["baseline"]["pp_deflection"][ell] / (ell * (ell + 1)))
    row["B_camb_recfast"] = {
        "zero_over_baseline_tt": zero_tt / baseline_tt,
        "zero_over_baseline_phiphi": zero_pp / baseline_pp,
    }
    for quantity in ["tt", "phiphi"]:
        key = f"zero_over_baseline_{quantity}"
        row[f"{quantity}_changes"] = {
            "A_over_B_minus_1": change(row["A_class_hyrec"][key], row["B_camb_recfast"][key]),
            "C_over_B_minus_1": change(row["C_class_recfast"][key], row["B_camb_recfast"][key]),
            "C_over_A_minus_1": change(row["C_class_recfast"][key], row["A_class_hyrec"][key]),
        }
    cl_records.append(row)

pk_records = []
for k in KS:
    row = {"k_h_per_Mpc": k}
    for name, data in [("A_class_hyrec", A), ("C_class_recfast", C)]:
        row[name] = {
            "zero_over_baseline": pk_at(data["zero"]["pk"], k) / pk_at(data["baseline"]["pk"], k)
        }
    row["B_camb_recfast"] = {
        "zero_over_baseline": camb_pk_at(B["zero"], k) / camb_pk_at(B["baseline"], k)
    }
    row["changes"] = {
        "A_over_B_minus_1": change(row["A_class_hyrec"]["zero_over_baseline"], row["B_camb_recfast"]["zero_over_baseline"]),
        "C_over_B_minus_1": change(row["C_class_recfast"]["zero_over_baseline"], row["B_camb_recfast"]["zero_over_baseline"]),
        "C_over_A_minus_1": change(row["C_class_recfast"]["zero_over_baseline"], row["A_class_hyrec"]["zero_over_baseline"]),
    }
    pk_records.append(row)

primary = next(row for row in cl_records if row["ell"] == 1000)
previous_gap = primary["tt_changes"]["A_over_B_minus_1"]
new_gap = primary["tt_changes"]["C_over_B_minus_1"]
recfast_effect = primary["tt_changes"]["C_over_A_minus_1"]
supports = abs(previous_gap) > 0.02 and abs(new_gap) < 0.005
background = {}
for model in ["zero", "baseline"]:
    recfast_bg = class_background(model)
    hyrec_bg = class_convergence["backgrounds"]["integral"][model]
    camb_bg = crosscode["background_comparisons"][model]["camb_levels"]["ultra"]
    background[model] = {
        "A_class_hyrec": hyrec_bg,
        "C_class_recfast": recfast_bg,
        "B_camb_recfast": camb_bg,
        "C_over_A": {
            "rho_lambda": change(recfast_bg["rho_lambda_over_rho_total"], hyrec_bg["rho_lambda_over_rho_total"]),
            "Omega_m": change(recfast_bg["Omega_m"], hyrec_bg["Omega_m"]),
            "growth_f": change(recfast_bg["growth_f"], hyrec_bg["growth_f"]),
        },
        "C_over_B_growth_diagnostic": change(recfast_bg["growth_f"], camb_bg["fsigma8_over_sigma8"]),
    }

summary = {
    "status": "computed_recfast_systematic_test_not_observational_fit",
    "definitions": {
        "A": "CLASS HyRec 2020 integral",
        "B": "CAMB Recfast ultra",
        "C": "CLASS RECFAST integral",
        "change_units": "fractions, not percentages",
    },
    "primary_decision": {
        "ell": 1000,
        "A_over_B_minus_1": previous_gap,
        "C_over_B_minus_1": new_gap,
        "C_over_A_minus_1": recfast_effect,
        "supports_recombination_dominated_residual": supports,
        "classification": "not_separated_recfast_did_not_close_tt_gap" if not supports else "consistent_with_recombination_dominated_residual",
        "absolute_gap_increased": abs(new_gap) > abs(previous_gap),
        "gap_change_percentage_points": (new_gap - previous_gap) * 100,
        "criterion": "support required abs(C/B-1)<0.005 with previous abs(A/B-1)>0.02",
        "boundary": "RecFastCLASS and CAMB Recfast are different implementations; this test cannot uniquely prove or eliminate every recombination effect.",
    },
    "cl_comparisons": cl_records,
    "pk_comparisons": pk_records,
    "background_comparisons": background,
    "tt_peaks": {
        "A_class_hyrec": {model: peaks(A[model]["cl"]) for model in ["zero", "baseline"]},
        "C_class_recfast": {model: peaks(C[model]["cl"]) for model in ["zero", "baseline"]},
        "B_camb_recfast": crosscode["tt_peaks"]["camb_levels"]["ultra"],
    },
    "validation": {
        "all_class_spectra_finite": all(np.isfinite(data[kind]).all() for data in [*A.values(), *C.values()] for kind in ["cl", "pk"]),
        "zero_omch2_exactly_zero_in_input": "omega_cdm = 0" in (OUT / "zero-cdm-recfast.ini").read_text(encoding="utf-8"),
        "recfast_explicit_in_input": "recombination = RECFAST" in (OUT / "zero-cdm-recfast.ini").read_text(encoding="utf-8"),
        "class_reference_hash_matches_protocol": sha256(OUT / "convergence-summary.json") == protocol["references"]["class_hyrec_integral"]["sha256"],
        "camb_reference_hash_matches_protocol": sha256(OUT / "camb-crosscode-summary.json") == protocol["references"]["camb_recfast_ultra"]["sha256"],
        "resource_exit_zero": all(resource(model)["exit_status"] == 0 for model in ["zero", "baseline"]),
    },
    "resource_usage": {model: resource(model) for model in ["zero", "baseline"]},
    "unused_parameters_recfast": {
        model: [
            line.strip()
            for line in (CLASS_ROOT / f"recfast/{'baseline-lcdm' if model == 'baseline' else 'zero-cdm'}-recfast00_unused_parameters").read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.startswith("#")
        ]
        for model in ["zero", "baseline"]
    },
    "raw_output_sha256": {
        path.name: sha256(path)
        for path in sorted((CLASS_ROOT / "recfast").glob("*.dat"))
    },
    "protocol_sha256": sha256(OUT / "class-recfast-protocol.json"),
    "analysis_runner_sha256": sha256(Path(__file__).resolve()),
    "boundaries": [
        "RECFAST switching did not satisfy the frozen TT residual criterion at ell=1000.",
        "The result does not prove that recombination is irrelevant or identify the remaining cause.",
        "Extreme P(k) ratios remain non-robust and are not rehabilitated by this test.",
        "No likelihood, parameter search, joint BBN, nonlinear calculation, or observational exclusion.",
    ],
}
(OUT / "recfast-systematics-summary.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)

plt.rcParams.update({
    "font.size": 9,
    "font.sans-serif": ["Microsoft YaHei", "SimHei", "DejaVu Sans"],
    "svg.hashsalt": "class-recfast-systematics-v1",
})
fig, axes = plt.subplots(1, 3, figsize=(16, 4.7), constrained_layout=True)
ell_dense = np.arange(50, 2001)
for name, data, color, label in [
    ("A", A, "#111827", "A：CLASS HyRec"),
    ("C", C, "#c94f32", "C：CLASS RECFAST"),
]:
    ratio = data["zero"]["cl"][ell_dense - 2, 1] / data["baseline"]["cl"][ell_dense - 2, 1]
    axes[0].loglog(ell_dense, ratio, color=color, lw=1.25, label=label)
ratio = B["zero"]["tt"][ell_dense] / B["baseline"]["tt"][ell_dense]
axes[0].loglog(ell_dense, ratio, color="#2563a6", lw=1.25, label="B：CAMB Recfast")
axes[0].set(title="TT 比值：零模型／ΛCDM", xlabel="多极矩 ℓ", ylabel="比值")
axes[0].legend(frameon=False, fontsize=8)
for key, label, color, marker in [
    ("A_over_B_minus_1", "A／B−1", "#111827", "o"),
    ("C_over_B_minus_1", "C／B−1", "#c94f32", "s"),
    ("C_over_A_minus_1", "C／A−1", "#6b3a8c", "^"),
]:
    axes[1].loglog(ELLS, [abs(row["tt_changes"][key]) * 100 for row in cl_records], color=color, marker=marker, lw=1.2, label=label)
axes[1].axhline(0.5, color="#444444", ls="--", lw=1, label="0.5% 判别线")
axes[1].set(title="TT 比值的复合系统误差检验", xlabel="多极矩 ℓ", ylabel="差异绝对值 [%]")
axes[1].legend(frameon=False, fontsize=8)
for key, label, color, marker in [
    ("A_over_B_minus_1", "A／B−1", "#111827", "o"),
    ("C_over_B_minus_1", "C／B−1", "#c94f32", "s"),
    ("C_over_A_minus_1", "C／A−1", "#6b3a8c", "^"),
]:
    axes[2].loglog(KS, [abs(row["changes"][key]) * 100 for row in pk_records], color=color, marker=marker, lw=1.2, label=label)
axes[2].axhline(5.0, color="#444444", ls="--", lw=1, label="5% 复查线")
axes[2].set(title="物质谱比值差异", xlabel="k [h/Mpc]", ylabel="差异绝对值 [%]")
axes[2].legend(frameon=False, fontsize=8)
for ax in axes:
    ax.grid(alpha=0.25, which="both")
fig.suptitle("RECFAST 对照：ℓ=1000 的 TT 差异未按预冻结规则闭合", fontsize=13)
svg_path = OUT / "recfast-systematics-comparison.svg"
fig.savefig(svg_path, bbox_inches="tight", metadata={"Date": None})
svg_path.write_text("\n".join(line.rstrip() for line in svg_path.read_text(encoding="utf-8").splitlines()) + "\n", encoding="utf-8")
print(json.dumps({
    "primary_decision": summary["primary_decision"],
    "tt_peaks_C": summary["tt_peaks"]["C_class_recfast"],
    "resource_usage": summary["resource_usage"],
}, ensure_ascii=False, indent=2))
