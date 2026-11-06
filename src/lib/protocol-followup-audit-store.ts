import fs from "node:fs";
import path from "node:path";
import { verifyProtocolFollowupAudit, type ProtocolFollowupAudit } from "./protocol-followup-audit";
import { protocolFollowupKey } from "./protocol-followups";
import type { ProtocolFollowupBaseline } from "./protocol-followup-reconciliation";

function relativeProjectPath(target: string): string {
  return path.relative(process.cwd(), target).split(path.sep).join("/");
}

function safeJsonBasename(filename: string): string {
  if (typeof filename !== "string" || !filename.trim() || filename !== path.basename(filename) || !filename.endsWith(".json")) {
    throw new Error("A JSON basename without directory segments is required");
  }
  return filename;
}

function protocolAuditDirectory(): string {
  const directory = process.env.PROTOCOL_FOLLOWUP_AUDIT_DIR || "data/protocol-followup-audits";
  if (path.isAbsolute(directory) || directory.split(/[\\/]/).includes("..")) {
    throw new Error("PROTOCOL_FOLLOWUP_AUDIT_DIR must be a relative directory inside the project");
  }
  const resolved = path.resolve(process.cwd(), directory);
  const relative = path.relative(process.cwd(), resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Audit directory must stay inside the project and cannot be the project root");
  }
  return resolved;
}

export function validateProtocolFollowupBaseline(value: unknown, expectedRequestId?: string): ProtocolFollowupBaseline {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Baseline must be an object");
  const baseline = value as ProtocolFollowupBaseline;
  if (typeof baseline.requestId !== "string" || !baseline.requestId.trim()) throw new Error("Baseline requestId is required");
  if (expectedRequestId !== undefined && baseline.requestId !== expectedRequestId) throw new Error("Baseline requestId does not match the current request");
  if (!Array.isArray(baseline.followups)) throw new Error("Baseline followups must be an array");
  const keys = new Set<string>();
  for (const item of baseline.followups) {
    const key = protocolFollowupKey(baseline.requestId, item);
    if (keys.has(key)) throw new Error(`Duplicate baseline followup fingerprint: ${key}`);
    keys.add(key);
  }
  return baseline;
}

export function readProtocolFollowupBaseline(filename: string, expectedRequestId?: string) {
  const safeName = safeJsonBasename(filename);
  const target = path.join(process.cwd(), "data", "protocol-followups", safeName);
  const baseline = validateProtocolFollowupBaseline(JSON.parse(fs.readFileSync(target, "utf8")), expectedRequestId);
  return { baseline, baselinePath: relativeProjectPath(target) };
}

export function readProtocolFollowupAudit(filename: string): { record: ProtocolFollowupAudit; path: string } {
  const safeName = safeJsonBasename(filename);
  const target = path.join(protocolAuditDirectory(), safeName);
  const record = JSON.parse(fs.readFileSync(target, "utf8")) as ProtocolFollowupAudit;
  verifyProtocolFollowupAudit(record);
  return { record, path: relativeProjectPath(target) };
}
