import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const discipline = searchParams.get("discipline");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {};
    if (discipline) where.discipline = discipline;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
      ];
    }

    const modules = await prisma.researchModule.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // 按 category 分组
    const grouped = modules.reduce((acc: Record<string, any[]>, module) => {
      const cat = module.category || "未分类";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(module);
      return acc;
    }, {});

    return NextResponse.json({ success: true, data: grouped });
  } catch (error) {
    console.error("[GET /api/research/modules] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch modules", fallback: true },
      { status: 500 }
    );
  }
}
