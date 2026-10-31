import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import seed from "../../data/law-packages/seed.json";

export const LAW_PACKAGE_SCHEMA_VERSION = 1;
export const LAW_KINDS = ["empirical", "effective_mapping", "formal_constraint", "protocol"] as const;
export const LAW_STATUSES = [
  "CONJECTURED",
  "SCREENING",
  "LIMITED_SUPPORT",
  "DOMAIN_VALIDATED",
  "REFUTED",
  "DEMONSTRATED",
  "DESIGN_READY",
  "RETIRED",
] as const;
export const PARAMETER_SOURCE_TYPES = [
  "DERIVED",
  "CONDITIONAL",
  "BOUNDARY",
  "MEASURED",
  "FITTED",
  "CONJECTURED",
  "REFUTED",
  "RETIRED",
] as const;
export const VALIDATION_STATUSES = ["PASS", "LIMITED", "FAIL", "PENDING", "NOT_APPLICABLE"] as const;

type LawKind = (typeof LAW_KINDS)[number];
type LawStatus = (typeof LAW_STATUSES)[number];

export interface LawMetric {
  label: string;
  value: string | number;
  note: string;
}

export interface LawParameter {
  name: string;
  meaning: string;
  unit: string;
  sourceType: string;
  status: string;
}

export interface LawValidation {
  level: string;
  label: string;
  status: string;
  evidence: string;
}

export interface LawSource {
  label: string;
  locator: string;
  sha256?: string;
}

export interface LawEvidenceEvent {
  at: string;
  action: string;
  detail: string;
}

export interface LawPackage {
  id: string;
  version: number;
  kind: LawKind;
  title: string;
  domain: string;
  status: LawStatus;
  statement: string;
  summary: string;
  metrics: LawMetric[];
  parameters: LawParameter[];
  validations: LawValidation[];
  counterexamples: string[];
  limitations: string[];
  nextAction: string;
  sources: LawSource[];
  evidenceHistory: LawEvidenceEvent[];
}

export interface LawPerspective {
  id: string;
  title: string;
  output: string;
  strength: string;
  blindSpot: string;
  role: string;
}

export type CreateLawPackageResult =
  | { ok: true; package: LawPackage }
  | { ok: false; reason: "invalid" | "conflict"; issues: string[] };

const ID_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const builtIns = seed.packages as LawPackage[];
export const lawPerspectives = seed.perspectives as LawPerspective[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(text);
}

function defaultStoreDirectory(): string {
  return process.env.LAW_PACKAGE_STORE_DIR?.trim() || path.join(process.cwd(), "data", "law-packages", "user");
}

function userPackagePath(id: string, directory = defaultStoreDirectory()): string {
  if (!ID_PATTERN.test(id)) throw new Error("Invalid law package id");
  return path.join(directory, `${id}.json`);
}

