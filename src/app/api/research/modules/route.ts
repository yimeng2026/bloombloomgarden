import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildResearchModuleFilter, groupResearchModulesByCategory } from "@/lib/research-modules";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const discipline = searchParams.get("discipline");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where = buildResearchModuleFilter({ discipline, status, search });

    const modules = await prisma.researchModule.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // 按 category 分组
    const grouped = groupResearchModulesByCategory(modules);

    return NextResponse.json({ success: true, data: grouped });
  } catch (error) {
    console.error("[GET /api/research/modules] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch modules", fallback: true },
      { status: 500 }
    );
  }
}
