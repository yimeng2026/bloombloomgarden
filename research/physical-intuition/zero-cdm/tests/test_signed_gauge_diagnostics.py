import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gauge_transform import signed_error_summary


class SignedGaugeDiagnosticsTests(unittest.TestCase):
    def test_negative_reference_and_zero_reference_are_not_hidden(self):
        result = signed_error_summary([-2.0, 0.0, 4.0], [-1.0, 1.0, 2.0])
        self.assertEqual(result["points"], 3)
        self.assertEqual(result["reference_zero_points"], 1)
        self.assertEqual(result["max_abs_difference"], 2.0)
        self.assertAlmostEqual(result["max_abs_fraction"], 0.5)
        self.assertEqual(result["max_abs_fraction_location"]["index"], 0)
        self.assertAlmostEqual(
            result["max_abs_fraction_location"]["candidate_over_reference_minus_1"],
            -0.5,
        )

    def test_all_zero_reference_has_no_fractional_metric(self):
        result = signed_error_summary([0.0], [0.0])
        self.assertIsNone(result["max_abs_fraction"])
        self.assertIsNone(result["max_abs_fraction_location"])
        self.assertEqual(result["max_abs_difference"], 0.0)

    def test_rejects_nonfinite_inputs(self):
        with self.assertRaises(ValueError):
            signed_error_summary([1.0], [np.nan])


if __name__ == "__main__":
    unittest.main()
