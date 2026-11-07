"""Run CAMB ultra with DoLateRadTruncation disabled, preserving all other inputs."""

import argparse
import hashlib
import json
import resource
import time
from datetime import datetime
from pathlib import Path

import camb
import numpy as np

from camb_crosscode import build_params

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL = OUT / "camb-radiation-protocol.json"


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def freeze():
    if PROTOCOL.exists():
        raise FileExistsError(f"Refusing to overwrite {PROTOCOL}")
    protocol = {
        "status": "frozen_before_no_late_rad_run",
        "frozen_at_local": datetime.now().astimezone().isoformat(),
        "runner": "camb_radiation_test.py",
        "runner_sha256": sha256(Path(__file__).resolve()),
        "base_runner": "camb_crosscode.py",
        "base_runner_sha256": sha256(OUT / "camb_crosscode.py"),
        "camb_version": camb.__version__,
        "single_change": "DoLateRadTruncation=True -> False in CAMB ultra; all other settings unchanged",
        "unchanged": [
            "omch2=0 for zero and 0.1201075 for baseline",
            "Recfast recombination and fixed CLASS YHe",
            "AccuracyBoost=4, lSampleBoost=4, lAccuracyBoost=4",
            "k_per_logint=400 and linear lens_potential_accuracy=8",
            "nonlinear=False",
        ],
        "references": {
            "A_class_hyrec_integral": {
                "file": "convergence-summary.json",
                "sha256": sha256(OUT / "convergence-summary.json"),
            },
            "B_camb_recfast_ultra_with_late_rad": {
                "file": "camb-crosscode-summary.json",
                "sha256": sha256(OUT / "camb-crosscode-summary.json"),
            },
            "C_class_recfast": {
                "file": "recfast-systematics-summary.json",
                "sha256": sha256(OUT / "recfast-systematics-summary.json"),
            },
        },
        "primary_decision": {
            "quantity": "zero/baseline TT ratio at ell=1000",
            "D": "CAMB Recfast ultra with DoLateRadTruncation=False",
            "supports_late_rad_dominated_residual": "abs(D/A-1)<0.005, given previous abs(B/A-1)>0.02",
            "internal_effect": "D/B-1 measures the direct effect of disabling late radiation truncation",
            "otherwise": "标记未分离，不把近似无关或唯一根因当作既定事实",
        },
        "additional_outputs": "保存 lensed_scalar、unlensed_scalar 与 lens_potential，供后续非透镜 TT 检验；本轮不预写其结果。",
        "boundaries": [
            "不引入微量 CDM，不改变物理参数或精度档位。",
            "不接入观测似然，不搜索参数，不做非线性计算。",
            "运行失败时记录异常，不以旧结果替代新结果。",
        ],
    }
    PROTOCOL.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(PROTOCOL)


def run(model):
    pars, config = build_params(model, "ultra")
    pars.DoLateRadTruncation = False
    config["DoLateRadTruncation"] = False
    run_dir = REPO / ".tmp/camb-runs/no-late-rad" / model
    run_dir.mkdir(parents=True, exist_ok=True)
    pars.write_ini(run_dir / "parameters.ini")
    started = time.perf_counter()
    try:
        results = camb.get_results(pars)
        spectra = results.get_cmb_power_spectra(
            lmax=config["lmax"],
            spectra=("lensed_scalar", "unlensed_scalar", "lens_potential"),
            CMB_unit=None,
            raw_cl=False,
        )
        ell = np.arange(config["lmax"] + 1, dtype=int)
        tt_lensed = spectra["lensed_scalar"][:, 0]
        tt_unlensed = spectra["unlensed_scalar"][:, 0]
        pp = spectra["lens_potential"][:, 0]
        np.savez_compressed(
            run_dir / "spectra.npz",
            ell=ell,
            tt_lensed=tt_lensed,
            tt_unlensed=tt_unlensed,
            pp_deflection=pp,
        )
        summary = {
            "status": "computed_no_late_rad_fixed_inputs_not_observational_fit",
            "configuration": config,
            "actual_parameters": {
                "omch2": float(pars.omch2),
                "omnuh2": float(pars.omnuh2),
                "N_eff": float(pars.N_eff),
                "YHe": float(pars.YHe),
                "recombination_class": pars.Recomb.__class__.__name__,
                "DoLateRadTruncation": bool(pars.DoLateRadTruncation),
                "NonLinear": str(pars.NonLinear),
            },
            "validation": {
                "all_output_finite": bool(np.isfinite(tt_lensed).all() and np.isfinite(tt_unlensed).all() and np.isfinite(pp).all()),
                "late_rad_disabled": not bool(pars.DoLateRadTruncation),
                "zero_cdm_exact": (model == "zero" and float(pars.omch2) == 0.0) or model == "baseline",
                "nonlinear_disabled": str(pars.NonLinear) == camb.model.NonLinear_none,
            },
            "elapsed_seconds": time.perf_counter() - started,
            "maximum_rss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        }
        (run_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    except Exception as error:
        failure = {
            "status": "failed_no_substitution",
            "configuration": config,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "elapsed_seconds": time.perf_counter() - started,
        }
        (run_dir / "failure.json").write_text(json.dumps(failure, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--freeze", action="store_true")
    parser.add_argument("--model", choices=["zero", "baseline"], default="baseline")
    args = parser.parse_args()
    if args.freeze:
        freeze()
    else:
        run(args.model)
