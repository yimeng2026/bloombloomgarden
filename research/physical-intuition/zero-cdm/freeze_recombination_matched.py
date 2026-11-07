"""Freeze the exact previous-grid recombination comparison and endpoint audit."""

import hashlib
import json
from datetime import datetime
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "recombination-matched-protocol.json"
INPUTS = [
    "research/physical-intuition/zero-cdm/freeze_recombination_matched.py",
    "research/physical-intuition/zero-cdm/analyze_recombination_matched.py",
    "research/physical-intuition/zero-cdm/verify_recombination_matched.py",
    "research/physical-intuition/zero-cdm/pk_band_statistics.py",
    "research/physical-intuition/zero-cdm/recombination-bandpower-protocol.json",
    "research/physical-intuition/zero-cdm/recombination-bandpower-summary.json",
    "research/physical-intuition/zero-cdm/comoving-bandpower-summary.json",
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
    "status": "frozen_before_exact_previous_grid_recombination_analysis",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "reason": "The first recombination comparison selected kmax=2.0 because all its sources cover that endpoint; the established grid ends at 1.9985652306116815 and must be matched before attribution.",
    "preserved_sensitivity_result": "recombination-bandpower-summary.json remains the independent 2.0-endpoint result and is not overwritten.",
    "common_grid": {
        "minimum_k_h_per_Mpc": 0.005,
        "actual_maximum_k_h_per_Mpc": 1.9985652306116815,
        "point_count": 2603,
        "reference": "comoving-bandpower-summary.json and earlier same-run analyses",
        "extrapolation": False,
    },
    "band_edges_h_per_Mpc": [0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28],
    "methods": ["raw", "smooth_0.05dex", "smooth_0.10dex"],
    "integration": "same tested log_bandpower implementation, integrate before zero/baseline ratios",
    "endpoint_sensitivity": "report matched/endpoint highest-band ratios and signed log differences for all four sources",
    "output_rule": "Write new recombination-matched artifacts and retain the 2.0-endpoint summary as a separate sensitivity record.",
    "input_sha256": {name: sha256(REPO / name) for name in INPUTS},
    "boundaries": [
        "No new solver run or physical parameter change.",
        "CLASS RECFAST and CAMB Recfast remain distinct implementations.",
        "No observational likelihood, covariance, joint BBN, nonlinear calculation, or model-family exclusion.",
    ],
}
PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PROTOCOL_PATH), "inputs_hashed": len(INPUTS)}, ensure_ascii=False, indent=2))
