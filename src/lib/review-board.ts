import type { Prisma } from "@prisma/client";
import type { PromptContext } from "@/lib/research-prompts";

export type ReviewBoardWithReviewers = Prisma.AcademicReviewBoardGetPayload<{
  include: { reviewers: true };
}>;

export interface ReviewTargetInfo {
  title: string;
  content: string;
}

export function buildReviewFilter(
  boardId: string,
  targetId: string | null,
  decision: string | null,
  round: string | null
): Prisma.AcademicReviewWhereInput {
  const where: Prisma.AcademicReviewWhereInput = { boardId };
  if (targetId) where.targetId = targetId;
  if (decision) where.decision = decision;
  if (round) where.round = parseInt(round, 10);
  return where;
}

export function buildReviewPromptContext(
  board: ReviewBoardWithReviewers,
  targetType: string,
  targetId: string,
  title: string,
  roundNumber: number,
  targetInfo: ReviewTargetInfo | null
): PromptContext {
  const reviewer = board.reviewers[0] ?? { specialty: "general", role: "reviewer" };
  return {
    topic: title,
    domain: board.domain || "general",
    mode: board.reviewMode || "single_blind",
    role: reviewer.role,
    specialty: reviewer.specialty || "general",
    targetType,
    content: targetInfo?.content || `评审对象：${targetType} (ID: ${targetId})`,
    roundNumber,
    title: targetInfo?.title || title,
  };
}
