import { prisma } from "@/lib/prisma";
import { getAdapter, type AgentConfig, type ChatMessage } from "@/lib/platform-adapter";

// POST /api/chat - 发送消息并获取流式响应（通过平台适配器）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId, content } = body;

    if (!conversationId || !content?.trim()) {
      return new Response(JSON.stringify({ error: "参数不完整" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 获取对话及 Agent 信息
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        agent: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!conversation) {
      return new Response(JSON.stringify({ error: "对话不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const agent = conversation.agent;
    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent 不存在" }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }

    if (!agent.apiKey) {
      return new Response(JSON.stringify({ error: "未配置 API Key，请先在 Agent 设置中填写" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 保存用户消息
    await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content: content.trim(),
      },
    });

    // 构建消息历史
    const messages: ChatMessage[] = [
      ...(agent.systemPrompt ? [{ role: "system" as const, content: agent.systemPrompt }] : []),
      ...conversation.messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      { role: "user" as const, content: content.trim() },
    ];

    // 获取平台适配器
    const adapter = getAdapter(agent.agentPlatform || "openclaw");

    // 构建 Agent 配置
    const agentConfig: AgentConfig = {
      id: agent.id,
      name: agent.name,
      systemPrompt: agent.systemPrompt,
      model: agent.model || "glm-5.1",
      temperature: agent.temperature ?? 0.7,
      apiKey: agent.apiKey,
      llmProvider: agent.llmProvider || "zhipu",
      agentPlatform: agent.agentPlatform || "openclaw",
      skills: JSON.parse(agent.skills || "[]"),
      channels: JSON.parse(agent.channels || "[]"),
    };

    // 流式转发
    const encoder = new TextEncoder();
    let fullAssistantContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 创建助手消息占位
          const assistantMessage = await prisma.message.create({
            data: {
              conversationId,
              role: "assistant",
              content: "",
            },
          });

          // 发送消息ID + 平台信息
          const startData = JSON.stringify({
            type: "start",
            messageId: assistantMessage.id,
            platformId: adapter.platformId,
            platformName: adapter.platformName,
            platformLogo: adapter.platformLogo,
          });
          controller.enqueue(encoder.encode(`data: ${startData}\n\n`));

          // 通过适配器流式获取响应
          for await (const event of adapter.chatStream(agentConfig, messages)) {
            const sseData = JSON.stringify(event);
            controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));

            // 收集完整内容
            if (event.type === "token" && event.content) {
              fullAssistantContent += event.content;
            }

            // 完成
            if (event.type === "done") {
              // 更新助手消息内容
              await prisma.message.update({
                where: { id: assistantMessage.id },
                data: { content: fullAssistantContent },
              });

              // 更新对话时间
              await prisma.conversation.update({
                where: { id: conversationId },
                data: { updatedAt: new Date() },
              });
            }
          }
        } catch (error: unknown) {
          console.error("Stream error:", error);
          const errMsg = error instanceof Error ? error.message : "AI 响应失败";
          const errorData = JSON.stringify({ type: "error", error: errMsg });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
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
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "聊天请求失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
