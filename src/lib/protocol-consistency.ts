import { buildMethodLineageFromRequest, type MethodFingerprint } from "./method-lineage";
import type {
  EvidenceLevel,
  EvidenceLineageKind,
  MethodFacetKey,
  ProtocolRequest,
  VerificationStatus,
} from "./protocol-requests";

export type ProtocolConsistencyIssue = {
  kind: "method_status_without_complete_fingerprint";
  documentKey: string;
  documentTitle: string;
  fingerprintStatus: MethodFingerprint["status"];
  primaryEvidenceIds: string[];
  knownFields: MethodFacetKey[];
  detail: string;
} | {
  kind: "independent_wet_evidence_mismatch";
  documentKey: string;
  evidenceIds: string[];
  level: EvidenceLevel;
  verification: VerificationStatus;
  lineageKind: EvidenceLineageKind;
  detail: string;
};

/** 只报告可确定的内部矛盾，不根据模型意见或猜测自动修复。 */
export function buildProtocolConsistencyReport(request: ProtocolRequest) {
  const graph = buildMethodLineageFromRequest(request);
  const issues: ProtocolConsistencyIssue[] = [];
  for (const fingerprint of graph.methodFingerprints) {
    const document = request.documents.find((item) =>
      (item.documentChemblId || item.doi?.toLowerCase() || "") === fingerprint.documentKey);
    if (document?.methodStatus === "explicit_matched" && fingerprint.status !== "complete") {
      issues.push({
        kind: "method_status_without_complete_fingerprint",
        documentKey: fingerprint.documentKey,
        documentTitle: document.title,
        fingerprintStatus: fingerprint.status,
        primaryEvidenceIds: [...fingerprint.primaryEvidenceIds],
        knownFields: [...fingerprint.knownFields],
        detail: `文档声明 explicit_matched，但方法指纹为 ${fingerprint.status}；需要人工核对声明与原始材料，不自动修改 methodStatus。`,
      });
    }
  }
  for (const evidence of request.evidence) {
    const eligible = evidence.verification === "verified"
      && ["full_text", "protocol"].includes(evidence.level)
      && evidence.lineage?.kind === "primary";
    if (evidence.independentWetExperiment === true && !eligible) {
      issues.push({
        kind: "independent_wet_evidence_mismatch",
        documentKey: evidence.documentKey,
        evidenceIds: [evidence.id],
        level: evidence.level,
        verification: evidence.verification,
        lineageKind: evidence.lineage?.kind || "unspecified",
        detail: "独立湿实验标记缺少 primary／verified 的 full_text／protocol 依据；仅列为待复核，不自动清除标记。",
      });
    }
  }
  const methodStatusReviewCount = issues.filter((issue) => issue.kind === "method_status_without_complete_fingerprint").length;
  const independentWetReviewCount = issues.filter((issue) => issue.kind === "independent_wet_evidence_mismatch").length;
  return {
    requestId: request.id,
    issues,
    autoCorrections: [],
    summary: {
      documentCount: request.documents.length,
      evidenceCount: request.evidence.length,
      issueCount: issues.length,
      methodStatusReviewCount,
      independentWetReviewCount,
      autoCorrectionCount: 0,
      evidenceUpgrade: false as const,
    },
    evidenceUpgrade: false as const,
    boundaries: [
      "explicit_matched 必须与完整的 primary／verified 方法指纹一致；不一致只生成待复核项。",
      "独立湿实验标记必须有 primary／verified 的 full_text／protocol 依据。",
      "本检查不读取模型意见，不自动降级、清除标记、合并证据或修改原始请求。",
    ],
  };
}
