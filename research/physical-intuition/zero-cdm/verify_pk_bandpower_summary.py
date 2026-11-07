"""Verify frozen hashes and internal identities; print concise registered diagnostics."""

import hashlib
import json
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent
PROTOCOL_PATH = OUT / "pk-bandpower-protocol.json"
SUMMARY_PATH = OUT / "pk-bandpower-summary.json"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def require_close(actual, expected, label):
    if not math.isclose(actual, expected, rel_tol=1.0e-12, abs_tol=1.0e-14):
        raise ValueError(f"{label}: {actual} != {expected}")


def main():
    protocol = json.loads(PROTOCOL_PATH.read_text(encoding="utf-8"))
    summary = json.loads(SUMMARY_PATH.read_text(encoding="utf-8"))
    if summary["protocol_sha256"] != sha256(PROTOCOL_PATH):
        raise ValueError("summary protocol hash does not match")
    for source in protocol["sources"].values():
        for model in ["zero", "baseline"]:
            record = source[model]
            path = OUT.parents[2] / record["path"]
            if sha256(path) != record["sha256"]:
                raise ValueError(f"source hash does not match: {record['path']}")
    for band in summary["band_statistics"]:
        for source in band["sources"].values():
            for values in source.values():
                ratio = values["zero_bandpower"] / values["baseline_bandpower"]
                require_close(values["zero_over_baseline"], ratio, "band ratio")
                require_close(
                    values["signed_ln_zero_over_baseline"],
                    math.log(ratio),
                    "signed model log ratio",
                )
        for comparison, (first, second) in protocol["comparisons"].items():
            for method, values in band["comparisons"][comparison].items():
                first_ratio = band["sources"][first][method]["zero_over_baseline"]
                second_ratio = band["sources"][second][method]["zero_over_baseline"]
                require_close(
                    values["signed_ln_ratio_difference"],
                    math.log(first_ratio / second_ratio),
                    "signed comparison log ratio",
                )
    table = []
    for band in summary["band_statistics"]:
        smooth = {
            name: band["sources"][name]["smooth_0.05dex"]["zero_over_baseline"]
            for name in ["class_integral", "class_recfast", "camb_ultra"]
        }
        table.append({
            "band": [band["lower_k_h_per_Mpc"], band["upper_k_h_per_Mpc"]],
            **smooth,
            "ln_camb_ultra_over_class_integral_smooth": band["comparisons"][
                "camb_ultra_over_class_integral"
            ]["smooth_0.05dex"]["signed_ln_ratio_difference"],
            "ln_camb_ultra_over_class_integral_raw": band["comparisons"][
                "camb_ultra_over_class_integral"
            ]["raw"]["signed_ln_ratio_difference"],
        })
    low_maxima = {}
    for comparison in protocol["comparisons"]:
        low_maxima[comparison] = {}
        for method in ["raw", "smooth_0.05dex", "smooth_0.10dex"]:
            candidates = []
            for band in summary["band_statistics"]:
                if band["upper_k_h_per_Mpc"] > 0.16:
                    continue
                signed = band["comparisons"][comparison][method]["signed_ln_ratio_difference"]
                candidates.append((abs(signed), signed, band["lower_k_h_per_Mpc"], band["upper_k_h_per_Mpc"]))
            largest = max(candidates)
            low_maxima[comparison][method] = {
                "signed_ln_difference_at_largest_absolute_low_band": largest[1],
                "equivalent_ratio_minus_1": math.expm1(largest[1]),
                "band": [largest[2], largest[3]],
            }
    print(json.dumps({
        "verification": "passed",
        "checked_band_count": len(summary["band_statistics"]),
        "checked_source_count": len(protocol["sources"]),
        "band_table": table,
        "low_band_maxima": low_maxima,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
