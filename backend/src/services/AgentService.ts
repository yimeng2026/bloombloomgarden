import { EventEmitter } from 'events';
import type { PrismaClient } from '@prisma/client';

export enum AgentStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ERROR = 'error',
  ISOLATED = 'isolated',
  TERMINATED = 'terminated',
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  config: Record<string, unknown>;
  knowledgeBaseIds: string[];
  skillIds: string[];
  workspaceId?: string;
  integrationIds: string[];
  groupId?: string;
  stats?: Record<string, unknown>;
  description?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentInput {
  name: string;
  role: string;
  config?: Record<string, unknown>;
  knowledgeBaseIds?: string[];
  skillIds?: string[];
  workspaceId?: string;
  groupId?: string;
  description?: string;
  avatar?: string;
}

function toAgent(raw: any): Agent {
  return {
    ...raw,
    config: JSON.parse(raw.config || '{}'),
    knowledgeBaseIds: JSON.parse(raw.knowledgeBaseIds || '[]'),
    skillIds: JSON.parse(raw.skillIds || '[]'),
    integrationIds: JSON.parse(raw.integrationIds || '[]'),
  };
}

export class AgentService extends EventEmitter {
  private agents = new Map<string, Agent>();

  constructor(private prisma?: PrismaClient) {
    super();
  }

  async create(data: CreateAgentInput): Promise<Agent> {
    const config = JSON.stringify(data.config || {});
    const kbs = JSON.stringify(data.knowledgeBaseIds || []);
    const skills = JSON.stringify(data.skillIds || []);

    if (this.prisma) {
      const raw = await this.prisma.agent.create({
        data: {
          id: crypto.randomUUID(),
          name: data.name,
          role: data.role,
          status: AgentStatus.ACTIVE,
          config,
          knowledgeBaseIds: kbs,
          skillIds: skills,
          workspaceId: data.workspaceId,
          groupId: data.groupId,
          description: data.description,
          avatar: data.avatar,
        },
      });
      const agent = toAgent(raw);
      this.emit('agent:created', agent);
      return agent;
    }

    const agent: Agent = {
      id: crypto.randomUUID(),
      name: data.name,
      role: data.role,
      status: AgentStatus.ACTIVE,
      config: data.config || {},
      knowledgeBaseIds: data.knowledgeBaseIds || [],
      skillIds: data.skillIds || [],
      workspaceId: data.workspaceId,
      integrationIds: [],
      groupId: data.groupId,
      description: data.description,
      avatar: data.avatar,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.agents.set(agent.id, agent);
    this.emit('agent:created', agent);
    return agent;
  }

  async getById(id: string): Promise<Agent | undefined> {
    if (this.prisma) {
      const raw = await this.prisma.agent.findUnique({ where: { id } });
      return raw ? toAgent(raw) : undefined;
    }
    return this.agents.get(id);
  }

  async list(filters?: { groupId?: string; status?: AgentStatus; role?: string }): Promise<Agent[]> {
    if (this.prisma) {
      const where: any = {};
      if (filters?.groupId) where.groupId = filters.groupId;
      if (filters?.status) where.status = filters.status;
      if (filters?.role) where.role = filters.role;
      const raws = await this.prisma.agent.findMany({ where, orderBy: { createdAt: 'desc' } });
      return raws.map(toAgent);
    }
    let results = Array.from(this.agents.values());
    if (filters?.groupId) results = results.filter(a => a.groupId === filters.groupId);
    if (filters?.status) results = results.filter(a => a.status === filters.status);
    if (filters?.role) results = results.filter(a => a.role === filters.role);
    return results;
  }

  async update(id: string, data: Partial<Agent>): Promise<Agent | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (data.name) updateData.name = data.name;
    if (data.role) updateData.role = data.role;
    if (data.status) updateData.status = data.status;
    if (data.config) updateData.config = JSON.stringify(data.config);
    if (data.knowledgeBaseIds) updateData.knowledgeBaseIds = JSON.stringify(data.knowledgeBaseIds);
    if (data.skillIds) updateData.skillIds = JSON.stringify(data.skillIds);
    if (data.workspaceId !== undefined) updateData.workspaceId = data.workspaceId;
    if (data.groupId !== undefined) updateData.groupId = data.groupId;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;

    if (this.prisma) {
      try {
        const raw = await this.prisma.agent.update({ where: { id }, data: updateData });
        const agent = toAgent(raw);
        this.emit('agent:updated', agent);
        return agent;
      } catch {
        return undefined;
      }
    }

    const agent = this.agents.get(id);
    if (!agent) return undefined;
    Object.assign(agent, data, { updatedAt: new Date() });
    this.emit('agent:updated', agent);
    return agent;
  }

  async delete(id: string): Promise<boolean> {
    if (this.prisma) {
      try {
        await this.prisma.agent.delete({ where: { id } });
        this.emit('agent:deleted', { id });
        return true;
      } catch {
        return false;
      }
    }
    const existed = this.agents.delete(id);
    if (existed) this.emit('agent:deleted', { id });
    return existed;
  }

  async updateStatus(id: string, status: AgentStatus): Promise<Agent | undefined> {
    return this.update(id, { status });
  }

  async pause(id: string): Promise<Agent | undefined> {
    return this.updateStatus(id, AgentStatus.PAUSED);
  }

  async resume(id: string): Promise<Agent | undefined> {
    return this.updateStatus(id, AgentStatus.ACTIVE);
  }

  async isolate(id: string): Promise<Agent | undefined> {
    return this.updateStatus(id, AgentStatus.ISOLATED);
  }

  async injectMessage(id: string, message: string): Promise<void> {
    this.emit('agent:messageInjected', { agentId: id, message, timestamp: new Date() });
  }

  getStats(): { total: number; active: number; paused: number; error: number; isolated: number } {
    return { total: 0, active: 0, paused: 0, error: 0, isolated: 0 };
  }
}
