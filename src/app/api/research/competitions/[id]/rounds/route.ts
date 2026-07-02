import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCollaborationResponses, PromptContext } from "@/lib/research-prompts";

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

    // 2. 根据 format 生成轮次内容（模拟结构作为基础）
    const roundContent = generateRoundContent(
      competition.format,
      competition.competitors,
      nextRoundNumber,
      roundTopic
    );

    // 3. 尝试调用 LLM 生成真实竞赛内容和评分
    let llmScores: Array<{ competitorId: string; name: string; score: number }> | null = null;
    let llmContents: Array<{ competitorId: string; content: string }> | null = null;

    try {
      const llmResult = await generateCompetitionLLMScores(
        competition.competitors,
        nextRoundNumber,
        roundTopic,
        competition.format,
        competition.domain
      );
      llmScores = llmResult.scores;
      llmContents = llmResult.contents;
    } catch (err) {
      console.error("[Competition LLM] Generation failed:", err);
      // 失败时保持 null，后续会 fallback 到模拟评分
    }

    // 4. 合并 LLM 结果到 roundContent（每个 competitor 的 LLM 内容）
    const enrichedRoundContent = enrichRoundContentWithLLM(
      roundContent,
      llmContents,
      llmScores
    );

    // 5. 最终评分（LLM 成功用 LLM 评分，否则 fallback 到随机）
    const scores: Array<{ competitorId: string; name: string; score: number }> = [];
    for (const c of competition.competitors) {
      const llmScore = llmScores?.find((s) => s.competitorId === c.id);
      if (llmScore && llmScore.score >= 0) {
        scores.push(llmScore);
      } else {
        // Fallback: 随机评分
        scores.push({
          competitorId: c.id,
          name: c.name,
          score: parseFloat((5.0 + Math.random() * 5.0).toFixed(2)),
        });
      }
    }

    // 6. 计算共识度（0.5 + 0.1 * roundNumber，上限 0.95）
    const consensusLevel = Math.min(0.95, 0.5 + 0.1 * nextRoundNumber);

    // 7. 确定 phase
    const phase = determinePhase(nextRoundNumber, competition.maxRounds);

    // 8. 创建 CompetitionRound 记录
    const round = await prisma.competitionRound.create({
      data: {
        competitionId: id,
        roundNumber: nextRoundNumber,
        phase,
        topic: roundTopic,
        content: JSON.stringify(enrichedRoundContent),
        scores: JSON.stringify(scores),
        consensusLevel,
      },
    });

    // 9. 更新参赛者分数（累积平均分）
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

    // 10. 处理淘汰逻辑（elimination / bracket 格式）
    if (competition.format === "elimination" || competition.format === "bracket") {
      await handleElimination(id, competition.format, scores, competition.competitors);
    }

    // 11. 更新竞赛当前轮次和状态
    const isConcluded = nextRoundNumber >= competition.maxRounds;

    const updatedCompetition = await prisma.academicCompetition.update({
      where: { id },
      data: {
        currentRound: nextRoundNumber,
        status: isConcluded ? "concluded" : nextRoundNumber === 1 ? "active" : competition.status,
      },
    });

    // 12. 如果已结束，计算最终排名
    if (isConcluded) {
      await calculateFinalRankings(id);
    }

    return NextResponse.json({
      success: true,
      round: {
        ...round,
        content: enrichedRoundContent,
        scores,
      },
      competition: {
        id: updatedCompetition.id,
        currentRound: updatedCompetition.currentRound,
        status: updatedCompetition.status,
        consensusLevel,
      },
      llmEnabled: llmScores !== null,
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

// ─── LLM 集成辅助函数 ───

/** 从 LLM 响应中解析评分（0-10） */
function parseScoreFromLLMResponse(content: string): number | null {
  const patterns = [
    /评分[:\s]*([\d.]+)/i,
    /score[:\s]*([\d.]+)/i,
    /总分[:\s]*([\d.]+)/i,
    /([\d.]+)\s*\/\s*10/,
    /(\d+(?:\.\d+)?)\s*分/,
    /(\d+(?:\.\d+)?)\s*points?/i,
    /(?:评分|score|总分)[^\d]*(\d+(?:\.\d+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const score = parseFloat(match[1]);
      if (!isNaN(score)) {
        // 如果是 0-100 百分制，转换为 0-10
        if (score > 10 && score <= 100) return Math.min(10, score / 10);
        if (score >= 0 && score <= 10) return score;
      }
    }
  }
  return null;
}

/** 基于内容质量估算评分（LLM 未给出明确评分时的 fallback） */
function estimateScoreFromContent(content: string): number {
  const len = content.length;
  let score = 5.0;

  // 长度加分
  if (len > 2000) score += 2.0;
  else if (len > 1000) score += 1.5;
  else if (len > 500) score += 1.0;
  else if (len > 200) score += 0.5;

  // 学术关键词加分
  const keywords = [
    "证明", "定理", "推导", "Lean", "结论", "分析", "insight",
    "proof", "theorem", "derivation", "formalization", "lemma",
    "corollary", "proposition", "strategy", "methodology",
  ];
  for (const kw of keywords) {
    if (content.toLowerCase().includes(kw.toLowerCase())) {
      score += 0.3;
    }
  }

  // 随机波动
  score += Math.random() * 1.0;

  return Math.min(10, Math.max(5, score));
}

/** 批量调用 LLM 为每个参赛者生成竞赛内容并评分 */
async function generateCompetitionLLMScores(
  competitors: Array<{
    id: string;
    name: string;
    specialty: string;
    role: string;
    systemPrompt: string;
    model: string;
  }>,
  roundNumber: number,
  topic: string,
  format: string,
  domain: string
): Promise<{
  contents: Array<{ competitorId: string; content: string }>;
  scores: Array<{ competitorId: string; name: string; score: number }>;
}> {
  const otherCompetitors = competitors.map((c) => ({
    name: c.name,
    specialty: c.specialty,
  }));

  const contexts: PromptContext[] = competitors.map((c) => ({
    topic,
    domain: domain || "general",
    mode: format,
    role: c.role,
    specialty: c.specialty,
    roundNumber,
    competitors: otherCompetitors.filter((x) => x.name !== c.name),
  }));

  const responses = await generateCollaborationResponses("competition", contexts, {
    concurrency: 3,
  });

  const contents: Array<{ competitorId: string; content: string }> = [];
  const scores: Array<{ competitorId: string; name: string; score: number }> = [];

  for (let i = 0; i < competitors.length; i++) {
    const c = competitors[i];
    const resp = responses[i];
    const content = resp?.content?.trim() || "";

    // 检测 LLM 调用失败
    if (!content || content.includes("【LLM 调用失败】")) {
      contents.push({ competitorId: c.id, content: "" });
      scores.push({ competitorId: c.id, name: c.name, score: -1 }); // -1 表示失败
      continue;
    }

    // 解析评分
    let score = parseScoreFromLLMResponse(content);
    if (score === null) {
      // 基于内容质量估算
      score = estimateScoreFromContent(content);
    }

    contents.push({ competitorId: c.id, content });
    scores.push({ competitorId: c.id, name: c.name, score: parseFloat(score.toFixed(2)) });
  }

  return { contents, scores };
}

/** 将 LLM 内容合并到 roundContent 中 */
function enrichRoundContentWithLLM(
  roundContent: Array<Record<string, unknown>>,
  llmContents: Array<{ competitorId: string; content: string }> | null,
  llmScores: Array<{ competitorId: string; name: string; score: number }> | null
): Array<Record<string, unknown>> {
  if (!llmContents || llmContents.length === 0) {
    return roundContent;
  }

  const enriched = roundContent.map((item) => {
    const newItem = { ...item };

    // 处理 competitorId 类型的条目（elimination, default, round_robin 的 reviewer）
    const cid = (item as any).competitorId || (item as any).reviewerId;
    if (cid) {
      const llm = llmContents.find((lc) => lc.competitorId === cid);
      if (llm?.content) {
        (newItem as any).llmContent = llm.content;
        const scoreEntry = llmScores?.find((s) => s.competitorId === cid);
        if (scoreEntry && scoreEntry.score >= 0) {
          (newItem as any).llmScore = scoreEntry.score;
        }
      }
    }

    // 处理 tournament / bracket 的 competitorA / competitorB
    const compA = (item as any).competitorA;
    const compB = (item as any).competitorB;
    if (compA?.id) {
      const llmA = llmContents.find((lc) => lc.competitorId === compA.id);
      if (llmA?.content) {
        (newItem as any).llmContentA = llmA.content;
        const scoreA = llmScores?.find((s) => s.competitorId === compA.id);
        if (scoreA && scoreA.score >= 0) {
          (newItem as any).llmScoreA = scoreA.score;
        }
      }
    }
    if (compB?.id) {
      const llmB = llmContents.find((lc) => lc.competitorId === compB.id);
      if (llmB?.content) {
        (newItem as any).llmContentB = llmB.content;
        const scoreB = llmScores?.find((s) => s.competitorId === compB.id);
        if (scoreB && scoreB.score >= 0) {
          (newItem as any).llmScoreB = scoreB.score;
        }
      }
    }

    return newItem;
  });

  // 追加一个 competitorResponses 汇总条目
  const competitorResponses = llmContents
    .filter((lc) => lc.content)
    .map((lc) => {
      const scoreEntry = llmScores?.find((s) => s.competitorId === lc.competitorId);
      return {
        competitorId: lc.competitorId,
        content: lc.content,
        score: scoreEntry && scoreEntry.score >= 0 ? scoreEntry.score : null,
      };
    });

  if (competitorResponses.length > 0) {
    enriched.push({
      type: "llm_competitor_responses",
      competitorResponses,
      timestamp: new Date().toISOString(),
    });
  }

  return enriched;
}

// 根据 format 生成轮次内容（模拟结构，作为 fallback 基础）
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
