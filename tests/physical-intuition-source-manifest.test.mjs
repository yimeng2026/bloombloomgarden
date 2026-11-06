import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";

test("documented public entries remain unverified leads and cannot authorize training", () => {
  const result = spawnSync(process.execPath, [
    "--experimental-transform-types", "--import", "./tests/register-ts.mjs",
    "scripts/physical-intuition-distill-prepare.mjs",
  ], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.sources.length, 3);
  assert.ok(report.sources.every((source) => source.usable === false));
  assert.ok(report.sources.every((source) => source.reasons.includes("permission_unverified")));
  assert.equal(report.sampleCount, 0);
  assert.equal(report.sourceAndLeakagePassed, false);
  assert.equal(report.readyForTraining, false);
  assert.equal(report.evidenceUpgrade, false);
});
