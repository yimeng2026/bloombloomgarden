import { Router, Request, Response } from 'express';

const router = Router();

// ═══════════════════════════════════════════════════════════
//  Platform Detail APIs — 每个平台的专属仪表盘数据
// ═══════════════════════════════════════════════════════════

// GET /api/platform-details/:id — 获取平台详情仪表盘数据
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // 根据平台ID返回不同的仪表盘数据
  const dashboardData = generateDashboardData(id);
  res.json({ success: true, data: dashboardData });
});

// GET /api/platform-details/:id/test — 测试平台连接
router.post('/:id/test', async (req: Request, res: Response) => {
  const { id } = req.params;
  // 实际测试连接
  const result = await testPlatformConnection(id);
  res.json({ success: true, data: result });
});

function generateDashboardData(platformId: string) {
  const level = getPlatformLevel(platformId);
  
  switch (level) {
    case 0: return generateL0Dashboard(platformId);
    case 1: return generateL1Dashboard(platformId);
    case 2: return generateL2Dashboard(platformId);
    case 3: return generateL3Dashboard(platformId);
    default: return generateL1Dashboard(platformId);
  }
}

function getPlatformLevel(id: string): number {
  const l0 = ['cli', 'code-exec', 'filesystem', 'browser', 'sandbox', 'jupyter'];
  const l2 = ['autogen', 'crewai', 'openclaw', 'metagpt', 'chatdev', 'dspy', 'langgraph'];
  const l3 = ['openrouter', 'fireworks', 'anyscale', 'azure', 'vertex-gemini', 'bedrock', 'sagemaker'];
  if (l0.includes(id)) return 0;
  if (l2.includes(id)) return 2;
  if (l3.includes(id)) return 3;
  return 1;
}

