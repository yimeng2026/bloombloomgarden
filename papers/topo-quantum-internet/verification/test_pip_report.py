"""p+ip 勘误报告、图、旧脚本复核和 Word 交付物验收。"""
from __future__ import annotations

import json
from pathlib import Path
import unittest
import zipfile

HERE = Path(__file__).resolve().parent
PAPERS = HERE.parent
REPORT = PAPERS / "P_IP_CHERN_CONVENTION_AUDIT.md"
DOCX = PAPERS / "P_IP_CHERN_CONVENTION_AUDIT.docx"
FIGURE = PAPERS / "figures/pip_chern_phase_diagram.png"


class PipReportTests(unittest.TestCase):
    def test_legacy_script_readonly_audit(self):
        path = HERE / "legacy_pip_chern_audit.json"
        self.assertTrue(path.is_file(), "缺少旧脚本只读复核结果")
        result = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(result["source_unchanged"], True)
        self.assertEqual(result["actual"]["mu=1"], 1)
        self.assertEqual(result["actual"]["mu=-1"], -1)
        self.assertEqual(result["docstring"]["mu=1"], -1)
        self.assertEqual(result["docstring"]["mu=-1"], 1)
        self.assertEqual(result["docstring_matches_actual"], False)

    def test_phase_figure_and_raw_sweep(self):
        self.assertTrue(FIGURE.is_file(), "缺少相图")
        self.assertGreater(FIGURE.stat().st_size, 20_000)
        result = json.loads((HERE / "pip_phase_figure_summary.json").read_text(encoding="utf-8"))
        self.assertEqual(result["lattice_sweep_points"], 241)
        self.assertEqual(result["lattice_grid"], 81)
        self.assertEqual(result["gapless_boundaries"], [-4.0, 0.0, 4.0])
        self.assertEqual(result["source_results"], "pip_chern_convention_results.json")

    def test_markdown_report_scope_and_evidence(self):
        self.assertTrue(REPORT.is_file(), "缺少 Markdown 勘误报告")
        text = REPORT.read_text(encoding="utf-8")
        for phrase in ("Read–Green", "1.7522414162307598e-05", "不覆盖 CdGM", "平企业相"):
            if phrase == "平企业相":
                self.assertNotIn(phrase, text)
            else:
                self.assertIn(phrase, text)
        self.assertIn("pip_chern_convention_results.json", text)
        self.assertIn("legacy_pip_chern_audit.json", text)

    def test_native_word_has_image_math_table_and_page_field(self):
        self.assertTrue(DOCX.is_file(), "缺少原生 Word")
        with zipfile.ZipFile(DOCX) as docx:
            names = docx.namelist()
            self.assertTrue(any(name.startswith("word/media/") for name in names))
            document = docx.read("word/document.xml").decode("utf-8")
            self.assertIn("<m:oMath", document)
            self.assertGreaterEqual(document.count("<w:tbl>"), 2)
            footer = "".join(docx.read(name).decode("utf-8") for name in names if name.startswith("word/footer"))
            self.assertIn("PAGE", footer)


def run_all_tests() -> bool:
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(PipReportTests))
    return result.wasSuccessful()


if __name__ == "__main__":
    raise SystemExit(0 if run_all_tests() else 1)
