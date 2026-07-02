import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET: 获取单个评审团（含完整 reviewers 和 reviews 列表）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const board = await prisma.academicReviewBoard.findUnique({
      where: { id },
      include: {
        reviewers: {
          orderBy: { weight: "desc" },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!board) {
      return NextResponse.json(
        { success: false, error: "Review board not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: board });
  } catch (error) {
    console.error("[GET /api/research/review-boards/:id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch review board" },
      { status: 500 }
    );
  }
}

// PUT: 更新评审团（name, description, status, reviewMode, strategy）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, status, reviewMode, strategy } = body;

    const existing = await prisma.academicReviewBoard.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Review board not found" },
        { status: 404 }
      );
    }

    const validModes = ["single_blind", "double_blind", "open"];
    const validStatuses = ["active", "closed", "archived"];

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description;
    if (status !== undefined && validStatuses.includes(status)) data.status = status;
    if (reviewMode !== undefined && validModes.includes(reviewMode)) data.reviewMode = reviewMode;
    if (strategy !== undefined) {
      data.strategy = typeof strategy === "object" ? JSON.stringify(strategy) : strategy;
    }

    const board = await prisma.academicReviewBoard.update({
      where: { id },
      data,
      include: {
        reviewers: {
          orderBy: { weight: "desc" },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    return NextResponse.json({ success: true, data: board });
  } catch (error) {
    console.error("[PUT /api/research/review-boards/:id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update review board" },
      { status: 500 }
    );
  }
}

// DELETE: 级联删除（reviews + reviewers，通过 Prisma onDelete: Cascade 自动处理）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.academicReviewBoard.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Review board not found" },
        { status: 404 }
      );
    }

    await prisma.academicReviewBoard.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { id, deleted: true },
      message: "Review board and all associated reviewers and reviews have been deleted",
    });
  } catch (error) {
    console.error("[DELETE /api/research/review-boards/:id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete review board" },
      { status: 500 }
    );
  }
}
