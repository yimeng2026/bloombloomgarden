import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET: 返回所有评审团（含 reviewers 关联），支持 ?domain=xxx & ?status=xxx & ?reviewMode=xxx 筛选
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");
    const status = searchParams.get("status");
    const reviewMode = searchParams.get("reviewMode");

    const where: any = {};
    if (domain) where.domain = domain;
    if (status) where.status = status;
    if (reviewMode) where.reviewMode = reviewMode;

    const boards = await prisma.academicReviewBoard.findMany({
      where,
      include: {
        reviewers: {
          orderBy: { weight: "desc" },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: boards });
  } catch (error) {
    console.error("[GET /api/research/review-boards] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch review boards" },
      { status: 500 }
    );
  }
}

// POST: 创建评审团（name, description, domain, reviewMode, strategy JSON）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, domain, reviewMode, strategy } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Review board name is required" },
        { status: 400 }
      );
    }

    const validModes = ["single_blind", "double_blind", "open"];
    const mode = reviewMode && validModes.includes(reviewMode) ? reviewMode : "single_blind";

    const board = await prisma.academicReviewBoard.create({
      data: {
        name: name.trim(),
        description: description || "",
        domain: domain || "",
        reviewMode: mode,
        status: "active",
        strategy: typeof strategy === "object" ? JSON.stringify(strategy) : strategy || "{}",
      },
      include: {
        reviewers: true,
      },
    });

    return NextResponse.json({ success: true, data: board }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/research/review-boards] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create review board" },
      { status: 500 }
    );
  }
}
