import type { Prisma } from "@prisma/client";

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

function optionalScore(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new TypeError("score must be a finite number");
}

export function buildTaskFilter(
  status: string | null,
  type: string | null,
  targetModule: string | null
): Prisma.AcademicTaskWhereInput {
  const where: Prisma.AcademicTaskWhereInput = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (targetModule) where.targetModule = targetModule;
  return where;
}

export function buildTaskUpdate(input: unknown, now: Date = new Date()): Prisma.AcademicTaskUpdateInput {
  const body = bodyRecord(input);
  const updateData: Prisma.AcademicTaskUpdateInput = {};
  const status = optionalString(body, "status");
  const result = optionalString(body, "result");
  const leanCode = optionalString(body, "leanCode");
  const score = optionalScore(body.score);

  if (status !== undefined) {
    updateData.status = status;
    if (status === "completed") {
      updateData.completedAt = now;
    } else if (["pending", "assigned", "in-progress"].includes(status)) {
      updateData.completedAt = null;
    }
  }
  if (result !== undefined) updateData.result = result;
  if (leanCode !== undefined) updateData.leanCode = leanCode;
  if (score !== undefined) updateData.score = score;
  return updateData;
}
