import { prisma } from "@/lib/prisma";

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

type AgentInfo = { id: string; name: string; systemPrompt: string; model: string; temperature: number; apiKey: string; llmProvider: string; agentPlatform: string };

async function callLLM(provider: string, apiKey: string, model: string, messages: { role: string; content: string }[], temperature: number): Promise<string> {
  const endpoint = LLM_ENDPOINTS[provider];
  if (!endpoint) throw new Error(`不支持的 LLM 供应商: ${provider}`);
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
  const body = JSON.stringify({ model, messages, temperature, max_tokens: 1024, stream: false });
  const response = await fetch(endpoint, { method: "POST", headers, body, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`LLM API 错误: ${response.status}`);
  const data = await response.json();
  if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
  if (data.output?.text) return data.output.text;
  return JSON.stringify(data).slice(0, 200);
}

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

// ==================== 蜂群协作机制 ====================

// 基础模式：按mode字段执行（relay/debate/vote/parallel/roundtable）
async function executeBasicMode(agents: AgentInfo[], conversationId: string, content: string, mode: string, controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder) {
  const history: { role: string; content: string }[] = [{ role: "user", content }];

  if (mode === "parallel" || mode === "vote") {
    // 并行/投票：所有Agent同时回答
    const results = await Promise.allSettled(
      agents.map(async (agent) => {
        const msgs = [{ role: "system", content: agent.systemPrompt }, ...history];
        const reply = await callLLM(agent.llmProvider, agent.apiKey, agent.model, msgs, agent.temperature);
        const msg = await prisma.message.create({ data: { conversationId, role: "assistant", content: reply, agentName: agent.name } });
        return { agent, reply, msg };
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: r.value.agent.name, content: r.value.reply, messageId: r.value.msg.id })}\n\n`));
      } else {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_error", error: String(r.reason) })}\n\n`));
      }
    }
    if (mode === "vote" && results.filter(r => r.status === "fulfilled").length > 0) {
      const replies = results.filter(r => r.status === "fulfilled").map(r => (r as PromiseFulfilledResult<{ agent: AgentInfo; reply: string }>).value);
      const summary = `投票结果：${replies.map(r => r.agent.name).join("、")} 各抒己见。`;
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "vote_summary", content: summary })}\n\n`));
    }
  } else {
    // relay/debate/roundtable：多轮顺序
    const rounds = mode === "relay" ? 1 : 2;
    for (let round = 0; round < rounds; round++) {
      for (const agent of agents) {
        try {
          const msgs = [{ role: "system", content: agent.systemPrompt }, ...history];
          const reply = await callLLM(agent.llmProvider, agent.apiKey, agent.model, msgs, agent.temperature);
          const msg = await prisma.message.create({ data: { conversationId, role: "assistant", content: reply, agentName: agent.name } });
          history.push({ role: "assistant", content: `[${agent.name}]: ${reply}` });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: agent.name, content: reply, messageId: msg.id, round: round + 1 })}\n\n`));
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_error", agentName: agent.name, error: String(err) })}\n\n`));
        }
      }
    }
  }
}

// 信号传递模式（Stigmergy）：Agent通过共享"信息素"间接协作
async function executeStigmergy(agents: AgentInfo[], conversationId: string, content: string, controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder) {
  const pheromone: string[] = []; // 信息素池
  for (const agent of agents) {
    try {
      const context = pheromone.length > 0 ? `\n\n[共享信息素]: ${pheromone.join(" | ")}` : "";
      const msgs = [{ role: "system", content: agent.systemPrompt + context }, { role: "user", content }];
      const reply = await callLLM(agent.llmProvider, agent.apiKey, agent.model, msgs, agent.temperature);
      const msg = await prisma.message.create({ data: { conversationId, role: "assistant", content: reply, agentName: agent.name } });
      pheromone.push(`${agent.name}: ${reply.slice(0, 100)}`);
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: agent.name, content: reply, messageId: msg.id, pheromone: pheromone.length })}\n\n`));
    } catch (err) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_error", agentName: agent.name, error: String(err) })}\n\n`));
    }
  }
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "pheromone_summary", pheromoneCount: pheromone.length })}\n\n`));
}

// 层级委派模式（Hierarchical）：Leader分配任务，Worker执行
async function executeHierarchical(agents: AgentInfo[], conversationId: string, content: string, controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder) {
  const leader = agents[0];
  const workers = agents.slice(1);
  if (!leader) return;

  // Leader分析任务并分配
  try {
    const leaderMsgs = [{ role: "system", content: leader.systemPrompt + "\n你是组长，需要把任务分解并分配给组员。" }, { role: "user", content: `请分析以下任务并分配给组员(${workers.map(w => w.name).join("、")})：${content}` }];
    const leaderReply = await callLLM(leader.llmProvider, leader.apiKey, leader.model, leaderMsgs, leader.temperature);
    const lMsg = await prisma.message.create({ data: { conversationId, role: "assistant", content: leaderReply, agentName: leader.name } });
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: leader.name, content: leaderReply, messageId: lMsg.id, role: "leader" })}\n\n`));

    // Workers并行执行
    const results = await Promise.allSettled(workers.map(async (worker) => {
      const wMsgs = [{ role: "system", content: worker.systemPrompt }, { role: "user", content: `组长${leader.name}的指示：${leaderReply}\n\n请执行你负责的部分。` }];
      const reply = await callLLM(worker.llmProvider, worker.apiKey, worker.model, wMsgs, worker.temperature);
      const msg = await prisma.message.create({ data: { conversationId, role: "assistant", content: reply, agentName: worker.name } });
      return { worker, reply, msg };
    }));

    for (const r of results) {
      if (r.status === "fulfilled") {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: r.value.worker.name, content: r.value.reply, messageId: r.value.msg.id, role: "worker" })}\n\n`));
      }
    }

    // Leader汇总
    const workerReplies = results.filter(r => r.status === "fulfilled").map(r => (r as PromiseFulfilledResult<{ worker: AgentInfo; reply: string }>).value);
    const summaryMsgs = [{ role: "system", content: leader.systemPrompt }, { role: "user", content: `组员汇报：\n${workerReplies.map(w => `${w.worker.name}: ${w.reply}`).join("\n")}\n\n请汇总并给出最终结论。` }];
    const summaryReply = await callLLM(leader.llmProvider, leader.apiKey, leader.model, summaryMsgs, leader.temperature);
    const sMsg = await prisma.message.create({ data: { conversationId, role: "assistant", content: summaryReply, agentName: `${leader.name}(汇总)` } });
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: leader.name, content: summaryReply, messageId: sMsg.id, role: "summary" })}\n\n`));
  } catch (err) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_error", error: String(err) })}\n\n`));
  }
}

