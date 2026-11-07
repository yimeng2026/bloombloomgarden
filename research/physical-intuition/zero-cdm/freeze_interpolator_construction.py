"""Freeze the interpolator-construction experiment before running CAMB."""

import hashlib
import json
from datetime import datetime
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
CAMB_SOURCE_COMMIT = "72b5a4ca5df1335674e2eacad9b9a887194f9677"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


OUT = REPO / "research/physical-intuition/zero-cdm"
PROTOCOL_PATH = OUT / "interpolator-construction-protocol.json"
INPUTS = [
    "research/physical-intuition/zero-cdm/freeze_interpolator_construction.py",
    "research/physical-intuition/zero-cdm/camb_interpolator_construction.py",
    "research/physical-intuition/zero-cdm/analyze_interpolator_construction.py",
    "research/physical-intuition/zero-cdm/verify_interpolator_construction.py",
    "research/physical-intuition/zero-cdm/interpolator_construction.py",
    "research/physical-intuition/zero-cdm/tests/test_interpolator_construction.py",
    "research/physical-intuition/zero-cdm/camb_crosscode.py",
    "research/physical-intuition/zero-cdm/same_run_power.py",
    "research/physical-intuition/zero-cdm/pk_band_statistics.py",
    "research/physical-intuition/zero-cdm/signed_transfer_statistics.py",
    ".tmp/camb-wsl-site/camb/results.py",
    ".tmp/camb-runs/ultra/zero/spectra.npz",
    ".tmp/camb-runs/ultra/baseline/spectra.npz",
    ".tmp/camb-runs/ultra/zero/parameters.ini",
    ".tmp/camb-runs/ultra/baseline/parameters.ini",
    ".tmp/class_public/convergence/integral/zero-cdm-integral00_pk.dat",
    ".tmp/class_public/convergence/integral/baseline-lcdm-integral00_pk.dat",
]
if PROTOCOL_PATH.exists():
    raise FileExistsError(f"Refusing to overwrite frozen protocol: {PROTOCOL_PATH}")
protocol = {
    "status": "frozen_before_interpolator_construction_camb_runs",
    "frozen_at_local": datetime.now().astimezone().isoformat(),
    "purpose": "Separate direct CAMB power nodes, log versus linear cubic splines, and the old second log-linear resampling stage.",
    "camb_source_commit": CAMB_SOURCE_COMMIT,
    "models": ["zero", "baseline"],
    "level": "ultra",
    "single_result_object_per_model": True,
    "operations": {
        "direct_nodes": "get_linear_matter_power_spectrum on CAMB internal matter-transfer k nodes",
        "log_cubic": "get_matter_power_interpolator(log_interp=True), logsign recorded, cubic in ln(k)",
        "linear_cubic": "get_matter_power_interpolator(log_interp=False), cubic P in ln(k)",
        "node_reproduction": "evaluate both spline variants at the direct nodes and compare with direct node power",
        "old_second_stage": "log-log linear resampling of the old 2500-point frozen output onto aligned native k",
        "common_bands": "2603-point common log grid, raw and 0.05/0.10 dex smoothing, band integration before model ratios",
    },
    "range_rule": "No new extrapolation. Exclude native k outside direct-node or old-frozen ranges. Record old output points above the actual last CAMB node.",
    "comparison_rule": "Retain signed fractional errors and negative spline overshoot. Report median, p95, maximum and maximum location; do not suppress deep minima.",
    "output_rule": "Write new interpolator-construction artifacts; never overwrite prior spectra, transfer, or same-run evidence.",
    "input_sha256": {name: sha256(REPO / name) for name in INPUTS},
    "boundaries": [
        "Zero CDM remains exactly zero; all physical and accuracy parameters are unchanged.",
        "This is a numerical output-construction diagnostic, not an observational likelihood or model-family exclusion.",
        "No CLASS/CAMB gauge transformation is introduced by this experiment.",
        "Attribution to log interpolation requires an observed A/B improvement; otherwise sampling and spline/resampling effects remain separate possibilities.",
    ],
}
PROTOCOL_PATH.write_text(json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"protocol": str(PROTOCOL_PATH), "inputs_hashed": len(INPUTS)}, ensure_ascii=False, indent=2))
