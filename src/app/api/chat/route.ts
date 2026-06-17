import { getAdapter, type AgentConfig, type ChatMessage } from "@/lib/platform-adapter";

// POST /api/chat - 发送消息并获取流式响应（通过平台适配器）
// 支持两种模式：
// 模式1: {conversationId, content} — 从数据库获取 agent（本地开发用）
// 模式2: {content, agent, messages} — 直接传递 agent 配置（Vercel / 生产用）
// ================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ===================== 模式2：直接传递 Agent 配置 =====================
    if (body.agent && body.content) {
      const { content, agent, messages = [] } = body;
      if (!content?.trim()) {
        return new Response(JSON.stringify({ error: "消息内容不能为空" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      if (!agent.apiKey) {
        return new Response(JSON.stringify({ error: "未配置 API Key" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }

      const agentConfig: AgentConfig = {
        id: agent.id || "direct",
        name: agent.name || "Agent",
        systemPrompt: agent.systemPrompt || "",
        model: agent.model || "glm-5.1",
        temperature: agent.temperature ?? 0.7,
        apiKey: agent.apiKey,
        llmProvider: agent.llmProvider || "zhipu",
        agentPlatform: agent.agentPlatform || "openclaw",
        skills: Array.isArray(agent.skills) ? agent.skills : (typeof agent.skills === "string" ? JSON.parse(agent.skills || "[]") : []),
        channels: Array.isArray(agent.channels) ? agent.channels : (typeof agent.channels === "string" ? JSON.parse(agent.channels || "[]") : []),
      };

      const chatMessages: ChatMessage[] = [
        ...(agentConfig.systemPrompt ? [{ role: "system" as const, content: agentConfig.systemPrompt }] : []),
        ...messages.map((m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
        { role: "user" as const, content: content.trim() },
      ];

      const adapter = getAdapter(agentConfig.agentPlatform);
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const startData = JSON.stringify({
              type: "start",
              messageId: `msg-${Date.now()}`,
              platformId: adapter.platformId,
              platformName: adapter.platformName,
              platformLogo: adapter.platformLogo,
            });
            controller.enqueue(encoder.encode(`data: ${startData}\n\n`));

            let fullAssistantContent = "";
            for await (const event of adapter.chatStream(agentConfig, chatMessages)) {
              const sseData = JSON.stringify(event);
              controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
              if (event.type === "token" && event.content) {
                fullAssistantContent += event.content;
              }
              if (event.type === "done") {
                // 模式2不写入数据库，由前端保存到 localStorage
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", fullContent: fullAssistantContent })}\n\n`));
              }
            }
          } catch (error: unknown) {
            console.error("Stream error:", error);
            const errMsg = error instanceof Error ? error.message : "AI 响应失败";
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: errMsg })}\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }

    // ===================== 模式1：通过 conversationId 获取 =====================
    const { conversationId, content } = body;
    if (!conversationId || !content?.trim()) {
      return new Response(JSON.stringify({ error: "参数不完整" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // 尝试从数据库获取（本地开发环境可用，Vercel 上只读会失败）
    let agent: any = null;
    let conversation: any = null;
    try {
      const { prisma } = await import("@/lib/prisma");
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { agent: true, messages: { orderBy: { createdAt: "asc" } } },
      });
      if (conversation) agent = conversation.agent;
    } catch {
      // Vercel 上 Prisma 只读，忽略错误
    }

    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent 不存在或数据库不可用，请使用模式2（直接传递 agent 配置）" }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }

    if (!agent.apiKey) {
      return new Response(JSON.stringify({ error: "未配置 API Key" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const messages: ChatMessage[] = [
      ...(agent.systemPrompt ? [{ role: "system" as const, content: agent.systemPrompt }] : []),
      ...(conversation?.messages?.map((m: any) => ({ role: m.role as "user" | "assistant" | "system", content: m.content })) || []),
      { role: "user" as const, content: content.trim() },
    ];

    const adapter = getAdapter(agent.agentPlatform || "openclaw");
    const agentConfig: AgentConfig = {
      id: agent.id, name: agent.name, systemPrompt: agent.systemPrompt,
      model: agent.model || "glm-5.1", temperature: agent.temperature ?? 0.7,
      apiKey: agent.apiKey, llmProvider: agent.llmProvider || "zhipu",
      agentPlatform: agent.agentPlatform || "openclaw",
      skills: JSON.parse(agent.skills || "[]"), channels: JSON.parse(agent.channels || "[]"),
    };

    const encoder = new TextEncoder();
    let fullAssistantContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const startData = JSON.stringify({
            type: "start", messageId: `msg-${Date.now()}`,
            platformId: adapter.platformId, platformName: adapter.platformName, platformLogo: adapter.platformLogo,
          });
          controller.enqueue(encoder.encode(`data: ${startData}\n\n`));

          for await (const event of adapter.chatStream(agentConfig, messages)) {
            const sseData = JSON.stringify(event);
            controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
            if (event.type === "token" && event.content) fullAssistantContent += event.content;
          }
        } catch (error: unknown) {
          console.error("Stream error:", error);
          const errMsg = error instanceof Error ? error.message : "AI 响应失败";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: errMsg })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "聊天请求失败" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
