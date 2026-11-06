import { createHash } from "node:crypto";
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
