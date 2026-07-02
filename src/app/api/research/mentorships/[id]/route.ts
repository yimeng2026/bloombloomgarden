import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_STATUSES = ["active", "paused", "completed", "cancelled"];

// ── GET ───────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const mentorship = await prisma.academicMentorship.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!mentorship) {
      return NextResponse.json(
        { success: false, error: "Mentorship not found" },
        { status: 404 }
      );
    }

    // 解析 curriculum JSON
    const parsed = {
      ...mentorship,
      curriculum: safeParseJSON(mentorship.curriculum, []),
    };

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("[GET /api/research/mentorships/:id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch mentorship" },
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
    const { name, description, status, curriculum } = body;

    const existing = await prisma.academicMentorship.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Mentorship not found" },
        { status: 404 }
      );
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Valid: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (status !== undefined) updateData.status = status;
    if (curriculum !== undefined) {
      updateData.curriculum = JSON.stringify(Array.isArray(curriculum) ? curriculum : []);
    }
    updateData.updatedAt = new Date();

    const updated = await prisma.academicMentorship.update({
      where: { id },
      data: updateData,
      include: {
        sessions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const parsed = {
      ...updated,
      curriculum: safeParseJSON(updated.curriculum, []),
    };

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("[PUT /api/research/mentorships/:id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update mentorship" },
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

    const existing = await prisma.academicMentorship.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Mentorship not found" },
        { status: 404 }
      );
    }

    // Prisma onDelete: Cascade 会自动删除关联 sessions
    await prisma.academicMentorship.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    console.error("[DELETE /api/research/mentorships/:id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete mentorship" },
      { status: 500 }
    );
  }
}

// ── 辅助函数 ──────────────────────────────────────────────
function safeParseJSON(json: string, fallback: unknown[] = []) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
