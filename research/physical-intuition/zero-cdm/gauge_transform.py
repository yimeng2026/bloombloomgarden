"""Explicit CLASS-compatible matter-comoving density transformation."""

import numpy as np


def class_comoving_matter_density(delta_c, delta_b, v_c, v_b, rho_c, rho_b, conformal_h, k_Mpc_inv):
    """Return CLASS's gauge-invariant matter density from synchronous CAMB variables.

    CLASS uses D_m = delta_m + 3 a H theta_m/k^2 for stable pressureless
    matter, with theta_m = k v_m and rho-weighted CDM/baryon velocities.
    conformal_h is a*H in 1/Mpc and k_Mpc_inv is k in 1/Mpc.
    """
    arrays = np.broadcast_arrays(
        np.asarray(delta_c, dtype=float),
        np.asarray(delta_b, dtype=float),
        np.asarray(v_c, dtype=float),
        np.asarray(v_b, dtype=float),
        np.asarray(rho_c, dtype=float),
        np.asarray(rho_b, dtype=float),
        np.asarray(conformal_h, dtype=float),
        np.asarray(k_Mpc_inv, dtype=float),
    )
    if not all(np.isfinite(array).all() for array in arrays):
        raise ValueError("all gauge-transformation inputs must be finite")
    delta_c, delta_b, v_c, v_b, rho_c, rho_b, conformal_h, k = arrays
    if np.any(rho_c < 0.0) or np.any(rho_b < 0.0):
        raise ValueError("component densities must be nonnegative")
    rho_m = rho_c + rho_b
    if np.any(rho_m <= 0.0):
        raise ValueError("total matter density must be positive")
    if np.any(k <= 0.0):
        raise ValueError("wavenumber must be positive")
    delta_m = (rho_c * delta_c + rho_b * delta_b) / rho_m
    v_m = (rho_c * v_c + rho_b * v_b) / rho_m
    result = delta_m + 3.0 * conformal_h * v_m / k
    return float(result) if result.ndim == 0 else result


def signed_error_summary(reference, candidate):
    """Compare signed arrays, excluding zero references only from fractional metrics."""
    reference = np.asarray(reference, dtype=float)
    candidate = np.asarray(candidate, dtype=float)
    if reference.ndim != 1 or candidate.ndim != 1 or reference.size != candidate.size or reference.size == 0:
        raise ValueError("signed comparisons require nonempty one-dimensional arrays of equal length")
    if not np.isfinite(reference).all() or not np.isfinite(candidate).all():
        raise ValueError("signed comparisons require finite values")
    difference = candidate - reference
    nonzero = reference != 0.0
    fractional = candidate[nonzero] / reference[nonzero] - 1.0
    location = None
    maximum = None
    if fractional.size:
        local_index = int(np.argmax(np.abs(fractional)))
        index = int(np.flatnonzero(nonzero)[local_index])
        maximum = float(abs(fractional[local_index]))
        location = {
            "index": index,
            "reference": float(reference[index]),
            "candidate": float(candidate[index]),
            "candidate_over_reference_minus_1": float(fractional[local_index]),
        }
    return {
        "points": int(reference.size),
        "reference_zero_points": int(np.count_nonzero(~nonzero)),
        "max_abs_difference": float(np.max(np.abs(difference))),
        "max_abs_fraction": maximum,
        "max_abs_fraction_location": location,
    }


def synchronous_baryon_velocity_from_newtonian(v_newtonian_cdm, v_newtonian_baryon, conformal_h, k_Mpc_inv):
    """Recover synchronous v_b from CAMB's two Newtonian-velocity outputs.

    CAMB defines V_Nc=-k*sigma/H and V_Nb=-k*(v_b+sigma)/H, hence
    v_b=-H*(V_Nb-V_Nc)/k. Transfer-data arrays must first be multiplied by k^2.
    """
    v_nc, v_nb, conformal_h, k = np.broadcast_arrays(
        np.asarray(v_newtonian_cdm, dtype=float),
        np.asarray(v_newtonian_baryon, dtype=float),
        np.asarray(conformal_h, dtype=float),
        np.asarray(k_Mpc_inv, dtype=float),
    )
    if not all(np.isfinite(array).all() for array in [v_nc, v_nb, conformal_h, k]):
        raise ValueError("velocity-transformation inputs must be finite")
    if np.any(k <= 0.0):
        raise ValueError("wavenumber must be positive")
    result = -conformal_h * (v_nb - v_nc) / k
    return float(result) if result.ndim == 0 else result
