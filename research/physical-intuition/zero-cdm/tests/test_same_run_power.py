import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from same_run_power import aligned_fractional_errors, error_summary


class SameRunPowerTests(unittest.TestCase):
    def test_alignment_uses_common_range_and_preserves_direction(self):
        k = np.array([0.005, 0.01, 0.02, 0.04, 0.08])
        reconstructed = np.array([9.0, 10.0, 21.0, 38.0, 100.0])
        reference = np.array([10.0, 10.0, 20.0, 40.0, 50.0])
        actual = aligned_fractional_errors(k, reconstructed, reference, 0.01, 0.04)
        np.testing.assert_allclose(actual, [0.0, 0.05, -0.05])

    def test_error_summary_reports_median_p95_and_max(self):
        actual = error_summary(np.array([0.01, -0.02, 0.04]))
        self.assertEqual(actual["points"], 3)
        self.assertAlmostEqual(actual["median_abs_fraction"], 0.02)
        self.assertAlmostEqual(actual["p95_abs_fraction"], 0.038)
        self.assertAlmostEqual(actual["max_abs_fraction"], 0.04)

    def test_alignment_rejects_nonpositive_reference_and_empty_ranges(self):
        with self.assertRaises(ValueError):
            aligned_fractional_errors([0.01, 0.02], [1.0, 2.0], [1.0, 0.0])
        with self.assertRaises(ValueError):
            aligned_fractional_errors([0.01, 0.02], [1.0, 2.0], [1.0, 2.0], 0.1, 0.2)


if __name__ == "__main__":
    unittest.main()
