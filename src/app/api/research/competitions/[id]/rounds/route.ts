import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// POST /api/research/competitions/[id]/rounds - 执行一轮竞赛
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { topic, customPrompt } = body;

    // 1. 获取竞赛及未淘汰参赛者
    const competition = await prisma.academicCompetition.findUnique({
      where: { id },
      include: {
        competitors: {
          where: { eliminated: false },
          orderBy: [{ score: "desc" }, { rank: "asc" }],
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

    // 已结束的竞赛不能继续
    if (competition.status === "concluded" || competition.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: `Competition is already ${competition.status}` },
        { status: 400 }
      );
    }

    // 参赛者不足
    if (!competition.competitors || competition.competitors.length === 0) {
      return NextResponse.json(
        { success: false, error: "Competition has no active competitors" },
        { status: 400 }
      );
    }

    const nextRoundNumber = competition.currentRound + 1;
    const roundTopic = topic?.trim() || customPrompt?.trim() || `Round ${nextRoundNumber}`;

    // 2. 根据 format 生成轮次内容
    const roundContent = generateRoundContent(
      competition.format,
      competition.competitors,
      nextRoundNumber,
      roundTopic
    );

    // 3. 生成模拟评分（0-10 分）
    const scores = competition.competitors.map((c) => ({
      competitorId: c.id,
      name: c.name,
      score: parseFloat((5.0 + Math.random() * 5.0).toFixed(2)), // 5.0 - 10.0
    }));

    // 4. 计算共识度（0.5 + 0.1 * roundNumber，上限 0.95）
    const consensusLevel = Math.min(0.95, 0.5 + 0.1 * nextRoundNumber);

    // 5. 确定 phase
    const phase = determinePhase(nextRoundNumber, competition.maxRounds);

    // 6. 创建 CompetitionRound 记录
    const round = await prisma.competitionRound.create({
      data: {
        competitionId: id,
        roundNumber: nextRoundNumber,
        phase,
        topic: roundTopic,
        content: JSON.stringify(roundContent),
        scores: JSON.stringify(scores),
        consensusLevel,
      },
    });

    // 7. 更新参赛者分数（累积平均分）
    for (const s of scores) {
      const competitor = competition.competitors.find((c) => c.id === s.competitorId);
      if (competitor) {
        const newScore = parseFloat(
          (
            (competitor.score * (nextRoundNumber - 1) + s.score) / nextRoundNumber
          ).toFixed(2)
        );
        await prisma.academicCompetitor.update({
          where: { id: s.competitorId },
          data: { score: newScore },
        });
      }
    }

    // 8. 处理淘汰逻辑（elimination / bracket 格式）
    if (competition.format === "elimination" || competition.format === "bracket") {
      await handleElimination(id, competition.format, scores, competition.competitors);
    }

    // 9. 更新竞赛当前轮次和状态
    const isConcluded = nextRoundNumber >= competition.maxRounds;

    const updatedCompetition = await prisma.academicCompetition.update({
      where: { id },
      data: {
        currentRound: nextRoundNumber,
        status: isConcluded ? "concluded" : nextRoundNumber === 1 ? "active" : competition.status,
      },
    });

    // 10. 如果已结束，计算最终排名
    if (isConcluded) {
      await calculateFinalRankings(id);
    }

    return NextResponse.json({
      success: true,
      round: {
        ...round,
        content: roundContent,
        scores,
      },
      competition: {
        id: updatedCompetition.id,
        currentRound: updatedCompetition.currentRound,
        status: updatedCompetition.status,
        consensusLevel,
      },
    });
  } catch (error) {
    console.error("[POST /api/research/competitions/[id]/rounds] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to execute round" },
      { status: 500 }
    );
  }
}

// GET /api/research/competitions/[id]/rounds - 列出所有轮次
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rounds = await prisma.competitionRound.findMany({
      where: { competitionId: id },
      orderBy: { roundNumber: "asc" },
    });

    // 解析 JSON 字段
    const parsedRounds = rounds.map((r) => ({
      ...r,
      content: safeJsonParse(r.content, []),
      scores: safeJsonParse(r.scores, []),
    }));

    return NextResponse.json({ success: true, data: parsedRounds });
  } catch (error) {
    console.error("[GET /api/research/competitions/[id]/rounds] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch rounds" },
      { status: 500 }
    );
  }
}

