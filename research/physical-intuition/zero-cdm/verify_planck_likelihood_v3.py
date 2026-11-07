"""Cross-check Planck lensing results with CosmoMC DatasetLikelihood itself."""

import hashlib
import json
import sys
from pathlib import Path

import numpy as np


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PLANCK_ROOT = REPO / ".tmp/planck_supp_data_and_covmats/lensing/2018"
STEM = "smicadx12_Dec5_ftl_mv2_ndclpp_p_teb_consext8"
sys.path.insert(0, str(REPO / ".tmp/likelihood-python"))
sys.path.insert(0, str(REPO / ".tmp/CosmoMC/python"))
# Compatibility aliases for the 2017-era CosmoMC source, with no numerical changes.
if not hasattr(np, "object"):
    np.object = object
if not hasattr(np, "int"):
    np.int = int

from CMBlikes import ClsArray, DatasetLikelihood  # noqa: E402
import getdist  # noqa: E402


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def require_close(actual, expected, label):
    if not np.allclose(actual, expected, rtol=1.0e-9, atol=1.0e-8):
        raise ValueError(f"{label}: {actual} != {expected}")


summary = json.loads((OUT / "planck-lensing-cmbmarged-summary.json").read_text(encoding="utf-8"))
protocol = json.loads((OUT / "planck-likelihood-protocol-v3.json").read_text(encoding="utf-8"))
for filename, expected in protocol["input_sha256"].items():
    path = Path(filename)
    if not path.is_absolute():
        path = REPO / filename
    if sha256(path) != expected:
        raise ValueError(f"protocol input hash mismatch: {path}")

variants = {
    "cmb_marginalized": f"{STEM}_CMBmarged.dataset",
}
records = {}
for variant, dataset_name in variants.items():
    dataset_path = PLANCK_ROOT / dataset_name
    dataset = DatasetLikelihood(str(dataset_path))
    records[variant] = {}
    for model in ["class_hyrec", "class_recfast", "camb_recfast"]:
        records[variant][model] = {}
        for cosmology in ["zero", "baseline"]:
            theory_path = REPO / ".tmp/planck-likelihood-cmbmarged/theory" / f"{model}_{cosmology}.theory_cl"
            expected_hash = summary["raw_output_sha256"][f"theory_file_{model}_{cosmology}"]
            if sha256(theory_path) != expected_hash:
                raise ValueError(f"theory hash mismatch: {model} {cosmology}")
            cls = ClsArray(str(theory_path))
            official_chi_squared, official_band = dataset.chi_squared(cls, return_binned_theory=True)
            direct = summary["records"][variant]["models"][model][cosmology]
            require_close(official_chi_squared, direct["chi_squared"], f"{variant} {model} {cosmology} chi2")
            require_close(
                np.asarray(official_band).reshape(-1),
                np.asarray(direct["corrected_bandpower"]),
                f"{variant} {model} {cosmology} corrected band",
            )
            records[variant][model][cosmology] = {
                "official_chi_squared": float(official_chi_squared),
                "direct_chi_squared": direct["chi_squared"],
                "max_abs_band_difference": float(np.max(np.abs(
                    np.asarray(official_band).reshape(-1) - np.asarray(direct["corrected_bandpower"])
                ))),
            }

result = {
    "verification": "passed",
    "official_implementation": "CosmoMC python/CMBlikes.py DatasetLikelihood.chi_squared",
    "cosmomc_commit": "83f00ac4742c7b48563204a22d7a7d3bb597a3e1",
    "getdist_version": getdist.__version__,
    "compatibility_aliases": ["np.object=object", "np.int=int"],
    "records": records,
    "verification_runner_sha256": sha256(Path(__file__).resolve()),
}
path = OUT / "planck-lensing-cmbmarged-verification.json"
path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, ensure_ascii=False, indent=2))
