import {
  buildProtocolFollowups,
  protocolFollowupKey,
  type ProtocolFollowup,
  type ProtocolFollowupInput,
} from "./protocol-followups";
import type { ProtocolRequest } from "./protocol-requests";

export interface ProtocolFollowupBaseline {
  requestId: string;
  followups: ProtocolFollowupInput[];
}

type ResolvedFollowup = ProtocolFollowupInput & {
  followupKey: string;
  status: "satisfied";
  resolution: {
    type: "context_reference_registered";
    referenceKind: "compoundIdentity" | "assayContext";
    reference: string;
    evidenceId: string;
    derivedFromEvidenceId: string;
    activityId: string;
    locator: string;
    sourceUrl: string;
    level: string;
    verification: string;
  };
};

/** 比较显式基线与当前证据；不写回基线，也不把求援消失当作事实成立。 */
export function reconcileProtocolFollowups(request: ProtocolRequest, previous: ProtocolFollowupBaseline) {
  if (!previous || previous.requestId !== request.id || !Array.isArray(previous.followups)) {
    throw new Error("Baseline requestId must match the current request and include a followups array");
  }
  const current = buildProtocolFollowups(request);
  const currentKeys = new Set(current.followups.map((item) => item.followupKey));
  const previousKeys = new Set<string>();
  const resolvedKeys = new Set<string>();
  const resolvedFollowups: ResolvedFollowup[] = [];
  const reviewRequired: Array<{ followupKey: string; kind: ProtocolFollowup["kind"]; reason: string }> = [];

  for (const item of previous.followups) {
    const followupKey = protocolFollowupKey(request.id, item);
    if (previousKeys.has(followupKey)) throw new Error(`Duplicate previous followupKey: ${followupKey}`);
    previousKeys.add(followupKey);

    if (item.kind !== "activity_context") {
      if (!currentKeys.has(followupKey)) {
        reviewRequired.push({
          followupKey,
          kind: item.kind,
          reason: "该求援不再出现于当前结果，但原文、方法和冲突求援不能凭消失自动核销",
        });
      }
      continue;
    }

    const previousActivity = item.activityRef!;
    const candidates = request.evidence.filter((evidence) =>
      evidence.documentKey === item.documentKey
      && evidence.verification === "verified"
      && ["full_text", "protocol"].includes(evidence.level)
      && evidence.lineage?.kind === "primary"
      && (evidence.id === previousActivity.evidenceId
        || evidence.lineage.derivedFromEvidenceIds?.includes(previousActivity.evidenceId)));
    let resolution: ResolvedFollowup["resolution"] | undefined;
    for (const evidence of candidates) {
      const activity = evidence.activityRecords?.find((record) => record.id === previousActivity.activityId);
      const reference = item.contextField === "compoundIdentity" ? activity?.compoundRef : activity?.assayRef;
      if (activity && reference?.trim()) {
        resolution = {
          type: "context_reference_registered",
          referenceKind: item.contextField!,
          reference: reference.trim(),
          evidenceId: evidence.id,
          derivedFromEvidenceId: previousActivity.evidenceId,
          activityId: activity.id,
          locator: evidence.locator,
          sourceUrl: evidence.sourceUrl,
          level: evidence.level,
          verification: evidence.verification,
        };
        break;
      }
    }
    if (resolution) {
      resolvedKeys.add(followupKey);
      resolvedFollowups.push({ ...item, followupKey, status: "satisfied", resolution });
    } else if (!currentKeys.has(followupKey)) {
      reviewRequired.push({
        followupKey,
        kind: item.kind,
        reason: "原证据、活性记录或合格的派生上下文已不可确认，不能视为补证完成",
      });
    }
  }

  const openFollowups = current.followups.filter((item) => !resolvedKeys.has(item.followupKey));
  return {
    ...current,
    followups: openFollowups,
    summary: {
      ...current.summary,
      sourceDocumentRequestCount: openFollowups.filter((item) => item.kind === "source_document").length,
      missingFacetCount: openFollowups.filter((item) => item.kind === "method_facet").length,
      conflictFacetCount: openFollowups.filter((item) => item.kind === "resolve_conflict").length,
      activityContextRequestCount: openFollowups.filter((item) => item.kind === "activity_context").length,
      missingCompoundRequestCount: openFollowups.filter((item) => item.kind === "activity_context" && item.contextField === "compoundIdentity").length,
      missingAssayRequestCount: openFollowups.filter((item) => item.kind === "activity_context" && item.contextField === "assayContext").length,
      followupCount: openFollowups.length,
      resolvedFollowupCount: resolvedFollowups.length,
      reviewRequiredPreviousCount: reviewRequired.length,
      evidenceUpgrade: false as const,
    },
    reconciliation: {
      previousFollowupCount: previous.followups.length,
      resolvedFollowups,
      reviewRequired,
    },
    evidenceUpgrade: false as const,
    boundaries: [
      ...current.boundaries,
      "核销只比较显式历史基线与当前登记证据，不读取发送回执或模型意见作为实验事实。",
      "活性上下文只可由同一证据或显式派生的 primary／verified full_text／protocol 中的实际引用核销。",
      "证据消失、来源降级、引用仍缺失以及非上下文求援消失都进入人工复核，不自动视为解决。",
      "resolvedFollowups 表示求援条件已补全，不表示实验独立、结果真实、理论成立或证据等级提升。",
    ],
  };
}
