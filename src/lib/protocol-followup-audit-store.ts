import { randomUUID } from "node:crypto";
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

export function assertNoAuditSecrets(serialized: string): void {
  const patterns = [
    /\bsk-[A-Za-z0-9_-]{16,}/,
    /\bghp_[A-Za-z0-9]{20,}/,
    /\bgithub_pat_[A-Za-z0-9_]{20,}/,
    /\bBearer\s+[A-Za-z0-9._-]{16,}/i,
  ];
  if (patterns.some((pattern) => pattern.test(serialized))) {
    throw new Error("Potential secret material detected; audit was not written");
  }
}

function existingAudit(target: string, auditKey: string): { record: ProtocolFollowupAudit; path: string; created: false } {
  try {
    const record = JSON.parse(fs.readFileSync(target, "utf8")) as ProtocolFollowupAudit;
    verifyProtocolFollowupAudit(record);
    if (record.auditKey !== auditKey) throw new Error("Existing audit key differs from the requested record");
    return { record, path: relativeProjectPath(target), created: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Existing audit conflict: ${message}`);
  }
}

export function saveProtocolFollowupAudit(record: ProtocolFollowupAudit): {
  record: ProtocolFollowupAudit;
  path: string;
  created: boolean;
} {
  verifyProtocolFollowupAudit(record);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(record.requestId)) throw new Error("Invalid audit requestId");
  if (!/^[a-f0-9]{64}$/.test(record.auditKey)) throw new Error("Invalid audit key format");
  const serialized = `${JSON.stringify(record, null, 2)}\n`;
  assertNoAuditSecrets(serialized);
  const directory = protocolAuditDirectory();
  const target = path.join(directory, `${record.requestId}-${record.auditKey}.json`);
  if (fs.existsSync(target)) return existingAudit(target, record.auditKey);

  fs.mkdirSync(directory, { recursive: true });
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(temporary, "wx");
    fs.writeFileSync(descriptor, serialized, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    try {
      fs.linkSync(temporary, target);
      return { record, path: relativeProjectPath(target), created: true };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") return existingAudit(target, record.auditKey);
      throw error;
    }
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
}
