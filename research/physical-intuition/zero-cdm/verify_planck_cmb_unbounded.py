"""Verify untruncated-calibration nuisance profiles and independent CamSpec residuals."""

import hashlib
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
sys.path.insert(0, str(REPO / ".tmp/cobaya-python"))
sys.path.insert(0, str(OUT))

import numpy as np  # noqa: E402
from cobaya.model import get_model  # noqa: E402
from scipy.linalg.blas import dsymv  # noqa: E402

from analyze_planck_cmb import LIKELIHOODS, SPECTRA, posterior_record  # noqa: E402
from fixed_cl_theory import FixedClTheory  # noqa: E402
from planck_cmb_likelihood import assemble_camspec_delta, load_class_lensed_cl  # noqa: E402


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    protocol = json.loads((OUT / "planck-cmb-unbounded-protocol.json").read_text(encoding="utf-8"))
    for filename, expected in protocol["input_sha256"].items():
        path = Path(filename)
        if not path.is_absolute():
            path = REPO / filename
        if sha256(path) != expected:
            raise ValueError(f"Protocol input hash mismatch: {path}")
    results = {}
    for case in SPECTRA:
        summary = json.loads((OUT / f"planck-cmb-unbounded-{case}-summary.json").read_text(encoding="utf-8"))
        case_results = {}
        for label in ["zero", "baseline"]:
            record = summary["records"][label]
            spectrum = load_class_lensed_cl(REPO / SPECTRA[case][label])
            model = get_model({
                "theory": {"fixed_cl": FixedClTheory({"spectra": spectrum})},
                "likelihood": {name: None for name in LIKELIHOODS},
                "packages_path": str(REPO / ".tmp/cobaya-packages"),
                "debug": False,
            })
            expected = record["profiled_nuisance_posterior"]
            actual = posterior_record(model, expected["parameters"])
            np.testing.assert_allclose(actual["logpost"], expected["logpost"], rtol=1.0e-9, atol=1.0e-7)
            assert record["optimizer"]["success"]
            assert record["logpost_improvement_over_5sigma"] >= -1.0e-6
            data_params = model.parameterization.constant_params() | model.parameterization.to_input(expected["parameters"])
            highl = model.likelihood[LIKELIHOODS[0]]
            delta = assemble_camspec_delta(
                highl.data_vector, highl.ell_ranges, highl.used_sizes, highl.cl_names,
                spectrum, highl.get_foregrounds(data_params), highl.get_cals(data_params),
            )
            independent = float(dsymv(
                alpha=1.0,
                a=highl.covinv if np.isfortran(highl.covinv) else highl.covinv.T,
                x=delta,
                lower=0,
            ).dot(delta))
            official = actual["chi_squared_by_likelihood"][LIKELIHOODS[0]]
            np.testing.assert_allclose(independent, official, rtol=1.0e-9, atol=1.0e-7)
            direct_lowt = model.likelihood[LIKELIHOODS[1]].log_likelihood(spectrum["tt"], data_params["A_planck"])
            direct_lowe = model.likelihood[LIKELIHOODS[2]].log_likelihood(spectrum["ee"], data_params["A_planck"])
            direct_native = model.likelihood[LIKELIHOODS[3]].log_likelihood(spectrum, **data_params)
            np.testing.assert_allclose(
                [direct_lowt, direct_lowe, direct_native],
                [actual["loglikes"][name] for name in LIKELIHOODS[1:]],
                rtol=1.0e-9, atol=1.0e-7,
            )
            case_results[label] = {
                "official_recalculation_matches": True,
                "independent_camspec_chi_squared": independent,
                "official_camspec_chi_squared": official,
                "absolute_camspec_difference": abs(independent - official),
                "lowl_and_native_direct_calls_match": True,
                "optimizer_success": True,
                "logpost_improvement_over_5sigma": record["logpost_improvement_over_5sigma"],
                "at_finite_prior_bounds": record["optimizer"]["at_finite_prior_bounds"],
            }
        results[case] = case_results
    output = {
        "verification": "passed",
        "cases": results,
        "verification_runner_sha256": sha256(Path(__file__).resolve()),
        "boundaries": [
            "Original Gaussian calibration priors remain in the target; only finite optimizer cutoffs are removed.",
            "No cosmological posterior, model-family fit or double-counted CMB-marginalized lensing term is included.",
        ],
    }
    path = OUT / "planck-cmb-unbounded-verification.json"
    path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
