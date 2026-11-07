"""Planck 2018 lensing band-power correction and Gaussian chi-squared."""

import numpy as np


N_MULTIPOLE_ROWS = 2499
N_BINS = 9


def corrected_bandpower(theory, bin_windows, correction_windows, fiducial_correction):
    """Return windowed theory plus linear correction minus its fiducial value."""
    theory = np.asarray(theory, dtype=float)
    bin_windows = np.asarray(bin_windows, dtype=float)
    correction_windows = np.asarray(correction_windows, dtype=float)
    fiducial_correction = np.asarray(fiducial_correction, dtype=float)
    if theory.shape != (N_MULTIPOLE_ROWS + 2,):
        raise ValueError("theory must contain multipoles L=0..2500")
    if bin_windows.shape != (N_MULTIPOLE_ROWS, N_BINS):
        raise ValueError("bin_windows must have shape (2499, 9)")
    if correction_windows.shape != (N_MULTIPOLE_ROWS, N_BINS):
        raise ValueError("correction_windows must have shape (2499, 9)")
    if fiducial_correction.shape != (N_BINS,):
        raise ValueError("fiducial_correction must have shape (9,)")
    for name, values in [
        ("theory", theory),
        ("bin_windows", bin_windows),
        ("correction_windows", correction_windows),
        ("fiducial_correction", fiducial_correction),
    ]:
        if not np.isfinite(values).all():
            raise ValueError(f"{name} must be finite")
    band = bin_windows.T @ theory[2:]
    correction = correction_windows.T @ theory[2:] - fiducial_correction
    return band + correction


def gaussian_chi_squared(theory_bandpower, observed_bandpower, covariance):
    """Return residual^T covariance^{-1} residual for nine band powers."""
    theory_bandpower = np.asarray(theory_bandpower, dtype=float)
    observed_bandpower = np.asarray(observed_bandpower, dtype=float)
    covariance = np.asarray(covariance, dtype=float)
    if theory_bandpower.shape != (N_BINS,) or observed_bandpower.shape != (N_BINS,):
        raise ValueError("band-power arrays must have shape (9,)")
    if covariance.shape != (N_BINS, N_BINS):
        raise ValueError("covariance must have shape (9, 9)")
    if not np.isfinite(theory_bandpower).all() or not np.isfinite(observed_bandpower).all() or not np.isfinite(covariance).all():
        raise ValueError("likelihood inputs must be finite")
    if not np.allclose(covariance, covariance.T, rtol=1.0e-10, atol=1.0e-25):
        raise ValueError("covariance must be symmetric")
    eigenvalues = np.linalg.eigvalsh(covariance)
    if np.min(eigenvalues) <= 0.0:
        raise ValueError("covariance must be positive definite")
    residual = theory_bandpower - observed_bandpower
    return float(residual @ np.linalg.solve(covariance, residual))
