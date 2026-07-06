import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  try {
    // 各模块的 sorry 统计
    const moduleStats = await prisma.researchModule.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        sorryCount: true,
        theoremCount: true,
        definitionCount: true,
        status: true,
      },
      orderBy: { sorryCount: "desc" },
    });

    // 定理状态分布
    const theoremStatusDist = await prisma.researchTheorem.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    // Git 同步状态：TOE-SYLVA vs PFE 最后提交
    const latestToeSylva = await prisma.researchSync.findFirst({
      where: { repoName: "TOE-SYLVA" },
      orderBy: { syncedAt: "desc" },
    });

    const latestPfe = await prisma.researchSync.findFirst({
      where: { repoName: "PFE" },
      orderBy: { syncedAt: "desc" },
    });

    const verification = {
      moduleStats: moduleStats.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        sorryCount: m.sorryCount,
        theoremCount: m.theoremCount,
        definitionCount: m.definitionCount,
        status: m.status,
      })),
      theoremStatusDistribution: theoremStatusDist.reduce((acc: Record<string, number>, t) => {
        acc[t.status] = t._count.status;
        return acc;
      }, {}),
      syncStatus: {
        TOE_SYLVA: latestToeSylva
          ? {
              commitHash: latestToeSylva.commitHash,
              branch: latestToeSylva.branch,
              syncedAt: latestToeSylva.syncedAt,
              filesChanged: latestToeSylva.filesChanged,
              insertions: latestToeSylva.insertions,
              deletions: latestToeSylva.deletions,
            }
          : null,
        PFE: latestPfe
          ? {
              commitHash: latestPfe.commitHash,
              branch: latestPfe.branch,
              syncedAt: latestPfe.syncedAt,
              filesChanged: latestPfe.filesChanged,
              insertions: latestPfe.insertions,
              deletions: latestPfe.deletions,
            }
          : null,
      },
    };

    return NextResponse.json({ success: true, data: verification });
  } catch (error) {
    console.error("[GET /api/research/verification] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch verification stats", fallback: true },
      { status: 500 }
    );
  }
}
