import { EventEmitter } from 'events';
import type { PrismaClient } from '@prisma/client';

export interface Integration {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error';
  lastTestedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class IntegrationService extends EventEmitter {
  private integrations = new Map<string, Integration>();

  constructor(private prisma?: PrismaClient) {
    super();
  }

  async create(data: Omit<Integration, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Integration> {
    if (this.prisma) {
      const raw = await this.prisma.integration.create({
        data: {
          id: crypto.randomUUID(),
          name: data.name,
          type: data.type,
          config: JSON.stringify(data.config || {}),
          enabled: data.enabled,
          status: 'disconnected',
        },
      });
      const integration: Integration = { ...raw, config: JSON.parse(raw.config || '{}'), status: raw.status as any };
      this.emit('integration:created', integration);
      return integration;
    }
    const integration: Integration = { ...data, id: crypto.randomUUID(), status: 'disconnected', createdAt: new Date(), updatedAt: new Date() };
    this.integrations.set(integration.id, integration);
    this.emit('integration:created', integration);
    return integration;
  }

  async getById(id: string): Promise<Integration | undefined> {
    if (this.prisma) {
      const raw = await this.prisma.integration.findUnique({ where: { id } });
      return raw ? { ...raw, config: JSON.parse(raw.config || '{}'), status: raw.status as any } : undefined;
    }
    return this.integrations.get(id);
  }

  async list(): Promise<Integration[]> {
    if (this.prisma) {
      const raws = await this.prisma.integration.findMany({ orderBy: { createdAt: 'desc' } });
      return raws.map(r => ({ ...r, config: JSON.parse(r.config || '{}'), status: r.status as any }));
    }
    return Array.from(this.integrations.values());
  }

  async update(id: string, data: Partial<Integration>): Promise<Integration | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (data.name) updateData.name = data.name;
    if (data.type) updateData.type = data.type;
    if (data.config) updateData.config = JSON.stringify(data.config);
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.status) updateData.status = data.status;

    if (this.prisma) {
      try {
        const raw = await this.prisma.integration.update({ where: { id }, data: updateData });
        return { ...raw, config: JSON.parse(raw.config || '{}'), status: raw.status as any };
      } catch {
        return undefined;
      }
    }
    const integration = this.integrations.get(id);
    if (!integration) return undefined;
    Object.assign(integration, data, { updatedAt: new Date() });
    return integration;
  }

  async delete(id: string): Promise<boolean> {
    if (this.prisma) {
      try {
        await this.prisma.integration.delete({ where: { id } });
        return true;
      } catch {
        return false;
      }
    }
    return this.integrations.delete(id);
  }

  async testConnection(id: string): Promise<{ success: boolean; error?: string }> {
    const integration = await this.getById(id);
    if (!integration) return { success: false, error: 'Integration not found' };
    
    // 执行真实连接测试
    const config = integration.config || {};
    const endpoint = (config.endpoint || config.webhookUrl || config.url) as string;
    
    if (!endpoint) {
      await this.update(id, { status: 'error', lastTestedAt: new Date() });
      return { success: false, error: '未配置 endpoint' };
    }
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(endpoint, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeout);
      const success = res.ok || res.status < 500;
      await this.update(id, { status: success ? 'connected' : 'error', lastTestedAt: new Date() });
      return { success, error: success ? undefined : `HTTP ${res.status}` };
    } catch (err: any) {
      await this.update(id, { status: 'error', lastTestedAt: new Date() });
      return { success: false, error: err.message || 'Connection failed' };
    }
  }

  getTypes(): string[] {
    return ['slack', 'discord', 'github', 'notion', 'webhook', 'email', 'sms'];
  }
}
