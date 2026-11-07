"""Freeze the comoving-native power and common-band analysis inputs."""

import hashlib
import json
from datetime import datetime
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "comoving-bandpower-protocol.json"
INPUTS = [
    "research/physical-intuition/zero-cdm/freeze_comoving_bandpowers.py",
    "research/physical-intuition/zero-cdm/comoving_power.py",
    "research/physical-intuition/zero-cdm/analyze_comoving_bandpowers.py",
    "research/physical-intuition/zero-cdm/verify_comoving_bandpowers.py",
    "research/physical-intuition/zero-cdm/pk_band_statistics.py",
    "research/physical-intuition/zero-cdm/signed_transfer_statistics.py",
    ".tmp/camb-runs/ultra/zero/gauge-transform-refined.npz",
    ".tmp/camb-runs/ultra/baseline/gauge-transform-refined.npz",
    ".tmp/camb-runs/ultra/zero/interpolator-construction.npz",
    ".tmp/camb-runs/ultra/baseline/interpolator-construction.npz",
    ".tmp/camb-runs/ultra/zero/summary.json",
    ".tmp/camb-runs/ultra/baseline/summary.json",
    ".tmp/camb-runs/ultra/zero/parameters.ini",
    ".tmp/camb-runs/ultra/baseline/parameters.ini",
    ".tmp/class_public/convergence/integral/zero-cdm-integral00_pk.dat",
    ".tmp/class_public/convergence/integral/baseline-lcdm-integral00_pk.dat",
]


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


if PROTOCOL_PATH.exists():
    raise FileExistsError(f"Refusing to overwrite frozen protocol: {PROTOCOL_PATH}")
protocol = {
    "status": "frozen_before_comoving_native_power_and_band_analysis",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "new_solver_execution": False,
    "models": ["zero", "baseline"],
    "level": "ultra",
    "power_reconstruction": {
        "formula": "P(k)=2 pi^2 As (k/k_pivot)^(ns-1) T(k)^2/k^3 in Mpc^3, then h^3 and k/h",
        "comoving_direct": "direct synchronous v_baryon_cdm used in the refined CLASS-compatible comoving transfer",
        "comoving_recovered": "Newtonian-subtracted velocity retained as a separate numerical diagnostic",
        "synchronous_native": "native delta_tot on the same full q grid",
        "sign": "squaring removes the CAMB/CLASS initial-curvature sign; no additional sign is applied to power",
    },
    "common_grid": {
        "minimum_k_h_per_Mpc": 0.005,
        "requested_maximum_k_h_per_Mpc": 2.0,
        "actual_maximum_rule": "minimum of 2.0 and every source endpoint; no extrapolation",
        "point_count": 2603,
    },
    "band_edges_h_per_Mpc": [0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28],
    "methods": {
        "raw": "log-log interpolation onto the common grid without smoothing",
        "smooth_0.05dex": "Gaussian smoothing of ln(P), sigma=0.05 dex",
        "smooth_0.10dex": "Gaussian smoothing of ln(P), sigma=0.10 dex",
        "integration": "arithmetic mean of k^3 P(k)/(2 pi^2) in natural log k, integrate before zero/baseline ratios",
    },
    "required_comparisons": [
        "comoving_direct_over_synchronous_native",
        "comoving_recovered_over_comoving_direct",
        "comoving_direct_over_log_cubic",
        "comoving_direct_over_class",
        "comoving_recovered_over_class",
        "synchronous_native_over_class",
        "log_cubic_over_class",
        "previous_frozen_log_linear_over_class",
    ],
    "output_rule": "Write new comoving-power and comoving-bandpower artifacts without changing earlier summaries or raw data.",
    "input_sha256": {name: sha256(REPO / name) for name in INPUTS},
    "boundaries": [
        "No physical parameter changes, new solver run, or nonzero CDM placeholder.",
        "Gauge transformation is now included before band integration; other implementation systematics remain independent.",
        "No observational likelihood, covariance, joint BBN, nonlinear calculation, or model-family exclusion.",
    ],
}
PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PROTOCOL_PATH), "inputs_hashed": len(INPUTS)}, ensure_ascii=False, indent=2))
