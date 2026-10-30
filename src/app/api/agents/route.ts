import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function serializeAgent(agent: Record<string, unknown>) {
  const safe = { ...agent };
  delete safe.apiKey;
  return safe;
}

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json(agents.map((agent) => serializeAgent(agent)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "获取 Agent 失败" }, { status: 500 });
  }
}

/** Create a persistent orchestration profile; credentials stay in server env only. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Agent 名称不能为空" }, { status: 400 });
    }
    const agent = await prisma.agent.create({
      data: {
        name: body.name.trim(),
        description: typeof body.description === "string" ? body.description.trim() : "",
        avatar: typeof body.avatar === "string" ? body.avatar.trim() : "",
        systemPrompt: typeof body.systemPrompt === "string" && body.systemPrompt.trim()
          ? body.systemPrompt.trim()
          : `你是${body.name.trim()}，一个由 Kimi 驱动的研究助手。`,
        model: "kimi-for-coding",
        temperature: 1,
        apiKey: "",
        llmProvider: "kimi",
        agentPlatform: "openclaw",
        skills: JSON.stringify(Array.isArray(body.skills) ? body.skills : []),
        channels: JSON.stringify(Array.isArray(body.channels) ? body.channels : []),
        role: typeof body.role === "string" ? body.role : "",
        status: "idle",
      },
    });
    return NextResponse.json(serializeAgent(agent), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "创建 Agent 失败" }, { status: 500 });
  }
}
