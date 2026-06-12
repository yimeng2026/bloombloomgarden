import { Router } from 'express';
import { AgentService, AgentStatus, VALID_AGENT_TYPES } from '../services/AgentService';
import { getAgentService, getDialogService } from '../services';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';
import prisma from '../config/prisma';

const router = Router();

// ─── 根据 protocolLevel 推导 dashboardType ───────────────
function getDashboardType(level: number): string {
  const map: Record<number, string> = { 0: 'L0', 1: 'L1', 2: 'L2', 3: 'L3' };
  return map[level] || 'L1';
}

// 1. GET /api/agents — 列表（支持按 agentType 过滤）
router.get('/', asyncHandler(async (req, res) => {
  const { groupId, status, role, agentType } = req.query;
  const service = getAgentService();
  const agents = await service.list({
    groupId: groupId as string | undefined,
    status: status as AgentStatus | undefined,
    role: role as string | undefined,
    agentType: agentType as string | undefined,
  });
  res.json({ success: true, data: agents, total: agents.length });
}));

// 1b. GET /api/agents/stats — Agent统计
router.get('/stats', asyncHandler(async (_req, res) => {
  const service = getAgentService();
  const stats = await service.getStats();
  res.json({ success: true, data: stats });
}));

// 1c. GET /api/agents/templates — 返回内置Agent模板列表
router.get('/templates', asyncHandler(async (req, res) => {
  const { category, agentType } = req.query;
  if (prisma) {
    const where: any = { isBuiltin: true };
    if (category) where.category = category as string;
    if (agentType) where.agentType = agentType as string;
    const templates = await prisma.agentTemplate.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: templates, total: templates.length });
    return;
  }
  // 内存回退：硬编码10个模板
  const builtinTemplates = [
    { id: 'tpl-coding', name: '编程助手', agentType: 'coding', description: '擅长代码编写、调试和技术问题解答', recommendedPlatform: 'zhipu', recommendedModel: 'glm-5.1', systemPrompt: 'You are a coding assistant. Help users write, debug, and optimize code. Provide clear explanations and best practices.', category: 'coding', capabilities: ['coding', 'debug', 'review'], color: '#3B82F6', icon: 'code', isBuiltin: true },
    { id: 'tpl-writing', name: '写作助手', agentType: 'writing', description: '擅长文章撰写、润色和创意写作', recommendedPlatform: 'zhipu', recommendedModel: 'glm-5.1', systemPrompt: 'You are a writing assistant. Help users craft compelling content, refine their writing, and generate creative ideas.', category: 'writing', capabilities: ['writing', 'editing', 'creative'], color: '#10B981', icon: 'pen', isBuiltin: true },
    { id: 'tpl-analysis', name: '数据分析', agentType: 'analysis', description: '擅长数据分析、可视化和洞察提取', recommendedPlatform: 'zhipu', recommendedModel: 'glm-5.1', systemPrompt: 'You are a data analysis assistant. Help users analyze data, create visualizations, and extract actionable insights.', category: 'analysis', capabilities: ['analysis', 'visualization', 'statistics'], color: '#F59E0B', icon: 'bar-chart', isBuiltin: true },
    { id: 'tpl-creative', name: '创意设计师', agentType: 'creative', description: '擅长创意设计、头脑风暴和艺术指导', recommendedPlatform: 'zhipu', recommendedModel: 'glm-5.1', systemPrompt: 'You are a creative design assistant. Help users brainstorm ideas, develop concepts, and provide artistic direction.', category: 'creative', capabilities: ['design', 'brainstorm', 'creative'], color: '#8B5CF6', icon: 'palette', isBuiltin: true },
    { id: 'tpl-research', name: '研究员', agentType: 'research', description: '擅长文献检索、研究报告和知识整理', recommendedPlatform: 'zhipu', recommendedModel: 'glm-5.1', systemPrompt: 'You are a research assistant. Help users find relevant literature, compile research reports, and organize knowledge systematically.', category: 'research', capabilities: ['research', 'summarize', 'organize'], color: '#6366F1', icon: 'search', isBuiltin: true },
    { id: 'tpl-business', name: '商业顾问', agentType: 'business', description: '擅长商业分析、战略规划和决策支持', recommendedPlatform: 'zhipu', recommendedModel: 'glm-5.1', systemPrompt: 'You are a business consultant. Help users analyze business scenarios, develop strategies, and support decision-making.', category: 'business', capabilities: ['strategy', 'analysis', 'planning'], color: '#EC4899', icon: 'briefcase', isBuiltin: true },
    { id: 'tpl-reviewer', name: '代码审查员', agentType: 'reviewer', description: '擅长代码审查、质量评估和最佳实践建议', recommendedPlatform: 'zhipu', recommendedModel: 'glm-5.1', systemPrompt: 'You are a code reviewer. Evaluate code quality, identify bugs and security issues, and suggest improvements based on best practices.', category: 'coding', capabilities: ['review', 'security', 'quality'], color: '#EF4444', icon: 'shield', isBuiltin: true },
    { id: 'tpl-architect', name: '架构师', agentType: 'architect', description: '擅长系统架构设计、技术选型和方案评估', recommendedPlatform: 'zhipu', recommendedModel: 'glm-5.1', systemPrompt: 'You are a software architect. Help users design system architectures, evaluate technology choices, and create scalable solutions.', category: 'coding', capabilities: ['architecture', 'design', 'evaluation'], color: '#06B6D4', icon: 'layout', isBuiltin: true },
    { id: 'tpl-qa', name: '测试工程师', agentType: 'qa', description: '擅长测试用例设计、自动化测试和缺陷分析', recommendedPlatform: 'zhipu', recommendedModel: 'glm-5.1', systemPrompt: 'You are a QA engineer. Help users design test cases, plan automation strategies, and analyze defects for software quality assurance.', category: 'coding', capabilities: ['testing', 'automation', 'analysis'], color: '#84CC16', icon: 'check-circle', isBuiltin: true },
    { id: 'tpl-devops', name: 'DevOps工程师', agentType: 'devops', description: '擅长CI/CD、容器化和基础设施管理', recommendedPlatform: 'zhipu', recommendedModel: 'glm-5.1', systemPrompt: 'You are a DevOps engineer. Help users with CI/CD pipelines, containerization, infrastructure as code, and cloud operations.', category: 'coding', capabilities: ['devops', 'ci-cd', 'infrastructure'], color: '#14B8A6', icon: 'server', isBuiltin: true },
  ];
  let templates = builtinTemplates;
  if (category) templates = templates.filter(t => t.category === category);
  if (agentType) templates = templates.filter(t => t.agentType === agentType);
  res.json({ success: true, data: templates, total: templates.length });
}));

