"""Construct direct-velocity comoving transfers and power at each CAMB accuracy level."""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np

from gauge_transform import class_comoving_matter_density
from signed_transfer_statistics import power_from_transfer


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "phase-sampling-protocol.json"
# Zero-based entries in camb.model.transfer_names, checked against model.py.
TRANSFER_INDEX = {
    "delta_cdm": 1,
    "delta_baryon": 2,
    "delta_tot": 6,
    "v_baryon_cdm": 12,
}
C_KM_S = 299792.458
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
input_path = run_dir / "transfer.npz"
frozen_summary_path = run_dir / "summary.json"
output_path = run_dir / "phase-comoving.npz"
summary_path = run_dir / "phase-comoving-summary.json"
if output_path.exists() or summary_path.exists():
    raise FileExistsError(f"Refusing to overwrite phase-comoving outputs in {run_dir}")

config = json.loads(frozen_summary_path.read_text(encoding="utf-8"))["configuration"]
data = np.load(input_path)
q = np.asarray(data["q_Mpc_inv"], dtype=float)
h = float(data["h"])
transfer_data = data["transfer_data"]


def scaled(name):
    return q**2 * np.asarray(transfer_data[TRANSFER_INDEX[name], :, 0], dtype=float)


delta_c = scaled("delta_cdm")
delta_b = scaled("delta_baryon")
native_delta_m = scaled("delta_tot")
direct_v_b = scaled("v_baryon_cdm")
rho_c = float(config["omch2"])
rho_b = float(config["ombh2"])
conformal_h = config["H0"] / C_KM_S
comoving = class_comoving_matter_density(
    delta_c, delta_b, np.zeros_like(direct_v_b), direct_v_b,
    rho_c, rho_b, conformal_h, q,
)
k_h, comoving_power = power_from_transfer(
    q, comoving, config["As"], config["ns"], config["pivot_scalar"], h
)
k_sync, synchronous_power = power_from_transfer(
    q, native_delta_m, config["As"], config["ns"], config["pivot_scalar"], h
)
np.testing.assert_array_equal(k_h, k_sync)
common = (k_h >= 0.005) & (k_h <= COMMON_MAX)
np.savez_compressed(
    output_path,
    q_Mpc_inv=q,
    k_h_per_Mpc=k_h,
    h=h,
    rho_c=rho_c,
    rho_b=rho_b,
    conformal_h=conformal_h,
    delta_c=delta_c,
    delta_b=delta_b,
    native_delta_m=native_delta_m,
    direct_v_baryon_cdm=direct_v_b,
    comoving_direct=comoving,
    comoving_power=comoving_power,
    synchronous_power=synchronous_power,
)
summary = {
    "status": "computed_direct_velocity_comoving_transfer_and_power_by_accuracy_level",
    "model": args.model,
    "level": args.level,
    "configuration": config,
    "source": "existing transfer.npz, with direct v_baryon_cdm; no new solver run or Newtonian subtraction",
    "shape": {
        "native_points": int(k_h.size),
        "common_points": int(np.count_nonzero(common)),
        "k_min_h_per_Mpc": float(k_h[0]),
        "k_max_h_per_Mpc": float(k_h[-1]),
    },
    "transfer_dtype": str(transfer_data.dtype),
    "validation": {
        "all_values_finite": bool(
            np.isfinite(comoving).all() and np.isfinite(comoving_power).all() and np.isfinite(synchronous_power).all()
        ),
        "common_power_strictly_positive": bool(
            np.all(comoving_power[common] > 0.0) and np.all(synchronous_power[common] > 0.0)
        ),
        "zero_model_omch2_exactly_zero": bool(args.model != "zero" or rho_c == 0.0),
    },
    "input_sha256": {
        "protocol": sha256(PROTOCOL_PATH),
        "native_transfer": sha256(input_path),
        "frozen_summary": sha256(frozen_summary_path),
    },
    "output_sha256": {"phase-comoving.npz": sha256(output_path)},
    "boundaries": [
        "Accuracy levels differ only in the previously frozen numerical settings; physical inputs are unchanged.",
        "This is a deterministic transformation, not a convergence proof or observational fit.",
    ],
}
summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=2))
