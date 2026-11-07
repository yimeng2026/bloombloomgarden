import type { Prisma } from "@prisma/client";

export function buildPanelFilter(domain: string | null): Prisma.AcademicPanelWhereInput {
  const where: Prisma.AcademicPanelWhereInput = {};
  if (domain) where.domain = domain;
  return where;
}
