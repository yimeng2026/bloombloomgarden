"""Validate the explicit CLASS matter-comoving density on sparse CAMB modes."""

import argparse
import json
import resource
import time
from pathlib import Path

import numpy as np

from camb_crosscode import CAMB_SOURCE_COMMIT, REPO, build_params, sha256
from gauge_transform import class_comoving_matter_density, signed_error_summary


OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "gauge-transform-protocol.json"
TARGET_K_H = np.array([0.0001, 0.0003, 0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1.0])


def check_protocol():
    protocol = json.loads(PROTOCOL_PATH.read_text(encoding="utf-8"))
    for filename, expected in protocol["input_sha256"].items():
        path = Path(filename)
        if not path.is_absolute():
            path = REPO / filename
        if sha256(path) != expected:
            raise ValueError(f"frozen protocol input hash mismatch: {path}")
    return protocol


parser = argparse.ArgumentParser()
parser.add_argument("--model", required=True, choices=["zero", "baseline"])
parser.add_argument("--level", required=True, choices=["fiducial", "high", "ultra"])
args = parser.parse_args()
protocol = check_protocol()
run_dir = REPO / ".tmp/camb-runs" / args.level / args.model
output_path = run_dir / "gauge-transform.npz"
summary_path = run_dir / "gauge-transform-summary.json"
if output_path.exists() or summary_path.exists():
    raise FileExistsError(f"Refusing to overwrite gauge-transform outputs in {run_dir}")

pars, config = build_params(args.model, args.level)
started = time.perf_counter()
results = __import__("camb").get_results(pars)
symbolic = __import__("camb.symbolic", fromlist=["*"])
transfer = results.get_matter_transfer_data()
q_all = np.asarray(transfer.q, dtype=float)
h = float(pars.H0 / 100.0)
target_q = TARGET_K_H * h
indices = np.argmin(np.abs(np.log(q_all[:, None]) - np.log(target_q[None, :])), axis=0)
if np.unique(indices).size != TARGET_K_H.size:
    raise ValueError("sparse target modes are not unique on the native CAMB grid")
q = q_all[indices]
k_h = q / h

# This is precisely CLASS's stable-pressureless-matter convention, using
# synchronous CAMB variables and conformal H = aH. No radiation velocity enters.
delta_m_expression = (
    symbolic.rho_c * symbolic.Delta_c + symbolic.rho_b * symbolic.Delta_b
) / (symbolic.rho_c + symbolic.rho_b)
v_m_expression = (
    symbolic.rho_c * symbolic.v_c + symbolic.rho_b * symbolic.v_b
) / (symbolic.rho_c + symbolic.rho_b)
class_expression = delta_m_expression + 3.0 * symbolic.H * v_m_expression / symbolic.k
frame_expression = symbolic.make_frame_invariant(delta_m_expression, frame=v_m_expression)
variables = [
    "delta_cdm",
    "delta_baryon",
    symbolic.v_c,
    symbolic.v_b,
    "a",
    "H",
    class_expression,
    frame_expression,
]
evolution = np.asarray(
    results.get_time_evolution(
        q,
        [results.tau0],
        vars=variables,
        lAccuracyBoost=config["lAccuracyBoost"],
        frame="CDM",
    )[:, 0, :],
    dtype=float,
)
delta_c = evolution[:, 0]
delta_b = evolution[:, 1]
v_c = evolution[:, 2]
v_b = evolution[:, 3]
a = evolution[:, 4]
conformal_h = evolution[:, 5]
symbolic_class = evolution[:, 6]
symbolic_frame = evolution[:, 7]

background = results.get_background_densities(1.0)
rho_c = float(background["cdm"][0])
rho_b = float(background["baryon"][0])
manual = class_comoving_matter_density(
    delta_c, delta_b, v_c, v_b, rho_c, rho_b, conformal_h, q
)
rho_m = rho_c + rho_b
time_delta_m = (rho_c * delta_c + rho_b * delta_b) / rho_m
native_delta_c = q**2 * np.asarray(transfer.transfer_z("delta_cdm", z_index=0)[indices], dtype=float)
native_delta_b = q**2 * np.asarray(transfer.transfer_z("delta_baryon", z_index=0)[indices], dtype=float)
native_delta_m = q**2 * np.asarray(transfer.transfer_z("delta_tot", z_index=0)[indices], dtype=float)

