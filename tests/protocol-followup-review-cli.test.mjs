import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
function run(args) {
  return spawnSync(process.execPath, [
    "--experimental-transform-types",
    "--import", "./tests/register-ts.mjs",
    "tools/run-protocol-followup-review.mjs",
    ...args,
  ], { cwd: ROOT, env: { ...process.env, NODE_NO_WARNINGS: "1" }, encoding: "utf8", timeout: 30000 });
}

test("review CLI help does not call a model", () => {
  const result = run(["--help"]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.mode, "help");
  assert.match(payload.usage, /--audit <basename.json>/);
});

test("review CLI requires an audit before loading credentials or calling a model", () => {
  const result = run([]);
  assert.notEqual(result.status, 0);
  assert.match(JSON.parse(result.stderr).error, /--audit.*required/);
});
