import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pk_band_statistics import (
    gaussian_smooth_log10_spectrum,
    log_bandpower,
    resample_log_spectrum,
    signed_log_ratio,
)


class PkBandStatisticsTests(unittest.TestCase):
    def test_signed_log_ratio_preserves_direction(self):
        self.assertAlmostEqual(signed_log_ratio(2.0, 1.0), np.log(2.0))
        self.assertAlmostEqual(signed_log_ratio(1.0, 2.0), -np.log(2.0))

    def test_log_bandpower_recovers_constant_dimensionless_power(self):
        k = np.logspace(-1.0, 0.0, 2001)
        power = k ** -3
        actual = log_bandpower(k, power, 0.1, 1.0)
        self.assertAlmostEqual(actual, 1.0 / (2.0 * np.pi**2), places=14)

    def test_log_bandpower_interpolates_exact_band_edges(self):
        k = np.logspace(-1.0, 0.0, 9)
        power = np.ones_like(k)
        actual = log_bandpower(k, power, 0.2, 0.7)
        expected_k = np.concatenate(([0.2], k[(k > 0.2) & (k < 0.7)], [0.7]))
        expected_power = expected_k**3 / (2.0 * np.pi**2)
        expected_log_k = np.log(expected_k)
        expected = np.trapezoid(expected_power, expected_log_k) / np.log(0.7 / 0.2)
        self.assertAlmostEqual(actual, expected, places=14)

    def test_bandpower_ratio_integrates_before_dividing(self):
        k = np.logspace(-1.0, 0.0, 1001)
        zero = 2.0 * k ** -3
        baseline = k ** -3
        zero_band = log_bandpower(k, zero, 0.1, 1.0)
        baseline_band = log_bandpower(k, baseline, 0.1, 1.0)
        self.assertAlmostEqual(zero_band / baseline_band, 2.0, places=14)

    def test_gaussian_smoothing_preserves_constant_and_linear_log_spectra(self):
        log10_k = np.linspace(-2.0, 0.0, 401)
        constant = np.full(log10_k.shape, 3.0)
        linear = 1.5 * log10_k - 0.25
        np.testing.assert_allclose(
            gaussian_smooth_log10_spectrum(log10_k, constant, 0.05),
            constant,
            atol=1.0e-13,
        )
        interior = slice(100, -100)
        np.testing.assert_allclose(
            gaussian_smooth_log10_spectrum(log10_k, linear, 0.05)[interior],
            linear[interior],
            atol=1.0e-12,
        )

    def test_resampling_rejects_extrapolation_and_nonpositive_power(self):
        k = np.logspace(-2.0, 0.0, 100)
        power = k ** -2
        grid = np.linspace(-1.0, -0.5, 10)
        actual = resample_log_spectrum(k, power, grid)
        expected = np.interp(grid, np.log10(k), np.log(power))
        np.testing.assert_allclose(actual, expected)
        with self.assertRaises(ValueError):
            resample_log_spectrum(k, power, np.array([-3.0]))
        with self.assertRaises(ValueError):
            resample_log_spectrum(k, np.zeros_like(power), grid)


if __name__ == "__main__":
    unittest.main()
