"""Evaluate and independently nuisance-profile the fixed zero and LCDM CMB spectra."""

import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
sys.path.insert(0, str(REPO / ".tmp/cobaya-python"))
sys.path.insert(0, str(OUT))

import numpy as np  # noqa: E402
import cobaya  # noqa: E402
from cobaya.model import get_model  # noqa: E402
from cobaya.output import get_output  # noqa: E402
from cobaya.samplers.minimize.minimize import Minimize  # noqa: E402

from fixed_cl_theory import FixedClTheory  # noqa: E402
from planck_cmb_likelihood import load_class_lensed_cl  # noqa: E402


LIKELIHOODS = [
    "planck_2018_highl_CamSpec2021.TTTEEE",
    "planck_2018_lowl.TT",
    "planck_2018_lowl.EE",
    "planck_2018_lensing.native",
]
SPECTRA = {
    "hyrec": {
        "zero": ".tmp/class_public/convergence/lensed/zero-cdm-lensed00_cl_lensed.dat",
        "baseline": ".tmp/class_public/convergence/lensed/baseline-lcdm-lensed00_cl_lensed.dat",
    },
    "recfast": {
        "zero": ".tmp/class_public/output/zero-cdm-recfast-lensed00_00_cl_lensed.dat",
        "baseline": ".tmp/class_public/output/baseline-lcdm-recfast-lensed00_00_cl_lensed.dat",
    },
}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def effective_input_hashes(protocol):
    inputs = dict(protocol["input_sha256"])
    amendment_path = OUT / "planck-cmb-amendment-01.json"
    if amendment_path.exists():
        amendment = json.loads(amendment_path.read_text(encoding="utf-8"))
        if amendment.get("amends") != "planck-cmb-protocol.json":
            raise ValueError("Unexpected CMB protocol amendment")
        inputs.update(amendment["input_sha256_updates"])
    return inputs


def posterior_record(model, values):
    posterior = model.logposterior(values, cached=False)
    loglikes = dict(zip(model.likelihood, posterior.loglikes))
    return {
        "logpost": float(posterior.logpost),
        "logprior": float(posterior.logprior),
        "loglike": float(posterior.loglike),
        "loglikes": {key: float(value) for key, value in loglikes.items()},
        "chi_squared_by_likelihood": {key: float(-2 * value) for key, value in loglikes.items()},
        "parameters": {key: float(value) for key, value in values.items()},
    }


def reference_values(model):
    result = {}
    for name, info in model.parameterization.sampled_params_info().items():
        reference = info.get("ref")
        if isinstance(reference, dict):
            result[name] = float(reference.get("loc", 0.0))
        elif reference is not None:
            result[name] = float(reference)
        else:
            raise ValueError(f"No deterministic reference location for {name}")
    return result


