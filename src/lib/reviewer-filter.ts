import type { Prisma } from "@prisma/client";

export function buildReviewerFilter(
  boardId: string,
  role: string | null,
  specialty: string | null
): Prisma.ReviewBoardMemberWhereInput {
  const where: Prisma.ReviewBoardMemberWhereInput = { boardId };
  if (role) where.role = role;
  if (specialty) where.specialty = specialty;
  return where;
}
