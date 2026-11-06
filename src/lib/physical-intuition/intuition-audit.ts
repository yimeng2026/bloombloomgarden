import fs from "node:fs";
import path from "node:path";
import { assertNoAuditSecrets, relativeProjectPath } from "../protocol-followup-audit-store";
import { assertModelProposalReport, type ModelProposalReport } from "./model-proposal";

export function physicalIntuitionAuditDirectory(): string {
  const directory = process.env.PHYSICAL_INTUITION_AUDIT_DIR || "data/physical-intuition/model-reviews";
  if (path.isAbsolute(directory) || directory.split(/[\\/]/).includes("..")) {
    throw new Error("PHYSICAL_INTUITION_AUDIT_DIR must be a relative directory inside the project");
  }
  const resolved = path.resolve(process.cwd(), directory);
  const relative = path.relative(process.cwd(), resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Audit directory must stay inside the project and cannot be the project root");
  }
  return resolved;
}

export function saveModelProposalReport(report: ModelProposalReport) {
  assertModelProposalReport(report);
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  assertNoAuditSecrets(serialized);
  const directory = physicalIntuitionAuditDirectory();
  fs.mkdirSync(directory, { recursive: true });
  const prefix = `${report.requestId}-${report.evaluation.audit.inputHash.slice(0, 16)}`;
  const attempts = fs.readdirSync(directory)
    .map((name) => name.match(new RegExp(`^${prefix}-review-(\\d+)\\.json$`)))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => Number(match[1]));
  const attempt = attempts.length ? Math.max(...attempts) + 1 : 1;
  const target = path.join(directory, `${prefix}-review-${attempt}.json`);
  const descriptor = fs.openSync(target, "wx");
  try {
    fs.writeFileSync(descriptor, serialized, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  return { record: report, path: relativeProjectPath(target), attempt };
}
