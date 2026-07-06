import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  try {
    const totalModules = await prisma.researchModule.count();
    const totalPapers = await prisma.researchPaper.count();
    const zeroSorryModules = await prisma.researchModule.count({
      where: { sorryCount: 0 },
    });

    // 各状态分布
    const moduleStatusDist = await prisma.researchModule.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    const paperStatusDist = await prisma.researchPaper.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    // 按学科的完成度百分比
    const disciplineStats = await prisma.researchModule.groupBy({
      by: ["discipline", "status"],
      _count: { status: true },
    });

    // 聚合学科完成度
    const disciplineProgress: Record<string, { total: number; complete: number; percentage: number }> = {};
    for (const stat of disciplineStats) {
      const disc = stat.discipline || "未分类";
      if (!disciplineProgress[disc]) {
        disciplineProgress[disc] = { total: 0, complete: 0, percentage: 0 };
      }
      disciplineProgress[disc].total += stat._count.status;
      if (stat.status === "complete") {
        disciplineProgress[disc].complete += stat._count.status;
      }
    }
    for (const disc of Object.keys(disciplineProgress)) {
      const { total, complete } = disciplineProgress[disc];
      disciplineProgress[disc].percentage = total > 0 ? Math.round((complete / total) * 100) : 0;
    }

    const stats = {
      totalModules,
      totalPapers,
      zeroSorryModules,
      moduleStatusDistribution: moduleStatusDist.reduce((acc: Record<string, number>, s) => {
        acc[s.status] = s._count.status;
        return acc;
      }, {}),
      paperStatusDistribution: paperStatusDist.reduce((acc: Record<string, number>, s) => {
        acc[s.status] = s._count.status;
        return acc;
      }, {}),
      disciplineProgress,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("[GET /api/research/stats] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats", fallback: true },
      { status: 500 }
    );
  }
}
