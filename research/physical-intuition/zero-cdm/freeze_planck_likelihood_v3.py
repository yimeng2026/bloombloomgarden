"""Freeze the valid CMB-marginalized lensing-only analysis and cross-check."""

import hashlib
import json
from datetime import datetime
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
ORIGINAL_PATH = OUT / "planck-likelihood-protocol-v2.json"
AMENDMENT_PATH = OUT / "planck-likelihood-amendment-02.json"
PROTOCOL_PATH = OUT / "planck-likelihood-protocol-v3.json"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


if PROTOCOL_PATH.exists():
    raise FileExistsError(f"Refusing to overwrite frozen protocol: {PROTOCOL_PATH}")
original = json.loads(ORIGINAL_PATH.read_text(encoding="utf-8"))
inputs = dict(original["input_sha256"])
inputs["research/physical-intuition/zero-cdm/analyze_planck_likelihood_v3.py"] = sha256(
    OUT / "analyze_planck_likelihood_v3.py"
)
inputs["research/physical-intuition/zero-cdm/verify_planck_likelihood_v3.py"] = sha256(
    OUT / "verify_planck_likelihood_v3.py"
)
inputs["research/physical-intuition/zero-cdm/planck-likelihood-amendment-02.json"] = sha256(AMENDMENT_PATH)
inputs["research/physical-intuition/zero-cdm/planck-likelihood-protocol-v2.json"] = sha256(ORIGINAL_PATH)
protocol = {
    "status": "frozen_before_valid_cmb_marginalized_lensing_analysis",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "supersedes": "planck-likelihood-protocol-v2.json by excluding PP-incomplete non-marginalized analysis and adding the required commented theory header",
    "data": original["data"],
    "models": original["models"],
    "covariances": ["cmb_marginalized"],
    "theory_rule": original["theory_rule"] + "; write '# L PP' as the theory header",
    "chi_squared_rule": original["chi_squared_rule"],
    "official_crosscheck": original["official_crosscheck"],
    "output_rule": "Write separate CMB-marginalized theory and summary artifacts; do not treat earlier PP-incomplete non-marginalized output as valid.",
    "input_sha256": inputs,
    "boundaries": original["boundaries"],
}
PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PROTOCOL_PATH), "inputs_hashed": len(inputs)}, ensure_ascii=False, indent=2))
