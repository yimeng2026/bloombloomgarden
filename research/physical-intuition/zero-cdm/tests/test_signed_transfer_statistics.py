import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from signed_transfer_statistics import (
    power_from_transfer,
    resample_signed,
    signed_zero_crossings,
)


class SignedTransferStatisticsTests(unittest.TestCase):
    def test_signed_resampling_preserves_values_and_rejects_extrapolation(self):
        k = np.array([0.1, 1.0, 10.0])
        values = np.array([1.0, -1.0, 3.0])
        grid = np.log10(np.array([0.1, 1.0, 10.0]))
        np.testing.assert_allclose(resample_signed(k, values, grid), values)
        with self.assertRaises(ValueError):
            resample_signed(k, values, np.array([-2.0, 0.0]))

    def test_zero_crossings_are_linear_in_log_k(self):
        k = np.array([0.1, 1.0, 10.0])
        values = np.array([1.0, -1.0, 1.0])
        np.testing.assert_allclose(
            signed_zero_crossings(k, values),
            [np.sqrt(0.1), np.sqrt(10.0)],
        )

    def test_exact_zero_is_counted_once(self):
        k = np.array([0.1, 1.0, 10.0])
        values = np.array([1.0, 0.0, -1.0])
        np.testing.assert_allclose(signed_zero_crossings(k, values), [1.0])

    def test_power_reconstruction_includes_primordial_tilt_and_h_units(self):
        k = np.array([0.1, 0.2])
        transfer = np.array([2.0, -3.0])
        h = 0.6766
        amplitude = 2.1e-9
        tilt = 0.9665
        pivot = 0.05
        k_h, power_h = power_from_transfer(k, transfer, amplitude, tilt, pivot, h)
        expected = h**3 * 2.0 * np.pi**2 * amplitude * (k / pivot) ** (tilt - 1.0) * transfer**2 / k**3
        np.testing.assert_allclose(k_h, k / h)
        np.testing.assert_allclose(power_h, expected)

    def test_directed_nearest_log_distances_preserve_direction_and_empty_sets(self):
        from signed_transfer_statistics import directed_nearest_log_distances

        actual = directed_nearest_log_distances([0.1, 0.2], [0.11, 0.19, 1.0])
        np.testing.assert_allclose(actual, [abs(np.log(0.1 / 0.11)), abs(np.log(0.2 / 0.19))])
        self.assertEqual(directed_nearest_log_distances([], [0.1]).size, 0)
        self.assertEqual(directed_nearest_log_distances([0.1], []).size, 0)


if __name__ == "__main__":
    unittest.main()
