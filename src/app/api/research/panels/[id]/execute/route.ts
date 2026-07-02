import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * 执行计划生成器
 * 根据专家组和模式生成执行计划，不直接调用 LLM
 * LLM 调用由 workshop 路由负责
 */

interface ExecutionPlan {
  mode: string;
  topic: string;
  panelId: string;
  panelName: string;
  members: Array<{
    id: string;
    role: string;
    specialty: string;
    weight: number;
    systemPrompt: string;
    model: string;
  }>;
  stages: Array<{
    name: string;
    description: string;
    assigneeRoles: string[];
    expectedOutput: string;
  }>;
  meta: {
    totalMembers: number;
    chairCount: number;
    reviewerCount: number;
    contributorCount: number;
    totalWeight: number;
  };
}

// 根据执行模式生成阶段
function generateStages(mode: string, members: any[]): ExecutionPlan["stages"] {
  const roles = members.map((m) => m.role);
  const hasChair = roles.includes("chair");
  const hasReviewer = roles.includes("reviewer");

  switch (mode) {
    case "committee":
      return [
        {
          name: "初步审议",
          description: "各专家基于自身专长提出对议题的初步分析和见解",
          assigneeRoles: ["contributor", "chair"],
          expectedOutput: "每位成员提交一份初步分析备忘录",
        },
        {
          name: "交叉评议",
          description: "成员之间就初步分析进行交叉质疑和补充",
          assigneeRoles: hasReviewer ? ["reviewer", "chair"] : ["contributor", "chair"],
          expectedOutput: "交叉评议报告，包含质疑点和补充建议",
        },
        {
          name: "综合决议",
          description: "主席或全体委员会综合各方意见形成共识决议",
          assigneeRoles: ["chair", "contributor"],
          expectedOutput: "委员会共识决议文档",
        },
      ];

    case "debate":
      return [
        {
          name: "立论陈词",
          description: "正方和反方分别阐述自己的立场和论据",
          assigneeRoles: ["contributor"],
          expectedOutput: "立论陈词记录",
        },
        {
          name: "自由辩论",
          description: "各方成员自由展开辩论，提出反驳和质疑",
          assigneeRoles: ["contributor", "reviewer"],
          expectedOutput: "辩论过程记录和关键论点",
        },
        {
          name: "总结评议",
          description: "主席或评审员总结辩论结果，评估各方论证质量",
          assigneeRoles: ["chair", "reviewer"],
          expectedOutput: "辩论总结与裁决报告",
        },
      ];

    case "sequential":
      // 按专长排序的流水线
      return members
        .filter((m) => m.role !== "observer")
        .sort((a: any, b: any) => b.weight - a.weight)
        .map((member: any, index: number) => ({
          name: `阶段 ${index + 1}: ${member.specialty}`,
          description: `${member.role === "chair" ? "主席" : "专家"} (${member.specialty}) 基于前一阶段的输出进行深化分析`,
          assigneeRoles: [member.role],
          expectedOutput: `阶段 ${index + 1} 分析报告，基于 ${member.specialty} 视角`,
        }));

    case "parallel":
      // 所有专家同时工作，最后汇总
      return [
        {
          name: "并行分析",
          description: "所有专家同时从各自专长角度对议题进行独立分析",
          assigneeRoles: ["contributor", "chair", "reviewer"],
          expectedOutput: "各专家独立分析报告",
        },
        {
          name: "汇总整合",
          description: "主席或协调员将各专家的独立分析整合为综合报告",
          assigneeRoles: ["chair"],
          expectedOutput: "综合整合报告",
        },
      ];

    default:
      return [
        {
          name: "通用分析",
          description: "专家组基于各自专长进行综合分析",
          assigneeRoles: ["contributor", "chair", "reviewer"],
          expectedOutput: "综合分析报告",
        },
      ];
  }
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
    };

    // 如果专家组策略中定义了自定义阶段，合并
    let strategyObj: any = {};
    try {
      strategyObj = JSON.parse(panel.strategy || "{}");
    } catch {
      strategyObj = {};
    }

    if (strategyObj.customStages && Array.isArray(strategyObj.customStages)) {
      plan.stages = strategyObj.customStages.map((s: any) => ({
        name: s.name || "自定义阶段",
        description: s.description || "",
        assigneeRoles: s.assigneeRoles || ["contributor"],
        expectedOutput: s.expectedOutput || "",
      }));
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
