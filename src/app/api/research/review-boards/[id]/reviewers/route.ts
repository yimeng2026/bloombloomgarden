import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// 预置评审模板常量
const REVIEWER_TEMPLATES = {
  single_blind: {
    reviewMode: "single_blind",
    systemPrompt:
      "你是单盲评审专家。作者不知道你的身份，但你知道作者是谁。请基于学术规范、创新性和方法论严谨性进行评审。提供建设性的反馈意见，指出论文的优缺点，并给出明确的修改建议。",
  },
  double_blind: {
    reviewMode: "double_blind",
    systemPrompt:
      "你是双盲评审专家。你和作者互相不知道对方身份。请仅基于论文内容本身进行评审，避免受到作者身份、机构或既往成果的影响。重点关注：问题定义是否清晰、方法是否创新且严谨、实验是否充分、结论是否有说服力。",
  },
  open: {
    reviewMode: "open",
    systemPrompt:
      "你是开放评审专家。评审过程完全透明，作者和公众都能看到你的评审意见。请保持专业、礼貌和公正的态度，提供详尽且有深度的评审。欢迎与作者进行建设性对话，共同探讨改进方案。",
  },
};

// GET: 列出评审成员，支持 ?role=xxx 和 ?specialty=xxx 筛选
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const specialty = searchParams.get("specialty");

    const where: any = { boardId: id };
    if (role) where.role = role;
    if (specialty) where.specialty = specialty;

    const members = await prisma.reviewBoardMember.findMany({
      where,
      orderBy: { weight: "desc" },
    });

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    console.error("[GET /api/research/review-boards/:id/reviewers] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reviewers" },
      { status: 500 }
    );
  }
}

// POST: 添加评审成员（role, specialty, weight, systemPrompt, model, anonymityId）
// 支持 ?template=single_blind|double_blind|open 快速创建
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const templateKey = searchParams.get("template");

    const body = await request.json();

    // 检查评审团是否存在
    const board = await prisma.academicReviewBoard.findUnique({
      where: { id },
    });

    if (!board) {
      return NextResponse.json(
        { success: false, error: "Review board not found" },
        { status: 404 }
      );
    }

    let memberData: {
      role: string;
      specialty: string;
      weight: number;
      systemPrompt: string;
      model: string;
      anonymityId: string;
    };

    // 如果指定了模板，从模板获取数据
    if (templateKey && templateKey in REVIEWER_TEMPLATES) {
      const template = REVIEWER_TEMPLATES[templateKey as keyof typeof REVIEWER_TEMPLATES];
      memberData = {
        role: body.role || "reviewer",
        specialty: body.specialty || template.reviewMode,
        weight: body.weight !== undefined ? body.weight : 1.0,
        systemPrompt: template.systemPrompt,
        model: body.model || "glm-5.1",
        anonymityId: body.anonymityId || "",
      };
    } else {
      // 自定义成员
      const { role, specialty, weight, systemPrompt, model, anonymityId } = body;

      if (!specialty || typeof specialty !== "string" || specialty.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: "Reviewer specialty is required" },
          { status: 400 }
        );
      }

      memberData = {
        role: role || "reviewer",
        specialty: specialty.trim(),
        weight: weight !== undefined ? weight : 1.0,
        systemPrompt: systemPrompt || "",
        model: model || "glm-5.1",
        anonymityId: anonymityId || "",
      };
    }

    const member = await prisma.reviewBoardMember.create({
      data: {
        boardId: id,
        role: memberData.role,
        specialty: memberData.specialty,
        weight: memberData.weight,
        systemPrompt: memberData.systemPrompt,
        model: memberData.model,
        anonymityId: memberData.anonymityId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: member,
        templateUsed: templateKey || null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/research/review-boards/:id/reviewers] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add reviewer" },
      { status: 500 }
    );
  }
}

// 导出模板供其他模块使用
export { REVIEWER_TEMPLATES };
