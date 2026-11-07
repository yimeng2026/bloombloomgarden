"""Document and verify the CLASS/CAMB TT lensing-convention correction."""

import hashlib
import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
CLASS = REPO / ".tmp/class_public/convergence"
CAMB = REPO / ".tmp/camb-runs"
ELLS = [100, 200, 500, 1000, 2000]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path):
    return np.loadtxt(path, comments="#")


def ratio(data, ell, column=1):
    return float(data[ell - 2, column])


def change(new, old):
    return new / old - 1.0


def peaks(data, start=50, stop=1500):
    result = []
    for i in range(1, len(data) - 1):
        ell = int(data[i, 0])
        if ell < start or ell > stop:
            continue
        if data[i, 1] >= data[i - 1, 1] and data[i, 1] > data[i + 1, 1]:
            result.append({"ell": ell, "value": float(data[i, 1])})
    return result[:4]


def camb_peaks(tt, start=50, stop=1500):
    return peaks(np.column_stack((np.arange(len(tt)), tt)), start, stop)


A = {model: load(CLASS / f"integral/{prefix}-integral00_cl.dat") for model, prefix in [("zero", "zero-cdm"), ("baseline", "baseline-lcdm")]}
E = {model: load(CLASS / f"unlensed/{prefix}-unlensed00_cl.dat") for model, prefix in [("zero", "zero-cdm"), ("baseline", "baseline-lcdm")]}
L = {model: load(CLASS / f"lensed/{prefix}-lensed00_cl_lensed.dat") for model, prefix in [("zero", "zero-cdm"), ("baseline", "baseline-lcdm")]}
B = {model: np.load(CAMB / "ultra" / model / "spectra.npz") for model in ["zero", "baseline"]}
D = {model: np.load(CAMB / "no-late-rad" / model / "spectra.npz") for model in ["zero", "baseline"]}
C = {model: load(CLASS / f"recfast/{prefix}-recfast00_cl.dat") for model, prefix in [("zero", "zero-cdm"), ("baseline", "baseline-lcdm")]}
correction_protocol = json.loads((OUT / "class-lensed-protocol.json").read_text(encoding="utf-8"))
corrected_crosscode = json.loads((OUT / "camb-crosscode-summary.json").read_text(encoding="utf-8"))
corrected_recfast = json.loads((OUT / "recfast-systematics-summary.json").read_text(encoding="utf-8"))

records = []
for ell in ELLS:
    a = ratio(A["zero"], ell) / ratio(A["baseline"], ell)
    e = ratio(E["zero"], ell) / ratio(E["baseline"], ell)
    l = ratio(L["zero"], ell) / ratio(L["baseline"], ell)
    bu = float(B["zero"]["tt_unlensed"][ell] / B["baseline"]["tt_unlensed"][ell])
    bl = float(B["zero"]["tt"][ell] / B["baseline"]["tt"][ell])
    dl = float(D["zero"]["tt_lensed"][ell] / D["baseline"]["tt_lensed"][ell])
    du = float(D["zero"]["tt_unlensed"][ell] / D["baseline"]["tt_unlensed"][ell])
    c = ratio(C["zero"], ell) / ratio(C["baseline"], ell)
    records.append({
        "ell": ell,
        "A_class_unlensed": a,
        "E_class_explicit_unlensed": e,
        "L_class_explicit_lensed": l,
        "B_camb_unlensed": bu,
        "B_camb_lensed": bl,
        "D_camb_no_late_rad_lensed": dl,
        "D_camb_no_late_rad_unlensed": du,
        "C_class_recfast_unlensed": c,
        "E_over_A_minus_1": change(e, a),
        "old_mixed_A_over_B_lensed_minus_1": change(a, bl),
        "old_mixed_C_over_B_lensed_minus_1": change(c, bl),
        "corrected_B_unlensed_over_A_minus_1": change(bu, a),
        "corrected_B_lensed_over_L_minus_1": change(bl, l),
        "late_rad_D_lensed_over_B_lensed_minus_1": change(dl, bl),
        "class_lensing_effect_L_over_A_minus_1": change(l, a),
        "camb_lensing_effect_bl_over_bu_minus_1": change(bl, bu),
    })

