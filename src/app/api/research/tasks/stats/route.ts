import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // 按 status 聚合
    const statusStats = await prisma.academicTask.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    // 按 type 聚合
    const typeStats = await prisma.academicTask.groupBy({
      by: ["type"],
      _count: { type: true },
    });

    // 各模块任务分布（排除空模块）
    const moduleStats = await prisma.academicTask.groupBy({
      by: ["targetModule"],
      _count: { targetModule: true },
      where: { targetModule: { not: "" } },
    });

    // 平均评分（只统计已评分的任务）
    const avgScore = await prisma.academicTask.aggregate({
      _avg: { score: true },
      where: { score: { gt: 0 } },
    });

    // 总任务数
    const totalCount = await prisma.academicTask.count();

    const result = {
      total: totalCount,
      byStatus: statusStats.reduce((acc: Record<string, number>, s) => {
        acc[s.status] = s._count.status;
        return acc;
      }, {}),
      byType: typeStats.reduce((acc: Record<string, number>, s) => {
        acc[s.type] = s._count.type;
        return acc;
      }, {}),
      byModule: moduleStats.reduce((acc: Record<string, number>, s) => {
        acc[s.targetModule || "unassigned"] = s._count.targetModule;
        return acc;
      }, {}),
      averageScore: avgScore._avg.score || 0,
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[GET /api/research/tasks/stats] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch task stats" },
      { status: 500 }
    );
  }
}
