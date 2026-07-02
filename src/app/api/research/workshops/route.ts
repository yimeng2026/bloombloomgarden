import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/research/workshops - 获取所有研讨会
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const panelId = searchParams.get("panelId");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (panelId) where.panelId = panelId;

    const workshops = await prisma.academicWorkshop.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        panel: {
          select: {
            id: true,
            name: true,
            description: true,
            domain: true,
            status: true,
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
        _count: {
          select: {
            rounds: true,
            tasks: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: workshops });
  } catch (error) {
    console.error("[GET /api/research/workshops] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch workshops" },
      { status: 500 }
    );
  }
}

// POST /api/research/workshops - 创建研讨会
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, topic, panelId, mode = "committee", maxRounds = 5 } = body;

    if (!title || !panelId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: title, panelId" },
        { status: 400 }
      );
    }

    // 验证 panel 存在
    const panel = await prisma.academicPanel.findUnique({
      where: { id: panelId },
      include: { members: true },
    });
    if (!panel) {
      return NextResponse.json(
        { success: false, error: "Panel not found" },
        { status: 404 }
      );
    }

    // 创建 workshop
    const workshop = await prisma.academicWorkshop.create({
      data: {
        title: title.trim(),
        topic: (topic || "").trim(),
        panelId,
        mode,
        maxRounds: Math.max(1, Math.min(20, Number(maxRounds) || 5)),
        status: "planning",
        currentRound: 0,
      },
      include: {
        panel: {
          select: {
            id: true,
            name: true,
            domain: true,
            status: true,
          },
        },
        rounds: true,
      },
    });

    return NextResponse.json({ success: true, data: workshop });
  } catch (error) {
    console.error("[POST /api/research/workshops] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create workshop" },
      { status: 500 }
    );
  }
}
