import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from bbn_likelihood import bbn_chi_squared


class BBNLikelihoodTests(unittest.TestCase):
    def test_joint_helium_deuterium_chi_squared(self):
        yp = 0.24689522074576278
        dh = 2.479241848408842e-05
        expected = ((yp - 0.2450) / 0.0030) ** 2 + ((dh - 2.547e-05) / 0.029e-05) ** 2
        self.assertAlmostEqual(bbn_chi_squared(yp, dh, 0.2450, 0.0030, 2.547e-05, 0.029e-05), expected, places=10)

    def test_rejects_nonpositive_uncertainty(self):
        with self.assertRaises(ValueError):
            bbn_chi_squared(0.245, 2.5e-05, 0.245, 0.0, 2.5e-05, 0.001)


if __name__ == "__main__":
    unittest.main()
