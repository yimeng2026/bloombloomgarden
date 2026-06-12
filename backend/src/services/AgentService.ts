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
  // Protocol Layer System fields
  protocolLevel?: number;
  mode?: string;
  parentPlatform?: string;
  threadPlatforms?: string;
  dashboardType?: string;
  workFiles?: string[];
  // Platform & API Binding
  platformId?: string;
  apiKeyId?: string;
  // Swarm System fields
  swarmEnabled?: boolean;
  swarmMode?: string;
  roleInGroup?: string;
  coordinatorId?: string;
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
  // Protocol Layer System fields
  protocolLevel?: number;
  mode?: string;
  parentPlatform?: string;
  threadPlatforms?: string[];
  dashboardType?: string;
  workFiles?: string[];
  // Platform & API Binding
  platformId?: string;
  apiKeyId?: string;
  // Swarm System fields
  swarmEnabled?: boolean;
  swarmMode?: string;
  roleInGroup?: string;
  coordinatorId?: string;
}

// ─── 校验工具 ───────────────────────────────────────────

function validateModeAndProtocolLevel(
  mode: string,
  protocolLevel: number
): { valid: boolean; error?: string } {
  const modeToLevel: Record<string, number> = {
    A: 1, // 单线程 → L1
    B: 2, // 多线程 → L2
    C: 3, // 网关 → L3
  };

  const expectedLevel = modeToLevel[mode];
  if (expectedLevel === undefined) {
    return { valid: false, error: `Invalid mode "${mode}". Must be A (single-thread), B (multi-thread), or C (gateway)` };
  }

  if (protocolLevel !== expectedLevel) {
    const modeLabels: Record<string, string> = {
      A: 'single-thread (L1)',
      B: 'multi-thread (L2)',
      C: 'gateway (L3)',
    };
    return {
      valid: false,
      error: `Mode "${mode}" (${modeLabels[mode]}) requires protocolLevel ${expectedLevel}, but got ${protocolLevel}`,
    };
  }

  return { valid: true };
}

function getDashboardType(level: number): string {
  const map: Record<number, string> = { 0: 'L0', 1: 'L1', 2: 'L2', 3: 'L3' };
  return map[level] || 'L1';
}

function toAgent(raw: any): Agent {
  return {
    ...raw,
    config: JSON.parse(raw.config || '{}'),
    knowledgeBaseIds: JSON.parse(raw.knowledgeBaseIds || '[]'),
    skillIds: JSON.parse(raw.skillIds || '[]'),
    integrationIds: JSON.parse(raw.integrationIds || '[]'),
    workFiles: JSON.parse(raw.workFiles || '[]'),
    threadPlatforms: JSON.parse(raw.threadPlatforms || '[]'),
    protocolLevel: raw.protocolLevel ?? 1,
    mode: raw.mode ?? 'A',
    dashboardType: raw.dashboardType ?? 'L1',
    swarmEnabled: raw.swarmEnabled ?? false,
    swarmMode: raw.swarmMode || undefined,
    roleInGroup: raw.roleInGroup || 'solo',
    coordinatorId: raw.coordinatorId || undefined,
    platformId: raw.platformId || undefined,
    apiKeyId: raw.apiKeyId || undefined,
  };
}

export class AgentService extends EventEmitter {
  private agents = new Map<string, Agent>();

  constructor(private prisma?: PrismaClient) {
    super();
  }

  // ─── 统一校验入口 ─────────────────────────────────────
  private validateCreateInput(data: CreateAgentInput): { valid: boolean; error?: string } {
    // 1. 基础字段非空
    if (!data.name || !data.name.trim()) {
      return { valid: false, error: 'Agent name is required' };
    }
    if (!data.role || !data.role.trim()) {
      return { valid: false, error: 'Agent role is required' };
    }

    // 2. protocolLevel 范围
    const protocolLevel = data.protocolLevel ?? 1;
    if (protocolLevel < 0 || protocolLevel > 3) {
      return { valid: false, error: `protocolLevel must be 0, 1, 2, or 3, got ${protocolLevel}` };
    }

    // 3. mode 与 protocolLevel 一致性（L0 跳过）
    const mode = data.mode ?? 'A';
    if (protocolLevel > 0) {
      const modeValidation = validateModeAndProtocolLevel(mode, protocolLevel);
      if (!modeValidation.valid) return modeValidation;
    }

    // 4. swarmMode 有效性（如果启用蜂群）
    if (data.swarmEnabled && data.swarmMode) {
      const validSwarmModes = ['swarm', 'pipeline', 'parallel', 'router'];
      if (!validSwarmModes.includes(data.swarmMode)) {
        return { valid: false, error: `Invalid swarmMode "${data.swarmMode}". Must be one of: ${validSwarmModes.join(', ')}` };
      }
    }

    return { valid: true };
  }

