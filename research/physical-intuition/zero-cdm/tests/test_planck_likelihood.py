import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from planck_likelihood import corrected_bandpower, gaussian_chi_squared


class PlanckLikelihoodTests(unittest.TestCase):
    def test_correction_and_chi_squared_follow_cosmomc_order(self):
        theory = np.zeros(2501)
        theory[2] = 4.0
        windows = np.zeros((2499, 9))
        correction_windows = np.zeros((2499, 9))
        windows[0, 0] = 1.0
        correction_windows[0, 0] = 0.5
        fiducial_correction = np.zeros(9)
        fiducial_correction[0] = 1.0
        corrected = corrected_bandpower(theory, windows, correction_windows, fiducial_correction)
        self.assertEqual(corrected[0], 5.0)
        observed = np.zeros(9)
        covariance = np.eye(9)
        self.assertEqual(gaussian_chi_squared(corrected, observed, covariance), 25.0)

    def test_invalid_covariance_is_rejected(self):
        with self.assertRaises(ValueError):
            gaussian_chi_squared(np.zeros(2), np.zeros(2), np.zeros((2, 2)))


if __name__ == "__main__":
    unittest.main()
