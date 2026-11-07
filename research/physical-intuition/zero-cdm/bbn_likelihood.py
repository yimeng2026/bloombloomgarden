"""Gaussian joint helium-4 and deuterium BBN diagnostic."""


def bbn_chi_squared(yp, doh, observed_yp, sigma_yp, observed_doh, sigma_doh):
    """Return independent Gaussian Yp and D/H residuals squared and summed."""
    for name, value in [
        ("yp", yp), ("doh", doh), ("observed_yp", observed_yp),
        ("sigma_yp", sigma_yp), ("observed_doh", observed_doh), ("sigma_doh", sigma_doh),
    ]:
        if not isinstance(value, (int, float)):
            raise TypeError(f"{name} must be numeric")
    if sigma_yp <= 0.0 or sigma_doh <= 0.0:
        raise ValueError("observational uncertainties must be positive")
    return ((yp - observed_yp) / sigma_yp) ** 2 + ((doh - observed_doh) / sigma_doh) ** 2
