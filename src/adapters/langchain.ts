import { IAgentAdapter, AdapterConfig, Agent, AgentGroup, Channel, Task, Workflow, KnowledgeBase, CostRecord, CronJob, Conversation, Message } from "./index";

export class LangChainAdapter implements IAgentAdapter {
  constructor(private config: AdapterConfig) {}

  private async fetch(path: string, options?: RequestInit) {
    const res = await fetch(`${this.config.apiBase}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(this.config.apiKey ? { "X-API-Key": this.config.apiKey } : {}),
        ...this.config.headers,
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error(`LangChain API error: ${res.status}`);
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

  async listGroups(): Promise<AgentGroup[]> { return []; }
  async createGroup(): Promise<AgentGroup> { throw new Error("Not implemented"); }
  async executeGroup(): Promise<ReadableStream> { throw new Error("Not implemented"); }

  async sendMessage(conversationId: string, content: string): Promise<ReadableStream> {
    const res = await fetch(`${this.config.apiBase}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: conversationId, message: content }),
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
    return { status: "ok", version: "langchain", uptime: "unknown" };
  }
}
