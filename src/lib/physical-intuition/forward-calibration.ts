import { createHash } from "node:crypto";
import { canonicalJson } from "../protocol-followup-audit";
import { evaluateIntuitionTask } from "./evaluate";
import { assertModelProposalReport, type ModelProposalReport } from "./model-proposal";
import { getStructureCard } from "./structure-registry";
import type { EvidenceLink, IntuitionTask } from "./types";

export interface ForwardCase {
  schemaVersion: "physical-intuition-forward-case/v1";
  caseId: string;
  problemFamily: string;
  authorId: string;
  frozenAt: string;
  task: IntuitionTask;
  decision: "propose" | "abstain";
  candidateKeys: string[];
  confidence: number | null;
  falsificationCriteria: string[];
  selectionRule: string;
  reason: string;
  caseHash: string;
  evidenceUpgrade: false;
}
export interface ForwardOutcome {
  schemaVersion: "physical-intuition-forward-outcome/v1";
  caseId: string;
  caseHash: string;
  observedAt: string;
  kind: "hit" | "miss" | "near_miss" | "inconclusive";
  holdout: { holdoutId: string; accessibleAt: string; evidence: EvidenceLink };
  review: { reviewerId: string; independentFrom: string[]; reviewedAt: string; verdict: "supported" | "refuted" | "partial" | "inconclusive" };
  notes?: string;
  outcomeHash: string;
  evidenceUpgrade: false;
}
export type ForwardCaseInput = Omit<ForwardCase, "schemaVersion" | "caseHash" | "evidenceUpgrade">;
export type ForwardOutcomeInput = Omit<ForwardOutcome, "schemaVersion" | "outcomeHash" | "evidenceUpgrade">;
export interface ForwardCalibrationRecord {
  case: ForwardCase;
  outcome?: ForwardOutcome;
  status: "pending" | "abstained" | ForwardOutcome["kind"];
}
export interface ForwardCalibration {
  schemaVersion: "physical-intuition-forward-calibration/v1";
  records: ForwardCalibrationRecord[];
  counts: { total: number; proposed: number; resolved: number; hit: number; miss: number; nearMiss: number; inconclusive: number; pending: number; abstained: number };
  hitRate: number | null;
  brierScore: number | null;
  meanConfidence: number | null;
  confidenceGap: number | null;
  coverage: number | null;
  abstentionRate: number | null;
  allOutcomesRecorded: boolean;
  evidenceUpgrade: false;
  boundaries: string[];
}

function iso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try { return new Date(value).toISOString() === value; } catch { return false; }
}
function hash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}
function assertEvidence(evidence: EvidenceLink): void {
  if (!evidence || typeof evidence.id !== "string" || !evidence.id.trim() || typeof evidence.locator !== "string" || !evidence.locator.trim()) throw new Error("Outcome evidence id and locator are required");
  if (!["observation", "reconstruction", "interpretation", "context", "lead"].includes(evidence.role)) throw new Error("Invalid outcome evidence role");
  if (evidence.sourceUrl !== undefined) {
    let url: URL;
    try { url = new URL(evidence.sourceUrl); } catch { throw new Error("Outcome evidence URL must be valid"); }
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Outcome evidence URL must use HTTP or HTTPS");
  }
}

export function assertForwardCase(record: ForwardCase): void {
  if (!record || record.schemaVersion !== "physical-intuition-forward-case/v1") throw new Error("Unsupported forward case schema");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(record.caseId) || !record.problemFamily?.trim() || !record.authorId?.trim()) throw new Error("Forward case identifiers are required");
  if (!iso(record.frozenAt)) throw new Error("frozenAt must be an exact ISO timestamp");
  evaluateIntuitionTask(record.task);
  if (!Array.isArray(record.candidateKeys) || new Set(record.candidateKeys).size !== record.candidateKeys.length || record.candidateKeys.some((key) => !getStructureCard(key))) throw new Error("Candidate structure keys must be unique and registered");
  if (record.decision === "propose" && (record.candidateKeys.length === 0 || typeof record.confidence !== "number" || !Number.isFinite(record.confidence) || record.confidence < 0 || record.confidence > 1)) throw new Error("A proposed case needs candidates and bounded confidence");
  if (record.decision === "abstain" && (record.candidateKeys.length !== 0 || record.confidence !== null)) throw new Error("An abstain case must have no candidates and null confidence");
  if (!["propose", "abstain"].includes(record.decision)) throw new Error("Invalid forward decision");
  if (!Array.isArray(record.falsificationCriteria) || record.falsificationCriteria.length === 0 || record.falsificationCriteria.some((item) => typeof item !== "string" || !item.trim())) throw new Error("Falsification criteria are required");
  if (!record.selectionRule?.trim() || !record.reason?.trim()) throw new Error("Selection rule and reason are required");
  if (record.evidenceUpgrade !== false) throw new Error("Forward cases cannot upgrade evidence");
  const { caseHash, ...payload } = record;
  if (caseHash !== hash(payload)) throw new Error("Forward caseHash does not match frozen content");
}

