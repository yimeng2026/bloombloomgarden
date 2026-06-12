import { Router } from 'express';
import prisma from '../config/prisma';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// 内置10个模板（内存回退用）
const BUILTIN_TEMPLATES = [
  {
    id: 'tpl-coding',
    name: '编程助手',
    description: '擅长代码编写、调试和技术问题解答',
    agentType: 'coding',
    capabilities: JSON.stringify(['coding', 'debug', 'review']),
    personality: '严谨、高效、注重代码质量',
    systemPrompt: 'You are a coding assistant. Help users write, debug, and optimize code. Provide clear explanations and best practices.',
    recommendedPlatform: 'zhipu',
    recommendedModel: 'glm-5.1',
    tags: JSON.stringify(['code', 'development', 'tech']),
    color: '#3B82F6',
    icon: 'code',
    config: JSON.stringify({}),
    isBuiltin: true,
    category: 'coding',
  },
  {
    id: 'tpl-writing',
    name: '写作助手',
    description: '擅长文章撰写、润色和创意写作',
    agentType: 'writing',
    capabilities: JSON.stringify(['writing', 'editing', 'creative']),
    personality: '富有创意、善于表达、关注细节',
    systemPrompt: 'You are a writing assistant. Help users craft compelling content, refine their writing, and generate creative ideas.',
    recommendedPlatform: 'zhipu',
    recommendedModel: 'glm-5.1',
    tags: JSON.stringify(['writing', 'content', 'creative']),
    color: '#10B981',
    icon: 'pen',
    config: JSON.stringify({}),
    isBuiltin: true,
    category: 'writing',
  },
  {
    id: 'tpl-analysis',
    name: '数据分析',
    description: '擅长数据分析、可视化和洞察提取',
    agentType: 'analysis',
    capabilities: JSON.stringify(['analysis', 'visualization', 'statistics']),
    personality: '理性、逻辑严密、善于发现规律',
    systemPrompt: 'You are a data analysis assistant. Help users analyze data, create visualizations, and extract actionable insights.',
    recommendedPlatform: 'zhipu',
    recommendedModel: 'glm-5.1',
    tags: JSON.stringify(['data', 'analytics', 'business']),
    color: '#F59E0B',
    icon: 'bar-chart',
    config: JSON.stringify({}),
    isBuiltin: true,
    category: 'analysis',
  },
  {
    id: 'tpl-creative',
    name: '创意设计师',
    description: '擅长创意设计、头脑风暴和艺术指导',
    agentType: 'creative',
    capabilities: JSON.stringify(['design', 'brainstorm', 'creative']),
    personality: '天马行空、审美敏锐、灵感丰富',
    systemPrompt: 'You are a creative design assistant. Help users brainstorm ideas, develop concepts, and provide artistic direction.',
    recommendedPlatform: 'zhipu',
    recommendedModel: 'glm-5.1',
    tags: JSON.stringify(['design', 'creative', 'art']),
    color: '#8B5CF6',
    icon: 'palette',
    config: JSON.stringify({}),
    isBuiltin: true,
    category: 'creative',
  },
  {
    id: 'tpl-research',
    name: '研究员',
    description: '擅长文献检索、研究报告和知识整理',
    agentType: 'research',
    capabilities: JSON.stringify(['research', 'summarize', 'organize']),
    personality: '严谨、博学、善于归纳',
    systemPrompt: 'You are a research assistant. Help users find relevant literature, compile research reports, and organize knowledge systematically.',
    recommendedPlatform: 'zhipu',
    recommendedModel: 'glm-5.1',
    tags: JSON.stringify(['research', 'academic', 'knowledge']),
    color: '#6366F1',
    icon: 'search',
    config: JSON.stringify({}),
    isBuiltin: true,
    category: 'research',
  },
  {
    id: 'tpl-business',
    name: '商业顾问',
    description: '擅长商业分析、战略规划和决策支持',
    agentType: 'business',
    capabilities: JSON.stringify(['strategy', 'analysis', 'planning']),
    personality: '洞察力强、战略思维、结果导向',
    systemPrompt: 'You are a business consultant. Help users analyze business scenarios, develop strategies, and support decision-making.',
    recommendedPlatform: 'zhipu',
    recommendedModel: 'glm-5.1',
    tags: JSON.stringify(['business', 'strategy', 'consulting']),
    color: '#EC4899',
    icon: 'briefcase',
    config: JSON.stringify({}),
    isBuiltin: true,
    category: 'business',
  },
  {
    id: 'tpl-reviewer',
    name: '代码审查员',
    description: '擅长代码审查、质量评估和最佳实践建议',
    agentType: 'reviewer',
    capabilities: JSON.stringify(['review', 'security', 'quality']),
    personality: '严格、细致、追求代码质量',
    systemPrompt: 'You are a code reviewer. Evaluate code quality, identify bugs and security issues, and suggest improvements based on best practices.',
    recommendedPlatform: 'zhipu',
    recommendedModel: 'glm-5.1',
    tags: JSON.stringify(['review', 'code-quality', 'security']),
    color: '#EF4444',
    icon: 'shield',
    config: JSON.stringify({}),
    isBuiltin: true,
    category: 'coding',
  },
  {
    id: 'tpl-architect',
    name: '架构师',
    description: '擅长系统架构设计、技术选型和方案评估',
    agentType: 'architect',
    capabilities: JSON.stringify(['architecture', 'design', 'evaluation']),
    personality: '全局视野、技术深度、权衡取舍',
    systemPrompt: 'You are a software architect. Help users design system architectures, evaluate technology choices, and create scalable solutions.',
    recommendedPlatform: 'zhipu',
    recommendedModel: 'glm-5.1',
    tags: JSON.stringify(['architecture', 'system-design', 'scalability']),
    color: '#06B6D4',
    icon: 'layout',
    config: JSON.stringify({}),
    isBuiltin: true,
    category: 'coding',
  },
  {
    id: 'tpl-qa',
    name: '测试工程师',
    description: '擅长测试用例设计、自动化测试和缺陷分析',
    agentType: 'qa',
    capabilities: JSON.stringify(['testing', 'automation', 'analysis']),
    personality: '细致、严谨、追求质量',
    systemPrompt: 'You are a QA engineer. Help users design test cases, plan automation strategies, and analyze defects for software quality assurance.',
    recommendedPlatform: 'zhipu',
    recommendedModel: 'glm-5.1',
    tags: JSON.stringify(['testing', 'qa', 'automation']),
    color: '#84CC16',
    icon: 'check-circle',
    config: JSON.stringify({}),
    isBuiltin: true,
    category: 'coding',
  },
  {
    id: 'tpl-devops',
    name: 'DevOps工程师',
    description: '擅长CI/CD、容器化和基础设施管理',
    agentType: 'devops',
    capabilities: JSON.stringify(['devops', 'ci-cd', 'infrastructure']),
    personality: '高效、自动化思维、运维敏感',
    systemPrompt: 'You are a DevOps engineer. Help users with CI/CD pipelines, containerization, infrastructure as code, and cloud operations.',
    recommendedPlatform: 'zhipu',
    recommendedModel: 'glm-5.1',
    tags: JSON.stringify(['devops', 'cloud', 'automation']),
    color: '#14B8A6',
    icon: 'server',
    config: JSON.stringify({}),
    isBuiltin: true,
    category: 'coding',
  },
];

