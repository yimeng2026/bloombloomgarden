"""Compute PRIMAT BBN abundances and joint observational diagnostics."""

import hashlib
import json
import sys
import time
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

from bbn_likelihood import bbn_chi_squared


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
sys.path.insert(0, str(REPO / ".tmp/bbn-python"))
from primat import __version__ as primat_version  # noqa: E402
from primat.backend import run_bbn  # noqa: E402
from primat.background import StandardBackground  # noqa: E402
from primat.config import PRIMATConfig  # noqa: E402
from primat.main import PRIMAT  # noqa: E402
from primat.plasma import Plasma  # noqa: E402


SUMMARY_PATH = OUT / "bbn-summary.json"
FIGURE_PATH = OUT / "bbn-comparison.svg"
PREVIEW_PATH = REPO / ".tmp/bbn-comparison.png"
CLASS_YHE = 0.24518836574531122
PARAMS = {
    "Omegabh2": 0.02218,
    "Omegach2": 0.1201075,
    "h": 0.6766,
    "DeltaNeff": 0.0,
    "Neff_SM": 3.044,
    "T0CMB": 2.7255,
    "show_progress": False,
    "use_numba": False,
}
DATASETS = {
    "PDG_Aug2023": {
        "yp_observed": 0.2450,
        "yp_sigma": 0.0030,
        "doh_observed": 2.547e-05,
        "doh_sigma": 0.029e-05,
        "source": "PDG Aug 2023 recommendation, summarized in Schöneberg 2024 Table 1 and PDG 2025 review",
    },
    "BAO_BBN_papers": {
        "yp_observed": 0.2449,
        "yp_sigma": 0.0040,
        "doh_observed": 2.527e-05,
        "doh_sigma": 0.030e-05,
        "source": "Cooke+2017 and Aver+2015, summarized in Schöneberg 2024 Table 1",
    },
    "EMPRESS_sensitivity": {
        "yp_observed": 0.2370,
        "yp_sigma": 0.0034,
        "doh_observed": 2.547e-05,
        "doh_sigma": 0.029e-05,
        "source": "EMPRESS Subaru result discussed in Schöneberg 2024 §4.3; D/H held at PDG values for sensitivity",
    },
}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def zero_cdm_python_result():
    """Run PRIMAT with exact zero CDM, bypassing only its positive-value guard."""
    cfg = PRIMATConfig(PARAMS)
    cfg.Omegach2 = 0.0
    plasma = Plasma(cfg)
    background = StandardBackground(cfg, plasma)
    started = time.perf_counter()
    result = PRIMAT(background=background).solve(progress=False)
    return result, time.perf_counter() - started


started = time.perf_counter()
zero_result, zero_elapsed = zero_cdm_python_result()
baseline_results = {}
for backend in ["c", "python"]:
    backend_started = time.perf_counter()
    baseline_results[backend] = run_bbn(PARAMS, force_backend=backend)
    baseline_results[backend]["elapsed_seconds"] = time.perf_counter() - backend_started

observational = {}
for name, dataset in DATASETS.items():
    observational[name] = {}
    for model, result in [("zero", zero_result), ("baseline", baseline_results["python"])]:
        chi_squared = bbn_chi_squared(
            result["YPBBN"], result["DoH"],
            dataset["yp_observed"], dataset["yp_sigma"],
            dataset["doh_observed"], dataset["doh_sigma"],
        )
        observational[name][model] = {
            "YPBBN": result["YPBBN"],
            "DoH": result["DoH"],
            "chi_squared": chi_squared,
            "yp_residual_over_sigma": (result["YPBBN"] - dataset["yp_observed"]) / dataset["yp_sigma"],
            "doh_residual_over_sigma": (result["DoH"] - dataset["doh_observed"]) / dataset["doh_sigma"],
        }
    observational[name]["delta_chi_squared_zero_minus_baseline"] = (
        observational[name]["zero"]["chi_squared"] - observational[name]["baseline"]["chi_squared"]
    )

backend_comparison = {}
for key in ["YPCMB", "YPBBN", "DoH", "He4oH", "He3oH", "Li7oH", "Neff"]:
    c_value = baseline_results["c"][key]
    python_value = baseline_results["python"][key]
    backend_comparison[key] = {
        "c": c_value,
        "python": python_value,
        "c_over_python_minus_1": c_value / python_value - 1.0,
    }
class_comparison = {
    "class_YHe": CLASS_YHE,
    "zero_YPCMB": zero_result["YPCMB"],
    "baseline_YPCMB": baseline_results["python"]["YPCMB"],
    "class_over_primat_minus_1": CLASS_YHE / zero_result["YPCMB"] - 1.0,
    "note": "YPCMB is the recombination convention, not the raw BBN YPBBN; CLASS uses its own sBBN_2025 mapping rather than this PRIMAT run.",
}

