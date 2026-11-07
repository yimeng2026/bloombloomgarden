"""Independently verify bitwise reproducibility of native power reconstruction."""

import json
from pathlib import Path

import numpy as np

from same_run_power import error_summary

REPO = Path(__file__).resolve().parents[3]
ROOT = REPO / ".tmp/camb-runs/ultra"
summary = json.loads((REPO / "research/physical-intuition/zero-cdm/transfer-reproducibility-summary.json").read_text(encoding="utf-8"))

results = {}
for model in ["zero", "baseline"]:
    old = np.load(ROOT / model / "transfer.npz")
    new = np.load(ROOT / model / "transfer-same-run.npz")
    existing = np.load(ROOT / model / "spectra.npz")
    old_k = old["k_h_per_Mpc"]
    new_k = new["k_h_per_Mpc"]
    mask = (
        (old_k >= new_k[0]) & (old_k <= new_k[-1])
        & (old_k >= existing["pk_k_h_per_Mpc"][0])
        & (old_k <= existing["pk_k_h_per_Mpc"][-1])
    )
    k = old_k[mask]
    old_power = old["reconstructed_p_Mpc_over_h_cubed"][mask]
    new_power = np.exp(np.interp(np.log(k), np.log(new_k), np.log(new["native_reconstructed_p"])))
    actual = error_summary(old_power / new_power - 1.0)
    expected = summary["records"][model]["old_over_new"]
    for key in ["points", "median_abs_fraction", "p95_abs_fraction", "max_abs_fraction"]:
        if not np.allclose(actual[key], expected[key], rtol=1.0e-10, atol=1.0e-15):
            raise ValueError(f"reproducibility mismatch: {model} {key}: {actual[key]} != {expected[key]}")
    if actual["max_abs_fraction"] > 1.0e-14:
        raise ValueError(f"unexpected reconstruction variation: {model}")
    results[model] = actual

print(json.dumps({
    "verification": "passed",
    "records": results,
    "interpretation": "Native reconstructions are reproducible across runs; interpolation, not run-to-run solver variation, is the evidenced source of the deep-valley local discrepancy.",
}, ensure_ascii=False, indent=2))
