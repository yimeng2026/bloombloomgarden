import { EventEmitter } from 'events';
import { prisma } from './PrismaService';

export interface Team {
  id: string;
  name: string;
  description?: string;
  frameworkId: string;
  framework?: { id: string; brand: string; name: string };
  collaborationMode: string;
  engineStrategy: string;
  sharedKnowledgeBaseIds: string[];
  sharedToolIds: string[];
  status: string;
  taskStats: { total: number; completed: number; failed: number };
  roles: Role[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  roleType: string;
  teamId: string;
  primaryEngine: string;
  secondaryEngine?: string;
  engineTier: string;
  temperature: number;
  maxTokens: number;
  authorizedTools: string[];
  knowledgeBaseIds: string[];
  systemPrompt?: string;
  roleConfig: Record<string, unknown>;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

function toTeam(raw: any): Team {
  return {
    ...raw,
    taskStats: JSON.parse(raw.taskStats || '{"total":0,"completed":0,"failed":0}'),
    sharedKnowledgeBaseIds: JSON.parse(raw.sharedKnowledgeBaseIds || '[]'),
    sharedToolIds: JSON.parse(raw.sharedToolIds || '[]'),
  };
}

function toRole(raw: any): Role {
  return {
    ...raw,
    authorizedTools: JSON.parse(raw.authorizedTools || '[]'),
    knowledgeBaseIds: JSON.parse(raw.knowledgeBaseIds || '[]'),
    roleConfig: JSON.parse(raw.roleConfig || '{}'),
  };
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  frameworkId: string;
  collaborationMode?: string;
  engineStrategy?: string;
  roles: Array<{
    name: string;
    roleType: string;
    primaryEngine?: string;
    systemPrompt?: string;
    authorizedTools?: string[];
  }>;
}

export class TeamService extends EventEmitter {
  async create(data: CreateTeamInput): Promise<Team> {
    // 确保 framework 存在于数据库中（如果不存在，从 providers.json 创建）
    const existingFramework = await prisma.framework.findUnique({
      where: { id: data.frameworkId },
    });
    if (!existingFramework) {
      // 从 providers.json 查找并创建
      const providersConfig = require('../config/providers.json');
      const provider = providersConfig.providers.find((p: any) => p.id === data.frameworkId);
      if (provider) {
        await prisma.framework.create({
          data: {
            id: provider.id,
            brand: provider.id,
            name: provider.name,
            tagline: '',
            description: '',
            category: provider.category === 'orchestrator' ? 'multi-agent' : provider.category,
            features: '[]',
            defaultConfig: '{}',
            protocolLevel: provider.protocolLevel || 2,
            status: 'active',
          },
        });
      } else {
        throw new Error(`Framework ${data.frameworkId} not found`);
      }
    }

    const team = await prisma.team.create({
      data: {
        name: data.name,
        description: data.description || null,
        frameworkId: data.frameworkId,
        collaborationMode: data.collaborationMode || 'sequential',
        engineStrategy: data.engineStrategy || 'mixed',
        status: 'active',
        taskStats: JSON.stringify({ total: 0, completed: 0, failed: 0 }),
        sharedKnowledgeBaseIds: '[]',
        sharedToolIds: '[]',
      },
    });

    // 创建角色
    if (data.roles && data.roles.length > 0) {
      for (const roleData of data.roles) {
        await prisma.role.create({
          data: {
            name: roleData.name,
            roleType: roleData.roleType,
            teamId: team.id,
            primaryEngine: roleData.primaryEngine || 'zhipu-glm-4',
            engineTier: 'professional',
            temperature: 0.7,
            maxTokens: 4096,
            authorizedTools: JSON.stringify(roleData.authorizedTools || []),
            knowledgeBaseIds: '[]',
            systemPrompt: roleData.systemPrompt || null,
            roleConfig: '{}',
            status: 'active',
          },
        });
      }
    }

    const result = await this.getById(team.id);
    this.emit('team:created', result);
    return result!;
  }

  async list(): Promise<Team[]> {
    const teams = await prisma.team.findMany({
      orderBy: { createdAt: 'desc' },
      include: { framework: true, roles: true },
    });
    return teams.map((t: any) => ({
      ...toTeam(t),
      framework: t.framework ? { id: t.framework.id, brand: t.framework.brand, name: t.framework.name } : undefined,
      roles: t.roles.map(toRole),
    }));
  }

  async getById(id: string): Promise<Team | undefined> {
    const team = await prisma.team.findUnique({
      where: { id },
      include: { framework: true, roles: true },
    });
    if (!team) return undefined;
    return {
      ...toTeam(team),
      framework: team.framework ? { id: team.framework.id, brand: team.framework.brand, name: team.framework.name } : undefined,
      roles: team.roles.map(toRole),
    };
  }

  async update(id: string, data: Partial<Team>): Promise<Team | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.collaborationMode !== undefined) updateData.collaborationMode = data.collaborationMode;
    if (data.engineStrategy !== undefined) updateData.engineStrategy = data.engineStrategy;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.sharedKnowledgeBaseIds !== undefined) updateData.sharedKnowledgeBaseIds = JSON.stringify(data.sharedKnowledgeBaseIds);
    if (data.sharedToolIds !== undefined) updateData.sharedToolIds = JSON.stringify(data.sharedToolIds);
    if (data.taskStats !== undefined) updateData.taskStats = JSON.stringify(data.taskStats);

