import type { Prisma } from "@prisma/client";

const REVIEW_BOARD_STATUSES = new Set(["active", "closed", "archived"]);
const REVIEW_BOARD_MODES = new Set(["single_blind", "double_blind", "open"]);

function bodyRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Request body must be an object");
  }
  return value as Record<string, unknown>;
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (value === undefined || typeof value === "string") return value;
  throw new TypeError(`${key} must be a string`);
}

function serializeStrategy(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || typeof value === "object") {
    const serialized: unknown = JSON.stringify(value);
    if (typeof serialized !== "string") {
      throw new TypeError("strategy must be JSON serializable");
    }
    return serialized;
  }
  throw new TypeError("strategy must be a string, object, array, or null");
}

export function buildPanelUpdate(input: unknown): Prisma.AcademicPanelUpdateInput {
  const body = bodyRecord(input);
  const data: Prisma.AcademicPanelUpdateInput = {};
  const name = optionalString(body, "name");
  const description = optionalString(body, "description");
  const domain = optionalString(body, "domain");
  const status = optionalString(body, "status");
  if (name !== undefined) data.name = name.trim();
  if (description !== undefined) data.description = description;
  if (domain !== undefined) data.domain = domain;
  if (status !== undefined) data.status = status;
  if (body.strategy !== undefined) data.strategy = serializeStrategy(body.strategy);
  return data;
}

export function buildReviewBoardFilter(
  domain: string | null,
  status: string | null,
  reviewMode: string | null
): Prisma.AcademicReviewBoardWhereInput {
  const where: Prisma.AcademicReviewBoardWhereInput = {};
  if (domain) where.domain = domain;
  if (status) where.status = status;
  if (reviewMode) where.reviewMode = reviewMode;
  return where;
}

export function buildReviewBoardUpdate(input: unknown): Prisma.AcademicReviewBoardUpdateInput {
  const body = bodyRecord(input);
  const data: Prisma.AcademicReviewBoardUpdateInput = {};
  const name = optionalString(body, "name");
  const description = optionalString(body, "description");
  if (name !== undefined) data.name = name.trim();
  if (description !== undefined) data.description = description;
  if (typeof body.status === "string" && REVIEW_BOARD_STATUSES.has(body.status)) {
    data.status = body.status;
  }
  if (typeof body.reviewMode === "string" && REVIEW_BOARD_MODES.has(body.reviewMode)) {
    data.reviewMode = body.reviewMode;
  }
  if (body.strategy !== undefined) data.strategy = serializeStrategy(body.strategy);
  return data;
}
