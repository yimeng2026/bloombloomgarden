import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_MODES = ["lecture", "exercise", "discussion", "critique", "review"];

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

    const numericScore = score !== undefined ? Number(score) : 0;
    const autoCompleted = numericScore >= 7.0;

    const session = await prisma.mentorshipSession.create({
      data: {
        mentorshipId: id,
        title: title.trim(),
        topic: (topic || "").trim(),
        mode,
        content: (content || "").trim(),
        feedback: (feedback || "").trim(),
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
