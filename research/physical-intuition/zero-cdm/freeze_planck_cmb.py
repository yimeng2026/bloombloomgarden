"""Freeze data, spectra, nuisance conventions, and optimization before CMB analysis."""

import hashlib
import json
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "planck-cmb-protocol.json"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


INPUTS = [
    "research/physical-intuition/zero-cdm/planck_cmb_likelihood.py",
    "research/physical-intuition/zero-cdm/fixed_cl_theory.py",
    "research/physical-intuition/zero-cdm/analyze_planck_cmb.py",
    "research/physical-intuition/zero-cdm/verify_planck_cmb.py",
    "research/physical-intuition/zero-cdm/tests/test_planck_cmb_likelihood.py",
    ".tmp/class_public/class",
    ".tmp/class_public/convergence-integral.pre",
    ".tmp/class_public/zero-cdm-lensed.ini",
    ".tmp/class_public/baseline-lcdm-lensed.ini",
    ".tmp/class_public/zero-cdm-recfast-lensed.ini",
    ".tmp/class_public/baseline-lcdm-recfast-lensed.ini",
    ".tmp/class_public/convergence/lensed/zero-cdm-lensed00_cl_lensed.dat",
    ".tmp/class_public/convergence/lensed/baseline-lcdm-lensed00_cl_lensed.dat",
    ".tmp/class_public/output/zero-cdm-recfast-lensed00_00_cl_lensed.dat",
    ".tmp/class_public/output/baseline-lcdm-recfast-lensed00_00_cl_lensed.dat",
    ".tmp/class_public/output/zero-cdm-recfast-lensed00_00_cl.dat",
    ".tmp/class_public/output/baseline-lcdm-recfast-lensed00_00_cl.dat",
    ".tmp/class_public/convergence/recfast/zero-cdm-recfast00_cl.dat",
    ".tmp/class_public/convergence/recfast/baseline-lcdm-recfast00_cl.dat",
    ".tmp/cobaya-python/cobaya/likelihoods/base_classes/planck_2018_CamSpec_python.py",
    ".tmp/cobaya-python/cobaya/likelihoods/base_classes/planck_calib.yaml",
    ".tmp/cobaya-python/cobaya/likelihoods/base_classes/cmblikes.py",
    ".tmp/cobaya-python/cobaya/likelihoods/planck_2018_highl_CamSpec2021/planck_2018_CamSpec2021_python.py",
    ".tmp/cobaya-python/cobaya/likelihoods/planck_2018_highl_CamSpec2021/TTTEEE.yaml",
    ".tmp/cobaya-python/cobaya/likelihoods/planck_2018_highl_CamSpec2021/params_TT_CamSpec.yaml",
    ".tmp/cobaya-python/cobaya/likelihoods/planck_2018_highl_CamSpec2021/params_TE_CamSpec.yaml",
    ".tmp/cobaya-python/cobaya/likelihoods/planck_2018_highl_CamSpec2021/params_EE_CamSpec.yaml",
    ".tmp/cobaya-python/cobaya/likelihoods/planck_2018_lowl/TT.py",
    ".tmp/cobaya-python/cobaya/likelihoods/planck_2018_lowl/EE.py",
    ".tmp/cobaya-python/cobaya/likelihoods/planck_2018_lensing/native.yaml",
    ".tmp/cobaya-python/cobaya/likelihoods/planck_2018_lensing/__init__.py",
    ".tmp/cobaya-python/cobaya/samplers/minimize/minimize.py",
]
DATA_ROOT = ".tmp/cobaya-packages/data"
CAMSPEC = f"{DATA_ROOT}/planck_2018_CamSpec2021/CamSpec2021"
INPUTS += [
    f"{CAMSPEC}/CamSpecHM_12_6_cl.dataset",
    f"{CAMSPEC}/like_12.6HMcleaned_unified_spectra.txt",
    f"{CAMSPEC}/like_12.6HMcleaned_unified_cov.bin",
    f"{CAMSPEC}/like_12.6HMcleaned_unified_data_ranges.txt",
    f"{CAMSPEC}/143x143_10.5_dust.dat",
    f"{CAMSPEC}/217x217_10.5_dust.dat",
    f"{CAMSPEC}/143x217_10.5_dust.dat",
    f"{CAMSPEC}/cib217.txt",
    f"{CAMSPEC}/tsz_143_eps0.50.dat",
    f"{CAMSPEC}/sz_x_cib_template.dat",
    f"{CAMSPEC}/cl_ksz_148_trac.dat",
]
for name in ["cov.txt", "mu.txt", "mu_sigma.txt", "cl2x_1.txt", "cl2x_2.txt"]:
    INPUTS.append(f"{DATA_ROOT}/planck_2018_lowT_native/{name}")
