import type { Prisma } from "@prisma/client";

export function buildPanelMemberFilter(
  panelId: string,
  specialty: string | null,
  role: string | null
): Prisma.AcademicPanelMemberWhereInput {
  const where: Prisma.AcademicPanelMemberWhereInput = { panelId };
  if (specialty) where.specialty = specialty;
  if (role) where.role = role;
  return where;
}
