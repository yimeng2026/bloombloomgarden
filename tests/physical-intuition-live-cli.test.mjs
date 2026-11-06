import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";

test("live CLI refuses billable calls without --live and creates no audit", (t) => {
  const directory = `.tmp/physical-intuition-live-guard-${process.pid}`;
  const previous = process.env.PHYSICAL_INTUITION_AUDIT_DIR;
  fs.rmSync(directory, { recursive: true, force: true });
  t.after(() => {
    if (previous === undefined) delete process.env.PHYSICAL_INTUITION_AUDIT_DIR;
    else process.env.PHYSICAL_INTUITION_AUDIT_DIR = previous;
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  const result = spawnSync(process.execPath, [
    "--experimental-transform-types",
    "--import", "./tests/register-ts.mjs",
    "scripts/physical-intuition-model-review.mjs",
  ], {
    cwd: process.cwd(),
    env: { ...process.env, PHYSICAL_INTUITION_AUDIT_DIR: directory },
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Refusing a billable model call without the explicit --live flag/);
  assert.equal(fs.existsSync(directory), false);
});
