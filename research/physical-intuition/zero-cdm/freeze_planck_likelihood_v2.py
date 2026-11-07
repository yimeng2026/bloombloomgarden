"""Freeze the PP-column reader revision before the actual likelihood run."""

import hashlib
import json
from datetime import datetime
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
ORIGINAL_PATH = OUT / "planck-likelihood-protocol.json"
AMENDMENT_PATH = OUT / "planck-likelihood-amendment-01.json"
PROTOCOL_PATH = OUT / "planck-likelihood-protocol-v2.json"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


if PROTOCOL_PATH.exists():
    raise FileExistsError(f"Refusing to overwrite frozen protocol: {PROTOCOL_PATH}")
original = json.loads(ORIGINAL_PATH.read_text(encoding="utf-8"))
inputs = dict(original["input_sha256"])
inputs["research/physical-intuition/zero-cdm/analyze_planck_likelihood_v2.py"] = sha256(
    OUT / "analyze_planck_likelihood_v2.py"
)
inputs["research/physical-intuition/zero-cdm/verify_planck_likelihood_v2.py"] = sha256(
    OUT / "verify_planck_likelihood_v2.py"
)
inputs["research/physical-intuition/zero-cdm/planck-likelihood-amendment-01.json"] = sha256(AMENDMENT_PATH)
inputs["research/physical-intuition/zero-cdm/planck-likelihood-protocol.json"] = sha256(ORIGINAL_PATH)
protocol = {
    "status": "frozen_before_planck_lensing_likelihood_pp_column_v2",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "supersedes": "planck-likelihood-protocol.json only for correction-file column reading",
    "reason": "Original run stopped before results because the correction files contain bin and PP columns; v2 selects PP explicitly.",
    "data": original["data"],
    "models": original["models"],
    "covariances": original["covariances"],
    "theory_rule": original["theory_rule"],
    "chi_squared_rule": original["chi_squared_rule"],
    "official_crosscheck": original["official_crosscheck"],
    "output_rule": original["output_rule"],
    "input_sha256": inputs,
    "boundaries": original["boundaries"],
}
PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PROTOCOL_PATH), "inputs_hashed": len(inputs)}, ensure_ascii=False, indent=2))
