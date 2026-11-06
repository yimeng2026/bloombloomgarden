import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  validateActivityEvidence,
  type ActivityRecord,
  type AssayRecord,
  type CompoundRecord,
  type ConstructRecord,
} from "./activity-register";
import { getScenario } from "./research-scenarios";

export type ProtocolRequestStatus = "draft" | "ready" | "sent" | "answered" | "bounced" | "closed_unavailable" | "complete";
export type EvidenceLevel = "lead" | "metadata" | "abstract" | "partial_text" | "full_text" | "protocol";
export type VerificationStatus = "unverified" | "verified" | "rejected";
export type MethodStatus = "explicit_matched" | "method_incomplete";
export type WorkItemStatus = "pending" | "in_progress" | "blocked" | "done";

export interface ProtocolDocument {
  documentChemblId?: string;
  doi?: string;
  title: string;
  methodStatus: MethodStatus;
  methodNote?: string;
}

export interface ProtocolContact {
  name: string;
  email?: string;
  channel: string;
  url?: string;
}

export interface ProtocolWorkItem {
  id: string;
  title: string;
  kind: string;
  integration: string;
  purpose: string;
  status: WorkItemStatus;
  note?: string;
}

export interface ProtocolReceipt {
  id: string;
  type: "sent" | "response" | "bounce" | "note";
  channel: string;
  occurredAt: string;
  note: string;
}

export const METHOD_FACET_FIELDS = [
  "assayFamily", "instrument", "substrate", "readout", "enzymeSource",
  "pH", "temperature", "incubation", "kiCalculation", "replicates",
] as const;
export type MethodFacetKey = typeof METHOD_FACET_FIELDS[number];
export type MethodFacet = Partial<Record<MethodFacetKey, string>>;
export type EvidenceLineageKind = "primary" | "citation" | "curation" | "context" | "correspondence" | "lead" | "unspecified";
export interface EvidenceLineage {
  kind: EvidenceLineageKind;
  derivedFromEvidenceIds?: string[];
}

export interface ProtocolEvidence {
  id: string;
  documentKey: string;
  level: EvidenceLevel;
  verification: VerificationStatus;
  sourceUrl: string;
  locator: string;
  quote: string;
  coverage: string;
  note?: string;
  methodStatus?: MethodStatus;
  independentWetExperiment?: boolean;
  /** 只登记原文明确支持的来源角色和派生关系，不由模型推断。 */
  lineage?: EvidenceLineage;
  /** 原文字面值，不做跨文献方法补齐或单位换算。 */
  methodFacet?: MethodFacet;
  /** 原始活性观测；所有实验上下文引用只在同一证据内解析。 */
  activityRecords?: ActivityRecord[];
  constructRecords?: ConstructRecord[];
  compoundRecords?: CompoundRecord[];
  assayRecords?: AssayRecord[];
  createdAt: string;
}

export interface ProtocolReview {
  id: string;
  role: string;
  provider: string;
  model: string;
  content: string;
  /** 原始结束状态；缺失表示历史记录无法判断是否截断。 */
  finishReason?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  createdAt: string;
}

