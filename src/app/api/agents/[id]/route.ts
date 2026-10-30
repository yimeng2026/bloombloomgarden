import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function serializeAgent(agent: Record<string, unknown>) {
  const safe = { ...agent };
  delete safe.apiKey;
  return safe;
}

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        conversations: {
          orderBy: { updatedAt: "desc" },
          include: { _count: { select: { messages: true } } },
        },
      },
    });
    if (!agent) return NextResponse.json({ error: "Agent 不存在" }, { status: 404 });
    return NextResponse.json(serializeAgent(agent));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "获取 Agent 失败" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {
      model: "kimi-for-coding",
      temperature: 1,
      apiKey: "",
      llmProvider: "kimi",
      agentPlatform: "openclaw",
    };
    for (const field of ["name", "description", "avatar", "systemPrompt", "role"] as const) {
      if (typeof body[field] === "string") data[field] = body[field].trim();
    }
    if (body.skills !== undefined) data.skills = JSON.stringify(Array.isArray(body.skills) ? body.skills : []);
    if (body.channels !== undefined) data.channels = JSON.stringify(Array.isArray(body.channels) ? body.channels : []);
    const agent = await prisma.agent.update({ where: { id }, data });
    return NextResponse.json(serializeAgent(agent));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "更新 Agent 失败" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    await prisma.agent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "删除 Agent 失败" }, { status: 500 });
  }
}