summary = {
    "status": "computed_primat_bbn_abundances_and_observational_diagnostics_not_joint_posterior",
    "engine": {
        "name": "PRIMAT",
        "version": primat_version,
        "source": "https://github.com/CyrilPitrou/primat and official PyPI primat 0.3.3",
        "zero_cdm_method": "Validate all other parameters, then explicitly set cfg.Omegach2=0 before StandardBackground; no nonzero placeholder and no source-code edit",
        "baseline_backends": ["c", "python"],
        "zero_backend": "python custom background because run_bbn validates Omegach2>0",
        "physical_inputs": PARAMS | {"zero_Omegach2": 0.0},
    },
    "results": {
        "zero_python": zero_result,
        "baseline_python": baseline_results["python"],
        "baseline_c": baseline_results["c"],
    },
    "elapsed_seconds": {
        "zero_python": zero_elapsed,
        "baseline_python": baseline_results["python"]["elapsed_seconds"],
        "baseline_c": baseline_results["c"]["elapsed_seconds"],
        "total": time.perf_counter() - started,
    },
    "observational": observational,
    "backend_comparison": backend_comparison,
    "class_comparison": class_comparison,
    "datasets": DATASETS,
    "source_module_sha256": {
        "backend.py": sha256(REPO / ".tmp/bbn-python/primat/backend.py"),
        "config.py": sha256(REPO / ".tmp/bbn-python/primat/config.py"),
        "background.py": sha256(REPO / ".tmp/bbn-python/primat/background.py"),
        "main.py": sha256(REPO / ".tmp/bbn-python/primat/main.py"),
    },
    "analysis_runner_sha256": sha256(Path(__file__).resolve()),
    "validation": {
        "zero_Omegach2_exactly_zero": True,
        "baseline_backend_outputs_finite": all(
            np.isfinite(result[key]).all()
            for result in [zero_result, baseline_results["python"], baseline_results["c"]]
            for key in ["YPCMB", "YPBBN", "DoH", "Neff"]
        ),
        "parameter_fitting_performed": False,
        "joint_cmb_bbn_posterior_performed": False,
    },
    "boundaries": [
        "BBN abundances are almost identical for zero and baseline because CDM is negligible during nucleosynthesis; BBN is not an independent rescue for the zero model.",
        "Dataset choices are shown separately, including the lower EMPRESS helium value; no favorable subset is selected.",
        "CLASS sBBN_2025 and PRIMAT conventions are distinguished; no recombination rerun is performed here.",
        "No parameter fitting, joint CMB+BBN posterior, or model-family exclusion is claimed.",
    ],
}
SUMMARY_PATH.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

plt.rcParams.update({
    "font.size": 9,
    "font.sans-serif": ["Microsoft YaHei", "SimHei", "DejaVu Sans"],
    "svg.hashsalt": "bbn-primat-v1",
})
fig, axes = plt.subplots(1, 2, figsize=(13, 5), constrained_layout=True)
x = np.array([0.0, 1.0])
yp_values = [zero_result["YPBBN"], baseline_results["python"]["YPBBN"]]
dh_values = [zero_result["DoH"], baseline_results["python"]["DoH"]]
for ax, values, observed_key, sigma_key, title, ylabel in [
    (axes[0], yp_values, "yp_observed", "yp_sigma", "PRIMAT 与氦-4 观测", "YPBBN"),
    (axes[1], dh_values, "doh_observed", "doh_sigma", "PRIMAT 与氘丰度观测", "D/H"),
]:
    for index, (name, dataset) in enumerate(DATASETS.items()):
        observed = dataset[observed_key]
        sigma = dataset[sigma_key]
        ax.fill_between([-0.5, 1.5], observed - sigma, observed + sigma, alpha=0.13, label=f"{name} 观测区间")
        ax.hlines(observed, -0.5, 1.5, lw=0.8)
    ax.scatter(x, values, s=48, color="#2563a6", zorder=5, label="PRIMAT 计算（零模型／基线几乎重合）")
    ax.set(xticks=x, xticklabels=["零模型", "ΛCDM 基线"], title=title, ylabel=ylabel, xlim=(-0.5, 1.5))
    ax.grid(alpha=0.25)
    ax.legend(frameon=False, fontsize=7, loc="best")
fig.savefig(FIGURE_PATH, bbox_inches="tight", metadata={"Date": None})
FIGURE_PATH.write_text(
    "\n".join(line.rstrip() for line in FIGURE_PATH.read_text(encoding="utf-8").splitlines()) + "\n",
    encoding="utf-8",
)
PREVIEW_PATH.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(PREVIEW_PATH, dpi=150, bbox_inches="tight", metadata={"Software": "bbn-primat-v1"})
print(json.dumps({
    "status": summary["status"],
    "observational": observational,
    "backend_comparison": backend_comparison,
    "class_comparison": class_comparison,
    "summary": str(SUMMARY_PATH),
    "figure": str(FIGURE_PATH),
    "preview": str(PREVIEW_PATH),
}, ensure_ascii=False, indent=2))
