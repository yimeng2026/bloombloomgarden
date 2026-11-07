"""Freeze the direct-velocity, sign-normalized refined gauge analysis."""

import hashlib
import json
from datetime import datetime
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "gauge-refined-protocol.json"
INPUTS = [
    "research/physical-intuition/zero-cdm/freeze_gauge_refined.py",
    "research/physical-intuition/zero-cdm/refine_gauge_native.py",
    "research/physical-intuition/zero-cdm/analyze_gauge_refined.py",
    "research/physical-intuition/zero-cdm/verify_gauge_refined.py",
    "research/physical-intuition/zero-cdm/gauge_transform.py",
    "research/physical-intuition/zero-cdm/tests/test_gauge_transform.py",
    "research/physical-intuition/zero-cdm/tests/test_signed_gauge_diagnostics.py",
    "research/physical-intuition/zero-cdm/tests/test_native_gauge_velocities.py",
    ".tmp/camb-wsl-site/camb/symbolic.py",
    ".tmp/CAMB/fortran/equations.f90",
    ".tmp/CAMB/docs/source/transfer_variables.rst",
    ".tmp/class_public/source/perturbations.c",
    ".tmp/class_public/source/output.c",
    ".tmp/class_public/convergence/transfer/zero-cdm-transfer-dense00_00_tk.dat",
    ".tmp/class_public/convergence/transfer/baseline-lcdm-transfer-dense00_00_tk.dat",
    ".tmp/camb-runs/ultra/zero/gauge-transform-native.npz",
    ".tmp/camb-runs/ultra/baseline/gauge-transform-native.npz",
    ".tmp/camb-runs/ultra/zero/gauge-transform-native-summary.json",
    ".tmp/camb-runs/ultra/baseline/gauge-transform-native-summary.json",
]


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


if PROTOCOL_PATH.exists():
    raise FileExistsError(f"Refusing to overwrite frozen protocol: {PROTOCOL_PATH}")
protocol = {
    "status": "frozen_before_direct_velocity_sign_normalized_gauge_refinement",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "new_solver_execution": False,
    "prior_evidence_preserved": [
        "gauge-transform-amendment-01.json: missing-gfortran failure",
        "gauge-transform-native-summary.json: native transformation with failed generic-identity and recovered-velocity thresholds",
        "gauge-native-crosscode-summary.json: unnormalized signed comparison",
    ],
    "velocity_choice": {
        "final_transform": "direct native v_baryon_cdm; in synchronous CDM gauge v_c=0 so this is v_b",
        "reason": "avoid catastrophic cancellation from subtracting two float32 Newtonian-velocity outputs at very low k",
        "recovered_velocity_role": "diagnostic only, with signed absolute and fractional errors reported by k range and no concealment of low-k outliers",
    },
    "class_sign": {
        "class": "native CLASS files normalize adiabatic initial curvature to +1",
        "camb": "default initial_adiabatic multiplies the chi=1 series by -1, hence chi=-1",
        "mapping": "T_CLASS=-T_CAMB for signed cross-code transfer comparisons",
        "power": "unchanged; no physical phase is altered",
        "sources": ["CLASS perturbations.c:670 and output.c:1162-1173", "CAMB equations.f90:2000 and 2062-2070"],
    },
    "pressureless_algebra": {
        "generic_frame_identity": "retain the unexpanded p_b term as a diagnostic",
        "class_compatible_identity": "substitute p_b=0 before simplifying make_frame_invariant(delta_m, frame=v_m)-class_expression",
        "acceptance": "pressureless difference must be exactly zero",
    },
    "crosscode": {
        "sparse_points_per_model": 9,
        "interpolation": "signed CLASS d_m linearly interpolated in ln(k), no extrapolation or smoothing",
        "acceptance": "none; report actual residuals and do not infer full-spectrum convergence",
    },
    "output_rule": "Write new refined artifacts; never edit prior raw arrays, summaries, protocols or failed logs.",
    "input_sha256": {name: sha256(REPO / name) for name in INPUTS},
    "boundaries": [
        "No new solver run, compiler installation, physical parameter change, or nonzero CDM placeholder.",
        "No observational likelihood, covariance, joint BBN, nonlinear calculation, or model-family exclusion.",
        "Full-grid mapping and sparse cross-code checks do not close all CLASS/CAMB implementation systematics.",
    ],
}
PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PROTOCOL_PATH), "inputs_hashed": len(INPUTS)}, ensure_ascii=False, indent=2))