// ═══════════════════════════════════════════════════════════
//  L0 基础设施仪表盘
// ═══════════════════════════════════════════════════════════
function generateL0Dashboard(id: string) {
  const configs: Record<string, any> = {
    'cli': {
      title: '命令行终端',
      subtitle: 'Bash / Zsh / PowerShell',
      icon: 'terminal',
      accentColor: '#5a7a9a',
      metrics: { processes: 12, activeSessions: 3, uptime: '14d 6h', lastCommand: 'ls -la /workspace' },
      recentCommands: [
        { cmd: 'npm run build', exitCode: 0, duration: '12.3s', time: '2分钟前' },
        { cmd: 'git push origin main', exitCode: 0, duration: '8.1s', time: '5分钟前' },
        { cmd: 'python3 train.py --epochs 10', exitCode: 0, duration: '4m 32s', time: '1小时前' },
        { cmd: 'docker compose up -d', exitCode: 0, duration: '23.5s', time: '3小时前' },
      ],
      envVars: { NODE_ENV: 'production', SHELL: '/bin/zsh', PATH: '/usr/local/bin:/usr/bin' },
    },
    'code-exec': {
      title: '代码执行器',
      subtitle: 'Python / Node / Rust / Go',
      icon: 'code',
      accentColor: '#7fb89f',
      metrics: { executions: 1247, successRate: '97.3%', avgLatency: '1.2s', languages: 4 },
      recentExecutions: [
        { lang: 'Python', code: 'print(sum(range(100)))', output: '4950', duration: '0.3s', time: '1分钟前' },
        { lang: 'Node', code: 'console.log(Buffer.from("hello").toString("base64"))', output: 'aGVsbG8=', duration: '0.1s', time: '3分钟前' },
        { lang: 'Python', code: 'import numpy as np; print(np.mean([1,2,3,4,5]))', output: '3.0', duration: '0.8s', time: '10分钟前' },
      ],
      runtimes: [
        { lang: 'Python', version: '3.12.4', status: 'active', packages: 247 },
        { lang: 'Node.js', version: '22.3.0', status: 'active', packages: 89 },
        { lang: 'Rust', version: '1.78.0', status: 'active', packages: 12 },
        { lang: 'Go', version: '1.22.4', status: 'active', packages: 34 },
      ],
    },
    'filesystem': {
      title: '文件系统',
      subtitle: '文件读写 / 目录管理 / 搜索',
      icon: 'folder',
      accentColor: '#c9a96e',
      metrics: { totalFiles: 12847, totalSize: '2.3 GB', readOps: 4521, writeOps: 892 },
      recentOps: [
        { op: 'READ', path: '/workspace/src/app.tsx', size: '12.4 KB', time: '30秒前' },
        { op: 'WRITE', path: '/workspace/dist/bundle.js', size: '234 KB', time: '2分钟前' },
        { op: 'SEARCH', path: '/workspace/**/*.ts', matches: 47, time: '5分钟前' },
        { op: 'DELETE', path: '/workspace/tmp/cache_*.json', count: 23, time: '1小时前' },
      ],
      storage: { used: '2.3 GB', total: '50 GB', percentage: 4.6 },
    },
    'browser': {
      title: '浏览器',
      subtitle: 'Chromium / Firefox / WebKit',
      icon: 'globe',
      accentColor: '#7fa3b0',
      metrics: { pagesVisited: 342, screenshots: 89, pdfsGenerated: 12, activeTabs: 3 },
      recentActions: [
        { action: 'NAVIGATE', url: 'https://github.com', status: 200, time: '1分钟前' },
        { action: 'SCREENSHOT', url: 'https://docs.python.org', format: 'PNG', time: '5分钟前' },
        { action: 'CLICK', selector: '#search-button', page: 'Google', time: '10分钟前' },
        { action: 'EXTRACT', url: 'https://news.ycombinator.com', items: 30, time: '30分钟前' },
      ],
      browsers: [
        { name: 'Chromium', version: '126.0', status: 'active', headless: true },
        { name: 'Firefox', version: '127.0', status: 'standby', headless: true },
      ],
    },
    'sandbox': {
      title: '沙箱环境',
      subtitle: 'Docker 容器 / 隔离执行',
      icon: 'box',
      accentColor: '#a78b9a',
      metrics: { containers: 5, running: 2, images: 12, cpuUsage: '23%' },
      containers: [
        { name: 'python-runner', image: 'python:3.12', status: 'running', cpu: '12%', memory: '256MB', uptime: '2h 30m' },
        { name: 'node-runner', image: 'node:22', status: 'running', cpu: '8%', memory: '128MB', uptime: '1h 15m' },
        { name: 'rust-runner', image: 'rust:1.78', status: 'stopped', cpu: '0%', memory: '0MB', uptime: '-' },
      ],
      security: { networkIsolated: true, readOnlyFS: false, resourceLimits: true },
    },
    'jupyter': {
      title: 'Jupyter Notebook',
      subtitle: 'Python3 / R / Julia Kernel',
      icon: 'book',
      accentColor: '#d4a373',
      metrics: { notebooks: 8, kernels: 3, cellsExecuted: 1247, variables: 156 },
      recentNotebooks: [
        { name: 'data_analysis.ipynb', kernel: 'Python 3', cells: 42, lastRun: '5分钟前' },
        { name: 'model_training.ipynb', kernel: 'Python 3', cells: 67, lastRun: '1小时前' },
        { name: 'visualization.ipynb', kernel: 'Python 3', cells: 23, lastRun: '3小时前' },
      ],
      kernels: [
        { name: 'Python 3', status: 'idle', connections: 2, lastActivity: '5分钟前' },
        { name: 'R', status: 'inactive', connections: 0, lastActivity: '2天前' },
      ],
    },
  };
  
  return configs[id] || configs['cli'];
}

