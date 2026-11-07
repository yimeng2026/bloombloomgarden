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
        );

        const extractedScore = extractScore(llmRes.content);
        if (studentResponse && studentResponse.trim().length > 0) {
          finalFeedback = llmRes.content;
          finalContent = content || "";
          finalScore = finalScore !== undefined ? finalScore : extractedScore;
        } else {
          finalContent = llmRes.content;
          finalFeedback = feedback || "";
          finalScore = 0;
        }
        console.log(`[Mentorship LLM] mode=${mode}, score=${finalScore}, latency=${llmRes.latencyMs}ms`);
      } catch (error) {
        throw new Error(`Kimi 导师内容生成失败: ${error instanceof Error ? error.message : String(error)}`);
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
