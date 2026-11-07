"""Run the frozen CLASS-matched CAMB comparison in WSL.

Example:
PYTHONPATH=.tmp/camb-wsl-site python3 research/physical-intuition/zero-cdm/camb_crosscode.py --freeze
PYTHONPATH=.tmp/camb-wsl-site python3 research/physical-intuition/zero-cdm/camb_crosscode.py --model baseline
PYTHONPATH=.tmp/camb-wsl-site python3 research/physical-intuition/zero-cdm/camb_crosscode.py --model zero

This is a fixed-input research calculation, not an observational fit.
"""

import argparse
import hashlib
import json
import resource
import time
from datetime import datetime
from pathlib import Path

import camb
import numpy as np

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "camb-crosscode-protocol.json"
CAMB_SOURCE_COMMIT = "72b5a4ca5df1335674e2eacad9b9a887194f9677"
CLASS_SOURCE_COMMIT = "2d88c3f650b691d2b13165e826697f43ef2530c4"
YHE_CLASS = 0.24518836574531122
LEVELS = {
    "fiducial": {
        "AccuracyBoost": 1.0,
        "lSampleBoost": 1.0,
        "lAccuracyBoost": 1.0,
        "k_per_logint": 100,
    },
    "high": {
        "AccuracyBoost": 2.0,
        "lSampleBoost": 2.0,
        "lAccuracyBoost": 2.0,
        "k_per_logint": 200,
    },
    "ultra": {
        "AccuracyBoost": 4.0,
        "lSampleBoost": 4.0,
        "lAccuracyBoost": 4.0,
        "k_per_logint": 400,
        "lens_potential_accuracy": 8,
    },
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def configuration(model, level):
    return {
        "model": model,
        "level": level,
        "H0": 67.66,
        "ombh2": 0.02218,
        "omch2": 0.0 if model == "zero" else 0.1201075,
        "omk": 0.0,
        "num_massive_neutrinos": 0,
        "mnu": 0.0,
        "nnu": 3.044,
        "TCMB": 2.7255,
        "YHe_fixed_to_class_sBBN": YHE_CLASS,
        "tau": 0.0561,
        "As": 2.1e-9,
        "ns": 0.9665,
        "pivot_scalar": 0.05,
        "dark_energy_model": "fluid",
        "w": -1.0,
        "wa": 0.0,
        "cs2": 1.0,
        "recombination_model": "Recfast",
        "recombination_fallback": "PyPI wheel lacks optional HyRec; see camb-crosscode-amendment-01.json",
        "lmax": 2500,
        "lens_potential_accuracy": 0,
        "nonlinear": False,
        "kmax_h_per_Mpc": 2.0,
        "DoLateRadTruncation": True,
        **LEVELS[level],
    }


def freeze_protocol():
    if PROTOCOL_PATH.exists():
        raise FileExistsError(f"Refusing to overwrite frozen protocol: {PROTOCOL_PATH}")
    protocol = {
        "status": "frozen_before_camb_spectrum_run",
        "frozen_at_local": datetime.now().astimezone().isoformat(),
        "runner": "camb_crosscode.py",
        "runner_sha256": sha256(Path(__file__).resolve()),
        "camb_version": camb.__version__,
        "camb_source_commit": CAMB_SOURCE_COMMIT,
        "class_source_commit": CLASS_SOURCE_COMMIT,
        "class_reference_level": "integral",
        "class_convergence_summary": "convergence-summary.json",
        "class_convergence_summary_sha256": sha256(OUT / "convergence-summary.json"),
        "camb_wheel_manifest_sha256": sha256(REPO / ".tmp/camb-wsl-install-manifest.json"),
        "physical_mapping": {
            "H0": "CLASS H0 = CAMB H0 = 67.66",
            "omega_b": "CLASS omega_b = CAMB ombh2 = 0.02218",
            "omega_cdm": "CLASS omega_cdm = CAMB omch2; zero=0, baseline=0.1201075",
            "curvature": "Omega_k = omk = 0",
            "radiation": "N_ur = nnu = 3.044; N_ncdm = num_massive_neutrinos = 0; mnu=0",
            "YHe": YHE_CLASS,
            "YHe_reason": "CLASS sBBN_2025 natural-spline mapping; direct CLASS verbose output rounds to 0.2452. Do not use CAMB default PRIMAT value for this comparison.",
            "initial_power": "As=2.1e-9, ns=0.9665, pivot=0.05/Mpc",
            "reionization": "tau=0.0561",
            "dark_energy": "flat closure with w=-1, wa=0, cs2=1, fluid model; no fld/scf component in CLASS",
            "recombination": "Original HyRec intent superseded by camb-crosscode-amendment-01.json: CAMB wheel lacks optional HyRec, so use Recfast and retain a recombination systematic.",
        },
        "output_mapping": {
            "tt": "CAMB lensed_scalar[:,0] with CMB_unit=None and raw_cl=False equals ell(ell+1)C_l^TT/(2pi), matching CLASS class_format TT.",
            "phiphi": "CAMB PP is [ell(ell+1)]^2 C_l^phiphi/(2pi); divide by ell(ell+1) to match CLASS class_format phiphi=ell(ell+1)C_l^phiphi/(2pi).",
            "pk": "z=0, nonlinear=False, hubble_units=True, k_hunit=True; k in h/Mpc and P(k) in (Mpc/h)^3.",
            "background": "CAMB get_background_densities(a=1): de/tot and (cdm+baryon+nu)/tot.",
            "growth": "CAMB f_sigma8/sigma8 is a diagnostic; CLASS growth_f has its own definition. Do not silently equate them.",
        },
        "gauge_boundary": {
            "class": "newtonian",
            "camb": "built-in cdm_gauge/synchronous density variables; no exposed gauge selector in CAMBparams 2.0.5",
            "consequence": "CMB observables are physical; matter-density spectra are not naively gauge identical at k=0.001. Treat k>=0.01 as primary and k=0.001 as secondary diagnostic.",
        },
        "accuracy_levels": LEVELS,
        "initial_run_level": "fiducial",
        "high_accuracy_trigger": "Run high only after inspecting fiducial outputs; discrepancies above 5% trigger mapping and accuracy review, not an automatic physical verdict.",
        "metrics": {
            "pk_k_h_per_Mpc": [0.001, 0.01, 0.05, 0.1, 0.5, 1.0],
            "cl_ell": [100, 200, 500, 1000, 2000],
            "tt_peak_search_ell": [50, 1500],
            "ratio": "zero/baseline within each code, then CAMB ratio divided by CLASS integral ratio minus one",
            "review_threshold_fraction": 0.05,
            "threshold_meaning": "cross-code diagnostic only; not numerical convergence proof, observational uncertainty, or model exclusion",
        },
        "boundaries": [
            "No tiny CDM component is introduced.",
            "No observational likelihood, parameter search, joint BBN, or nonlinear calculation.",
            "Different recombination and perturbation implementations remain possible systematics.",
            "If CAMB fails for zero CDM, record the exception and do not replace zero with a nonzero approximation.",
        ],
    }
    PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(PROTOCOL_PATH)


def build_params(model, level):
    config = configuration(model, level)
    pars = camb.CAMBparams()
    pars.set_classes(dark_energy_model=config["dark_energy_model"], recombination_model=config["recombination_model"])
    pars.set_cosmology(
        H0=config["H0"],
        ombh2=config["ombh2"],
        omch2=config["omch2"],
        omk=config["omk"],
        num_massive_neutrinos=config["num_massive_neutrinos"],
        mnu=config["mnu"],
        nnu=config["nnu"],
        TCMB=config["TCMB"],
        tau=config["tau"],
        YHe=config["YHe_fixed_to_class_sBBN"],
    )
    pars.set_dark_energy(w=config["w"], wa=config["wa"], cs2=config["cs2"], dark_energy_model="fluid")
    pars.InitPower.set_params(As=config["As"], ns=config["ns"], pivot_scalar=config["pivot_scalar"])
    pars.set_for_lmax(config["lmax"], lens_potential_accuracy=config["lens_potential_accuracy"], nonlinear=False)
    pars.set_matter_power(
        redshifts=[0.0],
        kmax=config["kmax_h_per_Mpc"],
        k_per_logint=config["k_per_logint"],
        nonlinear=False,
    )
    pars.set_accuracy(
        AccuracyBoost=config["AccuracyBoost"],
        lSampleBoost=config["lSampleBoost"],
        lAccuracyBoost=config["lAccuracyBoost"],
        DoLateRadTruncation=config["DoLateRadTruncation"],
    )
    pars.NonLinear = camb.model.NonLinear_none
    pars.WantTensors = False
    pars.WantVectors = False
    pars.DoLensing = True
    pars.Want_CMB_lensing = True
    if not pars.validate():
        raise ValueError("CAMB parameter validation failed")
    return pars, config


def run(model, level):
    pars, config = build_params(model, level)
    run_dir = REPO / ".tmp/camb-runs" / level / model
    run_dir.mkdir(parents=True, exist_ok=True)
    pars.write_ini(run_dir / "parameters.ini")
    started = time.perf_counter()
    try:
        results = camb.get_results(pars)
        spectra = results.get_cmb_power_spectra(
            lmax=config["lmax"],
            spectra=("lensed_scalar", "unlensed_scalar", "lens_potential"),
            CMB_unit=None,
            raw_cl=False,
        )
        ell = np.arange(config["lmax"] + 1, dtype=int)
        tt_lensed = spectra["lensed_scalar"][:, 0]
        tt_unlensed = spectra["unlensed_scalar"][:, 0]
        pp_deflection = spectra["lens_potential"][:, 0]
        pk_interpolator, z_grid, k_grid = results.get_matter_power_interpolator(
            nonlinear=False,
            hubble_units=True,
            k_hunit=True,
            return_z_k=True,
        )
        k_output = np.logspace(np.log10(max(float(k_grid[0]), 1.0e-4)), np.log10(2.0), 2500)
        pk_output = pk_interpolator.P(0.0, k_output)
        densities = results.get_background_densities(1.0)
        rho_tot = float(densities["tot"][0])
        rho_de = float(densities["de"][0])
        rho_matter = float(densities["cdm"][0] + densities["baryon"][0] + densities["nu"][0])
        sigma8 = float(results.get_sigma8()[-1])
        fsigma8 = float(results.get_fsigma8()[-1])
        derived_raw = results.get_derived_params()
        derived = {key: float(value) for key, value in derived_raw.items()}
        np.savez_compressed(
            run_dir / "spectra.npz",
            ell=ell,
            tt=tt_lensed,
            tt_unlensed=tt_unlensed,
            pp_deflection=pp_deflection,
            pk_k_h_per_Mpc=k_output,
            pk_p_Mpc_over_h_cubed=pk_output,
            camb_pk_native_k=k_grid,
            camb_pk_native_z=z_grid,
        )
        summary = {
            "status": "computed_fixed_inputs_not_observational_fit",
            "camb_version": camb.__version__,
            "camb_source_commit": CAMB_SOURCE_COMMIT,
            "class_reference_level": "integral",
            "configuration": config,
            "actual_parameters": {
                "omch2": float(pars.omch2),
                "omnuh2": float(pars.omnuh2),
                "N_eff": float(pars.N_eff),
                "num_nu_massive": int(pars.num_nu_massive),
                "YHe": float(pars.YHe),
                "TCMB": float(pars.TCMB),
                "recombination_class": pars.Recomb.__class__.__name__,
                "dark_energy_class": pars.DarkEnergy.__class__.__name__,
                "NonLinear": str(pars.NonLinear),
                "DoLensing": bool(pars.DoLensing),
            },
            "background_z0": {
                "rho_de_over_rho_tot": rho_de / rho_tot,
                "Omega_matter": rho_matter / rho_tot,
                "sigma8": sigma8,
                "fsigma8": fsigma8,
                "fsigma8_over_sigma8": fsigma8 / sigma8 if sigma8 != 0 else None,
            },
            "derived": derived,
            "output_conventions": {
                "tt": "lensed scalar ell(ell+1)C_lTT/(2pi), dimensionless; compare only with CLASS cl_lensed.dat",
                "tt_unlensed": "unlensed scalar ell(ell+1)C_lTT/(2pi), dimensionless; compare with CLASS cl.dat",
                "pp_deflection": "[ell(ell+1)]^2 C_lphiphi/(2pi); divide by ell(ell+1) for CLASS comparison",
                "pk": "linear delta_tot at z=0, k in h/Mpc, P in (Mpc/h)^3; density variables are synchronous gauge in CAMB",
            },
            "spectra_shapes": {
                "tt_lensed": list(tt_lensed.shape),
                "tt_unlensed": list(tt_unlensed.shape),
                "pp_deflection": list(pp_deflection.shape),
                "pk": list(pk_output.shape),
            },
            "validation": {
                "all_output_finite": bool(np.isfinite(tt_lensed).all() and np.isfinite(tt_unlensed).all() and np.isfinite(pp_deflection).all() and np.isfinite(pk_output).all()),
                "omch2_exactly_zero": float(pars.omch2) == 0.0,
                "nonlinear_disabled": str(pars.NonLinear) == camb.model.NonLinear_none,
            },
            "elapsed_seconds": time.perf_counter() - started,
            "maximum_rss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
            "spectra_file": "spectra.npz",
            "parameters_file": "parameters.ini",
        }
        (run_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    except Exception as error:
        failure = {
            "status": "failed_no_replacement_with_tiny_cdm",
            "configuration": config,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "elapsed_seconds": time.perf_counter() - started,
        }
        (run_dir / "failure.json").write_text(json.dumps(failure, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--freeze", action="store_true")
    parser.add_argument("--model", choices=["baseline", "zero"], default="baseline")
    parser.add_argument("--level", choices=list(LEVELS), default="fiducial")
    args = parser.parse_args()
    if args.freeze:
        freeze_protocol()
    else:
        run(args.model, args.level)
