import fs from "node:fs";
import path from "node:path";
import { verifyProtocolFollowupAudit, type ProtocolFollowupAudit } from "./protocol-followup-audit";
import { assertNoAuditSecrets, protocolAuditDirectory, relativeProjectPath } from "./protocol-followup-audit-store";
import type { ProtocolFollowupReview } from "./protocol-followup-review";

export function saveProtocolFollowupReview(audit: ProtocolFollowupAudit, review: ProtocolFollowupReview) {
  verifyProtocolFollowupAudit(audit);
  if (review.schemaVersion !== "protocol-followup-review/v1") throw new Error("Unsupported review schema version");
  if (review.auditKey !== audit.auditKey) throw new Error("Review auditKey does not match the audit");
  if (review.requestId !== audit.requestId) throw new Error("Review requestId does not match the audit");
  if (review.evidenceUpgrade !== false) throw new Error("Review evidenceUpgrade must remain false");
  if (!["complete", "partial"].includes(review.status)) throw new Error("Invalid review status");
  const directory = protocolAuditDirectory();
  const auditTarget = path.join(directory, `${audit.requestId}-${audit.auditKey}.json`);
  if (!fs.existsSync(auditTarget)) throw new Error("The underlying audit must exist before saving a review");
  const attempts = fs.readdirSync(directory)
    .map((name) => name.match(new RegExp(`^${audit.auditKey}-review-(\\d+)\\.json$`)))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => Number(match[1]));
  const attempt = attempts.length ? Math.max(...attempts) + 1 : 1;
  const target = path.join(directory, `${audit.auditKey}-review-${attempt}.json`);
  const serialized = `${JSON.stringify(review, null, 2)}\n`;
  assertNoAuditSecrets(serialized);
  const descriptor = fs.openSync(target, "wx");
  try {
    fs.writeFileSync(descriptor, serialized, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  return { record: review, path: relativeProjectPath(target), attempt };
}
