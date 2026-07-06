import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/research/workshops/[id] - 获取单个研讨会详情
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const workshop = await prisma.academicWorkshop.findUnique({
      where: { id },
      include: {
        panel: {
          include: {
            members: {
              orderBy: { role: "asc" },
              select: {
                id: true,
                role: true,
                specialty: true,
                weight: true,
                systemPrompt: true,
                model: true,
                createdAt: true,
              },
            },
          },
        },
        rounds: {
          orderBy: { roundNumber: "asc" },
        },
        tasks: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!workshop) {
      return NextResponse.json(
        { success: false, error: "Workshop not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: workshop });
  } catch (error) {
    console.error("[GET /api/research/workshops/[id]] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch workshop" },
      { status: 500 }
    );
  }
}

// PUT /api/research/workshops/[id] - 更新研讨会
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, topic, status, maxRounds } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (topic !== undefined) data.topic = topic.trim();
    if (status !== undefined) data.status = status;
    if (maxRounds !== undefined) {
      data.maxRounds = Math.max(1, Math.min(20, Number(maxRounds) || 5));
    }

    const workshop = await prisma.academicWorkshop.update({
      where: { id },
      data,
      include: {
        panel: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
        rounds: {
          orderBy: { roundNumber: "asc" },
          select: {
            id: true,
            roundNumber: true,
            phase: true,
            consensusLevel: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: workshop });
  } catch (error) {
    console.error("[PUT /api/research/workshops/[id]] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update workshop" },
      { status: 500 }
    );
  }
}

// DELETE /api/research/workshops/[id] - 删除研讨会（级联删除 rounds）
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Prisma 的 onDelete: Cascade 会自动处理 rounds 和 tasks 的删除
    await prisma.academicWorkshop.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      data: { id, deleted: true },
    });
  } catch (error) {
    console.error("[DELETE /api/research/workshops/[id]] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete workshop" },
      { status: 500 }
    );
  }
}
