"""Independently verify native-transfer hashes, crossings, and directed distances."""

import hashlib
import json
from pathlib import Path

import numpy as np

from signed_transfer_statistics import directed_nearest_log_distances, resample_signed, signed_zero_crossings

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
CLASS_ROOT = REPO / ".tmp/class_public/convergence/transfer"
CAMB_ROOT = REPO / ".tmp/camb-runs"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def require_close(actual, expected, label):
    if not np.allclose(actual, expected, rtol=1.0e-11, atol=1.0e-13):
        raise ValueError(f"{label}: values differ")


protocol = json.loads((OUT / "native-transfer-protocol.json").read_text(encoding="utf-8"))
summary = json.loads((OUT / "native-transfer-summary.json").read_text(encoding="utf-8"))
if summary["protocol_sha256"] != sha256(OUT / "native-transfer-protocol.json"):
    raise ValueError("protocol hash mismatch")
for filename, expected_hash in protocol["input_sha256"].items():
    if sha256(OUT / filename) != expected_hash:
        raise ValueError(f"input hash mismatch: {filename}")
for source, files in summary["raw_output_sha256"].items():
    if source.startswith("class_"):
        model = source.removeprefix("class_dense_")
        prefix = "zero-cdm" if model == "zero" else "baseline-lcdm"
        paths = {
            "transfer": CLASS_ROOT / f"{prefix}-transfer-dense00_00_tk.dat",
            "power": CLASS_ROOT / f"{prefix}-transfer-dense00_00_pk.dat",
        }
    else:
        _, level, model = source.split("_")
        paths = {
            "transfer": CAMB_ROOT / level / model / "transfer.npz",
            "power": CAMB_ROOT / level / model / "spectra.npz",
        }
    for kind, path in paths.items():
        if sha256(path) != files[kind]:
            raise ValueError(f"raw hash mismatch: {source} {kind}")

log10_grid = np.linspace(
    np.log10(protocol["analysis"]["common_grid_min_k_h_per_Mpc"]),
    np.log10(protocol["analysis"]["common_grid_max_k_h_per_Mpc"]),
    protocol["analysis"]["common_grid_points"],
)
k_grid = 10.0**log10_grid
crossings = {}
for source, record in summary["sources"].items():
    if source.startswith("class_"):
        model = source.removeprefix("class_dense_")
        prefix = "zero-cdm" if model == "zero" else "baseline-lcdm"
        data = np.loadtxt(CLASS_ROOT / f"{prefix}-transfer-dense00_00_tk.dat")
        k_h = data[:, 0]
        values = data[:, 4] if model == "zero" else data[:, 5]
    else:
        _, level, model = source.split("_")
        data = np.load(CAMB_ROOT / level / model / "transfer.npz")
        k_h = data["k_h_per_Mpc"]
        values = data["delta_tot"]
    actual = signed_zero_crossings(k_grid, resample_signed(k_h, values, log10_grid))
    expected = np.asarray(record["common_grid_zero_crossings_h_per_Mpc"])
    require_close(actual, expected, f"crossings: {source}")
    if len(actual) != record["common_grid_zero_crossing_count"]:
        raise ValueError(f"crossing count mismatch: {source}")
    require_close(
        actual[:12],
        np.asarray(record["first_common_grid_zero_crossings_h_per_Mpc"]),
        f"first crossings: {source}",
    )
    crossings[source] = actual

for record in summary["crossing_comparisons"].values():
    first = record["first"]
    second = record["second"]
    for direction, reference, candidates in [
        ("first_to_second", crossings[first], crossings[second]),
        ("second_to_first", crossings[second], crossings[first]),
    ]:
        distances = directed_nearest_log_distances(reference, candidates)
        expected = record[direction]
        if distances.size != expected["count"]:
            raise ValueError(f"distance count mismatch: {first} {second} {direction}")
        if distances.size:
            require_close(np.median(distances), expected["median_abs_ln_k_distance"], "median distance")
            require_close(np.max(distances), expected["max_abs_ln_k_distance"], "maximum distance")
        elif expected["median_abs_ln_k_distance"] is not None or expected["max_abs_ln_k_distance"] is not None:
            raise ValueError("empty distance set must have null statistics")

print(json.dumps({
    "verification": "passed",
    "source_count": len(summary["sources"]),
    "comparison_count": len(summary["crossing_comparisons"]),
    "crossing_counts": {
        name: record["common_grid_zero_crossing_count"]
        for name, record in summary["sources"].items()
    },
    "class_max_reconstruction_fraction": {
        name: record["power_reconstruction"]["max_abs_fraction"]
        for name, record in summary["sources"].items()
        if name.startswith("class_")
    },
}, ensure_ascii=False, indent=2))
