import { test, expect } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runtimeNodePath } from "../../scripts/dev-node-path.mjs";

const root = path.resolve(import.meta.dirname, "../..");

test("runtimeNodePath resolves migrated frontend and backend dependencies", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "dev-node-path-"));
  try {
    fs.mkdirSync(path.join(temporary, "node_modules"), { recursive: true });
    fs.mkdirSync(path.join(temporary, "backend", "node_modules"), { recursive: true });
    const value = runtimeNodePath(temporary);
    expect(value).toContain(fs.realpathSync(path.join(temporary, "node_modules")));
    expect(value).toContain(fs.realpathSync(path.join(temporary, "backend", "node_modules")));
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test("runtimeNodePath preserves existing paths and tolerates missing directories", () => {
  expect(runtimeNodePath(root, { NODE_PATH: "custom-root" })).toContain("custom-root");
  expect(runtimeNodePath(path.join(root, "missing-project"), { NODE_PATH: "custom-root" })).toBe("custom-root");
});
