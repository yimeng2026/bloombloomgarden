"""Diagnostics that retain signed overshoot when comparing interpolated power curves."""

import numpy as np

from same_run_power import error_summary


def compare_power_curves(k, reference, candidate):
    """Compare candidate/reference-1 without hiding negative spline overshoot.

    The reference spectrum must be positive. A candidate may cross zero: that is
    recorded explicitly, while logarithmic ratios use positive candidates only.
    """
    k = np.asarray(k, dtype=float)
    reference = np.asarray(reference, dtype=float)
    candidate = np.asarray(candidate, dtype=float)
    if k.ndim != 1 or reference.ndim != 1 or candidate.ndim != 1:
        raise ValueError("power curves must be one-dimensional")
    if not (k.size == reference.size == candidate.size) or k.size < 2:
        raise ValueError("power curves must have equal lengths and at least two points")
    if not np.isfinite(k).all() or not np.isfinite(reference).all() or not np.isfinite(candidate).all():
        raise ValueError("power curves must be finite")
    if np.any(k <= 0.0) or not np.all(np.diff(k) > 0.0):
        raise ValueError("k must be positive and strictly increasing")
    if np.any(reference <= 0.0):
        raise ValueError("reference power must be strictly positive")

    fractional = candidate / reference - 1.0
    maximum_index = int(np.argmax(np.abs(fractional)))
    positive = candidate > 0.0
    log_ratio = np.log(candidate[positive] / reference[positive])
    return {
        "points": int(k.size),
        "nonpositive_candidate_points": int(np.count_nonzero(~positive)),
        "fractional": error_summary(fractional),
        "max_fraction_location": {
            "k_h_per_Mpc": float(k[maximum_index]),
            "reference": float(reference[maximum_index]),
            "candidate": float(candidate[maximum_index]),
            "candidate_over_reference_minus_1": float(fractional[maximum_index]),
        },
        "positive_candidate_log_ratio": error_summary(log_ratio) if log_ratio.size else None,
    }
