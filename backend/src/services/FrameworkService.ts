import { EventEmitter } from 'events';
import { prisma } from './PrismaService';

const providersConfig = require('../config/providers.json');

export interface Framework {
  id: string;
  brand: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  features: string[];
  presetRoles: Array<{ name: string; roleType: string; systemPrompt: string }>;
  defaultConfig: Record<string, unknown>;
  protocolLevel: number;
  protocol: string;
  threading: string;
  color: string;
  status: string;
}

export interface FrameworkTemplate {
  brand: string;
  name: string;
  roles: Array<{ name: string; roleType: string; systemPrompt: string }>;
  collaborationMode: string;
  description: string;
}

function toFramework(raw: any): Framework {
  return {
    ...raw,
    features: JSON.parse(raw.features || '[]'),
    presetRoles: JSON.parse(raw.presetRoles || '[]'),
    defaultConfig: JSON.parse(raw.defaultConfig || '{}'),
  };
}

export class FrameworkService extends EventEmitter {
  // 从 providers.json 加载 orchestrator 类别的框架
  private getFrameworksFromConfig(): Framework[] {
    const orchestrators = providersConfig.providers.filter(
      (p: any) => p.category === 'orchestrator' || p.category === 'gateway-proxy' || p.category === 'workflow-engine'
    );
    return orchestrators.map((p: any, index: number) => ({
      id: p.id,
      brand: p.id,
      name: p.name,
      tagline: this.getTagline(p.id),
      description: this.getDescription(p.id),
      category: p.category === 'orchestrator' ? 'core' : p.category === 'gateway-proxy' ? 'gateway' : 'workflow',
      features: this.getFeatures(p.id),
      presetRoles: this.getPresetRoles(p.id),
      defaultConfig: {},
      protocolLevel: p.protocolLevel || 2,
      protocol: p.protocol || 'multi-thread',
      threading: p.threading || 'multi',
      color: this.getColor(index),
      status: 'active',
    }));
  }

  private getTagline(brand: string): string {
    const taglines: Record<string, string> = {
      openclaw: '动态编排 · 角色互评 · 开源',
      autogen: '微软 · 对话循环 · 人机协作',
      crewai: 'SOP驱动 · 角色团队 · 自动协作',
      metagpt: '软件公司模拟 · 完整交付团队',
      langgraph: '图状态机 · 循环节点 · 条件分支',
      dify: '可视化编排 · 拖拽节点 · 知识库',
      flowise: '拖拽式LLM工作流 · 零代码',
      openswarm: '8专业Agent · 一键交付',
      hermes: '自改进 · 管道编排 · 知识积累',
      litellm: '100+提供商 · 统一接口',
      'llm-api-key-proxy': 'Key轮询 · 故障转移',
      airflow: '数据管道编排 · DAG执行',
      prefect: 'Python自动化 · AI驱动',
      n8n: '低代码自动化 · 400+集成',
    };
    return taglines[brand] || '多线程智能体协作框架';
  }

  private getDescription(brand: string): string {
    const descriptions: Record<string, string> = {
      openclaw: 'OpenClaw 是一个开源的多智能体动态编排框架，支持角色互评和自适应协作流程。',
      autogen: 'AutoGen 是微软推出的多智能体对话框架，支持灵活的对话编程和人机协作。',
      crewai: 'CrewAI 是一个角色驱动的多智能体协作框架，模拟人类团队结构实现自动协作。',
      metagpt: 'MetaGPT 将标准作业程序编码到多智能体协作中，模拟完整软件公司的工作流程。',
      langgraph: 'LangGraph 是 LangChain 的图扩展，支持构建有状态的多参与者应用。',
      litellm: 'LiteLLM 提供统一的 OpenAI 兼容接口，支持 100+ LLM 提供商的透明切换。',
    };
    return descriptions[brand] || `${brand} 是一个多线程智能体协作框架。`;
  }

  private getFeatures(brand: string): string[] {
    const features: Record<string, string[]> = {
      openclaw: ['动态编排', '角色互评', '开源', '自适应流程'],
      autogen: ['对话循环', '人机协作', '微软背书', '灵活编程'],
      crewai: ['SOP驱动', '角色团队', '自动协作', '流程控制'],
      metagpt: ['软件公司模拟', 'PM+架构师', '完整交付', 'SOP编码'],
      langgraph: ['图状态机', '循环节点', '条件分支', '状态持久化'],
      dify: ['可视化编排', '拖拽节点', '知识库', '工作流'],
      flowise: ['拖拽式', '零代码', 'LLM工作流', '快速原型'],
      litellm: ['100+提供商', '统一接口', 'Key管理', '成本追踪'],
    };
    return features[brand] || ['多线程协作', '角色管理', '任务编排'];
  }

