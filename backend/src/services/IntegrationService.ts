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
<<<<<<< HEAD

  // 协议分层增强
  protocolLevel?: number;
  threading?: string;
  protocol?: string;
  providerId?: string;
=======
>>>>>>> a83b659b1c1718f3a046b4befb9265461b588393
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
<<<<<<< HEAD
          protocolLevel: (data as any).protocolLevel ?? 1,
          threading: (data as any).threading ?? 'single',
          protocol: (data as any).protocol ?? 'single-thread',
          providerId: (data as any).providerId ?? '',
=======
>>>>>>> a83b659b1c1718f3a046b4befb9265461b588393
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

<<<<<<< HEAD
  async getByProtocolLevel(level: number): Promise<Integration[]> {
    if (this.prisma) {
      const raws = await this.prisma.integration.findMany({ where: { protocolLevel: level }, orderBy: { createdAt: 'desc' } });
      return raws.map(r => ({ ...r, config: JSON.parse(r.config || '{}'), status: r.status as any }));
    }
    return Array.from(this.integrations.values()).filter(i => (i.protocolLevel ?? 1) === level);
  }

  async update(id: string, data: Partial<Integration>): Promise<Integration | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.config !== undefined) updateData.config = JSON.stringify(data.config);
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.protocolLevel !== undefined) updateData.protocolLevel = data.protocolLevel;
    if (data.threading !== undefined) updateData.threading = data.threading;
    if (data.protocol !== undefined) updateData.protocol = data.protocol;
    if (data.providerId !== undefined) updateData.providerId = data.providerId;
=======
  async update(id: string, data: Partial<Integration>): Promise<Integration | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (data.name) updateData.name = data.name;
    if (data.type) updateData.type = data.type;
    if (data.config) updateData.config = JSON.stringify(data.config);
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.status) updateData.status = data.status;
>>>>>>> a83b659b1c1718f3a046b4befb9265461b588393

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
    const success = Math.random() > 0.2;
    const status = success ? 'connected' : 'error';
    await this.update(id, { status, lastTestedAt: new Date() });
    return { success, error: success ? undefined : 'Connection refused (mock)' };
  }

  getTypes(): string[] {
<<<<<<< HEAD
    return ['slack', 'discord', 'github', 'notion', 'webhook', 'email', 'sms', 'openai', 'claude', 'deepseek', 'kimi', 'kimi-code', 'openrouter', 'ollama', 'openclaw', 'auto', 'claude-code', 'cursor', 'windsurf', 'zhipu', 'baichuan', 'minimax', 'hunyuan', 'doubao', 'wenxin', 'spark', 'sensechat', 'kimi-moonshot', 'stepfun', 'groq', 'qwen', 'gemini', 'siliconflow', 'mistral', 'cohere', 'ai21', 'perplexity', 'fireworks', 'anyscale', 'azure', 'replicate', 'lepton', 'nvidia', 'predibase', 'cloudflare', 'poe', 'lambdalabs', 'sambanova', 'octoai', 'hyperbolic', 'arctic', 'vertex-gemini', 'bedrock', 'sagemaker', 'friendliai', 'tencentcloud', 'crewai', 'metagpt', 'chatdev', 'dspy', 'langgraph', 'autogen', 'novita', 'together', 'tabnine', 'sourcegraph-cody', 'codeium', 'devin', 'code-exec', 'filesystem', 'browser', 'sandbox', 'jupyter', 'lmstudio', 'vllm', 'localai', 'jan', 'gpt4all', 'textgenwebui', 'github-copilot', 'openai-codex'];
=======
    return ['slack', 'discord', 'github', 'notion', 'webhook', 'email', 'sms'];
>>>>>>> a83b659b1c1718f3a046b4befb9265461b588393
  }
}
