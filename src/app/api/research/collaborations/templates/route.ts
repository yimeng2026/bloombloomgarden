import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const COLLABORATION_TEMPLATES = [
  {
    id: "full_research",
    name: "完整研究生态",
    description: "专家组 + 研讨会 + 流水线 + 评审 + 验证",
    types: ["panel", "workshop", "pipeline", "reviewBoard", "validation"],
    domains: ["mathematics", "physics", "ai"],
  },
  {
    id: "theorem_proving",
    name: "定理证明竞赛",
    description: "专家组 + 竞赛 + 验证 + 代码审查",
    types: ["panel", "competition", "validation", "codeReview"],
    domains: ["mathematics"],
  },
  {
    id: "paper_writing",
    name: "论文写作流程",
    description: "专家组 + 研讨会 + 流水线 + 评审",
    types: ["panel", "workshop", "pipeline", "reviewBoard"],
    domains: ["all"],
  },
  {
    id: "peer_review",
    name: "同行评审",
    description: "评审团 + 验证 + 任务",
    types: ["reviewBoard", "validation", "task"],
    domains: ["all"],
  },
  {
    id: "educational",
    name: "教学辅导",
    description: "辅导 + 代码审查 + 任务",
    types: ["mentorship", "codeReview", "task"],
    domains: ["all"],
  },
  {
    id: "cross_validation",
    name: "交叉验证",
    description: "验证组 + 评审团 + 任务",
    types: ["validation", "reviewBoard", "task"],
    domains: ["mathematics", "physics"],
  },
];

// GET: 返回所有预置的协作模板列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    let templates = COLLABORATION_TEMPLATES;
    if (domain) {
      templates = templates.filter(
        (t) => t.domains.includes("all") || t.domains.includes(domain)
      );
    }

    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error("[GET /api/research/collaborations/templates] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch collaboration templates" },
      { status: 500 }
    );
  }
}
