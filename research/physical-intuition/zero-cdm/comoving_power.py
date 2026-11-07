"""Construct power spectra from the refined native comoving and synchronous transfers."""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np

from signed_transfer_statistics import power_from_transfer


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "comoving-bandpower-protocol.json"
COMMON_MAX = 1.9985652306116815


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def check_protocol():
    protocol = json.loads(PROTOCOL_PATH.read_text(encoding="utf-8"))
    for filename, expected in protocol["input_sha256"].items():
        path = Path(filename)
        if not path.is_absolute():
            path = REPO / filename
        if sha256(path) != expected:
            raise ValueError(f"frozen protocol input hash mismatch: {path}")
    return protocol


parser = argparse.ArgumentParser()
parser.add_argument("--model", required=True, choices=["zero", "baseline"])
parser.add_argument("--level", required=True, choices=["fiducial", "high", "ultra"])
args = parser.parse_args()
protocol = check_protocol()
run_dir = REPO / ".tmp/camb-runs" / args.level / args.model
input_path = run_dir / "gauge-transform-refined.npz"
frozen_summary_path = run_dir / "summary.json"
output_path = run_dir / "comoving-power.npz"
summary_path = run_dir / "comoving-power-summary.json"
if output_path.exists() or summary_path.exists():
    raise FileExistsError(f"Refusing to overwrite comoving-power outputs in {run_dir}")

data = np.load(input_path)
frozen_summary = json.loads(frozen_summary_path.read_text(encoding="utf-8"))
config = frozen_summary["configuration"]
q = data["q_Mpc_inv"]
h = float(data["h"]) if "h" in data else config["H0"] / 100.0
k_h = data["k_h_per_Mpc"]
np.testing.assert_array_equal(k_h, q / h)
series = {}
for name, key in [
    ("comoving_direct", "comoving_direct_v_b"),
    ("comoving_recovered", "comoving_recovered_v_b"),
    ("synchronous_native", "native_delta_m"),
]:
    k_power, power = power_from_transfer(
        q,
        data[key],
        config["As"],
        config["ns"],
        config["pivot_scalar"],
        h,
    )
    np.testing.assert_array_equal(k_power, k_h)
    series[name] = power

common = (k_h >= 0.005) & (k_h <= COMMON_MAX)
np.savez_compressed(
    output_path,
    q_Mpc_inv=q,
    k_h_per_Mpc=k_h,
    h=h,
    comoving_direct_p=series["comoving_direct"],
    comoving_recovered_p=series["comoving_recovered"],
    synchronous_native_p=series["synchronous_native"],
)
summary = {
    "status": "computed_power_from_refined_native_comoving_and_synchronous_transfers",
    "model": args.model,
    "level": args.level,
    "configuration": config,
    "normalization": "P(k)=2 pi^2 As (k/k_pivot)^(ns-1) T(k)^2/k^3; squared CAMB sign is irrelevant and no extra crosscode sign enters power",
    "sources": {
        "comoving_direct": "comoving_direct_v_b from direct native synchronous v_baryon_cdm",
        "comoving_recovered": "comoving_recovered_v_b retained as a cancellation diagnostic",
        "synchronous_native": "native synchronous delta_tot on the same q grid",
    },
    "shape": {
        "native_points": int(k_h.size),
        "common_points": int(np.count_nonzero(common)),
        "k_min_h_per_Mpc": float(k_h[0]),
        "k_max_h_per_Mpc": float(k_h[-1]),
    },
    "validation": {
        "all_power_finite": all(bool(np.isfinite(power).all()) for power in series.values()),
        "all_common_power_strictly_positive": all(bool(np.all(power[common] > 0.0)) for power in series.values()),
        "zero_model_omch2_exactly_zero": bool(args.model != "zero" or float(data["rho_c"]) == 0.0),
    },
    "input_sha256": {
        "protocol": sha256(PROTOCOL_PATH),
        "gauge_transform_refined": sha256(input_path),
        "frozen_summary": sha256(frozen_summary_path),
    },
    "output_sha256": {"comoving-power.npz": sha256(output_path)},
    "boundaries": [
        "This is deterministic power reconstruction from existing native transfers, not a new solver run.",
        "No interpolation, smoothing, observational likelihood, covariance, or model-family exclusion is applied here.",
    ],
}
summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=2))
