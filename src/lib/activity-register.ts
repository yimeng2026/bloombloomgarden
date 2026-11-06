import type { EvidenceLevel, EvidenceLineage, ProtocolRequest } from "./protocol-requests";

export const ACTIVITY_ENDPOINTS = ["Ki", "IC50", "Kd", "EC50", "other"] as const;
export const ACTIVITY_QUALIFIERS = [
  "exact", "less_than", "less_or_equal", "greater_than", "greater_or_equal", "approximate", "range",
] as const;
export const CONSTRUCT_KINDS = ["native", "recombinant", "synthetic", "other"] as const;

export interface ActivityRecord {
  id: string;
  endpoint: typeof ACTIVITY_ENDPOINTS[number];
  /** 原文字面值；不从它推导或覆盖可选的数值字段。 */
  valueRaw: string;
  valueNumber?: number;
  qualifier: typeof ACTIVITY_QUALIFIERS[number];
  /** 原始单位；不做 µM／nM 等换算。 */
  unit: string;
  targetSpecies: string;
  targetIsoform?: string;
  /** 仅指向同一证据内的 constructRecords.constructKey。 */
  constructRef?: string;
  replicatesRaw?: string;
}

export interface ConstructRecord {
  constructKey: string;
  name: string;
  kind: typeof CONSTRUCT_KINDS[number];
  species?: string;
  isoform?: string;
  expressionSystem?: string;
  modifications?: string[];
}

export interface ActivityEvidenceInput {
  level: EvidenceLevel;
  lineage?: EvidenceLineage;
  activityRecords?: ActivityRecord[];
  constructRecords?: ConstructRecord[];
}

export interface ActivityObservation extends ActivityRecord {
  sourceEvidenceId: string;
  documentKey: string;
  locator: string;
  sourceUrl: string;
  level: EvidenceLevel;
  verification: ProtocolRequest["evidence"][number]["verification"];
}

export interface ActivityRawValue {
  id: string;
  valueRaw: string;
  valueNumber?: number;
  qualifier: ActivityRecord["qualifier"];
  unit: string;
  sourceEvidenceId: string;
  documentKey: string;
  locator: string;
  sourceUrl: string;
  level: EvidenceLevel;
  verification: ActivityObservation["verification"];
}

const ACTIVITY_EVIDENCE_LEVELS: readonly EvidenceLevel[] = ["abstract", "partial_text", "full_text", "protocol"];

