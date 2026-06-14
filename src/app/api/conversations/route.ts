import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/conversations - 获取所有对话
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    const groupId = searchParams.get("groupId");

    const where: Record<string, unknown> = {};
    if (agentId) where.agentId = agentId;
    if (groupId) where.groupId = groupId;

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        agent: { select: { name: true, avatar: true } },
        group: { select: { name: true, mode: true } },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json({ error: "获取对话列表失败" }, { status: 500 });
  }
}

// POST /api/conversations - 创建新对话
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentId, groupId, title } = body;

    if (!agentId && !groupId) {
      return NextResponse.json({ error: "必须指定 Agent 或群组" }, { status: 400 });
    }

    const data: Record<string, unknown> = {
      title: title?.trim() || "新对话",
    };

    if (agentId) {
      const agent = await prisma.agent.findUnique({ where: { id: agentId } });
      if (!agent) return NextResponse.json({ error: "Agent 不存在" }, { status: 404 });
      data.agentId = agentId;
      if (!title) data.title = `与 ${agent.name} 的对话`;
    }

    if (groupId) {
      const group = await prisma.agentGroup.findUnique({ where: { id: groupId } });
      if (!group) return NextResponse.json({ error: "群组不存在" }, { status: 404 });
      data.groupId = groupId;
      if (!title) data.title = `群组: ${group.name}`;
    }

    const conversation = await prisma.conversation.create({
      data,
      include: {
        agent: { select: { name: true, avatar: true, systemPrompt: true, model: true, temperature: true } },
        group: { select: { name: true, mode: true } },
      },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("Failed to create conversation:", error);
    return NextResponse.json({ error: "创建对话失败" }, { status: 500 });
  }
}
