"""Freeze one-at-a-time CAMB accuracy experiments before any new solver run."""

import hashlib
import json
from datetime import datetime
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "single-variable-protocol.json"
INPUTS = [
    "research/physical-intuition/zero-cdm/freeze_single_variable.py",
    "research/physical-intuition/zero-cdm/camb_single_variable.py",
    "research/physical-intuition/zero-cdm/analyze_single_variable.py",
    "research/physical-intuition/zero-cdm/verify_single_variable.py",
    "research/physical-intuition/zero-cdm/camb_crosscode.py",
    "research/physical-intuition/zero-cdm/gauge_transform.py",
    "research/physical-intuition/zero-cdm/signed_transfer_statistics.py",
    "research/physical-intuition/zero-cdm/pk_band_statistics.py",
    ".tmp/camb-wsl-site/camb/model.py",
    ".tmp/camb-runs/ultra/zero/phase-comoving.npz",
    ".tmp/camb-runs/ultra/baseline/phase-comoving.npz",
    ".tmp/camb-runs/ultra/zero/summary.json",
    ".tmp/camb-runs/ultra/baseline/summary.json",
    ".tmp/class_public/convergence/transfer/zero-cdm-transfer-dense00_00_tk.dat",
    ".tmp/class_public/convergence/transfer/baseline-lcdm-transfer-dense00_00_tk.dat",
    ".tmp/class_public/convergence/integral/zero-cdm-integral00_pk.dat",
    ".tmp/class_public/convergence/integral/baseline-lcdm-integral00_pk.dat",
    ".tmp/class_public/convergence/recfast/zero-cdm-recfast00_pk.dat",
    ".tmp/class_public/convergence/recfast/baseline-lcdm-recfast00_pk.dat",
]


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


if PROTOCOL_PATH.exists():
    raise FileExistsError(f"Refusing to overwrite frozen protocol: {PROTOCOL_PATH}")
protocol = {
    "status": "frozen_before_single_variable_accuracy_runs",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "base": "ultra for both models, with unchanged physical inputs",
    "cases": {
        "k800": {
            "changed": "k_per_logint from 400 to 800",
            "unchanged": "AccuracyBoost=4, lSampleBoost=4, lAccuracyBoost=4, kmax=2, lens_potential_accuracy=8 and all physical inputs",
        },
        "accuracy8": {
            "changed": "AccuracyBoost from 4 to 8",
            "unchanged": "k_per_logint=400, lSampleBoost=4, lAccuracyBoost=4, kmax=2, lens_potential_accuracy=8 and all physical inputs",
        },
    },
    "execution": {
        "parallel_solver_runs": False,
        "order": ["k800 zero", "k800 baseline if resources permit", "accuracy8 zero", "accuracy8 baseline"],
        "memory": "record elapsed time and maximum RSS; resource failure is evidence and must not be replaced by a lower-fidelity physical approximation",
        "outputs": "new .tmp/camb-runs/single-variable/<case>/<model> directories only",
    },
    "analysis": {
        "phase": "4096 signed points from 0.01 to 1.28 h/Mpc, exact zeros and sign changes, nearest distances without unique oscillation labels",
        "bands": "2603 points from 0.005 to 1.9985652306116815 h/Mpc, seven fixed bands, raw and 0.05/0.10 dex smoothing",
        "comparisons": "case versus ultra, CLASS HyRec and CLASS RECFAST, plus k800 versus accuracy8",
        "acceptance": "report actual changes; no convergence claim without an explicit stable sequence",
    },
    "output_rule": "Preserve all earlier outputs and any failure log; do not overwrite a completed case.",
    "input_sha256": {name: sha256(REPO / name) for name in INPUTS},
    "boundaries": [
        "Only the named numerical setting may change in each case; zero CDM remains exactly zero.",
        "No observational likelihood, covariance, joint BBN, nonlinear calculation, or model-family exclusion.",
        "Higher cost and additional crossings do not by themselves prove convergence or numerical noise.",
    ],
}
PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PROTOCOL_PATH), "inputs_hashed": len(INPUTS)}, ensure_ascii=False, indent=2))
