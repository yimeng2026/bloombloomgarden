"""Regression tests for the Total Chern sum and zero-sum patch generator."""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "prepare_total_chern_number_patch.py"


class TotalChernNumberPatchTest(unittest.TestCase):
    def test_replaces_prop_and_vacuous_theorem_with_sum_evidence(self):
        with tempfile.TemporaryDirectory(dir=ROOT / ".tmp") as temporary:
            work = Path(temporary)
            structured = work / "structured.lean"
            proof = work / "proof.lean"
            patched = work / "patched.lean"
            patch = work / "total.patch"
            structured.write_text(
                """namespace BerryCurvature
open Real Complex Set MeasureTheory intervalIntegral
/-- 多带占据时的总陈数：旧说明 -/
structure TotalChernNumber (L : BlochTheorem.Lattice2D) (N : ℕ) where
  numOccupied : ℕ := N
  individualChern : Fin N → FirstChernNumber L
  totalValue : ℤ
  definition : Prop
/-- **Total Chern Number Vanishing for Full Band Occupation.** -/
theorem TotalChernNumber_FullBandVanishing
    (L : BlochTheorem.Lattice2D) (N : ℕ)
    (total : TotalChernNumber L N) :
    True := by trivial
end BerryCurvature
""",
                encoding="utf-8",
            )
            proof.write_text(
                """/-- **定义**：带实际求和等式的总陈数模型。 -/
structure TotalChernNumberModel (L : BlochTheorem.Lattice2D) (N : ℕ) where
  numOccupied : ℕ := N
  individualChern : Fin N → FirstChernNumberModel (L := L)
  totalValue : ℤ
  definition : totalValue = ∑ i, (individualChern i).value

/-- **定理**：若各带陈数整数值之和已有零和证据，则模型总值为零。 -/
theorem TotalChernNumber_FullBandVanishing_model
    {N : ℕ} (total : TotalChernNumberModel L N)
    (hfull : ∑ i, (total.individualChern i).value = 0) :
    total.totalValue = 0 := by
  calc
    total.totalValue = ∑ i, (total.individualChern i).value := total.definition
    _ = 0 := hfull

end BerryCurvature
""",
                encoding="utf-8",
            )
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
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
            self.assertIn("structure TotalChernNumber (L : BlochTheorem.Lattice2D) (N : ℕ)", output)
            self.assertIn("definition : totalValue = ∑ i, (individualChern i).value", output)
            self.assertIn("(hfull : ∑ i, (total.individualChern i).value = 0)", output)
            self.assertIn("total.totalValue = 0 := by", output)
            self.assertNotIn("definition : Prop", output)
            self.assertNotIn("True := by trivial", output)
            diff = patch.read_text(encoding="utf-8")
            self.assertIn("-  definition : Prop", diff)
            self.assertIn("-    True := by trivial", diff)
            self.assertIn("+    (hfull : ∑ i, (total.individualChern i).value = 0)", diff)


if __name__ == "__main__":
    unittest.main()
