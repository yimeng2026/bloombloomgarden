"""Freeze analysis of completed k800/reference outputs and accuracy8 boundaries."""

import hashlib
import json
from datetime import datetime
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "k800-path-protocol.json"
INPUTS = [
    "research/physical-intuition/zero-cdm/freeze_k800_path.py",
    "research/physical-intuition/zero-cdm/analyze_k800_path.py",
    "research/physical-intuition/zero-cdm/verify_k800_path.py",
    "research/physical-intuition/zero-cdm/gauge_transform.py",
    "research/physical-intuition/zero-cdm/signed_transfer_statistics.py",
    "research/physical-intuition/zero-cdm/pk_band_statistics.py",
    ".tmp/camb-runs/ultra/zero/phase-comoving.npz",
    ".tmp/camb-runs/ultra/baseline/phase-comoving.npz",
    ".tmp/camb-runs/single-variable/k800/zero/single-variable.npz",
    ".tmp/camb-runs/single-variable/k800/baseline/single-variable.npz",
    ".tmp/camb-runs/single-variable/k800/zero/summary.json",
    ".tmp/camb-runs/single-variable/k800/baseline/summary.json",
    ".tmp/camb-runs/transfer-only/reference4/zero/transfer-only.npz",
    ".tmp/camb-runs/transfer-only/reference4/baseline/transfer-only.npz",
    ".tmp/camb-runs/transfer-only/reference4/zero/summary.json",
    ".tmp/camb-runs/transfer-only/reference4/baseline/summary.json",
    ".tmp/camb-runs/single-variable/accuracy8/zero/run.log",
    ".tmp/camb-runs/transfer-only/accuracy8/zero/run.log",
    ".tmp/camb-runs/kmax-limited/accuracy8/zero/run.log",
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
    "status": "frozen_before_successful_k800_reference_analysis",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "new_solver_execution": False,
    "included": {
        "camb_ultra": "existing full ultra reference",
        "camb_k800": "completed full get_results k_per_logint=800 for zero and baseline",
        "camb_reference4": "completed get_transfer_functions AccuracyBoost=4 for zero and baseline",
        "class_hyrec": "existing CLASS native d_m and integral power",
        "class_recfast": "existing CLASS RECFAST power",
    },
    "excluded_accuracy8": {
        "reason": "Full get_results twice, transfer-only once, and kmax-limited once all reached the host's 300 s foreground timeout without numerical output; no baseline attempts are counted.",
        "rule": "No accuracy8 values are inferred, interpolated, or included as completed results.",
    },
    "analysis": {
        "phase": "4096-point signed grid, zero-crossing counts and nearest distances",
        "highest_band": "0.64 to 1.28 h/Mpc on the established 2603-point grid, raw and 0.05/0.10 dex smoothing",
        "main_effect": "k800_over_full_ultra",
        "path_check": "reference4_over_full_ultra",
        "acceptance": "report actual successful outputs; no accuracy8 or convergence claim is fabricated",
    },
    "output_rule": "Write only new k800-path analysis artifacts and preserve all run logs and previous outputs.",
    "input_sha256": {name: sha256(REPO / name) for name in INPUTS},
    "boundaries": [
        "No new solver run, physical parameter change, or nonzero CDM placeholder.",
        "No observational likelihood, covariance, joint BBN, nonlinear calculation, or model-family exclusion.",
        "The failed accuracy8 attempts are computation boundaries, not evidence for or against a physical model.",
    ],
}
PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PROTOCOL_PATH), "inputs_hashed": len(INPUTS)}, ensure_ascii=False, indent=2))
