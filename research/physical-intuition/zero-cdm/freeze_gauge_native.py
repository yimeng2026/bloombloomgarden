"""Freeze the compiler-free native gauge-transformation experiment."""

import hashlib
import json
from datetime import datetime
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "gauge-transform-native-protocol.json"
INPUTS = [
    "research/physical-intuition/zero-cdm/freeze_gauge_native.py",
    "research/physical-intuition/zero-cdm/camb_gauge_native.py",
    "research/physical-intuition/zero-cdm/analyze_gauge_native.py",
    "research/physical-intuition/zero-cdm/verify_gauge_native.py",
    "research/physical-intuition/zero-cdm/gauge_transform.py",
    "research/physical-intuition/zero-cdm/tests/test_gauge_transform.py",
    "research/physical-intuition/zero-cdm/tests/test_signed_gauge_diagnostics.py",
    "research/physical-intuition/zero-cdm/tests/test_native_gauge_velocities.py",
    "research/physical-intuition/zero-cdm/camb_crosscode.py",
    ".tmp/camb-wsl-site/camb/symbolic.py",
    ".tmp/camb-wsl-site/camb/model.py",
    ".tmp/camb-wsl-site/camb/constants.py",
    ".tmp/CAMB/docs/source/transfer_variables.rst",
    ".tmp/CAMB/fortran/equations.f90",
    ".tmp/class_public/source/perturbations.c",
    ".tmp/class_public/source/fourier.c",
    ".tmp/class_public/convergence/transfer/zero-cdm-transfer-dense00_00_tk.dat",
    ".tmp/class_public/convergence/transfer/baseline-lcdm-transfer-dense00_00_tk.dat",
    ".tmp/camb-runs/ultra/zero/transfer-same-run.npz",
    ".tmp/camb-runs/ultra/baseline/transfer-same-run.npz",
    ".tmp/camb-runs/ultra/zero/parameters.ini",
    ".tmp/camb-runs/ultra/baseline/parameters.ini",
]


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


if PROTOCOL_PATH.exists():
    raise FileExistsError(f"Refusing to overwrite frozen protocol: {PROTOCOL_PATH}")
protocol = {
    "status": "frozen_before_compiler_free_native_gauge_transformation",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "supersedes_execution_route_not_physics": "gauge-transform-protocol.json symbolic time-evolution route failed because WSL gfortran is unavailable; preserve that log and use existing native outputs",
    "models": ["zero", "baseline"],
    "level": "ultra",
    "new_solver_execution": False,
    "native_grid_transformation": {
        "input": "unchanged transfer-same-run.npz, including transfer_data",
        "scaling": "multiply all CAMB transfer-data variables by q^2 to undo their documented 1/k^2 output scaling",
        "velocity_recovery": "v_b=-conformal_H*(V_Nb-V_Nc)/q from V_Nc=-q sigma/H and V_Nb=-q(v_b+sigma)/H",
        "independent_velocity_check": "compare recovered v_b with direct v_baryon_cdm output; synchronous v_c=0",
        "class_density": "D_m=(rho_c Delta_c+rho_b Delta_b)/(rho_c+rho_b)+3 conformal_H v_m/q",
        "symbolic_check": "simplify(make_frame_invariant(delta_m, frame=v_m)-class_expression) must be exactly zero; no compilation",
        "conformal_H_today": "H0*1000/c in 1/Mpc, with a=1",
    },
    "internal_acceptance": {
        "weighted_delta_m_vs_native_delta_tot_max_abs_fraction": 2.0e-5,
        "recovered_v_b_vs_direct_v_baryon_cdm_max_abs_fraction": 2.0e-5,
        "symbolic_frame_minus_class": 0,
        "meaning": "These tests check output scaling, velocity recovery and gauge algebra, not physical agreement between codes.",
    },
    "sparse_crosscode": {
        "target_k_h_per_Mpc": [0.0001, 0.0003, 0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1.0],
        "selection": "nearest native q for each target with nine unique indices",
        "class_variable": "native d_m column; signed linear interpolation in ln(k), no smoothing or extrapolation",
        "acceptance": "none; report the actual signed values and do not infer whole-spectrum convergence",
    },
    "output_rule": "Write new gauge-transform-native artifacts and preserve all previous outputs and the failed symbolic-run log.",
    "input_sha256": {name: sha256(REPO / name) for name in INPUTS},
    "boundaries": [
        "No new solver run, compiler installation, physical parameter change, or nonzero CDM placeholder.",
        "Full native-grid transformation does not itself close cross-code implementation differences or band-power convergence.",
        "No observational likelihood, covariance, joint BBN, nonlinear calculation, or model-family exclusion.",
    ],
}
PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PROTOCOL_PATH), "inputs_hashed": len(INPUTS)}, ensure_ascii=False, indent=2))
