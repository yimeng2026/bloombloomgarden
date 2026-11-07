"""Signed transfer interpolation, zero crossings, and power normalization."""

import numpy as np


def _validated_transfer(k, values):
    k = np.asarray(k, dtype=float)
    values = np.asarray(values, dtype=float)
    if k.ndim != 1 or values.ndim != 1 or k.size != values.size or k.size < 2:
        raise ValueError("k and values must be one-dimensional arrays of equal length")
    if not np.isfinite(k).all() or not np.isfinite(values).all():
        raise ValueError("k and values must be finite")
    if np.any(k <= 0.0) or not np.all(np.diff(k) > 0.0):
        raise ValueError("k must be positive and strictly increasing")
    return k, values


def resample_signed(k, values, log10_k_grid):
    """Interpolate signed values linearly in log(k), without log-abs or extrapolation."""
    k, values = _validated_transfer(k, values)
    grid = np.asarray(log10_k_grid, dtype=float)
    if grid.ndim != 1 or grid.size < 2 or not np.isfinite(grid).all():
        raise ValueError("log10_k_grid must be a finite one-dimensional array")
    if not np.all(np.diff(grid) > 0.0):
        raise ValueError("log10_k_grid must be strictly increasing")
    source = np.log10(k)
    if grid[0] < source[0] or grid[-1] > source[-1]:
        raise ValueError("signed interpolation outside the common range is not allowed")
    return np.interp(grid, source, values)


def signed_zero_crossings(k, values):
    """Return sign-change positions linearly interpolated in log(k).

    These are phase diagnostics only; no unwrapped or Hilbert phase is inferred.
    """
    k, values = _validated_transfer(k, values)
    log_k = np.log(k)
    crossings = []
    for index in range(k.size - 1):
        first = values[index]
        second = values[index + 1]
        if first == 0.0:
            crossings.append(float(k[index]))
        if first * second < 0.0:
            fraction = -first / (second - first)
            crossings.append(float(np.exp(log_k[index] + fraction * (log_k[index + 1] - log_k[index]))))
    if values[-1] == 0.0:
        crossings.append(float(k[-1]))
    return np.asarray(crossings, dtype=float)


def power_from_transfer(k_Mpc_inv, transfer, amplitude, tilt, pivot_Mpc_inv, h):
    """Return k in h/Mpc and P in (Mpc/h)^3 for unit-curvature transfers.

    The formula follows the adiabatic CLASS relation
    P(k) = 2 pi^2 A_s (k/k_pivot)^(n_s-1) T(k)^2 / k^3.
    """
    k, transfer = _validated_transfer(k_Mpc_inv, transfer)
    amplitude = float(amplitude)
    tilt = float(tilt)
    pivot = float(pivot_Mpc_inv)
    h = float(h)
    if not np.isfinite([amplitude, tilt, pivot, h]).all():
        raise ValueError("primordial and unit parameters must be finite")
    if amplitude <= 0.0 or pivot <= 0.0 or h <= 0.0:
        raise ValueError("amplitude, pivot, and h must be positive")
    primordial = amplitude * (k / pivot) ** (tilt - 1.0)
    power_Mpc3 = 2.0 * np.pi**2 * primordial * transfer**2 / k**3
    return k / h, h**3 * power_Mpc3


def directed_nearest_log_distances(reference, candidates):
    """Return each reference point's nearest candidate distance in natural log(k)."""
    reference = np.asarray(reference, dtype=float)
    candidates = np.asarray(candidates, dtype=float)
    if reference.ndim != 1 or candidates.ndim != 1:
        raise ValueError("crossing arrays must be one-dimensional")
    if not np.isfinite(reference).all() or not np.isfinite(candidates).all():
        raise ValueError("crossing arrays must be finite")
    if np.any(reference <= 0.0) or np.any(candidates <= 0.0):
        raise ValueError("crossing positions must be positive")
    if reference.size == 0 or candidates.size == 0:
        return np.asarray([], dtype=float)
    return np.min(
        np.abs(np.log(reference)[:, None] - np.log(candidates)[None, :]),
        axis=1,
    )
