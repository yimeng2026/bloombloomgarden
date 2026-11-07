import type { Prisma } from "@prisma/client";

export interface ResearchModuleFilterInput {
  discipline?: string | null;
  status?: string | null;
  search?: string | null;
}

export function buildResearchModuleFilter(input: ResearchModuleFilterInput): Prisma.ResearchModuleWhereInput {
  const where: Prisma.ResearchModuleWhereInput = {};
  if (input.discipline) where.discipline = input.discipline;
  if (input.status) where.status = input.status;
  if (input.search) {
    where.OR = [
      { name: { contains: input.search } },
      { displayName: { contains: input.search } },
    ];
  }
  return where;
}

export function groupResearchModulesByCategory<T extends { category: string | null | undefined }>(
  modules: T[]
): Record<string, T[]> {
  return modules.reduce<Record<string, T[]>>((grouped, module) => {
    const category = module.category || "未分类";
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(module);
    return grouped;
  }, {});
}
