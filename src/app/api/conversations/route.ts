import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/conversations - 获取所有对话（可按 agentId 筛选）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");

    const conversations = await prisma.conversation.findMany({
      where: agentId ? { agentId } : undefined,
      orderBy: { updatedAt: "desc" },
      include: {
        agent: { select: { name: true, avatar: true } },
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
    const { agentId, title } = body;

    if (!agentId) {
      return NextResponse.json({ error: "必须指定 Agent" }, { status: 400 });
    }

    // 验证 Agent 存在
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return NextResponse.json({ error: "Agent 不存在" }, { status: 404 });
    }

    const conversation = await prisma.conversation.create({
      data: {
        agentId,
        title: title?.trim() || `与 ${agent.name} 的对话`,
      },
      include: {
        agent: { select: { name: true, avatar: true, systemPrompt: true, model: true, temperature: true } },
      },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("Failed to create conversation:", error);
    return NextResponse.json({ error: "创建对话失败" }, { status: 500 });
  }
}