// ═══════════════════════════════════════════════════════════
//  L1 大模型仪表盘
// ═══════════════════════════════════════════════════════════
function generateL1Dashboard(id: string) {
  const providerInfo: Record<string, any> = {
    'openai': { name: 'OpenAI', accentColor: '#10a37f', endpoint: 'https://api.openai.com/v1', docs: 'https://platform.openai.com/docs' },
    'claude': { name: 'Claude (Anthropic)', accentColor: '#d4a373', endpoint: 'https://api.anthropic.com', docs: 'https://docs.anthropic.com' },
    'deepseek': { name: 'DeepSeek', accentColor: '#4a90d9', endpoint: 'https://api.deepseek.com/v1', docs: 'https://platform.deepseek.com/docs' },
    'gemini': { name: 'Gemini (Google)', accentColor: '#4285f4', endpoint: 'https://generativelanguage.googleapis.com', docs: 'https://ai.google.dev/docs' },
    'grok': { name: 'Grok (xAI)', accentColor: '#1da1f2', endpoint: 'https://api.x.ai/v1', docs: 'https://docs.x.ai' },
    'qwen': { name: '通义千问 (阿里云)', accentColor: '#ff6a00', endpoint: 'https://dashscope.aliyuncs.com/v1', docs: 'https://help.aliyun.com/qwen' },
    'mistral': { name: 'Mistral AI', accentColor: '#f70000', endpoint: 'https://api.mistral.ai/v1', docs: 'https://docs.mistral.ai' },
    'kimi-code': { name: 'Kimi Code', accentColor: '#6c5ce7', endpoint: 'https://api.kimi.com/coding/v1', docs: 'https://platform.moonshot.cn/docs' },
    'ollama': { name: 'Ollama (本地)', accentColor: '#7fb89f', endpoint: 'http://localhost:11434', docs: 'https://ollama.com/library' },
    'zhipu': { name: '智谱 AI', accentColor: '#3b82f6', endpoint: 'https://open.bigmodel.cn/api/paas/v4', docs: 'https://open.bigmodel.cn/dev/api' },
    'groq': { name: 'Groq', accentColor: '#f55036', endpoint: 'https://api.groq.com/openai/v1', docs: 'https://console.groq.com/docs' },
    'cohere': { name: 'Cohere', accentColor: '#39594d', endpoint: 'https://api.cohere.ai/v1', docs: 'https://docs.cohere.com' },
  };
  
  const info = providerInfo[id] || { name: id, accentColor: '#7fa3b0', endpoint: '', docs: '' };
  
  return {
    ...info,
    level: 1,
    apiKeyConfigured: id === 'ollama' ? true : Math.random() > 0.5,
    apiKeySource: id === 'ollama' ? 'none' : 'env',
    status: Math.random() > 0.2 ? 'connected' : 'disconnected',
    latency: Math.floor(Math.random() * 300) + 50,
    models: generateModelsForProvider(id),
    usage: {
      requestsToday: Math.floor(Math.random() * 5000) + 100,
      tokensToday: Math.floor(Math.random() * 500000) + 10000,
      costToday: (Math.random() * 5 + 0.1).toFixed(2),
      successRate: (0.95 + Math.random() * 0.05).toFixed(3),
    },
    capabilities: getCapabilities(id),
    rateLimits: {
      rpm: id === 'groq' ? 30 : id === 'openai' ? 500 : 60,
      tpm: id === 'groq' ? 14400 : 200000,
    },
  };
}