// 1d. GET /api/agents/by-protocol/:level — 按协议层级查询
router.get('/by-protocol/:level', asyncHandler(async (req, res) => {
  const level = parseInt(req.params.level, 10);
  if (isNaN(level) || level < 0 || level > 3) {
    return res.status(400).json({ success: false, error: 'Protocol level must be 0, 1, 2, or 3' });
  }

  const service = getAgentService();
  const all = await service.list();
  const agents = all.filter((a: any) => (a.protocolLevel ?? 1) === level);
  res.json({ success: true, data: agents, total: agents.length });
}));

// 2. GET /api/agents/:id — 详情
router.get('/:id', asyncHandler(async (req, res) => {
  const service = getAgentService();
  const agent = await service.getById(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
}));

// 2b. POST /api/agents/:id/chat — 【已移除】请使用 /api/dialog/:agentId/chat
router.post('/:id/chat', asyncHandler(async (req, res) => {
  res.status(410).json({
    success: false,
    error: '此端点已移除',
    message: 'Agent 对话已统一迁移到 /api/dialog/:agentId/chat',
    alternative: `/api/dialog/${req.params.id}/chat`,
    docs: '/api/dialog',
  });
}));

// 2a. GET /api/agents/:id/context — 上下文详情（真实数据）
router.get('/:id/context', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const agentService = getAgentService();
  const agent = await agentService.getById(id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

  const dialogService = getDialogService();
  const messages = await dialogService.getHistory(id);

  const context = {
    agentId: agent.id,
    agentName: agent.name,
    role: agent.role || 'unknown',
    systemPrompt: agent.systemPrompt || (agent.config ? (typeof agent.config === 'string' ? JSON.parse(agent.config || '{}').systemPrompt : agent.config.systemPrompt) : null) || '暂无系统提示配置',
    messages: messages.slice(-20).map((m: any) => ({
      role: m.role,
      content: m.content,
      timestamp: m.createdAt || new Date().toISOString(),
    })),
    toolCalls: [],
    knowledgeRefs: [],
    tokenUsage: { used: messages.length * 100, limit: 8192 },
  };
  res.json({ success: true, data: context });
}));

