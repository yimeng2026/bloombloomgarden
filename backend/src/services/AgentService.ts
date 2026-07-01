import { EventEmitter } from 'events';
import type { PrismaClient } from '@prisma/client';
import { safeJSONStringify, safeJSONParse } from '../utils/safeJSON';

export enum AgentStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ERROR = 'error',
  ISOLATED = 'isolated',
  TERMINATED = 'terminated',
}

export const VALID_AGENT_TYPES = [
  'general', 'coding', 'writing', 'analysis', 'creative',
  'research', 'business', 'customer-service', 'debugging',
  'reviewer', 'architect', 'data-scientist', 'pm', 'qa',
  'devops', 'security', 'legal', 'medical', 'education',
  'entertainment', 'marketing',
] as const;

export type AgentType = typeof VALID_AGENT_TYPES[number];

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
  // Agent Type System fields
  agentType?: string;
  capabilities?: string[];
  personality?: string;
  systemPrompt?: string;
  tags?: string[];
  color?: string;
  icon?: string;
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
  // Agent Type System fields
  agentType?: string;
  capabilities?: string[];
  personality?: string;
  systemPrompt?: string;
  tags?: string[];
  color?: string;
  icon?: string;
  stats?: Record<string, unknown>;
  // L2 Orchestrator fields
  engineId?: string;
  orchestratedEngines?: string[];
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
    config: safeJSONParse(raw.config, {}),
    knowledgeBaseIds: safeJSONParse(raw.knowledgeBaseIds, []),
    skillIds: safeJSONParse(raw.skillIds, []),
    integrationIds: safeJSONParse(raw.integrationIds, []),
    workFiles: safeJSONParse(raw.workFiles, []),
    threadPlatforms: safeJSONParse(raw.threadPlatforms, []),
    protocolLevel: raw.protocolLevel ?? 1,
    mode: raw.mode ?? 'A',
    dashboardType: raw.dashboardType ?? 'L1',
    swarmEnabled: raw.swarmEnabled ?? false,
    swarmMode: raw.swarmMode || undefined,
    roleInGroup: raw.roleInGroup || 'solo',
    coordinatorId: raw.coordinatorId || undefined,
    platformId: raw.platformId || undefined,
    apiKeyId: raw.apiKeyId || undefined,
    // Agent Type System fields
    agentType: raw.agentType || 'general',
    capabilities: safeJSONParse(raw.capabilities, []),
    personality: raw.personality || undefined,
    systemPrompt: raw.systemPrompt || undefined,
    tags: safeJSONParse(raw.tags, []),
    color: raw.color || undefined,
    icon: raw.icon || undefined,
    stats: safeJSONParse(raw.stats, {}),
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

    // 5. agentType 有效性
    if (data.agentType) {
      if (!VALID_AGENT_TYPES.includes(data.agentType as AgentType)) {
        return { valid: false, error: `Invalid agentType "${data.agentType}". Must be one of: ${VALID_AGENT_TYPES.join(', ')}` };
      }
    }

    return { valid: true };
  }

  // ─── 统一数据准备（JSON 序列化）────────────────────────
  private prepareAgentData(data: CreateAgentInput): any {
    const protocolLevel = data.protocolLevel ?? 1;
    const mode = data.mode ?? 'A';
    const dashboardType = data.dashboardType || getDashboardType(protocolLevel);

    // 合并 L2 编排器字段到 config
    const config = data.config || {};
    if (data.engineId) {
      config.engineId = data.engineId;
    }
    if (data.orchestratedEngines && data.orchestratedEngines.length > 0) {
      config.orchestratedEngines = data.orchestratedEngines;
    }

    // 自动注入 L1 引擎：所有 L2 编排器（protocolLevel === 2 或 category === 'orchestrator'）
    // 如果未配置 engineId / orchestratedEngines，自动 fallback 到 zhipu
    if (!config.engineId && (!(config.orchestratedEngines as string[]) || (config.orchestratedEngines as string[]).length === 0)) {
      const isL2ByLevel = protocolLevel === 2;
      let isL2ByProvider = false;
      if (data.platformId) {
        try {
          const providersConfig = require('../config/providers.json');
          const provider = (providersConfig.providers || []).find((p: any) => p.id === data.platformId);
          if (provider && (provider.protocolLevel === 2 || provider.category === 'orchestrator')) {
            isL2ByProvider = true;
          }
        } catch { /* ignore providers.json missing */ }
      }
      if (isL2ByLevel || isL2ByProvider) {
        config.engineId = 'zhipu';
        config.orchestratedEngines = ['zhipu'];
      }
    }

    return {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      role: data.role.trim(),
      status: AgentStatus.ACTIVE,
      config: safeJSONStringify(config),
      knowledgeBaseIds: safeJSONStringify(data.knowledgeBaseIds || []),
      skillIds: safeJSONStringify(data.skillIds || []),
      workspaceId: data.workspaceId || null,
      groupId: data.groupId || null,
      description: data.description || null,
      avatar: data.avatar || null,
      // Protocol Layer
      protocolLevel,
      mode,
      parentPlatform: data.parentPlatform || null,
      threadPlatforms: safeJSONStringify(data.threadPlatforms || []),
      dashboardType,
      workFiles: safeJSONStringify(data.workFiles || []),
      // Platform & API Binding
      platformId: data.platformId || null,
      apiKeyId: data.apiKeyId || null,
      // Swarm
      swarmEnabled: data.swarmEnabled ?? false,
      swarmMode: data.swarmMode || null,
      roleInGroup: data.roleInGroup || 'solo',
      coordinatorId: data.coordinatorId || null,
      // Agent Type System — 非JSON字符串直接存储，JSON字段用 safeJSONStringify
      agentType: data.agentType || 'general',
      capabilities: safeJSONStringify(data.capabilities || []),
      personality: data.personality || null,
      systemPrompt: data.systemPrompt || null,
      tags: safeJSONStringify(data.tags || []),
      color: data.color || null,
      icon: data.icon || null,
      stats: safeJSONStringify(data.stats || {}),
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
      threadPlatforms: data.threadPlatforms || [],
      dashboardType: dbData.dashboardType,
      workFiles: data.workFiles || [],
      platformId: data.platformId,
      apiKeyId: data.apiKeyId,
      swarmEnabled: dbData.swarmEnabled,
      swarmMode: data.swarmMode,
      roleInGroup: dbData.roleInGroup,
      coordinatorId: data.coordinatorId,
      // Agent Type System
      agentType: data.agentType || 'general',
      capabilities: data.capabilities || [],
      personality: data.personality,
      systemPrompt: data.systemPrompt,
      tags: data.tags || [],
      color: data.color,
      icon: data.icon,
      stats: data.stats || {},
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

  async list(filters?: { groupId?: string; status?: AgentStatus; role?: string; agentType?: string }): Promise<Agent[]> {
    if (this.prisma) {
      const where: any = {};
      if (filters?.groupId) where.groupId = filters.groupId;
      if (filters?.status) where.status = filters.status;
      if (filters?.role) where.role = filters.role;
      if (filters?.agentType) where.agentType = filters.agentType;
      const raws = await this.prisma.agent.findMany({ where, orderBy: { createdAt: 'desc' } });
      return raws.map(toAgent);
    }
    let results = Array.from(this.agents.values());
    if (filters?.groupId) results = results.filter(a => a.groupId === filters.groupId);
    if (filters?.status) results = results.filter(a => a.status === filters.status);
    if (filters?.role) results = results.filter(a => a.role === filters.role);
    if (filters?.agentType) results = results.filter(a => a.agentType === filters.agentType);
    return results;
  }

  async update(id: string, data: Partial<Agent>): Promise<Agent | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.config !== undefined) updateData.config = safeJSONStringify(data.config);
    if (data.knowledgeBaseIds !== undefined) updateData.knowledgeBaseIds = safeJSONStringify(data.knowledgeBaseIds);
    if (data.skillIds !== undefined) updateData.skillIds = safeJSONStringify(data.skillIds);
    if (data.workspaceId !== undefined) updateData.workspaceId = data.workspaceId;
    if (data.groupId !== undefined) updateData.groupId = data.groupId;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.protocolLevel !== undefined) updateData.protocolLevel = data.protocolLevel;
    if (data.mode !== undefined) updateData.mode = data.mode;
    if (data.parentPlatform !== undefined) updateData.parentPlatform = data.parentPlatform;
    if (data.threadPlatforms !== undefined) updateData.threadPlatforms = safeJSONStringify(data.threadPlatforms);
    if (data.dashboardType !== undefined) updateData.dashboardType = data.dashboardType;
    if (data.workFiles !== undefined) updateData.workFiles = safeJSONStringify(data.workFiles);
    if (data.swarmEnabled !== undefined) updateData.swarmEnabled = data.swarmEnabled;
    if (data.swarmMode !== undefined) updateData.swarmMode = data.swarmMode;
    if (data.roleInGroup !== undefined) updateData.roleInGroup = data.roleInGroup;
    if (data.coordinatorId !== undefined) updateData.coordinatorId = data.coordinatorId;
    // Agent Type System
    if (data.agentType !== undefined) updateData.agentType = data.agentType;
    if (data.capabilities !== undefined) updateData.capabilities = safeJSONStringify(data.capabilities);
    if (data.personality !== undefined) updateData.personality = data.personality;
    if (data.systemPrompt !== undefined) updateData.systemPrompt = data.systemPrompt;
    if (data.tags !== undefined) updateData.tags = safeJSONStringify(data.tags);
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.stats !== undefined) updateData.stats = safeJSONStringify(data.stats);

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

  async getStats(): Promise<{ total: number; active: number; paused: number; error: number; isolated: number }> {
    if (this.prisma) {
      const [total, active, paused, error, isolated] = await Promise.all([
        this.prisma.agent.count(),
        this.prisma.agent.count({ where: { status: 'active' } }),
        this.prisma.agent.count({ where: { status: 'paused' } }),
        this.prisma.agent.count({ where: { status: 'error' } }),
        this.prisma.agent.count({ where: { status: 'isolated' } }),
      ]);
      return { total, active, paused, error, isolated };
    }
    const all = Array.from(this.agents.values());
    return {
      total: all.length,
      active: all.filter(a => a.status === AgentStatus.ACTIVE).length,
      paused: all.filter(a => a.status === AgentStatus.PAUSED).length,
      error: all.filter(a => a.status === AgentStatus.ERROR).length,
      isolated: all.filter(a => a.status === AgentStatus.ISOLATED).length,
    };
  }
}
