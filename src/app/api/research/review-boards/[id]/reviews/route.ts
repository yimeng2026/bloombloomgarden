import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET: 列出评审，支持 ?targetId=xxx & ?decision=xxx & ?round=xxx 筛选
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get("targetId");
    const decision = searchParams.get("decision");
    const round = searchParams.get("round");

    const where: any = { boardId: id };
    if (targetId) where.targetId = targetId;
    if (decision) where.decision = decision;
    if (round) where.round = parseInt(round, 10);

    const reviews = await prisma.academicReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: reviews });
  } catch (error) {
    console.error("[GET /api/research/review-boards/:id/reviews] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

// POST: 提交评审（targetType, targetId, title, content, score, decision, reviewerId, round）
// 如果 round > 1，需要检查上一轮所有评审的 decision 是否一致（都是 accept/reject/major_revision）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      targetType,
      targetId,
      title,
      content,
      score,
      decision,
      reviewerId,
      round,
    } = body;

    // 基本校验
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Review title is required" },
        { status: 400 }
      );
    }
    if (!targetId || typeof targetId !== "string" || targetId.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "targetId is required" },
        { status: 400 }
      );
    }

    const validDecisions = ["accept", "minor_revision", "major_revision", "reject", "pending"];
    const finalDecision = decision && validDecisions.includes(decision) ? decision : "pending";

    const reviewRound = round !== undefined ? parseInt(round, 10) : 1;
    if (isNaN(reviewRound) || reviewRound < 1) {
      return NextResponse.json(
        { success: false, error: "round must be a positive integer" },
        { status: 400 }
      );
    }

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

    // 如果 round > 1，检查上一轮所有评审的 decision 是否一致
    if (reviewRound > 1) {
      const previousRound = reviewRound - 1;
      const previousReviews = await prisma.academicReview.findMany({
        where: {
          boardId: id,
          targetId: targetId.trim(),
          round: previousRound,
        },
      });

      if (previousReviews.length === 0) {
        return NextResponse.json(
          { success: false, error: `No reviews found in round ${previousRound} for targetId ${targetId}` },
          { status: 400 }
        );
      }

      const decisions = previousReviews.map((r) => r.decision);
      const allSame = decisions.every((d) => d === decisions[0]);
      const unanimousDecisions = ["accept", "reject", "major_revision"];
      const isUnanimous = allSame && unanimousDecisions.includes(decisions[0]);

      if (!isUnanimous) {
        return NextResponse.json(
          {
            success: false,
            error: `Round ${previousRound} reviews do not have unanimous decision (all accept/reject/major_revision). Current decisions: ${decisions.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    // 校验 score 范围
    let finalScore = 0;
    if (score !== undefined) {
      finalScore = parseFloat(score);
      if (isNaN(finalScore) || finalScore < 0 || finalScore > 10) {
        return NextResponse.json(
          { success: false, error: "score must be between 0 and 10" },
          { status: 400 }
        );
      }
    }

    const review = await prisma.academicReview.create({
      data: {
        boardId: id,
        targetType: targetType || "paper",
        targetId: targetId.trim(),
        title: title.trim(),
        content: content || "",
        score: finalScore,
        decision: finalDecision,
        reviewerId: reviewerId || "",
        round: reviewRound,
      },
    });

    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/research/review-boards/:id/reviews] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create review" },
      { status: 500 }
    );
  }
}