// 流水线模式（Pipeline）：每个Agent处理上一步的输出
async function executePipeline(agents: AgentInfo[], conversationId: string, content: string, controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder) {
  let currentInput = content;
  for (const agent of agents) {
    try {
      const msgs = [{ role: "system", content: agent.systemPrompt }, { role: "user", content: currentInput }];
      const reply = await callLLM(agent.llmProvider, agent.apiKey, agent.model, msgs, agent.temperature);
      const msg = await prisma.message.create({ data: { conversationId, role: "assistant", content: reply, agentName: agent.name } });
      currentInput = reply;
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: agent.name, content: reply, messageId: msg.id, pipeline: true })}\n\n`));
    } catch (err) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_error", agentName: agent.name, error: String(err) })}\n\n`));
    }
  }
}

// 共识模式（Consensus）：Agent必须达成共识
async function executeConsensus(agents: AgentInfo[], conversationId: string, content: string, controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder) {
  const history: { role: string; content: string }[] = [{ role: "user", content }];
  for (let round = 0; round < 3; round++) {
    for (const agent of agents) {
      try {
        const context = round > 0 ? `\n\n[当前讨论]: ${history.slice(-4).map(h => h.content).join(" | ")}` : "";
        const msgs = [{ role: "system", content: agent.systemPrompt + context + "\n请尝试与其他成员达成共识。" }, ...history.slice(-6)];
        const reply = await callLLM(agent.llmProvider, agent.apiKey, agent.model, msgs, agent.temperature);
        const msg = await prisma.message.create({ data: { conversationId, role: "assistant", content: reply, agentName: agent.name } });
        history.push({ role: "assistant", content: `[${agent.name}]: ${reply}` });
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: agent.name, content: reply, messageId: msg.id, round: round + 1 })}\n\n`));
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_error", agentName: agent.name, error: String(err) })}\n\n`));
      }
    }
  }
}

// 对抗模式（Adversarial）：红蓝对抗
async function executeAdversarial(agents: AgentInfo[], conversationId: string, content: string, controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder) {
  const half = Math.ceil(agents.length / 2);
  const redTeam = agents.slice(0, half);
  const blueTeam = agents.slice(half);

  // Red team attacks
  for (const agent of redTeam) {
    try {
      const msgs = [{ role: "system", content: agent.systemPrompt + "\n你是红队（挑战方），请找出问题中的漏洞和风险。" }, { role: "user", content }];
      const reply = await callLLM(agent.llmProvider, agent.apiKey, agent.model, msgs, agent.temperature);
      const msg = await prisma.message.create({ data: { conversationId, role: "assistant", content: reply, agentName: `🔴${agent.name}` } });
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: agent.name, content: reply, messageId: msg.id, team: "red" })}\n\n`));
    } catch (err) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_error", agentName: agent.name, error: String(err) })}\n\n`));
    }
  }

  // Blue team defends
  const redReplies = (await prisma.message.findMany({ where: { conversationId, role: "assistant" }, orderBy: { createdAt: "desc" }, take: half })).map(m => m.content).join("\n");
  for (const agent of blueTeam) {
    try {
      const msgs = [{ role: "system", content: agent.systemPrompt + "\n你是蓝队（防守方），请回应红队的质疑并完善方案。" }, { role: "user", content: `原始问题：${content}\n\n红队质疑：${redReplies}` }];
      const reply = await callLLM(agent.llmProvider, agent.apiKey, agent.model, msgs, agent.temperature);
      const msg = await prisma.message.create({ data: { conversationId, role: "assistant", content: reply, agentName: `🔵${agent.name}` } });
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: agent.name, content: reply, messageId: msg.id, team: "blue" })}\n\n`));
    } catch (err) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_error", agentName: agent.name, error: String(err) })}\n\n`));
    }
  }
}

