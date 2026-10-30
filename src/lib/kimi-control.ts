import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import catalog from "./generated/kimi-operations.json";

export type OperationService = "research" | "backend";
export type OperationMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type OperationRisk = "read" | "sensitive-read" | "write" | "dangerous";

export interface KimiOperation {
  id: string;
  service: OperationService;
  method: OperationMethod;
  path: string;
  risk: OperationRisk;
  source: string;
}

export interface OperationRequest {
  service: OperationService;
  method: OperationMethod;
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
  confirm?: boolean;
  requestId?: string;
}

export interface OperationResult {
  requestId: string;
  operationId: string;
  status: number;
  contentType: string;
  data: unknown;
  durationMs: number;
}

const operations = (catalog as { operations: KimiOperation[] }).operations;
const MAX_BODY_BYTES = 2 * 1024 * 1024;

export function listOperations(filter?: { service?: string; method?: string; path?: string }): KimiOperation[] {
  return operations.filter((operation) =>
    (!filter?.service || operation.service === filter.service) &&
    (!filter?.method || operation.method === filter.method) &&
    (!filter?.path || operation.path.includes(filter.path)),
  );
}

function normalizePath(input: string): string {
  if (!input || input.length > 1000 || !input.startsWith("/")) throw new Error("Invalid operation path");
  const pathname = input.split("?", 1)[0].replace(/\/+$/, "") || "/";
  if (pathname.includes("\\") || pathname.includes("#") || pathname.includes("//")) {
    throw new Error("Invalid operation path");
  }
  if (pathname.split("/").some((segment) => segment === "." || segment === "..")) {
    throw new Error("Path traversal is not allowed");
  }
  return pathname;
}

function routePattern(pattern: string): RegExp {
  const segments = pattern.split("/").map((segment) => {
    if (/^\[\[\.\.\..+\]\]$/.test(segment)) return "(?:.*)";
    if (/^\[\.\.\..+\]$/.test(segment)) return "(.+)";
    if (/^\[.+\]$/.test(segment)) return "([^/]+)";
    if (/^:.+$/.test(segment)) return "([^/]+)";
    return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  return new RegExp(`^${segments.join("/")}$`);
}

export function findOperation(input: Pick<OperationRequest, "service" | "method" | "path">): KimiOperation | null {
  const pathname = normalizePath(input.path);
  return operations.find((operation) =>
    operation.service === input.service &&
    operation.method === input.method &&
    routePattern(operation.path).test(pathname)
  ) || null;
}

export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => {
      const normalized = key.replace(/[-_]/g, "").toLowerCase();
      const sensitive = normalized === "token" || normalized === "authorization" || normalized === "cookie" ||
        /(?:apikey|token|secret|password)$/.test(normalized);
      return [key, sensitive ? "[REDACTED]" : redactSensitive(item)];
    }));
  }
  return value;
}

function audit(entry: Record<string, unknown>): void {
  const directory = process.env.GARDEN_AUDIT_DIR || path.resolve("data", "kimi-control");
  fs.mkdirSync(directory, { recursive: true });
  fs.appendFileSync(
    path.join(directory, "audit.jsonl"),
    `${JSON.stringify({ timestamp: new Date().toISOString(), ...entry })}\n`,
    "utf-8",
  );
}

function backendUrl(): string {
  const raw = process.env.GARDEN_BACKEND_URL || "http://127.0.0.1:3001";
  const parsed = new URL(raw);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid backend protocol");
  return raw.replace(/\/+$/, "");
}

export class ControlError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export async function executeOperation(
  input: OperationRequest,
  options: { researchOrigin: string; fetchImpl?: typeof fetch },
): Promise<OperationResult> {
  const started = Date.now();
  const requestId = input.requestId?.slice(0, 100) || crypto.randomUUID();
  let operationId = "unregistered";
  let pathname = "invalid";
  try {
    pathname = normalizePath(input.path);
    const operation = findOperation({ service: input.service, method: input.method, path: pathname });
    if (!operation) {
      throw new ControlError(404, "Operation is not present in the generated allowlist");
    }
    operationId = operation.id;
    if (input.method !== "GET" && input.confirm !== true) {
      throw new ControlError(412, "Write operation requires explicit confirm: true");
    }

    const origin = operation.service === "backend"
      ? backendUrl()
      : (process.env.GARDEN_RESEARCH_URL || options.researchOrigin).replace(/\/+$/, "");
    const url = new URL(pathname, origin);
    for (const [key, value] of Object.entries(input.query || {})) {
      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(key, String(item));
      } else if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
    const serializedBody = input.method === "GET" || input.body === undefined ? undefined : JSON.stringify(input.body);
    if (serializedBody && Buffer.byteLength(serializedBody) > MAX_BODY_BYTES) {
      throw new ControlError(413, "Operation body exceeds the 2 MiB limit");
    }
    const fetchImpl = options.fetchImpl || fetch;
    const response = await fetchImpl(url, {
      method: input.method,
      headers: {
        "Content-Type": "application/json",
        "X-Garden-Agent-Key": process.env.GARDEN_AGENT_TOKEN || "",
        "X-Request-ID": requestId,
      },
      body: serializedBody,
      signal: AbortSignal.timeout(300_000),
    });
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const raw = await response.text();
    let data: unknown = raw;
    if (contentType.includes("application/json")) {
      try {
        data = redactSensitive(JSON.parse(raw));
      } catch {
        data = raw;
      }
    }
    const result = {
      requestId,
      operationId,
      status: response.status,
      contentType,
      data,
      durationMs: Date.now() - started,
    };
    audit({ requestId, operationId, status: response.status, durationMs: result.durationMs });
    return result;
  } catch (error) {
    audit({
      requestId,
      operationId,
      path: pathname,
      method: input.method,
      status: error instanceof ControlError ? error.status : 500,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