INPUTS.append(f"{DATA_ROOT}/planck_2018_lowE_native/prob_table.txt")
NATIVE = f"{DATA_ROOT}/planck_supp_data_and_covmats/lensing/2018"
INPUTS += [
    f"{NATIVE}/smicadx12_Dec5_ftl_mv2_ndclpp_p_teb_consext8.dataset",
    f"{NATIVE}/smicadx12_Dec5_ftl_mv2_ndclpp_p_teb_consext8_bandpowers.dat",
    f"{NATIVE}/smicadx12_Dec5_ftl_mv2_ndclpp_p_teb_consext8_cov.dat",
    f"{NATIVE}/smicadx12_Dec5_ftl_mv2_ndclpp_p_teb_consext8_lensing_fiducial_correction.dat",
]
for stem in ["window", "lens_delta_window"]:
    directory = "window" if stem == "window" else "lens_delta_window"
    for index in range(1, 10):
        INPUTS.append(f"{NATIVE}/smicadx12_Dec5_ftl_mv2_ndclpp_p_teb_consext8_{directory}/window{index}.dat")
INPUTS = sorted(set(INPUTS))

if PROTOCOL_PATH.exists():
    raise FileExistsError(f"Refusing to overwrite frozen protocol: {PROTOCOL_PATH}")
missing = [name for name in INPUTS if not (REPO / name).is_file()]
if missing:
    raise FileNotFoundError(missing)
protocol = {
    "status": "frozen_before_fixed_spectrum_planck_cmb_analysis",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "software": {
        "cobaya": "3.6.2 from PyPI",
        "CamSpec_data": "CobayaSampler/planck_native_data v1, CamSpec2021.zip",
        "lowT_lowE_data": "CobayaSampler/planck_native_data v1",
        "lensing_data": "CobayaSampler/planck_supp_data_and_covmats v2.1",
        "class_source_commit": "2d88c3f650b691d2b13165e826697f43ef2530c4",
    },
    "likelihoods": [
        "planck_2018_highl_CamSpec2021.TTTEEE",
        "planck_2018_lowl.TT",
        "planck_2018_lowl.EE",
        "planck_2018_lensing.native",
    ],
    "spectrum_rule": {
        "files": "Only explicit CLASS cl_lensed.dat for TT/EE/TE; no unlensed substitution",
        "TT_EE_TE": "zero-based D_ell=l(l+1)C_l/(2pi), multiplied by (2.7255e6)^2 to FIRAS muK^2",
        "PP": "CLASS l(l+1)C_l^phiphi/(2pi) multiplied by l(l+1), giving Cobaya deflection convention",
        "RECFAST": "new explicit lensing=yes run with identical physical inputs and convergence-integral.pre; unlensed output must be bitwise identical to original",
    },
    "CamSpec_data_selection": {
        "use_cl": "143x143 217x217 143x217 TE EE",
        "ranges": {"143x143": [30, 2000], "217x217": [500, 2500], "143x217": [500, 2500], "TE": [30, 2000], "EE": [30, 2000]},
        "data_points": 9915,
        "covariance": "full used covariance, inverted once by official implementation and cached as float32 by Cobaya",
    },
    "nuisance_rule": {
        "sampled": ["A_planck", "amp_143", "amp_217", "amp_143x217", "n_143", "n_217", "n_143x217", "calTE", "calEE"],
        "constant": {"use_fg_residual_model": 0, "cal0": 1, "cal2": 1, "amp_100": 0, "n_100": 1},
        "reference_start": {"A_planck": 1, "amp_143": 10, "amp_217": 20, "amp_143x217": 10, "n_143": 1, "n_217": 1, "n_143x217": 1, "calTE": 1, "calEE": 1},
        "priors": "Official YAML foreground bounds and Gaussian calibration priors, unchanged",
        "profile_rule": "Optimize zero and baseline independently, each with two seeded starts; never copy one model's optimum to the other",
        "optimizer": "Cobaya Minimize, scipy L-BFGS-B, full nuisance posterior, confidence_for_unbounded=0.9999995",
        "optimizer_options": {"maxiter": 3000, "maxfun": 50000, "ftol": 1e-12, "gtol": 1e-7, "eps": 1e-5, "maxls": 50},
        "seed_base": 20261108,
        "report": "Record each likelihood logL and chi2, total logpost, all parameters, convergence, bounds and both-start minima",
    },
    "lensing_rule": "Use native lensing once in the joint CMB evaluation; do not add the earlier CMB-marginalized lensing chi2 again",
    "verification_rule": "Recompute every optimum; independently assemble CamSpec residuals; direct second calls for lowT, lowE and native lensing; check RECFAST unlensed identity",
    "output_rule": "Write separate HyRec and RECFAST summaries and one verification record; refuse to overwrite existing case summaries",
    "input_sha256": {name: sha256(REPO / name) for name in INPUTS},
    "boundaries": [
        "Fixed cosmological inputs, not a cosmological-parameter fit or posterior sample",
        "Foreground/calibration nuisance posterior profiling does not make this a best-fit no-CDM model",
        "No exclusion of the broader no-CDM model family, no Bayesian evidence and no posterior model probability",
        "No CMB-marginalized lensing term is added to native lensing or TT/EE/TE",
    ],
}
PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PROTOCOL_PATH), "inputs_hashed": len(INPUTS)}, ensure_ascii=False, indent=2))
