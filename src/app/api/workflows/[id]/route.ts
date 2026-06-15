import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/workflows/[id]
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        nodes: true,
        edges: true,
        conversations: { orderBy: { updatedAt: "desc" }, include: { _count: { select: { messages: true } } } },
      },
    });
    if (!workflow) return NextResponse.json({ error: "工作流不存在" }, { status: 404 });
    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Failed to fetch workflow:", error);
    return NextResponse.json({ error: "获取工作流失败" }, { status: 500 });
  }
}

// PUT /api/workflows/[id]
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, canvasData } = body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description.trim();
    if (canvasData !== undefined) data.canvasData = typeof canvasData === "string" ? canvasData : JSON.stringify(canvasData);

    const workflow = await prisma.workflow.update({ where: { id }, data, include: { nodes: true, edges: true } });
    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Failed to update workflow:", error);
    return NextResponse.json({ error: "更新工作流失败" }, { status: 500 });
  }
}

// DELETE /api/workflows/[id]
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.workflow.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete workflow:", error);
    return NextResponse.json({ error: "删除工作流失败" }, { status: 500 });
  }
}
