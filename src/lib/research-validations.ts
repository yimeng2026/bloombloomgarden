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

function serializeStrategy(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || typeof value === "object") {
    const serialized: unknown = JSON.stringify(value);
    if (typeof serialized !== "string") throw new TypeError("strategy must be JSON serializable");
    return serialized;
  }
  throw new TypeError("strategy must be a string, object, array, or null");
}

export function buildValidationFilter(
  targetModule: string | null,
  validationType: string | null,
  status: string | null
): Prisma.ValidationGroupWhereInput {
  const where: Prisma.ValidationGroupWhereInput = {};
  if (targetModule) where.targetModule = targetModule;
  if (validationType) where.validationType = validationType;
  if (status) where.status = status;
  return where;
}

export function buildValidationGroupUpdate(input: unknown): Prisma.ValidationGroupUpdateInput {
  const body = bodyRecord(input);
  const data: Prisma.ValidationGroupUpdateInput = {};
  const name = optionalString(body, "name");
  const description = optionalString(body, "description");
  const status = optionalString(body, "status");
  const validationType = optionalString(body, "validationType");
  if (name !== undefined) data.name = name.trim();
  if (description !== undefined) data.description = description;
  if (status !== undefined) data.status = status;
  if (validationType !== undefined) data.validationType = validationType;
  if (body.strategy !== undefined) data.strategy = serializeStrategy(body.strategy);
  return data;
}

export function buildValidationResultFilter(
  groupId: string,
  conclusion: string | null
): Prisma.ValidationResultWhereInput {
  const where: Prisma.ValidationResultWhereInput = { groupId };
  if (conclusion) where.conclusion = conclusion;
  return where;
}

export function buildValidatorFilter(
  groupId: string,
  role: string | null,
  specialty: string | null
): Prisma.ValidationMemberWhereInput {
  const where: Prisma.ValidationMemberWhereInput = { groupId };
  if (role) where.role = role;
  if (specialty) where.specialty = { contains: specialty };
  return where;
}
