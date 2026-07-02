import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_ROLES = ["lead_reviewer", "reviewer", "contributor", "observer"];
const VALID_SPECIALTIES = ["formal_verification", "lean4", "mathematics", "physics"];

// ── GET ───────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const specialty = searchParams.get("specialty");

    const group = await prisma.codeReviewGroup.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json(
        { success: false, error: "Code review group not found" },
        { status: 404 }
      );
    }

    const where: Record<string, unknown> = { groupId: id };
    if (role) where.role = role;
    if (specialty) where.specialty = specialty;

    const reviewers = await prisma.codeReviewMember.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: reviewers });
  } catch (error) {
    console.error("[GET /api/research/code-reviews/:id/reviewers] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reviewers" },
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
    const { role, specialty, systemPrompt, model } = body;

    const group = await prisma.codeReviewGroup.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json(
        { success: false, error: "Code review group not found" },
        { status: 404 }
      );
    }

    if (role && !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: `Invalid role. Valid: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    if (specialty && !VALID_SPECIALTIES.includes(specialty)) {
      return NextResponse.json(
        { success: false, error: `Invalid specialty. Valid: ${VALID_SPECIALTIES.join(", ")}` },
        { status: 400 }
      );
    }

    const member = await prisma.codeReviewMember.create({
      data: {
        groupId: id,
        role: role || "reviewer",
        specialty: (specialty || "").trim(),
        systemPrompt: (systemPrompt || "").trim(),
        model: (model || "glm-5.1").trim(),
      },
    });

    return NextResponse.json({ success: true, data: member });
  } catch (error) {
    console.error("[POST /api/research/code-reviews/:id/reviewers] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add reviewer" },
      { status: 500 }
    );
  }
}
