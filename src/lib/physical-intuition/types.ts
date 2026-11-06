export type EvidenceRole = "observation" | "reconstruction" | "interpretation" | "context" | "lead";
export type MathCheckStatus = "proposal" | "quick_checked" | "computed" | "formal_verified" | "independently_reviewed";
export type PhysicalCheckStatus = "analogy" | "compatible" | "out_of_sample_supported" | "discriminating_supported" | "independently_reproduced";
export type UsageStatus = "historical" | "candidate" | "analogy" | "rejected";
export type DimensionVector = Partial<Record<string, number>>;

export interface EvidenceLink {
  id: string;
  role: EvidenceRole;
  sourceUrl?: string;
  locator: string;
  note?: string;
}

export type Constraint =
  | { kind: "dimension"; left: DimensionVector; right: DimensionVector }
  | { kind: "probabilities"; values: number[]; tolerance: number }
  | { kind: "commutation"; a: number[][]; b: number[][]; tolerance: number }
  | { kind: "note"; text: string };

export interface IntuitionTask {
  taskId: string;
  title: string;
  objective: string;
  observables: Array<{ name: string; unit?: string; dimension?: DimensionVector }>;
  constraints: Constraint[];
  baseline: { name: string; description: string } | null;
  evidence: EvidenceLink[];
  data?: {
    origin: "user" | "public" | "synthetic";
    trainAvailable: boolean;
    holdoutAvailable: boolean;
    samplingNote?: string;
  };
  triggers?: {
    noncommutative?: boolean;
    oscillatory?: boolean;
    relationalNetwork?: boolean;
    noisyMeasurements?: boolean;
    discreteOrder?: boolean;
  };
}

export interface UsageLabel {
  label: string;
  status: UsageStatus;
  rationale: string;
}

export interface StructureCard {
  key: string;
  signature: string;
  possibleUses: UsageLabel[];
  baselineDifference: string;
  quickChecks: string[];
}

export interface CheckResult {
  code: string;
  status: "pass" | "warning" | "fail";
  detail: string;
}

export interface IntuitionCard extends StructureCard {
  candidateId: string;
  statement: string;
  triggerRationale: string;
  confidence?: number;
  checks: CheckResult[];
  unknowns: string[];
  counterexamples: string[];
  nextDiscriminatingTest?: string;
  sourceEvidenceIds: string[];
  mathStatus: MathCheckStatus;
  physicalStatus: PhysicalCheckStatus;
}

export interface EvaluationIssue {
  code: string;
  severity: "info" | "warning";
  detail: string;
}

const EVIDENCE_ROLES: EvidenceRole[] = ["observation", "reconstruction", "interpretation", "context", "lead"];

export function assertDimensionVector(value: unknown, field: string): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must be a dimension vector`);
  for (const [axis, exponent] of Object.entries(value)) {
    if (!axis.trim() || !Number.isFinite(exponent)) throw new Error(`${field}.${axis} must have a finite exponent`);
  }
}

export function assertIntuitionTask(task: IntuitionTask): void {
  if (!task || typeof task !== "object" || Array.isArray(task)) throw new Error("Intuition task must be an object");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(task.taskId)) throw new Error("Invalid taskId");
  if (typeof task.title !== "string" || !task.title.trim()) throw new Error("Task title is required");
  if (typeof task.objective !== "string" || !task.objective.trim()) throw new Error("Task objective is required");
  if (!Array.isArray(task.observables) || task.observables.length === 0) throw new Error("At least one observable is required");
  for (const observable of task.observables) {
    if (!observable || typeof observable.name !== "string" || !observable.name.trim()) throw new Error("Observable names are required");
    if (observable.dimension !== undefined) assertDimensionVector(observable.dimension, `observable ${observable.name}.dimension`);
  }
  if (!Array.isArray(task.constraints)) throw new Error("constraints must be an array");
  if (!("baseline" in task) || task.baseline === undefined) throw new Error("baseline must be explicitly declared or null");
  if (task.baseline !== null && (typeof task.baseline.name !== "string" || !task.baseline.name.trim() || typeof task.baseline.description !== "string" || !task.baseline.description.trim())) {
    throw new Error("A named baseline and description are required when baseline is not null");
  }
  if (!Array.isArray(task.evidence)) throw new Error("evidence must be an array");
  for (const evidence of task.evidence) {
    if (!evidence || typeof evidence.id !== "string" || !evidence.id.trim()) throw new Error("Evidence id is required");
    if (!EVIDENCE_ROLES.includes(evidence.role)) throw new Error(`Invalid evidence role: ${evidence.role}`);
    if (typeof evidence.locator !== "string" || !evidence.locator.trim()) throw new Error("Evidence locator is required");
    if (evidence.sourceUrl !== undefined) {
      let url: URL;
      try { url = new URL(evidence.sourceUrl); } catch { throw new Error("Evidence sourceUrl must be valid"); }
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Evidence sourceUrl must use HTTP or HTTPS");
    }
  }
  if (task.data !== undefined) {
    if (!["user", "public", "synthetic"].includes(task.data.origin)) throw new Error("Invalid data origin");
    if (typeof task.data.trainAvailable !== "boolean" || typeof task.data.holdoutAvailable !== "boolean") {
      throw new Error("trainAvailable and holdoutAvailable must be boolean");
    }
  }
}