// 导师-学徒模式（Mentor-Mentee）：资深Agent指导新手
async function executeMentor(agents: AgentInfo[], conversationId: string, content: string, controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder) {
  const mentor = agents[0];
  const mentees = agents.slice(1);
  if (!mentor) return;

  // Mentor先给出示范
  try {
    const mMsgs = [{ role: "system", content: mentor.systemPrompt + "\n你是导师，请先示范如何处理这个任务。" }, { role: "user", content }];
    const mentorReply = await callLLM(mentor.llmProvider, mentor.apiKey, mentor.model, mMsgs, mentor.temperature);
    const mMsg = await prisma.message.create({ data: { conversationId, role: "assistant", content: mentorReply, agentName: `👨‍🏫${mentor.name}` } });
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: mentor.name, content: mentorReply, messageId: mMsg.id, role: "mentor" })}\n\n`));

    // Mentees学习并尝试
    for (const mentee of mentees) {
      try {
        const wMsgs = [{ role: "system", content: mentee.systemPrompt + "\n你是学徒，请参考导师的示范来处理任务。" }, { role: "user", content: `导师${mentor.name}的示范：${mentorReply}\n\n请基于导师的思路，给出你的处理。` }];
        const reply = await callLLM(mentee.llmProvider, mentee.apiKey, mentee.model, wMsgs, mentee.temperature);
        const msg = await prisma.message.create({ data: { conversationId, role: "assistant", content: reply, agentName: `🎓${mentee.name}` } });
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: mentee.name, content: reply, messageId: msg.id, role: "mentee" })}\n\n`));
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_error", agentName: mentee.name, error: String(err) })}\n\n`));
      }
    }

    // Mentor点评
    const menteeReplies = (await prisma.message.findMany({ where: { conversationId, role: "assistant" }, orderBy: { createdAt: "desc" }, take: mentees.length })).map(m => m.content);
    const fMsgs = [{ role: "system", content: mentor.systemPrompt + "\n请点评学徒的表现。" }, { role: "user", content: `学徒表现：${menteeReplies.join("\n")}\n\n请给出点评和改进建议。` }];
    const feedback = await callLLM(mentor.llmProvider, mentor.apiKey, mentor.model, fMsgs, mentor.temperature);
    const fMsg = await prisma.message.create({ data: { conversationId, role: "assistant", content: feedback, agentName: `${mentor.name}(点评)` } });
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_reply", agentName: mentor.name, content: feedback, messageId: fMsg.id, role: "feedback" })}\n\n`));
  } catch (err) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "agent_error", error: String(err) })}\n\n`));
  }
}

// ==================== 主入口 ====================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId, content } = body;
    if (!conversationId || !content?.trim()) {
      return new Response(JSON.stringify({ error: "参数不完整" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { group: true },
    });
    if (!conversation?.groupId) {
      return new Response(JSON.stringify({ error: "对话未关联群组" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const agents = await resolveGroupAgents(conversation.groupId);
    if (agents.length === 0) {
      return new Response(JSON.stringify({ error: "群组中没有Agent" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // 保存用户消息
    await prisma.message.create({ data: { conversationId, role: "user", content: content.trim() } });

    const group = conversation.group;
    const mode = group?.mode || "relay";
    const swarmMode = group?.swarmMode || "basic";

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        (async () => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "start", agentCount: agents.length, mode, swarmMode })}\n\n`));

            switch (swarmMode) {
              case "stigmergy": await executeStigmergy(agents, conversationId, content, controller, encoder); break;
              case "hierarchical": await executeHierarchical(agents, conversationId, content, controller, encoder); break;
              case "pipeline": await executePipeline(agents, conversationId, content, controller, encoder); break;
              case "consensus": await executeConsensus(agents, conversationId, content, controller, encoder); break;
              case "adversarial": await executeAdversarial(agents, conversationId, content, controller, encoder); break;
              case "mentor": await executeMentor(agents, conversationId, content, controller, encoder); break;
              default: await executeBasicMode(agents, conversationId, content, mode, controller, encoder); break;
            }

            await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          } catch (error: unknown) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "群组聊天失败" })}\n\n`));
          } finally { controller.close(); }
        })();
      },
    });

    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
  } catch (error) {
    console.error("Group chat API error:", error);
    return new Response(JSON.stringify({ error: "群组聊天请求失败" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
