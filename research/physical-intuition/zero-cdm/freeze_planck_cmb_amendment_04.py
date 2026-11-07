"""Correct the RECFAST rerun identity check to measured shared-multipole consistency."""

import hashlib
import json
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PATH = OUT / "planck-cmb-amendment-04.json"
NAME = "research/physical-intuition/zero-cdm/verify_planck_cmb.py"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


if PATH.exists():
    raise FileExistsError(f"Refusing to overwrite amendment: {PATH}")
amendment = {
    "status": "verification_protocol_correction_for_lensing_internal_lmax",
    "amends": "planck-cmb-protocol.json spectrum_rule.RECFAST and planck-cmb-amendment-03.json",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "reason": "Enabling CLASS lensing extends internal unlensed output to ell=3499 versus 2500 in the original run, so bitwise identity was the wrong requirement. Input equality and measured shared-ell numerical consistency are the relevant controls.",
    "replacement_rule": "Require identical inputs except lensing/root, identical shared ell coordinates, absolute differences below 2e-14 and spectrum-scaled differences below 1e-3 for TT/EE/TE/phiphi; report bitwise status honestly.",
    "numerical_likelihood_results_changed": False,
    "input_sha256_updates": {NAME: sha256(REPO / NAME)},
}
PATH.write_text(json.dumps(amendment, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"amendment": str(PATH), "verify_sha256": amendment["input_sha256_updates"][NAME]}, ensure_ascii=False, indent=2))
