import { canonicalJson } from "../protocol-followup-audit";
import { assertModelProposalReport, type IntuitionModelRole, type ModelMethodCard, type ModelProposalReport } from "./model-proposal";

export type PermissionStatus = "project_owned" | "licensed" | "public_domain" | "permission_granted" | "unverified" | "denied";
export interface MethodSourceRecord {
  sourceId: string;
  sourceUrl: string;
  authorLabel: string;
  recordState: "lead" | "reviewed";
  registeredAt?: string;
  publishedAt?: string;
  lastCheckedAt?: string;
  coverage: string;
  authorship: "source_author" | "project_reply" | "third_party" | "unknown";
  replyTo?: { url: string; relationship: "reply_to_source" | "project_reply" | "quoted_exchange" };
  excerpt?: { text: string; locator: string };
  permission: { status: PermissionStatus; identifier: string; evidenceLocator: string; notes?: string };
}
export interface DistillMethodCard extends ModelMethodCard {
  kind: "positive" | "negative" | "near_miss";
  problemFamily: string;
  sourceIds: string[];
  review: { status: "verified" | "pending" | "rejected"; reviewerId: string; reviewedAt: string };
}
export interface DistillCandidate {
  sampleId: string;
  problemFamily: string;
  teacherReport: ModelProposalReport;
  teacherRole: IntuitionModelRole;
  review: {
    reviewerId: string;
    sourceVerified: boolean;
    contradictionCheck: "passed" | "failed" | "pending";
    leakageCheck: "passed" | "failed" | "pending";
    claimMode: "method_only" | "hypothesis" | "fact";
  };
}
export interface DistillSample extends DistillCandidate {
  partition: "train" | "validation" | "test";
  methodCards: DistillMethodCard[];
  sourceIds: string[];
}
export interface DistillPreparation {
  schemaVersion: "physical-intuition-distill-preparation/v1";
  samples: DistillSample[];
  excluded: Array<{ sampleId: string; reasons: string[] }>;
  sources: Array<{ source: MethodSourceRecord; usable: boolean; reasons: string[] }>;
  partitionCounts: Record<"train" | "validation" | "test", number>;
  kindCounts: Record<"positive" | "negative" | "near_miss", number>;
  sourceAndLeakagePassed: boolean;
  readyForTraining: false;
  evidenceUpgrade: false;
  boundaries: string[];
}
export interface DistillPreparationInput {
  sources: MethodSourceRecord[];
  methodCards: DistillMethodCard[];
  candidates: DistillCandidate[];
  partitionAssignments: { trainProblemFamilies: string[]; validationProblemFamilies: string[]; testProblemFamilies: string[] };
  cutoffs: { trainBefore: string; validationBefore: string };
}

const ALLOWED_PERMISSIONS = new Set<PermissionStatus>(["project_owned", "licensed", "public_domain", "permission_granted"]);
const FINISH_REASONS = new Set(["stop", "completed", "end_turn"]);

type Partition = DistillSample["partition"];

function iso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try { return new Date(value).toISOString() === value; } catch { return false; }
}

function webUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

function uniqueBy<T>(items: T[], key: (item: T) => string, label: string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    const id = key(item);
    if (!id || map.has(id)) throw new Error(`Duplicate or empty ${label}: ${id}`);
    map.set(id, item);
  }
  return map;
}

