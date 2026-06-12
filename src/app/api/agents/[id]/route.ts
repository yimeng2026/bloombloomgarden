import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/agents/[id] - 获取单个 Agent
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        conversations: {
          orderBy: { updatedAt: "desc" },
          include: {
            _count: { select: { messages: true } },
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent 不存在" }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Failed to fetch agent:", error);
    return NextResponse.json({ error: "获取 Agent 失败" }, { status: 500 });
  }
}

// PUT /api/agents/[id] - 更新 Agent
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, avatar, systemPrompt, model, temperature } = body;

    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(avatar !== undefined && { avatar: avatar.trim() }),
        ...(systemPrompt !== undefined && { systemPrompt: systemPrompt.trim() }),
        ...(model !== undefined && { model }),
        ...(temperature !== undefined && { temperature }),
      },
    });

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Failed to update agent:", error);
    return NextResponse.json({ error: "更新 Agent 失败" }, { status: 500 });
  }
}

// DELETE /api/agents/[id] - 删除 Agent
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.agent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete agent:", error);
    return NextResponse.json({ error: "删除 Agent 失败" }, { status: 500 });
  }
}
