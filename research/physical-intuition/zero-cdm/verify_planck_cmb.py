"""Independently reassemble CamSpec and re-evaluate all frozen CMB profile points."""

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

from analyze_planck_cmb import LIKELIHOODS, SPECTRA, effective_input_hashes, posterior_record  # noqa: E402
from fixed_cl_theory import FixedClTheory  # noqa: E402
from planck_cmb_likelihood import assemble_camspec_delta, load_class_lensed_cl  # noqa: E402


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def assert_close(actual, expected, label, rtol=1.0e-9, atol=1.0e-7):
    np.testing.assert_allclose(actual, expected, rtol=rtol, atol=atol, err_msg=label)


def verify_recfast_unlensed_consistency():
    comparisons = {}
    for label, prefix in [("zero", "zero-cdm"), ("baseline", "baseline-lcdm")]:
        original = REPO / f".tmp/class_public/convergence/recfast/{prefix}-recfast00_cl.dat"
        rerun = REPO / f".tmp/class_public/output/{prefix}-recfast-lensed00_00_cl.dat"
        old = np.loadtxt(original)
        new = np.loadtxt(rerun)
        shared = new[:len(old)]
        np.testing.assert_array_equal(old[:, 0], shared[:, 0])
        max_abs = {}
        max_scaled = {}
        for column, name in [(1, "tt"), (2, "ee"), (3, "te"), (5, "phiphi")]:
            difference = np.abs(old[:, column] - shared[:, column])
            scale = np.maximum(np.abs(old[:, column]), np.max(np.abs(old[:, column])) * 1.0e-12)
            max_abs[name] = float(np.max(difference))
            max_scaled[name] = float(np.max(difference / scale))
        assert max(max_abs.values()) < 2.0e-14
        assert max(max_scaled.values()) < 1.0e-3
        old_ini = REPO / f".tmp/class_public/{prefix}-recfast.ini"
        new_ini = REPO / f".tmp/class_public/{prefix}-recfast-lensed.ini"
        def parameters(path):
            result = {}
            for line in path.read_text(encoding="utf-8").splitlines():
                line = line.split("#", 1)[0].strip()
                if "=" in line:
                    key, value = line.split("=", 1)
                    result[key.strip()] = value.strip()
            return result
        old_parameters = parameters(old_ini)
        new_parameters = parameters(new_ini)
        assert new_parameters.pop("lensing") == "yes"
        old_parameters.pop("root", None)
        new_parameters.pop("root", None)
        assert old_parameters == new_parameters
        comparisons[label] = {
            "only_lensing_and_root_changed_in_input": True,
            "original_rows": len(old),
            "lensing_enabled_internal_rows": len(new),
            "shared_outputs_bitwise_identical": bool(np.array_equal(old, shared)),
            "shared_max_abs_difference": max_abs,
            "shared_max_scaled_difference": max_scaled,
            "scaled_difference_threshold": 1.0e-3,
            "absolute_difference_threshold": 2.0e-14,
        }
    return comparisons


def main():
    protocol = json.loads((OUT / "planck-cmb-protocol.json").read_text(encoding="utf-8"))
    inputs = effective_input_hashes(protocol)
    for amendment_path in sorted(OUT.glob("planck-cmb-amendment-*.json")):
        if amendment_path.name == "planck-cmb-amendment-01.json":
            continue
        amendment = json.loads(amendment_path.read_text(encoding="utf-8"))
        inputs.update(amendment["input_sha256_updates"])
    for filename, expected in inputs.items():
        path = Path(filename)
        if not path.is_absolute():
            path = REPO / filename
        if sha256(path) != expected:
            raise ValueError(f"Protocol input hash mismatch: {path}")
    results = {}
    for case in SPECTRA:
        summary_path = OUT / f"planck-cmb-{case}-summary.json"
        summary = json.loads(summary_path.read_text(encoding="utf-8"))
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
            values = record["profiled_nuisance_posterior"]["parameters"]
            recomputed = posterior_record(model, values)
            assert_close(recomputed["logpost"], record["profiled_nuisance_posterior"]["logpost"], f"{case}/{label} logpost")
            data_params = model.parameterization.constant_params() | model.parameterization.to_input(values)
            highl = model.likelihood[LIKELIHOODS[0]]
            delta = assemble_camspec_delta(
                highl.data_vector, highl.ell_ranges, highl.used_sizes, highl.cl_names,
                spectrum, highl.get_foregrounds(data_params), highl.get_cals(data_params),
            )
            # Cobaya uses symmetric BLAS for this 9915-point vector. A generic
            # matrix product differs by O(0.1) for the extreme zero-model chi2.
            from scipy.linalg.blas import dsymv
            independent_chi2 = float(dsymv(
                alpha=1.0,
                a=highl.covinv if np.isfortran(highl.covinv) else highl.covinv.T,
                x=delta,
                lower=0,
            ).dot(delta))
            official_chi2 = recomputed["chi_squared_by_likelihood"][LIKELIHOODS[0]]
            assert_close(independent_chi2, official_chi2, f"{case}/{label} independent CamSpec", rtol=1.0e-8)
            direct = {}
            direct[LIKELIHOODS[1]] = float(model.likelihood[LIKELIHOODS[1]].log_likelihood(
                spectrum["tt"], data_params.get("A_planck", 1)
            ))
            direct[LIKELIHOODS[2]] = float(model.likelihood[LIKELIHOODS[2]].log_likelihood(
                spectrum["ee"], data_params.get("A_planck", 1)
            ))
            direct[LIKELIHOODS[3]] = float(model.likelihood[LIKELIHOODS[3]].log_likelihood(
                spectrum, **data_params
            ))
            for name, value in direct.items():
                assert_close(value, recomputed["loglikes"][name], f"{case}/{label} {name}")
            case_results[label] = {
                "official_recalculation_matches": True,
                "independent_camspec_chi_squared": independent_chi2,
                "official_camspec_chi_squared": official_chi2,
                "absolute_camspec_difference": abs(independent_chi2 - official_chi2),
                "lowl_and_native_direct_calls_match": True,
                "optimizer_success_recorded": record["optimizer"]["success"],
            }
        results[case] = case_results
    results["recfast_input_and_unlensed_consistency"] = verify_recfast_unlensed_consistency()
    output = {
        "verification": "passed",
        "cases": results,
        "verification_runner_sha256": sha256(Path(__file__).resolve()),
        "boundaries": [
            "The independent CamSpec residual assembly is cross-checked against Cobaya, not substituted for it.",
            "Low-multipole and native lensing checks are direct second evaluations of the official implementations.",
            "Optimization is not repeated here; recorded optimizer convergence and independently recomputed optima are checked.",
        ],
    }
    path = OUT / "planck-cmb-verification.json"
    path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
