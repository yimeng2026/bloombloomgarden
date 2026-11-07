"""Freeze the accuracy-level comoving phase and band-power analysis."""

import hashlib
import json
from datetime import datetime
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "phase-sampling-protocol.json"
INPUTS = [
    "research/physical-intuition/zero-cdm/freeze_phase_sampling.py",
    "research/physical-intuition/zero-cdm/phase_comoving.py",
    "research/physical-intuition/zero-cdm/analyze_phase_sampling.py",
    "research/physical-intuition/zero-cdm/verify_phase_sampling.py",
    "research/physical-intuition/zero-cdm/gauge_transform.py",
    "research/physical-intuition/zero-cdm/signed_transfer_statistics.py",
    "research/physical-intuition/zero-cdm/pk_band_statistics.py",
    ".tmp/camb-wsl-site/camb/model.py",
    ".tmp/CAMB/docs/source/transfer_variables.rst",
    ".tmp/class_public/convergence/transfer/zero-cdm-transfer-dense00_00_tk.dat",
    ".tmp/class_public/convergence/transfer/baseline-lcdm-transfer-dense00_00_tk.dat",
    ".tmp/class_public/convergence/integral/zero-cdm-integral00_pk.dat",
    ".tmp/class_public/convergence/integral/baseline-lcdm-integral00_pk.dat",
    ".tmp/class_public/convergence/recfast/zero-cdm-recfast00_pk.dat",
    ".tmp/class_public/convergence/recfast/baseline-lcdm-recfast00_pk.dat",
]
for level in ["fiducial", "high", "ultra"]:
    for model in ["zero", "baseline"]:
        INPUTS.extend([
            f".tmp/camb-runs/{level}/{model}/transfer.npz",
            f".tmp/camb-runs/{level}/{model}/summary.json",
            f".tmp/camb-runs/{level}/{model}/parameters.ini",
        ])


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


if PROTOCOL_PATH.exists():
    raise FileExistsError(f"Refusing to overwrite frozen protocol: {PROTOCOL_PATH}")
protocol = {
    "status": "frozen_before_accuracy_level_comoving_phase_analysis",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "new_solver_execution": False,
    "levels": ["fiducial", "high", "ultra"],
    "models": ["zero", "baseline"],
    "transformation": {
        "input": "existing transfer.npz at each level, including direct v_baryon_cdm",
        "density": "same CLASS pressureless-matter comoving formula as the verified ultra mapping",
        "velocity": "direct synchronous v_baryon_cdm only; no Newtonian subtraction",
        "power": "same unit-curvature squared-transfer reconstruction as the comoving ultra analysis",
    },
    "signed_phase_grid": {
        "minimum_k_h_per_Mpc": 0.01,
        "maximum_k_h_per_Mpc": 1.28,
        "point_count": 4096,
        "interpolation": "signed linear values in log10(k), no log-abs, smoothing, or extrapolation",
        "crossings": "exact zeros and sign changes, linearly interpolated in ln(k)",
        "comparison": "directed nearest-neighbor distances in ln(k), retaining unequal counts; no unique oscillation assignment or Hilbert phase",
    },
    "band_grid": {
        "minimum_k_h_per_Mpc": 0.005,
        "actual_maximum_k_h_per_Mpc": 1.9985652306116815,
        "point_count": 2603,
        "band_edges_h_per_Mpc": [0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28],
        "methods": ["raw", "smooth_0.05dex", "smooth_0.10dex"],
        "integration": "integrate before zero/baseline ratios with the tested log_bandpower function",
    },
    "required_comparisons": [
        "CLASS HyRec native d_m and each CAMB level crossing sequence",
        "camb fiducial/high/ultra versus CLASS HyRec and CLASS RECFAST band ratios",
        "camb high/fiducial, ultra/high and ultra/fiducial band-ratio log differences",
    ],
    "output_rule": "Write new phase-comoving and phase-sampling artifacts without modifying previous outputs.",
    "input_sha256": {name: sha256(REPO / name) for name in INPUTS},
    "boundaries": [
        "No physical parameter changes, new solver run, or nonzero CDM placeholder.",
        "Crossing positions are diagnostics, not unique phase labels or convergence proofs.",
        "No observational likelihood, covariance, joint BBN, nonlinear calculation, or model-family exclusion.",
    ],
}
PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PROTOCOL_PATH), "inputs_hashed": len(INPUTS)}, ensure_ascii=False, indent=2))
