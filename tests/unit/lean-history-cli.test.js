import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { compareLeanHistory, parseHistoryArguments, readLeanSnapshots } from "../../scripts/compare-lean-history.mjs";

function snapshot(id, commit, targets) {
  return {
    schemaVersion: 1,
    snapshotId: id,
    capturedAt: `2026-10-30T0${id === "a" ? 2 : id === "b" ? 1 : 3}:00:00.000Z`,
    source: {
      repository: "TOE-SYLVA",
      commit,
      branch: "main",
      dirty: false,
      toolchain: "Lean 4.29.0",
      files: [],
      manifestSha256: commit,
    },
    build: { status: "success", exitCode: 0, targets, jobs: targets.length },
    axiomCases: [],
    validation: { resultCount: 1, taskStatus: "completed" },
  };
}

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "garden-history-cli-"));
  fs.writeFileSync(path.join(directory, "a.json"), JSON.stringify(snapshot("a", "commit-b", ["A"])));
  fs.writeFileSync(path.join(directory, "b.json"), JSON.stringify(snapshot("b", "commit-a", ["A", "B"])));
  fs.writeFileSync(path.join(directory, "lean-evidence-latest-diff.json"), "not a snapshot");
  return directory;
}

test("snapshot listing is chronological and excludes the generated diff file", () => {
  const directory = fixture();
  try {
    const snapshots = readLeanSnapshots(directory);
    expect(snapshots.map((item) => item.snapshot.snapshotId)).toEqual(["b", "a"]);
    const listed = compareLeanHistory({ directory, listOnly: true });
    expect(listed.count).toBe(2);
    expect(listed.snapshots[0].commit).toBe("commit-a");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("default comparison uses the latest two snapshots without writing files", () => {
  const directory = fixture();
  try {
    const before = new Set(fs.readdirSync(directory));
    const result = compareLeanHistory({ directory });
    expect(result.readOnly).toBe(true);
    expect(result.before.snapshotId).toBe("b");
    expect(result.after.snapshotId).toBe("a");
    expect(result.comparison.changes.map((item) => item.type)).toContain("build_target_removed");
    expect(new Set(fs.readdirSync(directory))).toEqual(before);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("history commands reject path escapes and insufficient records", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "garden-history-empty-"));
  try {
    expect(compareLeanHistory({ directory }).status).toBe("insufficient_history");
    expect(() => compareLeanHistory({ directory, before: "../outside.json", after: "a.json" })).toThrow("within");
    expect(parseHistoryArguments(["--before", "a", "--after", "b"])).toEqual({
      listOnly: false,
      before: "a",
      after: "b",
      review: false,
    });
    expect(() => parseHistoryArguments(["--before"])).toThrow("requires");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