  private getPresetRoles(brand: string): Array<{ name: string; roleType: string; systemPrompt: string }> {
    const presets: Record<string, Array<{ name: string; roleType: string; systemPrompt: string }>> = {
      openclaw: [
        { name: '协调者', roleType: 'custom', systemPrompt: '你是团队的协调者，负责任务分配和进度跟踪。' },
        { name: '执行者', roleType: 'engineer', systemPrompt: '你是团队的执行者，负责具体的代码实现。' },
        { name: '验证者', roleType: 'tester', systemPrompt: '你是团队的验证者，负责代码审查和测试。' },
      ],
      metagpt: [
        { name: '产品经理', roleType: 'product_manager', systemPrompt: '你是一名产品经理，负责需求分析和PRD编写。' },
        { name: '架构师', roleType: 'architect', systemPrompt: '你是一名系统架构师，负责系统设计和技术选型。' },
        { name: '工程师', roleType: 'engineer', systemPrompt: '你是一名全栈工程师，负责代码实现。' },
        { name: '测试员', roleType: 'tester', systemPrompt: '你是一名QA工程师，负责测试用例和Bug报告。' },
      ],
      crewai: [
        { name: '研究员', roleType: 'researcher', systemPrompt: '你是一名研究员，负责信息收集和分析。' },
        { name: '写手', roleType: 'writer', systemPrompt: '你是一名技术写手，负责文档编写。' },
        { name: '审核员', roleType: 'custom', systemPrompt: '你是一名审核员，负责质量检查和审查。' },
      ],
      autogen: [
        { name: '用户代理', roleType: 'custom', systemPrompt: '你代表用户需求，提出问题和验收标准。' },
        { name: '助手', roleType: 'engineer', systemPrompt: '你是AI助手，负责执行任务和提供解决方案。' },
        { name: '群聊管理', roleType: 'custom', systemPrompt: '你管理群聊流程，确保对话有序进行。' },
      ],
    };
    return presets[brand] || [
      { name: '架构师', roleType: 'architect', systemPrompt: '你是一名架构师，负责系统设计。' },
      { name: '工程师', roleType: 'engineer', systemPrompt: '你是一名工程师，负责实现。' },
    ];
  }

  private getColor(index: number): string {
    const colors = ['#00F0FF', '#B967FF', '#00E676', '#F9A825', '#FF006E', '#3b82f6', '#ec4899', '#10b981'];
    return colors[index % colors.length];
  }

  async list(): Promise<Framework[]> {
    const fromConfig = this.getFrameworksFromConfig();
    // 合并数据库中的框架（如果有自定义框架）
    const fromDb = await prisma.framework.findMany();
    const dbFrameworks = fromDb.map(toFramework);
    // 用数据库数据覆盖配置数据（如果存在）
    const merged = fromConfig.map(fw => {
      const dbFw = dbFrameworks.find(d => d.brand === fw.brand);
      return dbFw || fw;
    });
    // 添加数据库中有但配置中没有的框架
    const extra = dbFrameworks.filter(d => !fromConfig.find((c: any) => c.brand === d.brand));
    return [...merged, ...extra];
  }

  async getByBrand(brand: string): Promise<Framework | undefined> {
    const all = await this.list();
    return all.find(f => f.brand === brand);
  }

  async getTemplates(brand: string): Promise<FrameworkTemplate[]> {
    const fw = await this.getByBrand(brand);
    if (!fw) return [];
    return [{
      brand: fw.brand,
      name: `${fw.name} 标准团队`,
      roles: fw.presetRoles,
      collaborationMode: 'sequential',
      description: `使用 ${fw.name} 框架的标准协作团队`,
    }];
  }

  async getConfig(brand: string): Promise<Record<string, unknown>> {
    const fw = await this.getByBrand(brand);
    if (!fw) return {};
    const dbConfig = await prisma.platformConfig.findFirst({ where: { frameworkId: fw.id } });
    return {
      ...fw.defaultConfig,
      ...(dbConfig ? {
        baseUrl: dbConfig.baseUrl,
        apiKey: dbConfig.apiKey ? '***' : undefined,
        defaultModel: dbConfig.defaultModel,
        extraHeaders: JSON.parse(dbConfig.extraHeaders || '{}'),
        timeout: dbConfig.timeout,
        retries: dbConfig.retries,
        enabled: dbConfig.enabled,
      } : {}),
    };
  }

  async updateConfig(brand: string, config: Record<string, unknown>): Promise<void> {
    const fw = await this.getByBrand(brand);
    if (!fw) throw new Error(`Framework ${brand} not found`);
    await prisma.platformConfig.upsert({
      where: { id: `${fw.id}-config` },
      create: {
        id: `${fw.id}-config`,
        platformId: fw.id,
        frameworkId: fw.id,
        baseUrl: config.baseUrl as string || null,
        apiKey: config.apiKey as string || null,
        defaultModel: config.defaultModel as string || null,
        extraHeaders: JSON.stringify(config.extraHeaders || {}),
        timeout: config.timeout as number || null,
        retries: config.retries as number || 3,
        enabled: config.enabled !== undefined ? config.enabled as boolean : true,
      },
      update: {
        baseUrl: config.baseUrl as string || null,
        apiKey: config.apiKey as string || null,
        defaultModel: config.defaultModel as string || null,
        extraHeaders: JSON.stringify(config.extraHeaders || {}),
        timeout: config.timeout as number || null,
        retries: config.retries as number || 3,
        enabled: config.enabled !== undefined ? config.enabled as boolean : true,
      },
    });
  }

  async getAvailableEngines(brand: string): Promise<any[]> {
    const fw = await this.getByBrand(brand);
    if (!fw) return [];
    // 返回所有 cloud 和 local 类别的 provider 作为可用引擎
    const engines = providersConfig.providers.filter(
      (p: any) => p.category === 'cloud' || p.category === 'local' || p.category === 'local-engine'
    );
    return engines.map((e: any) => ({
      id: e.id,
      brand: e.id,
      model: e.defaultModel,
      displayName: e.name,
      tier: this.getEngineTier(e.id),
      status: 'available',
    }));
  }

  private getEngineTier(engineId: string): string {
    const flagship = ['openai', 'claude', 'gpt-4o', 'claude-3-opus'];
    if (flagship.some(f => engineId.includes(f))) return 'flagship';
    const standard = ['ollama', 'localai', 'lmstudio'];
    if (standard.some(s => engineId.includes(s))) return 'standard';
    return 'professional';
  }
}

// 单例
let frameworkService: FrameworkService | null = null;
export function getFrameworkService(): FrameworkService {
  if (!frameworkService) frameworkService = new FrameworkService();
  return frameworkService;
}
