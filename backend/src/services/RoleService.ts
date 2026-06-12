import { EventEmitter } from 'events';
import { prisma } from './PrismaService';

export interface Role {
  id: string;
  name: string;
  roleType: string;
  teamId: string;
  // Platform & API Binding
  platformId?: string;
  apiKeyId?: string;
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

function toRole(raw: any): Role {
  return {
    ...raw,
    authorizedTools: JSON.parse(raw.authorizedTools || '[]'),
    knowledgeBaseIds: JSON.parse(raw.knowledgeBaseIds || '[]'),
    roleConfig: JSON.parse(raw.roleConfig || '{}'),
    platformId: raw.platformId || undefined,
    apiKeyId: raw.apiKeyId || undefined,
  };
}

export interface CreateRoleInput {
  name: string;
  roleType: string;
  primaryEngine?: string;
  secondaryEngine?: string;
  engineTier?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  authorizedTools?: string[];
  knowledgeBaseIds?: string[];
  roleConfig?: Record<string, unknown>;
  // Platform & API Binding
  platformId?: string;
  apiKeyId?: string;
}

export class RoleService extends EventEmitter {
  async create(teamId: string, data: CreateRoleInput): Promise<Role> {
    const role = await prisma.role.create({
      data: {
        name: data.name,
        roleType: data.roleType,
        teamId,
        platformId: data.platformId || null,
        apiKeyId: data.apiKeyId || null,
        primaryEngine: data.primaryEngine || 'zhipu-glm-4',
        secondaryEngine: data.secondaryEngine || null,
        engineTier: data.engineTier || 'professional',
        temperature: data.temperature ?? 0.7,
        maxTokens: data.maxTokens ?? 4096,
        authorizedTools: JSON.stringify(data.authorizedTools || []),
        knowledgeBaseIds: JSON.stringify(data.knowledgeBaseIds || []),
        systemPrompt: data.systemPrompt || null,
        roleConfig: JSON.stringify(data.roleConfig || {}),
        status: 'active',
      },
    });
    const result = toRole(role);
    this.emit('role:created', result);
    return result;
  }

  async listByTeam(teamId: string): Promise<Role[]> {
    const roles = await prisma.role.findMany({
      where: { teamId },
      orderBy: { createdAt: 'asc' },
    });
    return roles.map(toRole);
  }

  async getById(id: string): Promise<Role | undefined> {
    const role = await prisma.role.findUnique({ where: { id } });
    return role ? toRole(role) : undefined;
  }

  async update(id: string, data: Partial<Role>): Promise<Role | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.roleType !== undefined) updateData.roleType = data.roleType;
    if (data.primaryEngine !== undefined) updateData.primaryEngine = data.primaryEngine;
    if (data.secondaryEngine !== undefined) updateData.secondaryEngine = data.secondaryEngine;
    if (data.engineTier !== undefined) updateData.engineTier = data.engineTier;
    if (data.temperature !== undefined) updateData.temperature = data.temperature;
    if (data.maxTokens !== undefined) updateData.maxTokens = data.maxTokens;
    if (data.systemPrompt !== undefined) updateData.systemPrompt = data.systemPrompt;
    if (data.authorizedTools !== undefined) updateData.authorizedTools = JSON.stringify(data.authorizedTools);
    if (data.knowledgeBaseIds !== undefined) updateData.knowledgeBaseIds = JSON.stringify(data.knowledgeBaseIds);
    if (data.roleConfig !== undefined) updateData.roleConfig = JSON.stringify(data.roleConfig);
    if (data.status !== undefined) updateData.status = data.status;

    try {
      const role = await prisma.role.update({ where: { id }, data: updateData });
      const result = toRole(role);
      this.emit('role:updated', result);
      return result;
    } catch {
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.role.delete({ where: { id } });
      this.emit('role:deleted', { id });
      return true;
    } catch {
      return false;
    }
  }

  async execute(id: string, task: string): Promise<any> {
    const role = await this.getById(id);
    if (!role) return { success: false, error: 'Role not found' };

    this.emit('role:execute', { roleId: id, task, timestamp: new Date() });

    // 返回模拟执行结果
    return {
      success: true,
      roleId: id,
      roleName: role.name,
      task,
      result: `${role.name} 已完成任务: ${task.slice(0, 50)}...`,
      engine: role.primaryEngine,
      timestamp: new Date().toISOString(),
    };
  }

  async chat(id: string, message: string): Promise<any> {
    const role = await this.getById(id);
    if (!role) return { success: false, error: 'Role not found' };

    this.emit('role:chat', { roleId: id, message, timestamp: new Date() });

    // 返回模拟对话响应
    return {
      success: true,
      roleId: id,
      roleName: role.name,
      message,
      response: `我是 ${role.name}，收到你的消息: ${message.slice(0, 50)}...`,
      engine: role.primaryEngine,
      timestamp: new Date().toISOString(),
    };
  }
}

let roleService: RoleService | null = null;
export function getRoleService(): RoleService {
  if (!roleService) roleService = new RoleService();
  return roleService;
}
