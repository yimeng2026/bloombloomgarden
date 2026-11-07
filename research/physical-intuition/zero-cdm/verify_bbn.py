"""Independently verify PRIMAT abundances, backends, and BBN chi-squared values."""

import hashlib
import json
import sys
from pathlib import Path

import numpy as np

from bbn_likelihood import bbn_chi_squared


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
sys.path.insert(0, str(REPO / ".tmp/bbn-python"))
from primat.backend import run_bbn  # noqa: E402
from primat.background import StandardBackground  # noqa: E402
from primat.config import PRIMATConfig  # noqa: E402
from primat.main import PRIMAT  # noqa: E402
from primat.plasma import Plasma  # noqa: E402


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


summary = json.loads((OUT / "bbn-summary.json").read_text(encoding="utf-8"))
protocol = json.loads((OUT / "bbn-protocol.json").read_text(encoding="utf-8"))
for filename, expected in protocol["input_sha256"].items():
    path = Path(filename)
    if not path.is_absolute():
        path = REPO / filename
    if sha256(path) != expected:
        raise ValueError(f"protocol input hash mismatch: {path}")

params = summary["engine"]["physical_inputs"].copy()
params.pop("zero_Omegach2")
cfg = PRIMATConfig(params)
cfg.Omegach2 = 0.0
zero = PRIMAT(background=StandardBackground(cfg, Plasma(cfg))).solve(progress=False)
baseline_c = run_bbn(params, force_backend="c")
baseline_python = run_bbn(params, force_backend="python")
for key in ["YPCMB", "YPBBN", "DoH", "He4oH", "He3oH", "Li7oH", "Neff"]:
    np.testing.assert_allclose(zero[key], summary["results"]["zero_python"][key], rtol=1.0e-8, atol=1.0e-12)
    np.testing.assert_allclose(baseline_c[key], summary["results"]["baseline_c"][key], rtol=1.0e-8, atol=1.0e-12)
    np.testing.assert_allclose(baseline_python[key], summary["results"]["baseline_python"][key], rtol=1.0e-8, atol=1.0e-12)
    np.testing.assert_allclose(
        baseline_c[key] / baseline_python[key] - 1.0,
        summary["backend_comparison"][key]["c_over_python_minus_1"],
        rtol=1.0e-8,
        atol=1.0e-12,
    )

for name, dataset in summary["datasets"].items():
    for model, result in [("zero", zero), ("baseline", baseline_python)]:
        actual = bbn_chi_squared(
            result["YPBBN"], result["DoH"],
            dataset["yp_observed"], dataset["yp_sigma"],
            dataset["doh_observed"], dataset["doh_sigma"],
        )
        expected = summary["observational"][name][model]["chi_squared"]
        np.testing.assert_allclose(actual, expected, rtol=1.0e-8, atol=1.0e-10)
class_expected = summary["class_comparison"]["class_over_primat_minus_1"]
class_actual = summary["class_comparison"]["class_YHe"] / zero["YPCMB"] - 1.0
np.testing.assert_allclose(class_actual, class_expected, rtol=1.0e-8, atol=1.0e-12)
result = {
    "verification": "passed",
    "zero_Omegach2_exactly_zero": cfg.Omegach2 == 0.0,
    "zero_YPBBN": zero["YPBBN"],
    "baseline_YPBBN": baseline_python["YPBBN"],
    "zero_DoH": zero["DoH"],
    "baseline_DoH": baseline_python["DoH"],
    "backend_comparison": summary["backend_comparison"],
    "class_over_primat_minus_1": class_actual,
    "verification_runner_sha256": sha256(Path(__file__).resolve()),
}
path = OUT / "bbn-verification.json"
path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, ensure_ascii=False, indent=2))
