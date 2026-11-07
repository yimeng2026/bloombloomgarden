"""Compute fixed-input Planck 2018 lensing likelihoods for zero and baseline models."""

import hashlib
import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

from planck_likelihood import corrected_bandpower, gaussian_chi_squared


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PLANCK_ROOT = REPO / ".tmp/planck_supp_data_and_covmats/lensing/2018"
STEM = "smicadx12_Dec5_ftl_mv2_ndclpp_p_teb_consext8"
THEORY_ROOT = REPO / ".tmp/planck-likelihood/theory"
SUMMARY_PATH = OUT / "planck-lensing-likelihood-summary.json"
FIGURE_PATH = OUT / "planck-lensing-likelihood.svg"
PREVIEW_PATH = REPO / ".tmp/planck-lensing-likelihood.png"
VARIANTS = {
    "fixed_covariance": {
        "dataset": f"{STEM}.dataset",
        "covariance": f"{STEM}_cov.dat",
        "correction": f"{STEM}_lensing_fiducial_correction.dat",
        "correction_windows": f"{STEM}_lens_delta_window",
    },
    "cmb_marginalized": {
        "dataset": f"{STEM}_CMBmarged.dataset",
        "covariance": f"{STEM}_CMBmarged_cov.dat",
        "correction": f"{STEM}_CMBmarged_lensing_fiducial_correction.dat",
        "correction_windows": f"{STEM}_CMBmarged_lens_delta_window",
    },
}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load_window(path, correction=False):
    data = np.loadtxt(path)
    result = np.zeros(2499, dtype=float)
    for row in data:
        ell = int(row[0])
        if ell >= 2:
            result[ell - 2] = float(row[-1] if correction else row[1])
    return result


def load_windows(directory, correction=False):
    windows = []
    for index in range(1, 10):
        windows.append(load_window(directory / f"window{index}.dat", correction=correction))
    return np.column_stack(windows)


def class_theory(path):
    data = np.loadtxt(path, comments="#")
    ell = data[:, 0].astype(int)
    theory = np.zeros(2501, dtype=float)
    theory[ell] = data[:, 5] * ell * (ell + 1.0)
    return theory


def camb_theory(path):
    spectra = np.load(path)
    theory = np.asarray(spectra["pp_deflection"], dtype=float)
    if theory.shape != (2501,):
        raise ValueError(f"unexpected CAMB deflection shape: {theory.shape}")
    return theory


THEORY_ROOT.mkdir(parents=True, exist_ok=True)
observed_data = np.loadtxt(PLANCK_ROOT / f"{STEM}_bandpowers.dat", comments="#")
observed = observed_data[:, 4]
observed_error = observed_data[:, 5]
models = {}
raw_hashes = {
    "planck_bandpowers": sha256(PLANCK_ROOT / f"{STEM}_bandpowers.dat"),
}
for model in ["class_hyrec", "class_recfast", "camb_recfast"]:
    models[model] = {}
    for cosmology in ["zero", "baseline"]:
        if model == "camb_recfast":
            path = REPO / ".tmp/camb-runs/ultra" / cosmology / "spectra.npz"
            theory = camb_theory(path)
        else:
            directory = "integral" if model == "class_hyrec" else "recfast"
            prefix = "zero-cdm" if cosmology == "zero" else "baseline-lcdm"
            suffix = "integral00" if model == "class_hyrec" else "recfast00"
            path = REPO / ".tmp/class_public/convergence" / directory / f"{prefix}-{suffix}_cl.dat"
            theory = class_theory(path)
        if not np.isfinite(theory).all():
            raise ValueError(f"nonfinite theory: {model} {cosmology}")
        models[model][cosmology] = theory
        raw_hashes[f"{model}_{cosmology}"] = sha256(path)
        theory_path = THEORY_ROOT / f"{model}_{cosmology}.theory_cl"
        np.savetxt(
            theory_path,
            np.column_stack([np.arange(2501), theory]),
            fmt=["%4u", "%16.8e"],
            header="L PP",
            comments="",
        )
        raw_hashes[f"theory_file_{model}_{cosmology}"] = sha256(theory_path)

records = {}
for variant_name, variant in VARIANTS.items():
    windows = load_windows(PLANCK_ROOT / f"{STEM}_window")
    correction_windows = load_windows(PLANCK_ROOT / variant["correction_windows"], correction=True)
    fiducial_correction = np.loadtxt(PLANCK_ROOT / variant["correction"], comments="#")
    covariance = np.loadtxt(PLANCK_ROOT / variant["covariance"], comments="#")
    if covariance.shape != (9, 9):
        raise ValueError(f"unexpected covariance shape: {covariance.shape}")
    raw_hashes[f"{variant_name}_covariance"] = sha256(PLANCK_ROOT / variant["covariance"])
    raw_hashes[f"{variant_name}_correction"] = sha256(PLANCK_ROOT / variant["correction"])
    raw_hashes[f"{variant_name}_dataset"] = sha256(PLANCK_ROOT / variant["dataset"])
    model_records = {}
    for model, theories in models.items():
        model_records[model] = {}
        for cosmology, theory in theories.items():
            corrected = corrected_bandpower(theory, windows, correction_windows, fiducial_correction)
            uncorrected = windows.T @ theory[2:]
            chi_squared = gaussian_chi_squared(corrected, observed, covariance)
            residual = corrected - observed
            model_records[model][cosmology] = {
                "corrected_bandpower": corrected.tolist(),
                "uncorrected_window_bandpower": uncorrected.tolist(),
                "residual": residual.tolist(),
                "chi_squared": chi_squared,
            }
        model_records[model]["delta_chi_squared_zero_minus_baseline"] = (
            model_records[model]["zero"]["chi_squared"] - model_records[model]["baseline"]["chi_squared"]
        )
    records[variant_name] = {
        "models": model_records,
        "observed_bandpower": observed.tolist(),
        "observed_error": observed_error.tolist(),
        "covariance": covariance.tolist(),
        "dataset": variant["dataset"],
    }

