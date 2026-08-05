import { NextResponse } from "next/server";
import { getKimiGateway } from "@/lib/kimi-gateway";

// ===================== 本地存储 Agent 策略 =====================
// Vercel 上 Prisma 是只读的，所以我们用 "虚拟 Agent" 模式：
// 1. POST 验证 API Key 有效性（发一个真实请求到 LLM）
// 2. 验证通过返回虚拟 Agent（带随机 UUID），前端存 localStorage
// 3. GET 返回空数组，前端从 localStorage 合并
// ================================================================

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
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
};

async function validateApiKey(provider: string, apiKey: string, model: string): Promise<{ ok: boolean; error?: string }> {
  // 救援通道：Kimi 网关环境变量可用时，用网关做真实校验（GLM Key 已失效）
  const kimi = getKimiGateway();
  const endpoint = kimi ? kimi.chatUrl : LLM_ENDPOINTS[provider];
  const effectiveKey = kimi ? kimi.apiKey : apiKey;
  const effectiveModel = kimi ? kimi.model : model;
  const effectiveTemperature = kimi ? 1 : 0.7; // Kimi 网关仅允许 temperature=1
  if (!endpoint) return { ok: false, error: `不支持的 LLM 供应商: ${provider}` };

  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${effectiveKey}`,
        ...(!kimi && provider === "anthropic"
          ? { "x-api-key": effectiveKey, "anthropic-version": "2023-06-01" }
          : {}),
        ...(!kimi && provider === "openrouter"
          ? { "HTTP-Referer": "https://bloombloomgarden.vercel.app", "X-Title": "BloomBloomGarden" }
          : {}),
      },
      body: JSON.stringify({
        model: effectiveModel,
        messages: [{ role: "user", content: "hi" }],
        temperature: effectiveTemperature,
        stream: false,
        max_tokens: 5,
      }),
    });
    if (resp.ok) return { ok: true };
    const text = await resp.text().catch(() => "");
    return { ok: false, error: `API Key 验证失败 (${resp.status}): ${text.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, error: `网络错误: ${e instanceof Error ? e.message : "验证请求失败"}` };
  }
}

// GET /api/agents - 返回空数组（前端从 localStorage 合并）
export async function GET() {
  return NextResponse.json([]);
}

// POST /api/agents - 创建虚拟 Agent（验证 API Key）
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

    const provider = llmProvider || "zhipu";
    const modelName = model || "glm-5.1";

    // 验证 API Key
    const validation = await validateApiKey(provider, apiKey.trim(), modelName);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 生成虚拟 ID（前端用 crypto.randomUUID 也一样）
    const virtualId = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const agent = {
      id: virtualId,
      name: name.trim(),
      description: description?.trim() || "",
      avatar: avatar?.trim() || "",
      systemPrompt: systemPrompt?.trim() || `你是${name.trim()}，一个有用的AI助手。`,
      model: modelName,
      temperature: temperature ?? 0.7,
      apiKey: apiKey.trim(),
      llmProvider: provider,
      agentPlatform: agentPlatform || "openclaw",
      skills: typeof skills === "string" ? skills : JSON.stringify(skills || []),
      channels: typeof channels === "string" ? channels : JSON.stringify(channels || []),
      role: role || "",
      status: "running",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _count: { conversations: 0 },
    };

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