// 1. GET /api/agent-templates — 列表（支持按 category 和 agentType 过滤）
router.get('/', asyncHandler(async (req, res) => {
  const { category, agentType } = req.query;

  if (prisma) {
    const where: any = {};
    if (category) where.category = category as string;
    if (agentType) where.agentType = agentType as string;
    const templates = await prisma.agentTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: templates, total: templates.length });
    return;
  }

  // 内存回退
  let templates = [...BUILTIN_TEMPLATES];
  if (category) templates = templates.filter(t => t.category === category);
  if (agentType) templates = templates.filter(t => t.agentType === agentType);
  res.json({ success: true, data: templates, total: templates.length });
}));

// 2. GET /api/agent-templates/:id — 详情
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (prisma) {
    const template = await prisma.agentTemplate.findUnique({ where: { id } });
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, data: template });
    return;
  }

  const template = BUILTIN_TEMPLATES.find(t => t.id === id);
  if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
  res.json({ success: true, data: template });
}));

// 3. POST /api/agent-templates — 创建（仅管理员，简单校验）
router.post('/', asyncHandler(async (req, res) => {
  const {
    name, description, agentType, capabilities, personality,
    systemPrompt, recommendedPlatform, recommendedModel,
    tags, color, icon, config, category,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Template name is required' });
  }
  if (!agentType || !agentType.trim()) {
    return res.status(400).json({ success: false, error: 'agentType is required' });
  }

  const templateData = {
    id: crypto.randomUUID(),
    name: name.trim(),
    description: description || null,
    agentType: agentType.trim(),
    capabilities: JSON.stringify(capabilities || []),
    personality: personality || null,
    systemPrompt: systemPrompt || null,
    recommendedPlatform: recommendedPlatform || null,
    recommendedModel: recommendedModel || null,
    tags: JSON.stringify(tags || []),
    color: color || null,
    icon: icon || null,
    config: JSON.stringify(config || {}),
    isBuiltin: false,
    category: category || 'general',
  };

  if (prisma) {
    const template = await prisma.agentTemplate.create({ data: templateData });
    res.status(201).json({ success: true, data: template });
    return;
  }

  BUILTIN_TEMPLATES.push(templateData as any);
  res.status(201).json({ success: true, data: templateData });
}));

export default router;