function normalized(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function sourceReasons(source: MethodSourceRecord): string[] {
  const reasons: string[] = [];
  if (!/^[a-z0-9][a-z0-9-]*$/.test(source.sourceId) || !webUrl(source.sourceUrl) || !source.authorLabel?.trim() || !source.coverage?.trim()) reasons.push("invalid_source");
  if (source.recordState !== "reviewed") reasons.push("source_not_reviewed");
  const permission = source.permission?.status;
  if (!permission || !ALLOWED_PERMISSIONS.has(permission)) reasons.push(`permission_${permission || "unknown"}`);
  if (permission && ALLOWED_PERMISSIONS.has(permission) && (!source.permission.identifier?.trim() || !source.permission.evidenceLocator?.trim())) reasons.push("missing_permission_evidence");
  if (!source.excerpt?.text?.trim() || !source.excerpt.locator?.trim()) reasons.push("missing_source_excerpt");
  else if (source.excerpt.text.length > 2000) reasons.push("excerpt_too_long");
  if (source.recordState === "reviewed" && !iso(source.registeredAt)) reasons.push("invalid_registration_date");
  for (const value of [source.publishedAt, source.lastCheckedAt]) if (value !== undefined && !iso(value)) reasons.push("invalid_source_date");
  if (!["source_author", "project_reply", "third_party", "unknown"].includes(source.authorship)) reasons.push("invalid_authorship");
  if (source.replyTo && (!webUrl(source.replyTo.url) || !["reply_to_source", "project_reply", "quoted_exchange"].includes(source.replyTo.relationship))) reasons.push("invalid_reply_relationship");
  return [...new Set(reasons)];
}

function validateSplit(input: DistillPreparationInput): { byFamily: Map<string, Partition>; trainTime: number; validationTime: number } {
  if (!iso(input.cutoffs.trainBefore) || !iso(input.cutoffs.validationBefore)) throw new Error("Split cutoffs must be exact ISO timestamps");
  const trainTime = Date.parse(input.cutoffs.trainBefore);
  const validationTime = Date.parse(input.cutoffs.validationBefore);
  if (trainTime >= validationTime) throw new Error("trainBefore must precede validationBefore");
  const byFamily = new Map<string, Partition>();
  const groups: Array<[Partition, string[]]> = [
    ["train", input.partitionAssignments.trainProblemFamilies],
    ["validation", input.partitionAssignments.validationProblemFamilies],
    ["test", input.partitionAssignments.testProblemFamilies],
  ];
  for (const [partition, families] of groups) {
    for (const family of families) {
      if (!family.trim() || byFamily.has(family)) throw new Error(`Duplicate or empty problem family assignment: ${family}`);
      byFamily.set(family, partition);
    }
  }
  return { byFamily, trainTime, validationTime };
}

export function prepareDistillation(input: DistillPreparationInput): DistillPreparation {
  const sourceMap = uniqueBy(input.sources, (source) => source.sourceId, "source id");
  const cardMap = uniqueBy(input.methodCards, (card) => card.cardId, "method card id");
  uniqueBy(input.candidates, (candidate) => candidate.sampleId, "sample id");
  const split = validateSplit(input);
  const sourceAssessments = input.sources.map((source) => {
    const reasons = sourceReasons(source);
    return { source: structuredClone(source), usable: reasons.length === 0, reasons };
  });
  const assessmentBySource = new Map(sourceAssessments.map((assessment) => [assessment.source.sourceId, assessment]));
  const excluded: Array<{ sampleId: string; reasons: string[] }> = [];
  const provisional: DistillSample[] = [];
  const seenContent = new Set<string>();

  for (const candidate of [...input.candidates].sort((left, right) => left.sampleId.localeCompare(right.sampleId))) {
    const reasons = new Set<string>();
    let report: ModelProposalReport;
    try {
      assertModelProposalReport(candidate.teacherReport);
      if (!iso(candidate.teacherReport.generatedAt)) throw new Error("Teacher generatedAt must be exact ISO");
      report = candidate.teacherReport;
    } catch {
      excluded.push({ sampleId: candidate.sampleId, reasons: ["invalid_teacher_report"] });
      continue;
    }

    if (report.status !== "complete") reasons.add("incomplete_teacher");
    const teacher = report.exchanges.find((exchange) => exchange.role === candidate.teacherRole);
    const content = teacher?.content?.trim() || "";
    if (!content || !FINISH_REASONS.has(teacher?.finishReason || "") || teacher?.error) reasons.add("invalid_teacher_role");
    if (!candidate.review?.reviewerId?.trim() || candidate.review.sourceVerified !== true) reasons.add("independent_review_required");
    if (candidate.review?.contradictionCheck !== "passed") reasons.add("contradiction_unresolved");
    if (candidate.review?.leakageCheck !== "passed") reasons.add("leakage_screen_required");
    if (candidate.review?.claimMode !== "method_only") reasons.add("non_method_claim");
    if (report.evaluation.cards.some((card) => card.checks.some((check) => check.status === "fail"))) reasons.add("hard_constraint_failure");

    const usedCards: DistillMethodCard[] = [];
    if (!report.methodCards?.length) {
      reasons.add("missing_method_provenance");
    } else {
      for (const stored of report.methodCards) {
        const registered = cardMap.get(stored.cardId);
        if (!registered) {
          reasons.add("unknown_method_card");
          continue;
        }
        const snapshot = { cardId: registered.cardId, ruleText: registered.ruleText, applicability: registered.applicability };
        if (canonicalJson(stored) !== canonicalJson(snapshot)) reasons.add("method_provenance_mismatch");
        if (registered.review?.status !== "verified" || !registered.review.reviewerId?.trim() || !iso(registered.review.reviewedAt)) reasons.add("method_card_unverified");
        if (registered.problemFamily !== candidate.problemFamily) reasons.add("problem_family_mismatch");
        usedCards.push(registered);
      }
    }

    const sourceIds = new Set<string>();
    for (const card of usedCards) {
      if (!Array.isArray(card.sourceIds) || card.sourceIds.length === 0) {
        reasons.add("missing_source");
        continue;
      }
      for (const sourceId of card.sourceIds) {
        sourceIds.add(sourceId);
        if (!sourceMap.has(sourceId)) {
          reasons.add("unknown_source");
          continue;
        }
        for (const reason of assessmentBySource.get(sourceId)!.reasons) reasons.add(reason);
      }
    }

    const partition = split.byFamily.get(candidate.problemFamily);
    if (!partition) reasons.add("unassigned_problem_family");
    const generatedTime = Date.parse(report.generatedAt);
    if (partition) {
      const timeValid = partition === "train"
        ? generatedTime < split.trainTime
        : partition === "validation"
          ? generatedTime >= split.trainTime && generatedTime < split.validationTime
          : generatedTime >= split.validationTime;
      if (!timeValid) reasons.add("time_leakage");
    }

    if (reasons.size === 0) {
      const fingerprint = normalized(content);
      if (seenContent.has(fingerprint)) reasons.add("duplicate_content");
      else {
        seenContent.add(fingerprint);
        provisional.push({
          ...structuredClone(candidate),
          partition: partition!,
          methodCards: structuredClone(usedCards),
          sourceIds: [...sourceIds].sort(),
        });
      }
    }
    if (reasons.size > 0) excluded.push({ sampleId: candidate.sampleId, reasons: [...reasons] });
  }

  const partitionsBySource = new Map<string, Set<Partition>>();
  for (const sample of provisional) {
    for (const sourceId of sample.sourceIds) {
      const partitions = partitionsBySource.get(sourceId) || new Set<Partition>();
      partitions.add(sample.partition);
      partitionsBySource.set(sourceId, partitions);
    }
  }
  const leakedSources = new Set([...partitionsBySource].filter(([, partitions]) => partitions.size > 1).map(([sourceId]) => sourceId));
  const samples: DistillSample[] = [];
  for (const sample of provisional) {
    if (sample.sourceIds.some((sourceId) => leakedSources.has(sourceId))) {
      excluded.push({ sampleId: sample.sampleId, reasons: ["source_leakage"] });
    } else samples.push(sample);
  }

  const partitionCounts: Record<Partition, number> = { train: 0, validation: 0, test: 0 };
  const kindCounts: DistillPreparation["kindCounts"] = { positive: 0, negative: 0, near_miss: 0 };
  for (const sample of samples) {
    partitionCounts[sample.partition] += 1;
    for (const kind of new Set(sample.methodCards.map((card) => card.kind))) kindCounts[kind] += 1;
  }
  const sourceAndLeakagePassed = partitionCounts.train > 0 && partitionCounts.validation > 0 && partitionCounts.test > 0;
  return {
    schemaVersion: "physical-intuition-distill-preparation/v1",
    samples,
    excluded,
    sources: sourceAssessments,
    partitionCounts,
    kindCounts,
    sourceAndLeakagePassed,
    readyForTraining: false,
    evidenceUpgrade: false,
    boundaries: [
      "样本通过来源和泄漏筛选不等于允许训练；前瞻校准和独立评测仍未完成。",
      "教师意见只作为方法工作流候选，不作为数学定理、物理事实或真实用户立场。",
      "负例和近 miss 保留类型标签；模型投票不能替代来源、硬约束和独立复核。",
    ],
  };
}
