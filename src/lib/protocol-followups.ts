import { buildMethodLineageFromRequest } from "./method-lineage";
import { METHOD_FACET_FIELDS, type EvidenceLineageKind, type MethodFacetKey, type ProtocolRequest } from "./protocol-requests";

const FIELD_LABELS: Record<MethodFacetKey, string> = {
  assayFamily: "实验体系与测定类型",
  instrument: "仪器型号与关键设置",
  substrate: "底物、浓度与配制",
  readout: "读出方式与检测信号",
  enzymeSource: "酶来源与构建信息",
  pH: "pH 与缓冲体系",
  temperature: "温度",
  incubation: "孵育时间与条件",
  kiCalculation: "Ki 计算方法、拟合模型与参数",
  replicates: "独立重复次数及重复定义",
};

export interface ProtocolFollowup {
  kind: "source_document" | "method_facet" | "resolve_conflict";
  documentKey: string;
  documentTitle: string;
  field?: MethodFacetKey;
  ask: string;
  evidenceIds: string[];
  locators: Array<{ evidenceId: string; locator: string; sourceUrl: string; level: string; lineageKind: EvidenceLineageKind; coverage: string }>;
  existingValues?: string[];
  targetPrimaryEvidenceIds?: string[];
  citationEvidenceIds?: string[];
  contextEvidenceIds?: string[];
  curationEvidenceIds?: string[];
}

export function buildProtocolFollowups(request: ProtocolRequest) {
  const graph = buildMethodLineageFromRequest(request);
  const followups: ProtocolFollowup[] = [];
  for (const fingerprint of graph.methodFingerprints) {
    const document = request.documents.find((item) => (item.documentChemblId || item.doi?.toLowerCase()) === fingerprint.documentKey);
    if (!document) continue;
    const documentEvidence = request.evidence.filter((item) => item.documentKey === fingerprint.documentKey);
    const locators = documentEvidence.map((item) => ({
      evidenceId: item.id,
      locator: item.locator,
      sourceUrl: item.sourceUrl,
      level: item.level,
      lineageKind: item.lineage?.kind || "unspecified",
      coverage: item.coverage,
    }));
    if (fingerprint.primaryEvidenceIds.length === 0) {
      const citationNeeded = documentEvidence.some((item) => item.lineage?.kind === "citation");
      followups.push({
        kind: "source_document",
        documentKey: fingerprint.documentKey,
        documentTitle: document.title,
        ask: `请提供《${document.title}》的原始全文或实验方法页，并保留页码、段落或 supplement 定位。当前没有可用于方法指纹的 primary／verified 原始协议，不能用引用、数据库或外部方法替代。${citationNeeded ? "还需追溯文中转引的早期文献原始出处，不能把转引当作原始协议。" : ""}`,
        evidenceIds: documentEvidence.map((item) => item.id),
        locators,
        targetPrimaryEvidenceIds: documentEvidence.filter((item) => item.lineage?.kind === "primary").map((item) => item.id),
        citationEvidenceIds: documentEvidence.filter((item) => item.lineage?.kind === "citation").map((item) => item.id),
        contextEvidenceIds: documentEvidence.filter((item) => ["context", "lead", "correspondence", "unspecified"].includes(item.lineage?.kind || "unspecified")).map((item) => item.id),
        curationEvidenceIds: documentEvidence.filter((item) => item.lineage?.kind === "curation").map((item) => item.id),
      });
      continue;
    }
    for (const field of METHOD_FACET_FIELDS.filter((key) => fingerprint.unknownFields.includes(key))) {
      followups.push({
        kind: "method_facet",
        documentKey: fingerprint.documentKey,
        documentTitle: document.title,
        field,
        ask: `请提供《${document.title}》原始方法部分中“${FIELD_LABELS[field]}”的原文、数值（如适用）、单位和页码／段落定位。已有原始材料未覆盖该字段，请勿用常见实验条件或其他文献补齐。`,
        evidenceIds: fingerprint.primaryEvidenceIds,
        locators: locators.filter((item) => fingerprint.primaryEvidenceIds.includes(item.evidenceId)),
      });
    }
    for (const field of METHOD_FACET_FIELDS.filter((key) => fingerprint.conflictFields.includes(key))) {
      const existingValues = fingerprint.fields[field] || [];
      followups.push({
        kind: "resolve_conflict",
        documentKey: fingerprint.documentKey,
        documentTitle: document.title,
        field,
        ask: `《${document.title}》的原始记录中，“${FIELD_LABELS[field]}”存在不同值：${existingValues.join("、")}。请核对原文及各版本，确认它们是否属于不同实验条件，并提供对应定位；澄清前不选定其中一个作为事实。`,
        evidenceIds: fingerprint.primaryEvidenceIds,
        locators: locators.filter((item) => fingerprint.primaryEvidenceIds.includes(item.evidenceId)),
        existingValues,
      });
    }
  }
  return {
    requestId: request.id,
    generatedAt: new Date().toISOString(),
    followups,
    methodFingerprints: graph.methodFingerprints,
    summary: {
      documentCount: graph.methodFingerprints.length,
      sourceDocumentRequestCount: followups.filter((item) => item.kind === "source_document").length,
      missingFacetCount: followups.filter((item) => item.kind === "method_facet").length,
      conflictFacetCount: followups.filter((item) => item.kind === "resolve_conflict").length,
      followupCount: followups.length,
      evidenceUpgrade: false,
    },
    evidenceUpgrade: false,
    boundaries: [
      "求援项由已登记证据确定性生成，不由模型补写。",
      "缺少原始协议时先取原文；有原始协议后才逐字段求缺。",
      "冲突值并列保留，澄清前不选定事实；求援本身不提升证据等级。",
    ],
  };
}
