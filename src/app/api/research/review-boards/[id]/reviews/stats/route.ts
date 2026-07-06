import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET: 评审统计
// 返回：按 decision 的分布、按 round 的分布、平均评分、当前评审状态
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 校验评审团存在
    const board = await prisma.academicReviewBoard.findUnique({
      where: { id },
    });
    if (!board) {
      return NextResponse.json(
        { success: false, error: "Review board not found" },
        { status: 404 }
      );
    }

    // 获取所有评审记录
    const reviews = await prisma.academicReview.findMany({
      where: { boardId: id },
    });

    const total = reviews.length;

    // 按 decision 分布
    const decisionCounts: Record<string, number> = {};
    const decisionDistribution: { decision: string; count: number; percentage: string }[] = [];

    for (const review of reviews) {
      decisionCounts[review.decision] = (decisionCounts[review.decision] || 0) + 1;
    }

    for (const [decision, count] of Object.entries(decisionCounts)) {
      decisionDistribution.push({
        decision,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(2) : "0.00",
      });
    }

    // 按 round 分布
    const roundCounts: Record<number, number> = {};
    const roundDistribution: { round: number; count: number }[] = [];

    for (const review of reviews) {
      roundCounts[review.round] = (roundCounts[review.round] || 0) + 1;
    }

    for (const [round, count] of Object.entries(roundCounts)) {
      roundDistribution.push({ round: parseInt(round, 10), count });
    }
    roundDistribution.sort((a, b) => a.round - b.round);

    // 平均评分
    const scoredReviews = reviews.filter((r) => r.score > 0);
    const averageScore =
      scoredReviews.length > 0
        ? scoredReviews.reduce((sum, r) => sum + r.score, 0) / scoredReviews.length
        : 0;

    // 当前评审状态
    // pending: 有 pending 决策
    // concluded: 所有评审都是 accept 或 reject（无 pending/minor_revision/major_revision）
    // active: 其他情况
    const allDecisions = reviews.map((r) => r.decision);
    const hasPending = allDecisions.some((d) => d === "pending");
    const allFinal =
      allDecisions.length > 0 &&
      allDecisions.every((d) => d === "accept" || d === "reject");

    let status: "pending" | "active" | "concluded" = "active";
    if (hasPending) status = "pending";
    else if (allFinal) status = "concluded";

    // 额外统计：按 targetId 分组统计
    const targetStats: Record<string, { count: number; latestRound: number; decisions: string[] }> = {};
    for (const review of reviews) {
      if (!targetStats[review.targetId]) {
        targetStats[review.targetId] = { count: 0, latestRound: 0, decisions: [] };
      }
      targetStats[review.targetId].count += 1;
      targetStats[review.targetId].latestRound = Math.max(
        targetStats[review.targetId].latestRound,
        review.round
      );
      targetStats[review.targetId].decisions.push(review.decision);
    }

    const uniqueTargets = Object.keys(targetStats).length;

    const stats = {
      total,
      uniqueTargets,
      averageScore: parseFloat(averageScore.toFixed(2)),
      status,
      decisionDistribution,
      roundDistribution,
      targetStats: Object.entries(targetStats).map(([targetId, data]) => ({
        targetId,
        ...data,
        decisions: [...new Set(data.decisions)],
      })),
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("[GET /api/research/review-boards/:id/reviews/stats] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to compute review stats" },
      { status: 500 }
    );
  }
}
