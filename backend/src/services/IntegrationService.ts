import { EventEmitter } from 'events';
import type { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// ===== 变更点: 扩展 Integration 接口，添加协议分层字段 =====
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
  // 协议分层字段
  protocolLevel: number;
  threading: string;
  protocol: string;
  providerId: string;
}

// 平台定义（来自 providers.json）
interface ProviderDef {
  id: string;
  name: string;
  category: string;
  baseUrl: string;
  defaultModel: string;
  apiKeySource: string;
  models: string[];
  protocolLevel: number;
  protocol: string;
  threading: string;
}

interface ProvidersJson {
  version: string;
  description: string;
  providers: ProviderDef[];
}

/**
 * 加载 providers.json，用于 create() 时自动填充协议信息
 */
function loadProvidersJson(): ProviderDef[] {
  try {
    // 优先尝试构建后的路径
    const distPath = path.resolve(__dirname, '../../config/providers.json');
    const srcPath = path.resolve(__dirname, '../config/providers.json');
    const jsonPath = fs.existsSync(distPath) ? distPath : srcPath;
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(raw) as ProvidersJson;
    return data.providers || [];
  } catch {
    return [];
  }
}

const PROVIDERS = loadProvidersJson();

export class IntegrationService extends EventEmitter {
  private integrations = new Map<string, Integration>();

  constructor(private prisma?: PrismaClient) {
    super();
  }

