import { getAdapter, type AgentConfig, type ChatMessage } from "@/lib/platform-adapter";

export const runtime = "nodejs";

type AgentInput = {
  id?: string;
  name?: string;
  systemPrompt?: string;
  skills?: unknown;
  channels?: unknown;
};

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
  }
  return [];
}

function profile(agent: AgentInput): AgentConfig {
  return {
    id: agent.id || "direct",
    name: agent.name || "Kimi Agent",
    systemPrompt: agent.systemPrompt || "",
    model: "kimi-for-coding",
    temperature: 1,
    apiKey: "",
    llmProvider: "kimi",
    agentPlatform: "openclaw",
    skills: stringArray(agent.skills),
    channels: stringArray(agent.channels),
  };
}

function history(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages.map((message) => {
    if (!message || typeof message !== "object") throw new Error("Invalid message");
    const item = message as { role?: unknown; content?: unknown };
    if (!["system", "user", "assistant"].includes(String(item.role)) || typeof item.content !== "string") {
      throw new Error("Invalid message role or content");
    }
    return { role: item.role as ChatMessage["role"], content: item.content };
  });
}

function kimiStream(agent: AgentConfig, messages: ChatMessage[]): Response {
  const adapter = getAdapter("openclaw");
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: "start",
          messageId: `msg-${Date.now()}`,
          platformId: "kimi",
          platformName: "Kimi",
        })}\n\n`));
        let fullContent = "";
        for await (const event of adapter.chatStream(agent, messages)) {
          if (event.type === "token" && event.content) fullContent += event.content;
          if (event.type === "done") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", fullContent })}\n\n`));
          } else {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
        }
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: "error",
          error: error instanceof Error ? error.message : "Kimi 响应失败",
        })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/** Kimi-only streaming chat. Client-supplied API keys are neither read nor stored. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) return Response.json({ error: "消息内容不能为空" }, { status: 400 });

    if (body.agent && typeof body.agent === "object") {
      const agent = profile(body.agent as AgentInput);
      const messages: ChatMessage[] = [
        ...(agent.systemPrompt ? [{ role: "system" as const, content: agent.systemPrompt }] : []),
        ...history(body.messages),
        { role: "user", content },
      ];
      return kimiStream(agent, messages);
    }

    if (typeof body.conversationId !== "string" || !body.conversationId) {
      return Response.json({ error: "需要 conversationId 或显式 agent 配置" }, { status: 400 });
    }
    const { prisma } = await import("@/lib/prisma");
    const conversation = await prisma.conversation.findUnique({
      where: { id: body.conversationId },
      include: { agent: true, messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conversation?.agent) return Response.json({ error: "Agent 或对话不存在" }, { status: 404 });
    const agent = profile(conversation.agent);
    const messages: ChatMessage[] = [
      ...(agent.systemPrompt ? [{ role: "system" as const, content: agent.systemPrompt }] : []),
      ...history(conversation.messages),
      { role: "user", content },
    ];
    return kimiStream(agent, messages);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "聊天请求失败" },
      { status: 500 },
    );
  }
}