// 根据 format 生成轮次内容（模拟数据，不直接调用 LLM）
function generateRoundContent(
  format: string,
  competitors: Array<{
    id: string;
    name: string;
    specialty: string;
    role: string;
    systemPrompt: string;
    model: string;
  }>,
  roundNumber: number,
  topic: string
): Array<Record<string, unknown>> {
  const timestamp = new Date().toISOString();

  switch (format) {
    case "tournament": {
      // 配对对抗：第一名 vs 第二名，以此类推
      const pairs: Array<Record<string, unknown>> = [];
      const sorted = [...competitors].sort((a, b) => a.name.localeCompare(b.name));
      for (let i = 0; i < sorted.length; i += 2) {
        const a = sorted[i];
        const b = sorted[i + 1];
        if (b) {
          pairs.push({
            matchId: i / 2 + 1,
            competitorA: { id: a.id, name: a.name, specialty: a.specialty },
            competitorB: { id: b.id, name: b.name, specialty: b.specialty },
            topic,
            roundNumber,
            type: "duel",
            content: `Tournament match: ${a.name} (${a.specialty}) vs ${b.name} (${b.specialty}) on "${topic}".`,
            timestamp,
          });
        } else {
          // 轮空（bye）
          pairs.push({
            matchId: i / 2 + 1,
            competitorA: { id: a.id, name: a.name, specialty: a.specialty },
            competitorB: null,
            topic,
            roundNumber,
            type: "bye",
            content: `${a.name} (${a.specialty}) receives a bye for round ${roundNumber}.`,
            timestamp,
          });
        }
      }
      return pairs;
    }

    case "elimination": {
      // 淘汰最低分者：所有参赛者表现记录
      return competitors.map((c) => ({
        competitorId: c.id,
        name: c.name,
        specialty: c.specialty,
        role: c.role,
        model: c.model,
        roundNumber,
        type: "performance",
        content: `Elimination round ${roundNumber}: ${c.name} (${c.specialty}) responds to "${topic}".`,
        timestamp,
      }));
    }

    case "round_robin": {
      // 所有参赛者互评
      const reviews: Array<Record<string, unknown>> = [];
      for (let i = 0; i < competitors.length; i++) {
        for (let j = 0; j < competitors.length; j++) {
          if (i === j) continue;
          reviews.push({
            reviewerId: competitors[i].id,
            reviewerName: competitors[i].name,
            revieweeId: competitors[j].id,
            revieweeName: competitors[j].name,
            roundNumber,
            type: "peer_review",
            content: `${competitors[i].name} reviews ${competitors[j].name}'s work on "${topic}".`,
            timestamp,
          });
        }
      }
      return reviews;
    }

    case "bracket": {
      // 单淘汰制配对
      const bracketPairs: Array<Record<string, unknown>> = [];
      const sorted = [...competitors].sort((a, b) => a.name.localeCompare(b.name));
      for (let i = 0; i < sorted.length; i += 2) {
        const a = sorted[i];
        const b = sorted[i + 1];
        if (b) {
          bracketPairs.push({
            matchId: i / 2 + 1,
            bracketRound: roundNumber,
            competitorA: { id: a.id, name: a.name, specialty: a.specialty },
            competitorB: { id: b.id, name: b.name, specialty: b.specialty },
            topic,
            type: "knockout",
            content: `Bracket knockout: ${a.name} vs ${b.name} on "${topic}". Winner advances.`,
            timestamp,
          });
        } else {
          bracketPairs.push({
            matchId: i / 2 + 1,
            bracketRound: roundNumber,
            competitorA: { id: a.id, name: a.name, specialty: a.specialty },
            competitorB: null,
            topic,
            type: "bye",
            content: `${a.name} advances automatically in bracket round ${roundNumber}.`,
            timestamp,
          });
        }
      }
      return bracketPairs;
    }

    default: {
      return competitors.map((c) => ({
        competitorId: c.id,
        name: c.name,
        specialty: c.specialty,
        role: c.role,
        model: c.model,
        roundNumber,
        type: "statement",
        content: `${c.name} (${c.specialty}) responds to "${topic}" in round ${roundNumber}.`,
        timestamp,
      }));
    }
  }
}

// 确定本轮 phase
function determinePhase(roundNumber: number, maxRounds: number): string {
  if (roundNumber === maxRounds) return "result";
  if (roundNumber === maxRounds - 1) return "evaluation";
  if (roundNumber === 1) return "challenge";
  return "response";
}

// 处理淘汰逻辑
async function handleElimination(
  competitionId: string,
  format: string,
  scores: Array<{ competitorId: string; name: string; score: number }>,
  competitors: Array<{ id: string; name: string }>
) {
  if (format === "elimination") {
    // 淘汰最低分者
    const sortedScores = [...scores].sort((a, b) => a.score - b.score);
    const lowest = sortedScores[0];
    if (lowest) {
      await prisma.academicCompetitor.update({
        where: { id: lowest.competitorId },
        data: { eliminated: true },
      });
    }
  } else if (format === "bracket") {
    // 单淘汰制：配对中淘汰一半（模拟：每对中低分者淘汰）
    const sorted = [...scores].sort((a, b) => a.score - b.score);
    const half = Math.floor(sorted.length / 2);
    const toEliminate = sorted.slice(0, Math.max(1, half));
    for (const s of toEliminate) {
      await prisma.academicCompetitor.update({
        where: { id: s.competitorId },
        data: { eliminated: true },
      });
    }
  }
}

// 计算最终排名
async function calculateFinalRankings(competitionId: string) {
  const competitors = await prisma.academicCompetitor.findMany({
    where: { competitionId },
    orderBy: [{ score: "desc" }],
  });

  for (let i = 0; i < competitors.length; i++) {
    await prisma.academicCompetitor.update({
      where: { id: competitors[i].id },
      data: { rank: i + 1 },
    });
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
