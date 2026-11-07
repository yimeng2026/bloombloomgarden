import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildResearchPaperFilter, groupResearchPapersByType } from "@/lib/research-papers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const field = searchParams.get("field");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where = buildResearchPaperFilter({ field, status, search });

    const papers = await prisma.researchPaper.findMany({
      where,
      orderBy: [{ type: "asc" }, { title: "asc" }],
    });

    // 按 type 分组（Hilbert / Millennium）
    const grouped = groupResearchPapersByType(papers);

    return NextResponse.json({ success: true, data: grouped });
  } catch (error) {
    console.error("[GET /api/research/papers] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch papers", fallback: true },
      { status: 500 }
    );
  }
}
