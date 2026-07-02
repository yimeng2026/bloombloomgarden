import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/research/competitions/[id] - 获取单个竞赛详情（含 competitors 和 rounds）
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const competition = await prisma.academicCompetition.findUnique({
      where: { id },
      include: {
        competitors: {
          orderBy: [{ rank: "asc" }, { score: "desc" }],
        },
        rounds: {
          orderBy: { roundNumber: "asc" },
        },
      },
    });

    if (!competition) {
      return NextResponse.json(
        { success: false, error: "Competition not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: competition });
  } catch (error) {
    console.error("[GET /api/research/competitions/[id]] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch competition" },
      { status: 500 }
    );
  }
}

// PUT /api/research/competitions/[id] - 更新竞赛
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, status, maxRounds, criteria } = body;

    const validStatuses = ["registration", "active", "judging", "concluded", "cancelled"];

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description.trim();
    if (status !== undefined && validStatuses.includes(status)) data.status = status;
    if (maxRounds !== undefined) {
      data.maxRounds = Math.max(1, Math.min(20, Number(maxRounds) || 5));
    }
    if (criteria !== undefined) data.criteria = JSON.stringify(criteria);

    const competition = await prisma.academicCompetition.update({
      where: { id },
      data,
      include: {
        competitors: {
          orderBy: [{ rank: "asc" }, { score: "desc" }],
          select: {
            id: true,
            name: true,
            specialty: true,
            role: true,
            score: true,
            rank: true,
            eliminated: true,
          },
        },
        rounds: {
          orderBy: { roundNumber: "asc" },
          select: {
            id: true,
            roundNumber: true,
            phase: true,
            topic: true,
            consensusLevel: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: competition });
  } catch (error) {
    console.error("[PUT /api/research/competitions/[id]] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update competition" },
      { status: 500 }
    );
  }
}

// DELETE /api/research/competitions/[id] - 级联删除竞赛
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Prisma 的 onDelete: Cascade 会自动处理 competitors 和 rounds 的删除
    await prisma.academicCompetition.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      data: { id, deleted: true },
    });
  } catch (error) {
    console.error("[DELETE /api/research/competitions/[id]] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete competition" },
      { status: 500 }
    );
  }
}
