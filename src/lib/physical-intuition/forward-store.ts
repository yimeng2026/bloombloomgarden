import fs from "node:fs";
import path from "node:path";
import { assertNoAuditSecrets, relativeProjectPath } from "../protocol-followup-audit-store";
import { assertForwardCase, assertForwardOutcome, type ForwardCase, type ForwardOutcome } from "./forward-calibration";

export function forwardAuditDirectory(): string {
  const directory = process.env.PHYSICAL_INTUITION_FORWARD_DIR || "data/physical-intuition/forward-calibration";
  if (path.isAbsolute(directory) || directory.split(/[\\/]/).includes("..")) throw new Error("PHYSICAL_INTUITION_FORWARD_DIR must be a relative directory inside the project");
  const resolved = path.resolve(process.cwd(), directory);
  const relative = path.relative(process.cwd(), resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Forward audit directory must stay inside the project and cannot be the project root");
  return resolved;
}

function readTarget(filename: string, suffix: string): string {
  if (typeof filename !== "string" || !filename || path.isAbsolute(filename) || filename.split(/[\\/]/).includes("..") || !filename.endsWith(suffix)) throw new Error("Invalid forward audit filename");
  const directory = forwardAuditDirectory();
  const target = path.basename(filename) === filename ? path.join(directory, filename) : path.resolve(process.cwd(), filename);
  const relative = path.relative(directory, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || relative !== path.basename(relative)) throw new Error("Forward audit file must stay directly inside its audit directory");
  return target;
}

function writeImmutable(filename: string, value: unknown): string {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  assertNoAuditSecrets(serialized);
  const directory = forwardAuditDirectory();
  const target = path.join(directory, filename);
  if (fs.existsSync(target)) throw new Error("Forward audit already exists and cannot be overwritten");
  fs.mkdirSync(directory, { recursive: true });
  const descriptor = fs.openSync(target, "wx");
  try {
    fs.writeFileSync(descriptor, serialized, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  return relativeProjectPath(target);
}

export function saveForwardCase(record: ForwardCase) {
  assertForwardCase(record);
  const filename = `${record.caseId}-${record.caseHash.slice(0, 16)}.case.json`;
  return { record, path: writeImmutable(filename, record) };
}

export function readForwardCase(filename: string) {
  const target = readTarget(filename, ".case.json");
  const record = JSON.parse(fs.readFileSync(target, "utf8")) as ForwardCase;
  assertForwardCase(record);
  return { record, path: relativeProjectPath(target) };
}

export function saveForwardOutcome(caseRecord: ForwardCase, outcome: ForwardOutcome) {
  assertForwardOutcome(caseRecord, outcome);
  const filename = `${outcome.caseId}-${outcome.caseHash.slice(0, 16)}.outcome.json`;
  return { record: outcome, path: writeImmutable(filename, outcome) };
}

export function readForwardOutcome(caseRecord: ForwardCase, filename: string) {
  const target = readTarget(filename, ".outcome.json");
  const record = JSON.parse(fs.readFileSync(target, "utf8")) as ForwardOutcome;
  assertForwardOutcome(caseRecord, record);
  return { record, path: relativeProjectPath(target) };
}
