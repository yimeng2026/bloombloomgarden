import { IAgentAdapter, AdapterConfig, Agent, AgentGroup, Channel, Task, Workflow, KnowledgeBase, CostRecord, CronJob, Conversation, Message } from "./index";

export class DifyAdapter implements IAgentAdapter {
  constructor(private config: AdapterConfig) {}

  private async fetch(path: string, options?: RequestInit) {
    const res = await fetch(`${this.config.apiBase}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
        ...this.config.headers,
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error(`Dify API error: ${res.status}`);
    return res.json();
  }

  async listAgents(): Promise<Agent[]> {
    const data = await this.fetch("/apps");
    return data.data?.map((app: any) => ({
      id: app.id,
      name: app.name,
      description: app.description || "",
      avatar: app.icon || "🤖",
      status: "idle",
      model: "dify",
      llmProvider: "dify",
      createdAt: app.created_at,
    })) || [];
  }
  async createAgent(data: Partial<Agent>): Promise<Agent> {
    const res = await this.fetch("/apps", { method: "POST", body: JSON.stringify({ name: data.name, mode: "chat" }) });
    return { ...data, id: res.id, status: "idle" } as Agent;
  }
  async updateAgent(): Promise<Agent> { throw new Error("Not implemented"); }
  async deleteAgent(id: string): Promise<void> {
    await this.fetch(`/apps/${id}`, { method: "DELETE" });
  }

  async listGroups(): Promise<AgentGroup[]> { return []; }
  async createGroup(): Promise<AgentGroup> { throw new Error("Not implemented"); }
  async executeGroup(): Promise<ReadableStream> { throw new Error("Not implemented"); }

  async sendMessage(conversationId: string, content: string): Promise<ReadableStream> {
    const res = await fetch(`${this.config.apiBase}/chat-messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.config.apiKey}` },
      body: JSON.stringify({ inputs: {}, query: content, response_mode: "streaming", conversation_id: conversationId, user: "user" }),
    });
    return res.body!;
  }
  async listConversations(): Promise<Conversation[]> { return []; }
  async getConversation(): Promise<Conversation> { throw new Error("Not implemented"); }

  async listChannels(): Promise<Channel[]> { return []; }
  async updateChannel(): Promise<Channel> { throw new Error("Not implemented"); }

  async listTasks(): Promise<Task[]> { return []; }
  async createTask(): Promise<Task> { throw new Error("Not implemented"); }
  async updateTask(): Promise<Task> { throw new Error("Not implemented"); }

  async listWorkflows(): Promise<Workflow[]> { return []; }
  async executeWorkflow(): Promise<void> { throw new Error("Not implemented"); }

  async listKnowledgeBases(): Promise<KnowledgeBase[]> { return []; }
  async createKnowledgeBase(): Promise<KnowledgeBase> { throw new Error("Not implemented"); }

  async listCosts(): Promise<CostRecord[]> { return []; }
  async listCronJobs(): Promise<CronJob[]> { return []; }
  async createCronJob(): Promise<CronJob> { throw new Error("Not implemented"); }

  async getHealth(): Promise<{ status: string; version: string; uptime: string }> {
    return { status: "ok", version: "dify", uptime: "unknown" };
  }
}
