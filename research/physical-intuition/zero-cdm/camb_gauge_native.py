"""Transform frozen native CAMB transfers to CLASS's matter-comoving density."""

import argparse
import json
from pathlib import Path

import numpy as np

from camb_crosscode import CAMB_SOURCE_COMMIT, REPO, configuration, sha256
from gauge_transform import (
    class_comoving_matter_density,
    signed_error_summary,
    synchronous_baryon_velocity_from_newtonian,
)


OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "gauge-transform-native-protocol.json"
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
input_path = run_dir / "transfer-same-run.npz"
output_path = run_dir / "gauge-transform-native.npz"
summary_path = run_dir / "gauge-transform-native-summary.json"
if output_path.exists() or summary_path.exists():
    raise FileExistsError(f"Refusing to overwrite native gauge-transform outputs in {run_dir}")

config = configuration(args.model, args.level)
data = np.load(input_path)
q = np.asarray(data["q_Mpc_inv"], dtype=float)
h = float(data["h"])
transfer_data = data["transfer_data"]
model = __import__("camb.model", fromlist=["transfer_names"])
constants = __import__("camb.constants", fromlist=["c"])
symbolic = __import__("camb.symbolic", fromlist=["*"])


def scaled(name):
    values = transfer_data[model.transfer_names.index(name), :, 0]
    return q**2 * np.asarray(values, dtype=float)


delta_c = scaled("delta_cdm")
delta_b = scaled("delta_baryon")
native_delta_m = scaled("delta_tot")
v_newtonian_cdm = scaled("v_newtonian_cdm")
v_newtonian_baryon = scaled("v_newtonian_baryon")
direct_v_baryon_cdm = scaled("v_baryon_cdm")
conformal_h = config["H0"] * 1000.0 / constants.c
v_b = synchronous_baryon_velocity_from_newtonian(
    v_newtonian_cdm, v_newtonian_baryon, conformal_h, q
)
v_c = np.zeros_like(v_b)
rho_c = float(config["omch2"])
rho_b = float(config["ombh2"])
rho_m = rho_c + rho_b
weighted_delta_m = (rho_c * delta_c + rho_b * delta_b) / rho_m
comoving = class_comoving_matter_density(
    delta_c, delta_b, v_c, v_b, rho_c, rho_b, conformal_h, q
)

# Independent algebraic check: the generic CAMB frame transformation must be
# identical to the explicit CLASS pressureless-matter expression.
delta_m_expression = (
    symbolic.rho_c * symbolic.Delta_c + symbolic.rho_b * symbolic.Delta_b
) / (symbolic.rho_c + symbolic.rho_b)
v_m_expression = (
    symbolic.rho_c * symbolic.v_c + symbolic.rho_b * symbolic.v_b
) / (symbolic.rho_c + symbolic.rho_b)
class_expression = delta_m_expression + 3.0 * symbolic.H * v_m_expression / symbolic.k
frame_expression = symbolic.make_frame_invariant(delta_m_expression, frame=v_m_expression)
frame_minus_class = symbolic.simplify(frame_expression - class_expression)

indices = np.argmin(np.abs(np.log(q[:, None]) - np.log((TARGET_K_H * h)[None, :])), axis=0)
if np.unique(indices).size != TARGET_K_H.size:
    raise ValueError("sparse target modes are not unique on the native CAMB grid")
checks = {
    "weighted_delta_m_over_native_delta_tot": signed_error_summary(native_delta_m, weighted_delta_m),
    "recovered_v_b_over_direct_v_baryon_cdm": signed_error_summary(direct_v_baryon_cdm, v_b),
}
np.savez_compressed(
    output_path,
    target_k_h_per_Mpc=TARGET_K_H,
    native_indices=indices,
    q_Mpc_inv=q,
    k_h_per_Mpc=q / h,
    h=h,
    redshift=0.0,
    rho_c=rho_c,
    rho_b=rho_b,
    conformal_h=conformal_h,
    delta_c=delta_c,
    delta_b=delta_b,
    native_delta_m=native_delta_m,
    weighted_delta_m=weighted_delta_m,
    v_newtonian_cdm=v_newtonian_cdm,
    v_newtonian_baryon=v_newtonian_baryon,
    direct_v_baryon_cdm=direct_v_baryon_cdm,
    recovered_v_b=v_b,
    synchronous_v_c=v_c,
    comoving_manual=comoving,
    sparse_k_h_per_Mpc=q[indices] / h,
    sparse_native_delta_m=native_delta_m[indices],
    sparse_comoving_manual=comoving[indices],
)
summary = {
    "status": "computed_full_native_matter_comoving_transformation_with_sparse_crosscode_grid",
    "model": args.model,
    "level": args.level,
    "camb_source_commit": CAMB_SOURCE_COMMIT,
    "configuration": config,
    "actual_omch2": rho_c,
    "source_data": "transfer-same-run.npz from the unchanged ultra run; no new solver execution or recompilation",
    "transformation": {
        "newtonian_velocity_recovery": "v_b=-conformal_H*(V_Nb-V_Nc)/k from CAMB equations.f90 definitions",
        "direct_velocity_check": "CAMB v_baryon_cdm is the independent synchronous v_b-v_c output, with v_c=0",
        "class": "D_m=delta_m+3 conformal_H v_m/k for stable pressureless CDM+baryon matter",
        "symbolic_class_expression": str(class_expression),
        "symbolic_frame_expression": str(frame_expression),
        "symbolic_frame_minus_class": str(frame_minus_class),
        "conformal_h_today_Mpc_inv": conformal_h,
        "radiation_velocity_included": False,
    },
    "shape": {
        "native_points": int(q.size),
        "sparse_points": int(indices.size),
        "q_min_Mpc_inv": float(q[0]),
        "q_max_Mpc_inv": float(q[-1]),
    },
    "checks": checks,
    "validation": {
        "all_outputs_finite": bool(np.isfinite(comoving).all() and np.isfinite(v_b).all()),
        "symbolic_frame_expression_identical_to_class": bool(frame_minus_class == 0),
        "zero_model_omch2_exactly_zero": bool(args.model != "zero" or rho_c == 0.0),
        "weighted_density_within_2e-5": bool(
            checks["weighted_delta_m_over_native_delta_tot"]["max_abs_fraction"] is not None
            and checks["weighted_delta_m_over_native_delta_tot"]["max_abs_fraction"] <= 2.0e-5
        ),
        "recovered_velocity_within_2e-5": bool(
            checks["recovered_v_b_over_direct_v_baryon_cdm"]["max_abs_fraction"] is not None
            and checks["recovered_v_b_over_direct_v_baryon_cdm"]["max_abs_fraction"] <= 2.0e-5
        ),
        "full_native_grid_transformed": True,
        "whole_spectrum_convergence_claimed": False,
    },
    "input_sha256": {
        "protocol": sha256(PROTOCOL_PATH),
        "transfer_same_run": sha256(input_path),
        "parameters": sha256(run_dir / "parameters.ini"),
    },
    "output_sha256": {"gauge-transform-native.npz": sha256(output_path)},
    "boundaries": [
        "The mapping is applied to the full frozen native grid; CLASS comparison at this stage uses only nine sparse modes.",
        "No new time-evolution compilation is used after the recorded missing-gfortran failure.",
        "Recombination, perturbation implementation, sampling and interpolation systematics remain independent.",
        "No observational likelihood, covariance, joint BBN, nonlinear calculation, or model-family exclusion.",
    ],
}
summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=2))
