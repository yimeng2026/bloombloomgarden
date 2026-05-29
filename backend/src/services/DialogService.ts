import { EventEmitter } from 'events';

export interface ChatMessage {
  id: string;
  agentId: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  attachments?: string[];
  timestamp: Date;
}

export interface ChatContext {
  agentId: string;
  messages: ChatMessage[];
  metadata: Record<string, unknown>;
}

export class DialogService extends EventEmitter {
  private contexts = new Map<string, ChatContext>();

  async getOrCreateContext(agentId: string): Promise<ChatContext> {
    let ctx = this.contexts.get(agentId);
    if (!ctx) {
      ctx = { agentId, messages: [], metadata: {} };
      this.contexts.set(agentId, ctx);
    }
    return ctx;
  }

  async listAgents(): Promise<string[]> {
    return Array.from(this.contexts.keys());
  }

  async listSessions(): Promise<{ id: string; agentId: string; title: string; updatedAt: string }[]> {
    return Array.from(this.contexts.entries()).map(([agentId, ctx]) => ({
      id: `sess_${agentId}`,
      agentId,
      title: `对话 ${agentId.slice(-6)}`,
      updatedAt: ctx.messages.length > 0
        ? ctx.messages[ctx.messages.length - 1].timestamp.toISOString()
        : new Date().toISOString(),
    }));
  }

  async sendMessage(agentId: string, message: Omit<ChatMessage, 'id' | 'timestamp' | 'agentId'>): Promise<ChatMessage> {
    const ctx = await this.getOrCreateContext(agentId);
    const msg: ChatMessage = {
      ...message,
      agentId,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    ctx.messages.push(msg);
    this.emit('message:sent', msg);
    return msg;
  }

  async getContext(agentId: string): Promise<ChatContext | undefined> {
    return this.contexts.get(agentId);
  }

  async clearContext(agentId: string): Promise<boolean> {
    const existed = this.contexts.has(agentId);
    if (existed) {
      this.contexts.set(agentId, { agentId, messages: [], metadata: {} });
    }
    return existed;
  }

  async addAttachment(agentId: string, fileId: string): Promise<void> {
    const ctx = await this.getOrCreateContext(agentId);
    const lastMsg = ctx.messages[ctx.messages.length - 1];
    if (lastMsg) {
      if (!lastMsg.attachments) lastMsg.attachments = [];
      lastMsg.attachments.push(fileId);
    }
  }
}
