"""p+ip 双模型约定与双数值方法的固定预期测试。"""
from __future__ import annotations

import unittest


def load_module():
    try:
        import pip_chern_convention
    except ModuleNotFoundError as exc:
        raise AssertionError("双方法计算器尚未实现：pip_chern_convention.py") from exc
    return pip_chern_convention


class PipChernConventionTests(unittest.TestCase):
    def test_bdg_matrix_matches_pairing_convention(self):
        module = load_module()
        h = module.bdg(0.37, -0.21, 1.0, 1.0, 0.5)
        self.assertAlmostEqual(h[0, 0].real, -1.0 - 2.0 * (float(__import__("numpy").cos(0.37)) + float(__import__("numpy").cos(-0.21))))
        self.assertAlmostEqual(h[0, 1].real, 0.5 * float(__import__("numpy").sin(0.37)))
        self.assertAlmostEqual(h[0, 1].imag, 0.5 * float(__import__("numpy").sin(-0.21)))
        self.assertAlmostEqual(h[1, 0], h[0, 1].conjugate())
        self.assertAlmostEqual(h[1, 1], -h[0, 0])

    def test_lattice_degree_and_fhs_agree_in_each_phase(self):
        module = load_module()
        # 与 Read–Green 向量积分及占据带符号链推导一致，非由输出回填。
        expected = {-5.0: 0, -1.0: 1, 1.0: -1, 5.0: 0}
        for mu, wanted in expected.items():
            for grid in (41, 81, 161):
                with self.subTest(mu=mu, grid=grid, method="degree"):
                    self.assertAlmostEqual(module.lattice_degree(mu, 1.0, 0.5, grid), wanted, delta=0.03)
                with self.subTest(mu=mu, grid=grid, method="fhs"):
                    self.assertAlmostEqual(module.fhs_chern(mu, 1.0, 0.5, grid), wanted, delta=0.03)

    def test_continuum_weak_and_strong_pairing(self):
        module = load_module()
        self.assertAlmostEqual(module.continuum_degree(1.0), 1.0, delta=1e-6)
        self.assertAlmostEqual(module.continuum_degree(-1.0), 0.0, delta=1e-6)

    def test_overall_pairing_phase_does_not_reverse_lattice_sign(self):
        module = load_module()
        self.assertAlmostEqual(module.lattice_degree(1.0, 1.0, -0.5, 81), -1.0, delta=0.03)
        self.assertAlmostEqual(module.fhs_chern(1.0, 1.0, -0.5, 81), -1.0, delta=0.03)

    def test_complex_conjugation_reverses_lattice_sign(self):
        module = load_module()
        try:
            degree = module.lattice_degree(1.0, 1.0, 0.5, 81, chirality=-1)
            fhs = module.fhs_chern(1.0, 1.0, 0.5, 81, chirality=-1)
        except TypeError as exc:
            self.fail(f"手性反转参数尚未实现：{exc}")
        self.assertAlmostEqual(degree, 1.0, delta=0.03)
        self.assertAlmostEqual(fhs, 1.0, delta=0.03)

    def test_gapless_point_is_rejected(self):
        module = load_module()
        with self.assertRaises(ValueError):
            module.fhs_chern(0.0, 1.0, 0.5, 41)
        with self.assertRaises(ValueError):
            module.lattice_degree(4.0, 1.0, 0.5, 41)

    def test_raw_result_schema_and_convergence(self):
        module = load_module()
        result = module.compute_results(grids=(41, 81, 161))
        self.assertEqual(result["schema"], "pip-chern-convention-v1")
        self.assertEqual(result["convention"]["e_vector"], "(Re Delta, -Im Delta, epsilon)")
        self.assertEqual(len(result["lattice"]), 12)
        self.assertTrue(all(row["absolute_method_difference"] < 0.03 for row in result["lattice"]))
        self.assertEqual(set(result["continuum"]), {"mu=1", "mu=-1"})
        self.assertAlmostEqual(result["continuum"]["mu=1"], 1.0, delta=1e-6)
        self.assertAlmostEqual(result["continuum"]["mu=-1"], 0.0, delta=1e-6)


def run_all_tests() -> bool:
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(PipChernConventionTests)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    return result.wasSuccessful()


if __name__ == "__main__":
    raise SystemExit(0 if run_all_tests() else 1)