export function freezeForwardCase(input: ForwardCaseInput): ForwardCase {
  const body = structuredClone(input);
  const record = { schemaVersion: "physical-intuition-forward-case/v1" as const, ...body, caseHash: hash({ schemaVersion: "physical-intuition-forward-case/v1", ...body, evidenceUpgrade: false as const }), evidenceUpgrade: false as const };
  assertForwardCase(record);
  return record;
}

export function freezeModelForwardCase(input: { report: ModelProposalReport; caseId: string; problemFamily: string; falsificationCriteria: string[] }): ForwardCase {
  assertModelProposalReport(input.report);
  if (input.report.status !== "complete") throw new Error("A complete model report is required for forward calibration");
  const proposer = input.report.exchanges.find((exchange) => exchange.role === "structure_proposer")!;
  if (input.report.proposals.length === 0 || input.report.proposals.some((proposal) => typeof proposal.confidence !== "number")) throw new Error("Every model proposal needs explicit confidence for forward calibration");
  const ranked = input.report.proposals.map((proposal) => ({ key: proposal.key, confidence: proposal.confidence, reason: proposal.triggerRationale })).sort((left, right) => (right.confidence ?? -1) - (left.confidence ?? -1) || left.key.localeCompare(right.key));
  const selected = ranked[0];
  if (!selected || typeof selected.confidence !== "number") throw new Error("Model proposals need explicit confidence for forward calibration");
  return freezeForwardCase({
    caseId: input.caseId,
    problemFamily: input.problemFamily,
    authorId: `model:${proposer.provider || proposer.request.provider}:${proposer.model || proposer.request.model || "unreported"}`,
    frozenAt: input.report.generatedAt,
    task: structuredClone(input.report.task),
    decision: "propose",
    candidateKeys: [selected.key],
    confidence: selected.confidence,
    falsificationCriteria: [...input.falsificationCriteria],
    selectionRule: "max_reported_confidence_then_structure_key",
    reason: selected.reason,
  });
}

export function assertForwardOutcome(caseRecord: ForwardCase, outcome: ForwardOutcome): void {
  assertForwardCase(caseRecord);
  if (!outcome || outcome.schemaVersion !== "physical-intuition-forward-outcome/v1") throw new Error("Unsupported forward outcome schema");
  if (outcome.caseId !== caseRecord.caseId || outcome.caseHash !== caseRecord.caseHash) throw new Error("Outcome caseId or caseHash does not match the frozen case");
  if (!iso(outcome.observedAt) || !iso(outcome.holdout?.accessibleAt) || !iso(outcome.review?.reviewedAt)) throw new Error("Outcome timestamps must be exact ISO timestamps");
  if (!(outcome.holdout.accessibleAt > caseRecord.frozenAt)) throw new Error("Holdout access must be after freezing");
  if (!(outcome.observedAt >= outcome.holdout.accessibleAt) || !(outcome.review.reviewedAt >= outcome.observedAt)) throw new Error("Outcome observation and review chronology is invalid");
  if (!outcome.holdout.holdoutId?.trim()) throw new Error("A holdout identifier is required");
  assertEvidence(outcome.holdout.evidence);
  if (["hit", "miss", "near_miss"].includes(outcome.kind) && !["observation", "reconstruction"].includes(outcome.holdout.evidence.role)) throw new Error("Resolved outcomes need observation or reconstruction evidence");
  if (!outcome.review.reviewerId?.trim() || outcome.review.reviewerId === caseRecord.authorId || !outcome.review.independentFrom?.includes(caseRecord.authorId)) throw new Error("Outcome reviewer must be independent of the case author");
  const verdict = { hit: "supported", miss: "refuted", near_miss: "partial", inconclusive: "inconclusive" }[outcome.kind];
  if (!verdict || outcome.review.verdict !== verdict) throw new Error("Outcome kind and review verdict are inconsistent");
  if (outcome.notes !== undefined && (typeof outcome.notes !== "string" || !outcome.notes.trim() || outcome.notes.length > 4000)) throw new Error("Outcome notes must be nonempty and bounded");
  if (outcome.evidenceUpgrade !== false) throw new Error("Forward outcomes cannot upgrade evidence");
  const { outcomeHash, ...payload } = outcome;
  if (outcomeHash !== hash(payload)) throw new Error("Forward outcomeHash does not match outcome content");
}

