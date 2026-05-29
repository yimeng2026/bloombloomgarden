/**
 * 千界花园 - 轻量Mock后端服务器
 * 用于前端独立联调和演示，无需真实后端和数据库
 * 用法: node tests/javascript/mock_backend.js [--port 3000]
 */
const http = require('http');
const url = require('url');

const PORT = parseInt(process.argv.find(a => !isNaN(a) && a.length < 6)) || 3000;

// 共享状态（内存中）
const state = {
  agents: [
    { id: 'agent-1', name: '产品经理-Alpha', role: 'pm', status: 'idle', model: 'kimi-code', createdAt: new Date().toISOString() },
    { id: 'agent-2', name: '架构师-Beta', role: 'architect', status: 'busy', model: 'deepseek', createdAt: new Date().toISOString() },
    { id: 'agent-3', name: '开发-Gamma', role: 'developer', status: 'idle', model: 'qwen', createdAt: new Date().toISOString() },
    { id: 'agent-4', name: '测试-Delta', role: 'tester', status: 'offline', model: 'moonshot', createdAt: new Date().toISOString() },
  ],
  dialogs: [
    { id: 'dlg-1', title: '产品需求讨论', participants: ['user', 'agent-1'], updatedAt: new Date().toISOString(), messageCount: 12 },
    { id: 'dlg-2', title: '架构评审', participants: ['user', 'agent-2', 'agent-3'], updatedAt: new Date().toISOString(), messageCount: 8 },
  ],
  knowledgeBases: [
    { id: 'kb-1', name: '产品文档库', description: 'PRD、用户故事、竞品分析', documentCount: 42, updatedAt: new Date().toISOString() },
    { id: 'kb-2', name: '技术规范', description: 'API规范、架构文档、部署手册', documentCount: 28, updatedAt: new Date().toISOString() },
  ],
  uploads: [
    { id: 'up-1', name: '需求文档v2.pdf', type: 'pdf', size: 2048000, status: 'indexed', knowledgeBaseId: 'kb-1', uploadedAt: new Date().toISOString() },
    { id: 'up-2', name: 'API设计.md', type: 'markdown', size: 45000, status: 'processing', knowledgeBaseId: 'kb-2', uploadedAt: new Date().toISOString() },
    { id: 'up-3', name: '架构图.png', type: 'image', size: 890000, status: 'indexed', knowledgeBaseId: 'kb-2', uploadedAt: new Date().toISOString() },
  ],
  groups: [
    { id: 'grp-1', name: '产品研发组', agents: ['agent-1', 'agent-2', 'agent-3'], mode: 'sequential', status: 'active' },
    { id: 'grp-2', name: '测试攻坚组', agents: ['agent-4'], mode: 'parallel', status: 'idle' },
  ],
  blueprints: [
    { id: 'bp-1', name: '需求分析流水线', steps: [{ agentId: 'agent-1', action: 'analyze' }, { agentId: 'agent-2', action: 'design' }], status: 'active', createdAt: new Date().toISOString() },
  ],
  tasks: [
    { id: 'task-1', name: '索引PDF文档', type: 'indexing', status: 'running', progress: 65, createdAt: new Date().toISOString() },
    { id: 'task-2', name: '生成测试用例', type: 'generation', status: 'pending', progress: 0, createdAt: new Date().toISOString() },
    { id: 'task-3', name: '数据备份', type: 'backup', status: 'completed', progress: 100, createdAt: new Date().toISOString() },
  ],
  apiKeys: [
    { id: 'key-1', provider: 'kimi-code', label: 'Kimi生产环境', maskedKey: 'sk-kimi-****Xqfs', isActive: true, lastTested: new Date().toISOString(), status: 'ok' },
    { id: 'key-2', provider: 'deepseek', label: 'DeepSeek测试', maskedKey: 'sk-ds-****2abc', isActive: true, lastTested: new Date().toISOString(), status: 'ok' },
    { id: 'key-3', provider: 'openai', label: 'OpenAI备用', maskedKey: 'sk-open-****xyz', isActive: false, lastTested: null, status: 'untested' },
  ],
  spend: {
    today: 1.23, month: 28.56, total: 156.80,
    byProvider: [
      { provider: 'kimi-code', cost: 12.34, tokens: 456000 },
      { provider: 'deepseek', cost: 8.90, tokens: 320000 },
      { provider: 'moonshot', cost: 4.56, tokens: 180000 },
    ]
  },
  events: [
    { id: 'evt-1', level: 'info', message: 'Agent agent-1 完成需求分析', source: 'agent-1', acknowledged: false, createdAt: new Date().toISOString() },
    { id: 'evt-2', level: 'warn', message: 'Agent agent-4 连接断开', source: 'monitor', acknowledged: false, createdAt: new Date().toISOString() },
    { id: 'evt-3', level: 'error', message: 'API Key key-3 测试失败: 401 Unauthorized', source: 'apikey-service', acknowledged: true, createdAt: new Date().toISOString() },
  ],
  processes: [
    { pid: 1234, name: 'backend-node', cpu: 4.5, memory: 128000, status: 'running', uptime: 3600 },
    { pid: 1235, name: 'kimi-worker-1', cpu: 12.3, memory: 256000, status: 'running', uptime: 1800 },
    { pid: 1236, name: 'redis-server', cpu: 0.8, memory: 32000, status: 'running', uptime: 7200 },
  ],
  backups: [
    { id: 'bak-1', name: '每日备份-2025-05-28', size: 45000000, createdAt: '2025-05-28T02:00:00Z', status: 'completed' },
    { id: 'bak-2', name: '每日备份-2025-05-29', size: 46000000, createdAt: '2025-05-29T02:00:00Z', status: 'completed' },
  ],
  metrics: {
    cpu: 23.5, memory: 45.2, disk: 62.1,
    requestRate: 42, avgLatency: 120, errorRate: 0.5,
    activeConnections: 8,
    llmCallsPerMinute: 12,
  },
  kimiCluster: {
    status: 'healthy',
    endpoints: [
      { id: 'ep-1', url: 'https://api.moonshot.cn/v1', model: 'kimi-code', weight: 50, healthy: true, lastChecked: new Date().toISOString() },
      { id: 'ep-2', url: 'https://api.moonshot.cn/v1', model: 'kimi-k2', weight: 30, healthy: true, lastChecked: new Date().toISOString() },
      { id: 'ep-3', url: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-128k', weight: 20, healthy: false, lastChecked: new Date().toISOString() },
    ],
    patterns: {
      peakHours: ['09:00-12:00', '14:00-18:00'],
      avgResponseTime: 850,
      failoverCount: 2,
    }
  },
  axisNodes: [
    { id: 'node-fe', type: 'frontend', platform: 'react', axis: 'x', index: 0, status: 'online' },
    { id: 'node-be', type: 'backend', platform: 'express', axis: 'y', index: 0, status: 'online' },
    { id: 'node-llm', type: 'tool', platform: 'kimi-code', axis: 'z', index: 0, status: 'online' },
  ],
  auditLogs: [
    { id: 'log-1', action: 'AGENT_CREATE', actor: 'user', target: 'agent-1', ip: '127.0.0.1', timestamp: new Date().toISOString() },
    { id: 'log-2', action: 'APIKEY_ADD', actor: 'user', target: 'key-1', ip: '127.0.0.1', timestamp: new Date().toISOString() },
    { id: 'log-3', action: 'AGENT_INTERVENTION', actor: 'admin', target: 'agent-2', ip: '192.168.1.10', timestamp: new Date().toISOString() },
  ]
};

function json(res, data, code = 200) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function ok(res, data) { json(res, { code: 0, data }); }

const handlers = {
  'GET /api/health': () => ({ status: 'ok', version: '0.9.0', uptime: process.uptime() }),
  'GET /api/version': () => ({ version: '0.9.0', build: 'mock-20250529' }),

  'GET /api/agents': () => state.agents,
  'GET /api/agents/templates': () => [
    { id: 'pm', name: '产品经理', description: '负责需求分析和产品规划', systemPrompt: '你是一位资深产品经理...' },
    { id: 'architect', name: '架构师', description: '负责系统架构设计', systemPrompt: '你是一位系统架构师...' },
    { id: 'developer', name: '开发工程师', description: '负责代码实现', systemPrompt: '你是一位全栈开发工程师...' },
    { id: 'tester', name: '测试工程师', description: '负责质量保证', systemPrompt: '你是一位测试专家...' },
    { id: 'security', name: '安全专家', description: '负责安全审计', systemPrompt: '你是一位网络安全专家...' },
    { id: 'data', name: '数据分析师', description: '负责数据分析', systemPrompt: '你是一位数据分析师...' },
    { id: 'writer', name: '技术写手', description: '负责文档撰写', systemPrompt: '你是一位技术文档专家...' },
  ],
  'GET /api/agents/:id/context': (id) => ({
    agentId: id,
    systemPrompt: state.agents.find(a => a.id === id)?.role === 'pm' ? '你是一位资深产品经理...' : 'Default prompt...',
    history: [
      { role: 'user', content: '请分析这个需求', timestamp: new Date().toISOString() },
      { role: 'assistant', content: '经过分析，我认为这个需求的核心是...', timestamp: new Date().toISOString() },
    ],
    toolCalls: [],
    knowledgeRefs: ['kb-1'],
    tokenUsage: { prompt: 120, completion: 340, total: 460 },
  }),

  'GET /api/dialogs': () => state.dialogs,
  'GET /api/dialogs/sessions': () => [{ id: 'sess-1', dialogId: 'dlg-1', status: 'active' }],

  'GET /api/knowledge/bases': () => state.knowledgeBases,
  'GET /api/knowledge/search': (query) => ({
    query: query?.query || 'hello',
    results: [
      { id: 'doc-1', title: '产品需求文档', content: '这是一个关于...', score: 0.95, source: 'kb-1' },
      { id: 'doc-2', title: 'API设计规范', content: 'RESTful API应该...', score: 0.87, source: 'kb-2' },
    ],
  }),
  'GET /api/uploads': () => state.uploads,

  'GET /api/groups': () => state.groups,
  'GET /api/blueprints': () => state.blueprints,
  'GET /api/tasks': () => state.tasks,

  'GET /api/system/metrics': () => state.metrics,
  'GET /api/system/processes': () => state.processes,
  'GET /api/events': () => state.events,
  'GET /api/spend/summary': () => state.spend,

  'GET /api/external/integrations': () => [
    { id: 'ext-1', name: 'GitHub', type: 'vcs', status: 'connected', lastSync: new Date().toISOString() },
    { id: 'ext-2', name: 'Jira', type: 'project', status: 'disconnected', lastSync: null },
  ],
  'GET /api/registry/nodes': () => state.axisNodes,

  'GET /api/kimi-cluster/status': () => state.kimiCluster,
  'GET /api/kimi-cluster/patterns': () => state.kimiCluster.patterns,

  'GET /api/apikeys': () => state.apiKeys,
  'GET /api/apikeys/providers': () => [
    { id: 'kimi-code', name: 'Kimi Code', requiresKey: true, hasFreeTier: false },
    { id: 'moonshot', name: 'Moonshot', requiresKey: true, hasFreeTier: false },
    { id: 'deepseek', name: 'DeepSeek', requiresKey: true, hasFreeTier: true },
    { id: 'openai', name: 'OpenAI', requiresKey: true, hasFreeTier: false },
    { id: 'anthropic', name: 'Anthropic', requiresKey: true, hasFreeTier: false },
    { id: 'qwen', name: 'Qwen', requiresKey: true, hasFreeTier: true },
    { id: 'gemini', name: 'Gemini', requiresKey: true, hasFreeTier: true },
    { id: 'glm', name: 'ChatGLM', requiresKey: true, hasFreeTier: true },
    { id: 'openrouter', name: 'OpenRouter', requiresKey: true, hasFreeTier: false },
    { id: 'azure-openai', name: 'Azure OpenAI', requiresKey: true, hasFreeTier: false },
  ],

  'GET /api/security/audit-logs': () => state.auditLogs,

  'GET /api/axis/nodes': () => state.axisNodes,
  'GET /api/axis/routes': () => [
    { from: 'node-fe', to: 'node-be', protocol: 'REST', latency: 12 },
    { from: 'node-be', to: 'node-llm', protocol: 'REST', latency: 850 },
  ],
  'POST /api/axis/message': () => ({ accepted: true, traceId: 'mock-' + Date.now() }),

  'GET /api/backups': () => state.backups,
};

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const key = `${req.method} ${parsed.pathname}`;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' });
    res.end();
    return;
  }

  let handler = handlers[key];
  let params = parsed.query;

  // 简单路径参数匹配
  if (!handler) {
    const dynamicKeys = Object.keys(handlers).filter(k => k.includes('/:'));
    for (const dk of dynamicKeys) {
      const pattern = dk.replace(/:\w+/g, '([^/]+)');
      const regex = new RegExp(`^${req.method} ${pattern}$`);
      const match = key.match(regex);
      if (match) {
        handler = handlers[dk];
        break;
      }
    }
  }

  if (handler) {
    try {
      const result = handler(params);
      ok(res, result);
    } catch (e) {
      json(res, { code: 500, error: e.message }, 500);
    }
  } else {
    json(res, { code: 404, error: `未找到: ${key}` }, 404);
  }
});

server.listen(PORT, () => {
  console.log(`🌸 千界花园 Mock后端已启动: http://localhost:${PORT}`);
  console.log(`   支持端点: ${Object.keys(handlers).length} 个`);
  console.log(`   内存数据: agents=${state.agents.length}, kbs=${state.knowledgeBases.length}, dialogs=${state.dialogs.length}`);
  console.log(`   按 Ctrl+C 停止`);
});
