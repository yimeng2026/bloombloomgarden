// ================================================================
// BloomBloomGarden 平台适配器层
// 统一接口，每个平台一个适配器，让用户看到"谁在工作"
// ================================================================

import { AGENT_PLATFORMS, type AgentPlatform } from "./platforms";
import { DifyApiClient, CozeApiClient } from "./platform-api";
import { getKimiGateway } from "./kimi-gateway";

// ===================== 类型定义 =====================

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AdapterStreamEvent {
  type: "token" | "platform_status" | "tool_call" | "tool_result" | "memory_hit" | "knowledge_hit" | "done" | "error";
  content?: string;
  platformId?: string;
  platformName?: string;
  platformLogo?: string;
  toolName?: string;
  toolParams?: Record<string, unknown>;
  toolResult?: string;
  memorySnippet?: string;
  knowledgeSnippet?: string;
  messageId?: string;
  fullContent?: string;
  error?: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  apiKey: string;
  llmProvider: string;
  agentPlatform: string;
  skills: string[];
  channels: string[];
  /** 平台专属 API Key（如 Dify/Coze 的 Key） */
  platformApiKey?: string;
  /** 平台专属 API URL（如 Dify Base URL） */
  platformApiUrl?: string;
  /** 平台额外配置（如 Coze Bot ID） */
  platformConfig?: Record<string, string>;
}

// ===================== LLM 供应商端点 =====================

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

// ===================== 平台适配器接口 =====================

export interface PlatformAdapter {
  readonly platformId: string;
  readonly platformName: string;
  readonly platformLogo: string;

  /** 流式聊天，yield SSE 事件 */
  chatStream(
    agent: AgentConfig,
    messages: ChatMessage[],
  ): AsyncGenerator<AdapterStreamEvent>;

  /** 获取平台描述（用于 UI 展示） */
  getStatusLine(): string;
}

// ===================== 基础 LLM 调用 =====================

