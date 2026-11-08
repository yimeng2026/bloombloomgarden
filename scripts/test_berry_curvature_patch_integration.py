"""Integration regression test for the existing Berry-curvature patch sequence."""

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "prepare_berry_curvature_integration.py"


class BerryCurvaturePatchIntegrationTest(unittest.TestCase):
    def test_prepares_three_sources_with_seven_patches_in_order(self):
        sylva_root = os.environ.get("SYLVA_ROOT")
        if not sylva_root:
            self.skipTest("SYLVA_ROOT is required for the real-source integration test")
        with tempfile.TemporaryDirectory(dir=ROOT / ".tmp") as temporary:
            output = Path(temporary) / "prepared"
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "--sylva-root",
                    sylva_root,
                    "--output-directory",
                    str(output),
                ],
                cwd=ROOT,
                capture_output=True,
                text=True,
                encoding="utf-8",
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            report = json.loads(result.stdout)
            self.assertEqual(
                report["patches"],
                [
                    "berry-connection-gauge-identity.patch",
                    "berry-connection-gauge-composition.patch",
                    "berry-connection-gauge-law.patch",
                    "berry-curvature-gauge-invariance.patch",
                    "berry-curvature-gauge-invariance-3d.patch",
                    "first-chern-invariance.patch",
                    "total-chern-number.patch",
                ],
            )
            self.assertTrue(all(stage["exitCode"] == 0 for stage in report["stages"]))
            connection = (output / "BerryConnection.lean").read_text(encoding="utf-8")
            main = (output / "BerryCurvature.lean").read_text(encoding="utf-8")
            three_d = (output / "TOE_SYLVA_Solutions" / "BerryCurvature_GaugeInvariance.lean").read_text(encoding="utf-8")
            self.assertIn("theorem BerryConnection_GaugeTransformationIdentity", connection)
            self.assertIn("theorem BerryConnection_GaugeTransformComposition", connection)
            self.assertIn("theorem BerryConnection_GaugeTransformationLaw", connection)
            self.assertIn("theorem BerryCurvature_GaugeInvariance", main)
            self.assertIn("theorem FirstChernNumber_TopologicalInvariance", main)
            self.assertIn("theorem TotalChernNumber_FullBandVanishing", main)
            self.assertIn("open scoped BigOperators", main)
            self.assertIn("theorem curl_linear_subtraction", three_d)
            self.assertEqual(report["connectionSha256"], hashlib.sha256((output / "BerryConnection.lean").read_bytes()).hexdigest())
            self.assertEqual(report["mainSha256"], hashlib.sha256((output / "BerryCurvature.lean").read_bytes()).hexdigest())


if __name__ == "__main__":
    unittest.main()