// 2b. GET /api/agents/:id/context/stream — SSE 实时推送
router.get('/:id/context/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  let isClosed = false;
  const interval = setInterval(async () => {
    if (isClosed) return;
    try {
      const agentService = getAgentService();
      const agent = await agentService.getById(req.params.id);
      const dialogService = getDialogService();
      const messages = await dialogService.getHistory(req.params.id);
      const used = messages.length * 100;
      if (!isClosed) {
        res.write(`data: ${JSON.stringify({
          type: 'heartbeat', timestamp: new Date().toISOString(),
          agentStatus: agent?.status || 'unknown',
          tokenUsage: { used, limit: 8192 },
        })}

`);
      }
    } catch (e) {
      if (!isClosed) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'heartbeat failed' })}

`);
      }
    }
  }, 5000);
  req.on('close', () => { isClosed = true; clearInterval(interval); });
});

// 3. POST /api/agents — 创建（支持新字段）
router.post('/', asyncHandler(async (req, res) => {
  const {
    name, role, config, llmConfig, knowledgeBaseIds, skillIds, workspaceId,
    groupId, description, avatar,
    protocolLevel, mode, parentPlatform, threadPlatforms,
    dashboardType, workFiles,
    platformId, apiKeyId,
    swarmEnabled, swarmMode, roleInGroup, coordinatorId,
    // Agent Type System 新字段
    agentType, capabilities, personality, systemPrompt, tags, color, icon, stats,
  } = req.body;

  // 路由层只做空值校验
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Agent name is required' });
  }
  if (!role || !role.trim()) {
    return res.status(400).json({ success: false, error: 'Agent role is required' });
  }

  // 合并 llmConfig 到 config
  const mergedConfig: Record<string, unknown> = (config as any) || {};
  if (llmConfig && typeof llmConfig === 'object') {
    mergedConfig.llmConfig = llmConfig;
  }

  // 一次性传给 Service（包含全部字段）
  const service = getAgentService();
  try {
    const agent = await service.create({
      name: name.trim(),
      role: role.trim(),
      config: mergedConfig,
      knowledgeBaseIds,
      skillIds,
      workspaceId,
      groupId,
      description,
      avatar,
      protocolLevel,
      mode,
      parentPlatform,
      threadPlatforms,
      dashboardType,
      workFiles,
      platformId,
      apiKeyId,
      swarmEnabled,
      swarmMode,
      roleInGroup,
      coordinatorId,
      // Agent Type System
      agentType,
      capabilities,
      personality,
      systemPrompt,
      tags,
      color,
      icon,
      stats,
    });
    res.status(201).json({ success: true, data: agent });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
}));

// 4. PUT /api/agents/:id — 更新（支持新字段）
router.put('/:id', asyncHandler(async (req, res) => {
  const service = getAgentService();

  // 提取需要 JSON 序列化的字段
  const updatePayload: any = { ...req.body };

  // 如果传了 llmConfig，合并到 config
  if (req.body.llmConfig && typeof req.body.llmConfig === 'object') {
    const current = await service.getById(req.params.id);
    const currentConfig = (current?.config as any) || {};
    updatePayload.config = { ...currentConfig, llmConfig: req.body.llmConfig };
    delete updatePayload.llmConfig;
  }

  // 数组字段保持数组（Service.update 内部会 JSON.stringify）
  const agent = await service.update(req.params.id, updatePayload);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
}));

// 5. DELETE /api/agents/:id — 删除
router.delete('/:id', asyncHandler(async (req, res) => {
  const service = getAgentService();
  const ok = await service.delete(req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.status(204).send();
}));

// 6. POST /api/agents/:id/pause — 暂停
router.post('/:id/pause', asyncHandler(async (req, res) => {
  const service = getAgentService();
  const agent = await service.pause(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
}));

// 7. POST /api/agents/:id/resume — 恢复
router.post('/:id/resume', asyncHandler(async (req, res) => {
  const service = getAgentService();
  const agent = await service.resume(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
}));

// 8. POST /api/agents/:id/isolate — 隔离
router.post('/:id/isolate', asyncHandler(async (req, res) => {
  const service = getAgentService();
  const agent = await service.isolate(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
}));

// 9. POST /api/agents/:id/inject — 消息注入
router.post('/:id/inject', asyncHandler(async (req, res) => {
  const { message } = req.body;
  const service = getAgentService();
  await service.injectMessage(req.params.id, message);
  res.json({ success: true, data: { injected: true } });
}));

export default router;
