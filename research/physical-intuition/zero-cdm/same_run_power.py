"""Aligned fractional-error diagnostics for same-run and frozen power spectra."""

import numpy as np


def aligned_fractional_errors(k, reconstructed, reference, minimum_k=None, maximum_k=None):
    """Return reconstructed/reference-1 on the aligned, valid common k range."""
    k = np.asarray(k, dtype=float)
    reconstructed = np.asarray(reconstructed, dtype=float)
    reference = np.asarray(reference, dtype=float)
    if k.ndim != 1 or reconstructed.ndim != 1 or reference.ndim != 1:
        raise ValueError("power arrays must be one-dimensional")
    if not (k.size == reconstructed.size == reference.size) or k.size < 2:
        raise ValueError("power arrays must have equal lengths and at least two points")
    if not np.isfinite(k).all() or not np.isfinite(reconstructed).all() or not np.isfinite(reference).all():
        raise ValueError("power arrays must be finite")
    if np.any(k <= 0.0) or not np.all(np.diff(k) > 0.0):
        raise ValueError("k must be positive and strictly increasing")
    if np.any(reconstructed < 0.0) or np.any(reference <= 0.0):
        raise ValueError("reference power must be positive and reconstructed power nonnegative")
    selected = np.ones(k.size, dtype=bool)
    if minimum_k is not None:
        selected &= k >= float(minimum_k)
    if maximum_k is not None:
        selected &= k <= float(maximum_k)
    if not np.any(selected):
        raise ValueError("no aligned points remain in the requested k range")
    return reconstructed[selected] / reference[selected] - 1.0


def error_summary(fractional_errors):
    """Summarize absolute fractional errors without hiding deep-minimum outliers."""
    fractional_errors = np.asarray(fractional_errors, dtype=float)
    if fractional_errors.ndim != 1 or fractional_errors.size == 0:
        raise ValueError("fractional_errors must be a nonempty one-dimensional array")
    if not np.isfinite(fractional_errors).all():
        raise ValueError("fractional_errors must be finite")
    absolute = np.abs(fractional_errors)
    return {
        "points": int(absolute.size),
        "median_abs_fraction": float(np.median(absolute)),
        "p95_abs_fraction": float(np.percentile(absolute, 95)),
        "max_abs_fraction": float(np.max(absolute)),
    }
