import type { Prisma } from "@prisma/client";

export interface StageUpdateInput {
  finalContent?: string;
  feedback?: string;
  finalScore?: number;
  bodyStatus?: string;
}

export interface StageUpdateResult {
  updateData: Prisma.PipelineStageUpdateInput;
  statusOverride?: string;
}

export function buildStageUpdateData(input: StageUpdateInput): StageUpdateResult {
  const updateData: Prisma.PipelineStageUpdateInput = {};
  if (input.finalContent !== undefined) updateData.content = input.finalContent;
  if (input.feedback !== undefined) updateData.feedback = input.feedback;

  let statusOverride: string | undefined;
  if (input.finalScore !== undefined) {
    updateData.score = input.finalScore;
    if (input.finalScore >= 7.0) {
      updateData.status = "completed";
      updateData.completedAt = new Date();
      statusOverride = "completed";
    } else if (input.finalScore < 4.0) {
      updateData.status = "rejected";
      updateData.completedAt = null;
      statusOverride = "rejected";
    }
  }

  if (input.bodyStatus !== undefined && !statusOverride) {
    updateData.status = input.bodyStatus;
    if (input.bodyStatus === "completed") {
      updateData.completedAt = new Date();
    } else if (["pending", "active", "rejected"].includes(input.bodyStatus)) {
      updateData.completedAt = null;
    }
  }

  return { updateData, statusOverride };
}
