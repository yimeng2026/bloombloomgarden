import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_ROLES = ["lead_validator", "validator", "witness", "checker"];

// GET: 列出验证成员，支持 ?role=xxx 和 ?specialty=xxx 筛选
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const specialty = searchParams.get("specialty");

    const group = await prisma.validationGroup.findUnique({
      where: { id },
    });

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Validation group not found" },
        { status: 404 }
      );
    }

    const where: any = { groupId: id };
    if (role) where.role = role;
    if (specialty) where.specialty = { contains: specialty };

    const validators = await prisma.validationMember.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: validators });
  } catch (error) {
    console.error("[GET /api/research/validations/:id/validators] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch validators" },
      { status: 500 }
    );
  }
}

// POST: 添加验证成员
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { role, specialty, systemPrompt, model } = body;

    const group = await prisma.validationGroup.findUnique({
      where: { id },
    });

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Validation group not found" },
        { status: 404 }
      );
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid role. Valid: ${VALID_ROLES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const member = await prisma.validationMember.create({
      data: {
        groupId: id,
        role,
        specialty: specialty || "",
        systemPrompt: systemPrompt || "",
        model: model || "glm-5.1",
      },
    });

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/research/validations/:id/validators] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add validator" },
      { status: 500 }
    );
  }
}