summary = {
    "status": "computed_fixed_input_planck_2018_lensing_likelihood_not_parameter_fit",
    "data": {
        "release": "Planck 2018 gravitational lensing, conservative multipole range 8<=L<=400",
        "mirror": "CobayaSampler/planck_supp_data_and_covmats, plain text official Planck data from CosmoMC",
        "mirror_commit": "621f4c5db33b08f4d28527e3459a922476f49618",
        "cosmomc_source": "cmbant/CosmoMC",
        "cosmomc_commit": "83f00ac4742c7b48563204a22d7a7d3bb597a3e1",
        "bandpower_definition": "PP is the deflection spectrum [L(L+1)]^2 C_l^phiphi/(2pi); CLASS phiphi is multiplied by L(L+1), CAMB pp_deflection is already in that convention",
        "bins": observed_data[:, :4].tolist(),
    },
    "models": {
        "class_hyrec": "CLASS HyRec 2020 integral phiphi",
        "class_recfast": "CLASS RECFAST integral phiphi",
        "camb_recfast": "CAMB Recfast ultra pp_deflection",
    },
    "records": records,
    "raw_output_sha256": raw_hashes,
    "analysis_runner_sha256": sha256(Path(__file__).resolve()),
    "validation": {
        "all_chi_squared_finite_and_nonnegative": all(
            np.isfinite(record["chi_squared"]) and record["chi_squared"] >= 0.0
            for variant in records.values()
            for model in variant["models"].values()
            for record in model.values()
            if isinstance(record, dict)
        ),
        "zero_cdm_exactly_zero": True,
        "parameter_fitting_performed": False,
        "official_crosscheck_pending": True,
    },
    "boundaries": [
        "Fixed-input diagnostics only; no parameter search, best-fit claim, posterior, or model-family exclusion.",
        "Both fixed and CMB-marginalized covariances are reported separately.",
        "Nonlinear matter-power convergence is not required for this lensing calculation, but other model assumptions remain fixed and relevant.",
        "No joint BBN or full Planck temperature/polarization likelihood is included.",
    ],
}
SUMMARY_PATH.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

plt.rcParams.update({
    "font.size": 9,
    "font.sans-serif": ["Microsoft YaHei", "SimHei", "DejaVu Sans"],
    "svg.hashsalt": "planck-lensing-likelihood-v1",
})
fig, axes = plt.subplots(1, 2, figsize=(13, 5), constrained_layout=True)
centers = observed_data[:, 3]
colors = {"class_hyrec": "#111827", "class_recfast": "#c94f32", "camb_recfast": "#2563a6"}
labels = {"class_hyrec": "CLASS HyRec", "class_recfast": "CLASS RECFAST", "camb_recfast": "CAMB Recfast"}
for ax, (variant_name, variant_record) in zip(axes, records.items()):
    ax.errorbar(centers, observed, yerr=observed_error, fmt="ko", ms=4, capsize=2.5, label="Planck 2018 观测")
    for model in models:
        zero = np.array(variant_record["models"][model]["zero"]["corrected_bandpower"])
        baseline = np.array(variant_record["models"][model]["baseline"]["corrected_bandpower"])
        ax.plot(centers, baseline, color=colors[model], lw=1.4, label=f"{labels[model]} ΛCDM")
        ax.plot(centers, zero, color=colors[model], lw=1.1, ls="--", label=f"{labels[model]} 零模型")
    ax.set_yscale("symlog", linthresh=1.0e-8)
    ax.set(
        title=f"{'固定协方差' if variant_name == 'fixed_covariance' else 'CMB 边缘化协方差'}：修正透镜带功率",
        xlabel="带平均多极矩 L",
        ylabel="[L(L+1)]² Cφφ/(2π)",
    )
    ax.grid(alpha=0.25, which="both")
    ax.legend(frameon=False, fontsize=7, ncol=2)
fig.savefig(FIGURE_PATH, bbox_inches="tight", metadata={"Date": None})
FIGURE_PATH.write_text(
    "\n".join(line.rstrip() for line in FIGURE_PATH.read_text(encoding="utf-8").splitlines()) + "\n",
    encoding="utf-8",
)
PREVIEW_PATH.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(PREVIEW_PATH, dpi=150, bbox_inches="tight", metadata={"Software": "planck-lensing-likelihood-v1"})
print(json.dumps({
    "status": summary["status"],
    "chi_squared": {
        variant: {
            model: {
                "zero": variant_record["models"][model]["zero"]["chi_squared"],
                "baseline": variant_record["models"][model]["baseline"]["chi_squared"],
                "delta": variant_record["models"][model]["delta_chi_squared_zero_minus_baseline"],
            }
            for model in models
        }
        for variant, variant_record in records.items()
    },
    "summary": str(SUMMARY_PATH),
    "figure": str(FIGURE_PATH),
    "preview": str(PREVIEW_PATH),
}, ensure_ascii=False, indent=2))
