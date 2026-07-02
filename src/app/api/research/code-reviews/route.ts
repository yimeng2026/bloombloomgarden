import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_REVIEW_MODES = ["line_by_line", "overall", "structured", "interactive"];

// ── GET ───────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetModule = searchParams.get("targetModule");
    const status = searchParams.get("status");
    const reviewMode = searchParams.get("reviewMode");

    const where: Record<string, unknown> = {};
    if (targetModule) where.targetModule = targetModule;
    if (status) where.status = status;
    if (reviewMode) where.reviewMode = reviewMode;

    const groups = await prisma.codeReviewGroup.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        reviewers: {
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: { reviews: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: groups });
  } catch (error) {
    console.error("[GET /api/research/code-reviews] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch code review groups" },
      { status: 500 }
    );
  }
}

// ── POST ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, targetModule, targetFile, reviewMode } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Missing required field: name" },
        { status: 400 }
      );
    }

    if (reviewMode && !VALID_REVIEW_MODES.includes(reviewMode)) {
      return NextResponse.json(
        { success: false, error: `Invalid reviewMode. Valid: ${VALID_REVIEW_MODES.join(", ")}` },
        { status: 400 }
      );
    }

    const group = await prisma.codeReviewGroup.create({
      data: {
        name: name.trim(),
        description: (description || "").trim(),
        targetModule: (targetModule || "").trim(),
        targetFile: (targetFile || "").trim(),
        reviewMode: reviewMode || "line_by_line",
        status: "active",
      },
      include: {
        reviewers: true,
      },
    });

    return NextResponse.json({ success: true, data: group });
  } catch (error) {
    console.error("[POST /api/research/code-reviews] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create code review group" },
      { status: 500 }
    );
  }
}
