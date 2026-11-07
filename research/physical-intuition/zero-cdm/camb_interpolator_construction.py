"""Isolate CAMB log/linear cubic splines and the legacy second resampling stage."""

import argparse
import json
import resource
import time
from pathlib import Path

import numpy as np

from camb_crosscode import CAMB_SOURCE_COMMIT, REPO, build_params, sha256
from interpolator_construction import compare_power_curves
from signed_transfer_statistics import power_from_transfer


OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "interpolator-construction-protocol.json"


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
spectra_path = run_dir / "spectra.npz"
output_path = run_dir / "interpolator-construction.npz"
summary_path = run_dir / "interpolator-construction-summary.json"
if output_path.exists() or summary_path.exists():
    raise FileExistsError(f"Refusing to overwrite interpolator-construction outputs in {run_dir}")

pars, config = build_params(args.model, args.level)
started = time.perf_counter()
results = __import__("camb").get_results(pars)

# Reconstruct from the transfer array on this exact get_results object.
transfer = results.get_matter_transfer_data()
q = np.asarray(transfer.q, dtype=float)
scaled_density = np.asarray(transfer.transfer_z("delta_tot", z_index=0), dtype=float)
h = float(pars.H0 / 100.0)
k_native, p_native = power_from_transfer(
    q,
    q**2 * scaled_density,
    config["As"],
    config["ns"],
    config["pivot_scalar"],
    h,
)

# These are CAMB's internal matter-power nodes, not a Python-side spline.
k_nodes, z_nodes, pk_nodes = results.get_linear_matter_power_spectrum(
    nonlinear=False,
    hubble_units=True,
    k_hunit=True,
)
p_nodes = np.asarray(pk_nodes[0], dtype=float)
interpolators = {}
for name, log_interp in [("log_cubic", True), ("linear_cubic", False)]:
    interpolator, interpolator_z, interpolator_k = results.get_matter_power_interpolator(
        nonlinear=False,
        hubble_units=True,
        k_hunit=True,
        return_z_k=True,
        log_interp=log_interp,
    )
    if not np.array_equal(interpolator_k, k_nodes) or not np.array_equal(interpolator_z, z_nodes):
        raise ValueError(f"{name} interpolator nodes differ from direct power nodes")
    interpolators[name] = interpolator

p_log_at_nodes = np.asarray(interpolators["log_cubic"].P(0.0, k_nodes), dtype=float)
p_linear_at_nodes = np.asarray(interpolators["linear_cubic"].P(0.0, k_nodes), dtype=float)
node_reproduction = {
    "log_cubic_over_direct_nodes": compare_power_curves(k_nodes, p_nodes, p_log_at_nodes),
    "linear_cubic_over_direct_nodes": compare_power_curves(k_nodes, p_nodes, p_linear_at_nodes),
}

# The old runner requested 2500 points up to 2.0 and its spline could extrapolate
# above the actual last CAMB node. Keep that endpoint visible, but exclude it
# from all new aligned comparisons rather than extrapolating the new objects.
existing = np.load(spectra_path)
legacy_k = np.asarray(existing["pk_k_h_per_Mpc"], dtype=float)
legacy_p = np.asarray(existing["pk_p_Mpc_over_h_cubed"], dtype=float)
legacy_k_new = legacy_k[legacy_k <= k_nodes[-1]]
legacy_new = {
    name: np.asarray(interpolator.P(0.0, legacy_k_new), dtype=float)
    for name, interpolator in interpolators.items()
}

common = (
    (k_native >= max(k_nodes[0], legacy_k[0]))
    & (k_native <= min(k_nodes[-1], legacy_k[-1]))
)
k = k_native[common]
reference = p_native[common]
candidates = {
    "log_cubic": np.asarray(interpolators["log_cubic"].P(0.0, k), dtype=float),
    "linear_cubic": np.asarray(interpolators["linear_cubic"].P(0.0, k), dtype=float),
    "power_nodes_log_linear": np.exp(np.interp(np.log(k), np.log(k_nodes), np.log(p_nodes))),
    "previous_frozen_log_linear": np.exp(np.interp(np.log(k), np.log(legacy_k), np.log(legacy_p))),
}
comparisons = {
    f"{name}_over_native_reconstruction": compare_power_curves(k, reference, values)
    for name, values in candidates.items()
}
comparisons["linear_cubic_over_log_cubic"] = compare_power_curves(
    k, candidates["log_cubic"], candidates["linear_cubic"]
)
comparisons["previous_frozen_over_new_log_cubic"] = compare_power_curves(
    k, candidates["log_cubic"], candidates["previous_frozen_log_linear"]
)

