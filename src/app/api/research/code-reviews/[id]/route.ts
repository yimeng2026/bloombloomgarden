import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_REVIEW_MODES = ["line_by_line", "overall", "structured", "interactive"];
const VALID_STATUSES = ["active", "concluded", "archived"];

// ── GET ───────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const group = await prisma.codeReviewGroup.findUnique({
      where: { id },
      include: {
        reviewers: {
          orderBy: { createdAt: "asc" },
        },
        reviews: {
          orderBy: [{ lineStart: "asc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Code review group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: group });
  } catch (error) {
    console.error("[GET /api/research/code-reviews/:id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch code review group" },
      { status: 500 }
    );
  }
}

// ── PUT ───────────────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, status, reviewMode } = body;

    const existing = await prisma.codeReviewGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Code review group not found" },
        { status: 404 }
      );
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Valid: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    if (reviewMode && !VALID_REVIEW_MODES.includes(reviewMode)) {
      return NextResponse.json(
        { success: false, error: `Invalid reviewMode. Valid: ${VALID_REVIEW_MODES.join(", ")}` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (status !== undefined) updateData.status = status;
    if (reviewMode !== undefined) updateData.reviewMode = reviewMode;
    updateData.updatedAt = new Date();

    const updated = await prisma.codeReviewGroup.update({
      where: { id },
      data: updateData,
      include: {
        reviewers: true,
        reviews: {
          orderBy: [{ lineStart: "asc" }, { createdAt: "desc" }],
        },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[PUT /api/research/code-reviews/:id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update code review group" },
      { status: 500 }
    );
  }
}

// ── DELETE ────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.codeReviewGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Code review group not found" },
        { status: 404 }
      );
    }

    // Prisma onDelete: Cascade 自动删除 reviewers 和 reviews
    await prisma.codeReviewGroup.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    console.error("[DELETE /api/research/code-reviews/:id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete code review group" },
      { status: 500 }
    );
  }
}
