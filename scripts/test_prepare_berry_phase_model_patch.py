"""Regression tests for the refined BerryPhase structure patch."""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "prepare_berry_phase_model_patch.py"


class BerryPhaseModelPatchTest(unittest.TestCase):
    def test_replaces_prop_and_adds_structure_level_gauge_theorem(self):
        with tempfile.TemporaryDirectory(dir=ROOT / ".tmp") as temporary:
            work = Path(temporary)
            structured = work / "structured.lean"
            proof = work / "proof.lean"
            patched = work / "patched.lean"
            patch = work / "model.patch"
            structured.write_text(
                """namespace BerryConnection
/-- Berry 相位：当 k 沿闭合路径 C 在 BZ 中运动时。 -/
structure BerryPhase (L : BlochTheorem.Lattice2D) where
  connection : BerryConnection L
  path : ℝ → BlochTheorem.CrystalMomentum2D
  closedPath : path 0 = path 1
  phase : ℂ
  definition : Prop
/-- **定义**：态曲线在参数区间 `[0,1]` 上的 Berry 相位积分。 -/
noncomputable def berryPhaseIntegral (u : ℝ → H) : ℂ :=
  ∫ t in 0..1, berryConnection u t 1
/-- **定理**：若规范相位在闭合参数区间两端相等。 -/
theorem BerryPhase_GaugeInvariance
    (u : ℝ → H) (θ : ℝ → ℝ) : True := by trivial
-- ============================================
-- Section 6: Berry 联络的数学抽象
-- ============================================
end BerryConnection
""",
                encoding="utf-8",
            )
            proof.write_text(
                """/-- **定义**：带实际态曲线和相位积分等式的 Berry 相位模型。 -/
structure BerryPhaseModel (L : BlochTheorem.Lattice2D) (H : Type*)
    [NormedAddCommGroup H] [InnerProductSpace ℂ H]
    [NormedSpace ℝ H] [IsScalarTower ℝ ℂ H] where
  connection : BerryConnection L
  path : ℝ → BlochTheorem.CrystalMomentum2D
  closedPath : path 0 = path 1
  state : BlochTheorem.CrystalMomentum2D → H
  phase : ℂ
  definition : phase = berryPhaseIntegral (fun t => state (path t))

/-- **定理**：结构模型的规范相位积分等于其记录的闭合 Berry 相位。 -/
theorem BerryPhase_GaugeInvariance_refined_model
    (γ : BerryPhaseModel L H) :
    berryPhaseIntegral (fun t => γ.state (γ.path t)) = γ.phase := by
  rw [γ.definition]
  apply BerryPhase_GaugeInvariance_model

end BerryConnection
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
            report = json.loads(result.stdout)
            self.assertEqual(report["structuredLines"], len(structured.read_text(encoding="utf-8").splitlines()))
            output = patched.read_text(encoding="utf-8")
            self.assertIn("structure BerryPhase (L : BlochTheorem.Lattice2D) (H : Type*)", output)
            self.assertIn("state : BlochTheorem.CrystalMomentum2D → H", output)
            self.assertIn("definition : phase = berryPhaseIntegral", output)
            self.assertIn("theorem BerryPhase_GaugeInvariance_refined", output)
            self.assertIn("apply BerryPhase_GaugeInvariance\n", output)
            self.assertNotIn("definition : Prop", output)
            self.assertLess(output.index("noncomputable def berryPhaseIntegral"), output.index("structure BerryPhase"))
            self.assertLess(output.index("structure BerryPhase"), output.index("theorem BerryPhase_GaugeInvariance\n"))
            diff = patch.read_text(encoding="utf-8")
            self.assertIn("-  definition : Prop", diff)
            self.assertIn("+  state : BlochTheorem.CrystalMomentum2D → H", diff)
            self.assertIn("+theorem BerryPhase_GaugeInvariance_refined", diff)
            (work / "BerryConnection.lean").write_bytes(structured.read_bytes())
            checked = subprocess.run(["git", "apply", "--check", str(patch)], cwd=work, capture_output=True, text=True, encoding="utf-8", check=False)
            self.assertEqual(checked.returncode, 0, checked.stderr)
            applied = subprocess.run(["git", "apply", str(patch)], cwd=work, capture_output=True, text=True, encoding="utf-8", check=False)
            self.assertEqual(applied.returncode, 0, applied.stderr)
            self.assertEqual((work / "BerryConnection.lean").read_bytes(), patched.read_bytes())


if __name__ == "__main__":
    unittest.main()
