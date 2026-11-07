"""Record the BLAS cross-check used by Cobaya for large covariance vectors."""

import hashlib
import json
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PATH = OUT / "planck-cmb-amendment-03.json"
UPDATES = [
    "research/physical-intuition/zero-cdm/verify_planck_cmb.py",
    ".tmp/cobaya-python/cobaya/functions.py",
]


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


if PATH.exists():
    raise FileExistsError(f"Refusing to overwrite amendment: {PATH}")
amendment = {
    "status": "verification_only_blas_operation_amendment",
    "amends": "planck-cmb-amendment-02.json",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "reason": "Cobaya chi_squared switches to scipy dsymv above 1500 points; match that symmetric BLAS operation for exact large-vector cross-checking and retain all amendment hashes generically.",
    "numerical_results_changed": False,
    "input_sha256_updates": {name: sha256(REPO / name) for name in UPDATES},
}
PATH.write_text(json.dumps(amendment, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"amendment": str(PATH), "updated_hashes": len(UPDATES)}, ensure_ascii=False, indent=2))
