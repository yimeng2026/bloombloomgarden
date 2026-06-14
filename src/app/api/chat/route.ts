import { prisma } from "@/lib/prisma";

// LLM 供应商 → API 端点映射
const LLM_ENDPOINTS: Record<string, string> = {
  zhipu: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  deepseek: "https://api.deepseek.com/v1/chat/completions",
  google: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  alibaba: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  baidu: "https://qianfan.baidubce.com/v2/chat/completions",
  moonshot: "https://api.moonshot.cn/v1/chat/completions",
  mistral: "https://api.mistral.ai/v1/chat/completions",
  xai: "https://api.x.ai/v1/chat/completions",
  cohere: "https://api.cohere.com/v2/chat",
  together: "https://api.together.xyz/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
};

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

    const agent = conversation.agent;
    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent 不存在" }), {
        status: 404, headers: { "Content-Type": "application/json" },
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
      ...(agent.systemPrompt ? [{ role: "system" as const, content: agent.systemPrompt }] : []),
      ...conversation.messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      { role: "user" as const, content: content.trim() },
    ];

    // 获取 API 端点和密钥
    const provider = agent.llmProvider || "zhipu";
    const endpoint = LLM_ENDPOINTS[provider];
    const apiKey = agent.apiKey;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "未配置 API Key，请先在 Agent 设置中填写" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!endpoint) {
      return new Response(JSON.stringify({ error: `不支持的 LLM 供应商: ${provider}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 调用 LLM API（流式）
    const llmResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: agent.model || "glm-5.1",
        messages,
        temperature: agent.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text().catch(() => "");
      console.error(`LLM API error (${llmResponse.status}):`, errText.slice(0, 200));
      return new Response(JSON.stringify({
        error: `LLM API 错误 (${llmResponse.status}): ${errText.slice(0, 100)}`,
      }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

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

          // 发送消息ID
          const startData = JSON.stringify({ type: "start", messageId: assistantMessage.id });
          controller.enqueue(encoder.encode(`data: ${startData}\n\n`));

          const reader = llmResponse.body?.getReader();
          if (!reader) {
            throw new Error("无法读取 LLM 响应流");
          }

          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;

              const dataStr = trimmed.slice(6);
              if (dataStr === "[DONE]") continue;

              try {
                const data = JSON.parse(dataStr);
                const delta = data.choices?.[0]?.delta?.content;
                if (delta) {
                  fullAssistantContent += delta;
                  const chunkData = JSON.stringify({ type: "chunk", content: delta });
                  controller.enqueue(encoder.encode(`data: ${chunkData}\n\n`));
                }
              } catch {
                // 忽略解析错误
              }
            }
          }

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