def optimize_model(model, values, seed):
    minimizer = Minimize(
        {
            "method": "scipy",
            "ignore_prior": False,
            "best_of": 2,
            "seed": seed,
            "max_evals": 3000,
            "confidence_for_unbounded": 0.9999995,
            "override_scipy": {
                "method": "L-BFGS-B",
                "options": {
                    "maxiter": 3000,
                    "maxfun": 50000,
                    "ftol": 1.0e-12,
                    "gtol": 1.0e-7,
                    "eps": 1.0e-5,
                    "maxls": 50,
                },
            },
        },
        model,
        output=get_output(),
        packages_path=str(REPO / ".tmp/cobaya-packages"),
    )
    names = list(model.parameterization.sampled_params())
    reference = np.array([values[name] for name in names])
    if np.isfinite(model.logpost(reference)):
        minimizer.initial_points[0] = reference
    initial_points = [dict(zip(names, map(float, point))) for point in minimizer.initial_points]
    started = time.perf_counter()
    minimizer.run()
    elapsed = time.perf_counter() - started
    best = minimizer.inv_affine_transform(minimizer.result.x)
    best_values = dict(zip(names, map(float, best)))
    result = minimizer.result
    bounds = model.prior.bounds(confidence_for_unbounded=0.9999995)
    at_bounds = [
        name for index, name in enumerate(names)
        if np.isclose(best[index], bounds[index, 0], rtol=1.0e-6, atol=1.0e-8)
        or np.isclose(best[index], bounds[index, 1], rtol=1.0e-6, atol=1.0e-8)
    ]
    return best_values, {
        "sampler": "Cobaya Minimize / scipy L-BFGS-B",
        "target": "full nuisance posterior, including calibration and bounded foreground priors",
        "success": bool(result.success),
        "status": int(result.status),
        "message": str(result.message),
        "iterations": int(result.nit),
        "evaluations": int(result.nfev),
        "elapsed_seconds": elapsed,
        "seed": seed,
        "starts": initial_points,
        "all_minima_minus_logpost_and_success": minimizer.full_set_of_mins,
        "at_optimizer_bounds": at_bounds,
        "options": minimizer.info(),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--case", choices=sorted(SPECTRA), required=True)
    args = parser.parse_args()
    case = args.case
    protocol = json.loads((OUT / "planck-cmb-protocol.json").read_text(encoding="utf-8"))
    if protocol["status"] != "frozen_before_fixed_spectrum_planck_cmb_analysis":
        raise ValueError("Unexpected or unfrozen CMB protocol")
    output_path = OUT / f"planck-cmb-{case}-summary.json"
    if output_path.exists():
        raise FileExistsError(f"Refusing to overwrite frozen analysis output: {output_path}")
    for filename, expected in effective_input_hashes(protocol).items():
        path = Path(filename)
        if not path.is_absolute():
            path = REPO / filename
        if sha256(path) != expected:
            raise ValueError(f"Protocol input hash mismatch: {path}")

    records = {}
    for model_index, label in enumerate(["zero", "baseline"]):
        relative_spectrum = SPECTRA[case][label]
        spectrum = load_class_lensed_cl(REPO / relative_spectrum)
        model = get_model({
            "theory": {"fixed_cl": FixedClTheory({"spectra": spectrum})},
            "likelihood": {name: None for name in LIKELIHOODS},
            "packages_path": str(REPO / ".tmp/cobaya-packages"),
            "debug": False,
        })
        reference = reference_values(model)
        fixed = posterior_record(model, reference)
        best_values, optimizer = optimize_model(
            model, reference, seed=20261108 + 100 * list(SPECTRA).index(case) + model_index
        )
        profiled = posterior_record(model, best_values)
        records[label] = {
            "spectrum": relative_spectrum,
            "spectrum_sha256": sha256(REPO / relative_spectrum),
            "constant_parameters": model.parameterization.constant_params(),
            "fixed_reference": fixed,
            "profiled_nuisance_posterior": profiled,
            "optimizer": optimizer,
        }

    comparison = {"delta_definition": "zero minus baseline; positive delta chi squared or delta minus logpost favors baseline"}
    for section in ["fixed_reference", "profiled_nuisance_posterior"]:
        comparison[section] = {
            "delta_logpost_zero_minus_baseline": records["zero"][section]["logpost"] - records["baseline"][section]["logpost"],
            "delta_loglike_zero_minus_baseline": records["zero"][section]["loglike"] - records["baseline"][section]["loglike"],
            "delta_chi_squared_by_likelihood": {
                name: records["zero"][section]["chi_squared_by_likelihood"][name]
                - records["baseline"][section]["chi_squared_by_likelihood"][name]
                for name in LIKELIHOODS
            },
            "delta_chi_squared_total": -2 * (
                records["zero"][section]["loglike"] - records["baseline"][section]["loglike"]
            ),
        }
    summary = {
        "status": "computed_fixed_cosmology_planck_cmb_likelihood_with_separate_nuisance_profiles_not_cosmological_fit",
        "case": case,
        "cobaya_version": cobaya.__version__,
        "likelihoods": LIKELIHOODS,
        "spectrum_convention": "CLASS explicit cl_lensed.dat; TT/EE/TE are D_ell in FIRAS muK^2; pp is deflection [l(l+1)]^2 C_l^phiphi/(2pi)",
        "data_ranges": {"CamSpec_points": 9915, "lowl_TT": "2..29", "lowl_EE": "2..29", "native_lensing_bins": 9},
        "records": records,
        "comparison": comparison,
        "protocol_sha256": sha256(OUT / "planck-cmb-protocol.json"),
        "analysis_runner_sha256": sha256(Path(__file__).resolve()),
        "validation": {
            "all_reported_values_finite": bool(np.isfinite(comparison["profiled_nuisance_posterior"]["delta_chi_squared_total"])),
            "both_optimizers_converged": all(record["optimizer"]["success"] for record in records.values()),
            "cosmological_parameters_varied": False,
            "posterior_sampling_performed": False,
            "cmb_marginalized_lensing_added": False,
        },
        "boundaries": [
            "Only the frozen cosmological inputs are compared; foregrounds and calibrations are profiled separately for each spectrum.",
            "The optimization target is the nuisance posterior, not a cosmological posterior or a model-family best fit.",
            "Native lensing is counted once with TT/EE/TE; the CMB-marginalized lensing result is not added again.",
            "No Bayesian evidence, posterior model probability, or exclusion of the broader no-CDM model family is inferred.",
        ],
    }
    path = OUT / f"planck-cmb-{case}-summary.json"
    path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(path), "comparison": comparison["profiled_nuisance_posterior"], "converged": summary["validation"]["both_optimizers_converged"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
