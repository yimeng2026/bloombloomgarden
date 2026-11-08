"""Regression tests for the actual Berry-curvature definition patch."""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "prepare_berry_curvature_model_patch.py"


class BerryCurvatureModelPatchTest(unittest.TestCase):
    def test_replaces_prop_with_derivative_equation_and_zero_instance(self):
        with tempfile.TemporaryDirectory(dir=ROOT / ".tmp") as temporary:
            work = Path(temporary)
            structured = work / "structured.lean"
            proof = work / "proof.lean"
            patched = work / "patched.lean"
            patch = work / "curvature.patch"
            structured.write_text(
                """namespace BerryCurvature
/-- Berry 曲率（Abel 版本）：旧说明 -/
structure BerryCurvature (L : BlochTheorem.Lattice2D) where
  n : BlochTheorem.BandIndex
  berryConnection : BerryConnection.BerryConnection L
  curvatureXY : BlochTheorem.CrystalMomentum2D → ℂ
  definition : Prop
-- Section 2
end BerryCurvature
""",
                encoding="utf-8",
            )
            proof.write_text(
                """/-- **定义**：由旧 Berry 联络计算实际曲率。 -/
noncomputable def curvatureXYFromBerryConnection_model
    (A : BerryConnection.BerryConnection L) (k : BlochTheorem.CrystalMomentum2D) : ℂ :=
  fderiv ℝ (fun k' => A.connection k' 1) k BerryConnection.realDirectionX
    - fderiv ℝ (fun k' => A.connection k' 0) k BerryConnection.realDirectionY
/-- **定义**：带实际曲率定义等式的模型。 -/
structure BerryCurvatureModel (L : BlochTheorem.Lattice2D) where
  n : BlochTheorem.BandIndex
  berryConnection : BerryConnection.BerryConnection L
  curvatureXY : BlochTheorem.CrystalMomentum2D → ℂ
  definition : curvatureXY = fun k => curvatureXYFromBerryConnection_model berryConnection k
/-- **定义**：零联络记录。 -/
noncomputable def zeroBerryConnectionRecord : BerryConnection.BerryConnection L := {
  n := (0 : ℕ)
  state := {
    n := (0 : ℕ)
    wavefunction := fun _ _ => 0
    periodicity := True
    normalization := True
  }
  connection := fun _ _ => 0
  definition := True
}
/-- **定义**：零曲率实例。 -/
noncomputable def zeroBerryCurvatureModel : BerryCurvatureModel (L := L) where
  n := (0 : ℕ)
  berryConnection := zeroBerryConnectionRecord (L := L)
  curvatureXY := fun _ => 0
  definition := by
    funext k
    simp [curvatureXYFromBerryConnection_model, zeroBerryConnectionRecord]

end BerryCurvature
""",
                encoding="utf-8",
            )
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--structured", str(structured), "--proof", str(proof),
                 "--patched-output", str(patched), "--patch-output", str(patch)],
                cwd=ROOT,
                capture_output=True,
                text=True,
                encoding="utf-8",
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            output = patched.read_text(encoding="utf-8")
            self.assertIn("noncomputable def curvatureXYFromBerryConnection\n", output)
            self.assertIn("structure BerryCurvature (L : BlochTheorem.Lattice2D) where", output)
            self.assertIn("definition : curvatureXY = fun k => curvatureXYFromBerryConnection berryConnection k", output)
            self.assertIn("noncomputable def zeroBerryCurvatureModel", output)
            self.assertNotIn("definition : Prop", output)
            diff = patch.read_text(encoding="utf-8")
            self.assertIn("-  definition : Prop", diff)
            self.assertIn("+  definition : curvatureXY = fun k => curvatureXYFromBerryConnection berryConnection k", diff)


if __name__ == "__main__":
    unittest.main()
