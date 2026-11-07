import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateManuscriptInSegments } from "@/lib/manuscript-generation";
import { buildStageUpdateData } from "@/lib/pipeline-stage-update";

export const runtime = "nodejs";

/** 从 LLM 响应中提取 score（0-10） */
function extractScore(content: string): number {
  const patterns = [
    /score[:\s]*([0-9]+\.?[0-9]*)/i,
    /评分[:\s]*([0-9]+\.?[0-9]*)/i,
    /评分[（(]\s*([0-9]+\.?[0-9]*)\s*\/\s*10\s*[)）]/i,
    /([0-9]+\.?[0-9]*)\s*\/\s*10/i,
    /总体推荐[:\s]*(\d+\.?\d*)/i,
  ];
  for (const p of patterns) {
    const m = content.match(p);
    if (m) {
      const val = parseFloat(m[1]);
      if (!isNaN(val) && val >= 0 && val <= 10) return val;
    }
  }
  // 根据关键词推断
  const lower = content.toLowerCase();
  if (lower.includes("accept") || lower.includes("通过") || lower.includes("优秀")) return 8.5;
  if (lower.includes("minor_revision") || lower.includes("小修") || lower.includes("良好")) return 7.0;
  if (lower.includes("major_revision") || lower.includes("大修") || lower.includes("一般")) return 5.0;
  if (lower.includes("reject") || lower.includes("拒绝") || lower.includes("差")) return 3.0;
  return 6.0;
}

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
    const { content, feedback, score, autoGenerate, topic, targetModule, previousContent, maxTokens, totalOutputBudget, targetOutputTokens, segmentMaxTokens, timeoutMs, maxRetries, resume } = body;

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

    let finalContent = content;
    let finalScore = score;

    // ── LLM 自动生成阶段产出 ──
    if (autoGenerate === true) {
      try {
        const llmRes = await generateManuscriptInSegments({
          pipelineId: id,
          stageId,
          stageName: stage.name || "draft",
          topic: topic || stage.name || "未指定主题",
          targetModule: targetModule || "",
          previousContent: previousContent || "",
          maxTokens,
          totalOutputBudget,
          targetOutputTokens,
          segmentMaxTokens,
          timeoutMs,
          maxRetries,
          resume,
        });
        finalContent = llmRes.content;
        finalScore = extractScore(llmRes.content);
        console.log(`[Pipeline LLM] stage=${stage.name}, score=${finalScore}, latency=${llmRes.latencyMs}ms, segments=${llmRes.segmentCount}, resumed=${llmRes.resumedSegmentCount}`);
      } catch (error) {
        throw new Error(`Kimi 流水线内容生成失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const { updateData } = buildStageUpdateData({
      finalContent,
      feedback,
      finalScore,
      bodyStatus: body.status,
    });

    const updatedStage = await prisma.pipelineStage.update({
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
    if (updatedStage.status === "completed") {
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
    if (updatedStage.status === "rejected") {
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

    return NextResponse.json({ success: true, data: updatedStage });
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
