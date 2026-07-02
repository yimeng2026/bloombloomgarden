import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const { id, stageId } = await params;

    const stage = await prisma.pipelineStage.findFirst({
      where: {
        id: stageId,
        pipelineId: id,
      },
    });

    if (!stage) {
      return NextResponse.json(
        { success: false, error: "Stage not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: stage });
  } catch (error) {
    console.error(
      "[GET /api/research/pipelines/[id]/stages/[stageId]] error:",
      error
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch stage" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const { id, stageId } = await params;
    const body = await request.json();
    const { content, feedback, score } = body;

    const updateData: any = {};
    if (content !== undefined) updateData.content = content;
    if (feedback !== undefined) updateData.feedback = feedback;

    if (score !== undefined) {
      updateData.score = score;
      if (score >= 7.0) {
        updateData.status = "completed";
        updateData.completedAt = new Date();
      } else if (score < 4.0) {
        updateData.status = "rejected";
        updateData.completedAt = null;
      }
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === "completed") {
        updateData.completedAt = new Date();
      } else if (
        body.status === "pending" ||
        body.status === "active" ||
        body.status === "rejected"
      ) {
        updateData.completedAt = null;
      }
    }

    const stage = await prisma.pipelineStage.update({
      where: { id: stageId },
      data: updateData,
    });

    // 获取该 pipeline 的所有阶段（按 order 排序）
    const allStages = await prisma.pipelineStage.findMany({
      where: { pipelineId: id },
      orderBy: { order: "asc" },
    });

    const currentIndex = allStages.findIndex((s) => s.id === stageId);

    // ── 如果阶段被标记为 completed，尝试推进流水线 ──
    if (stage.status === "completed") {
      const allPreviousCompleted = allStages
        .slice(0, currentIndex)
        .every((s) => s.status === "completed" || s.status === "skipped");

      if (allPreviousCompleted) {
        const nextStage = allStages[currentIndex + 1];
        if (nextStage) {
          await prisma.pipelineStage.update({
            where: { id: nextStage.id },
            data: { status: "active" },
          });
          await prisma.manuscriptPipeline.update({
            where: { id },
            data: {
              status: nextStage.name,
              currentStage: nextStage.name,
            },
          });
        } else {
          // publish 完成，流水线归档
          await prisma.manuscriptPipeline.update({
            where: { id },
            data: { status: "archived" },
          });
        }
      }
    }

    // ── 如果阶段被标记为 rejected，回退流水线 ──
    if (stage.status === "rejected") {
      const prevStage = allStages[currentIndex - 1];
      if (prevStage) {
        await prisma.pipelineStage.update({
          where: { id: prevStage.id },
          data: { status: "active" },
        });
        await prisma.manuscriptPipeline.update({
          where: { id },
          data: {
            status: prevStage.name,
            currentStage: prevStage.name,
          },
        });
      } else {
        // 第一阶段被 reject，回到起点
        await prisma.manuscriptPipeline.update({
          where: { id },
          data: {
            status: "idea",
            currentStage: "idea",
          },
        });
      }
    }

    return NextResponse.json({ success: true, data: stage });
  } catch (error) {
    console.error(
      "[PUT /api/research/pipelines/[id]/stages/[stageId]] error:",
      error
    );
    return NextResponse.json(
      { success: false, error: "Failed to update stage" },
      { status: 500 }
    );
  }
}
