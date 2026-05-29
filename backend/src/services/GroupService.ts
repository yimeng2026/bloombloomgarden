import { EventEmitter } from 'events';
import type { PrismaClient } from '@prisma/client';

export enum ExecutionMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  HIERARCHICAL = 'hierarchical',
  DYNAMIC = 'dynamic',
}

export enum GroupStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  DISBANDED = 'disbanded',
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  coordinatorId?: string;
  executionMode: ExecutionMode;
  agentIds: string[];
  status: GroupStatus;
  maxDepth: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  parentId?: string;
  coordinatorId?: string;
  executionMode?: ExecutionMode;
  maxDepth?: number;
}

export class GroupService extends EventEmitter {
  private groups = new Map<string, Group>();

  constructor(private prisma?: PrismaClient) {
    super();
  }

  async create(data: CreateGroupInput): Promise<Group> {
    if (this.prisma) {
      const raw = await this.prisma.group.create({
        data: {
          id: crypto.randomUUID(),
          name: data.name,
          description: data.description,
          parentId: data.parentId,
          coordinatorId: data.coordinatorId,
          executionMode: data.executionMode || ExecutionMode.SEQUENTIAL,
          status: GroupStatus.ACTIVE,
          maxDepth: data.maxDepth || 1,
        },
      });
      const group = this.toGroup(raw);
      this.emit('group:created', group);
      return group;
    }

    const group: Group = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      parentId: data.parentId,
      coordinatorId: data.coordinatorId,
      executionMode: data.executionMode || ExecutionMode.SEQUENTIAL,
      agentIds: [],
      status: GroupStatus.ACTIVE,
      maxDepth: data.maxDepth || 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.groups.set(group.id, group);
    this.emit('group:created', group);
    return group;
  }

  async getById(id: string): Promise<Group | undefined> {
    if (this.prisma) {
      const raw = await this.prisma.group.findUnique({ where: { id }, include: { agents: true } });
      return raw ? this.toGroup(raw) : undefined;
    }
    return this.groups.get(id);
  }

  async list(): Promise<Group[]> {
    if (this.prisma) {
      const raws = await this.prisma.group.findMany({ include: { agents: true }, orderBy: { createdAt: 'desc' } });
      return raws.map(r => this.toGroup(r));
    }
    return Array.from(this.groups.values());
  }

  async update(id: string, data: Partial<Group>): Promise<Group | undefined> {
    if (this.prisma) {
      try {
        const raw = await this.prisma.group.update({ where: { id }, data });
        const group = this.toGroup(raw);
        this.emit('group:updated', group);
        return group;
      } catch {
        return undefined;
      }
    }
    const group = this.groups.get(id);
    if (!group) return undefined;
    Object.assign(group, data, { updatedAt: new Date() });
    this.emit('group:updated', group);
    return group;
  }

  async delete(id: string): Promise<boolean> {
    if (this.prisma) {
      try {
        await this.prisma.group.delete({ where: { id } });
        return true;
      } catch {
        return false;
      }
    }
    return this.groups.delete(id);
  }

  async addAgent(groupId: string, agentId: string): Promise<Group | undefined> {
    if (this.prisma) {
      await this.prisma.agent.update({ where: { id: agentId }, data: { groupId } });
      return this.getById(groupId);
    }
    const group = this.groups.get(groupId);
    if (!group) return undefined;
    if (!group.agentIds.includes(agentId)) {
      group.agentIds.push(agentId);
      group.updatedAt = new Date();
    }
    return group;
  }

  async removeAgent(groupId: string, agentId: string): Promise<Group | undefined> {
    if (this.prisma) {
      await this.prisma.agent.update({ where: { id: agentId }, data: { groupId: null } });
      return this.getById(groupId);
    }
    const group = this.groups.get(groupId);
    if (!group) return undefined;
    group.agentIds = group.agentIds.filter(id => id !== agentId);
    group.updatedAt = new Date();
    return group;
  }

  async setCoordinator(groupId: string, agentId: string): Promise<Group | undefined> {
    return this.update(groupId, { coordinatorId: agentId });
  }

  async nestGroup(parentId: string, childId: string): Promise<Group | undefined> {
    const parent = await this.getById(parentId);
    if (!parent) return undefined;
    return this.update(childId, { parentId, maxDepth: parent.maxDepth + 1 });
  }

  async execute(groupId: string, options: { mode?: string; input?: string } = {}): Promise<{ groupId: string; mode: string; input: string; result: string; agents: string[] }> {
    const group = await this.getById(groupId);
    const agentIds = group?.agentIds || [];
    return {
      groupId,
      mode: options.mode || 'sequential',
      input: options.input || '',
      result: `群组 ${groupId} 执行完成，模式: ${options.mode || 'sequential'}`,
      agents: agentIds,
    };
  }

  private toGroup(raw: any): Group {
    return {
      ...raw,
      agentIds: raw.agents?.map((a: any) => a.id) || [],
    };
  }
}
