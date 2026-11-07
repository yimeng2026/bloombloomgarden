"""Run paired transfer-only accuracy cases restricted to the target k<=1.28 range."""

import argparse
import json
import resource
import time
from pathlib import Path

import numpy as np

from camb_crosscode import CAMB_SOURCE_COMMIT, REPO, build_params, sha256
from gauge_transform import class_comoving_matter_density
from signed_transfer_statistics import power_from_transfer


OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "kmax-limited-protocol.json"
CASES = {"reference4": 4.0, "accuracy8": 8.0}
KMAX = 1.28


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
parser.add_argument("--case", required=True, choices=list(CASES))
args = parser.parse_args()
protocol = check_protocol()
run_dir = REPO / ".tmp/camb-runs/kmax-limited" / args.case / args.model
run_dir.mkdir(parents=True, exist_ok=True)
output_path = run_dir / "kmax-limited.npz"
summary_path = run_dir / "summary.json"
failure_path = run_dir / "failure.json"
if output_path.exists() or summary_path.exists() or failure_path.exists():
    raise FileExistsError(f"Refusing to overwrite kmax-limited outputs in {run_dir}")

pars, config = build_params(args.model, "ultra")
config["base_level"] = "ultra"
config["case"] = args.case
config["execution_path"] = "camb.get_transfer_functions(only_time_sources=True), kmax=1.28"
config["kmax_h_per_Mpc"] = KMAX
pars.set_matter_power(redshifts=[0.0], kmax=KMAX, k_per_logint=config["k_per_logint"], nonlinear=False)
if args.case == "accuracy8":
    pars.set_accuracy(
        AccuracyBoost=8.0,
        lSampleBoost=config["lSampleBoost"],
        lAccuracyBoost=config["lAccuracyBoost"],
        DoLateRadTruncation=config["DoLateRadTruncation"],
    )
    config["AccuracyBoost"] = 8.0
if not pars.validate():
    raise ValueError("CAMB parameter validation failed")
pars.write_ini(run_dir / "parameters.ini")
actual = {
    "omch2": float(pars.omch2),
    "AccuracyBoost": float(pars.Accuracy.AccuracyBoost),
    "lSampleBoost": float(pars.Accuracy.lSampleBoost),
    "lAccuracyBoost": float(pars.Accuracy.lAccuracyBoost),
    "k_per_logint": int(pars.Transfer.k_per_logint),
    "kmax": float(pars.Transfer.kmax),
    "DoLateRadTruncation": bool(pars.DoLateRadTruncation),
    "lens_potential_accuracy": int(config["lens_potential_accuracy"]),
    "recombination_class": pars.Recomb.__class__.__name__,
}
if actual["AccuracyBoost"] != CASES[args.case] or actual["kmax"] != KMAX:
    raise ValueError("requested accuracy or kmax did not persist")
for key in ["lSampleBoost", "lAccuracyBoost", "k_per_logint"]:
    if actual[key] != config[key]:
        raise ValueError(f"Unintended change: {key}")

started = time.perf_counter()
try:
    results = __import__("camb").get_transfer_functions(pars, only_time_sources=True)
    transfer = results.get_matter_transfer_data()
    q = np.asarray(transfer.q, dtype=float)
    h = float(pars.H0 / 100.0)
    transfer_data = transfer.transfer_data
    model = __import__("camb.model", fromlist=["transfer_names"])

    def scaled(name):
        return q**2 * np.asarray(transfer_data[model.transfer_names.index(name), :, 0], dtype=float)

    delta_c = scaled("delta_cdm")
    delta_b = scaled("delta_baryon")
    native_delta_m = scaled("delta_tot")
    direct_v_b = scaled("v_baryon_cdm")
    conformal_h = float(results.h_of_z(0.0))
    comoving = class_comoving_matter_density(
        delta_c, delta_b, np.zeros_like(direct_v_b), direct_v_b,
        float(pars.omch2), float(pars.ombh2), conformal_h, q,
    )
    k_h, comoving_power = power_from_transfer(
        q, comoving, config["As"], config["ns"], config["pivot_scalar"], h
    )
    _, synchronous_power = power_from_transfer(
        q, native_delta_m, config["As"], config["ns"], config["pivot_scalar"], h
    )
    if k_h[-1] < KMAX:
        raise ValueError(f"limited output does not cover k={KMAX}: {k_h[-1]}")
    np.savez_compressed(
        output_path,
        q_Mpc_inv=q,
        k_h_per_Mpc=k_h,
        h=h,
        rho_c=float(pars.omch2),
        rho_b=float(pars.ombh2),
        conformal_h=conformal_h,
        delta_c=delta_c,
        delta_b=delta_b,
        native_delta_m=native_delta_m,
        direct_v_baryon_cdm=direct_v_b,
        comoving_direct=comoving,
        comoving_power=comoving_power,
        synchronous_power=synchronous_power,
        transfer_data=transfer_data,
    )
    summary = {
        "status": "computed_kmax_limited_transfer_accuracy_case_not_observational_fit",
        "model": args.model,
        "case": args.case,
        "base_level": "ultra",
        "execution_path": config["execution_path"],
        "camb_version": __import__("camb").__version__,
        "camb_source_commit": CAMB_SOURCE_COMMIT,
        "configuration": config,
        "actual_parameters": actual | {"OnlyTransfers": bool(results.OnlyTransfers)},
        "shape": {
            "native_points": int(k_h.size),
            "k_min_h_per_Mpc": float(k_h[0]),
            "k_max_h_per_Mpc": float(k_h[-1]),
            "transfer_data": list(transfer_data.shape),
        },
        "validation": {
            "all_values_finite": bool(np.isfinite(transfer_data).all() and np.isfinite(comoving_power).all()),
            "zero_model_omch2_exactly_zero": bool(args.model != "zero" or float(pars.omch2) == 0.0),
            "only_transfers_path": bool(results.OnlyTransfers),
            "target_range_covered": bool(k_h[-1] >= KMAX),
        },
        "elapsed_seconds": time.perf_counter() - started,
        "maximum_rss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        "input_sha256": {
            "protocol": sha256(PROTOCOL_PATH),
            "parameters": sha256(run_dir / "parameters.ini"),
        },
        "output_sha256": {"kmax-limited.npz": sha256(output_path)},
        "boundaries": [
            "Both cases use kmax=1.28 and only_time_sources=True; only AccuracyBoost differs within the pair.",
            "The limited-range result is not a completed full-k AccuracyBoost=8 run and uses a separate common grid.",
        ],
    }
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
except Exception as error:
    failure = {
        "status": "failed_kmax_limited_transfer_accuracy_case",
        "model": args.model,
        "case": args.case,
        "configuration": config,
        "actual_parameters": actual,
        "error_type": type(error).__name__,
        "error_message": str(error),
        "elapsed_seconds": time.perf_counter() - started,
        "maximum_rss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
    }
    failure_path.write_text(json.dumps(failure, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    raise
