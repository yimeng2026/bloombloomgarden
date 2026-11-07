"""Freeze paired transfer-only accuracy cases after full-run timeout evidence."""

import hashlib
import json
from datetime import datetime
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "transfer-only-protocol.json"
INPUTS = [
    "research/physical-intuition/zero-cdm/freeze_transfer_only.py",
    "research/physical-intuition/zero-cdm/camb_transfer_only_case.py",
    "research/physical-intuition/zero-cdm/analyze_transfer_only.py",
    "research/physical-intuition/zero-cdm/verify_transfer_only.py",
    "research/physical-intuition/zero-cdm/camb_crosscode.py",
    "research/physical-intuition/zero-cdm/gauge_transform.py",
    "research/physical-intuition/zero-cdm/signed_transfer_statistics.py",
    "research/physical-intuition/zero-cdm/pk_band_statistics.py",
    "research/physical-intuition/zero-cdm/single-variable-protocol.json",
    ".tmp/camb-wsl-site/camb/camb.py",
    ".tmp/camb-wsl-site/camb/results.py",
    ".tmp/camb-wsl-site/camb/model.py",
    ".tmp/camb-runs/ultra/zero/phase-comoving.npz",
    ".tmp/camb-runs/ultra/baseline/phase-comoving.npz",
    ".tmp/camb-runs/single-variable/k800/zero/single-variable.npz",
    ".tmp/camb-runs/single-variable/k800/baseline/single-variable.npz",
    ".tmp/camb-runs/single-variable/accuracy8/zero/run.log",
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
    "status": "frozen_before_paired_transfer_only_accuracy_runs",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "reason": "The full get_results AccuracyBoost=8 case twice reached the host's 300 s foreground limit without numerical outputs. Use a bounded transfer-only path with a matched reference instead of leaving a background process or reducing accuracy.",
    "execution_path": "camb.get_transfer_functions(params, only_time_sources=True) for both cases; no CMB l,k power outputs",
    "cases": {
        "reference4": "AccuracyBoost=4, k_per_logint=400, all other ultra and physical settings unchanged",
        "accuracy8": "AccuracyBoost=8, k_per_logint=400, all other ultra and physical settings unchanged",
    },
    "required_path_check": "reference4 versus existing full ultra comoving transfers and power; discrepancies must be reported before interpreting accuracy8/reference4",
    "previous_k800": "existing full k800 zero and baseline outputs remain the separate wave-sampling case",
    "execution": {
        "parallel_solver_runs": False,
        "order": ["reference4 zero", "reference4 baseline", "accuracy8 zero", "accuracy8 baseline"],
        "maximum_foreground_seconds_per_process": 300,
        "outputs": "new .tmp/camb-runs/transfer-only/<case>/<model> directories only",
    },
    "analysis": {
        "phase": "same 4096-point signed grid and nearest-distance diagnostics",
        "bands": "same 2603-point grid, seven bands, raw and 0.05/0.10 dex smoothing",
        "main_effect": "accuracy8_over_reference4",
        "path_effect": "reference4_over_full_ultra",
        "acceptance": "report actual results; no convergence claim without a stable sequence",
    },
    "output_rule": "Preserve full-run timeout evidence and all previous outputs; do not overwrite completed cases.",
    "input_sha256": {name: sha256(REPO / name) for name in INPUTS},
    "boundaries": [
        "Only AccuracyBoost differs within the transfer-only pair; zero CDM remains exactly zero.",
        "No background process, observational likelihood, covariance, joint BBN, nonlinear calculation, or model-family exclusion.",
        "The transfer-only path is not described as a completed full-CMB AccuracyBoost=8 run.",
    ],
}
PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PROTOCOL_PATH), "inputs_hashed": len(INPUTS)}, ensure_ascii=False, indent=2))
