import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCollaborationResponse } from "@/lib/research-prompts";

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

/** 生成 fallback 模拟阶段产出 */
function generateMockStageContent(stage: string, topic: string): { content: string; score: number } {
  const stageDescriptions: Record<string, string> = {
    idea: `【模拟产出 — 选题构思】\n\n主题：${topic}\n\n研究问题：探索 ${topic} 的核心性质与推广。\n动机：该主题在现有文献中尚缺乏系统性研究。\n预期贡献：建立新的理论框架或证明新的定理。\n\n（注：当前处于模拟模式，未调用真实 LLM）`,
    outline: `【模拟产出 — 详细大纲】\n\n主题：${topic}\n\n1. 引言与背景\n2. 核心定义与符号\n3. 主要定理及其证明策略\n4. 辅助引理与推论\n5. 应用与例子\n6. 结论与未来方向\n\n（注：当前处于模拟模式，未调用真实 LLM）`,
    draft: `【模拟产出 — 初稿】\n\n主题：${topic}\n\n[此处为模拟初稿内容，包含引言、定义、定理陈述、证明、例子和结论的框架]\n\n（注：当前处于模拟模式，未调用真实 LLM）`,
    review: `【模拟产出 — 同行评审】\n\n主题：${topic}\n\n1. 创新性/原创性：7/10\n2. 技术正确性：8/10\n3. 表述清晰度：7/10\n4. 文献覆盖度：6/10\n5. 形式化质量：7/10\n\n总体推荐：minor_revision\n\n（注：当前处于模拟模式，未调用真实 LLM）`,
    revision: `【模拟产出 — 修改稿】\n\n主题：${topic}\n\n[此处为模拟修改内容，逐条回应评审意见]\n\n（注：当前处于模拟模式，未调用真实 LLM）`,
    final: `【模拟产出 — 最终润色】\n\n主题：${topic}\n\n[已进行术语一致性检查、引用完整性校验、证明可验证性确认]\n\n（注：当前处于模拟模式，未调用真实 LLM）`,
    publish: `【模拟产出 — 发表准备】\n\n主题：${topic}\n\n摘要：本文研究了 ${topic} 的核心性质，建立了新的理论框架...\n关键词：${topic}, 形式化验证, Lean 4\n\n（注：当前处于模拟模式，未调用真实 LLM）`,
  };

  return {
    content: stageDescriptions[stage] || stageDescriptions.draft,
    score: 6.0,
  };
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
    const { content, feedback, score, autoGenerate, topic, targetModule, previousContent } = body;

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
    let statusOverride: string | undefined;

    // ── LLM 自动生成阶段产出 ──
    if (autoGenerate === true) {
      try {
        const llmRes = await generateCollaborationResponse(
          "pipeline",
          {
            topic: topic || stage.name || "未指定主题",
            domain: "academic_pipeline",
            mode: "stage_production",
            stage: stage.name || "draft",
            previousContent: previousContent || "",
            targetModule: targetModule || "",
          },
          { model: "glm-5.1", temperature: 0.3, provider: "zhipu" }
        );
        finalContent = llmRes.content;
        finalScore = extractScore(llmRes.content);
        console.log(`[Pipeline LLM] stage=${stage.name}, score=${finalScore}, latency=${llmRes.latencyMs}ms`);
      } catch (llmErr: any) {
        console.error("[Pipeline LLM] error:", llmErr.message);
        // fallback: 使用请求体中的 content 或模拟内容
        const mock = generateMockStageContent(stage.name || "draft", topic || stage.name || "未指定主题");
        finalContent = body.content || mock.content;
        finalScore = body.score !== undefined ? body.score : mock.score;
      }
    }

    const updateData: any = {};
    if (finalContent !== undefined) updateData.content = finalContent;
    if (feedback !== undefined) updateData.feedback = feedback;

    if (finalScore !== undefined) {
      updateData.score = finalScore;
      if (finalScore >= 7.0) {
        updateData.status = "completed";
        updateData.completedAt = new Date();
        statusOverride = "completed";
      } else if (finalScore < 4.0) {
        updateData.status = "rejected";
        updateData.completedAt = null;
        statusOverride = "rejected";
      }
    }

    if (body.status !== undefined && !statusOverride) {
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
