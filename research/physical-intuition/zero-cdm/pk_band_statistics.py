"""Deterministic log-spectrum smoothing and dimensionless band-power statistics."""

import numpy as np


def _validated_spectrum(k, power):
    k = np.asarray(k, dtype=float)
    power = np.asarray(power, dtype=float)
    if k.ndim != 1 or power.ndim != 1 or k.size != power.size or k.size < 2:
        raise ValueError("k and power must be nonempty one-dimensional arrays of equal length")
    if not np.isfinite(k).all() or not np.isfinite(power).all():
        raise ValueError("k and power must be finite")
    if np.any(k <= 0.0) or np.any(power <= 0.0):
        raise ValueError("log-spectrum statistics require strictly positive k and power")
    if not np.all(np.diff(k) > 0.0):
        raise ValueError("k must be strictly increasing")
    return k, power


def signed_log_ratio(numerator, denominator):
    """Return the signed natural-log ratio, not an unsigned percentage discrepancy."""
    numerator = float(numerator)
    denominator = float(denominator)
    if not np.isfinite(numerator) or not np.isfinite(denominator):
        raise ValueError("ratio inputs must be finite")
    if numerator <= 0.0 or denominator <= 0.0:
        raise ValueError("ratio inputs must be positive")
    return float(np.log(numerator / denominator))


def resample_log_spectrum(k, power, log10_k_grid):
    """Linearly interpolate log(P) on a prescribed log10(k) grid, without extrapolation."""
    k, power = _validated_spectrum(k, power)
    grid = np.asarray(log10_k_grid, dtype=float)
    if grid.ndim != 1 or grid.size < 2 or not np.isfinite(grid).all():
        raise ValueError("log10_k_grid must be a finite one-dimensional array")
    if not np.all(np.diff(grid) > 0.0):
        raise ValueError("log10_k_grid must be strictly increasing")
    source = np.log10(k)
    if grid[0] < source[0] or grid[-1] > source[-1]:
        raise ValueError("resampling outside the common input range is not allowed")
    return np.interp(grid, source, np.log(power))


def gaussian_smooth_log10_spectrum(log10_k, log_power, sigma_dex, truncate=3.0):
    """Gaussian-smooth log(P), renormalizing truncated weights at the grid edges."""
    x = np.asarray(log10_k, dtype=float)
    values = np.asarray(log_power, dtype=float)
    if x.ndim != 1 or values.ndim != 1 or x.size != values.size or x.size < 2:
        raise ValueError("log10_k and log_power must be one-dimensional arrays of equal length")
    if not np.isfinite(x).all() or not np.isfinite(values).all():
        raise ValueError("smoothing inputs must be finite")
    differences = np.diff(x)
    if np.any(differences <= 0.0):
        raise ValueError("log10_k must be strictly increasing")
    step = float(differences[0])
    if not np.allclose(differences, step, rtol=1.0e-8, atol=1.0e-12):
        raise ValueError("gaussian smoothing requires a uniform log10(k) grid")
    sigma_dex = float(sigma_dex)
    truncate = float(truncate)
    if not np.isfinite(sigma_dex) or sigma_dex <= 0.0:
        raise ValueError("sigma_dex must be positive")
    if not np.isfinite(truncate) or truncate <= 0.0:
        raise ValueError("truncate must be positive")
    sigma_steps = sigma_dex / step
    radius = int(np.ceil(truncate * sigma_steps))
    offsets = np.arange(-radius, radius + 1, dtype=float)
    kernel = np.exp(-0.5 * (offsets / sigma_steps) ** 2)
    kernel /= kernel.sum()
    numerator = np.convolve(values, kernel, mode="same")
    denominator = np.convolve(np.ones_like(values), kernel, mode="same")
    return numerator / denominator


def log_bandpower(k, power, lower_k, upper_k):
    """Return the arithmetic mean of k^3 P(k)/(2 pi^2) over a natural-log k band.

    This is a fixed log-band diagnostic, not a survey windowed band power or a
    top-hat variance. Integration precedes every model-to-model ratio.
    """
    k, power = _validated_spectrum(k, power)
    lower_k = float(lower_k)
    upper_k = float(upper_k)
    if not np.isfinite(lower_k) or not np.isfinite(upper_k) or not 0.0 < lower_k < upper_k:
        raise ValueError("band edges must be finite and satisfy 0 < lower_k < upper_k")
    if lower_k < k[0] or upper_k > k[-1]:
        raise ValueError("band edges must be inside the spectrum range")
    interior = (k > lower_k) & (k < upper_k)
    band_k = np.concatenate(([lower_k], k[interior], [upper_k]))
    band_log_power = np.interp(np.log(band_k), np.log(k), np.log(power))
    dimensionless = band_k**3 * np.exp(band_log_power) / (2.0 * np.pi**2)
    log_k = np.log(band_k)
    return float(np.trapezoid(dimensionless, log_k) / (log_k[-1] - log_k[0]))