function requiredText(value: unknown, field: string, trim = true): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a non-empty string`);
  return trim ? value.trim() : value;
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return requiredText(value, field);
}

function normalizeConstructs(value: unknown): ConstructRecord[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error("constructRecords must be an array");
  const keys = new Set<string>();
  return value.map((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error(`constructRecords[${index}] must be an object`);
    const construct = record as ConstructRecord;
    const constructKey = requiredText(construct.constructKey, `constructRecords[${index}].constructKey`);
    if (keys.has(constructKey)) throw new Error(`constructKey must be unique within an evidence item: ${constructKey}`);
    keys.add(constructKey);
    if (!CONSTRUCT_KINDS.includes(construct.kind)) throw new Error(`Invalid construct kind: ${construct.kind}`);
    if (construct.modifications !== undefined && (!Array.isArray(construct.modifications)
      || construct.modifications.some((item) => typeof item !== "string" || !item.trim()))) {
      throw new Error("construct modifications must be an array of non-empty strings");
    }
    return {
      constructKey,
      name: requiredText(construct.name, `constructRecords[${index}].name`),
      kind: construct.kind,
      species: optionalText(construct.species, `constructRecords[${index}].species`),
      isoform: optionalText(construct.isoform, `constructRecords[${index}].isoform`),
      expressionSystem: optionalText(construct.expressionSystem, `constructRecords[${index}].expressionSystem`),
      modifications: construct.modifications?.map((item) => item.trim()),
    };
  });
}

function normalizeActivities(value: unknown, constructKeys: Set<string>): ActivityRecord[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error("activityRecords must be an array");
  const ids = new Set<string>();
  return value.map((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error(`activityRecords[${index}] must be an object`);
    const activity = record as ActivityRecord;
    const id = requiredText(activity.id, `activityRecords[${index}].id`);
    if (ids.has(id)) throw new Error(`activity id must be unique within an evidence item: ${id}`);
    ids.add(id);
    if (!ACTIVITY_ENDPOINTS.includes(activity.endpoint)) throw new Error(`Invalid activity endpoint: ${activity.endpoint}`);
    if (!ACTIVITY_QUALIFIERS.includes(activity.qualifier)) throw new Error(`Invalid activity qualifier: ${activity.qualifier}`);
    if (activity.valueNumber !== undefined && !Number.isFinite(activity.valueNumber)) {
      throw new Error("activity valueNumber must be finite when provided");
    }
    if (activity.qualifier === "range" && activity.valueNumber !== undefined) {
      throw new Error("A range activity cannot also provide valueNumber");
    }
    const constructRef = optionalText(activity.constructRef, `activityRecords[${index}].constructRef`);
    if (constructRef && !constructKeys.has(constructRef)) {
      throw new Error(`constructRef must reference a construct in the same evidence item: ${constructRef}`);
    }
    return {
      id,
      endpoint: activity.endpoint,
      valueRaw: requiredText(activity.valueRaw, `activityRecords[${index}].valueRaw`, false),
      valueNumber: activity.valueNumber,
      qualifier: activity.qualifier,
      unit: requiredText(activity.unit, `activityRecords[${index}].unit`, false),
      targetSpecies: requiredText(activity.targetSpecies, `activityRecords[${index}].targetSpecies`),
      targetIsoform: optionalText(activity.targetIsoform, `activityRecords[${index}].targetIsoform`),
      constructRef,
      replicatesRaw: optionalText(activity.replicatesRaw, `activityRecords[${index}].replicatesRaw`),
    };
  });
}

/** 校验证据内的活性与构建字段，不读取外部本体，不补全别名或实验事实。 */
export function validateActivityEvidence(input: ActivityEvidenceInput) {
  const constructRecords = normalizeConstructs(input.constructRecords);
  const activityRecords = normalizeActivities(input.activityRecords, new Set((constructRecords || []).map((item) => item.constructKey)));
  if ((activityRecords?.length || constructRecords?.length)
    && (input.lineage?.kind !== "primary" || !ACTIVITY_EVIDENCE_LEVELS.includes(input.level))) {
    throw new Error("Activity and construct records require primary lineage and abstract, partial_text, full_text or protocol evidence");
  }
  return { activityRecords, constructRecords };
}

export function buildActivityRegisterFromRequest(request: ProtocolRequest) {
  const records: ActivityObservation[] = request.evidence.flatMap((evidence) =>
    (Array.isArray(evidence.activityRecords) ? evidence.activityRecords : []).map((activity) => ({
      ...activity,
      sourceEvidenceId: evidence.id,
      documentKey: evidence.documentKey,
      locator: evidence.locator,
      sourceUrl: evidence.sourceUrl,
      level: evidence.level,
      verification: evidence.verification,
    })));
  const groups = new Map<string, {
    groupKey: string;
    endpoint: ActivityRecord["endpoint"];
    unit: string;
    targetSpecies: string;
    targetIsoform?: string;
    constructRef?: string;
    rawValues: ActivityRawValue[];
  }>();
  for (const record of records) {
    const dimensions = {
      endpoint: record.endpoint,
      unit: record.unit.trim(),
      targetSpecies: record.targetSpecies.trim(),
      targetIsoform: record.targetIsoform?.trim(),
      constructRef: record.constructRef?.trim(),
    };
    const groupKey = JSON.stringify([
      dimensions.endpoint, dimensions.unit, dimensions.targetSpecies, dimensions.targetIsoform || "", dimensions.constructRef || "",
    ]);
    const rawValue: ActivityRawValue = {
      id: record.id,
      valueRaw: record.valueRaw,
      valueNumber: record.valueNumber,
      qualifier: record.qualifier,
      unit: record.unit,
      sourceEvidenceId: record.sourceEvidenceId,
      documentKey: record.documentKey,
      locator: record.locator,
      sourceUrl: record.sourceUrl,
      level: record.level,
      verification: record.verification,
    };
    const group = groups.get(groupKey);
    if (group) group.rawValues.push(rawValue);
    else groups.set(groupKey, { groupKey, ...dimensions, rawValues: [rawValue] });
  }
  const independentWetExperimentCount = request.evidence.filter((evidence) =>
    evidence.verification === "verified"
    && ["full_text", "protocol"].includes(evidence.level)
    && evidence.lineage?.kind === "primary"
    && evidence.independentWetExperiment === true).length;
  const boundaries = [
    "valueRaw、qualifier 和 unit 原样保留；不做单位换算，不用 valueNumber 替代原文。",
    "Ki、IC50、Kd、EC50 不互相换算、不排名；不计算跨观测均值或中位数。",
    "仅按精确修剪后的 endpoint／unit／targetSpecies／targetIsoform／constructRef 分组，不推断别名或跨文献构建同一性。",
    "活性记录不等于独立湿实验；只有 verified 的 primary full_text／protocol 且明确标记独立湿实验才计数。",
    "本登记不提升证据等级，也不推断实验真实性、可复现性或理论正确性。",
  ];
  return {
    requestId: request.id,
    records,
    groups: [...groups.values()],
    summary: {
      recordCount: records.length,
      groupCount: groups.size,
      rangeCount: records.filter((record) => record.qualifier === "range").length,
      independentWetExperimentCount,
      evidenceUpgrade: false as const,
    },
    evidenceUpgrade: false as const,
    boundaries,
  };
}
