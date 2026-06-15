import { IAgentAdapter, AdapterConfig, Agent, AgentGroup, Channel, Task, Workflow, KnowledgeBase, CostRecord, CronJob, Conversation, Message } from "./index";

export class OpenClawAdapter implements IAgentAdapter {
  constructor(private config: AdapterConfig) {}

  private async fetch(path: string, options?: RequestInit) {
    const res = await fetch(`${this.config.apiBase}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        ...this.config.headers,
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error(`OpenClaw API error: ${res.status}`);
    return res.json();
  }

  async listAgents(): Promise<Agent[]> {
    return this.fetch("/api/agents");
  }
  async createAgent(data: Partial<Agent>): Promise<Agent> {
    return this.fetch("/api/agents", { method: "POST", body: JSON.stringify(data) });
  }
  async updateAgent(id: string, data: Partial<Agent>): Promise<Agent> {
    return this.fetch(`/api/agents/${id}`, { method: "PUT", body: JSON.stringify(data) });
  }
  async deleteAgent(id: string): Promise<void> {
    await this.fetch(`/api/agents/${id}`, { method: "DELETE" });
  }

  async listGroups(): Promise<AgentGroup[]> {
    return this.fetch("/api/groups");
  }
  async createGroup(data: Partial<AgentGroup>): Promise<AgentGroup> {
    return this.fetch("/api/groups", { method: "POST", body: JSON.stringify(data) });
  }
  async executeGroup(id: string, message: string): Promise<ReadableStream> {
    const res = await fetch(`${this.config.apiBase}/api/chat/group`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: id, content: message }),
    });
    return res.body!;
  }

  async sendMessage(conversationId: string, content: string): Promise<ReadableStream> {
    const res = await fetch(`${this.config.apiBase}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, content }),
    });
    return res.body!;
  }
  async listConversations(): Promise<Conversation[]> {
    return this.fetch("/api/conversations");
  }
  async getConversation(id: string): Promise<Conversation> {
    return this.fetch(`/api/conversations/${id}`);
  }

  async listChannels(): Promise<Channel[]> {
    return this.fetch("/api/channels");
  }
  async updateChannel(id: string, data: Partial<Channel>): Promise<Channel> {
    return this.fetch("/api/channels", { method: "PUT", body: JSON.stringify({ id, ...data }) });
  }

  async listTasks(): Promise<Task[]> {
    return this.fetch("/api/tasks");
  }
  async createTask(data: Partial<Task>): Promise<Task> {
    return this.fetch("/api/tasks", { method: "POST", body: JSON.stringify(data) });
  }
  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    return this.fetch("/api/tasks", { method: "PUT", body: JSON.stringify({ id, ...data }) });
  }

  async listWorkflows(): Promise<Workflow[]> {
    return this.fetch("/api/workflows");
  }
  async executeWorkflow(id: string): Promise<void> {
    await this.fetch(`/api/workflows/${id}/execute`, { method: "POST" });
  }

  async listKnowledgeBases(): Promise<KnowledgeBase[]> {
    return this.fetch("/api/knowledge");
  }
  async createKnowledgeBase(data: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
    return this.fetch("/api/knowledge", { method: "POST", body: JSON.stringify(data) });
  }

  async listCosts(): Promise<CostRecord[]> {
    return this.fetch("/api/costs").then((r: any) => r.records || []);
  }

  async listCronJobs(): Promise<CronJob[]> {
    return this.fetch("/api/cron");
  }
  async createCronJob(data: Partial<CronJob>): Promise<CronJob> {
    return this.fetch("/api/cron", { method: "POST", body: JSON.stringify(data) });
  }

  async getHealth(): Promise<{ status: string; version: string; uptime: string }> {
    return this.fetch("/api/health").catch(() => ({ status: "unknown", version: "unknown", uptime: "unknown" }));
  }
}