checks = {
    "time_delta_c_over_native_scaled_transfer": signed_error_summary(native_delta_c, delta_c),
    "time_delta_b_over_native_scaled_transfer": signed_error_summary(native_delta_b, delta_b),
    "time_delta_m_over_native_scaled_transfer": signed_error_summary(native_delta_m, time_delta_m),
    "manual_over_symbolic_class_expression": signed_error_summary(symbolic_class, manual),
    "manual_over_symbolic_frame_expression": signed_error_summary(symbolic_frame, manual),
    "symbolic_class_over_symbolic_frame": signed_error_summary(symbolic_frame, symbolic_class),
}
np.savez_compressed(
    output_path,
    target_k_h_per_Mpc=TARGET_K_H,
    native_indices=indices,
    q_Mpc_inv=q,
    k_h_per_Mpc=k_h,
    h=h,
    redshift=0.0,
    rho_c=rho_c,
    rho_b=rho_b,
    native_delta_c=native_delta_c,
    native_delta_b=native_delta_b,
    native_delta_m=native_delta_m,
    time_delta_c=delta_c,
    time_delta_b=delta_b,
    time_delta_m=time_delta_m,
    v_c=v_c,
    v_b=v_b,
    a=a,
    conformal_h=conformal_h,
    comoving_manual=manual,
    comoving_symbolic_class=symbolic_class,
    comoving_symbolic_frame=symbolic_frame,
)
summary = {
    "status": "computed_sparse_explicit_matter_comoving_gauge_transformation_not_observational_fit",
    "model": args.model,
    "level": args.level,
    "camb_version": __import__("camb").__version__,
    "camb_source_commit": CAMB_SOURCE_COMMIT,
    "configuration": config,
    "actual_omch2": float(pars.omch2),
    "transformation": {
        "class_source": "perturbations.c: delta_m += 3 a H theta_m/k^2 with stable pressureless-matter weighting",
        "camb_velocity_relation": "theta_m = k v_m; v_m=(rho_c v_c+rho_b v_b)/(rho_c+rho_b)",
        "manual": "D_m=(rho_c Delta_c+rho_b Delta_b)/(rho_c+rho_b)+3 conformal_H v_m/k",
        "symbolic_class_expression": str(class_expression),
        "symbolic_frame_expression": str(frame_expression),
        "radiation_velocity_included": False,
        "massive_neutrinos_present": False,
    },
    "sparse_grid": {
        "requested_k_h_per_Mpc": TARGET_K_H.tolist(),
        "actual_k_h_per_Mpc": k_h.tolist(),
        "q_Mpc_inv": q.tolist(),
        "native_indices": indices.tolist(),
    },
    "background": {
        "rho_c": rho_c,
        "rho_b": rho_b,
        "a_min": float(a.min()),
        "a_max": float(a.max()),
        "conformal_h_today": float(results.h_of_z(0.0)),
        "max_abs_a_minus_1": float(np.max(np.abs(a - 1.0))),
        "max_abs_conformal_h_difference": float(np.max(np.abs(conformal_h - results.h_of_z(0.0)))),
        "max_abs_synchronous_v_c": float(np.max(np.abs(v_c))),
    },
    "checks": checks,
    "validation": {
        "all_outputs_finite": bool(np.isfinite(evolution).all() and np.isfinite(manual).all()),
        "zero_model_omch2_exactly_zero": bool(args.model != "zero" or float(pars.omch2) == 0.0),
        "radiation_free_matter_frame": True,
        "native_total_density_within_2e-5": bool(
            checks["time_delta_m_over_native_scaled_transfer"]["max_abs_fraction"] is not None
            and checks["time_delta_m_over_native_scaled_transfer"]["max_abs_fraction"] <= 2.0e-5
        ),
        "manual_matches_class_expression": bool(
            checks["manual_over_symbolic_class_expression"]["max_abs_difference"] <= 1.0e-8
            and (checks["manual_over_symbolic_class_expression"]["max_abs_fraction"] or 0.0) <= 1.0e-6
        ),
        "manual_matches_independent_frame_expression": bool(
            checks["manual_over_symbolic_frame_expression"]["max_abs_difference"] <= 1.0e-8
            and (checks["manual_over_symbolic_frame_expression"]["max_abs_fraction"] or 0.0) <= 1.0e-6
        ),
        "scale_factor_is_today_within_1e-12": bool(np.max(np.abs(a - 1.0)) <= 1.0e-12),
        "whole_spectrum_claimed": False,
    },
    "elapsed_seconds": time.perf_counter() - started,
    "maximum_rss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
    "input_sha256": {
        "protocol": sha256(PROTOCOL_PATH),
        "parameters": sha256(run_dir / "parameters.ini"),
    },
    "output_sha256": {"gauge-transform.npz": sha256(output_path)},
    "boundaries": [
        "Sparse modes validate the explicit mapping and units; they do not establish whole-spectrum convergence.",
        "The matter-comoving frame uses only CDM and baryon velocities, not the total heat flux including radiation.",
        "CLASS/CAMB recombination, perturbation implementation, sampling and other systematics remain independent.",
        "No observational likelihood, covariance, joint BBN, nonlinear calculation, or model-family exclusion.",
    ],
}
summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=2))
