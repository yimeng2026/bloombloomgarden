"""Sensitivity analysis without artificial finite bounds on Gaussian calibrations."""

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
from cobaya.model import get_model  # noqa: E402
from cobaya.output import get_output  # noqa: E402
from cobaya.samplers.minimize.minimize import Minimize  # noqa: E402

from analyze_planck_cmb import LIKELIHOODS, SPECTRA, posterior_record, reference_values  # noqa: E402
from fixed_cl_theory import FixedClTheory  # noqa: E402
from planck_cmb_likelihood import load_class_lensed_cl  # noqa: E402


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def optimize_unbounded(model, previous, reference):
    minimizer = Minimize(
        {
            "method": "scipy",
            "ignore_prior": False,
            "best_of": 2,
            "seed": 20261118,
            "max_evals": 5000,
            "confidence_for_unbounded": 1,
            "override_scipy": {
                "method": "L-BFGS-B",
                "options": {
                    "maxiter": 5000,
                    "maxfun": 80000,
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
    starts = [np.array([previous[name] for name in names])]
    reference_array = np.array([reference[name] for name in names])
    starts.append(reference_array if np.isfinite(model.logpost(reference_array)) else minimizer.initial_points[1])
    minimizer.initial_points = starts
    started = time.perf_counter()
    minimizer.run()
    elapsed = time.perf_counter() - started
    best = minimizer.inv_affine_transform(minimizer.result.x)
    values = dict(zip(names, map(float, best)))
    result = minimizer.result
    bounds = model.prior.bounds(confidence_for_unbounded=1)
    at_finite_bounds = []
    for index, name in enumerate(names):
        lower, upper = bounds[index]
        if (np.isfinite(lower) and np.isclose(best[index], lower, rtol=1.0e-6, atol=1.0e-8)) or (
            np.isfinite(upper) and np.isclose(best[index], upper, rtol=1.0e-6, atol=1.0e-8)
        ):
            at_finite_bounds.append(name)
    return values, {
        "sampler": "Cobaya Minimize / scipy L-BFGS-B",
        "target": "full nuisance posterior with original priors; Gaussian calibrations have no finite optimizer cutoff",
        "success": bool(result.success),
        "status": int(result.status),
        "message": str(result.message),
        "iterations": int(result.nit),
        "evaluations": int(result.nfev),
        "elapsed_seconds": elapsed,
        "starts": [dict(zip(names, map(float, point))) for point in starts],
        "all_minima_minus_logpost_and_success": minimizer.full_set_of_mins,
        "at_finite_prior_bounds": at_finite_bounds,
        "gaussian_calibration_bounds": "infinite optimizer bounds; original Gaussian priors still applied",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--case", choices=sorted(SPECTRA), required=True)
    args = parser.parse_args()
    case = args.case
    protocol_path = OUT / "planck-cmb-unbounded-protocol.json"
    protocol = json.loads(protocol_path.read_text(encoding="utf-8"))
    for filename, expected in protocol["input_sha256"].items():
        path = Path(filename)
        if not path.is_absolute():
            path = REPO / filename
        if sha256(path) != expected:
            raise ValueError(f"Protocol input hash mismatch: {path}")
    output_path = OUT / f"planck-cmb-unbounded-{case}-summary.json"
    if output_path.exists():
        raise FileExistsError(f"Refusing to overwrite sensitivity output: {output_path}")
    previous_summary = json.loads((OUT / f"planck-cmb-{case}-summary.json").read_text(encoding="utf-8"))
    records = {}
    for label in ["zero", "baseline"]:
        spectrum = load_class_lensed_cl(REPO / SPECTRA[case][label])
        model = get_model({
            "theory": {"fixed_cl": FixedClTheory({"spectra": spectrum})},
            "likelihood": {name: None for name in LIKELIHOODS},
            "packages_path": str(REPO / ".tmp/cobaya-packages"),
            "debug": False,
        })
        reference = reference_values(model)
        previous = previous_summary["records"][label]["profiled_nuisance_posterior"]["parameters"]
        best_values, optimizer = optimize_unbounded(model, previous, reference)
        records[label] = {
            "spectrum": SPECTRA[case][label],
            "spectrum_sha256": sha256(REPO / SPECTRA[case][label]),
            "profiled_nuisance_posterior": posterior_record(model, best_values),
            "optimizer": optimizer,
            "previous_5sigma_logpost": previous_summary["records"][label]["profiled_nuisance_posterior"]["logpost"],
        }
        records[label]["logpost_improvement_over_5sigma"] = (
            records[label]["profiled_nuisance_posterior"]["logpost"] - records[label]["previous_5sigma_logpost"]
        )
    comparison = {
        "delta_logpost_zero_minus_baseline": records["zero"]["profiled_nuisance_posterior"]["logpost"] - records["baseline"]["profiled_nuisance_posterior"]["logpost"],
        "delta_loglike_zero_minus_baseline": records["zero"]["profiled_nuisance_posterior"]["loglike"] - records["baseline"]["profiled_nuisance_posterior"]["loglike"],
        "delta_chi_squared_total": -2 * (records["zero"]["profiled_nuisance_posterior"]["loglike"] - records["baseline"]["profiled_nuisance_posterior"]["loglike"]),
        "delta_chi_squared_by_likelihood": {
            name: records["zero"]["profiled_nuisance_posterior"]["chi_squared_by_likelihood"][name]
            - records["baseline"]["profiled_nuisance_posterior"]["chi_squared_by_likelihood"][name]
            for name in LIKELIHOODS
        },
    }
    summary = {
        "status": "computed_unbounded_gaussian_calibration_nuisance_profile_fixed_cosmology_not_model_fit",
        "case": case,
        "records": records,
        "comparison": comparison,
        "protocol_sha256": sha256(protocol_path),
        "analysis_runner_sha256": sha256(Path(__file__).resolve()),
        "validation": {
            "both_optimizers_converged": all(record["optimizer"]["success"] for record in records.values()),
            "finite_delta_chi_squared": bool(np.isfinite(comparison["delta_chi_squared_total"])),
            "gaussian_calibrations_artificially_truncated": False,
            "posterior_sampling_performed": False,
        },
        "boundaries": [
            "This is a nuisance-optimizer sensitivity analysis, not a change to data, physical spectra or calibration priors.",
            "The default 5-sigma-bound results remain preserved in planck-cmb-{case}-summary.json.",
            "No cosmological fit, posterior model probability or no-CDM model-family exclusion is claimed.",
        ],
    }
    output_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(output_path), "comparison": comparison, "parameters": {label: record["profiled_nuisance_posterior"]["parameters"] for label, record in records.items()}, "converged": summary["validation"]["both_optimizers_converged"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
