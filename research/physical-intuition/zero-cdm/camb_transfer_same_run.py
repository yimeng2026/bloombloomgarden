"""Compare native-transfer, same-run, and previously frozen CAMB power spectra."""

import argparse
import json
import resource
import time
from pathlib import Path

import numpy as np

from camb_crosscode import CAMB_SOURCE_COMMIT, REPO, build_params, sha256
from same_run_power import aligned_fractional_errors, error_summary
from signed_transfer_statistics import power_from_transfer


parser = argparse.ArgumentParser()
parser.add_argument("--model", required=True, choices=["zero", "baseline"])
parser.add_argument("--level", required=True, choices=["fiducial", "high", "ultra"])
args = parser.parse_args()

run_dir = REPO / ".tmp/camb-runs" / args.level / args.model
spectra_path = run_dir / "spectra.npz"
output_path = run_dir / "transfer-same-run.npz"
summary_path = run_dir / "transfer-same-run-summary.json"
if output_path.exists() or summary_path.exists():
    raise FileExistsError(f"Refusing to overwrite same-run outputs in {run_dir}")
if not spectra_path.exists():
    raise FileNotFoundError(f"Existing frozen spectrum is required: {spectra_path}")

pars, config = build_params(args.model, args.level)
started = time.perf_counter()
results = __import__("camb").get_results(pars)
transfer = results.get_matter_transfer_data()
q = np.asarray(transfer.q, dtype=float)
scaled_density = np.asarray(transfer.transfer_z("delta_tot", z_index=0), dtype=float)
density = q**2 * scaled_density
h = float(pars.H0 / 100.0)
k_h, reconstructed_h = power_from_transfer(
    q,
    density,
    config["As"],
    config["ns"],
    config["pivot_scalar"],
    h,
)
interpolator, _z_grid, interpolator_k = results.get_matter_power_interpolator(
    nonlinear=False,
    hubble_units=True,
    k_hunit=True,
    return_z_k=True,
)
interpolator_range = (k_h >= interpolator_k[0]) & (k_h <= interpolator_k[-1])
same_run_h = np.full(k_h.shape, np.nan)
same_run_h[interpolator_range] = interpolator.P(0.0, k_h[interpolator_range])

existing = np.load(spectra_path)
existing_k = existing["pk_k_h_per_Mpc"]
existing_p = existing["pk_p_Mpc_over_h_cubed"]
in_range = interpolator_range & (k_h >= existing_k[0]) & (k_h <= existing_k[-1])
frozen_h = np.exp(np.interp(
    np.log(k_h[in_range]),
    np.log(existing_k),
    np.log(existing_p),
))
k_aligned = k_h[in_range]
reconstructed_aligned = reconstructed_h[in_range]
same_run_aligned = same_run_h[in_range]
errors = {
    "native_reconstruction_vs_same_run": error_summary(aligned_fractional_errors(
        k_aligned, reconstructed_aligned, same_run_aligned
    )),
    "same_run_vs_previous_frozen": error_summary(aligned_fractional_errors(
        k_aligned, same_run_aligned, frozen_h
    )),
    "native_reconstruction_vs_previous_frozen": error_summary(aligned_fractional_errors(
        k_aligned, reconstructed_aligned, frozen_h
    )),
}
band = (k_aligned >= 0.01) & (k_aligned <= 1.28)
errors["common_band_0.01_to_1.28"] = {
    "native_reconstruction_vs_same_run": error_summary(aligned_fractional_errors(
        k_aligned[band], reconstructed_aligned[band], same_run_aligned[band]
    )),
    "same_run_vs_previous_frozen": error_summary(aligned_fractional_errors(
        k_aligned[band], same_run_aligned[band], frozen_h[band]
    )),
    "native_reconstruction_vs_previous_frozen": error_summary(aligned_fractional_errors(
        k_aligned[band], reconstructed_aligned[band], frozen_h[band]
    )),
}
np.savez_compressed(
    output_path,
    q_Mpc_inv=q,
    k_h_per_Mpc=k_h,
    h=h,
    redshift=0.0,
    delta_tot_over_k2=scaled_density,
    delta_tot=density,
    native_reconstructed_p=reconstructed_h,
    same_run_p=same_run_h,
    frozen_p_interpolated=frozen_h,
    transfer_data=transfer.transfer_data,
)
summary = {
    "status": "computed_same_run_and_frozen_power_comparison_not_observational_fit",
    "model": args.model,
    "level": args.level,
    "camb_source_commit": CAMB_SOURCE_COMMIT,
    "configuration": config,
    "actual_omch2": float(pars.omch2),
    "sources": {
        "native_reconstruction": "float32 get_matter_transfer_data delta_tot/k^2, rescaled by q^2, then the frozen adiabatic power formula",
        "same_run_power": "the same get_results object, get_matter_power_interpolator(nonlinear=False, hubble_units=True, k_hunit=True)",
        "previous_frozen_power": "log-log interpolation of the previously frozen spectra.npz on the aligned native k grid",
    },
    "native_transfer_dtype": str(transfer.transfer_data.dtype),
    "same_run_power_dtype": str(same_run_h.dtype),
    "shape": {
        "native_q_points": int(q.size),
        "aligned_points": int(k_aligned.size),
        "common_band_points": int(band.sum()),
        "q_min_Mpc_inv": float(q[0]),
        "q_max_Mpc_inv": float(q[-1]),
    },
    "comparisons": errors,
    "validation": {
        "all_native_transfer_values_finite": bool(np.isfinite(transfer.transfer_data).all()),
        "all_same_run_power_finite_and_positive": bool(
            np.isfinite(same_run_h[in_range]).all() and np.all(same_run_h[in_range] > 0.0)
        ),
        "zero_model_omch2_exactly_zero": bool(args.model != "zero" or float(pars.omch2) == 0.0),
    },
    "elapsed_seconds": time.perf_counter() - started,
    "maximum_rss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
    "input_sha256": {
        "runner": sha256(Path(__file__).resolve()),
        "same_run_power.py": sha256(REPO / "research/physical-intuition/zero-cdm/same_run_power.py"),
        "frozen_spectra": sha256(spectra_path),
        "parameters": sha256(run_dir / "parameters.ini"),
    },
    "output_sha256": {"transfer-same-run.npz": sha256(output_path)},
    "boundaries": [
        "These are numerical diagnostics, not observational errors or convergence proofs.",
        "A small same-run/frozen difference only tests reproducibility and interpolation, not physical correctness.",
        "Large native-reconstruction differences cannot be assigned to quantization, interpolation, or the solver without additional evidence.",
    ],
}
summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=2))
