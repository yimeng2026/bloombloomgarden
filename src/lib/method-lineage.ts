import { getProtocolRequest, METHOD_FACET_FIELDS, type MethodFacetKey, type ProtocolEvidence, type ProtocolRequest } from "./protocol-requests";

export interface MethodFingerprint {
  documentKey: string;
  status: "complete" | "insufficient" | "conflict";
  fields: Partial<Record<MethodFacetKey, string[]>>;
  knownFields: MethodFacetKey[];
  unknownFields: MethodFacetKey[];
  conflictFields: MethodFacetKey[];
  primaryEvidenceIds: string[];
}

export interface MethodComparison {
  left: string;
  right: string;
  verdict: "method_match_candidate" | "method_mismatch" | "insufficient" | "conflict";
  reason: string;
}

export function buildMethodLineageFromRequest(request: ProtocolRequest) {
  const documentKey = (document: ProtocolRequest["documents"][number]) => document.documentChemblId || document.doi?.toLowerCase() || "";
  const nodes = [
    ...request.documents.map((document) => ({ id: documentKey(document), type: "document", title: document.title, methodStatus: document.methodStatus, doi: document.doi })),
    ...request.evidence.map((evidence) => ({
      id: evidence.id,
      type: "evidence",
      documentKey: evidence.documentKey,
      level: evidence.level,
      verification: evidence.verification,
      sourceUrl: evidence.sourceUrl,
      locator: evidence.locator,
      quote: evidence.quote,
      lineage: evidence.lineage || { kind: "unspecified" },
      methodFacet: evidence.methodFacet,
      independentWetExperiment: evidence.independentWetExperiment === true,
    })),
  ];
  const evidenceIds = new Set(request.evidence.map((evidence) => evidence.id));
  const edges = [
    ...request.evidence.map((evidence) => ({ from: evidence.id, to: evidence.documentKey, type: "DESCRIBES" })),
    ...request.evidence.flatMap((evidence) => (evidence.lineage?.derivedFromEvidenceIds || [])
      .filter((parentId) => evidenceIds.has(parentId))
      .map((parentId) => ({ from: evidence.id, to: parentId, type: "DERIVED_FROM" }))),
  ];
  const isPrimaryMethod = (evidence: ProtocolEvidence) => evidence.verification === "verified"
    && ["full_text", "protocol"].includes(evidence.level)
    && evidence.lineage?.kind === "primary";

  const methodFingerprints: MethodFingerprint[] = request.documents.map((document) => {
    const key = documentKey(document);
    const primary = request.evidence.filter((evidence) => evidence.documentKey === key && isPrimaryMethod(evidence));
    const fields: MethodFingerprint["fields"] = {};
    for (const field of METHOD_FACET_FIELDS) {
      const values = new Set(primary.map((evidence) => evidence.methodFacet?.[field]?.trim()).filter((value): value is string => Boolean(value)));
      if (values.size) fields[field] = [...values];
    }
    const knownFields = METHOD_FACET_FIELDS.filter((field) => (fields[field]?.length || 0) > 0);
    const unknownFields = METHOD_FACET_FIELDS.filter((field) => !fields[field]?.length);
    const conflictFields = METHOD_FACET_FIELDS.filter((field) => (fields[field]?.length || 0) > 1);
    return {
      documentKey: key,
      status: conflictFields.length ? "conflict" : unknownFields.length ? "insufficient" : "complete",
      fields,
      knownFields,
      unknownFields,
      conflictFields,
      primaryEvidenceIds: primary.map((evidence) => evidence.id),
    };
  });

  const comparisons: MethodComparison[] = [];
  for (let left = 0; left < methodFingerprints.length; left++) {
    for (let right = left + 1; right < methodFingerprints.length; right++) {
      const a = methodFingerprints[left];
      const b = methodFingerprints[right];
      if (a.status === "conflict" || b.status === "conflict") {
        comparisons.push({ left: a.documentKey, right: b.documentKey, verdict: "conflict", reason: "至少一个文档存在互相冲突的原始方法字段" });
      } else if (a.status !== "complete" || b.status !== "complete") {
        comparisons.push({ left: a.documentKey, right: b.documentKey, verdict: "insufficient", reason: "目标原始方法字段不完整；外部方法、同值和模型意见不能补齐" });
      } else {
        const different = METHOD_FACET_FIELDS.filter((field) => a.fields[field]![0].trim().toLowerCase() !== b.fields[field]![0].trim().toLowerCase());
        comparisons.push({
          left: a.documentKey,
          right: b.documentKey,
          verdict: different.length ? "method_mismatch" : "method_match_candidate",
          reason: different.length ? `明确不同字段：${different.join(", ")}` : "完整字段一致，仅为方法匹配候选；独立性仍需原始湿实验证据",
        });
      }
    }
  }
  const comparisonCounts: Record<string, number> = {};
  for (const comparison of comparisons) comparisonCounts[comparison.verdict] = (comparisonCounts[comparison.verdict] || 0) + 1;
  const independentWetExperimentCount = request.evidence.filter((evidence) => isPrimaryMethod(evidence) && evidence.independentWetExperiment === true).length;
  const externalContextExcluded = request.evidence.filter((evidence) => evidence.lineage?.kind === "context").length;
  return {
    requestId: request.id,
    generatedAt: new Date().toISOString(),
    nodes,
    edges,
    methodFingerprints,
    comparisons,
    summary: {
      documentCount: request.documents.length,
      evidenceCount: request.evidence.length,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      fingerprintCompleteCount: methodFingerprints.filter((item) => item.status === "complete").length,
      fingerprintConflictCount: methodFingerprints.filter((item) => item.status === "conflict").length,
      comparisonCount: comparisons.length,
      comparisonCounts,
      externalContextExcluded,
      independentWetExperimentCount,
      evidenceUpgrade: false,
    },
    boundaries: [
      "只有 verified 的 full_text／protocol 且 lineage.kind=primary 才进入目标方法指纹。",
      "方法匹配候选不等于独立湿实验；独立性必须有明确的原始实验依据。",
      "未登记的派生关系不做猜测，外部方法和相同参考值不补入目标文献。",
    ],
  };
}

export function buildMethodLineage(requestId: string) {
  return buildMethodLineageFromRequest(getProtocolRequest(requestId));
}
