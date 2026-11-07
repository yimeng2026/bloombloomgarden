"""Freeze the sparse explicit matter-comoving gauge-transformation experiment."""

import hashlib
import json
from datetime import datetime
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "gauge-transform-protocol.json"
CAMB_SOURCE_COMMIT = "72b5a4ca5df1335674e2eacad9b9a887194f9677"
CLASS_SOURCE_COMMIT = "2d88c3f650b691d2b13165e826697f43ef2530c4"
INPUTS = [
    "research/physical-intuition/zero-cdm/freeze_gauge_transform.py",
    "research/physical-intuition/zero-cdm/camb_gauge_transform.py",
    "research/physical-intuition/zero-cdm/analyze_gauge_transform.py",
    "research/physical-intuition/zero-cdm/verify_gauge_transform.py",
    "research/physical-intuition/zero-cdm/gauge_transform.py",
    "research/physical-intuition/zero-cdm/tests/test_gauge_transform.py",
    "research/physical-intuition/zero-cdm/tests/test_signed_gauge_diagnostics.py",
    "research/physical-intuition/zero-cdm/camb_crosscode.py",
    ".tmp/camb-wsl-site/camb/results.py",
    ".tmp/camb-wsl-site/camb/symbolic.py",
    ".tmp/CAMB/docs/source/transfer_variables.rst",
    ".tmp/CAMB/fortran/equations.f90",
    ".tmp/class_public/source/perturbations.c",
    ".tmp/class_public/source/fourier.c",
    ".tmp/class_public/convergence/transfer/zero-cdm-transfer-dense00_00_tk.dat",
    ".tmp/class_public/convergence/transfer/baseline-lcdm-transfer-dense00_00_tk.dat",
    ".tmp/camb-runs/ultra/zero/parameters.ini",
    ".tmp/camb-runs/ultra/baseline/parameters.ini",
]


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


if PROTOCOL_PATH.exists():
    raise FileExistsError(f"Refusing to overwrite frozen protocol: {PROTOCOL_PATH}")
protocol = {
    "status": "frozen_before_sparse_matter_comoving_gauge_runs",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "camb_source_commit": CAMB_SOURCE_COMMIT,
    "class_source_commit": CLASS_SOURCE_COMMIT,
    "models": ["zero", "baseline"],
    "level": "ultra",
    "target_k_h_per_Mpc": [0.0001, 0.0003, 0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1.0],
    "mode_selection": "nearest native CAMB q for each target, require nine distinct indices; q is in 1/Mpc and k_h=q/h",
    "transformation": {
        "class": "D_m=delta_m+3 a H theta_m/k^2 for stable pressureless matter",
        "camb_manual": "delta_m=(rho_c Delta_c+rho_b Delta_b)/(rho_c+rho_b), theta_m=k(rho_c v_c+rho_b v_b)/(rho_c+rho_b)",
        "independent_symbolic": "make_frame_invariant(delta_m, frame=v_m) on the same get_results object",
        "excluded": "no photon, massless-neutrino or total-heat-flux velocity in the matter-comoving frame; massive neutrinos are zero in these inputs",
    },
    "internal_acceptance": {
        "time_evolution_total_density_vs_float32_transfer_max_abs_fraction": 2.0e-5,
        "manual_vs_symbolic_max_abs_difference": 1.0e-8,
        "manual_vs_symbolic_max_abs_fraction_nonzero_reference": 1.0e-6,
        "scale_factor_today_max_abs_a_minus_1": 1.0e-12,
        "meaning": "These thresholds test interface normalization and the explicit mapping only, not physical cross-code accuracy.",
    },
    "class_comparison": {
        "variable": "native d_m column, not d_tot",
        "interpolation": "signed linear d_m in natural log k at the nine actual CAMB k values; no extrapolation or smoothing",
        "report": "signed values, fractional differences, squared-transfer ratios and same-sign flags",
        "acceptance": "none; sparse cross-code outcomes are diagnostics and cannot prove whole-spectrum convergence",
    },
    "output_rule": "Write new gauge-transform artifacts without modifying previous spectra, transfer, interpolation or CLASS outputs.",
    "input_sha256": {name: sha256(REPO / name) for name in INPUTS},
    "boundaries": [
        "No physical parameter changes and no nonzero CDM placeholder in the zero model.",
        "Sparse validation does not complete a full-spectrum gauge-transformed band-power analysis.",
        "Recombination, perturbation implementation, sampling and interpolation systematics remain separate.",
        "No observational likelihood, covariance, joint BBN, nonlinear calculation, or model-family exclusion.",
    ],
}
PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PROTOCOL_PATH), "inputs_hashed": len(INPUTS)}, ensure_ascii=False, indent=2))
