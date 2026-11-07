import type { Prisma } from "@prisma/client";

export function buildResearchNoteFilter(tag: string | null): Prisma.ResearchNoteWhereInput {
  const where: Prisma.ResearchNoteWhereInput = {};
  if (tag) {
    where.tags = { contains: tag };
  }
  return where;
}