function generateModelsForProvider(id: string) {
  const modelSets: Record<string, Array<{id: string; name: string; contextWindow: number; type: string; pricing: string}>> = {
    'openai': [
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, type: 'chat', pricing: '$5/1M input' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, type: 'chat', pricing: '$0.15/1M input' },
      { id: 'o1-pro', name: 'o1-pro', contextWindow: 200000, type: 'reasoning', pricing: '$150/1M input' },
      { id: 'o3-mini', name: 'o3-mini', contextWindow: 200000, type: 'reasoning', pricing: '$1.1/1M input' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000, type: 'chat', pricing: '$10/1M input' },
      { id: 'dall-e-3', name: 'DALL-E 3', contextWindow: 0, type: 'image', pricing: '$0.04/image' },
    ],
    'claude': [
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', contextWindow: 200000, type: 'chat', pricing: '$3/1M input' },
      { id: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku', contextWindow: 200000, type: 'chat', pricing: '$0.8/1M input' },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', contextWindow: 200000, type: 'chat', pricing: '$15/1M input' },
    ],
    'deepseek': [
      { id: 'deepseek-chat', name: 'DeepSeek-V3', contextWindow: 64000, type: 'chat', pricing: '$0.27/1M input' },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1', contextWindow: 64000, type: 'reasoning', pricing: '$0.55/1M input' },
    ],
    'gemini': [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextWindow: 1000000, type: 'chat', pricing: '$1.25/1M input' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 1000000, type: 'chat', pricing: '$0.15/1M input' },
    ],
    'qwen': [
      { id: 'qwen-max', name: '通义千问-Max', contextWindow: 32000, type: 'chat', pricing: '¥0.02/1K tokens' },
      { id: 'qwen-plus', name: '通义千问-Plus', contextWindow: 128000, type: 'chat', pricing: '¥0.004/1K tokens' },
      { id: 'qwen-turbo', name: '通义千问-Turbo', contextWindow: 1000000, type: 'chat', pricing: '¥0.0005/1K tokens' },
      { id: 'qwen3-235b-a22b', name: 'Qwen3 235B-A22B', contextWindow: 128000, type: 'chat', pricing: '¥0.006/1K tokens' },
    ],
    'ollama': [
      { id: 'qwen2.5:7b', name: 'Qwen2.5 7B', contextWindow: 32768, type: 'chat', pricing: 'Free (本地)' },
      { id: 'llama3.2:3b', name: 'Llama 3.2 3B', contextWindow: 128000, type: 'chat', pricing: 'Free (本地)' },
      { id: 'deepseek-r1:14b', name: 'DeepSeek R1 14B', contextWindow: 32768, type: 'reasoning', pricing: 'Free (本地)' },
    ],
    'groq': [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', contextWindow: 128000, type: 'chat', pricing: '$0.59/1M input' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', contextWindow: 32768, type: 'chat', pricing: '$0.24/1M input' },
    ],
    'kimi-code': [
      { id: 'kimi-for-coding', name: 'Kimi K2', contextWindow: 256000, type: 'chat', pricing: '¥0.012/1K tokens' },
      { id: 'moonshot-v1-128k', name: 'Moonshot V1 128K', contextWindow: 128000, type: 'chat', pricing: '¥0.012/1K tokens' },
    ],
  };
  return modelSets[id] || [{ id: 'default', name: 'Default Model', contextWindow: 4096, type: 'chat', pricing: 'N/A' }];
}

function getCapabilities(id: string): string[] {
  const caps: Record<string, string[]> = {
    'openai': ['chat', 'streaming', 'function_calling', 'vision', 'fine_tuning', 'embeddings'],
    'claude': ['chat', 'streaming', 'function_calling', 'vision', 'long_context'],
    'deepseek': ['chat', 'streaming', 'function_calling', 'reasoning'],
    'gemini': ['chat', 'streaming', 'function_calling', 'vision', 'long_context', 'grounding'],
    'qwen': ['chat', 'streaming', 'function_calling', 'vision', 'long_context'],
    'ollama': ['chat', 'streaming', 'local_inference', 'model_management'],
    'groq': ['chat', 'streaming', 'fast_inference'],
    'kimi-code': ['chat', 'streaming', 'long_context', 'code_generation'],
  };
  return caps[id] || ['chat', 'streaming'];
}

