import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// 预置参赛者模板常量
const COMPETITOR_TEMPLATES = {
  theorem_prover: {
    specialty: "theorem_proving",
    systemPrompt: "你是定理证明竞赛参赛者。你精通形式化数学证明，擅长使用Lean 4、Coq等证明助手。你的目标是在竞赛中构造严格、优雅、可验证的数学证明。你注重逻辑严密性，每一步都有据可依。",
    model: "glm-5.1",
  },
  algorithm_designer: {
    specialty: "algorithm_design",
    systemPrompt: "你是算法设计竞赛参赛者。你精通算法与数据结构，擅长复杂度分析和优化策略。你的目标是在竞赛中设计出时间/空间复杂度最优的算法，并提供形式化正确性分析。",
    model: "glm-5.1",
  },
  formal_verifier: {
    specialty: "formal_verification",
    systemPrompt: "你是形式化验证竞赛参赛者。你精通程序验证、模型检验和定理证明。你的目标是在竞赛中严格验证系统或算法的正确性，发现潜在的逻辑漏洞并给出无漏洞的形式化证明。",
    model: "glm-5.1",
  },
  mathematical_solver: {
    specialty: "mathematical_solving",
    systemPrompt: "你是数学解题竞赛参赛者。你精通代数、分析、几何、数论等多个数学分支。你的目标是在竞赛中快速准确地求解复杂数学问题，给出清晰的推导过程和最终答案。",
    model: "glm-5.1",
  },
};

// GET /api/research/competitions/[id]/competitors - 列出参赛者
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const eliminated = searchParams.get("eliminated");

    const where: any = { competitionId: id };
    if (role) where.role = role;
    if (eliminated !== null) {
      where.eliminated = eliminated === "true";
    }

    const competitors = await prisma.academicCompetitor.findMany({
      where,
      orderBy: [{ rank: "asc" }, { score: "desc" }],
    });

    return NextResponse.json({ success: true, data: competitors });
  } catch (error) {
    console.error("[GET /api/research/competitions/:id/competitors] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch competitors" },
      { status: 500 }
    );
  }
}

// POST /api/research/competitions/[id]/competitors - 添加参赛者
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const templateKey = searchParams.get("template");

    const body = await request.json();

    // 检查竞赛是否存在
    const competition = await prisma.academicCompetition.findUnique({
      where: { id },
    });

    if (!competition) {
      return NextResponse.json(
        { success: false, error: "Competition not found" },
        { status: 404 }
      );
    }

    let competitorData: {
      name: string;
      specialty: string;
      role: string;
      systemPrompt: string;
      model: string;
    };

    // 如果指定了模板，从模板获取数据
    if (templateKey && templateKey in COMPETITOR_TEMPLATES) {
      const template = COMPETITOR_TEMPLATES[templateKey as keyof typeof COMPETITOR_TEMPLATES];
      competitorData = {
        name: body.name || templateKey,
        specialty: template.specialty,
        role: body.role || "contestant",
        systemPrompt: template.systemPrompt,
        model: template.model,
      };
    } else {
      // 自定义参赛者
      const { name, specialty, role, systemPrompt, model } = body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: "Competitor name is required" },
          { status: 400 }
        );
      }

      const validRoles = ["contestant", "team", "algorithm"];
      const competitorRole = validRoles.includes(role) ? role : "contestant";

      competitorData = {
        name: name.trim(),
        specialty: specialty?.trim() || "",
        role: competitorRole,
        systemPrompt: systemPrompt || "",
        model: model || "glm-5.1",
      };
    }

    const competitor = await prisma.academicCompetitor.create({
      data: {
        competitionId: id,
        name: competitorData.name,
        specialty: competitorData.specialty,
        role: competitorData.role,
        systemPrompt: competitorData.systemPrompt,
        model: competitorData.model,
        score: 0,
        rank: 0,
        eliminated: false,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: competitor,
        templateUsed: templateKey || null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/research/competitions/:id/competitors] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add competitor" },
      { status: 500 }
    );
  }
}

// 导出模板供其他模块使用
export { COMPETITOR_TEMPLATES };
