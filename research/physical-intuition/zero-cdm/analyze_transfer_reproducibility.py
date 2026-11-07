"""Compare native power reconstruction across two CAMB runs."""

import hashlib
import json
from pathlib import Path

import numpy as np

from same_run_power import error_summary

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
ROOT = REPO / ".tmp/camb-runs/ultra"
SUMMARY_PATH = OUT / "transfer-reproducibility-summary.json"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


records = {}
for model in ["zero", "baseline"]:
    old = np.load(ROOT / model / "transfer.npz")
    new = np.load(ROOT / model / "transfer-same-run.npz")
    existing = np.load(ROOT / model / "spectra.npz")
    old_k = old["k_h_per_Mpc"]
    old_power = old["reconstructed_p_Mpc_over_h_cubed"]
    new_k = new["k_h_per_Mpc"]
    new_power = new["native_reconstructed_p"]
    mask = (
        (old_k >= new_k[0]) & (old_k <= new_k[-1])
        & (old_k >= existing["pk_k_h_per_Mpc"][0])
        & (old_k <= existing["pk_k_h_per_Mpc"][-1])
    )
    aligned_k = old_k[mask]
    new_interpolated = np.exp(np.interp(np.log(aligned_k), np.log(new_k), np.log(new_power)))
    old_aligned = old_power[mask]
    fractional = old_aligned / new_interpolated - 1.0
    maximum_index = int(np.argmax(np.abs(fractional)))
    point_values = {}
    for k in [0.01, 0.05, 0.1, 0.5, 1.0]:
        old_at = float(np.exp(np.interp(np.log(k), np.log(aligned_k), np.log(old_aligned))))
        new_at = float(np.exp(np.interp(np.log(k), np.log(aligned_k), np.log(new_interpolated))))
        point_values[str(k)] = {
            "old_native": old_at,
            "new_native": new_at,
            "old_over_new_minus_1": old_at / new_at - 1.0,
        }
    records[model] = {
        "aligned_points": int(aligned_k.size),
        "old_over_new": error_summary(fractional),
        "max_location": {
            "k_h_per_Mpc": float(aligned_k[maximum_index]),
            "old_native": float(old_aligned[maximum_index]),
            "new_native_interpolated": float(new_interpolated[maximum_index]),
            "old_over_new_minus_1": float(fractional[maximum_index]),
        },
        "point_values": point_values,
    }

summary = {
    "status": "computed_native_reconstruction_reproducibility_not_observational_fit",
    "comparison": "old native reconstructed power divided by new native reconstructed power, then minus one",
    "records": records,
    "raw_output_sha256": {
        model: {
            "old_transfer": sha256(ROOT / model / "transfer.npz"),
            "new_same_run_transfer": sha256(ROOT / model / "transfer-same-run.npz"),
            "previous_frozen_spectra": sha256(ROOT / model / "spectra.npz"),
        }
        for model in ["zero", "baseline"]
    },
    "analysis_runner_sha256": sha256(Path(__file__).resolve()),
    "boundaries": [
        "This tests native-reconstruction reproducibility across two runs; it does not isolate interpolation from solver variation by itself.",
        "No observational likelihood, covariance, or model-family exclusion.",
    ],
}
SUMMARY_PATH.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=2))
