import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const field = searchParams.get("field");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {};
    if (field) where.field = field;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { abstract: { contains: search, mode: "insensitive" } },
      ];
    }

    const papers = await prisma.researchPaper.findMany({
      where,
      orderBy: [{ type: "asc" }, { title: "asc" }],
    });

    // 按 type 分组（Hilbert / Millennium）
    const grouped = papers.reduce((acc: Record<string, any[]>, paper) => {
      const type = paper.type || "Unknown";
      if (!acc[type]) acc[type] = [];
      acc[type].push(paper);
      return acc;
    }, {});

    return NextResponse.json({ success: true, data: grouped });
  } catch (error) {
    console.error("[GET /api/research/papers] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch papers", fallback: true },
      { status: 500 }
    );
  }
}