// ═══════════════════════════════════════════════════════════
//  L2 多线程编排仪表盘
// ═══════════════════════════════════════════════════════════
function generateL2Dashboard(id: string) {
  const configs: Record<string, any> = {
    'autogen': {
      name: 'AutoGen', accentColor: '#6c5ce7', icon: 'network',
      description: '微软多Agent对话框架，支持Agent间自动对话与协作',
      pattern: 'Conversation Pattern',
      agents: [
        { name: 'AssistantAgent', role: '助手', description: '使用LLM执行任务' },
        { name: 'UserProxyAgent', role: '用户代理', description: '执行代码、人工确认' },
        { name: 'GroupChatManager', role: '协调者', description: '管理群聊中的发言顺序' },
      ],
      workflows: [
        { name: 'Two-Agent Chat', agents: 2, steps: 5, description: '两个Agent交替对话' },
        { name: 'Group Chat', agents: 4, steps: 12, description: '多Agent群聊协作' },
        { name: 'Nested Chat', agents: 3, steps: 8, description: '嵌套对话解决复杂任务' },
      ],
      noApiKeyNeeded: true,
    },
    'crewai': {
      name: 'CrewAI', accentColor: '#e17055', icon: 'waypoints',
      description: '角色驱动的多Agent协作框架，定义Crew和Task',
      pattern: 'Role-Based Pattern',
      agents: [
        { name: 'Researcher', role: '研究员', description: '搜索和分析信息' },
        { name: 'Writer', role: '写作者', description: '撰写和编辑内容' },
        { name: 'Manager', role: '管理者', description: '分配任务和监督进度' },
      ],
      workflows: [
        { name: 'Sequential', agents: 3, steps: 6, description: '按顺序执行任务' },
        { name: 'Hierarchical', agents: 4, steps: 10, description: '管理者分配任务' },
        { name: 'Parallel', agents: 3, steps: 4, description: '并行执行独立任务' },
      ],
      noApiKeyNeeded: true,
    },
    'openclaw': {
      name: 'OpenClaw', accentColor: '#00b894', icon: 'layers',
      description: '开源多Agent协作框架，支持灵活的Agent拓扑',
      pattern: 'Topology Pattern',
      agents: [
        { name: 'Planner', role: '规划者', description: '分解任务为子任务' },
        { name: 'Executor', role: '执行者', description: '执行具体子任务' },
        { name: 'Reviewer', role: '审核者', description: '检查和验证结果' },
      ],
      workflows: [
        { name: 'Star', agents: 5, steps: 8, description: '中心节点协调' },
        { name: 'Mesh', agents: 4, steps: 12, description: '全连接对等协作' },
        { name: 'Pipeline', agents: 3, steps: 6, description: '流水线顺序处理' },
      ],
      noApiKeyNeeded: true,
    },
    'metagpt': {
      name: 'MetaGPT', accentColor: '#fdcb6e', icon: 'user-cog',
      description: '多Agent软件开发框架，模拟软件公司角色',
      pattern: 'SOP Pattern',
      agents: [
        { name: 'ProductManager', role: '产品经理', description: '需求分析和PRD' },
        { name: 'Architect', role: '架构师', description: '系统设计' },
        { name: 'Engineer', role: '工程师', description: '代码实现' },
        { name: 'QA', role: '测试', description: '质量保证' },
      ],
      workflows: [
        { name: 'Software Dev', agents: 4, steps: 15, description: '完整软件开发流程' },
        { name: 'Code Review', agents: 2, steps: 5, description: '代码审查流程' },
      ],
      noApiKeyNeeded: true,
    },
    'chatdev': {
      name: 'ChatDev', accentColor: '#74b9ff', icon: 'pencil',
      description: '通过对话进行软件开发的虚拟软件公司',
      pattern: 'Chat Chain Pattern',
      agents: [
        { name: 'CEO', role: 'CEO', description: '决策和方向' },
        { name: 'CTO', role: 'CTO', description: '技术方案' },
        { name: 'Programmer', role: '程序员', description: '编码实现' },
        { name: 'ArtDesigner', role: '设计师', description: 'UI/UX设计' },
      ],
      workflows: [
        { name: 'Full Development', agents: 4, steps: 20, description: '完整开发链' },
        { name: 'Iterative Refine', agents: 3, steps: 8, description: '迭代优化' },
      ],
      noApiKeyNeeded: true,
    },
    'dspy': {
      name: 'DSPy', accentColor: '#a29bfe', icon: 'thermometer',
      description: '声明式编程框架，自动优化Prompt和权重',
      pattern: 'Optimization Pattern',
      agents: [
        { name: 'Signature', role: '签名定义', description: '定义输入输出规范' },
        { name: 'Module', role: '模块', description: '组合和嵌套签名' },
        { name: 'Optimizer', role: '优化器', description: '自动调优参数' },
      ],
      workflows: [
        { name: 'Bootstrap Few-Shot', agents: 2, steps: 10, description: '自动生成示例' },
        { name: 'MIPRO', agents: 3, steps: 15, description: '多目标优化' },
      ],
      noApiKeyNeeded: true,
    },
    'langgraph': {
      name: 'LangGraph', accentColor: '#55efc4', icon: 'route',
      description: '基于图的有状态多Agent框架，支持循环和分支',
      pattern: 'Graph Pattern',
      agents: [
        { name: 'Node', role: '节点', description: '执行具体操作的Agent' },
        { name: 'Router', role: '路由', description: '条件分支决策' },
        { name: 'State', role: '状态', description: '共享状态管理' },
      ],
      workflows: [
        { name: 'ReAct Loop', agents: 2, steps: 8, description: '思考-行动循环' },
        { name: 'Map-Reduce', agents: 5, steps: 6, description: '并行处理聚合' },
        { name: 'Human-in-Loop', agents: 3, steps: 10, description: '人工介入决策' },
      ],
      noApiKeyNeeded: true,
    },
  };
  
  return configs[id] || configs['autogen'];
}

