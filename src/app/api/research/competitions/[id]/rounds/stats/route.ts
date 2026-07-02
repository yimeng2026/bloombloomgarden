import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/research/competitions/[id]/rounds/stats - 竞赛统计
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. 获取竞赛及参赛者、轮次
    const competition = await prisma.academicCompetition.findUnique({
      where: { id },
      include: {
        competitors: {
          orderBy: [{ rank: "asc" }, { score: "desc" }],
        },
        rounds: {
          orderBy: { roundNumber: "asc" },
        },
      },
    });

    if (!competition) {
      return NextResponse.json(
        { success: false, error: "Competition not found" },
        { status: 404 }
      );
    }

    const totalCompetitors = competition.competitors.length;
    const eliminated = competition.competitors.filter((c) => c.eliminated).length;
    const remaining = totalCompetitors - eliminated;

    // 2. 当前排名（按 score 排序）
    const rankings = competition.competitors.map((c, index) => ({
      rank: c.rank || index + 1,
      id: c.id,
      name: c.name,
      specialty: c.specialty,
      role: c.role,
      score: c.score,
      eliminated: c.eliminated,
      model: c.model,
    }));

    // 3. 各轮次平均分
    const roundAverages = competition.rounds.map((r) => {
      const scores = safeJsonParse<Array<{ competitorId: string; name: string; score: number }>>(
        r.scores,
        []
      );
      const avgScore =
        scores.length > 0
          ? parseFloat(
              (scores.reduce((sum, s) => sum + s.score, 0) / scores.length).toFixed(2)
            )
          : 0;
      return {
        roundNumber: r.roundNumber,
        phase: r.phase,
        topic: r.topic,
        avgScore,
        competitorCount: scores.length,
        consensusLevel: r.consensusLevel,
        createdAt: r.createdAt,
      };
    });

    // 4. 整体统计
    const totalScore = competition.competitors.reduce((sum, c) => sum + c.score, 0);
    const overallAvgScore =
      totalCompetitors > 0 ? parseFloat((totalScore / totalCompetitors).toFixed(2)) : 0;

    const highestScore =
      totalCompetitors > 0
        ? Math.max(...competition.competitors.map((c) => c.score))
        : 0;
    const lowestScore =
      totalCompetitors > 0
        ? Math.min(...competition.competitors.map((c) => c.score))
        : 0;

    // 5. 阶段说明
    const stageDescription = getStageDescription(competition.status);

    return NextResponse.json({
      success: true,
      data: {
        competition: {
          id: competition.id,
          name: competition.name,
          domain: competition.domain,
          format: competition.format,
          status: competition.status,
          currentRound: competition.currentRound,
          maxRounds: competition.maxRounds,
          stageDescription,
        },
        summary: {
          totalCompetitors,
          eliminated,
          remaining,
          totalRounds: competition.rounds.length,
          overallAvgScore,
          highestScore,
          lowestScore,
        },
        rankings,
        roundAverages,
      },
    });
  } catch (error) {
    console.error("[GET /api/research/competitions/[id]/rounds/stats] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch competition stats" },
      { status: 500 }
    );
  }
}

// 获取阶段描述
function getStageDescription(status: string): string {
  switch (status) {
    case "registration":
      return "正在接受参赛者报名，尚未开始比赛";
    case "active":
      return "竞赛正在进行中，轮次正在执行";
    case "judging":
      return "所有轮次已完成，正在进行最终评审";
    case "concluded":
      return "竞赛已结束，最终排名已确定";
    case "cancelled":
      return "竞赛已取消";
    default:
      return "未知阶段";
  }
}

// 安全 JSON 解析
function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
