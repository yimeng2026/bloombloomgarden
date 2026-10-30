import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  DEFAULT_DATABASE_URL,
  ensureSqliteDirectory,
  localSqlitePath,
} from "../../src/lib/prisma.ts";

test("research database defaults to the documented existing dev.db", () => {
  expect(DEFAULT_DATABASE_URL).toBe("file:./dev.db");
  expect(localSqlitePath(DEFAULT_DATABASE_URL, "/tmp/garden")).toBe(path.resolve("/tmp/garden", "dev.db"));
  expect(localSqlitePath("libsql://research.example", "/tmp/garden")).toBeNull();
  expect(localSqlitePath("file::memory:", "/tmp/garden")).toBeNull();
});

test("local SQLite parent creation does not touch remote or in-memory targets", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "garden-db-test-"));
  try {
    const filePath = ensureSqliteDirectory("file:./nested/research.db", temporary);
    expect(filePath).toBe(path.join(temporary, "nested", "research.db"));
    expect(fs.existsSync(path.dirname(filePath))).toBe(true);
    expect(fs.existsSync(filePath)).toBe(false);
    expect(ensureSqliteDirectory("libsql://research.example", temporary)).toBeNull();
    expect(ensureSqliteDirectory("file::memory:", temporary)).toBeNull();
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