// ═══════════════════════════════════════════════════════════
//  L3 网关聚合仪表盘
// ═══════════════════════════════════════════════════════════
function generateL3Dashboard(id: string) {
  const configs: Record<string, any> = {
    'openrouter': {
      name: 'OpenRouter', accentColor: '#6c5ce7', icon: 'route',
      description: '统一API网关，200+模型一键切换',
      endpoint: 'https://openrouter.ai/api/v1',
      routing: {
        strategy: 'balanced',
        providers: ['openai', 'anthropic', 'google', 'deepseek', 'meta-llama'],
        fallbackChain: ['deepseek', 'openai', 'anthropic'],
      },
      loadBalancer: {
        activeConnections: 42,
        queuedRequests: 3,
        avgResponseTime: 234,
        errorRate: 0.002,
      },
      models: [
        { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek V3', provider: 'DeepSeek', pricing: '$0.27/1M' },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', pricing: '$3/1M' },
        { id: 'qwen/qwen3-235b-a22b', name: 'Qwen3 235B', provider: 'Alibaba', pricing: '$0.4/1M' },
        { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro', provider: 'Google', pricing: '$1.25/1M' },
        { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta', pricing: '$0.2/1M' },
      ],
      circuitBreakers: [
        { provider: 'grok', open: false, failures: 0 },
        { provider: 'perplexity', open: false, failures: 2 },
      ],
      costTracking: { today: '$2.34', thisWeek: '$18.72', thisMonth: '$67.45' },
    },
    'azure': {
      name: 'Azure OpenAI', accentColor: '#0078d4', icon: 'cloud',
      description: '微软Azure托管的OpenAI服务，企业级合规',
      endpoint: 'https://{resource}.openai.azure.com',
      deployments: [
        { name: 'gpt-4o-prod', model: 'gpt-4o', capacity: 30, status: 'active' },
        { name: 'gpt-4o-mini-dev', model: 'gpt-4o-mini', capacity: 60, status: 'active' },
      ],
      compliance: { dataResidency: 'East US', encryption: 'AES-256', rbac: true },
    },
    'fireworks': {
      name: 'Fireworks AI', accentColor: '#ff6b35', icon: 'zap',
      description: '高速推理平台，开源模型加速',
      endpoint: 'https://api.fireworks.ai/inference/v1',
      models: [
        { id: 'llama-v3p3-70b-instruct', name: 'Llama 3.3 70B', speed: '142 tok/s' },
        { id: 'qwen2p5-72b-instruct', name: 'Qwen2.5 72B', speed: '98 tok/s' },
      ],
    },
    'bedrock': {
      name: 'AWS Bedrock', accentColor: '#ff9900', icon: 'database',
      description: 'AWS全托管AI服务，多Provider模型',
      endpoint: 'https://bedrock-runtime.us-east-1.amazonaws.com',
      models: [
        { id: 'anthropic.claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
        { id: 'amazon.titan-text-premier', name: 'Titan Text Premier', provider: 'Amazon' },
      ],
    },
    'vertex-gemini': {
      name: 'Vertex AI (Gemini)', accentColor: '#4285f4', icon: 'star',
      description: 'Google Cloud AI平台，Gemini模型服务',
      endpoint: 'https://us-central1-aiplatform.googleapis.com',
      models: [
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', context: '1M tokens' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', context: '1M tokens' },
      ],
    },
  };
  
  return configs[id] || configs['openrouter'];
}

async function testPlatformConnection(id: string) {
  // 简单的连接测试
  return { success: true, latency: Math.floor(Math.random() * 200) + 50, status: 200 };
}

export default router;
