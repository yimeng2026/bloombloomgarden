import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/agents - 获取所有 Agent
export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { conversations: true } },
      },
    });
    // 隐藏 API Key 的中间部分
    const safe = agents.map((a) => ({
      ...a,
      apiKey: a.apiKey ? a.apiKey.slice(0, 8) + "****" + a.apiKey.slice(-4) : "",
    }));
    return NextResponse.json(safe);
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return NextResponse.json({ error: "获取 Agent 列表失败" }, { status: 500 });
  }
}

// POST /api/agents - 创建新 Agent
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name, description, avatar, systemPrompt, model, temperature,
      apiKey, llmProvider, agentPlatform, skills, channels, role,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Agent 名称不能为空" }, { status: 400 });
    }
    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json({ error: "API Key 不能为空" }, { status: 400 });
    }

    const agent = await prisma.agent.create({
      data: {
        name: name.trim(),
        description: description?.trim() || "",
        avatar: avatar?.trim() || "",
        systemPrompt: systemPrompt?.trim() || `你是${name.trim()}，一个有用的AI助手。`,
        model: model || "glm-5.1",
        temperature: temperature ?? 0.7,
        apiKey: apiKey.trim(),
        llmProvider: llmProvider || "zhipu",
        agentPlatform: agentPlatform || "openclaw",
        skills: typeof skills === "string" ? skills : JSON.stringify(skills || []),
        channels: typeof channels === "string" ? channels : JSON.stringify(channels || []),
        role: role || "",
      },
    });

    // 返回时隐藏 API Key
    return NextResponse.json({
      ...agent,
      apiKey: agent.apiKey.slice(0, 8) + "****" + agent.apiKey.slice(-4),
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create agent:", error);
    return NextResponse.json({ error: "创建 Agent 失败" }, { status: 500 });
  }
}
