/**
 * protocolMatrix.ts — 协议×平台×API 三维矩阵数据
 * 兼容 ProtocolAdmin.tsx 的数据接口
 */

export interface ProtocolPlatform {
  id: string;
  name: string;
  status: "active" | "beta" | "planned" | "deprecated";
}

export interface ProtocolTool {
  id: string;
  name: string;
  status: "active" | "beta" | "planned" | "deprecated";
  method?: string;
  endpoint?: string;
}

export interface ProtocolFamily {
  id: string;
  name: string;
  description: string;
  color: string;
  status: "active" | "beta" | "planned" | "deprecated";
  platforms: ProtocolPlatform[];
  tools: ProtocolTool[];
}

export interface ProtocolMatrix {
  families: ProtocolFamily[];
  updatedAt: string;
}

export const statusLabels: Record<string, string> = {
  active: "已上线",
  beta: "测试中",
  planned: "规划中",
  deprecated: "已弃用",
};

export const statusColors: Record<string, string> = {
  active: "#52c41a",
  beta: "#faad14",
  planned: "#1890ff",
  deprecated: "#ff4d4f",
};

// 静态协议矩阵数据（可从后端 API 替换）
const MATRIX_DATA: ProtocolMatrix = {
  families: [
    {
      id: "api-provider",
      name: "API Provider",
      description: "提供 LLM API 端点的云端服务，只需配置 API Key 即可使用",
      color: "#1677ff",
      status: "active",
      platforms: [
        { id: "openai", name: "OpenAI", status: "active" },
        { id: "anthropic", name: "Anthropic", status: "active" },
        { id: "kimi", name: "Moonshot/Kimi", status: "active" },
        { id: "deepseek", name: "DeepSeek", status: "active" },
        { id: "zhipu", name: "智谱AI", status: "active" },
        { id: "google", name: "Google Gemini", status: "active" },
        { id: "openrouter", name: "OpenRouter", status: "active" },
        { id: "azure", name: "Azure OpenAI", status: "active" },
      ],
      tools: [
        { id: "chat", name: "Chat Completion", status: "active", method: "POST", endpoint: "/v1/chat/completions" },
        { id: "embed", name: "Embedding", status: "active", method: "POST", endpoint: "/v1/embeddings" },
        { id: "image", name: "Image Generation", status: "beta", method: "POST", endpoint: "/v1/images/generations" },
      ],
    },
    {
      id: "orchestration",
      name: "多线程编排",
      description: "支持多 Agent 并行执行、工作流编排、状态管理的平台",
      color: "#722ed1",
      status: "active",
      platforms: [
        { id: "openclaw", name: "OpenClaw", status: "active" },
        { id: "dify", name: "Dify", status: "beta" },
        { id: "flowise", name: "Flowise", status: "planned" },
        { id: "langgraph", name: "LangGraph", status: "planned" },
        { id: "n8n", name: "n8n", status: "beta" },
      ],
      tools: [
        { id: "swarm", name: "Swarm 协调", status: "active", method: "WS", endpoint: "/api/swarm/coordinate" },
        { id: "workflow", name: "工作流编排", status: "active", method: "POST", endpoint: "/api/workflows" },
        { id: "blueprint", name: "蓝图引擎", status: "active", method: "POST", endpoint: "/api/blueprints" },
      ],
    },
    {
      id: "cli-tool",
      name: "CLI 工具",
      description: "命令行工具，单会话单任务，可被编排平台调用",
      color: "#13c2c2",
      status: "active",
      platforms: [
        { id: "claude-code", name: "Claude Code", status: "active" },
        { id: "codex", name: "Codex CLI", status: "active" },
        { id: "qwen-code", name: "Qwen Code", status: "active" },
        { id: "aider", name: "Aider", status: "planned" },
        { id: "kimi-cli", name: "Kimi CLI", status: "planned" },
      ],
      tools: [
        { id: "code-gen", name: "代码生成", status: "active", method: "STDIO", endpoint: "n/a" },
        { id: "code-review", name: "代码审查", status: "active", method: "STDIO", endpoint: "n/a" },
      ],
    },
    {
      id: "local-engine",
      name: "本地引擎",
      description: "无需 API Key 的本地推理引擎，需本地安装",
      color: "#eb2f96",
      status: "active",
      platforms: [
        { id: "ollama", name: "Ollama", status: "active" },
        { id: "lm-studio", name: "LM Studio", status: "beta" },
        { id: "vllm", name: "vLLM", status: "planned" },
        { id: "llamacpp", name: "llama.cpp", status: "planned" },
      ],
      tools: [
        { id: "local-chat", name: "本地聊天", status: "active", method: "POST", endpoint: "/v1/chat/completions" },
        { id: "model-pull", name: "模型拉取", status: "active", method: "POST", endpoint: "/api/pull" },
      ],
    },
    {
      id: "peer-skill",
      name: "技能/基础设施",
      description: "被 Agent 调用的工具和服务，不直接连接 LLM",
      color: "#fa8c16",
      status: "active",
      platforms: [
        { id: "rag", name: "RAG 引擎", status: "active" },
        { id: "embed", name: "嵌入服务", status: "active" },
        { id: "monitor", name: "监控系统", status: "active" },
        { id: "memory", name: "记忆系统", status: "active" },
      ],
      tools: [
        { id: "search", name: "文档检索", status: "active", method: "POST", endpoint: "/api/rag/search" },
        { id: "ingest", name: "文档导入", status: "active", method: "POST", endpoint: "/api/rag/ingest" },
      ],
    },
  ],
  updatedAt: new Date().toISOString(),
};

export async function fetchProtocolMatrix(): Promise<ProtocolMatrix> {
  // TODO: 替换为后端 API 调用
  return Promise.resolve(MATRIX_DATA);
}

export function filterMatrix(
  matrix: ProtocolMatrix,
  query: string,
  statusFilter: string[]
): ProtocolMatrix {
  const q = query.toLowerCase().trim();

  const filteredFamilies = matrix.families.map((family) => {
    const filteredPlatforms = family.platforms.filter(
      (p) =>
        statusFilter.includes(p.status) &&
        (q === "" || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
    );

    const filteredTools = family.tools.filter(
      (t) =>
        statusFilter.includes(t.status) &&
        (q === "" || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || (t.endpoint && t.endpoint.toLowerCase().includes(q)))
    );

    return {
      ...family,
      platforms: filteredPlatforms,
      tools: filteredTools,
    };
  });

  return {
    families: filteredFamilies,
    updatedAt: matrix.updatedAt,
  };
}
