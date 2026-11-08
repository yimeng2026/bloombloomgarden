"""Regression tests for the narrow First Chern invariance patch generator."""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "prepare_first_chern_invariance_patch.py"


class FirstChernInvariancePatchTest(unittest.TestCase):
    def test_replaces_vacuous_theorem_and_emits_combined_patch(self):
        with tempfile.TemporaryDirectory(dir=ROOT / ".tmp") as temporary:
            work = Path(temporary)
            original = work / "original.lean"
            structured = work / "structured.lean"
            proof = work / "proof.lean"
            patched = work / "patched.lean"
            patch = work / "invariance.patch"
            placeholder = """/-- **First Chern Number Topological Invariance (Gap-Preserving Deformation).** -/
theorem FirstChernNumber_TopologicalInvariance
    (L : BlochTheorem.Lattice2D) (C : FirstChernNumber L) :
    True := by trivial
"""
            original.write_text("namespace BerryCurvature\n" + placeholder + "end BerryCurvature\n", encoding="utf-8")
            structured.write_text(
                "namespace BerryCurvature\nstructure FirstChernNumber (L : BlochTheorem.Lattice2D) where\n  value : ℤ\n"
                + placeholder
                + "end BerryCurvature\n",
                encoding="utf-8",
            )
            proof.write_text(
                """/-- **定理**：连续整数值陈数模型族在区间两端具有相同的整数值。 -/
theorem FirstChernNumber_TopologicalInvariance_model
    (C : ℝ → FirstChernNumberModel (L := L))
    (hval : Continuous (fun t : ℝ => (C t).value)) :
    (C 0).value = (C 1).value := by
  have hloc : IsLocallyConstant (fun t : ℝ => (C t).value) :=
    (IsLocallyConstant.iff_continuous _).2 hval
  exact hloc.apply_eq_of_isPreconnected (s := Set.Icc (0 : ℝ) 1) isPreconnected_Icc
    (by norm_num) (by norm_num)

end BerryCurvature
""",
                encoding="utf-8",
            )
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "--original",
                    str(original),
                    "--structured",
                    str(structured),
                    "--proof",
                    str(proof),
                    "--patched-output",
                    str(patched),
                    "--patch-output",
                    str(patch),
                ],
                cwd=ROOT,
                capture_output=True,
                text=True,
                encoding="utf-8",
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            output = patched.read_text(encoding="utf-8")
            self.assertIn("theorem FirstChernNumber_TopologicalInvariance\n", output)
            self.assertIn("(C : ℝ → FirstChernNumber (L := L))", output)
            self.assertIn("(C 0).value = (C 1).value", output)
            self.assertNotIn("True := by trivial", output)
            diff = patch.read_text(encoding="utf-8")
            self.assertIn("+    (C : ℝ → FirstChernNumber (L := L))", diff)
            self.assertIn("+    (C 0).value = (C 1).value := by", diff)
            self.assertIn("-    True := by trivial", diff)


if __name__ == "__main__":
    unittest.main()
