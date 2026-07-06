import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET: 验证统计
// 返回：verified/refuted/inconclusive/pending 的数量和百分比
// 平均置信度
// 验证状态（所有成员一致 verified = 通过，任一 refuted = 失败）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const group = await prisma.validationGroup.findUnique({
      where: { id },
      include: {
        validators: true,
        results: true,
      },
    });

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Validation group not found" },
        { status: 404 }
      );
    }

    const results = group.results;
    const total = results.length;

    const counts = {
      verified: 0,
      refuted: 0,
      inconclusive: 0,
      pending: 0,
    };

    let totalConfidence = 0;

    for (const r of results) {
      const c = r.conclusion as keyof typeof counts;
      if (counts[c] !== undefined) counts[c]++;
      totalConfidence += r.confidence;
    }

    const percentages = {
      verified: total > 0 ? (counts.verified / total) * 100 : 0,
      refuted: total > 0 ? (counts.refuted / total) * 100 : 0,
      inconclusive: total > 0 ? (counts.inconclusive / total) * 100 : 0,
      pending: total > 0 ? (counts.pending / total) * 100 : 0,
    };

    const averageConfidence = total > 0 ? totalConfidence / total : 0;

    // 验证状态判断
    let validationStatus: "pending" | "passed" | "failed" = "pending";
    if (total > 0) {
      if (counts.refuted > 0) {
        validationStatus = "failed";
      } else if (
        counts.verified > 0 &&
        counts.pending === 0 &&
        counts.inconclusive === 0
      ) {
        validationStatus = "passed";
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total,
        counts,
        percentages,
        averageConfidence,
        validationStatus,
        validatorCount: group.validators.length,
      },
    });
  } catch (error) {
    console.error("[GET /api/research/validations/:id/results/stats] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch validation stats" },
      { status: 500 }
    );
  }
}
