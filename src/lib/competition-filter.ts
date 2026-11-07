import type { Prisma } from "@prisma/client";

export interface CompetitionFilterInput {
  domain?: string | null;
  status?: string | null;
  format?: string | null;
}

export function buildCompetitionFilter(input: CompetitionFilterInput): Prisma.AcademicCompetitionWhereInput {
  const where: Prisma.AcademicCompetitionWhereInput = {};
  if (input.domain) where.domain = input.domain;
  if (input.status) where.status = input.status;
  if (input.format) where.format = input.format;
  return where;
}
