import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gauge_transform import synchronous_baryon_velocity_from_newtonian


class NativeGaugeVelocityTests(unittest.TestCase):
    def test_recovers_synchronous_baryon_velocity_by_subtracting_metric_shear(self):
        actual = synchronous_baryon_velocity_from_newtonian(
            v_newtonian_cdm=-1.0,
            v_newtonian_baryon=-3.0,
            conformal_h=2.0,
            k_Mpc_inv=0.5,
        )
        self.assertAlmostEqual(actual, 8.0, places=14)

    def test_vectorization_and_zero_metric_difference(self):
        actual = synchronous_baryon_velocity_from_newtonian(
            [-1.0, -2.0], [-1.0, -4.0], [1.0, 2.0], [0.5, 0.25]
        )
        np.testing.assert_allclose(actual, [0.0, 16.0], rtol=0.0, atol=1.0e-14)
        with self.assertRaises(ValueError):
            synchronous_baryon_velocity_from_newtonian(-1.0, -2.0, 1.0, 0.0)


if __name__ == "__main__":
    unittest.main()
