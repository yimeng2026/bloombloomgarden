"""Regression tests for the Berry-connection exterior-derivative patch."""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "prepare_berry_connection_exterior_derivative_patch.py"


class ExteriorDerivativePatchTest(unittest.TestCase):
    def test_replaces_axiom_with_computable_definition_and_gauge_proof(self):
        with tempfile.TemporaryDirectory(dir=ROOT / ".tmp") as temporary:
            work = Path(temporary)
            structured = work / "structured.lean"
            proof = work / "proof.lean"
            patched = work / "patched.lean"
            patch = work / "exterior.patch"
            structured.write_text(
                """namespace BerryConnection
/-- **Berry Curvature as Exterior Derivative of Berry Connection.** -/
axiom exteriorDerivativeOfBerryConnection
    (L : BlochTheorem.Lattice2D) (A : BerryConnection1Form L) :
    True
end BerryConnection
""",
                encoding="utf-8",
            )
            proof.write_text(
                """/-- **定义**：复值外微分分量。 -/
noncomputable def exteriorDerivativeOfBerryConnection_model
    (L : BlochTheorem.Lattice2D) (A : BerryConnection1Form L)
    (k : BlochTheorem.CrystalMomentum2D) : ℂ :=
  fderiv ℝ A.componentY k realDirectionX - fderiv ℝ A.componentX k realDirectionY
/-- **定义**：一形式规范变换。 -/
noncomputable def gaugeTransform1Form_model
    (L : BlochTheorem.Lattice2D) (A : BerryConnection1Form L)
    (θ : BlochTheorem.CrystalMomentum2D → ℂ) : BerryConnection1Form L := A
private theorem mixed_partials_commute_of_contDiff2_complex {E : Type*} [NormedAddCommGroup E]
    [NormedSpace ℝ E] {φ : E → ℂ} (hφ : ContDiff ℝ 2 φ) (k : E) (v w : E) :
    fderiv ℝ (fun k' => fderiv ℝ φ k' v) k w = fderiv ℝ (fun k' => fderiv ℝ φ k' w) k v := by
  exact mixed_partials_commute_of_contDiff2_complex hφ k v w
/-- **定理**：外微分规范不变。 -/
theorem exteriorDerivativeOfBerryConnection_gauge_invariant_model
    (L : BlochTheorem.Lattice2D) (A : BerryConnection1Form L)
    (θ : BlochTheorem.CrystalMomentum2D → ℂ) :
    exteriorDerivativeOfBerryConnection_model L (gaugeTransform1Form_model L A θ) k
      = exteriorDerivativeOfBerryConnection_model L A k := by
  rw [fderiv_add]

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
            output = patched.read_text(encoding="utf-8")
            self.assertIn("noncomputable def exteriorDerivativeOfBerryConnection\n", output)
            self.assertIn("noncomputable def gaugeTransform1Form\n", output)
            self.assertIn("theorem exteriorDerivativeOfBerryConnection_gauge_invariant\n", output)
            self.assertNotIn("axiom exteriorDerivativeOfBerryConnection", output)
            diff = patch.read_text(encoding="utf-8")
            self.assertIn("-axiom exteriorDerivativeOfBerryConnection", diff)
            self.assertIn("+noncomputable def exteriorDerivativeOfBerryConnection", diff)
            self.assertIn("+theorem exteriorDerivativeOfBerryConnection_gauge_invariant", diff)


if __name__ == "__main__":
    unittest.main()
