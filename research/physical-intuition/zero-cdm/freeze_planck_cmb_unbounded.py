"""Freeze the calibration-bound sensitivity analysis before untruncated optimization."""

import hashlib
import json
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PATH = OUT / "planck-cmb-unbounded-protocol.json"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


base = json.loads((OUT / "planck-cmb-protocol.json").read_text(encoding="utf-8"))
inputs = dict(base["input_sha256"])
for amendment_path in sorted(OUT.glob("planck-cmb-amendment-*.json")):
    amendment = json.loads(amendment_path.read_text(encoding="utf-8"))
    inputs.update(amendment["input_sha256_updates"])
    inputs[str(amendment_path.relative_to(REPO))] = sha256(amendment_path)
inputs[str((OUT / "planck-cmb-protocol.json").relative_to(REPO))] = sha256(OUT / "planck-cmb-protocol.json")
for name in [
    "analyze_planck_cmb_unbounded.py",
    "verify_planck_cmb_unbounded.py",
    "planck-cmb-hyrec-summary.json",
    "planck-cmb-recfast-summary.json",
    "planck-cmb-verification.json",
]:
    inputs[str((OUT / name).relative_to(REPO))] = sha256(OUT / name)
inputs[".tmp/cobaya-python/cobaya/prior.py"] = sha256(REPO / ".tmp/cobaya-python/cobaya/prior.py")

if PATH.exists():
    raise FileExistsError(f"Refusing to overwrite sensitivity protocol: {PATH}")
protocol = {
    "status": "frozen_before_unbounded_gaussian_calibration_sensitivity",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "reason": "Both zero-model runs placed A_planck, calTE and calEE at Cobaya's default finite 5-sigma optimizer boundaries, so those points are boundary-limited rather than demonstrated posterior modes.",
    "preserved_results": "Keep both default 5-sigma summaries and their verification unchanged; write separate unbounded-calibration sensitivity artifacts.",
    "unchanged": [
        "CLASS explicit lensed spectra and all physical inputs",
        "CamSpec, lowT, lowE and native lensing data and covariance",
        "All foreground and calibration prior probability densities",
        "Native lensing counted once; no additional CMB-marginalized term",
    ],
    "changed_optimizer_setting": {
        "confidence_for_unbounded": 1,
        "meaning": "Use infinite L-BFGS-B bounds for Gaussian A_planck/calTE/calEE; their Gaussian log-priors remain in the objective",
        "bounded_foregrounds": "Official amp/n bounds unchanged",
        "starts": "Previous model-specific 5-sigma optimum plus the deterministic official reference if finite",
        "method": "Cobaya Minimize scipy L-BFGS-B, two starts, maxiter=5000, maxfun=80000, eps=1e-5",
    },
    "required_reporting": "Record parameters, per-likelihood chi2, convergence, finite prior boundaries, improvement over 5-sigma result and independent CamSpec residual verification",
    "output_rule": "Write planck-cmb-unbounded-{case}-summary.json and planck-cmb-unbounded-verification.json; refuse overwrites",
    "input_sha256": inputs,
    "boundaries": [
        "Sensitivity to optimizer truncation, not a new physical model or a loosened prior",
        "No cosmological-parameter fit, posterior sample, Bayesian evidence or model-family exclusion",
    ],
}
PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PATH), "inputs_hashed": len(inputs)}, ensure_ascii=False, indent=2))