    try {
      await prisma.team.update({ where: { id }, data: updateData });
      const result = await this.getById(id);
      this.emit('team:updated', result);
      return result;
    } catch {
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.team.delete({ where: { id } });
      this.emit('team:deleted', { id });
      return true;
    } catch {
      return false;
    }
  }

  async execute(id: string, task?: string): Promise<Team | undefined> {
    const team = await this.getById(id);
    if (!team) return undefined;
    
    // 更新状态为 active
    await this.update(id, { status: 'active' });
    
    // 触发执行事件
    this.emit('team:execute', { teamId: id, task, timestamp: new Date() });
    
    // 模拟协作流事件
    for (const role of team.roles) {
      this.emit('collaboration:progress', {
        teamId: id,
        roleId: role.id,
        roleName: role.name,
        status: 'running',
        message: `${role.name} 开始执行任务`,
        timestamp: new Date(),
      });
    }
    
    return this.getById(id);
  }

  async pause(id: string): Promise<Team | undefined> {
    const result = await this.update(id, { status: 'paused' });
    this.emit('team:pause', { teamId: id, timestamp: new Date() });
    return result;
  }

  async resume(id: string): Promise<Team | undefined> {
    const result = await this.update(id, { status: 'active' });
    this.emit('team:resume', { teamId: id, timestamp: new Date() });
    return result;
  }

  async getStatus(id: string): Promise<any> {
    const team = await this.getById(id);
    if (!team) return undefined;
    return {
      teamId: id,
      status: team.status,
      collaborationMode: team.collaborationMode,
      roleCount: team.roles.length,
      roles: team.roles.map(r => ({
        id: r.id,
        name: r.name,
        roleType: r.roleType,
        status: r.status,
        engine: r.primaryEngine,
      })),
      taskStats: team.taskStats,
      timestamp: new Date().toISOString(),
    };
  }

  async getCollaborationStream(id: string): Promise<any[]> {
    // 返回模拟的协作流事件（实际应从事件总线获取）
    const team = await this.getById(id);
    if (!team) return [];
    
    return team.roles.map((role, index) => ({
      id: `event-${id}-${role.id}`,
      type: 'role_start',
      roleId: role.id,
      roleName: role.name,
      message: `${role.name} 已加入协作`,
      timestamp: new Date(Date.now() - (team.roles.length - index) * 1000).toISOString(),
    }));
  }

  async intervene(id: string, action: string, data?: any): Promise<any> {
    const team = await this.getById(id);
    if (!team) return { success: false, error: 'Team not found' };
    
    this.emit('team:intervene', { teamId: id, action, data, timestamp: new Date() });
    
    return {
      success: true,
      teamId: id,
      action,
      message: `已执行干预: ${action}`,
      timestamp: new Date().toISOString(),
    };
  }
}

let teamService: TeamService | null = null;
export function getTeamService(): TeamService {
  if (!teamService) teamService = new TeamService();
  return teamService;
}
