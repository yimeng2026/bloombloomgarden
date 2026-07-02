import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_CONCLUSIONS = ["verified", "refuted", "inconclusive", "pending"];

// GET: 列出验证结果，支持 ?conclusion=xxx 筛选，按 createdAt 排序
// 返回统计：按 conclusion 的分布、平均置信度、验证方法分布
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const conclusion = searchParams.get("conclusion");

    const group = await prisma.validationGroup.findUnique({
      where: { id },
    });

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Validation group not found" },
        { status: 404 }
      );
    }

    const where: any = { groupId: id };
    if (conclusion) where.conclusion = conclusion;

    const results = await prisma.validationResult.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // 统计所有结果（不受 conclusion 筛选影响）
    const allResults = await prisma.validationResult.findMany({
      where: { groupId: id },
      select: {
        conclusion: true,
        confidence: true,
        method: true,
      },
    });

    const distribution: Record<string, number> = {};
    let totalConfidence = 0;
    const methodDistribution: Record<string, number> = {};

    for (const r of allResults) {
      distribution[r.conclusion] = (distribution[r.conclusion] || 0) + 1;
      totalConfidence += r.confidence;
      if (r.method) {
        methodDistribution[r.method] = (methodDistribution[r.method] || 0) + 1;
      }
    }

    const stats = {
      total: allResults.length,
      distribution,
      averageConfidence: allResults.length > 0 ? totalConfidence / allResults.length : 0,
      methodDistribution,
    };

    return NextResponse.json({ success: true, data: results, stats });
  } catch (error) {
    console.error("[GET /api/research/validations/:id/results] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch validation results" },
      { status: 500 }
    );
  }
}

// POST: 提交验证结果
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { validatorId, method, input, output, conclusion, confidence, details } = body;

    const group = await prisma.validationGroup.findUnique({
      where: { id },
    });

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Validation group not found" },
        { status: 404 }
      );
    }

    if (conclusion && !VALID_CONCLUSIONS.includes(conclusion)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid conclusion. Valid: ${VALID_CONCLUSIONS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const conf = typeof confidence === "number" ? confidence : parseFloat(confidence || "0");
    if (isNaN(conf) || conf < 0 || conf > 1) {
      return NextResponse.json(
        { success: false, error: "Confidence must be a number between 0 and 1" },
        { status: 400 }
      );
    }

    const result = await prisma.validationResult.create({
      data: {
        groupId: id,
        validatorId: validatorId || "",
        method: method || "",
        input: input || "",
        output: output || "",
        conclusion: conclusion || "pending",
        confidence: conf,
        details: details || "",
      },
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/research/validations/:id/results] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create validation result" },
      { status: 500 }
    );
  }
}
