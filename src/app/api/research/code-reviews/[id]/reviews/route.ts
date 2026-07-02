import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_SEVERITIES = ["critical", "major", "minor", "suggestion", "praise"];
const VALID_STATUSES = ["open", "resolved", "dismissed", "pending"];

// ── GET ───────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");

    const group = await prisma.codeReviewGroup.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json(
        { success: false, error: "Code review group not found" },
        { status: 404 }
      );
    }

    const where: Record<string, unknown> = { groupId: id };
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const reviews = await prisma.codeReview.findMany({
      where,
      orderBy: [{ lineStart: "asc" }, { createdAt: "desc" }],
    });

    // 统计：各 severity 数量、各 status 分布
    const stats = {
      severity: {} as Record<string, number>,
      status: {} as Record<string, number>,
      total: reviews.length,
    };
    for (const r of reviews) {
      stats.severity[r.severity] = (stats.severity[r.severity] || 0) + 1;
      stats.status[r.status] = (stats.status[r.status] || 0) + 1;
    }

    return NextResponse.json({ success: true, data: reviews, stats });
  } catch (error) {
    console.error("[GET /api/research/code-reviews/:id/reviews] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

// ── POST ──────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      lineStart,
      lineEnd,
      targetCode,
      comment,
      severity,
      reviewerId,
    } = body;

    const group = await prisma.codeReviewGroup.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json(
        { success: false, error: "Code review group not found" },
        { status: 404 }
      );
    }

    if (comment === undefined || comment === "") {
      return NextResponse.json(
        { success: false, error: "Missing required field: comment" },
        { status: 400 }
      );
    }

    if (severity && !VALID_SEVERITIES.includes(severity)) {
      return NextResponse.json(
        { success: false, error: `Invalid severity. Valid: ${VALID_SEVERITIES.join(", ")}` },
        { status: 400 }
      );
    }

    const review = await prisma.codeReview.create({
      data: {
        groupId: id,
        lineStart: Number(lineStart) || 0,
        lineEnd: Number(lineEnd) || 0,
        targetCode: (targetCode || "").trim(),
        comment: comment.trim(),
        severity: severity || "suggestion",
        reviewerId: (reviewerId || "").trim(),
        status: "open",
      },
    });

    return NextResponse.json({ success: true, data: review });
  } catch (error) {
    console.error("[POST /api/research/code-reviews/:id/reviews] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create review" },
      { status: 500 }
    );
  }
}
