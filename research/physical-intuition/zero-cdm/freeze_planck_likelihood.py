"""Freeze Planck 2018 lensing likelihood data, theory inputs, and verification route."""

import hashlib
import json
from datetime import datetime
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PLANCK_ROOT = REPO / ".tmp/planck_supp_data_and_covmats/lensing/2018"
STEM = "smicadx12_Dec5_ftl_mv2_ndclpp_p_teb_consext8"
PROTOCOL_PATH = OUT / "planck-likelihood-protocol.json"
INPUTS = [
    "research/physical-intuition/zero-cdm/freeze_planck_likelihood.py",
    "research/physical-intuition/zero-cdm/analyze_planck_likelihood.py",
    "research/physical-intuition/zero-cdm/verify_planck_likelihood.py",
    "research/physical-intuition/zero-cdm/planck_likelihood.py",
    "research/physical-intuition/zero-cdm/tests/test_planck_likelihood.py",
    ".tmp/CosmoMC/python/CMBlikes.py",
    ".tmp/camb-runs/ultra/zero/spectra.npz",
    ".tmp/camb-runs/ultra/baseline/spectra.npz",
    ".tmp/class_public/convergence/integral/zero-cdm-integral00_cl.dat",
    ".tmp/class_public/convergence/integral/baseline-lcdm-integral00_cl.dat",
    ".tmp/class_public/convergence/recfast/zero-cdm-recfast00_cl.dat",
    ".tmp/class_public/convergence/recfast/baseline-lcdm-recfast00_cl.dat",
]
for filename in [
    f"{STEM}_bandpowers.dat",
    f"{STEM}.dataset",
    f"{STEM}_CMBmarged.dataset",
    f"{STEM}_cov.dat",
    f"{STEM}_CMBmarged_cov.dat",
    f"{STEM}_lensing_fiducial_correction.dat",
    f"{STEM}_CMBmarged_lensing_fiducial_correction.dat",
]:
    INPUTS.append(f".tmp/planck_supp_data_and_covmats/lensing/2018/{filename}")
for directory in [
    f"{STEM}_window",
    f"{STEM}_lens_delta_window",
    f"{STEM}_CMBmarged_lens_delta_window",
]:
    for path in sorted((PLANCK_ROOT / directory).glob("window*.dat")):
        INPUTS.append(str(path.relative_to(REPO)).replace("\\", "/"))


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


if PROTOCOL_PATH.exists():
    raise FileExistsError(f"Refusing to overwrite frozen protocol: {PROTOCOL_PATH}")
protocol = {
    "status": "frozen_before_fixed_input_planck_lensing_likelihood_analysis",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "data": {
        "release": "Planck 2018 gravitational lensing, 9 conservative band powers at 8<=L<=400",
        "mirror": "CobayaSampler/planck_supp_data_and_covmats",
        "mirror_commit": "621f4c5db33b08f4d28527e3459a922476f49618",
        "cosmomc": "cmbant/CosmoMC",
        "cosmomc_commit": "83f00ac4742c7b48563204a22d7a7d3bb597a3e1",
        "bandpower_definition": "[L(L+1)]^2 C_l^phiphi/(2pi), the deflection spectrum",
    },
    "models": ["class_hyrec", "class_recfast", "camb_recfast"],
    "covariances": ["fixed_covariance", "cmb_marginalized"],
    "theory_rule": "CLASS phiphi is multiplied by L(L+1); CAMB pp_deflection is used directly; apply official bin and linear-correction windows before subtracting observed band powers",
    "chi_squared_rule": "residual^T covariance^{-1} residual for each model and covariance version; zero-minus-baseline differences only, no fitting or posterior",
    "official_crosscheck": "Run CosmoMC DatasetLikelihood.chi_squared on the generated theory files and require agreement with the independent formula",
    "output_rule": "Write new planck-likelihood theory and summary artifacts without modifying earlier research outputs.",
    "input_sha256": {name: sha256(REPO / name) for name in INPUTS},
    "boundaries": [
        "No parameter fitting, best-fit claim, posterior, or model-family exclusion.",
        "No joint BBN or full temperature/polarization likelihood in this bounded observation slice.",
        "No nonzero CDM placeholder, new solver run, or change to existing physical inputs.",
    ],
}
PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PROTOCOL_PATH), "inputs_hashed": len(INPUTS)}, ensure_ascii=False, indent=2))
