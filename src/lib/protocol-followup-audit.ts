import { createHash } from "node:crypto";
import { reconcileProtocolFollowups } from "./protocol-followup-reconciliation";
import type { ProtocolFollowupBaseline } from "./protocol-followup-reconciliation";
import type { ProtocolRequest } from "./protocol-requests";

export const PROTOCOL_FOLLOWUP_AUDIT_SCHEMA = "protocol-followup-audit/v1";
export const PROTOCOL_FOLLOWUP_RECONCILIATION_VERSION = "protocol-followup-reconciliation/v1";

function compareCodePoints(left: string, right: string): number {
  const a = Array.from(left);
  const b = Array.from(right);
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const difference = a[index].codePointAt(0)! - b[index].codePointAt(0)!;
    if (difference) return difference;
  }
  return a.length - b.length;
}

function serializeJson(value: unknown, arrayElement = false): string | undefined {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    return arrayElement ? "null" : undefined;
  }
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  const withToJson = value as { toJSON?: () => unknown };
  if (typeof withToJson.toJSON === "function") return serializeJson(withToJson.toJSON(), arrayElement);
  if (Array.isArray(value)) {
    return `[${value.map((item) => serializeJson(item, true) || "null").join(",")}]`;
  }
  const entries = Object.entries(value)
    .filter(([, item]) => item !== undefined && typeof item !== "function" && typeof item !== "symbol")
    .sort(([left], [right]) => compareCodePoints(left, right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${serializeJson(item)}`).join(",")}}`;
}

export function canonicalJson(value: unknown): string {
  const serialized = serializeJson(value);
  if (serialized === undefined) throw new Error("A top-level JSON value is required");
  return serialized;
}

function canonicalHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

export function snapshotProtocolRequest(request: ProtocolRequest): ProtocolRequest {
  const snapshot = structuredClone(request);
  snapshot.contacts = [];
  snapshot.receipts = [];
  snapshot.workItems = [];
  delete snapshot.reviews;
  return snapshot;
}

export function computeProtocolFollowupAuditKey(input: {
  requestId: string;
  baseline: ProtocolFollowupBaseline;
  requestSnapshot: ProtocolRequest;
  algorithmVersion?: string;
}): string {
  if (!input.requestId?.trim()) throw new Error("requestId is required for an audit key");
  if (input.baseline?.requestId !== input.requestId) throw new Error("Baseline requestId must match the audit requestId");
  return canonicalHash({
    schemaVersion: PROTOCOL_FOLLOWUP_AUDIT_SCHEMA,
    algorithmVersion: input.algorithmVersion || PROTOCOL_FOLLOWUP_RECONCILIATION_VERSION,
    requestId: input.requestId,
    baseline: input.baseline,
    requestSnapshot: input.requestSnapshot,
  });
}

export interface ProtocolFollowupAudit {
  schemaVersion: typeof PROTOCOL_FOLLOWUP_AUDIT_SCHEMA;
  algorithmVersion: typeof PROTOCOL_FOLLOWUP_RECONCILIATION_VERSION;
  auditKey: string;
  requestId: string;
  createdAt: string;
  sourceRevision?: string;
  inputs: {
    baselinePath: string;
    baseline: ProtocolFollowupBaseline;
    requestSnapshot: ProtocolRequest;
  };
  deterministicResult: ReturnType<typeof reconcileProtocolFollowups>;
  evidenceUpgrade: false;
  boundaries: string[];
}

export function buildProtocolFollowupAudit(input: {
  request: ProtocolRequest;
  baseline: ProtocolFollowupBaseline;
  baselinePath: string;
  sourceRevision?: string;
  createdAt?: string;
}): ProtocolFollowupAudit {
  const requestSnapshot = snapshotProtocolRequest(input.request);
  const baseline = structuredClone(input.baseline);
  const auditKey = computeProtocolFollowupAuditKey({
    requestId: input.request.id,
    baseline,
    requestSnapshot,
  });
  return {
    schemaVersion: PROTOCOL_FOLLOWUP_AUDIT_SCHEMA,
    algorithmVersion: PROTOCOL_FOLLOWUP_RECONCILIATION_VERSION,
    auditKey,
    requestId: input.request.id,
    createdAt: input.createdAt || new Date().toISOString(),
    sourceRevision: input.sourceRevision,
    inputs: { baselinePath: input.baselinePath, baseline, requestSnapshot },
    deterministicResult: reconcileProtocolFollowups(requestSnapshot, baseline),
    evidenceUpgrade: false,
    boundaries: [
      "审计束只绑定显式基线与最小计算快照，不修改原证据或历史求援。",
      "核销只表示求援条件已补全，不表示实验真实、独立、可复现或理论成立。",
      "模型意见不属于确定性审计结果，不能改变求援或证据状态。",
    ],
  };
}

function comparableResult(record: ProtocolFollowupAudit["deterministicResult"]): string {
  return canonicalJson({ ...record, generatedAt: undefined });
}

export function verifyProtocolFollowupAudit(record: ProtocolFollowupAudit): { ok: true; auditKey: string } {
  if (record.schemaVersion !== PROTOCOL_FOLLOWUP_AUDIT_SCHEMA) throw new Error("Unsupported audit schema version");
  if (record.algorithmVersion !== PROTOCOL_FOLLOWUP_RECONCILIATION_VERSION) throw new Error("Unsupported audit algorithm version");
  if (record.evidenceUpgrade !== false) throw new Error("Audit evidenceUpgrade must remain false");
  const expectedKey = computeProtocolFollowupAuditKey({
    requestId: record.requestId,
    baseline: record.inputs.baseline,
    requestSnapshot: record.inputs.requestSnapshot,
    algorithmVersion: record.algorithmVersion,
  });
  if (record.auditKey !== expectedKey) throw new Error("Audit key does not match audit inputs");
  const replayed = reconcileProtocolFollowups(record.inputs.requestSnapshot, record.inputs.baseline);
  if (comparableResult(replayed) !== comparableResult(record.deterministicResult)) {
    throw new Error("Audit deterministic result does not match replay");
  }
  return { ok: true, auditKey: record.auditKey };
}
