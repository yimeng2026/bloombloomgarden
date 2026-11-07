"""Freeze PRIMAT BBN inputs, zero-CDM method, and observation datasets."""

import hashlib
import json
from datetime import datetime
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "bbn-protocol.json"
INPUTS = [
    "research/physical-intuition/zero-cdm/freeze_bbn.py",
    "research/physical-intuition/zero-cdm/analyze_bbn.py",
    "research/physical-intuition/zero-cdm/verify_bbn.py",
    "research/physical-intuition/zero-cdm/bbn_likelihood.py",
    "research/physical-intuition/zero-cdm/tests/test_bbn_likelihood.py",
    "research/physical-intuition/zero-cdm/camb_crosscode.py",
    ".tmp/bbn-python/primat/__init__.py",
    ".tmp/bbn-python/primat/backend.py",
    ".tmp/bbn-python/primat/config.py",
    ".tmp/bbn-python/primat/background.py",
    ".tmp/bbn-python/primat/main.py",
]


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


if PROTOCOL_PATH.exists():
    raise FileExistsError(f"Refusing to overwrite frozen protocol: {PROTOCOL_PATH}")
protocol = {
    "status": "frozen_before_primat_bbn_analysis",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "engine": "official PRIMAT 0.3.3 with C and Python backends",
    "physical_inputs": {
        "Omegabh2": 0.02218,
        "baseline_Omegach2": 0.1201075,
        "zero_Omegach2": 0.0,
        "h": 0.6766,
        "DeltaNeff": 0.0,
        "Neff_SM": 3.044,
        "T0CMB": 2.7255,
    },
    "zero_method": "Validate other parameters, then explicitly set cfg.Omegach2=0 before StandardBackground; no nonzero placeholder and no third-party source edit",
    "backend_rule": "Baseline is computed with both C and Python backends; zero uses a Python custom background because run_bbn rejects zero in its input guard",
    "observations": {
        "PDG_Aug2023": {"YPBBN": [0.2450, 0.0030], "DoH": [2.547e-05, 0.029e-05]},
        "BAO_BBN_papers": {"YPBBN": [0.2449, 0.0040], "DoH": [2.527e-05, 0.030e-05]},
        "EMPRESS_sensitivity": {"YPBBN": [0.2370, 0.0034], "DoH": [2.547e-05, 0.029e-05]},
        "rule": "independent Gaussian YPBBN and D/H residuals, no parameter fitting and no joint posterior",
    },
    "class_comparison": "Compare CLASS sBBN_2025 YHe=0.24518836574531122 only with PRIMAT YPCMB, not with the distinct YPBBN convention",
    "output_rule": "Write new BBN summary and verification artifacts without modifying earlier spectra or likelihood results.",
    "input_sha256": {name: sha256(REPO / name) for name in INPUTS},
    "boundaries": [
        "No nonzero CDM placeholder, parameter fitting, joint CMB+BBN posterior, or model-family exclusion.",
        "Dataset choices remain separate, including EMPRESS sensitivity; no favorable subset is selected.",
        "Backend parity and the CLASS/PRIMAT convention difference are reported independently.",
    ],
}
PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PROTOCOL_PATH), "inputs_hashed": len(INPUTS)}, ensure_ascii=False, indent=2))