export function recordForwardOutcome(caseRecord: ForwardCase, input: ForwardOutcomeInput): ForwardOutcome {
  const body = structuredClone(input);
  const outcome = { schemaVersion: "physical-intuition-forward-outcome/v1" as const, ...body, outcomeHash: hash({ schemaVersion: "physical-intuition-forward-outcome/v1", ...body, evidenceUpgrade: false as const }), evidenceUpgrade: false as const };
  assertForwardOutcome(caseRecord, outcome);
  return outcome;
}

export function calibrateForwardRecords(entries: Array<{ case: ForwardCase; outcome?: ForwardOutcome }>): ForwardCalibration {
  const ids = new Set<string>();
  const records = [...entries].sort((left, right) => left.case.caseId.localeCompare(right.case.caseId)).map((entry) => {
    if (ids.has(entry.case.caseId)) throw new Error(`Duplicate forward case: ${entry.case.caseId}`);
    ids.add(entry.case.caseId);
    assertForwardCase(entry.case);
    if (entry.case.decision === "abstain") {
      if (entry.outcome) throw new Error("An abstain case cannot have a hit/miss outcome");
      return { case: structuredClone(entry.case), status: "abstained" as const };
    }
    if (!entry.outcome) return { case: structuredClone(entry.case), status: "pending" as const };
    assertForwardOutcome(entry.case, entry.outcome);
    return { case: structuredClone(entry.case), outcome: structuredClone(entry.outcome), status: entry.outcome.kind };
  });
  const counts = {
    total: records.length,
    proposed: records.filter((record) => record.case.decision === "propose").length,
    resolved: records.filter((record) => ["hit", "miss"].includes(record.status)).length,
    hit: records.filter((record) => record.status === "hit").length,
    miss: records.filter((record) => record.status === "miss").length,
    nearMiss: records.filter((record) => record.status === "near_miss").length,
    inconclusive: records.filter((record) => record.status === "inconclusive").length,
    pending: records.filter((record) => record.status === "pending").length,
    abstained: records.filter((record) => record.status === "abstained").length,
  };
  const resolved = records.filter((record) => ["hit", "miss"].includes(record.status));
  const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const hitRate = counts.resolved ? counts.hit / counts.resolved : null;
  const meanConfidence = mean(resolved.map((record) => record.case.confidence!));
  return {
    schemaVersion: "physical-intuition-forward-calibration/v1",
    records,
    counts,
    hitRate,
    brierScore: mean(resolved.map((record) => (record.case.confidence! - (record.status === "hit" ? 1 : 0)) ** 2)),
    meanConfidence,
    confidenceGap: meanConfidence === null || hitRate === null ? null : meanConfidence - hitRate,
    coverage: counts.total ? counts.resolved / counts.total : null,
    abstentionRate: counts.total ? counts.abstained / counts.total : null,
    allOutcomesRecorded: counts.total > 0 && counts.pending === 0,
    evidenceUpgrade: false,
    boundaries: [
      "hit 只表示预先声明的判别条件被满足，不表示数学定理、物理定律或真实系统得到证明。",
      "只有 hit／miss 进入命中率和 Brier 分数；近 miss、无法判定、待揭示和弃权分别保留。",
      "时间和角色分离是本地审计元数据，不等于独立实验室复现；合成任务只能验证校准流程。",
    ],
  };
}
