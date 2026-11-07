import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCollaborationResponses, PromptContext } from "@/lib/research-prompts";
import { ExecutionPlan, generateStages, parseCustomStages } from "@/lib/panel-execution";

export const runtime = "nodejs";

/**
 * 执行计划生成器
 * 根据专家组和模式生成执行计划，集成真实 LLM 调用（GLM-5.1）
 * 失败时自动 fallback 到模拟内容，不报错
 */

// Fallback：生成模拟的 LLM 响应
function generateFallbackStep(
  member: { id: string; role: string; specialty: string; model: string },
  topic: string
): ExecutionPlan["steps"][0] {
  return {
    memberId: member.id,
    role: member.role,
    specialty: member.specialty,
    content: `【模拟响应】作为 ${member.role}（专长：${member.specialty || "general"}），我对 "${topic}" 的初步分析如下：\n\n1. 核心问题界定：该议题涉及 ${member.specialty || "general"} 领域的关键挑战。\n2. 研究现状：目前该领域已有若干重要结果，但仍存在开放问题。\n3. 主要挑战：理论推导的严谨性与实际应用的可行性之间存在张力。\n4. 建议方向：建议从形式化验证和交叉验证两个角度推进研究。\n5. 交叉领域：与相关学科存在潜在的协同机会。`,
    latencyMs: 0,
    model: member.model,
  };
}

// POST: 生成专家组执行计划
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { topic, mode = "committee" } = body;

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Topic is required" },
        { status: 400 }
      );
    }

    const validModes = ["committee", "debate", "sequential", "parallel"];
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { success: false, error: `Invalid mode. Must be one of: ${validModes.join(", ")}` },
        { status: 400 }
      );
    }

    // 获取专家组及其成员
    const panel = await prisma.academicPanel.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: { weight: "desc" },
        },
      },
    });

    if (!panel) {
      return NextResponse.json(
        { success: false, error: "Panel not found" },
        { status: 404 }
      );
    }

    if (panel.members.length === 0) {
      return NextResponse.json(
        { success: false, error: "Panel has no members. Add members before executing." },
        { status: 400 }
      );
    }

    // 计算元数据
    const members = panel.members;
    const meta = {
      totalMembers: members.length,
      chairCount: members.filter((m) => m.role === "chair").length,
      reviewerCount: members.filter((m) => m.role === "reviewer").length,
      contributorCount: members.filter((m) => m.role === "contributor").length,
      totalWeight: members.reduce((sum, m) => sum + m.weight, 0),
    };

    // 生成执行计划
    const stages = generateStages(mode, members);

    const plan: ExecutionPlan = {
      mode,
      topic: topic.trim(),
      panelId: id,
      panelName: panel.name,
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        specialty: m.specialty,
        weight: m.weight,
        systemPrompt: m.systemPrompt,
        model: m.model,
      })),
      stages,
      meta,
      steps: [],
    };

    // 如果专家组策略中定义了自定义阶段，合并
    let strategyObj: unknown = {};
    try {
      strategyObj = JSON.parse(panel.strategy || "{}");
    } catch {
      strategyObj = {};
    }

    const customStages = parseCustomStages(strategyObj);
    if (customStages) {
      plan.stages = customStages;
    }

    // ─── 真实 LLM 调用（带 fallback）───
    try {
      const contexts: PromptContext[] = members.map((m) => ({
        topic: topic.trim(),
        domain: panel.domain || "general",
        mode,
        role: m.role,
        specialty: m.specialty,
      }));

      const responses = await generateCollaborationResponses(
        "expert_panel",
        contexts,
        { concurrency: 3 }
      );

      // researchChatBatch 在失败时返回含 "【LLM 调用失败】" 的响应
      const allFailed =
        responses.length > 0 &&
        responses.every((r) => r.content.includes("【LLM 调用失败】"));

      if (allFailed) {
        throw new Error("All LLM calls failed (no API key or network error)");
      }

      plan.steps = responses.map((r, i) => {
        const failed = r.content.includes("【LLM 调用失败】");
        const member = members[i];
        return {
          memberId: member.id,
          role: member.role,
          specialty: member.specialty,
          content: failed
            ? generateFallbackStep(member, topic.trim()).content
            : r.content,
          latencyMs: failed ? 0 : r.latencyMs,
          model: failed ? member.model : r.model || member.model,
          usage: failed ? undefined : r.usage,
        };
      });
    } catch (err) {
      console.error("[PanelExecute] LLM call failed, using fallback:", err);
      plan.steps = members.map((m) => generateFallbackStep(m, topic.trim()));
    }

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    console.error("[POST /api/research/panels/:id/execute] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate execution plan" },
      { status: 500 }
    );
  }
}
