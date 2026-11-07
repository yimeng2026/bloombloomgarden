import type { Prisma } from "@prisma/client";

export interface ResearchPaperFilterInput {
  field?: string | null;
  status?: string | null;
  search?: string | null;
}

export function buildResearchPaperFilter(input: ResearchPaperFilterInput): Prisma.ResearchPaperWhereInput {
  const where: Prisma.ResearchPaperWhereInput = {};
  if (input.field) where.field = input.field;
  if (input.status) where.status = input.status;
  if (input.search) {
    where.OR = [
      { title: { contains: input.search } },
      { abstract: { contains: input.search } },
    ];
  }
  return where;
}

export function groupResearchPapersByType<T extends { type: string | null | undefined }>(
  papers: T[]
): Record<string, T[]> {
  return papers.reduce<Record<string, T[]>>((grouped, paper) => {
    const type = paper.type || "Unknown";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(paper);
    return grouped;
  }, {});
}
