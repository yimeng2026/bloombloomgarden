"""Extract native CAMB transfer functions without changing physical inputs.

Run in WSL, one model/level at a time:
PYTHONPATH=.tmp/camb-wsl-site python3 research/physical-intuition/zero-cdm/camb_transfer.py --model zero --level fiducial
"""

import argparse
import json
import resource
import time
from pathlib import Path

import numpy as np

from camb_crosscode import CAMB_SOURCE_COMMIT, REPO, build_params, sha256
from signed_transfer_statistics import power_from_transfer


parser = argparse.ArgumentParser()
parser.add_argument("--model", required=True, choices=["zero", "baseline"])
parser.add_argument("--level", required=True, choices=["fiducial", "high", "ultra"])
args = parser.parse_args()

run_dir = REPO / ".tmp/camb-runs" / args.level / args.model
spectra_path = run_dir / "spectra.npz"
transfer_path = run_dir / "transfer.npz"
summary_path = run_dir / "transfer-summary.json"
if transfer_path.exists() or summary_path.exists():
    raise FileExistsError(f"Refusing to overwrite native transfer outputs in {run_dir}")
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

existing = np.load(spectra_path)
existing_k = existing["pk_k_h_per_Mpc"]
existing_p = existing["pk_p_Mpc_over_h_cubed"]
in_range = (k_h >= existing_k[0]) & (k_h <= existing_k[-1])
reference_h = np.exp(np.interp(
    np.log(k_h[in_range]),
    np.log(existing_k),
    np.log(existing_p),
))
fractional = reconstructed_h[in_range] / reference_h - 1.0
np.savez_compressed(
    transfer_path,
    q_Mpc_inv=q,
    k_h_per_Mpc=k_h,
    h=h,
    redshift=0.0,
    delta_tot_over_k2=scaled_density,
    delta_tot=density,
    reconstructed_p_Mpc_over_h_cubed=reconstructed_h,
    transfer_data=transfer.transfer_data,
)

summary = {
    "status": "computed_native_transfer_fixed_inputs_not_observational_fit",
    "model": args.model,
    "level": args.level,
    "camb_source_commit": CAMB_SOURCE_COMMIT,
    "configuration": config,
    "actual_omch2": float(pars.omch2),
    "variable_mapping": {
        "q": "flat-universe q=k in 1/Mpc",
        "delta_tot_over_k2": "native CAMB synchronous-gauge delta_tot divided by k^2",
        "delta_tot": "q^2 times native scaled output; sign preserved",
        "power": "2 pi^2 As (k/k_pivot)^(ns-1) delta_tot^2 / k^3, converted to h units",
    },
    "shape": {
        "q_points": int(q.size),
        "transfer_data": list(transfer.transfer_data.shape),
        "q_min_Mpc_inv": float(q[0]),
        "q_max_Mpc_inv": float(q[-1]),
    },
    "reconstruction_vs_saved_interpolated_power": {
        "points": int(fractional.size),
        "median_abs_fraction": float(np.median(np.abs(fractional))),
        "p95_abs_fraction": float(np.percentile(np.abs(fractional), 95)),
        "max_abs_fraction": float(np.max(np.abs(fractional))),
        "note": "CAMB transfer_data is float32 and saved P(k) is interpolated; deep-minimum differences are not convergence errors by themselves.",
    },
    "validation": {
        "all_transfer_values_finite": bool(np.isfinite(transfer.transfer_data).all()),
        "density_has_positive_and_negative_values": bool(np.any(density > 0.0) and np.any(density < 0.0)),
        "zero_model_omch2_exactly_zero": bool(args.model != "zero" or float(pars.omch2) == 0.0),
    },
    "elapsed_seconds": time.perf_counter() - started,
    "maximum_rss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
    "input_sha256": {
        "runner": sha256(Path(__file__).resolve()),
        "frozen_spectra": sha256(spectra_path),
        "parameters": sha256(run_dir / "parameters.ini"),
    },
    "output_sha256": {"transfer.npz": sha256(transfer_path)},
}
summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=2))