/** Validate evidence structure instead of treating every research narrative as a law. */
export function validateLawPackage(input: unknown): string[] {
  if (!isRecord(input)) return ["body must be an object"];
  const issues: string[] = [];
  if (!text(input.id) || input.id.length > 80 || !ID_PATTERN.test(input.id)) {
    issues.push("id must contain 1–80 uppercase letters, digits, or single hyphens between segments");
  }
  if (!Number.isInteger(input.version) || (input.version as number) < 1) issues.push("version must be a positive integer");
  if (!LAW_KINDS.includes(input.kind as LawKind)) issues.push(`kind must be one of ${LAW_KINDS.join(", ")}`);
  if (!LAW_STATUSES.includes(input.status as LawStatus)) issues.push(`status must be one of ${LAW_STATUSES.join(", ")}`);
  for (const field of ["title", "domain", "statement", "summary", "nextAction"]) {
    if (!text(input[field])) issues.push(`${field} is required`);
  }

  if (!Array.isArray(input.metrics) || input.metrics.length === 0) {
    issues.push("metrics must be a non-empty array");
  } else {
    input.metrics.forEach((metric, index) => {
      if (!isRecord(metric) || !text(metric.label) || !text(metric.note) || !["string", "number"].includes(typeof metric.value)) {
        issues.push(`metrics[${index}] requires label, numeric or string value, and note`);
      }
    });
  }

  if (!Array.isArray(input.parameters) || input.parameters.length === 0) {
    issues.push("parameters must be a non-empty array");
  } else {
    input.parameters.forEach((parameter, index) => {
      if (!isRecord(parameter)) {
        issues.push(`parameters[${index}] must be an object`);
        return;
      }
      for (const field of ["name", "meaning", "unit", "status"]) {
        if (!text(parameter[field])) issues.push(`parameters[${index}].${field} is required`);
      }
      if (!PARAMETER_SOURCE_TYPES.includes(parameter.sourceType as (typeof PARAMETER_SOURCE_TYPES)[number])) {
        issues.push(`parameters[${index}].sourceType is invalid`);
      }
    });
  }

  if (!Array.isArray(input.validations) || input.validations.length === 0) {
    issues.push("validations must be a non-empty array");
  } else {
    input.validations.forEach((validation, index) => {
      if (!isRecord(validation)) {
        issues.push(`validations[${index}] must be an object`);
        return;
      }
      for (const field of ["level", "label", "evidence"]) {
        if (!text(validation[field])) issues.push(`validations[${index}].${field} is required`);
      }
      if (!VALIDATION_STATUSES.includes(validation.status as (typeof VALIDATION_STATUSES)[number])) {
        issues.push(`validations[${index}].status is invalid`);
      }
    });
  }

  if (!stringArray(input.counterexamples)) issues.push("counterexamples must be an array of strings");
  if (!stringArray(input.limitations)) issues.push("limitations must be an array of strings");
  if (!Array.isArray(input.sources)) {
    issues.push("sources must be an array");
  } else {
    input.sources.forEach((source, index) => {
      if (!isRecord(source) || !text(source.label) || !text(source.locator)) issues.push(`sources[${index}] requires label and locator`);
    });
  }
  if (!Array.isArray(input.evidenceHistory)) {
    issues.push("evidenceHistory must be an array");
  } else {
    input.evidenceHistory.forEach((event, index) => {
      if (!isRecord(event) || !text(event.at) || !text(event.action) || !text(event.detail)) {
        issues.push(`evidenceHistory[${index}] requires at, action, and detail`);
      }
    });
  }

  if (input.status === "DOMAIN_VALIDATED" && input.kind === "empirical") {
    const independentPass = Array.isArray(input.validations) && input.validations.some((validation) =>
      isRecord(validation) && validation.level === "independent_replication" && validation.status === "PASS"
    );
    if (!independentPass) issues.push("empirical DOMAIN_VALIDATED requires independent_replication=PASS");
  }
  if (input.status === "REFUTED") {
    const hasFailure = Array.isArray(input.validations) && input.validations.some((validation) =>
      isRecord(validation) && validation.status === "FAIL"
    );
    if (!hasFailure && (!Array.isArray(input.counterexamples) || input.counterexamples.length === 0)) {
      issues.push("REFUTED requires a failed validation or a registered counterexample");
    }
  }
  return issues;
}

export function listLawPackages(directory = defaultStoreDirectory()): LawPackage[] {
  const userPackages: LawPackage[] = [];
  if (fs.existsSync(directory)) {
    for (const filename of fs.readdirSync(directory).filter((name) => name.endsWith(".json")).sort()) {
      const parsed: unknown = JSON.parse(fs.readFileSync(path.join(directory, filename), "utf8"));
      const issues = validateLawPackage(parsed);
      if (issues.length > 0) throw new Error(`Invalid stored law package ${filename}: ${issues.join("; ")}`);
      userPackages.push(parsed as LawPackage);
    }
  }
  return [...builtIns, ...userPackages];
}

export function getLawPackage(id: string, directory = defaultStoreDirectory()): LawPackage | null {
  const builtIn = builtIns.find((item) => item.id === id);
  if (builtIn) return builtIn;
  const filename = userPackagePath(id, directory);
  if (!fs.existsSync(filename)) return null;
  const parsed: unknown = JSON.parse(fs.readFileSync(filename, "utf8"));
  const issues = validateLawPackage(parsed);
  if (issues.length > 0) throw new Error(`Invalid stored law package ${id}: ${issues.join("; ")}`);
  return parsed as LawPackage;
}

/** Create a new evidence version without overwriting built-ins or an existing user package. */
export function createLawPackage(input: unknown, directory = defaultStoreDirectory()): CreateLawPackageResult {
  const issues = validateLawPackage(input);
  if (issues.length > 0) return { ok: false, reason: "invalid", issues };
  const candidate = input as LawPackage;
  if (builtIns.some((item) => item.id === candidate.id)) {
    return { ok: false, reason: "conflict", issues: ["built-in ids are immutable; use a new versioned id"] };
  }
  fs.mkdirSync(directory, { recursive: true });
  const filename = userPackagePath(candidate.id, directory);
  if (fs.existsSync(filename)) return { ok: false, reason: "conflict", issues: ["law package id already exists"] };
  const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(candidate, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporary, filename);
  } catch (error) {
    fs.rmSync(temporary, { force: true });
    if (fs.existsSync(filename)) return { ok: false, reason: "conflict", issues: ["law package id already exists"] };
    throw error;
  }
  return { ok: true, package: candidate };
}
