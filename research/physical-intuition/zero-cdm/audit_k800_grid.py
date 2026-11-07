"""Audit native q grids and transfer arrays behind the identical k800 diagnostics."""

import hashlib
import json
from pathlib import Path

import numpy as np


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
ROOT = REPO / ".tmp/camb-runs"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def grid_record(path):
    data = np.load(path)
    q = data["q_Mpc_inv"]
    ratios = q[1:] / q[:-1]
    effective = 1.0 / np.log(ratios)
    return {
        "points": int(q.size),
        "q_min": float(q[0]),
        "q_max": float(q[-1]),
        "first_10_q": q[:10].tolist(),
        "effective_points_per_ln_k_min": float(np.min(effective)),
        "effective_points_per_ln_k_median": float(np.median(effective)),
        "effective_points_per_ln_k_max": float(np.max(effective)),
        "transfer_shape": list(data["transfer_data"].shape),
        "transfer_dtype": str(data["transfer_data"].dtype),
        "sha256": sha256(path),
    }


records = {
    "full_ultra": grid_record(ROOT / "ultra/zero/transfer.npz"),
    "reference4": grid_record(ROOT / "transfer-only/reference4/zero/transfer-only.npz"),
    "k800": grid_record(ROOT / "single-variable/k800/zero/single-variable.npz"),
}
ultra = np.load(ROOT / "ultra/zero/transfer.npz")
reference = np.load(ROOT / "transfer-only/reference4/zero/transfer-only.npz")
k800 = np.load(ROOT / "single-variable/k800/zero/single-variable.npz")
q_ultra = ultra["q_Mpc_inv"]
q_k800 = k800["q_Mpc_inv"]
indices = np.argmin(np.abs(np.log(q_k800[:, None]) - np.log(q_ultra[None, :])), axis=0)
nearest = q_k800[indices]
relative_grid_error = nearest / q_ultra - 1.0
ultra_comoving = np.load(ROOT / "ultra/zero/phase-comoving.npz")["comoving_direct"]
comoving_difference = k800["comoving_direct"][indices] - ultra_comoving
comparison = {
    "reference4_q_identical_to_full_ultra": bool(np.array_equal(q_ultra, reference["q_Mpc_inv"])),
    "reference4_transfer_identical_to_full_ultra": bool(np.array_equal(ultra["transfer_data"], reference["transfer_data"])),
    "k800_nearest_q_max_abs_fraction": float(np.max(np.abs(relative_grid_error))),
    "k800_nearest_comoving_max_abs_difference": float(np.max(np.abs(comoving_difference))),
    "k800_nearest_comoving_identical": bool(np.array_equal(k800["comoving_direct"][indices], ultra_comoving)),
    "k800_first_10_indices_for_full_ultra": indices[:10].tolist(),
    "k800_first_10_nearest_q": nearest[:10].tolist(),
}
summary = {
    "status": "computed_native_grid_audit_for_k800_and_reference4",
    "records": records,
    "comparison": comparison,
    "source_interpretation": {
        "k_per_logint": "Controls fixed output q nodes in CAMB InitTransfer; more output nodes do not by themselves tighten the perturbation integration tolerance.",
        "AccuracyBoost": "Also scales internal k sampling and integration step sizes, so output-node doubling cannot substitute for this accuracy setting.",
        "needs_good_pk_sampling": "Declared false and not currently used in the checked CAMB source; fixed k_per_logint uses the fixed-spacing branch.",
    },
    "analysis_runner_sha256": sha256(Path(__file__).resolve()),
    "boundaries": [
        "Nearest-q comparison is a grid diagnostic, not an independent physical accuracy proof.",
        "Exact transfer equality is checked only where reported; no claim is inferred solely from equal band powers.",
    ],
}
path = OUT / "k800-grid-audit.json"
path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=2))
