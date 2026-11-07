import type { Prisma } from "@prisma/client";

export function buildCompetitorFilter(
  competitionId: string,
  role: string | null,
  eliminated: string | null
): Prisma.AcademicCompetitorWhereInput {
  const where: Prisma.AcademicCompetitorWhereInput = { competitionId };
  if (role) where.role = role;
  if (eliminated !== null) {
    where.eliminated = eliminated === "true";
  }
  return where;
}
