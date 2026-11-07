"""Use direct synchronous velocity and CLASS curvature normalization for the gauge map."""

import argparse
import json
from pathlib import Path

import numpy as np

from camb_crosscode import REPO, sha256
from gauge_transform import class_comoving_matter_density, signed_error_summary


OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "gauge-refined-protocol.json"
RANGES = {
    "below_0.0001": (None, 0.0001),
    "0.0001_to_0.001": (0.0001, 0.001),
    "0.001_to_0.01": (0.001, 0.01),
    "0.01_and_above": (0.01, None),
}


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
input_path = run_dir / "gauge-transform-native.npz"
output_path = run_dir / "gauge-transform-refined.npz"
summary_path = run_dir / "gauge-transform-refined-summary.json"
if output_path.exists() or summary_path.exists():
    raise FileExistsError(f"Refusing to overwrite refined gauge outputs in {run_dir}")

data = np.load(input_path)
q = data["q_Mpc_inv"]
k_h = data["k_h_per_Mpc"]
direct_v_b = data["direct_v_baryon_cdm"]
comoving_direct = class_comoving_matter_density(
    data["delta_c"],
    data["delta_b"],
    data["synchronous_v_c"],
    direct_v_b,
    float(data["rho_c"]),
    float(data["rho_b"]),
    float(data["conformal_h"]),
    q,
)
comoving_recovered = data["comoving_manual"]
# CAMB's default adiabatic initialization uses chi=-1, whereas the CLASS
# native transfer files normalize initial curvature to +1. This sign applies
# only to signed cross-code transfer comparisons, never to power or physics.
class_signed_comoving = -comoving_direct
class_signed_synchronous = -data["native_delta_m"]

symbolic = __import__("camb.symbolic", fromlist=["*"])
delta_m_expression = (
    symbolic.rho_c * symbolic.Delta_c + symbolic.rho_b * symbolic.Delta_b
) / (symbolic.rho_c + symbolic.rho_b)
v_m_expression = (
    symbolic.rho_c * symbolic.v_c + symbolic.rho_b * symbolic.v_b
) / (symbolic.rho_c + symbolic.rho_b)
class_expression = delta_m_expression + 3.0 * symbolic.H * v_m_expression / symbolic.k
frame_expression = symbolic.make_frame_invariant(delta_m_expression, frame=v_m_expression)
pressureless_frame = frame_expression.subs(symbolic.p_b, 0)
pressureless_difference = symbolic.simplify(pressureless_frame - class_expression)

range_diagnostics = {}
for name, (lower, upper) in RANGES.items():
    selected = np.ones(k_h.shape, dtype=bool)
    if lower is not None:
        selected &= k_h >= lower
    if upper is not None:
        selected &= k_h < upper
    range_diagnostics[name] = {
        "points": int(np.count_nonzero(selected)),
        "k_range_actual": [float(k_h[selected][0]), float(k_h[selected][-1])],
        "recovered_v_b_over_direct": signed_error_summary(direct_v_b[selected], data["recovered_v_b"][selected]),
        "comoving_recovered_over_direct": signed_error_summary(comoving_direct[selected], comoving_recovered[selected]),
    }

np.savez_compressed(
    output_path,
    q_Mpc_inv=q,
    k_h_per_Mpc=k_h,
    native_indices=data["native_indices"],
    sparse_k_h_per_Mpc=data["sparse_k_h_per_Mpc"],
    rho_c=data["rho_c"],
    rho_b=data["rho_b"],
    conformal_h=data["conformal_h"],
    delta_c=data["delta_c"],
    delta_b=data["delta_b"],
    native_delta_m=data["native_delta_m"],
    direct_v_baryon_cdm=direct_v_b,
    recovered_v_b=data["recovered_v_b"],
    comoving_direct_v_b=comoving_direct,
    comoving_recovered_v_b=comoving_recovered,
    class_signed_comoving=class_signed_comoving,
    class_signed_synchronous=class_signed_synchronous,
    sparse_class_signed_comoving=class_signed_comoving[data["native_indices"]],
    sparse_class_signed_synchronous=class_signed_synchronous[data["native_indices"]],
)
summary = {
    "status": "computed_refined_native_gauge_map_with_direct_velocity_and_class_sign",
    "model": args.model,
    "level": args.level,
    "input": "gauge-transform-native.npz; no new solver execution",
    "velocity_choice": {
        "transform": "direct native v_baryon_cdm, equal to synchronous v_b because v_c=0",
        "diagnostic_only": "Newtonian two-output subtraction is retained only to expose float32 cancellation at very low k",
    },
    "class_sign": {
        "class_initial_curvature": 1,
        "camb_default_adiabatic_chi": -1,
        "signed_mapping": "T_CLASS = -T_CAMB for matched unit-curvature transfer conventions",
        "power_changed": False,
        "sources": ["CLASS perturbations.c:670", "CAMB equations.f90:2000 and 2069-2070"],
    },
    "symbolic_check": {
        "generic_frame_minus_class": str(symbolic.simplify(frame_expression - class_expression)),
        "pressureless_substitution": "p_b=0, matching CLASS stable-pressureless-matter transformation and CAMB camb_sub",
        "pressureless_frame_minus_class": str(pressureless_difference),
    },
    "range_diagnostics": range_diagnostics,
    "comoving_recovered_over_direct_full": signed_error_summary(comoving_direct, comoving_recovered),
    "validation": {
        "all_outputs_finite": bool(np.isfinite(comoving_direct).all() and np.isfinite(class_signed_comoving).all()),
        "pressureless_symbolic_identity": bool(pressureless_difference == 0),
        "direct_native_velocity_used": True,
        "newtonian_subtraction_used_for_final_transform": False,
        "class_sign_applied_only_to_signed_crosscode_output": True,
        "zero_model_omch2_exactly_zero": bool(args.model != "zero" or float(data["rho_c"]) == 0.0),
        "whole_spectrum_convergence_claimed": False,
    },
    "input_sha256": {
        "protocol": sha256(PROTOCOL_PATH),
        "native_gauge_transform": sha256(input_path),
    },
    "output_sha256": {"gauge-transform-refined.npz": sha256(output_path)},
    "boundaries": [
        "The direct native velocity avoids the cancellation diagnostic; it does not remove float32 storage limits elsewhere.",
        "Cross-code sign normalization is derived from initial-curvature conventions and does not change any power spectrum.",
        "Sparse CLASS comparison and full-grid mapping do not prove full-spectrum numerical convergence or observational viability.",
    ],
}
summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=2))
