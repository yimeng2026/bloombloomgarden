import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET: 获取单个验证组（含 validators 和 results 列表）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const group = await prisma.validationGroup.findUnique({
      where: { id },
      include: {
        validators: {
          orderBy: { createdAt: "asc" },
        },
        results: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Validation group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: group });
  } catch (error) {
    console.error("[GET /api/research/validations/:id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch validation group" },
      { status: 500 }
    );
  }
}

// PUT: 更新验证组
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, status, validationType, strategy } = body;

    const existing = await prisma.validationGroup.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Validation group not found" },
        { status: 404 }
      );
    }

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (validationType !== undefined) data.validationType = validationType;
    if (strategy !== undefined) {
      data.strategy = typeof strategy === "object" ? JSON.stringify(strategy) : strategy;
    }

    const group = await prisma.validationGroup.update({
      where: { id },
      data,
      include: {
        validators: true,
        results: true,
      },
    });

    return NextResponse.json({ success: true, data: group });
  } catch (error) {
    console.error("[PUT /api/research/validations/:id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update validation group" },
      { status: 500 }
    );
  }
}

// DELETE: 级联删除（Prisma onDelete: Cascade 处理 validators 和 results）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.validationGroup.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Validation group not found" },
        { status: 404 }
      );
    }

    await prisma.validationGroup.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { id },
      message: "Validation group deleted successfully",
    });
  } catch (error) {
    console.error("[DELETE /api/research/validations/:id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete validation group" },
      { status: 500 }
    );
  }
}
