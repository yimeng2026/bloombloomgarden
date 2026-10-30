import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compareLeanEvidenceSnapshots } from "./lean-evidence-history.mjs";

const DEFAULT_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "kimi-control",
  "lean-history",
);

function metadata(record) {
  return {
    snapshotId: record.snapshot.snapshotId,
    capturedAt: record.snapshot.capturedAt,
    commit: record.snapshot.source.commit,
    file: record.snapshotFile,
  };
}

export function readLeanSnapshots(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter((file) => file.endsWith(".json") && file !== "lean-evidence-latest-diff.json")
    .map((file) => {
      const snapshotFile = path.join(directory, file);
      const snapshot = JSON.parse(fs.readFileSync(snapshotFile, "utf8"));
      if (snapshot.schemaVersion !== 1 || !snapshot.snapshotId || !snapshot.source?.commit) {
        throw new Error(`Invalid Lean evidence snapshot: ${file}`);
      }
      if (!Number.isFinite(Date.parse(snapshot.capturedAt))) {
        throw new Error(`Invalid snapshot timestamp: ${file}`);
      }
      return { snapshot, snapshotFile };
    })
    .sort((a, b) => a.snapshot.capturedAt.localeCompare(b.snapshot.capturedAt)
      || a.snapshot.snapshotId.localeCompare(b.snapshot.snapshotId));
}

function selectSnapshot(reference, snapshots, directory) {
  if (!reference) return null;
  const byId = snapshots.find((record) => record.snapshot.snapshotId === reference);
  if (byId) return byId;
  if (!reference.includes("/") && !reference.includes("\\")) {
    const byFile = snapshots.find((record) =>
      path.basename(record.snapshotFile) === reference
      || path.basename(record.snapshotFile, ".json") === reference
    );
    if (byFile) return byFile;
  }
  const requested = path.resolve(reference);
  if (path.dirname(requested) !== path.resolve(directory)) {
    throw new Error("Snapshot reference must stay within the Lean history directory");
  }
  const byPath = snapshots.find((record) => path.resolve(record.snapshotFile) === requested);
  if (!byPath) throw new Error(`Snapshot not found: ${reference}`);
  return byPath;
}

export function compareLeanHistory({
  directory = DEFAULT_DIRECTORY,
  before,
  after,
  listOnly = false,
}) {
  const snapshots = readLeanSnapshots(directory);
  if (listOnly) {
    return {
      status: "ok",
      mode: "list",
      count: snapshots.length,
      snapshots: snapshots.map(metadata),
    };
  }
  if (snapshots.length < 2 && !(before && after)) {
    return {
      status: "insufficient_history",
      count: snapshots.length,
      message: "At least two snapshots, or explicit before/after references, are required",
    };
  }
  const previous = before
    ? selectSnapshot(before, snapshots, directory)
    : snapshots[snapshots.length - 2];
  const current = after
    ? selectSnapshot(after, snapshots, directory)
    : snapshots[snapshots.length - 1];
  if (!previous || !current) throw new Error("Both before and after snapshots must be specified");
  return {
    status: "ok",
    mode: "compare",
    readOnly: true,
    before: metadata(previous),
    after: metadata(current),
    comparison: compareLeanEvidenceSnapshots(previous.snapshot, current.snapshot),
  };
}

export function parseHistoryArguments(args) {
  const result = { listOnly: false, before: undefined, after: undefined };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === "--list") result.listOnly = true;
    else if (argument === "--before" || argument === "--after") {
      if (!args[index + 1]) throw new Error(`${argument} requires a snapshot ID or filename`);
      result[argument === "--before" ? "before" : "after"] = args[++index];
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return result;
}

function main() {
  try {
    const options = parseHistoryArguments(process.argv.slice(2));
    const result = compareLeanHistory({ directory: DEFAULT_DIRECTORY, ...options });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
