"""Freeze the bounded k<=1.28 paired transfer accuracy experiment."""

import hashlib
import json
from datetime import datetime
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "kmax-limited-protocol.json"
INPUTS = [
    "research/physical-intuition/zero-cdm/freeze_kmax_limited.py",
    "research/physical-intuition/zero-cdm/camb_kmax_limited_case.py",
    "research/physical-intuition/zero-cdm/analyze_kmax_limited.py",
    "research/physical-intuition/zero-cdm/verify_kmax_limited.py",
    "research/physical-intuition/zero-cdm/camb_crosscode.py",
    "research/physical-intuition/zero-cdm/gauge_transform.py",
    "research/physical-intuition/zero-cdm/signed_transfer_statistics.py",
    "research/physical-intuition/zero-cdm/pk_band_statistics.py",
    ".tmp/camb-wsl-site/camb/camb.py",
    ".tmp/camb-wsl-site/camb/results.py",
    ".tmp/camb-wsl-site/camb/model.py",
    ".tmp/camb-runs/ultra/zero/phase-comoving.npz",
    ".tmp/camb-runs/ultra/baseline/phase-comoving.npz",
    ".tmp/camb-runs/single-variable/k800/zero/single-variable.npz",
    ".tmp/camb-runs/single-variable/k800/baseline/single-variable.npz",
    ".tmp/camb-runs/transfer-only/reference4/zero/transfer-only.npz",
    ".tmp/camb-runs/transfer-only/reference4/baseline/transfer-only.npz",
    ".tmp/camb-runs/transfer-only/accuracy8/zero/run.log",
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
    "status": "frozen_before_kmax_limited_accuracy_pair",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "reason": "AccuracyBoost=8 exceeded the 300 s foreground limit in both full get_results and transfer-only forms. Restrict the paired calculation to the target k<=1.28 range instead of repeated unbounded retries.",
    "execution_path": "camb.get_transfer_functions(only_time_sources=True) with kmax=1.28 for both cases",
    "cases": {
        "reference4": "AccuracyBoost=4, k_per_logint=400, kmax=1.28, all other ultra and physical settings unchanged",
        "accuracy8": "AccuracyBoost=8, k_per_logint=400, kmax=1.28, all other ultra and physical settings unchanged",
    },
    "execution": {
        "parallel_solver_runs": False,
        "order": ["reference4 zero", "reference4 baseline", "accuracy8 zero", "accuracy8 baseline"],
        "maximum_foreground_seconds_per_process": 300,
        "outputs": "new .tmp/camb-runs/kmax-limited/<case>/<model> directories only",
    },
    "analysis": {
        "phase": "same signed 4096-point grid from 0.01 to 1.28 h/Mpc",
        "bands": "a separate 2603-point grid from 0.005 to exactly 1.28 h/Mpc for every source, with the same seven bands and smoothing definitions",
        "path_check": "reference4 versus full ultra on this identical truncated grid",
        "main_effect": "accuracy8_over_reference4",
        "acceptance": "report actual results and do not compare absolute band values to the previous 1.998565 grid without recording the grid change",
    },
    "output_rule": "Preserve all timeout evidence and previous outputs; do not overwrite completed cases.",
    "input_sha256": {name: sha256(REPO / name) for name in INPUTS},
    "boundaries": [
        "Only AccuracyBoost differs within the limited pair; zero CDM remains exactly zero.",
        "This is not a completed full-k AccuracyBoost=8 run and no background process is left behind.",
        "No observational likelihood, covariance, joint BBN, nonlinear calculation, or model-family exclusion.",
    ],
}
PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PROTOCOL_PATH), "inputs_hashed": len(INPUTS)}, ensure_ascii=False, indent=2))
