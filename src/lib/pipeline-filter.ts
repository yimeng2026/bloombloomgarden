import type { Prisma } from "@prisma/client";

export function buildPipelineFilter(status: string | null): Prisma.ManuscriptPipelineWhereInput {
  const where: Prisma.ManuscriptPipelineWhereInput = {};
  if (status) where.status = status;
  return where;
}
