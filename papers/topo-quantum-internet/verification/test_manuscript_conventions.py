"""三篇 p+ip 相关稿件的定点约定测试。"""
from __future__ import annotations

import json
from pathlib import Path
import unittest

HERE = Path(__file__).resolve().parent
PAPERS = HERE.parent
FIRST = PAPERS / "Kitaev链与p_ip拓扑超导体_Majorana零能模数值研究.md"
SECOND = PAPERS / "拓扑超导马约拉纳零能模_能谱分析与拓扑保护_投稿物理学报.md"
THIRD = PAPERS / "拓扑量子物态与量子计算研究综述_投稿物理学报.md"


class ManuscriptConventionTests(unittest.TestCase):
    def test_first_lattice_phase_and_vector(self):
        text = FIRST.read_text(encoding="utf-8")
        self.assertNotIn("Ch = -sgn(μ)", text)
        self.assertNotIn("μ < 0（强配对相）时，Ch = 0", text)
        self.assertIn(r"E=(\operatorname{Re}\Delta_k, -\operatorname{Im}\Delta_k, \epsilon_k)", text)
        self.assertIn(r"0<\mu<4t", text)
        self.assertIn(r"-4t<\mu<0", text)
        self.assertIn("pip_chern_convention_results.json", text)

    def test_second_separates_models_and_removes_delta_boundary(self):
        text = SECOND.read_text(encoding="utf-8")
        self.assertNotIn("首次给出Kitaev链", text)
        self.assertNotIn(r"\mu^2 < 4(t^2 + \Delta^2)", text)
        self.assertNotIn(r"200 \times 200", text)
        self.assertIn("连续模型", text)
        self.assertIn("晶格模型", text)
        self.assertIn(r"C_{\mathrm{BdG}}=+1", text)
        self.assertIn("pip_chern_convention_results.json", text)

    def test_third_uses_same_vector_and_links_evidence(self):
        text = THIRD.read_text(encoding="utf-8")
        self.assertIn(r"E=(\operatorname{Re}\Delta, -\operatorname{Im}\Delta, \epsilon)", text)
        self.assertIn("晶格模型", text)
        self.assertIn("pip_chern_convention_results.json", text)

    def test_manuscripts_use_passed_raw_results(self):
        result = json.loads((HERE / "pip_chern_convention_results.json").read_text(encoding="utf-8"))
        self.assertEqual(result["validation"]["status"], "pass")
        self.assertLess(result["validation"]["maximum_absolute_method_difference"], 0.03)
        self.assertEqual(result["convention"]["berry_connection"], "A=+i<u|partial_k u>")
        for paper in (FIRST, SECOND, THIRD):
            self.assertIn("pip_chern_convention_results.json", paper.read_text(encoding="utf-8"))


def run_all_tests() -> bool:
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(ManuscriptConventionTests))
    return result.wasSuccessful()


if __name__ == "__main__":
    raise SystemExit(0 if run_all_tests() else 1)
