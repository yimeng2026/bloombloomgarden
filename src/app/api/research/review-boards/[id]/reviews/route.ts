import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCollaborationResponse, PromptContext } from "@/lib/research-prompts";

export const runtime = "nodejs";

// GET: 列出评审，支持 ?targetId=xxx & ?decision=xxx & ?round=xxx 筛选
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get("targetId");
    const decision = searchParams.get("decision");
    const round = searchParams.get("round");

    const where: any = { boardId: id };
    if (targetId) where.targetId = targetId;
    if (decision) where.decision = decision;
    if (round) where.round = parseInt(round, 10);

    const reviews = await prisma.academicReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: reviews });
  } catch (error) {
    console.error("[GET /api/research/review-boards/:id/reviews] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

// POST: 提交评审（targetType, targetId, title, content, score, decision, reviewerId, round）
// 如果 content 未提供，自动调用 LLM 生成评审
// 如果 round > 1，需要检查上一轮所有评审的 decision 是否一致
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      targetType,
      targetId,
      title,
      content,
      score,
      decision,
      reviewerId,
      round,
    } = body;

    // 基本校验
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Review title is required" },
        { status: 400 }
      );
    }
    if (!targetId || typeof targetId !== "string" || targetId.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "targetId is required" },
        { status: 400 }
      );
    }

    const validDecisions = ["accept", "minor_revision", "major_revision", "reject", "pending"];
    let finalDecision = decision && validDecisions.includes(decision) ? decision : "pending";

    const reviewRound = round !== undefined ? parseInt(round, 10) : 1;
    if (isNaN(reviewRound) || reviewRound < 1) {
      return NextResponse.json(
        { success: false, error: "round must be a positive integer" },
        { status: 400 }
      );
    }

    // 校验评审团存在，并读取 reviewers
    const board = await prisma.academicReviewBoard.findUnique({
      where: { id },
      include: { reviewers: true },
    });
    if (!board) {
      return NextResponse.json(
        { success: false, error: "Review board not found" },
        { status: 404 }
      );
    }

    // 如果 round > 1，检查上一轮所有评审的 decision 是否一致
    if (reviewRound > 1) {
      const previousRound = reviewRound - 1;
      const previousReviews = await prisma.academicReview.findMany({
        where: {
          boardId: id,
          targetId: targetId.trim(),
          round: previousRound,
        },
      });

      if (previousReviews.length === 0) {
        return NextResponse.json(
          { success: false, error: `No reviews found in round ${previousRound} for targetId ${targetId}` },
          { status: 400 }
        );
      }

      const decisions = previousReviews.map((r) => r.decision);
      const allSame = decisions.every((d) => d === decisions[0]);
      const unanimousDecisions = ["accept", "reject", "major_revision"];
      const isUnanimous = allSame && unanimousDecisions.includes(decisions[0]);

      if (!isUnanimous) {
        return NextResponse.json(
          {
            success: false,
            error: `Round ${previousRound} reviews do not have unanimous decision (all accept/reject/major_revision). Current decisions: ${decisions.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    // 校验 score 范围
    let finalScore = 0;
    if (score !== undefined) {
      finalScore = parseFloat(score);
      if (isNaN(finalScore) || finalScore < 0 || finalScore > 10) {
        return NextResponse.json(
          { success: false, error: "score must be between 0 and 10" },
          { status: 400 }
        );
      }
    }

    // ─── LLM 自动生成评审内容（当 content 未提供时）───
    let finalContent = content || "";
    let llmGenerated = false;

    if (!finalContent || finalContent.trim().length === 0) {
      try {
        const llmResult = await generateReviewContentWithLLM(
          board,
          targetType || "paper",
          targetId.trim(),
          title.trim(),
          reviewRound
        );
        finalContent = llmResult.content;
        if (llmResult.score !== null) {
          finalScore = llmResult.score;
        }
        if (llmResult.decision) {
          finalDecision = llmResult.decision;
        }
        llmGenerated = true;
      } catch (err) {
        console.error("[Review Board LLM] Generation failed:", err);
        // Fallback: 使用模拟内容
        finalContent = `【自动评审（模拟）】\n对 "${title}" 的评审意见：该 ${targetType || "paper"} 在学术质量上表现良好，建议 ${finalDecision}。\n\n（注：LLM 自动生成失败，此为 fallback 内容。）`;
      }
    }

    const review = await prisma.academicReview.create({
      data: {
        boardId: id,
        targetType: targetType || "paper",
        targetId: targetId.trim(),
        title: title.trim(),
        content: finalContent,
        score: finalScore,
        decision: finalDecision,
        reviewerId: reviewerId || "",
        round: reviewRound,
      },
    });

    return NextResponse.json(
      { success: true, data: review, llmGenerated },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/research/review-boards/:id/reviews] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create review" },
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
        if (score > 10 && score <= 100) return Math.min(10, score / 10);
        if (score >= 0 && score <= 10) return score;
      }
    }
  }
  return null;
}

/** 从 LLM 响应中解析决策 */
function parseDecisionFromLLMResponse(content: string): string | null {
  const lower = content.toLowerCase();

  // 中文关键词
  if (lower.includes("接受") || lower.includes("accept")) return "accept";
  if (lower.includes("大修") || lower.includes("major_revision")) return "major_revision";
  if (lower.includes("小修") || lower.includes("minor_revision")) return "minor_revision";
  if (lower.includes("拒绝") || lower.includes("reject")) return "reject";

  // 英文关键词（更精确的顺序）
  if (/\baccept\b/i.test(content)) return "accept";
  if (/\bmajor[_\s]revision\b/i.test(content)) return "major_revision";
  if (/\bminor[_\s]revision\b/i.test(content)) return "minor_revision";
  if (/\breject\b/i.test(content)) return "reject";

  return null;
}

/** 尝试解析 target 内容 */
async function resolveTargetContent(
  targetType: string,
  targetId: string
): Promise<{ title: string; content: string } | null> {
  try {
    switch (targetType) {
      case "paper": {
        const paper = await prisma.researchPaper.findUnique({
          where: { id: targetId },
          select: { title: true, abstract: true },
        });
        if (paper) {
          return {
            title: paper.title,
            content: paper.abstract || `论文：${paper.title}`,
          };
        }
        break;
      }
      case "theorem": {
        const theorem = await prisma.researchTheorem.findUnique({
          where: { id: targetId },
          select: { name: true, statement: true, leanCode: true },
        });
        if (theorem) {
          return {
            title: theorem.name,
            content: `定理陈述：${theorem.statement}\n\nLean 代码：\n${theorem.leanCode || "无"}`,
          };
        }
        break;
      }
      case "code": {
        // 尝试查找学术任务中的代码
        const task = await prisma.academicTask.findUnique({
          where: { id: targetId },
          select: { title: true, description: true, leanCode: true },
        });
        if (task) {
          return {
            title: task.title,
            content: `描述：${task.description}\n\n代码：\n${task.leanCode || "无"}`,
          };
        }
        break;
      }
      case "proof": {
        const theorem = await prisma.researchTheorem.findUnique({
          where: { id: targetId },
          select: { name: true, statement: true, proofStrategy: true, leanCode: true },
        });
        if (theorem) {
          return {
            title: theorem.name,
            content: `定理：${theorem.statement}\n\n证明策略：${theorem.proofStrategy || "未记录"}\n\nLean 代码：\n${theorem.leanCode || "无"}`,
          };
        }
        break;
      }
    }
  } catch (e) {
    // 忽略查找失败
  }
  return null;
}

/** 使用 LLM 生成评审内容 */
async function generateReviewContentWithLLM(
  board: any, // AcademicReviewBoard with reviewers
  targetType: string,
  targetId: string,
  title: string,
  roundNumber: number
): Promise<{ content: string; score: number | null; decision: string | null }> {
  // 1. 尝试获取 target 内容
  const targetInfo = await resolveTargetContent(targetType, targetId);

  // 2. 选择 reviewer 的 specialty
  const reviewers = board.reviewers || [];
  const reviewer = reviewers[0] || { specialty: "general", role: "reviewer" };

  // 3. 构建 prompt context
  const context: PromptContext = {
    topic: title,
    domain: board.domain || "general",
    mode: board.reviewMode || "single_blind",
    role: reviewer.role,
    specialty: reviewer.specialty || "general",
    targetType,
    content: targetInfo?.content || `评审对象：${targetType} (ID: ${targetId})`,
    roundNumber,
    title: targetInfo?.title || title,
  };

  // 4. 调用 LLM
  const response = await generateCollaborationResponse("review_board", context, {
    temperature: 0.3,
  });

  const content = response.content?.trim() || "";

  if (!content || content.includes("【LLM 调用失败】")) {
    throw new Error("LLM generation failed or returned empty");
  }

  // 5. 解析评分和决策
  const score = parseScoreFromLLMResponse(content);
  const decision = parseDecisionFromLLMResponse(content);

  return { content, score, decision };
}
