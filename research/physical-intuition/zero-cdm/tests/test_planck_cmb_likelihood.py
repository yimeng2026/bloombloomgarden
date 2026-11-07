import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from planck_cmb_likelihood import (
    assemble_camspec_delta,
    load_class_lensed_cl,
)


REPO = Path(__file__).resolve().parents[4]


class ClassLensedLoaderTests(unittest.TestCase):
    def write_spectrum(self, directory, text):
        path = Path(directory) / "spectrum.dat"
        path.write_text(text, encoding="utf-8")
        return path

    def test_loads_dimensionless_d_ell_as_zero_based_microkelvin_squared(self):
        with tempfile.TemporaryDirectory(dir=REPO / ".tmp") as directory:
            path = self.write_spectrum(
                directory,
                "# dimensionless total lensed [l(l+1)/2pi] C_l's\n"
                "2 1e-10 2e-14 3e-13 0 0 0 0\n"
                "3 2e-10 4e-14 6e-13 0 0 0 0\n"
                "4 3e-10 6e-14 9e-13 0 0 0 0\n",
            )
            result = load_class_lensed_cl(path, lmax=4, t_cmb=2.0)
        factor = (2.0e6) ** 2
        np.testing.assert_array_equal(result["ell"], np.arange(5))
        np.testing.assert_array_equal(result["tt"][:2], [0.0, 0.0])
        np.testing.assert_allclose(result["tt"][2:], np.array([1, 2, 3]) * 1e-10 * factor)
        np.testing.assert_allclose(result["ee"][2:], np.array([2, 4, 6]) * 1e-14 * factor)
        np.testing.assert_allclose(result["te"][2:], np.array([3, 6, 9]) * 1e-13 * factor)
        np.testing.assert_array_equal(result["pp"], np.zeros(5))

    def test_converts_class_phi_potential_to_cobaya_deflection_convention(self):
        with tempfile.TemporaryDirectory(dir=REPO / ".tmp") as directory:
            path = self.write_spectrum(
                directory,
                "2 0 0 0 0 1e-9 0 0\n3 0 0 0 0 2e-9 0 0\n4 0 0 0 0 3e-9 0 0\n",
            )
            result = load_class_lensed_cl(path, lmax=4)
        np.testing.assert_allclose(result["pp"][2:], np.array([6e-9, 24e-9, 60e-9]))

    def test_rejects_incomplete_or_nonfinite_multipoles(self):
        with tempfile.TemporaryDirectory(dir=REPO / ".tmp") as directory:
            incomplete = self.write_spectrum(directory, "2 1 2 3 0 0 0 0\n4 1 2 3 0 0 0 0\n")
            with self.assertRaisesRegex(ValueError, "contiguous"):
                load_class_lensed_cl(incomplete, lmax=4)
            nonfinite = self.write_spectrum(directory, "2 1 2 3 0 0 0 0\n3 nan 2 3 0 0 0 0\n4 1 2 3 0 0 0 0\n")
            with self.assertRaisesRegex(ValueError, "finite"):
                load_class_lensed_cl(nonfinite, lmax=4)


class CamSpecResidualTests(unittest.TestCase):
    def test_assembles_all_six_blocks_with_the_official_calibration_convention(self):
        data = np.arange(12, dtype=float) + 100
        ell_ranges = [np.array([2, 3]), np.array([4, 5]), np.array([6, 7]), np.array([8, 9]), np.array([3, 4]), np.array([5, 6])]
        sizes = np.array([2, 2, 2, 2, 2, 2])
        names = ["100x100", "143x143", "217x217", "143x217", "TE", "EE"]
        theory = {name: np.arange(20, dtype=float) + offset for name, offset in [("tt", 1), ("te", 30), ("ee", 50)]}
        foregrounds = np.ones((4, 20))
        cals = np.array([1, 1, 1, 1, 1, 1], dtype=float)
        actual = assemble_camspec_delta(data, ell_ranges, sizes, names, theory, foregrounds, cals)
        expected = data.copy()
        for index, ells in enumerate(ell_ranges):
            key = "tt" if index < 4 else names[index].lower()
            prediction = theory[key][ells] + (foregrounds[index][ells] if index < 4 else 0)
            expected[index * 2:index * 2 + 2] -= prediction
        np.testing.assert_allclose(actual, expected)
        scaled = assemble_camspec_delta(data, ell_ranges, sizes, names, theory, foregrounds, cals * 2)
        np.testing.assert_allclose(data - scaled, (data - expected) / 2)

    def test_rejects_a_block_layout_that_does_not_cover_the_data(self):
        with self.assertRaisesRegex(ValueError, "data length"):
            assemble_camspec_delta(
                np.zeros(3), [np.array([2])], np.array([1]),
                ["100x100", "TE"], {"tt": np.zeros(4), "te": np.zeros(4), "ee": np.zeros(4)},
                np.zeros((4, 4)), np.ones(6),
            )


if __name__ == "__main__":
    unittest.main()
