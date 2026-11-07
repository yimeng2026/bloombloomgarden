import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gauge_transform import class_comoving_matter_density


class GaugeTransformTests(unittest.TestCase):
    def test_zero_cdm_uses_only_baryons_and_class_positive_velocity_term(self):
        actual = class_comoving_matter_density(
            delta_c=999.0,
            delta_b=2.0,
            v_c=999.0,
            v_b=0.001,
            rho_c=0.0,
            rho_b=0.02,
            conformal_h=0.0003,
            k_Mpc_inv=0.01,
        )
        self.assertAlmostEqual(actual, 2.00009, places=14)

    def test_baseline_preserves_density_and_velocity_weights(self):
        actual = class_comoving_matter_density(
            delta_c=np.array([1.0]),
            delta_b=np.array([3.0]),
            v_c=np.array([0.0]),
            v_b=np.array([0.002]),
            rho_c=0.12,
            rho_b=0.12,
            conformal_h=0.0002,
            k_Mpc_inv=0.02,
        )
        np.testing.assert_allclose(actual, [2.00003], rtol=0.0, atol=1.0e-15)

    def test_rejects_nonpositive_total_matter_and_wavenumber(self):
        with self.assertRaises(ValueError):
            class_comoving_matter_density(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.01)
        with self.assertRaises(ValueError):
            class_comoving_matter_density(0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0)


if __name__ == "__main__":
    unittest.main()
