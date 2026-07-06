import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCollaborationResponse } from "@/lib/research-prompts";

export const runtime = "nodejs";

const VALID_MODES = ["lecture", "exercise", "discussion", "critique", "review"];

/** 从 LLM 响应中提取 score（0-10） */
function extractScore(content: string): number {
  // 匹配 "Score: 8.5" 或 "评分：8.5" 或 "score: 8" 等
  const patterns = [
    /score[:\s]*([0-9]+\.?[0-9]*)/i,
    /评分[:\s]*([0-9]+\.?[0-9]*)/i,
    /评分[（(]\s*([0-9]+\.?[0-9]*)\s*\/\s*10\s*[)）]/i,
    /([0-9]+\.?[0-9]*)\s*\/\s*10/i,
  ];
  for (const p of patterns) {
    const m = content.match(p);
    if (m) {
      const val = parseFloat(m[1]);
      if (!isNaN(val) && val >= 0 && val <= 10) return val;
    }
  }
  // 默认根据内容质量推断
  const lower = content.toLowerCase();
  if (lower.includes("excellent") || lower.includes("优秀") || lower.includes("出色")) return 9.0;
  if (lower.includes("good") || lower.includes("良好") || lower.includes("不错")) return 7.5;
  if (lower.includes("fair") || lower.includes("一般") || lower.includes("合格")) return 6.0;
  if (lower.includes("poor") || lower.includes("差") || lower.includes("不足")) return 4.0;
  return 6.5;
}

/** 生成 fallback 模拟辅导内容 */
function generateMockMentorship(
  mode: string,
  topic: string,
  studentResponse: string
): { content: string; feedback: string; score: number } {
  if (studentResponse && studentResponse.trim().length > 0) {
    return {
      content: "",
      feedback: `【模拟反馈】已审阅学生的回答。\n\n总体评价：回答思路基本正确，对核心概念有一定理解。\n\n建议：\n1. 可以进一步深化对关键定理的理解\n2. 尝试从不同角度思考问题\n3. 补充更多具体例子支持论点\n\n（注：当前处于模拟模式，未调用真实 LLM）`,
      score: 6.5,
    };
  }

  const modeDescriptions: Record<string, string> = {
    lecture: `【模拟讲解 — ${topic}】\n\n本节将介绍 ${topic} 的核心概念。\n\n1. 定义与背景\n2. 核心定理及其证明思路\n3. 典型例子与反例\n4. 常见误区与注意事项\n\n（注：当前处于模拟模式，未调用真实 LLM）`,
    exercise: `【模拟练习 — ${topic}】\n\n题目：请证明或推导与 ${topic} 相关的核心结论。\n\n提示：\n1. 回顾相关定义和引理\n2. 尝试归纳法或反证法\n3. 注意边界条件的处理\n\n参考答案：...\n\n（注：当前处于模拟模式，未调用真实 LLM）`,
    discussion: `【模拟讨论 — ${topic}】\n\n开放性问题：${topic} 在当代数学研究中还有哪些未解决的难题？\n\n请从以下角度思考：\n1. 理论推广的可能性\n2. 与其他领域的交叉点\n3. 计算复杂度的挑战\n\n（注：当前处于模拟模式，未调用真实 LLM）`,
    critique: `【模拟批判 — ${topic}】\n\n以下是一段关于 ${topic} 的论述，其中可能包含错误：\n\n[模拟论述内容]\n\n请找出其中的问题并给出正确解释。\n\n（注：当前处于模拟模式，未调用真实 LLM）`,
    review: `【模拟复习 — ${topic}】\n\n核心知识点回顾：\n\nQ1: ${topic} 的定义是什么？\nQ2: 主要定理有哪些？\nQ3: 典型应用场景？\nQ4: 与其他概念的关系？\n\n（注：当前处于模拟模式，未调用真实 LLM）`,
  };

  return {
    content: modeDescriptions[mode] || modeDescriptions.lecture,
    feedback: "",
    score: 0,
  };
}

// ── GET ───────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const completed = searchParams.get("completed");

    const mentorship = await prisma.academicMentorship.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!mentorship) {
      return NextResponse.json(
        { success: false, error: "Mentorship not found" },
        { status: 404 }
      );
    }

    const where: Record<string, unknown> = { mentorshipId: id };
    if (completed === "true") where.completed = true;
    if (completed === "false") where.completed = false;

    const sessions = await prisma.mentorshipSession.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    console.error("[GET /api/research/mentorships/:id/sessions] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// ── POST ──────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      title,
      topic,
      mode = "lecture",
      content,
      feedback,
      studentResponse,
      score,
    } = body;

    const mentorship = await prisma.academicMentorship.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!mentorship) {
      return NextResponse.json(
        { success: false, error: "Mentorship not found" },
        { status: 404 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Missing required field: title" },
        { status: 400 }
      );
    }

    if (!VALID_MODES.includes(mode)) {
      return NextResponse.json(
        { success: false, error: `Invalid mode. Valid: ${VALID_MODES.join(", ")}` },
        { status: 400 }
      );
    }

    let finalContent = content;
    let finalFeedback = feedback;
    let finalScore = score !== undefined ? Number(score) : undefined;

    // ── LLM 自动生成辅导内容 ──
    const needsAutoGenerate =
      (!finalContent || finalContent.trim() === "") &&
      (!finalFeedback || finalFeedback.trim() === "");

    if (needsAutoGenerate) {
      try {
        const llmRes = await generateCollaborationResponse(
          "mentorship",
          {
            topic: topic || title,
            domain: "academic_mentorship",
            mode,
            title,
            studentResponse: studentResponse || "",
          },
          { model: "glm-5.1", temperature: 0.4, provider: "zhipu" }
        );

        const extractedScore = extractScore(llmRes.content);
        if (studentResponse && studentResponse.trim().length > 0) {
          // 有学生回答 → 生成 feedback
          finalFeedback = llmRes.content;
          finalContent = content || "";
          finalScore = finalScore !== undefined ? finalScore : extractedScore;
        } else {
          // 无学生回答 → 生成 lecture/exercise/discussion 内容
          finalContent = llmRes.content;
          finalFeedback = feedback || "";
          finalScore = 0; // 新生成的内容没有评分
        }
        console.log(`[Mentorship LLM] mode=${mode}, score=${finalScore}, latency=${llmRes.latencyMs}ms`);
      } catch (llmErr: any) {
        console.error("[Mentorship LLM] error:", llmErr.message);
        // fallback: 使用模拟内容
        const mock = generateMockMentorship(mode, topic || title, studentResponse || "");
        finalContent = body.content || mock.content;
        finalFeedback = body.feedback || mock.feedback;
        finalScore = finalScore !== undefined ? finalScore : mock.score;
      }
    }

    const numericScore = finalScore !== undefined ? Number(finalScore) : 0;
    const autoCompleted = numericScore >= 7.0;

    const session = await prisma.mentorshipSession.create({
      data: {
        mentorshipId: id,
        title: title.trim(),
        topic: (topic || "").trim(),
        mode,
        content: (finalContent || "").trim(),
        feedback: (finalFeedback || "").trim(),
        studentResponse: (studentResponse || "").trim(),
        score: numericScore,
        completed: autoCompleted,
        completedAt: autoCompleted ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error("[POST /api/research/mentorships/:id/sessions] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create session" },
      { status: 500 }
    );
  }
}
