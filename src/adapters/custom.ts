import { IAgentAdapter, AdapterConfig, Agent, AgentGroup, Channel, Task, Workflow, KnowledgeBase, CostRecord, CronJob, Conversation, Message } from "./index";

/**
 * Custom Adapter — 自定义后端适配器模板
 * 
 * 使用方式：
 * 1. 复制此文件，重命名为你的后端名称
 * 2. 实现所有 IAgentAdapter 接口方法
 * 3. 在 src/adapters/index.ts 中注册
 * 4. 在 .env 中设置 ADAPTER_TYPE=custom
 */

export class CustomAdapter implements IAgentAdapter {
  constructor(private config: AdapterConfig) {}

  private async fetch(path: string, options?: RequestInit) {
    const res = await fetch(`${this.config.apiBase}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...this.config.headers,
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error(`Custom API error: ${res.status}`);
    return res.json();
  }

  async listAgents(): Promise<Agent[]> {
    return this.fetch("/agents").catch(() => []);
  }
  async createAgent(data: Partial<Agent>): Promise<Agent> {
    return this.fetch("/agents", { method: "POST", body: JSON.stringify(data) });
  }
  async updateAgent(id: string, data: Partial<Agent>): Promise<Agent> {
    return this.fetch(`/agents/${id}`, { method: "PUT", body: JSON.stringify(data) });
  }
  async deleteAgent(id: string): Promise<void> {
    await this.fetch(`/agents/${id}`, { method: "DELETE" });
  }

  async listGroups(): Promise<AgentGroup[]> { return this.fetch("/groups").catch(() => []); }
  async createGroup(data: Partial<AgentGroup>): Promise<AgentGroup> {
    return this.fetch("/groups", { method: "POST", body: JSON.stringify(data) });
  }
  async executeGroup(id: string, message: string): Promise<ReadableStream> {
    const res = await fetch(`${this.config.apiBase}/groups/${id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    return res.body!;
  }

  async sendMessage(conversationId: string, content: string): Promise<ReadableStream> {
    const res = await fetch(`${this.config.apiBase}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, content }),
    });
    return res.body!;
  }
  async listConversations(): Promise<Conversation[]> {
    return this.fetch("/conversations").catch(() => []);
  }
  async getConversation(id: string): Promise<Conversation> {
    return this.fetch(`/conversations/${id}`);
  }

  async listChannels(): Promise<Channel[]> { return this.fetch("/channels").catch(() => []); }
  async updateChannel(id: string, data: Partial<Channel>): Promise<Channel> {
    return this.fetch("/channels", { method: "PUT", body: JSON.stringify({ id, ...data }) });
  }

  async listTasks(): Promise<Task[]> { return this.fetch("/tasks").catch(() => []); }
  async createTask(data: Partial<Task>): Promise<Task> {
    return this.fetch("/tasks", { method: "POST", body: JSON.stringify(data) });
  }
  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    return this.fetch("/tasks", { method: "PUT", body: JSON.stringify({ id, ...data }) });
  }

  async listWorkflows(): Promise<Workflow[]> { return this.fetch("/workflows").catch(() => []); }
  async executeWorkflow(id: string): Promise<void> {
    await this.fetch(`/workflows/${id}/execute`, { method: "POST" });
  }

  async listKnowledgeBases(): Promise<KnowledgeBase[]> { return this.fetch("/knowledge").catch(() => []); }
  async createKnowledgeBase(data: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
    return this.fetch("/knowledge", { method: "POST", body: JSON.stringify(data) });
  }

  async listCosts(): Promise<CostRecord[]> { return this.fetch("/costs").catch(() => []); }
  async listCronJobs(): Promise<CronJob[]> { return this.fetch("/cron").catch(() => []); }
  async createCronJob(data: Partial<CronJob>): Promise<CronJob> {
    return this.fetch("/cron", { method: "POST", body: JSON.stringify(data) });
  }

  async getHealth(): Promise<{ status: string; version: string; uptime: string }> {
    return this.fetch("/health").catch(() => ({ status: "unknown", version: "unknown", uptime: "unknown" }));
  }
}
