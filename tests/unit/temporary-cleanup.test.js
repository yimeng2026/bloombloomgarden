import { expect, test } from "bun:test";
import path from "node:path";
import { removeTemporaryDirectory } from "../../scripts/temporary-cleanup.mjs";

const evidenceRoot = path.join(path.sep, "evidence");
const selfCheck = path.join(evidenceRoot, "self-check-a");
const outside = path.join(path.sep, "other", "self-check-a");
const otherData = path.join(evidenceRoot, "other-data");

test("temporary cleanup retries a transient Windows lock", async () => {
  let calls = 0;
  let removed = false;
  await removeTemporaryDirectory({
    directory: selfCheck,
    root: evidenceRoot,
    attempts: 4,
    delayMs: 0,
    rmImpl: () => {
      calls += 1;
      if (calls < 3) {
        const error = new Error("locked");
        error.code = "EPERM";
        throw error;
      }
      removed = true;
    },
    existsImpl: () => !removed,
  });
  expect(calls).toBe(3);
});

test("temporary cleanup remains bounded for persistent failures", async () => {
  let calls = 0;
  await expect(removeTemporaryDirectory({
    directory: selfCheck,
    root: evidenceRoot,
    attempts: 2,
    delayMs: 0,
    rmImpl: () => {
      calls += 1;
      throw new Error("EPERM");
    },
  })).rejects.toThrow("EPERM");
  expect(calls).toBe(2);
});

test("temporary cleanup refuses paths outside the self-check root", async () => {
  let calls = 0;
  await expect(removeTemporaryDirectory({
    directory: outside,
    root: evidenceRoot,
    rmImpl: () => { calls += 1; },
  })).rejects.toThrow("escapes");
  await expect(removeTemporaryDirectory({
    directory: otherData,
    root: evidenceRoot,
    rmImpl: () => { calls += 1; },
  })).rejects.toThrow("only accepts self-check");
  expect(calls).toBe(0);
});
