import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET: 获取单个专家组（含完整 members 列表）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const panel = await prisma.academicPanel.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: { weight: "desc" },
        },
        workshops: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        pipelines: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!panel) {
      return NextResponse.json(
        { success: false, error: "Panel not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: panel });
  } catch (error) {
    console.error("[GET /api/research/panels/:id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch panel" },
      { status: 500 }
    );
  }
}

// PUT: 更新专家组基本信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, domain, strategy, status } = body;

    const existing = await prisma.academicPanel.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Panel not found" },
        { status: 404 }
      );
    }

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description;
    if (domain !== undefined) data.domain = domain;
    if (status !== undefined) data.status = status;
    if (strategy !== undefined) {
      data.strategy = typeof strategy === "object" ? JSON.stringify(strategy) : strategy;
    }

    const panel = await prisma.academicPanel.update({
      where: { id },
      data,
      include: {
        members: {
          orderBy: { weight: "desc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: panel });
  } catch (error) {
    console.error("[PUT /api/research/panels/:id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update panel" },
      { status: 500 }
    );
  }
}

// DELETE: 软删除（status -> disbanded）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.academicPanel.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Panel not found" },
        { status: 404 }
      );
    }

    const panel = await prisma.academicPanel.update({
      where: { id },
      data: { status: "disbanded" },
      include: {
        members: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: panel,
      message: "Panel has been disbanded (soft delete)",
    });
  } catch (error) {
    console.error("[DELETE /api/research/panels/:id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to disband panel" },
      { status: 500 }
    );
  }
}