np.savez_compressed(
    output_path,
    k_native_h_per_Mpc=k_native,
    p_native_reconstructed=p_native,
    k_nodes_h_per_Mpc=k_nodes,
    p_nodes=p_nodes,
    p_log_cubic_at_nodes=p_log_at_nodes,
    p_linear_cubic_at_nodes=p_linear_at_nodes,
    aligned_k_h_per_Mpc=k,
    aligned_native_reconstructed=reference,
    aligned_log_cubic=candidates["log_cubic"],
    aligned_linear_cubic=candidates["linear_cubic"],
    aligned_power_nodes_log_linear=candidates["power_nodes_log_linear"],
    aligned_previous_frozen_log_linear=candidates["previous_frozen_log_linear"],
    legacy_k_h_per_Mpc=legacy_k,
    legacy_previous_frozen_p=legacy_p,
    legacy_new_k_h_per_Mpc=legacy_k_new,
    legacy_new_log_cubic_p=legacy_new["log_cubic"],
    legacy_new_linear_cubic_p=legacy_new["linear_cubic"],
    redshift=0.0,
)
summary = {
    "status": "computed_same_result_interpolator_construction_comparison_not_observational_fit",
    "model": args.model,
    "level": args.level,
    "camb_version": __import__("camb").__version__,
    "camb_source_commit": CAMB_SOURCE_COMMIT,
    "configuration": config,
    "actual_omch2": float(pars.omch2),
    "construction": {
        "direct_nodes": "get_linear_matter_power_spectrum: CAMB internal matter-transfer k and linear matter-power nodes",
        "log_cubic": "get_matter_power_interpolator(log_interp=True): cubic spline of ln(P) versus ln(k), one z uses interp1d(kind=3)",
        "linear_cubic": "get_matter_power_interpolator(log_interp=False): cubic spline of P versus ln(k), same nodes and get_results object",
        "power_nodes_log_linear": "log-log linear resampling of direct CAMB nodes onto native transfer k",
        "previous_frozen_log_linear": "log-log linear resampling of the old 2500-point spectra.npz onto native transfer k",
        "old_pipeline": "default log cubic spline evaluated at 2500 log-spaced points, then log-log linearly resampled in later analyses",
        "new_extrapolation_used": False,
        "logsign": {name: int(interpolator.logsign) for name, interpolator in interpolators.items()},
        "islog": {name: bool(interpolator.islog) for name, interpolator in interpolators.items()},
    },
    "shapes": {
        "native_transfer_points": int(k_native.size),
        "direct_power_nodes": int(k_nodes.size),
        "aligned_points": int(k.size),
        "legacy_output_points": int(legacy_k.size),
        "legacy_points_above_actual_node_max": int(np.count_nonzero(legacy_k > k_nodes[-1])),
    },
    "ranges": {
        "native_k": [float(k_native[0]), float(k_native[-1])],
        "direct_node_k": [float(k_nodes[0]), float(k_nodes[-1])],
        "aligned_k": [float(k[0]), float(k[-1])],
        "legacy_requested_k": [float(legacy_k[0]), float(legacy_k[-1])],
    },
    "node_reproduction": node_reproduction,
    "comparisons": comparisons,
    "validation": {
        "all_direct_nodes_finite_and_positive": bool(np.isfinite(p_nodes).all() and np.all(p_nodes > 0.0)),
        "all_aligned_values_finite": bool(np.isfinite(reference).all() and all(np.isfinite(v).all() for v in candidates.values())),
        "native_reference_strictly_positive": bool(np.all(reference > 0.0)),
        "zero_model_omch2_exactly_zero": bool(args.model != "zero" or float(pars.omch2) == 0.0),
    },
    "elapsed_seconds": time.perf_counter() - started,
    "maximum_rss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
    "input_sha256": {
        "protocol": sha256(PROTOCOL_PATH),
        "frozen_spectra": sha256(spectra_path),
        "parameters": sha256(run_dir / "parameters.ini"),
    },
    "output_sha256": {"interpolator-construction.npz": sha256(output_path)},
    "boundaries": [
        "All CAMB candidates use one get_results object; this isolates output construction, not solver or gauge differences.",
        "Node reproduction, spline interpolation, and the old second resampling stage are distinct operations.",
        "Negative linear-spline values, if any, are retained as overshoot evidence rather than clipped.",
        "No observational likelihood, covariance, joint BBN, nonlinear calculation, gauge transformation, or model-family exclusion.",
    ],
}
summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=2))