  // ─── 统一数据准备（JSON 序列化）────────────────────────
  private prepareAgentData(data: CreateAgentInput): any {
    const protocolLevel = data.protocolLevel ?? 1;
    const mode = data.mode ?? 'A';
    const dashboardType = data.dashboardType || getDashboardType(protocolLevel);

    return {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      role: data.role.trim(),
      status: AgentStatus.ACTIVE,
      config: JSON.stringify(data.config || {}),
      knowledgeBaseIds: JSON.stringify(data.knowledgeBaseIds || []),
      skillIds: JSON.stringify(data.skillIds || []),
      workspaceId: data.workspaceId || null,
      groupId: data.groupId || null,
      description: data.description || null,
      avatar: data.avatar || null,
      // Protocol Layer
      protocolLevel,
      mode,
      parentPlatform: data.parentPlatform || null,
      threadPlatforms: JSON.stringify(data.threadPlatforms || []),
      dashboardType,
      workFiles: JSON.stringify(data.workFiles || []),
      // Platform & API Binding
      platformId: data.platformId || null,
      apiKeyId: data.apiKeyId || null,
      // Swarm
      swarmEnabled: data.swarmEnabled ?? false,
      swarmMode: data.swarmMode || null,
      roleInGroup: data.roleInGroup || 'solo',
      coordinatorId: data.coordinatorId || null,
    };
  }

  async create(data: CreateAgentInput): Promise<Agent> {
    // ── 校验 ──
    const validation = this.validateCreateInput(data);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // ── 数据准备 ──
    const dbData = this.prepareAgentData(data);

    if (this.prisma) {
      const raw = await this.prisma.agent.create({ data: dbData });
      const agent = toAgent(raw);
      this.emit('agent:created', agent);
      return agent;
    }

    // ── 内存回退模式 ──
    const agent: Agent = {
      id: dbData.id,
      name: dbData.name,
      role: dbData.role,
      status: AgentStatus.ACTIVE,
      config: data.config || {},
      knowledgeBaseIds: data.knowledgeBaseIds || [],
      skillIds: data.skillIds || [],
      workspaceId: data.workspaceId,
      integrationIds: [],
      groupId: data.groupId,
      description: data.description,
      avatar: data.avatar,
      protocolLevel: dbData.protocolLevel,
      mode: dbData.mode,
      parentPlatform: data.parentPlatform,
      threadPlatforms: JSON.stringify(data.threadPlatforms || []),
      dashboardType: dbData.dashboardType,
      workFiles: data.workFiles || [],
      platformId: data.platformId,
      apiKeyId: data.apiKeyId,
      swarmEnabled: dbData.swarmEnabled,
      swarmMode: data.swarmMode,
      roleInGroup: dbData.roleInGroup,
      coordinatorId: data.coordinatorId,
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
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.config !== undefined) updateData.config = JSON.stringify(data.config);
    if (data.knowledgeBaseIds !== undefined) updateData.knowledgeBaseIds = JSON.stringify(data.knowledgeBaseIds);
    if (data.skillIds !== undefined) updateData.skillIds = JSON.stringify(data.skillIds);
    if (data.workspaceId !== undefined) updateData.workspaceId = data.workspaceId;
    if (data.groupId !== undefined) updateData.groupId = data.groupId;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.protocolLevel !== undefined) updateData.protocolLevel = data.protocolLevel;
    if (data.mode !== undefined) updateData.mode = data.mode;
    if (data.parentPlatform !== undefined) updateData.parentPlatform = data.parentPlatform;
    if (data.threadPlatforms !== undefined) updateData.threadPlatforms = JSON.stringify(data.threadPlatforms);
    if (data.dashboardType !== undefined) updateData.dashboardType = data.dashboardType;
    if (data.workFiles !== undefined) updateData.workFiles = JSON.stringify(data.workFiles);
    if (data.swarmEnabled !== undefined) updateData.swarmEnabled = data.swarmEnabled;
    if (data.swarmMode !== undefined) updateData.swarmMode = data.swarmMode;
    if (data.roleInGroup !== undefined) updateData.roleInGroup = data.roleInGroup;
    if (data.coordinatorId !== undefined) updateData.coordinatorId = data.coordinatorId;

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
