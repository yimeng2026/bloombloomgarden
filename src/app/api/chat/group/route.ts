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

async function callLLM(
  provider: string, apiKey: string, model: string,
  messages: { role: string; content: string }[], temperature: number
): Promise<string> {
  const endpoint = LLM_ENDPOINTS[provider];
  if (!endpoint) throw new Error(`不支持的 LLM 供应商: ${provider}`);
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
  const body = JSON.stringify({ model, messages, temperature, max_tokens: 1024, stream: false });
  const response = await fetch(endpoint, { method: "POST", headers, body, signal: AbortSignal.timeout(30000) });
  if (!response.ok) { const err = await response.text().catch(() => ""); throw new Error(`LLM API 错误 (${response.status}): ${err.slice(0, 100)}`); }
  const data = await response.json();
  if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
  if (data.content?.[0]?.text) return data.content[0].text;
  if (data.output?.text) return data.output.text;
  return JSON.stringify(data).slice(0, 200);
}

type AgentInfo = { id: string; name: string; systemPrompt: string; model: string; temperature: number; apiKey: string; llmProvider: string; agentPlatform: string };

async function resolveGroupAgents(groupId: string, visited = new Set<string>()): Promise<AgentInfo[]> {
  if (visited.has(groupId)) return [];
  visited.add(groupId);
  const group = await prisma.agentGroup.findUnique({
    where: { id: groupId },
    include: { members: { include: { agent: true } }, childGroups: { include: { childGroup: true } } },
  });
  if (!group) return [];
  const agents: AgentInfo[] = group.members.map((m) => m.agent);
  for (const cg of group.childGroups) {
    const childAgents = await resolveGroupAgents(cg.childGroupId, visited);
    agents.push(...childAgents);
  }
  return agents;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId, content } = body;
    if (!conversationId || !content?.trim()) {
      return new Response(JSON.stringify({ error: "参数不完整" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { group: true, messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!conversation?.groupId) {
      return new Response(JSON.stringify({ error: "非群组对话" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const mode = conversation.group?.mode || "relay";
    await prisma.message.create({ data: { conversationId, role: "user", content: content.trim(), agentName: "用户" } });
    const agents = await resolveGroupAgents(conversation.groupId);
    if (agents.length === 0) {
      return new Response(JSON.stringify({ error: "群组内没有 Agent" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const history = conversation.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as string, content: m.agentName ? `[${m.agentName}]: ${m.content}` : m.content }));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (mode === "relay") {
            for (let i = 0; i < agents.length; i++) {
              const agent = agents[i];
              const chatMsgs = [
                { role: "system", content: `${agent.systemPrompt}\n\n你正在多Agent讨论中，名字是"${agent.name}"。请基于前面讨论给出你的专业意见。` },
                ...history.slice(-10).map((m) => ({ role: "user", content: m.content })),
                { role: "user", content: content.trim() },
              ];
              try {
                const reply = await callLLM(agent.llmProvider, agent.apiKey, agent.model, chatMsgs, agent.temperature);
                const msg = await prisma.message.create({ data: { conversationId, role: "assistant", content: reply, agentName: agent.name } });
                history.push({ role: "assistant", content: `[${agent.name}]: ${reply}` });
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: agent.name, content: reply, messageId: msg.id, index: i + 1, total: agents.length })}\n\n`));
              } catch (err) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_error", agentName: agent.name, error: err instanceof Error ? err.message : "调用失败" })}\n\n`));
              }
            }
          } else if (mode === "debate") {
            const half = Math.ceil(agents.length / 2);
            const pro = agents.slice(0, half);
            const con = agents.slice(half);
            for (let round = 0; round < 2; round++) {
              for (const agent of pro) {
                try {
                  const reply = await callLLM(agent.llmProvider, agent.apiKey, agent.model, [
                    { role: "system", content: `${agent.systemPrompt}\n\n你是正方（支持方），名字是"${agent.name}"。请论证支持的观点。` },
                    ...history.slice(-6).map((m) => ({ role: "user", content: m.content })),
                    { role: "user", content: content.trim() },
                  ], agent.temperature);
                  const msg = await prisma.message.create({ data: { conversationId, role: "assistant", content: reply, agentName: `${agent.name}(正方)` } });
                  history.push({ role: "assistant", content: `[${agent.name}(正方)]: ${reply}` });
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: `${agent.name}(正方)`, content: reply, messageId: msg.id })}\n\n`));
                } catch (err) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_error", agentName: agent.name, error: String(err) })}\n\n`));
                }
              }
              for (const agent of con) {
                try {
                  const reply = await callLLM(agent.llmProvider, agent.apiKey, agent.model, [
                    { role: "system", content: `${agent.systemPrompt}\n\n你是反方（反对方），名字是"${agent.name}"。请论证反对的观点。` },
                    ...history.slice(-6).map((m) => ({ role: "user", content: m.content })),
                    { role: "user", content: content.trim() },
                  ], agent.temperature);
                  const msg = await prisma.message.create({ data: { conversationId, role: "assistant", content: reply, agentName: `${agent.name}(反方)` } });
                  history.push({ role: "assistant", content: `[${agent.name}(反方)]: ${reply}` });
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: `${agent.name}(反方)`, content: reply, messageId: msg.id })}\n\n`));
                } catch (err) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_error", agentName: agent.name, error: String(err) })}\n\n`));
                }
              }
            }
          } else if (mode === "vote") {
            for (const agent of agents) {
              try {
                const reply = await callLLM(agent.llmProvider, agent.apiKey, agent.model, [
                  { role: "system", content: `${agent.systemPrompt}\n\n你是"${agent.name}"。请独立给出你的专业意见。` },
                  { role: "user", content: content.trim() },
                ], agent.temperature);
                const msg = await prisma.message.create({ data: { conversationId, role: "assistant", content: reply, agentName: agent.name } });
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: agent.name, content: reply, messageId: msg.id })}\n\n`));
              } catch (err) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_error", agentName: agent.name, error: String(err) })}\n\n`));
              }
            }
          } else if (mode === "parallel") {
            const results = await Promise.allSettled(agents.map(async (agent) => {
              const reply = await callLLM(agent.llmProvider, agent.apiKey, agent.model, [
                { role: "system", content: `${agent.systemPrompt}\n\n你是"${agent.name}"。请独立给出你的专业意见。` },
                { role: "user", content: content.trim() },
              ], agent.temperature);
              return { agentName: agent.name, content: reply };
            }));
            for (const r of results) {
              if (r.status === "fulfilled") {
                const msg = await prisma.message.create({ data: { conversationId, role: "assistant", content: r.value.content, agentName: r.value.agentName } });
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: r.value.agentName, content: r.value.content, messageId: msg.id })}\n\n`));
              }
            }
          } else if (mode === "roundtable") {
            for (let round = 0; round < 2; round++) {
              for (const agent of agents) {
                try {
                  const reply = await callLLM(agent.llmProvider, agent.apiKey, agent.model, [
                    { role: "system", content: `${agent.systemPrompt}\n\n你在圆桌讨论中，名字是"${agent.name}"。第${round + 1}轮发言。` },
                    ...history.slice(-8).map((m) => ({ role: "user", content: m.content })),
                    { role: "user", content: content.trim() },
                  ], agent.temperature);
                  const msg = await prisma.message.create({ data: { conversationId, role: "assistant", content: reply, agentName: agent.name } });
                  history.push({ role: "assistant", content: `[${agent.name}]: ${reply}` });
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: agent.name, content: reply, messageId: msg.id, round: round + 1 })}\n\n`));
                } catch (err) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_error", agentName: agent.name, error: String(err) })}\n\n`));
                }
              }
            }
          }

          await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        } catch (error: unknown) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "群组聊天失败" })}\n\n`));
        } finally { controller.close(); }
      },
    });

    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
  } catch (error) {
    console.error("Group chat API error:", error);
    return new Response(JSON.stringify({ error: "群组聊天请求失败" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
