import { test, expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { runtimeNodePath } from "../../scripts/dev-node-path.mjs";

const root = path.resolve(import.meta.dirname, "../..");

test("runtimeNodePath resolves migrated frontend and backend dependencies", () => {
  const value = runtimeNodePath(root);
  expect(value).toContain(fs.realpathSync(path.join(root, "node_modules")));
  expect(value).toContain(fs.realpathSync(path.join(root, "backend", "node_modules")));
});

test("runtimeNodePath preserves existing paths and tolerates missing directories", () => {
  expect(runtimeNodePath(root, { NODE_PATH: "custom-root" })).toContain("custom-root");
  expect(runtimeNodePath(path.join(root, "missing-project"), { NODE_PATH: "custom-root" })).toBe("custom-root");
});
