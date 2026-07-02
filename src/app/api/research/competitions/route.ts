import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/research/competitions - 返回所有竞赛（含 competitors 关联）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");
    const status = searchParams.get("status");
    const format = searchParams.get("format");

    const where: any = {};
    if (domain) where.domain = domain;
    if (status) where.status = status;
    if (format) where.format = format;

    const competitions = await prisma.academicCompetition.findMany({
      where,
      include: {
        competitors: {
          orderBy: [{ rank: "asc" }, { score: "desc" }],
          select: {
            id: true,
            name: true,
            specialty: true,
            role: true,
            model: true,
            score: true,
            rank: true,
            eliminated: true,
            createdAt: true,
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: competitions });
  } catch (error) {
    console.error("[GET /api/research/competitions] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch competitions", fallback: true },
      { status: 500 }
    );
  }
}

// POST /api/research/competitions - 创建竞赛
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, domain, format, status, maxRounds, criteria } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Competition name is required" },
        { status: 400 }
      );
    }

    const validFormats = ["tournament", "elimination", "round_robin", "bracket"];
    const validStatuses = ["registration", "active", "judging", "concluded", "cancelled"];

    const competitionFormat = validFormats.includes(format) ? format : "tournament";
    const competitionStatus = validStatuses.includes(status) ? status : "registration";

    const competition = await prisma.academicCompetition.create({
      data: {
        name: name.trim(),
        description: description?.trim() || "",
        domain: domain?.trim() || "",
        format: competitionFormat,
        status: competitionStatus,
        maxRounds: Math.max(1, Math.min(20, Number(maxRounds) || 5)),
        criteria: criteria ? JSON.stringify(criteria) : "{}",
      },
    });

    return NextResponse.json(
      { success: true, data: competition },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/research/competitions] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create competition" },
      { status: 500 }
    );
  }
}
