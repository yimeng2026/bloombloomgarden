import { prisma } from "@/lib/prisma";
import ZAI from "z-ai-web-dev-sdk";

// POST /api/chat - 发送消息并获取流式响应
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

    // 保存用户消息
    await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content: content.trim(),
      },
    });

    // 构建消息历史
    const messages = [
      {
        role: "system" as const,
        content: conversation.agent.systemPrompt,
      },
      ...conversation.messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      {
        role: "user" as const,
        content: content.trim(),
      },
    ];

    // 调用 AI API（流式）
    const zai = await ZAI.create();

    const aiStream = await zai.chat.completions.create({
      messages,
      model: conversation.agent.model || "glm-4-plus",
      temperature: conversation.agent.temperature ?? 0.7,
      stream: true,
    });

    // aiStream 是 ReadableStream<Uint8Array>，包含原始 SSE 文本
    // 我们需要解析它并转发给客户端
    const reader = aiStream.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullAssistantContent = "";
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // value 是 Uint8Array，解码为文本
            buffer += decoder.decode(value, { stream: true });

            // 按 \n\n 分割 SSE 事件
            const parts = buffer.split("\n\n");
            // 最后一个可能不完整，保留在 buffer 中
            buffer = parts.pop() || "";

            for (const part of parts) {
              const lines = part.split("\n");
              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;

                const dataStr = line.slice(6).trim();

                // 检查是否是结束标记
                if (dataStr === "[DONE]") {
                  continue;
                }

                try {
                  const parsed = JSON.parse(dataStr);
                  const delta = parsed.choices?.[0]?.delta?.content || "";

                  if (delta) {
                    fullAssistantContent += delta;
                    // 发送 SSE 格式的流式数据给客户端
                    const outData = JSON.stringify({ type: "delta", content: delta });
                    controller.enqueue(encoder.encode(`data: ${outData}\n\n`));
                  }
                } catch {
                  // 忽略解析失败的行
                }
              }
            }
          }

          // 保存助手消息到数据库
          const assistantMessage = await prisma.message.create({
            data: {
              conversationId,
              role: "assistant",
              content: fullAssistantContent || "（AI 未返回内容）",
            },
          });

          // 更新对话的 updatedAt
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          // 发送完成信号
          const doneData = JSON.stringify({
            type: "done",
            messageId: assistantMessage.id,
            fullContent: fullAssistantContent,
          });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
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
