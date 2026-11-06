import { buildActivityRegisterFromRequest } from "./activity-register";
import type { ProtocolRequest } from "./protocol-requests";

type ActivityGraphNode = {
  id: string;
  type: "protocol_document" | "protocol_evidence" | "activity_observation" | "experimental_construct" | "test_compound" | "assay_context";
  [key: string]: unknown;
};

type ActivityGraphEdge = {
  from: string;
  to: string;
  type: "DESCRIBES" | "REPORTS_ACTIVITY" | "USES_CONSTRUCT" | "DEFINES_CONSTRUCT"
    | "DEFINES_COMPOUND" | "DEFINES_ASSAY" | "TESTS_COMPOUND" | "MEASURED_IN_ASSAY";
};

function scopedId(kind: string, ...parts: string[]) {
  return `${kind}:${parts.map((part) => encodeURIComponent(part)).join(":")}`;
}

/**
 * 将活性登记投影为 GraphRAG 可读取的证据子图。
 * 不写共享实体库，不经过模型抽取，也不按名称合并观测或实验上下文。
 */
export function buildActivityGraphFromRequest(request: ProtocolRequest) {
  const register = buildActivityRegisterFromRequest(request);
  const evidenceRecords = request.evidence.filter((evidence) =>
    (Array.isArray(evidence.activityRecords) && evidence.activityRecords.length > 0)
    || (Array.isArray(evidence.constructRecords) && evidence.constructRecords.length > 0)
    || (Array.isArray(evidence.compoundRecords) && evidence.compoundRecords.length > 0)
    || (Array.isArray(evidence.assayRecords) && evidence.assayRecords.length > 0));
  const nodes: ActivityGraphNode[] = [];
  const edges: ActivityGraphEdge[] = [];
  const documentIds = new Map<string, string>();
  const constructIds = new Map<string, string>();
  const compoundIds = new Map<string, string>();
  const assayIds = new Map<string, string>();
  let constructCount = 0;
  let compoundCount = 0;
  let assayCount = 0;

  for (const evidence of evidenceRecords) {
    let documentId = documentIds.get(evidence.documentKey);
    if (!documentId) {
      documentId = scopedId("document", evidence.documentKey);
      documentIds.set(evidence.documentKey, documentId);
      const document = request.documents.find((item) =>
        (item.documentChemblId || item.doi?.toLowerCase() || "") === evidence.documentKey);
      nodes.push({
        id: documentId,
        type: "protocol_document",
        documentKey: evidence.documentKey,
        title: document?.title || evidence.documentKey,
        methodStatus: document?.methodStatus,
        documentChemblId: document?.documentChemblId,
        doi: document?.doi,
      });
    }
    const evidenceId = scopedId("evidence", evidence.id);
    nodes.push({
      id: evidenceId,
      type: "protocol_evidence",
      evidenceId: evidence.id,
      documentKey: evidence.documentKey,
      sourceUrl: evidence.sourceUrl,
      locator: evidence.locator,
      quote: evidence.quote,
      coverage: evidence.coverage,
      level: evidence.level,
      verification: evidence.verification,
      lineage: evidence.lineage || { kind: "unspecified" },
      independentWetExperiment: evidence.independentWetExperiment === true,
    });
    edges.push({ from: evidenceId, to: documentId, type: "DESCRIBES" });

    for (const construct of evidence.constructRecords || []) {
      const constructId = scopedId("construct", evidence.id, construct.constructKey);
      constructIds.set(JSON.stringify([evidence.id, construct.constructKey]), constructId);
      constructCount += 1;
      nodes.push({
        id: constructId,
        type: "experimental_construct",
        ...construct,
        sourceEvidenceId: evidence.id,
        documentKey: evidence.documentKey,
        sourceUrl: evidence.sourceUrl,
        locator: evidence.locator,
        level: evidence.level,
        verification: evidence.verification,
      });
      edges.push({ from: evidenceId, to: constructId, type: "DEFINES_CONSTRUCT" });
    }
    for (const compound of evidence.compoundRecords || []) {
      const compoundId = scopedId("compound", evidence.id, compound.compoundKey);
      compoundIds.set(JSON.stringify([evidence.id, compound.compoundKey]), compoundId);
      compoundCount += 1;
      nodes.push({
        id: compoundId,
        type: "test_compound",
        ...compound,
        sourceEvidenceId: evidence.id,
        documentKey: evidence.documentKey,
        sourceUrl: evidence.sourceUrl,
        locator: evidence.locator,
        level: evidence.level,
        verification: evidence.verification,
      });
      edges.push({ from: evidenceId, to: compoundId, type: "DEFINES_COMPOUND" });
    }
    for (const assay of evidence.assayRecords || []) {
      const assayId = scopedId("assay", evidence.id, assay.assayKey);
      assayIds.set(JSON.stringify([evidence.id, assay.assayKey]), assayId);
      assayCount += 1;
      nodes.push({
        id: assayId,
        type: "assay_context",
        ...assay,
        sourceEvidenceId: evidence.id,
        documentKey: evidence.documentKey,
        sourceUrl: evidence.sourceUrl,
        locator: evidence.locator,
        level: evidence.level,
        verification: evidence.verification,
      });
      edges.push({ from: evidenceId, to: assayId, type: "DEFINES_ASSAY" });
    }
  }

  const groupKeys = new Map<string, string>();
  for (const group of register.groups) {
    for (const rawValue of group.rawValues) {
      groupKeys.set(JSON.stringify([rawValue.sourceEvidenceId, rawValue.id]), group.groupKey);
    }
  }
  for (const record of register.records) {
    const activityId = scopedId("activity", record.sourceEvidenceId, record.id);
    nodes.push({
      ...record,
      id: activityId,
      type: "activity_observation",
      groupKey: groupKeys.get(JSON.stringify([record.sourceEvidenceId, record.id])),
    });
    edges.push({
      from: scopedId("evidence", record.sourceEvidenceId),
      to: activityId,
      type: "REPORTS_ACTIVITY",
    });
    if (record.constructRef) {
      const constructId = constructIds.get(JSON.stringify([record.sourceEvidenceId, record.constructRef]));
      if (!constructId) {
        throw new Error(`Unknown constructRef in evidence ${record.sourceEvidenceId}: ${record.constructRef}`);
      }
      edges.push({ from: activityId, to: constructId, type: "USES_CONSTRUCT" });
    }
    if (record.compoundRef) {
      const compoundId = compoundIds.get(JSON.stringify([record.sourceEvidenceId, record.compoundRef]));
      if (!compoundId) {
        throw new Error(`Unknown compoundRef in evidence ${record.sourceEvidenceId}: ${record.compoundRef}`);
      }
      edges.push({ from: activityId, to: compoundId, type: "TESTS_COMPOUND" });
    }
    if (record.assayRef) {
      const assayId = assayIds.get(JSON.stringify([record.sourceEvidenceId, record.assayRef]));
      if (!assayId) {
        throw new Error(`Unknown assayRef in evidence ${record.sourceEvidenceId}: ${record.assayRef}`);
      }
      edges.push({ from: activityId, to: assayId, type: "MEASURED_IN_ASSAY" });
    }
  }

  return {
    requestId: request.id,
    nodes,
    edges,
    summary: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      evidenceCount: evidenceRecords.length,
      activityObservationCount: register.summary.recordCount,
      constructCount,
      compoundCount,
      assayCount,
      independentWetExperimentCount: register.summary.independentWetExperimentCount,
      evidenceUpgrade: false as const,
    },
    graphRag: {
      mode: "read_only_evidence_projection" as const,
      identity: "evidence_scoped" as const,
      persistentWrite: false as const,
      modelExtraction: false as const,
      entityNameMerging: false as const,
    },
    evidenceUpgrade: false as const,
    boundaries: [
      "这是只读证据投影，不写入共享 GraphRAG 实体库，也不调用模型补全实体或关系。",
      "活性与实验上下文节点以证据 ID 为作用域；相同名称、数值或局部 key 不表示跨证据同一实体。",
      "groupKey 只连接精确字段相同的观测分组，不是实体同一性、单位换算或活性排名结论。",
      "constructRef、compoundRef、assayRef 只在所属证据内解析；未引用定义仍保留来源，悬空引用直接拒绝。",
      "受试化合物不等于靶点；外部标识不自动解析结构，测定体系不自动补齐实验条件。",
      "图投影不改变证据等级，也不由活性节点推断独立湿实验。",
    ],
  };
}
