"""Regression tests for the closed-interval Berry-phase gauge-invariance patch."""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "prepare_berry_phase_gauge_invariance_patch.py"


class BerryPhaseGaugeInvariancePatchTest(unittest.TestCase):
    def test_replaces_axiom_with_integral_definition_and_ftc_proof(self):
        with tempfile.TemporaryDirectory(dir=ROOT / ".tmp") as temporary:
            work = Path(temporary)
            structured = work / "structured.lean"
            proof = work / "proof.lean"
            patched = work / "patched.lean"
            patch = work / "phase.patch"
            structured.write_text(
                """namespace BerryConnection
/-- **Berry Phase Gauge Invariance (Single-Valued Gauge Transformations).** -/
axiom BerryPhase_GaugeInvariance
    (L : BlochTheorem.Lattice2D) (γ : BerryPhase L) :
    True
end BerryConnection
""",
                encoding="utf-8",
            )
            proof.write_text(
                """/-- **定义**：态曲线在参数区间上的 Berry 相位积分。 -/
noncomputable def berryPhaseIntegral (u : ℝ → H) : ℂ :=
  ∫ t in 0..1, berryConnection u t 1

/-- **定理**：端点规范相位相等时积分不变。 -/
theorem BerryPhase_GaugeInvariance_model
    (u : ℝ → H) (θ : ℝ → ℝ)
    (hclosed : θ 1 = θ 0) :
    berryPhaseIntegral (fun t => phaseFactor θ t • u t) = berryPhaseIntegral u := by
  rw [BerryConnection_GaugeTransformationLaw]
  rw [intervalIntegral.integral_deriv_eq_sub]
  rw [hclosed]
  simp

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
            self.assertIn("noncomputable def berryPhaseIntegral", output)
            self.assertIn("theorem BerryPhase_GaugeInvariance\n", output)
            self.assertIn("(hclosed : θ 1 = θ 0)", output)
            self.assertNotIn("axiom BerryPhase_GaugeInvariance", output)
            diff = patch.read_text(encoding="utf-8")
            self.assertIn("-axiom BerryPhase_GaugeInvariance", diff)
            self.assertIn("+noncomputable def berryPhaseIntegral", diff)
            self.assertIn("+    (hclosed : θ 1 = θ 0)", diff)


if __name__ == "__main__":
    unittest.main()
