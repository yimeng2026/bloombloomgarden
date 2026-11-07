"""Freeze the documented floating-tolerance verifier revision for k800 analysis."""

import hashlib
import json
from datetime import datetime
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
ORIGINAL_PATH = OUT / "k800-path-protocol.json"
AMENDMENT_PATH = OUT / "k800-path-verification-amendment-01.json"
VERIFIER_PATH = OUT / "verify_k800_path_v2.py"
PROTOCOL_PATH = OUT / "k800-path-protocol-v2.json"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


if PROTOCOL_PATH.exists():
    raise FileExistsError(f"Refusing to overwrite frozen protocol: {PROTOCOL_PATH}")
original = json.loads(ORIGINAL_PATH.read_text(encoding="utf-8"))
inputs = dict(original["input_sha256"])
inputs["research/physical-intuition/zero-cdm/verify_k800_path_v2.py"] = sha256(VERIFIER_PATH)
inputs["research/physical-intuition/zero-cdm/k800-path-protocol.json"] = sha256(ORIGINAL_PATH)
inputs["research/physical-intuition/zero-cdm/k800-path-verification-amendment-01.json"] = sha256(AMENDMENT_PATH)
protocol = {
    "status": "frozen_k800_analysis_with_float_tolerant_verifier_v2",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "supersedes": "k800-path-protocol.json only for verifier tolerance, not for data or analysis choices",
    "reason": "Original bitwise verification failed on 5/5878 reference power values with maximum relative difference 4.30674107e-16; original verifier and protocol are preserved.",
    "verifier": "verify_k800_path_v2.py with rtol=1e-14 and atol=0 for reconstructed power",
    "unchanged": original["included"],
    "excluded_accuracy8": original["excluded_accuracy8"],
    "analysis": original["analysis"],
    "output_rule": original["output_rule"],
    "input_sha256": inputs,
    "boundaries": original["boundaries"],
}
PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PROTOCOL_PATH), "inputs_hashed": len(inputs)}, ensure_ascii=False, indent=2))
