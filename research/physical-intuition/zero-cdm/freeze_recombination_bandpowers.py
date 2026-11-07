"""Freeze the recombination-implementation common-band analysis."""

import hashlib
import json
from datetime import datetime
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "recombination-bandpower-protocol.json"
INPUTS = [
    "research/physical-intuition/zero-cdm/freeze_recombination_bandpowers.py",
    "research/physical-intuition/zero-cdm/analyze_recombination_bandpowers.py",
    "research/physical-intuition/zero-cdm/verify_recombination_bandpowers.py",
    "research/physical-intuition/zero-cdm/pk_band_statistics.py",
    "research/physical-intuition/zero-cdm/class-recfast-protocol.json",
    "research/physical-intuition/zero-cdm/zero-cdm-recfast.ini",
    "research/physical-intuition/zero-cdm/baseline-lcdm-recfast.ini",
    "research/physical-intuition/zero-cdm/convergence-integral.pre",
    ".tmp/class_public/convergence/integral/zero-cdm-integral00_pk.dat",
    ".tmp/class_public/convergence/integral/baseline-lcdm-integral00_pk.dat",
    ".tmp/class_public/convergence/recfast/zero-cdm-recfast00_pk.dat",
    ".tmp/class_public/convergence/recfast/baseline-lcdm-recfast00_pk.dat",
    ".tmp/camb-runs/ultra/zero/comoving-power.npz",
    ".tmp/camb-runs/ultra/baseline/comoving-power.npz",
]


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


if PROTOCOL_PATH.exists():
    raise FileExistsError(f"Refusing to overwrite frozen protocol: {PROTOCOL_PATH}")
protocol = {
    "status": "frozen_before_recombination_implementation_band_analysis",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "new_solver_execution": False,
    "models": ["zero", "baseline"],
    "sources": {
        "class_hyrec": "existing CLASS HyRec 2020 integral mPk",
        "class_recfast": "existing CLASS RECFAST run with convergence-integral.pre and otherwise identical physical inputs",
        "camb_comoving_recfast": "existing CAMB Recfast ultra direct-velocity comoving power",
        "camb_synchronous_recfast": "existing CAMB Recfast ultra synchronous power",
    },
    "implementation_boundary": "CLASS RECFAST and CAMB Recfast are not the same implementation; same-family names do not prove line-by-line equivalence.",
    "common_grid": {
        "minimum_k_h_per_Mpc": 0.005,
        "actual_maximum_rule": "minimum of 2.0 and all source endpoints, without extrapolation",
        "point_count": 2603,
    },
    "band_edges_h_per_Mpc": [0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28],
    "methods": ["raw", "smooth_0.05dex", "smooth_0.10dex"],
    "integration": "same tested log_bandpower implementation, integrate before zero/baseline ratios",
    "comparisons": [
        "class_recfast_over_class_hyrec",
        "camb_comoving_over_class_recfast",
        "camb_comoving_over_class_hyrec",
        "camb_synchronous_over_class_recfast",
        "camb_synchronous_over_class_hyrec",
        "camb_comoving_over_synchronous",
    ],
    "output_rule": "Write new recombination-bandpower artifacts; preserve all existing spectra and summaries.",
    "input_sha256": {name: sha256(REPO / name) for name in INPUTS},
    "boundaries": [
        "No new solver run or physical parameter change.",
        "No observational likelihood, covariance, joint BBN, nonlinear calculation, or model-family exclusion.",
        "Recombination effects are not conflated with gauge, interpolation, or phase-sampling effects.",
    ],
}
PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PROTOCOL_PATH), "inputs_hashed": len(INPUTS)}, ensure_ascii=False, indent=2))
