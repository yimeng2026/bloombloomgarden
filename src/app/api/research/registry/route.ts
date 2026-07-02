import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const COLLABORATION_TYPES = [
  {
    id: "expert_panel",
    name: "专家组",
    description: "多学科专家组成的顾问委员会",
    icon: "Users",
    color: "#8b5cf6",
    modes: ["committee", "debate", "sequential", "parallel"],
    applicableDomains: ["mathematics", "physics", "biology", "ai", "interdisciplinary"],
    requires: [],
    features: ["专家角色分配", "投票权重", "执行计划生成"]
  },
  {
    id: "workshop",
    name: "学术研讨会",
    description: "围绕特定论题的深度讨论",
    icon: "MessageSquare",
    color: "#3b82f6",
    modes: ["committee", "debate", "sequential", "parallel", "socratic", "deliberation"],
    applicableDomains: ["all"],
    requires: ["expert_panel"],
    features: ["多轮讨论", "共识度追踪", "自动总结"]
  },
  {
    id: "pipeline",
    name: "稿件流水线",
    description: "从选题到发表的完整论文生产流程",
    icon: "GitBranch",
    color: "#10b981",
    modes: ["sequential", "stage_gate"],
    applicableDomains: ["all"],
    requires: ["expert_panel"],
    features: ["7阶段状态机", "评分驱动推进", "自动返工"]
  },
  {
    id: "review_board",
    name: "评审团",
    description: "学术成果的同行评审",
    icon: "Shield",
    color: "#f59e0b",
    modes: ["single_blind", "double_blind", "open"],
    applicableDomains: ["all"],
    requires: [],
    features: ["匿名评审", "多轮评审", "评审决策追踪"]
  },
  {
    id: "competition",
    name: "学术竞赛",
    description: "对抗性的学术能力比拼",
    icon: "Trophy",
    color: "#f43f5e",
    modes: ["tournament", "elimination", "round_robin", "bracket"],
    applicableDomains: ["mathematics", "ai", "algorithm"],
    requires: [],
    features: ["自动排名", "淘汰机制", "多轮竞赛"]
  },
  {
    id: "mentorship",
    name: "教学辅导",
    description: "导师-学生结构化学习",
    icon: "GraduationCap",
    color: "#06b6d4",
    modes: ["one_on_one", "group", "peer", "socratic"],
    applicableDomains: ["all"],
    requires: [],
    features: ["课程大纲", "会话记录", "学习评分"]
  },
  {
    id: "code_review",
    name: "代码审查",
    description: "Lean/代码的形式化审查",
    icon: "Code",
    color: "#6366f1",
    modes: ["line_by_line", "overall", "structured", "interactive"],
    applicableDomains: ["mathematics", "formalization", "cs"],
    requires: [],
    features: ["行级审查", "严重度分级", "审查状态追踪"]
  },
  {
    id: "validation",
    name: "验证组",
    description: "定理/结果的独立验证",
    icon: "CheckCircle",
    color: "#22c55e",
    modes: ["numerical", "symbolic", "experimental", "cross_reference", "peer"],
    applicableDomains: ["mathematics", "physics", "cs"],
    requires: [],
    features: ["多方法验证", "置信度评估", "结论一致性检查"]
  },
  {
    id: "task_force",
    name: "任务组",
    description: "执行具体学术任务的专项团队",
    icon: "Target",
    color: "#ec4899",
    modes: ["prove", "review", "verify", "discover", "draft", "critique", "audit"],
    applicableDomains: ["all"],
    requires: [],
    features: ["任务类型多样", "优先级管理", "结果追踪"]
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    let types = COLLABORATION_TYPES;

    if (domain) {
      types = types.filter(
        (t) =>
          t.applicableDomains.includes("all") ||
          t.applicableDomains.includes(domain)
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        types,
        count: types.length,
        total: COLLABORATION_TYPES.length,
        filtered: domain ? true : false,
        filterDomain: domain || null
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