  // ===== 变更点: create() 时根据 providerId 从 providers.json 自动填充协议信息 =====
  async create(data: Omit<Integration, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Integration> {
    // 如果传入了 providerId，从 providers.json 自动填充协议字段
    let enriched = { ...data };
    if (data.providerId) {
      const provider = PROVIDERS.find(p => p.id === data.providerId);
      if (provider) {
        enriched.protocolLevel = provider.protocolLevel ?? data.protocolLevel ?? 1;
        enriched.threading = provider.threading ?? data.threading ?? 'single';
        enriched.protocol = provider.protocol ?? data.protocol ?? 'single-thread';
        // 同时把 baseUrl 和默认模型合并进 config
        const cfg = typeof data.config === 'object' && data.config !== null ? data.config : {};
        enriched.config = {
          ...cfg,
          baseUrl: (cfg as any)?.baseUrl || provider.baseUrl,
          defaultModel: (cfg as any)?.defaultModel || provider.defaultModel,
          models: (cfg as any)?.models || provider.models,
        };
      }
    }

    if (this.prisma) {
      const raw = await this.prisma.integration.create({
        data: {
          id: crypto.randomUUID(),
          name: enriched.name,
          type: enriched.type,
          config: JSON.stringify(enriched.config || {}),
          enabled: enriched.enabled,
          status: 'disconnected',
          protocolLevel: enriched.protocolLevel,
          threading: enriched.threading,
          protocol: enriched.protocol,
          providerId: enriched.providerId,
        },
      });
      const integration: Integration = {
        ...raw,
        config: JSON.parse(raw.config || '{}'),
        status: raw.status as any,
        protocolLevel: raw.protocolLevel,
        threading: raw.threading,
        protocol: raw.protocol,
        providerId: raw.providerId,
      };
      this.emit('integration:created', integration);
      return integration;
    }
    const integration: Integration = {
      ...enriched,
      id: crypto.randomUUID(),
      status: 'disconnected',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.integrations.set(integration.id, integration);
    this.emit('integration:created', integration);
    return integration;
  }

  async getById(id: string): Promise<Integration | undefined> {
    if (this.prisma) {
      const raw = await this.prisma.integration.findUnique({ where: { id } });
      return raw ? this._rawToIntegration(raw) : undefined;
    }
    return this.integrations.get(id);
  }

  // ===== 变更点: list() 支持按 protocolLevel 过滤 =====
  async list(filters?: { protocolLevel?: number; threading?: string; protocol?: string }): Promise<Integration[]> {
    const where: any = {};
    if (filters?.protocolLevel !== undefined) where.protocolLevel = filters.protocolLevel;
    if (filters?.threading) where.threading = filters.threading;
    if (filters?.protocol) where.protocol = filters.protocol;

    if (this.prisma) {
      const raws = await this.prisma.integration.findMany({ where, orderBy: { createdAt: 'desc' } });
      return raws.map(r => this._rawToIntegration(r));
    }
    let list = Array.from(this.integrations.values());
    if (filters?.protocolLevel !== undefined) list = list.filter(i => i.protocolLevel === filters.protocolLevel);
    if (filters?.threading) list = list.filter(i => i.threading === filters.threading);
    if (filters?.protocol) list = list.filter(i => i.protocol === filters.protocol);
    return list;
  }

  async update(id: string, data: Partial<Integration>): Promise<Integration | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (data.name) updateData.name = data.name;
    if (data.type) updateData.type = data.type;
    if (data.config) updateData.config = JSON.stringify(data.config);
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.status) updateData.status = data.status;
    if (data.protocolLevel !== undefined) updateData.protocolLevel = data.protocolLevel;
    if (data.threading) updateData.threading = data.threading;
    if (data.protocol) updateData.protocol = data.protocol;
    if (data.providerId !== undefined) updateData.providerId = data.providerId;

    if (this.prisma) {
      try {
        const raw = await this.prisma.integration.update({ where: { id }, data: updateData });
        return this._rawToIntegration(raw);
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

  // ===== 变更点: validateConnection() 添加平台连接规则验证 =====
  // L1 不能连 L1（同级别直接连接无意义）
  // L2 只能连 L1（编排层需要底层 LLM）
  // L3 可以连 L1/L2/L0（网关层可以聚合所有）
  // L0 不能作为 Agent 创建的目标平台
  validateConnection(sourceLevel: number, targetLevel: number): { valid: boolean; reason?: string } {
    // L0 基础设施不能作为上层连接目标
    if (targetLevel === 0 && sourceLevel > 0) {
      return { valid: false, reason: 'L0 基础设施平台不能直接作为 Agent 运行的目标平台' };
    }
    // L1 不能连 L1（同层无编排意义）
    if (sourceLevel === 1 && targetLevel === 1) {
      return { valid: false, reason: 'L1 单线程 LLM 之间不能直接连接，请通过 L2 编排层组合' };
    }
    // L2 只能连 L1（编排层需要具体 LLM 作为执行单元）
    if (sourceLevel === 2 && targetLevel !== 1) {
      return { valid: false, reason: 'L2 多线程编排层只能连接 L1 单线程 LLM 作为执行后端' };
    }
    // L3 可以连 L1/L2/L0
    if (sourceLevel === 3) {
      return { valid: true };
    }
    return { valid: true };
  }

  async testConnection(id: string): Promise<{ success: boolean; error?: string }> {
    const integration = await this.getById(id);
    if (!integration) return { success: false, error: 'Integration not found' };
    const success = Math.random() > 0.2;
    const status = success ? 'connected' : 'error';
    await this.update(id, { status, lastTestedAt: new Date() });
    return { success, error: success ? undefined : 'Connection refused (mock)' };
  }

  // ===== 变更点: 新增 getAvailablePlatformsForAgent(mode, level) =====
  // mode: 'single' | 'multi' | 'gateway'
  // 返回适合该创建模式的已配置集成列表
  async getAvailablePlatformsForAgent(mode: string): Promise<{ platforms: Integration[]; message: string }> {
    if (mode === 'single') {
      const platforms = await this.list({ protocolLevel: 1 });
      return {
        platforms,
        message: platforms.length === 0 ? '尚未配置 L1 单线程 LLM 平台，请前往平台管理添加 API 配置' : '',
      };
    }
    if (mode === 'multi') {
      const l2 = await this.list({ protocolLevel: 2 });
      const l1 = await this.list({ protocolLevel: 1 });
      return {
        platforms: [...l2, ...l1],
        message: l2.length === 0 ? '尚未配置 L2 多线程编排框架，请前往平台管理添加' : l1.length === 0 ? '尚未配置 L1 单线程 LLM 后端，请前往平台管理添加' : '',
      };
    }
    if (mode === 'gateway') {
      const l3 = await this.list({ protocolLevel: 3 });
      const l1 = await this.list({ protocolLevel: 1 });
      return {
        platforms: [...l3, ...l1],
        message: l3.length === 0 ? '尚未配置 L3 网关聚合平台，请前往平台管理添加' : l1.length === 0 ? '尚未配置 L1 单线程 LLM 后端，请前往平台管理添加' : '',
      };
    }
    return { platforms: await this.list(), message: '未知创建模式' };
  }

  getTypes(): string[] {
    return ['slack', 'discord', 'github', 'notion', 'webhook', 'email', 'sms'];
  }

  // 辅助：Prisma raw → Integration
  private _rawToIntegration(raw: any): Integration {
    return {
      ...raw,
      config: JSON.parse(raw.config || '{}'),
      status: raw.status as any,
      protocolLevel: raw.protocolLevel,
      threading: raw.threading,
      protocol: raw.protocol,
      providerId: raw.providerId,
    };
  }
}
