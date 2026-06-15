import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/agents/[id] - 获取单个 Agent（含完整 apiKey 用于聊天）
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
    const {
      name, description, avatar, systemPrompt, model, temperature,
      apiKey, llmProvider, agentPlatform, skills, channels, role,
    } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description.trim();
    if (avatar !== undefined) data.avatar = avatar.trim();
    if (systemPrompt !== undefined) data.systemPrompt = systemPrompt.trim();
    if (model !== undefined) data.model = model;
    if (temperature !== undefined) data.temperature = temperature;
    if (apiKey !== undefined) data.apiKey = apiKey.trim();
    if (llmProvider !== undefined) data.llmProvider = llmProvider;
    if (agentPlatform !== undefined) data.agentPlatform = agentPlatform;
    if (skills !== undefined) data.skills = typeof skills === "string" ? skills : JSON.stringify(skills);
    if (channels !== undefined) data.channels = typeof channels === "string" ? channels : JSON.stringify(channels);
    if (role !== undefined) data.role = role;

    const agent = await prisma.agent.update({ where: { id }, data });

    return NextResponse.json({
      ...agent,
      apiKey: agent.apiKey ? agent.apiKey.slice(0, 8) + "****" + agent.apiKey.slice(-4) : "",
    });
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
