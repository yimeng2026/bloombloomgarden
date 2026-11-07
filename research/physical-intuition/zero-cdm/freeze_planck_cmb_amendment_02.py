"""Record operation-order matching in the independent CamSpec verification."""

import hashlib
import json
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PATH = OUT / "planck-cmb-amendment-02.json"
NAME = "research/physical-intuition/zero-cdm/verify_planck_cmb.py"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


if PATH.exists():
    raise FileExistsError(f"Refusing to overwrite amendment: {PATH}")
amendment = {
    "status": "verification_only_amendment_after_fixed_5sigma_results",
    "amends": "planck-cmb-protocol.json and planck-cmb-amendment-01.json",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "reason": "Independently assembled residuals are unchanged; use the official covinv.dot(delta).dot(delta) operation order so the extreme zero-model chi2 is not sensitive to float32 matrix multiplication ordering.",
    "numerical_results_changed": False,
    "input_sha256_updates": {NAME: sha256(REPO / NAME)},
}
PATH.write_text(json.dumps(amendment, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"amendment": str(PATH), "verify_sha256": amendment["input_sha256_updates"][NAME]}, ensure_ascii=False, indent=2))
