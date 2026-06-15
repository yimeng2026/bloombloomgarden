// ═══════════════════════════════════════════════════════════════════════════
// Agent Platform Adapter Interface — 后端适配器基类
// ═══════════════════════════════════════════════════════════════════════════
// 
// 任何后端只需实现此接口，前端 28 个页面零改动。
// 支持的框架：OpenClaw, Dify, LangChain, CrewAI, AutoGPT, MetaGPT, 自定义
//
// ═══════════════════════════════════════════════════════════════════════════

export interface AdapterConfig {
  id: string;
  name: string;
  type: "openclaw" | "dify" | "langchain" | "crewai" | "autogpt" | "metagpt" | "custom";
  apiBase: string;
  apiKey?: string;
  headers?: Record<string, string>;
  options?: Record<string, any>;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar: string;
  status: string;
  model: string;
  llmProvider: string;
  createdAt: string;
}

export interface AgentGroup {
  id: string;
  name: string;
  description: string;
  members: Agent[];
  status: string;
  createdAt: string;
}

export interface Channel {
  id: string;
  name: string;
  type: string;
  status: string;
  messageCount: number;
  lastActive: string;
  users: number;
  config: Record<string, string>;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  progress: number;
  agentName: string;
  createdAt: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  nodes: number;
  executions: number;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  docCount: number;
  indexedCount: number;
  status: string;
}

export interface CostRecord {
  id: string;
  model: string;
  provider: string;
  requestCount: number;
  tokenCount: number;
  cost: number;
  date: string;
}

export interface CronJob {
  id: string;
  name: string;
  description: string;
  schedule: string;
  status: string;
  lastResult: string;
  agentName: string;
}

export interface Message {
  id: string;
  role: string;
  content: string;
  agentName?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  agentId?: string;
  groupId?: string;
  updatedAt: string;
  messages?: Message[];
}

// ── 适配器接口 ──────────────────────────────────────────

export interface IAgentAdapter {
  // Agent
  listAgents(): Promise<Agent[]>;
  createAgent(data: Partial<Agent>): Promise<Agent>;
  updateAgent(id: string, data: Partial<Agent>): Promise<Agent>;
  deleteAgent(id: string): Promise<void>;

  // Group
  listGroups(): Promise<AgentGroup[]>;
  createGroup(data: Partial<AgentGroup>): Promise<AgentGroup>;
  executeGroup(id: string, message: string): Promise<ReadableStream>;

  // Chat
  sendMessage(conversationId: string, content: string): Promise<ReadableStream>;
  listConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation>;

  // Channel
  listChannels(): Promise<Channel[]>;
  updateChannel(id: string, data: Partial<Channel>): Promise<Channel>;

  // Task
  listTasks(): Promise<Task[]>;
  createTask(data: Partial<Task>): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task>;

  // Workflow
  listWorkflows(): Promise<Workflow[]>;
  executeWorkflow(id: string): Promise<void>;

  // Knowledge
  listKnowledgeBases(): Promise<KnowledgeBase[]>;
  createKnowledgeBase(data: Partial<KnowledgeBase>): Promise<KnowledgeBase>;

  // Cost
  listCosts(): Promise<CostRecord[]>;

  // Cron
  listCronJobs(): Promise<CronJob[]>;
  createCronJob(data: Partial<CronJob>): Promise<CronJob>;

  // Health
  getHealth(): Promise<{ status: string; version: string; uptime: string }>;
}

// ── 适配器工厂 ──────────────────────────────────────────

export function createAdapter(config: AdapterConfig): IAgentAdapter {
  switch (config.type) {
    case "openclaw":
      return new (require("./openclaw")).OpenClawAdapter(config);
    case "dify":
      return new (require("./dify")).DifyAdapter(config);
    case "langchain":
      return new (require("./langchain")).LangChainAdapter(config);
    case "custom":
      return new (require("./custom")).CustomAdapter(config);
    default:
      throw new Error(`Unknown adapter type: ${config.type}`);
  }
}

export { OpenClawAdapter } from "./openclaw";
export { DifyAdapter } from "./dify";
export { LangChainAdapter } from "./langchain";
export { CustomAdapter } from "./custom";
