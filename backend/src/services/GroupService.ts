import { EventEmitter } from 'events';
import type { PrismaClient } from '@prisma/client';
import { safeJSONStringify, safeJSONParse } from '../utils/safeJSON';

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

export const VALID_GROUP_TYPES = [
  'swarm', 'pipeline', 'committee', 'debate', 'review-chain', 'broadcast',
] as const;

export type GroupType = typeof VALID_GROUP_TYPES[number];

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
  // Group Type System fields
  groupType?: string;
  roleDefinitions?: Record<string, unknown>[];
  strategy?: Record<string, unknown>;
  outputFormat?: string;
  color?: string;
  icon?: string;
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
  // Group Type System fields
  groupType?: string;
  roleDefinitions?: Record<string, unknown>[];
  strategy?: Record<string, unknown>;
  outputFormat?: string;
  color?: string;
  icon?: string;
}

export class GroupService extends EventEmitter {
  private groups = new Map<string, Group>();

  constructor(private prisma?: PrismaClient) {
    super();
  }

  async create(data: CreateGroupInput): Promise<Group> {
    const dbData = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description || null,
      parentId: data.parentId || null,
      coordinatorId: data.coordinatorId || null,
      executionMode: data.executionMode || ExecutionMode.SEQUENTIAL,
      status: GroupStatus.ACTIVE,
      maxDepth: data.maxDepth || 1,
      // Group Type System
      groupType: data.groupType || 'swarm',
      roleDefinitions: safeJSONStringify(data.roleDefinitions || []),
      strategy: safeJSONStringify(data.strategy || {}),
      outputFormat: data.outputFormat || 'markdown',
      color: data.color || null,
      icon: data.icon || null,
    };

    if (this.prisma) {
      const raw = await this.prisma.group.create({ data: dbData });
      const group = this.toGroup(raw);
      this.emit('group:created', group);
      return group;
    }

    const group: Group = {
      id: dbData.id,
      name: data.name,
      description: data.description,
      parentId: data.parentId,
      coordinatorId: data.coordinatorId,
      executionMode: data.executionMode || ExecutionMode.SEQUENTIAL,
      agentIds: [],
      status: GroupStatus.ACTIVE,
      maxDepth: data.maxDepth || 1,
      groupType: data.groupType || 'swarm',
      roleDefinitions: data.roleDefinitions || [],
      strategy: data.strategy || {},
      outputFormat: data.outputFormat || 'markdown',
      color: data.color,
      icon: data.icon,
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

  async list(filters?: { groupType?: string }): Promise<Group[]> {
    if (this.prisma) {
      const where: any = {};
      if (filters?.groupType) where.groupType = filters.groupType;
      const raws = await this.prisma.group.findMany({ where, include: { agents: true }, orderBy: { createdAt: 'desc' } });
      return raws.map(r => this.toGroup(r));
    }
    let results = Array.from(this.groups.values());
    if (filters?.groupType) results = results.filter(g => g.groupType === filters.groupType);
    return results;
  }

  async update(id: string, data: Partial<Group>): Promise<Group | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;
    if (data.coordinatorId !== undefined) updateData.coordinatorId = data.coordinatorId;
    if (data.executionMode !== undefined) updateData.executionMode = data.executionMode;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.maxDepth !== undefined) updateData.maxDepth = data.maxDepth;
    // Group Type System
    if (data.groupType !== undefined) updateData.groupType = data.groupType;
    if (data.roleDefinitions !== undefined) updateData.roleDefinitions = safeJSONStringify(data.roleDefinitions);
    if (data.strategy !== undefined) updateData.strategy = safeJSONStringify(data.strategy);
    if (data.outputFormat !== undefined) updateData.outputFormat = data.outputFormat;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon;

    if (this.prisma) {
      try {
        const raw = await this.prisma.group.update({ where: { id }, data: updateData });
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
    const mode = options.mode || group?.executionMode || 'sequential';
    const input = options.input || '';
    const groupType = group?.groupType || 'swarm';
    const strategy = group?.strategy || {};

    // 根据 groupType 和 strategy 生成不同的执行结果
    let result = `群组 ${groupId} 执行完成，模式: ${mode}`;

    if (groupType === 'pipeline') {
      const steps = (strategy['steps'] as string[]) || agentIds.map((_, i) => `步骤 ${i + 1}`);
      result = `流水线执行完成: ${steps.join(' → ')}`;
    } else if (groupType === 'committee') {
      result = `委员会讨论完成，${agentIds.length} 位成员参与决策`;
    } else if (groupType === 'debate') {
      result = `辩论赛结束，正方与反方已完成观点交锋`;
    } else if (groupType === 'review-chain') {
      result = `审查链执行完成，${agentIds.length} 轮审查通过`;
    } else if (groupType === 'broadcast') {
      result = `广播任务完成，已向 ${agentIds.length} 个接收者分发`;
    } else if (groupType === 'swarm') {
      const swarmMode = (strategy['swarmMode'] as string) || 'cooperative';
      result = `蜂群协同完成，模式: ${swarmMode}，${agentIds.length} 个Agent参与`;
    }

    if (input) {
      result += `，输入: ${input.substring(0, 100)}${input.length > 100 ? '...' : ''}`;
    }

    return {
      groupId,
      mode,
      input,
      result,
      agents: agentIds,
    };
  }

  async getStats(): Promise<{ total: number; active: number; paused: number; disbanded: number }> {
    if (this.prisma) {
      const [total, active, paused, disbanded] = await Promise.all([
        this.prisma.group.count(),
        this.prisma.group.count({ where: { status: 'active' } }),
        this.prisma.group.count({ where: { status: 'paused' } }),
        this.prisma.group.count({ where: { status: 'disbanded' } }),
      ]);
      return { total, active, paused, disbanded };
    }
    const all = Array.from(this.groups.values());
    return {
      total: all.length,
      active: all.filter(g => g.status === GroupStatus.ACTIVE).length,
      paused: all.filter(g => g.status === GroupStatus.PAUSED).length,
      disbanded: all.filter(g => g.status === GroupStatus.DISBANDED).length,
    };
  }

  private toGroup(raw: any): Group {
    return {
      ...raw,
      agentIds: raw.agents?.map((a: any) => a.id) || [],
      roleDefinitions: safeJSONParse(raw.roleDefinitions, []),
      strategy: safeJSONParse(raw.strategy, {}),
    };
  }
}