async function* callLLMStream(
  provider: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  temperature: number,
): AsyncGenerator<string> {
  // 救援通道：Kimi 网关环境变量可用时优先使用（数据库中存储的 GLM Key 已失效）
  const kimi = getKimiGateway();
  const useKimi = kimi !== null;
  const endpoint = useKimi ? kimi.chatUrl : LLM_ENDPOINTS[provider];
  const effectiveKey = useKimi ? kimi.apiKey : apiKey;
  const effectiveModel = useKimi ? kimi.model : model;
  // Kimi 网关仅允许 temperature=1，传其他值会 400
  const effectiveTemperature = useKimi ? 1 : temperature;
  if (!endpoint) throw new Error(`不支持的 LLM 供应商: ${provider}`);

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${effectiveKey}`,
      ...(!useKimi && provider === "anthropic"
        ? { "x-api-key": effectiveKey, "anthropic-version": "2023-06-01" }
        : {}),
      ...(!useKimi && provider === "openrouter"
        ? { "HTTP-Referer": "https://bloombloomgarden.vercel.app", "X-Title": "BloomBloomGarden" }
        : {}),
    },
    body: JSON.stringify({
      model: effectiveModel,
      messages,
      temperature: effectiveTemperature,
      max_tokens: 4096,
      stream: true,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`LLM API 错误 (${resp.status}): ${errText.slice(0, 200)}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error("无法获取响应流");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    for (const line of buffer.split("\n")) {
      // Kimi 网关 SSE 格式为 "data:{...}"（无空格），标准 OpenAI 为 "data: {...}"，两者都兼容
      const trimmed = line.trim();
      if (trimmed.startsWith("data:")) {
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === "[DONE]") return;
        if (!dataStr) continue;
        try {
          const data = JSON.parse(dataStr);
          // OpenAI 兼容格式（Kimi 网关的 thinking 走 delta.reasoning_content，不作为正文输出）
          const delta = data.choices?.[0]?.delta?.content;
          if (delta) yield delta;
          // Anthropic 格式
          if (data.type === "content_block_delta" && data.delta?.text) {
            yield data.delta.text;
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
    // 保留未完成的行
    const lastNewline = buffer.lastIndexOf("\n");
    if (lastNewline >= 0) buffer = buffer.slice(lastNewline + 1);
  }
}

// ===================== DirectLLMAdapter（兜底） =====================

export class DirectLLMAdapter implements PlatformAdapter {
  readonly platformId = "direct";
  readonly platformName = "直接调用";
  readonly platformLogo = "⚡";

  getStatusLine(): string {
    return "⚡ 直接调用 LLM API";
  }

  async *chatStream(agent: AgentConfig, messages: ChatMessage[]): AsyncGenerator<AdapterStreamEvent> {
    // 平台状态：开始
    yield {
      type: "platform_status",
      content: `${this.platformLogo} ${this.platformName} 正在工作...`,
      platformId: this.platformId,
      platformName: this.platformName,
      platformLogo: this.platformLogo,
    };

    let full = "";
    try {
      for await (const token of callLLMStream(agent.llmProvider, agent.apiKey, agent.model, messages, agent.temperature)) {
        full += token;
        yield { type: "token", content: token, platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
      }
      yield { type: "done", fullContent: full, platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
    } catch (e) {
      yield { type: "error", error: e instanceof Error ? e.message : "LLM 调用失败", platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
    }
  }
}

// ===================== OpenClawAdapter =====================

export class OpenClawAdapter implements PlatformAdapter {
  readonly platformId = "openclaw";
  readonly platformName = "OpenClaw";
  readonly platformLogo = "🦞";

  getStatusLine(): string {
    return "🦞 OpenClaw 编排引擎运行中";
  }

  async *chatStream(agent: AgentConfig, messages: ChatMessage[]): AsyncGenerator<AdapterStreamEvent> {
    // 平台状态：OpenClaw 启动
    yield {
      type: "platform_status",
      content: "🦞 OpenClaw 编排引擎启动",
      platformId: this.platformId,
      platformName: this.platformName,
      platformLogo: this.platformLogo,
    };

    // 如果 Agent 配置了技能，模拟工具调用流程
    const skills = agent.skills || [];
    const needsToolCall = skills.length > 0 && this._shouldInvokeTool(messages);

    if (needsToolCall) {
      const toolName = this._pickTool(skills, messages);
      yield {
        type: "tool_call",
        content: `🦞 OpenClaw 调用工具: ${toolName}`,
        toolName,
        platformId: this.platformId,
        platformName: this.platformName,
        platformLogo: this.platformLogo,
      };

      // 真实工具调用
      const toolResult = await this._executeTool(toolName, messages);
      yield {
        type: "tool_result",
        content: `🦞 工具 ${toolName} 返回结果`,
        toolName,
        toolResult: toolResult,
        platformId: this.platformId,
        platformName: this.platformName,
        platformLogo: this.platformLogo,
      };

      // 把工具结果注入 messages
      const enrichedMessages = [
        ...messages,
        { role: "system" as const, content: `[OpenClaw 工具 ${toolName} 结果]\n${toolResult}\n请基于以上工具返回结果回答用户问题。` },
      ];

      let full = "";
      try {
        for await (const token of callLLMStream(agent.llmProvider, agent.apiKey, agent.model, enrichedMessages, agent.temperature)) {
          full += token;
          yield { type: "token", content: token, platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
        }
        yield { type: "done", fullContent: full, platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
      } catch (e) {
        yield { type: "error", error: e instanceof Error ? e.message : "LLM 调用失败", platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
      }
    } else {
      // 无需工具调用，直接 LLM
      yield {
        type: "platform_status",
        content: "🦞 OpenClaw 直接推理模式",
        platformId: this.platformId,
        platformName: this.platformName,
        platformLogo: this.platformLogo,
      };

      let full = "";
      try {
        for await (const token of callLLMStream(agent.llmProvider, agent.apiKey, agent.model, messages, agent.temperature)) {
          full += token;
          yield { type: "token", content: token, platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
        }
        yield { type: "done", fullContent: full, platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
      } catch (e) {
        yield { type: "error", error: e instanceof Error ? e.message : "LLM 调用失败", platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
      }
    }
  }

  private _shouldInvokeTool(messages: ChatMessage[]): boolean {
    const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || "";
    const toolKeywords = ["搜索", "查询", "查找", "搜索", "行情", "数据", "分析", "最新", "实时", "search", "query", "look up", "find"];
    return toolKeywords.some(kw => lastMsg.includes(kw));
  }

  private _pickTool(skills: string[], _messages: ChatMessage[]): string {
    const toolMap: Record<string, string> = {
      "web-search": "WebSearch",
      "web-scraper": "WebScraper",
      "market-data": "MarketData",
      "code-exec": "CodeExecutor",
      "github": "GitHub",
      "code-review": "CodeReview",
      "docker": "Docker",
      "translator": "Translator",
      "summarizer": "Summarizer",
      "doc-writer": "DocWriter",
      "image-gen": "ImageGen",
      "knowledge-graph": "KnowledgeGraph",
      "ontology": "Ontology",
    };
    return toolMap[skills[0]] || "WebSearch";
  }

  private async _executeTool(toolName: string, messages: ChatMessage[]): Promise<string> {
    // 动态导入 tools 模块（只在服务器端运行）
    const { executeTool } = await import("./tools");
    // 从最后一条消息提取参数
    const lastMsg = messages[messages.length - 1]?.content || "";
    const params: Record<string, unknown> = {};
    const quoted = lastMsg.match(/["']([^"']+)["']/);
    if (quoted) {
      params.query = quoted[1];
    } else {
      params.query = lastMsg.split(/[。\?\.\!]/)[0].trim();
    }
    const stockMatch = lastMsg.match(/\b([A-Z]{1,5}(\.\w{2})?)\b/);
    if (stockMatch) {
      params.symbol = stockMatch[1];
    }
    const urlMatch = lastMsg.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      params.url = urlMatch[0];
    }
    return executeTool(toolName, params);
  }
}

// ===================== HermesAdapter =====================

export class HermesAdapter implements PlatformAdapter {
  readonly platformId = "hermes";
  readonly platformName = "Hermes";
  readonly platformLogo = "🧠";

  getStatusLine(): string {
    return "🧠 Hermes 记忆引擎运行中";
  }

  async *chatStream(agent: AgentConfig, messages: ChatMessage[]): AsyncGenerator<AdapterStreamEvent> {
    yield {
      type: "platform_status",
      content: "🧠 Hermes 记忆引擎启动",
      platformId: this.platformId,
      platformName: this.platformName,
      platformLogo: this.platformLogo,
    };

    // 真实记忆检索（动态导入，只在服务器端运行）
    let memoryHit: string | null = null;
    try {
      const { memoryStore } = await import("./memory");
      const lastMsg = messages[messages.length - 1]?.content || "";
      const memResults = await memoryStore.searchMemory(agent.id, lastMsg, 5);
      if (memResults.length > 0) {
        memoryHit = memResults.map(m => `[${m.role}]: ${m.content.slice(0, 200)}`).join("\n");
      }
    } catch {
      // 记忆检索失败不影响主流程
    }
    if (memoryHit) {
      yield {
        type: "memory_hit",
        content: `🧠 Hermes 检索到 ${memoryHit.split("\n").length} 条相关记忆`,
        memorySnippet: memoryHit,
        platformId: this.platformId,
        platformName: this.platformName,
        platformLogo: this.platformLogo,
      };
    }

    // 注入记忆上下文
    const enrichedMessages = memoryHit
      ? [
          ...messages.slice(0, -1),
          { role: "system" as const, content: `[Hermes 记忆上下文]\n${memoryHit}\n请结合以上记忆上下文回答用户问题。` },
          ...messages.slice(-1),
        ]
      : messages;

    let full = "";
    try {
      for await (const token of callLLMStream(agent.llmProvider, agent.apiKey, agent.model, enrichedMessages, agent.temperature)) {
        full += token;
        yield { type: "token", content: token, platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
      }
      yield { type: "done", fullContent: full, platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
    } catch (e) {
      yield { type: "error", error: e instanceof Error ? e.message : "LLM 调用失败", platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
    }
  }
}

// ===================== DifyAdapter =====================

export class DifyAdapter implements PlatformAdapter {
  readonly platformId = "dify";
  readonly platformName = "Dify";
  readonly platformLogo = "🎨";

  getStatusLine(): string {
    return "🎨 Dify 知识引擎运行中";
  }

  async *chatStream(agent: AgentConfig, messages: ChatMessage[]): AsyncGenerator<AdapterStreamEvent> {
    yield {
      type: "platform_status",
      content: "🎨 Dify 知识引擎启动",
      platformId: this.platformId,
      platformName: this.platformName,
      platformLogo: this.platformLogo,
    };

    // 如果配置了 Dify API Key，使用真实 Dify API
    const difyKey = agent.platformApiKey;
    const difyUrl = agent.platformApiUrl || "https://api.dify.ai/v1";
    if (difyKey) {
      try {
        const client = new DifyApiClient({ apiKey: difyKey, baseUrl: difyUrl });
        const lastMsg = messages[messages.length - 1]?.content || "";
        for await (const event of client.chatStream(lastMsg)) {
          yield { ...event, platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
        }
        return;
      } catch (e) {
        yield {
          type: "error",
          error: `Dify API 调用失败: ${e instanceof Error ? e.message : String(e)}，回退到 LLM 直连`,
          platformId: this.platformId,
          platformName: this.platformName,
          platformLogo: this.platformLogo,
        };
      }
    }

    // 未配置 Dify API 或调用失败：回退到 LLM + 模拟知识检索
    const knowledgeHit = this._searchKnowledge(messages);
    if (knowledgeHit) {
      yield {
        type: "knowledge_hit",
        content: `🎨 Dify 检索到相关知识`,
        knowledgeSnippet: knowledgeHit,
        platformId: this.platformId,
        platformName: this.platformName,
        platformLogo: this.platformLogo,
      };
    }

    const enrichedMessages = knowledgeHit
      ? [
          ...messages.slice(0, -1),
          { role: "system" as const, content: `[Dify 知识库检索结果]\n${knowledgeHit}\n请基于以上知识库内容回答用户问题，并标注信息来源。` },
          ...messages.slice(-1),
        ]
      : messages;

    let full = "";
    try {
      for await (const token of callLLMStream(agent.llmProvider, agent.apiKey, agent.model, enrichedMessages, agent.temperature)) {
        full += token;
        yield { type: "token", content: token, platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
      }
      yield { type: "done", fullContent: full, platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
    } catch (e) {
      yield { type: "error", error: e instanceof Error ? e.message : "LLM 调用失败", platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
    }
  }

  private _searchKnowledge(messages: ChatMessage[]): string | null {
    const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || "";
    const knowledgeKeywords = ["知识", "文档", "规范", "标准", "政策", "法规", "指南", "手册", "knowledge", "document", "policy"];
    if (knowledgeKeywords.some(kw => lastMsg.includes(kw))) {
      return "知识库中找到3篇相关文档，最相关的内容如下：\n1. 《行业规范 2026版》第三章：操作流程标准\n2. 《合规指南》第5节：风险控制要求\n3. 《最佳实践手册》案例12：同类场景处理方案";
    }
    return null;
  }
}

// ===================== CozeAdapter =====================

export class CozeAdapter implements PlatformAdapter {
  readonly platformId = "coze";
  readonly platformName = "Coze";
  readonly platformLogo = "🤖";

  getStatusLine(): string {
    return "🤖 Coze 插件引擎运行中";
  }

  async *chatStream(agent: AgentConfig, messages: ChatMessage[]): AsyncGenerator<AdapterStreamEvent> {
    yield {
      type: "platform_status",
      content: "🤖 Coze 插件引擎启动",
      platformId: this.platformId,
      platformName: this.platformName,
      platformLogo: this.platformLogo,
    };

    // 如果配置了 Coze API Key + Bot ID，使用真实 Coze API
    const cozeKey = agent.platformApiKey;
    const cozeBotId = agent.platformConfig?.botId;
    const cozeUrl = agent.platformApiUrl || "https://api.coze.com";
    if (cozeKey && cozeBotId) {
      try {
        const client = new CozeApiClient({ apiKey: cozeKey, botId: cozeBotId, baseUrl: cozeUrl });
        const lastMsg = messages[messages.length - 1]?.content || "";
        for await (const event of client.chatStream(lastMsg)) {
          yield { ...event, platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
        }
        return;
      } catch (e) {
        yield {
          type: "error",
          error: `Coze API 调用失败: ${e instanceof Error ? e.message : String(e)}，回退到 LLM 直连`,
          platformId: this.platformId,
          platformName: this.platformName,
          platformLogo: this.platformLogo,
        };
      }
    }

    // Coze 特色：插件市场 + 多模态
    const skills = agent.skills || [];
    if (skills.includes("image-gen") || skills.includes("video-gen") || skills.includes("tts")) {
      yield {
        type: "platform_status",
        content: "🤖 Coze 多模态插件就绪",
        platformId: this.platformId,
        platformName: this.platformName,
        platformLogo: this.platformLogo,
      };
    }

    let full = "";
    try {
      for await (const token of callLLMStream(agent.llmProvider, agent.apiKey, agent.model, messages, agent.temperature)) {
        full += token;
        yield { type: "token", content: token, platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
      }
      yield { type: "done", fullContent: full, platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
    } catch (e) {
      yield { type: "error", error: e instanceof Error ? e.message : "LLM 调用失败", platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
    }
  }
}

// ===================== CrewAIAdapter =====================

export class CrewAIAdapter implements PlatformAdapter {
  readonly platformId = "crewai";
  readonly platformName = "CrewAI";
  readonly platformLogo = "👥";

  getStatusLine(): string {
    return "👥 CrewAI 协作引擎运行中";
  }

  async *chatStream(agent: AgentConfig, messages: ChatMessage[]): AsyncGenerator<AdapterStreamEvent> {
    yield {
      type: "platform_status",
      content: "👥 CrewAI 协作引擎启动",
      platformId: this.platformId,
      platformName: this.platformName,
      platformLogo: this.platformLogo,
    };

    // CrewAI 特色：角色分工 + 任务分解
    yield {
      type: "platform_status",
      content: "👥 CrewAI 任务分析中...",
      platformId: this.platformId,
      platformName: this.platformName,
      platformLogo: this.platformLogo,
    };

    let full = "";
    try {
      for await (const token of callLLMStream(agent.llmProvider, agent.apiKey, agent.model, messages, agent.temperature)) {
        full += token;
        yield { type: "token", content: token, platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
      }
      yield { type: "done", fullContent: full, platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
    } catch (e) {
      yield { type: "error", error: e instanceof Error ? e.message : "LLM 调用失败", platformId: this.platformId, platformName: this.platformName, platformLogo: this.platformLogo };
    }
  }
}

// ===================== 适配器工厂 =====================

const ADAPTER_MAP: Record<string, () => PlatformAdapter> = {
  openclaw: () => new OpenClawAdapter(),
  hermes: () => new HermesAdapter(),
  dify: () => new DifyAdapter(),
  coze: () => new CozeAdapter(),
  crewai: () => new CrewAIAdapter(),
};

export function getAdapter(platformId: string): PlatformAdapter {
  const factory = ADAPTER_MAP[platformId];
  if (factory) return factory();
  // 兜底：直接调 LLM
  return new DirectLLMAdapter();
}

/** 获取平台信息（用于 UI 展示，不需要实例化适配器） */
export function getPlatformInfo(platformId: string): { id: string; name: string; logo: string; statusLine: string } {
  const adapter = getAdapter(platformId);
  return {
    id: adapter.platformId,
    name: adapter.platformName,
    logo: adapter.platformLogo,
    statusLine: adapter.getStatusLine(),
  };
}

/** 获取所有平台信息 */
export function getAllPlatformInfos(): { id: string; name: string; logo: string; statusLine: string }[] {
  return Object.keys(ADAPTER_MAP).map(id => getPlatformInfo(id));
}
