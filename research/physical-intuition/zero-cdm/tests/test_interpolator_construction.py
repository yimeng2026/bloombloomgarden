import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from interpolator_construction import compare_power_curves


class InterpolatorConstructionTests(unittest.TestCase):
    def test_comparison_preserves_deep_valley_outliers_and_negative_overshoot(self):
        result = compare_power_curves(
            [0.1, 0.2, 0.4],
            [100.0, 1.0, 10.0],
            [101.0, 2.0, -1.0],
        )
        self.assertEqual(result["points"], 3)
        self.assertEqual(result["nonpositive_candidate_points"], 1)
        self.assertEqual(result["fractional"]["median_abs_fraction"], 1.0)
        self.assertAlmostEqual(result["fractional"]["max_abs_fraction"], 1.1)
        self.assertEqual(result["max_fraction_location"]["k_h_per_Mpc"], 0.4)
        self.assertEqual(result["max_fraction_location"]["candidate"], -1.0)
        self.assertEqual(result["positive_candidate_log_ratio"]["points"], 2)
        self.assertAlmostEqual(
            result["positive_candidate_log_ratio"]["max_abs_fraction"],
            np.log(2.0),
        )

    def test_comparison_rejects_nonpositive_reference_and_invalid_k(self):
        with self.assertRaises(ValueError):
            compare_power_curves([0.1, 0.2], [1.0, 0.0], [1.0, 1.0])
        with self.assertRaises(ValueError):
            compare_power_curves([0.2, 0.1], [1.0, 1.0], [1.0, 1.0])
        with self.assertRaises(ValueError):
            compare_power_curves([0.1, 0.2], [1.0, 1.0], [1.0, np.nan])


if __name__ == "__main__":
    unittest.main()