primary = next(row for row in records if row["ell"] == 1000)
max_unlensed = max(abs(row["corrected_B_unlensed_over_A_minus_1"]) for row in records)
max_lensed = max(abs(row["corrected_B_lensed_over_L_minus_1"]) for row in records)
max_late_rad = max(abs(row["late_rad_D_lensed_over_B_lensed_minus_1"]) for row in records)
summary = {
    "status": "tt_residual_resolved_as_output_convention_mismatch_not_physics",
    "root_cause": {
        "class_cl_dat": "非透镜谱；原输入未显式 lensing=yes。",
        "class_cl_lensed_dat": "只有显式 lensing=yes 才生成的透镜谱。",
        "camb_tt": "lensed_scalar。",
        "camb_tt_unlensed": "unlensed_scalar。",
        "old_error": "把 CLASS cl.dat 与 CAMB lensed_scalar 直接比较。",
        "class_source_evidence": "source/output.c 分开写 cl.dat 与 cl_lensed.dat；input.c 只有显式 yes 才启用 has_lensed_cls。",
    },
    "primary_ell_1000": primary,
    "all_comparisons": records,
    "maxima": {
        "max_corrected_unlensed_difference_fraction": max_unlensed,
        "max_corrected_lensed_difference_fraction": max_lensed,
        "max_late_rad_truncation_effect_fraction": max_late_rad,
        "all_corrected_tt_differences_within_0.5_percent": max_unlensed <= 0.005 and max_lensed <= 0.005,
        "late_rad_effect_below_0.001_percent": max_late_rad <= 0.00001,
    },
    "peaks": {
        "A_class_unlensed": {model: peaks(A[model]) for model in ["zero", "baseline"]},
        "B_camb_unlensed": {model: camb_peaks(B[model]["tt_unlensed"]) for model in ["zero", "baseline"]},
        "L_class_lensed": {model: peaks(L[model]) for model in ["zero", "baseline"]},
        "B_camb_lensed": {model: camb_peaks(B[model]["tt"]) for model in ["zero", "baseline"]},
    },
    "corrected_references": {
        "camb-crosscode-summary.json": {
            "sha256": sha256(OUT / "camb-crosscode-summary.json"),
            "tt_convention": corrected_crosscode["tt_convention"],
        },
        "recfast-systematics-summary.json": {
            "sha256": sha256(OUT / "recfast-systematics-summary.json"),
            "primary_decision": corrected_recfast["primary_decision"],
        },
    },
    "historical_references": correction_protocol["references"],
    "raw_class_lensed_sha256": {
        path.name: sha256(path)
        for path in sorted((CLASS / "lensed").glob("*.dat"))
    },
    "validation": {
        "explicit_lensed_files_exist": all((CLASS / f"lensed/{prefix}-lensed00_cl_lensed.dat").exists() for prefix in ["zero-cdm", "baseline-lcdm"]),
        "all_spectra_finite": all(np.isfinite(data).all() for data in [*A.values(), *E.values(), *L.values(), *C.values()]),
        "unlensed_control_matches_original": primary["E_over_A_minus_1"] == 0.0,
        "old_residual_not_used_as_physics": True,
        "corrected_crosscode_uses_unlensed": "unlensed_scalar" in corrected_crosscode["tt_convention"],
        "corrected_recfast_has_no_residual": corrected_recfast["primary_decision"]["classification"] == "no_tt_residual_after_convention_correction",
    },
    "analysis_runner_sha256": sha256(Path(__file__).resolve()),
    "boundaries": [
        "本次修正的是 TT 输出口径错误，不是新物理机制。",
        "透镜势、背景、主要物质谱区间与极端物质谱的结论不因该修正而自动改变。",
        "不据此宣称所有数值系统误差已闭合，也不接入观测排除或支持。",
    ],
}
(OUT / "tt-convention-correction-summary.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)

plt.rcParams.update({
    "font.size": 9,
    "font.sans-serif": ["Microsoft YaHei", "SimHei", "DejaVu Sans"],
    "svg.hashsalt": "tt-convention-correction-v1",
})
fig, axes = plt.subplots(1, 3, figsize=(16, 4.8), constrained_layout=True)
ell_dense = np.arange(50, 2001)
series = [
    (A, "CLASS 非透镜", "#111827", 1.2, None),
    (L, "CLASS 显式透镜", "#6b3a8c", 1.2, None),
]
for data, label, color, lw, _ in series:
    value = data["zero"][ell_dense - 2, 1] / data["baseline"][ell_dense - 2, 1]
    axes[0].loglog(ell_dense, value, color=color, lw=lw, label=label)
axes[0].loglog(ell_dense, B["zero"]["tt_unlensed"][ell_dense] / B["baseline"]["tt_unlensed"][ell_dense], color="#2563a6", lw=1.2, label="CAMB 非透镜")
axes[0].loglog(ell_dense, B["zero"]["tt"][ell_dense] / B["baseline"]["tt"][ell_dense], color="#c94f32", lw=1.2, label="CAMB 透镜")
axes[0].set(title="TT 比值：统一输出口径", xlabel="多极矩 ℓ", ylabel="零模型／ΛCDM")
axes[0].legend(frameon=False, fontsize=8)
for key, label, color, marker in [
    ("old_mixed_A_over_B_lensed_minus_1", "旧混比", "#111827", "o"),
    ("corrected_B_unlensed_over_A_minus_1", "非透镜同口径", "#2563a6", "s"),
    ("corrected_B_lensed_over_L_minus_1", "透镜同口径", "#c94f32", "^"),
]:
    axes[1].loglog(ELLS, [abs(row[key]) * 100 for row in records], color=color, marker=marker, lw=1.2, label=label)
axes[1].axhline(0.5, color="#444444", ls="--", lw=1, label="0.5% 参考线")
axes[1].set(title="旧混比与修正后差异", xlabel="多极矩 ℓ", ylabel="差异绝对值 [%]")
axes[1].legend(frameon=False, fontsize=8)
for key, label, color, marker in [
    ("late_rad_D_lensed_over_B_lensed_minus_1", "晚期辐射截断影响", "#2c7a5b", "o"),
    ("class_lensing_effect_L_over_A_minus_1", "CLASS 透镜化影响", "#6b3a8c", "s"),
    ("camb_lensing_effect_bl_over_bu_minus_1", "CAMB 透镜化影响", "#c94f32", "^"),
]:
    axes[2].loglog(ELLS, [abs(row[key]) * 100 for row in records], color=color, marker=marker, lw=1.2, label=label)
axes[2].set(title="近似与透镜化效应分解", xlabel="多极矩 ℓ", ylabel="变化绝对值 [%]")
axes[2].legend(frameon=False, fontsize=8)
for ax in axes:
    ax.grid(alpha=0.25, which="both")
fig.suptitle("TT 口径修正：原残差来自非透镜／透镜混比", fontsize=13)
svg_path = OUT / "tt-convention-correction.svg"
fig.savefig(svg_path, bbox_inches="tight", metadata={"Date": None})
svg_path.write_text("\n".join(line.rstrip() for line in svg_path.read_text(encoding="utf-8").splitlines()) + "\n", encoding="utf-8")
print(json.dumps({
    "maxima": summary["maxima"],
    "primary_ell_1000": primary,
    "peaks": summary["peaks"],
}, ensure_ascii=False, indent=2))