export interface ProtocolRequest {
  id: string;
  title: string;
  scenarioId: "protocol-rescue";
  status: ProtocolRequestStatus;
  documents: ProtocolDocument[];
  contacts: ProtocolContact[];
  workItems: ProtocolWorkItem[];
  receipts: ProtocolReceipt[];
  evidence: ProtocolEvidence[];
  reviews?: ProtocolReview[];
  sourceReferences: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProtocolRequestInput {
  id?: string;
  title: string;
  documents: ProtocolDocument[];
  contacts?: ProtocolContact[];
  sourceReferences?: string[];
}

const STORE_DIR = () => {
  const directory = process.env.PROTOCOL_REQUESTS_DIR || path.join("data", "protocol-requests");
  if (path.isAbsolute(directory) || directory.split(/[\\/]/).includes("..")) {
    throw new Error("PROTOCOL_REQUESTS_DIR must be a relative directory inside the project");
  }
  return directory;
};
const requestPath = (id: string) => {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error("Invalid request id");
  return path.join(/* turbopackIgnore: true */ process.cwd(), STORE_DIR(), `${id}.json`);
};
const now = () => new Date().toISOString();
const documentKey = (doc: ProtocolDocument) => doc.documentChemblId || doc.doi?.toLowerCase() || "";

function readRequest(id: string): ProtocolRequest {
  return JSON.parse(fs.readFileSync(requestPath(id), "utf8"));
}

function writeRequest(request: ProtocolRequest) {
  fs.mkdirSync(STORE_DIR(), { recursive: true });
  const target = requestPath(request.id);
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(request, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, target);
}

function updateTimestamp(request: ProtocolRequest) {
  request.updatedAt = now();
  return request;
}

function workItem(request: ProtocolRequest, id: string) {
  return request.workItems.find((item) => item.id === id);
}

function setWorkStatus(request: ProtocolRequest, id: string, status: WorkItemStatus, note?: string) {
  const item = workItem(request, id);
  if (item) {
    item.status = status;
    if (note !== undefined) item.note = note;
  }
}

function assertDocuments(documents: ProtocolDocument[]) {
  if (!Array.isArray(documents) || documents.length === 0) throw new Error("At least one document is required");
  const keys = new Set<string>();
  for (const doc of documents) {
    if (!doc || typeof doc.title !== "string" || !doc.title.trim()) throw new Error("Every document needs a title");
    if (!doc.documentChemblId && !doc.doi) throw new Error("Every document needs a ChEMBL ID or DOI");
    if (doc.documentChemblId && !/^CHEMBL\d+$/.test(doc.documentChemblId)) throw new Error(`Invalid ChEMBL ID: ${doc.documentChemblId}`);
    if (!doc.methodStatus || !["explicit_matched", "method_incomplete"].includes(doc.methodStatus)) {
      throw new Error("Every document needs an explicit methodStatus");
    }
    const key = documentKey(doc);
    if (!key || keys.has(key)) throw new Error("Document IDs must be unique");
    keys.add(key);
  }
}

export function createProtocolRequest(input: ProtocolRequestInput): ProtocolRequest {
  if (!input || typeof input.title !== "string" || !input.title.trim()) throw new Error("Request title is required");
  assertDocuments(input.documents);
  const id = input.id || `protocol-${Date.now()}-${randomUUID().slice(0, 8)}`;
  requestPath(id);
  if (fs.existsSync(requestPath(id))) throw new Error("A protocol request with this id already exists");
  const timestamp = now();
  const scenario = getScenario("protocol-rescue");
  if (!scenario) throw new Error("Protocol scenario is unavailable");
  const request: ProtocolRequest = {
    id,
    title: input.title.trim(),
    scenarioId: "protocol-rescue",
    status: "draft",
    documents: input.documents,
    contacts: input.contacts || [],
    workItems: scenario.workItems.map((item, index) => ({ ...item, status: index === 0 ? "in_progress" : "pending" })),
    receipts: [],
    evidence: [],
    sourceReferences: input.sourceReferences || [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  writeRequest(request);
  return request;
}

export function getProtocolRequest(id: string): ProtocolRequest {
  return readRequest(id);
}

export function listProtocolRequests(filters?: { status?: ProtocolRequestStatus; document?: string; query?: string }) {
  fs.mkdirSync(STORE_DIR(), { recursive: true });
  const requests = fs.readdirSync(STORE_DIR())
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(fs.readFileSync(path.join(/* turbopackIgnore: true */ process.cwd(), STORE_DIR(), name), "utf8")) as ProtocolRequest)
    .filter((request) => !filters?.status || request.status === filters.status)
    .filter((request) => !filters?.document || request.documents.some((doc) => documentKey(doc) === filters.document))
    .filter((request) => {
      if (!filters?.query) return true;
      const haystack = `${request.title} ${request.documents.map((doc) => `${doc.title} ${doc.doi || ""} ${doc.documentChemblId || ""}`).join(" ")}`.toLowerCase();
      return haystack.includes(filters.query.toLowerCase());
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { requests, summary: summarizeProtocolRequests(requests) };
}

export function summarizeProtocolRequests(requests: ProtocolRequest[]) {
  const documents = requests.flatMap((request) => request.documents);
  const verifiedEvidence = requests.flatMap((request) => request.evidence.filter((item) => item.verification === "verified"));
  const fullTextDocuments = new Set(verifiedEvidence.filter((item) => item.level === "full_text").map((item) => item.documentKey));
  const protocolDocuments = new Set(verifiedEvidence.filter((item) => item.level === "protocol").map((item) => item.documentKey));
  const independentDocuments = new Set(verifiedEvidence.filter((item) => item.independentWetExperiment === true).map((item) => item.documentKey));
  const statusCounts: Record<string, number> = {};
  for (const request of requests) statusCounts[request.status] = (statusCounts[request.status] || 0) + 1;
  return {
    requestCount: requests.length,
    documentCount: documents.length,
    statusCounts,
    strictMethodMatchedCount: documents.filter((doc) => doc.methodStatus === "explicit_matched").length,
    methodIncompleteCount: documents.filter((doc) => doc.methodStatus === "method_incomplete").length,
    fullTextObtainedCount: fullTextDocuments.size,
    completeProtocolObtainedCount: protocolDocuments.size,
    independentWetExperimentCount: independentDocuments.size,
    pendingFollowupCount: requests.filter((request) => ["ready", "sent", "answered"].includes(request.status)).length,
    evidenceBoundary: "回复与回执不是实验协议；论坛线索不是全文；只有 verified 的 full_text／protocol 才进入相应计数。",
  };
}

export function updateProtocolRequest(id: string, input: {
  title?: string;
  status?: ProtocolRequestStatus;
  contacts?: ProtocolContact[];
  workItemId?: string;
  workItemStatus?: WorkItemStatus;
  workItemNote?: string;
}) {
  const request = readRequest(id);
  if (input.title !== undefined) {
    if (!input.title.trim()) throw new Error("Request title cannot be empty");
    request.title = input.title.trim();
  }
  if (input.contacts !== undefined) request.contacts = input.contacts;
  if (input.workItemId) {
    if (!input.workItemStatus || !["pending", "in_progress", "blocked", "done"].includes(input.workItemStatus)) {
      throw new Error("A valid workItemStatus is required");
    }
    if (!workItem(request, input.workItemId)) throw new Error("Unknown work item");
    setWorkStatus(request, input.workItemId, input.workItemStatus, input.workItemNote);
  }
  if (input.status) {
    const allowed: Record<ProtocolRequestStatus, ProtocolRequestStatus[]> = {
      draft: ["ready"],
      ready: ["sent", "closed_unavailable"],
      sent: ["answered", "bounced", "closed_unavailable"],
      answered: ["complete", "closed_unavailable"],
      bounced: ["ready"],
      closed_unavailable: ["ready"],
      complete: [],
    };
    if (input.status !== request.status && !allowed[request.status].includes(input.status)) {
      throw new Error(`Invalid status transition: ${request.status} -> ${input.status}`);
    }
    if (input.status === "complete") {
      const summary = summarizeProtocolRequests([request]);
      if (summary.completeProtocolObtainedCount < request.documents.length) {
        throw new Error("Cannot complete before every document has a verified protocol");
      }
      setWorkStatus(request, "publication", "in_progress", "全部文档已有协议；待发布与重放检查。");
    }
    request.status = input.status;
  }
  writeRequest(updateTimestamp(request));
  return request;
}

export function addProtocolReceipt(id: string, input: Omit<ProtocolReceipt, "id" | "occurredAt"> & { occurredAt?: string }) {
  if (!input || !["sent", "response", "bounce", "note"].includes(input.type)) throw new Error("Invalid receipt type");
  if (typeof input.channel !== "string" || !input.channel.trim()) throw new Error("Receipt channel is required");
  if (typeof input.note !== "string" || !input.note.trim()) throw new Error("Receipt note is required");
  const request = readRequest(id);
  if (input.type === "sent" && !["ready", "sent"].includes(request.status)) throw new Error("Request must be ready before recording a send receipt");
  if (["response", "bounce"].includes(input.type) && request.status !== "sent" && request.status !== "answered") {
    throw new Error("Response or bounce requires a previously sent request");
  }
  request.receipts.push({
    id: randomUUID(),
    type: input.type,
    channel: input.channel.trim(),
    occurredAt: input.occurredAt || now(),
    note: input.note.trim(),
  });
  if (input.type === "sent") {
    request.status = "sent";
    setWorkStatus(request, "author-request", "done", "已记录发送回执；不据此推定作者已读或回复。");
    setWorkStatus(request, "evidence-intake", "in_progress", "等待原文、方法或进一步线索。");
  } else if (input.type === "response") {
    request.status = "answered";
    setWorkStatus(request, "evidence-intake", "in_progress", "作者已回复；仍需逐条核验材料。");
  } else if (input.type === "bounce") request.status = "bounced";
  writeRequest(updateTimestamp(request));
  return request;
}

export function addProtocolEvidence(id: string, input: {
  documentKey: string;
  level: EvidenceLevel;
  verification: VerificationStatus;
  sourceUrl: string;
  locator?: string;
  quote?: string;
  coverage?: string;
  note?: string;
  methodStatus?: MethodStatus;
  independentWetExperiment?: boolean;
  lineage?: EvidenceLineage;
  methodFacet?: MethodFacet;
  activityRecords?: ActivityRecord[];
  constructRecords?: ConstructRecord[];
  compoundRecords?: CompoundRecord[];
  assayRecords?: AssayRecord[];
}) {
  const request = readRequest(id);
  const document = request.documents.find((doc) => documentKey(doc) === input.documentKey);
  if (!document) throw new Error("Unknown documentKey for this request");
  if (!["lead", "metadata", "abstract", "partial_text", "full_text", "protocol"].includes(input.level)) throw new Error("Invalid evidence level");
  if (!["unverified", "verified", "rejected"].includes(input.verification)) throw new Error("Invalid verification status");
  let url: URL;
  try { url = new URL(input.sourceUrl); } catch { throw new Error("A valid sourceUrl is required"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("sourceUrl must use HTTP or HTTPS");
  if (["full_text", "protocol"].includes(input.level) && input.verification === "verified") {
    if (!input.quote?.trim() || !input.locator?.trim() || !input.coverage?.trim()) {
      throw new Error("Verified full text or protocol requires quote, locator and coverage");
    }
  }
  if (input.lineage) {
    if (!["primary", "citation", "curation", "context", "correspondence", "lead", "unspecified"].includes(input.lineage.kind)) {
      throw new Error("Invalid lineage kind");
    }
    const parents = input.lineage.derivedFromEvidenceIds || [];
    if (!Array.isArray(parents)) throw new Error("derivedFromEvidenceIds must be an array");
    for (const parent of parents) {
      if (!request.evidence.some((item) => item.id === parent)) throw new Error("derivedFromEvidenceIds must reference existing evidence");
    }
  }
  if (input.methodFacet) {
    for (const [key, value] of Object.entries(input.methodFacet)) {
      if (!METHOD_FACET_FIELDS.includes(key as MethodFacetKey)) throw new Error(`Unknown method facet: ${key}`);
      if (typeof value !== "string" || !value.trim()) throw new Error(`Method facet ${key} must be a non-empty string`);
    }
  }
  const activityFields = validateActivityEvidence(input);
  request.evidence.push({
    id: randomUUID(),
    documentKey: input.documentKey,
    level: input.level,
    verification: input.verification,
    sourceUrl: url.href,
    locator: input.locator || "未提供",
    quote: input.quote || "",
    coverage: input.coverage || "未提供",
    note: input.note,
    independentWetExperiment: input.independentWetExperiment === true,
    lineage: input.lineage ? { kind: input.lineage.kind, derivedFromEvidenceIds: [...new Set(input.lineage.derivedFromEvidenceIds || [])] } : undefined,
    methodFacet: input.methodFacet ? Object.fromEntries(Object.entries(input.methodFacet).map(([key, value]) => [key, value.trim()])) : undefined,
    ...activityFields,
    createdAt: now(),
  });
  if (input.level === "protocol" && input.verification === "verified" && input.methodStatus) {
    document.methodStatus = input.methodStatus;
  }
  const summary = summarizeProtocolRequests([request]);
  if (summary.completeProtocolObtainedCount === request.documents.length) {
    setWorkStatus(request, "evidence-intake", "done", "全部文档均已有核验协议。");
  } else {
    setWorkStatus(request, "evidence-intake", "in_progress", "仍有文档缺少核验协议。");
  }
  writeRequest(updateTimestamp(request));
  return request;
}

export function appendProtocolReviews(id: string, reviews: Array<Omit<ProtocolReview, "id" | "createdAt">>) {
  const request = readRequest(id);
  const timestamp = now();
  request.reviews = [...(request.reviews || []), ...reviews.map((review) => ({ ...review, id: randomUUID(), createdAt: timestamp }))];
  const complete = reviews.length > 0 && reviews.every((review) => ["stop", "completed", "end_turn"].includes(review.finishReason || ""));
  setWorkStatus(
    request,
    "panel-review",
    complete ? "done" : "in_progress",
    complete ? "已保存三角色复核意见；证据等级未自动改变。" : "输出截断或结束状态未知；已保留意见，但仍需复核，证据等级不变。",
  );
  writeRequest(updateTimestamp(request));
  return request;
}
