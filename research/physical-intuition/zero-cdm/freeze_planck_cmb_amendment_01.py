"""Record the no-file Cobaya output interface fix without altering the CMB protocol."""

import hashlib
import json
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PATH = OUT / "planck-cmb-amendment-01.json"
UPDATES = [
    "research/physical-intuition/zero-cdm/analyze_planck_cmb.py",
    "research/physical-intuition/zero-cdm/verify_planck_cmb.py",
    ".tmp/cobaya-python/cobaya/output.py",
]


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


if PATH.exists():
    raise FileExistsError(f"Refusing to overwrite amendment: {PATH}")
amendment = {
    "status": "interface_only_amendment_before_any_case_result",
    "amends": "planck-cmb-protocol.json",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "reason": "Cobaya 3.6.2 Minimize requires OutputDummy rather than None for no-file operation; use official get_output() and let runner and verifier honor this amendment.",
    "numerical_or_physical_changes": False,
    "optimization_rule_changes": False,
    "input_sha256_updates": {name: sha256(REPO / name) for name in UPDATES},
}
PATH.write_text(json.dumps(amendment, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"amendment": str(PATH), "updated_hashes": len(UPDATES)}, ensure_ascii=False, indent=2))
