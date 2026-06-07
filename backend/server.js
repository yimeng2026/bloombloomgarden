/**
 * backend/server.js
 * 简化版后端服务 — 使用Node.js内置http模块，零依赖
 * 
 * 功能：
 * 1. 健康检查 /health
 * 2. 代理Kimi Code API（5 Key轮换）
 * 3. 代理Ollama API
 * 4. 代理OpenClaw API
 * 5. Agent/Group CRUD（内存存储）
 * 6. 蜂群协作执行
 * 7. Hermes记忆接口
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// 配置
// ═══════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3002;
const HOST = '0.0.0.0';

// Kimi Code API Keys（5个轮换）
const KIMI_CODE_KEYS = [
  'REMOVED_FROM_HISTORY',
  'REMOVED_FROM_HISTORY',
  'REMOVED_FROM_HISTORY',
  'REMOVED_FROM_HISTORY',
  'REMOVED_FROM_HISTORY',
].filter(Boolean);

let currentKeyIndex = 0;

function getNextKimiCodeKey() {
  if (KIMI_CODE_KEYS.length === 0) return null;
  const key = KIMI_CODE_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % KIMI_CODE_KEYS.length;
  return key;
}

// Ollama配置
const OLLAMA_BASE = 'http://localhost:11434';

// OpenClaw配置
const OPENCLAW_BASE = 'http://localhost:18789';

// ═══════════════════════════════════════════════════════════════
// 内存数据存储
// ═══════════════════════════════════════════════════════════════

const agents = new Map();
const groups = new Map();
const tasks = new Map();
const hermesMemories = new Map();

// 初始化5个协作Agent
function initAgents() {
  const now = new Date().toISOString();
  
  const defaultAgents = [
    {
      id: 'agent-coordinator',
      name: '协调员-悟空',
      role: 'coordinator',
      status: 'active',
      platform: 'ollama',
      model: 'qwen2.5:7b-custom',
      config: { temperature: 0.7, maxTokens: 4096 },
      swarmEnabled: true,
      swarmMode: 'hierarchical',
      roleInGroup: 'leader',
      groupId: 'swarm-alpha',
      skills: ['orchestrate', 'dialog', 'knowledge'],
      description: '蜂群协调员，负责任务分发和结果聚合',
      createdAt: now,
    },
    {
      id: 'agent-researcher',
      name: '研究员-八戒',
      role: 'researcher',
      status: 'active',
      platform: 'ollama',
      model: 'qwen2.5:7b-custom',
      config: { temperature: 0.8, maxTokens: 8192 },
      swarmEnabled: true,
      swarmMode: 'hierarchical',
      roleInGroup: 'worker',
      groupId: 'swarm-alpha',
      skills: ['research', 'knowledge', 'dialog'],
      description: '信息研究员，负责资料收集和分析',
      createdAt: now,
    },
    {
      id: 'agent-coder',
      name: '程序员-沙僧',
      role: 'coder',
      status: 'active',
      platform: 'ollama',
      model: 'DeepSeek-R1-Distill-Qwen-14B-GGUF:Q4_K_M',
      config: { temperature: 0.3, maxTokens: 8192 },
      swarmEnabled: true,
      swarmMode: 'hierarchical',
      roleInGroup: 'worker',
      groupId: 'swarm-alpha',
      skills: ['code', 'workflow', 'files'],
      description: '代码工程师，负责编码实现和调试',
      createdAt: now,
    },
    {
      id: 'agent-writer',
      name: '写手-白龙',
      role: 'writer',
      status: 'active',
      platform: 'ollama',
      model: 'qwen2.5:7b-custom',
      config: { temperature: 0.9, maxTokens: 4096 },
      swarmEnabled: true,
      swarmMode: 'hierarchical',
      roleInGroup: 'worker',
      groupId: 'swarm-alpha',
      skills: ['dialog', 'knowledge', 'creative'],
      description: '文档写手，负责内容撰写和润色',
      createdAt: now,
    },
    {
      id: 'agent-reviewer',
      name: '审查员-唐僧',
      role: 'reviewer',
      status: 'active',
      platform: 'ollama',
      model: 'qwen2.5:1.5b',
      config: { temperature: 0.5, maxTokens: 4096 },
      swarmEnabled: true,
      swarmMode: 'hierarchical',
      roleInGroup: 'worker',
      groupId: 'swarm-alpha',
      skills: ['monitor', 'intervene', 'knowledge'],
      description: '质量审查员，负责审核和把关',
      createdAt: now,
    },
  ];
  
  defaultAgents.forEach(a => agents.set(a.id, a));
  
  // 创建协作组
  groups.set('swarm-alpha', {
    id: 'swarm-alpha',
    name: '取经蜂群',
    description: '5-Agent协作蜂群：协调员+研究员+程序员+写手+审查员',
    status: 'active',
    swarmMode: 'hierarchical',
    coordinatorId: 'agent-coordinator',
    agentIds: defaultAgents.map(a => a.id),
    entityIds: defaultAgents.map(a => a.id),
    entityType: 'agents',
    healthScore: 100,
    taskStats: { completed: 0, failed: 0, pending: 0 },
    maxDepth: 2,
    createdAt: now,
  });
  
  console.log(`[Init] 已创建 ${agents.size} 个Agent和 ${groups.size} 个协作组`);
}

// ═══════════════════════════════════════════════════════════════
// CORS头
// ═══════════════════════════════════════════════════════════════

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ═══════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════

function sendJSON(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// 代理HTTP请求
async function proxyRequest(targetUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;
    
    const req = client.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.path,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 30000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════
// 路由处理
// ═══════════════════════════════════════════════════════════════

const routes = {
  // 健康检查
  'GET /health': async (req, res) => {
    sendJSON(res, 200, {
      status: 'ok',
      time: new Date().toISOString(),
      agents: agents.size,
      groups: groups.size,
      platforms: ['kimi-code', 'ollama', 'openclaw'],
    });
  },
  
  // ═── Agents ───
  'GET /agents': async (req, res) => {
    const list = Array.from(agents.values());
    sendJSON(res, 200, { success: true, data: list, total: list.length });
  },
  
  'GET /agents/:id': async (req, res, params) => {
    const agent = agents.get(params.id);
    if (!agent) return sendJSON(res, 404, { success: false, error: 'Agent not found' });
    sendJSON(res, 200, { success: true, data: agent });
  },
  
  'POST /agents': async (req, res) => {
    const body = await parseBody(req);
    const id = body.id || `agent-${Date.now()}`;
    const agent = {
      id,
      name: body.name || 'New Agent',
      role: body.role || 'assistant',
      status: 'active',
      platform: body.platform || 'kimi-code',
      model: body.model || 'kimi-k2.5',
      config: body.config || {},
      swarmEnabled: body.swarmEnabled || false,
      swarmMode: body.swarmMode || 'sequential',
      roleInGroup: body.roleInGroup || 'solo',
      groupId: body.groupId || null,
      skills: body.skills || [],
      description: body.description || '',
      createdAt: new Date().toISOString(),
    };
    agents.set(id, agent);
    sendJSON(res, 201, { success: true, data: agent });
  },
  
  'PUT /agents/:id': async (req, res, params) => {
    const body = await parseBody(req);
    const agent = agents.get(params.id);
    if (!agent) return sendJSON(res, 404, { success: false, error: 'Agent not found' });
    Object.assign(agent, body, { updatedAt: new Date().toISOString() });
    sendJSON(res, 200, { success: true, data: agent });
  },
  
  'DELETE /agents/:id': async (req, res, params) => {
    const ok = agents.delete(params.id);
    sendJSON(res, ok ? 204 : 404, ok ? undefined : { success: false, error: 'Agent not found' });
  },
  
  'POST /agents/:id/start': async (req, res, params) => {
    const agent = agents.get(params.id);
    if (!agent) return sendJSON(res, 404, { success: false, error: 'Agent not found' });
    agent.status = 'active';
    sendJSON(res, 200, { success: true, data: agent });
  },
  
  'POST /agents/:id/stop': async (req, res, params) => {
    const agent = agents.get(params.id);
    if (!agent) return sendJSON(res, 404, { success: false, error: 'Agent not found' });
    agent.status = 'paused';
    sendJSON(res, 200, { success: true, data: agent });
  },
  
  // ═── Groups ───
  'GET /groups': async (req, res) => {
    const list = Array.from(groups.values());
    sendJSON(res, 200, { success: true, data: list, total: list.length });
  },
  
  'GET /groups/:id': async (req, res, params) => {
    const group = groups.get(params.id);
    if (!group) return sendJSON(res, 404, { success: false, error: 'Group not found' });
    sendJSON(res, 200, { success: true, data: group });
  },
  
  'POST /groups': async (req, res) => {
    const body = await parseBody(req);
    const id = body.id || `group-${Date.now()}`;
    const group = {
      id,
      name: body.name || 'New Group',
      description: body.description || '',
      status: 'active',
      swarmMode: body.swarmMode || 'sequential',
      coordinatorId: body.coordinatorId || null,
      agentIds: body.agentIds || [],
      entityIds: body.entityIds || body.agentIds || [],
      entityType: 'agents',
      healthScore: 100,
      taskStats: { completed: 0, failed: 0, pending: 0 },
      maxDepth: body.maxDepth || 2,
      createdAt: new Date().toISOString(),
    };
    groups.set(id, group);
    sendJSON(res, 201, { success: true, data: group });
  },
  
  'POST /groups/:id/execute': async (req, res, params) => {
    const body = await parseBody(req);
    const group = groups.get(params.id);
    if (!group) return sendJSON(res, 404, { success: false, error: 'Group not found' });
    
    const mode = body.mode || group.swarmMode;
    const input = body.input || '默认任务';
    const fastMode = body.fastMode || false;
    
    // 模拟蜂群执行
    const result = await executeSwarm(group, mode, input, fastMode);
    sendJSON(res, 200, { success: true, data: result });
  },
  
  'POST /groups/:id/swarm-mode': async (req, res, params) => {
    const body = await parseBody(req);
    const group = groups.get(params.id);
    if (!group) return sendJSON(res, 404, { success: false, error: 'Group not found' });
    const validModes = ['sequential', 'parallel', 'hierarchical', 'dynamic'];
    if (!validModes.includes(body.mode)) {
      return sendJSON(res, 400, { success: false, error: `Invalid mode. Must be one of: ${validModes.join(', ')}` });
    }
    group.swarmMode = body.mode;
    sendJSON(res, 200, { success: true, data: group });
  },
  
  'GET /groups/:id/swarm-status': async (req, res, params) => {
    const group = groups.get(params.id);
    if (!group) return sendJSON(res, 404, { success: false, error: 'Group not found' });
    const groupAgents = group.agentIds.map(id => agents.get(id)).filter(Boolean);
    sendJSON(res, 200, {
      success: true,
      data: {
        group,
        agents: groupAgents,
        healthScore: group.healthScore,
        taskStats: group.taskStats,
      },
    });
  },
  
  // ═── Kimi Code 代理 ───
  'POST /kimi-code/chat/completions': async (req, res) => {
    const body = await parseBody(req);
    const apiKey = getNextKimiCodeKey();
    
    if (!apiKey) {
      return sendJSON(res, 401, { error: 'No Kimi Code API Key configured' });
    }
    
    try {
      const targetUrl = 'https://api.kimi.com/coding/v1/chat/completions';
      const result = await proxyRequest(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'claude-code/0.1.0',
        },
        body: body,
        timeout: 60000,
      });
      
      if (result.status >= 400) {
        return sendJSON(res, result.status, { error: result.body });
      }
      
      // 流式输出
      if (body.stream) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.write(result.body);
        res.end();
      } else {
        sendJSON(res, 200, JSON.parse(result.body));
      }
    } catch (err) {
      sendJSON(res, 500, { error: err.message });
    }
  },
  
  // ═── Ollama 代理 ───
  'GET /ollama/models': async (req, res) => {
    try {
      const result = await proxyRequest(`${OLLAMA_BASE}/api/tags`, { timeout: 10000 });
      sendJSON(res, result.status, JSON.parse(result.body));
    } catch (err) {
      sendJSON(res, 502, { error: 'Ollama unavailable', message: err.message });
    }
  },
  
  'POST /ollama/chat': async (req, res) => {
    const body = await parseBody(req);
    try {
      const result = await proxyRequest(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        timeout: 120000,
      });
      sendJSON(res, result.status, JSON.parse(result.body));
    } catch (err) {
      sendJSON(res, 502, { error: 'Ollama chat failed', message: err.message });
    }
  },
  
  'POST /ollama/generate': async (req, res) => {
    const body = await parseBody(req);
    try {
      const result = await proxyRequest(`${OLLAMA_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        timeout: 120000,
      });
      sendJSON(res, result.status, JSON.parse(result.body));
    } catch (err) {
      sendJSON(res, 502, { error: 'Ollama generate failed', message: err.message });
    }
  },
  
  // ═── OpenClaw 代理 ───
  'GET /openclaw/status': async (req, res) => {
    try {
      const result = await proxyRequest(`${OPENCLAW_BASE}/health`, { timeout: 5000 });
      sendJSON(res, 200, { status: 'online', openclaw: JSON.parse(result.body) });
    } catch (err) {
      sendJSON(res, 200, { status: 'offline', message: err.message });
    }
  },
  
  // ═── Hermes 记忆 ───
  'GET /hermes/memories': async (req, res) => {
    const list = Array.from(hermesMemories.values());
    sendJSON(res, 200, { success: true, data: list, total: list.length });
  },
  
  'POST /hermes/memories': async (req, res) => {
    const body = await parseBody(req);
    const id = `mem-${Date.now()}`;
    const memory = {
      id,
      agentId: body.agentId || 'system',
      content: body.content || '',
      tags: body.tags || [],
      timestamp: new Date().toISOString(),
    };
    hermesMemories.set(id, memory);
    sendJSON(res, 201, { success: true, data: memory });
  },
  
  'GET /hermes/memories/:agentId': async (req, res, params) => {
    const list = Array.from(hermesMemories.values())
      .filter(m => m.agentId === params.agentId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    sendJSON(res, 200, { success: true, data: list, total: list.length });
  },
  
  // ═── 平台列表 ───
  'GET /platforms': async (req, res) => {
    sendJSON(res, 200, {
      success: true,
      data: [
        { id: 'kimi-code', name: 'Kimi Code', status: 'online', type: 'api' },
        { id: 'ollama', name: 'Ollama', status: 'online', type: 'local' },
        { id: 'openclaw', name: 'OpenClaw', status: 'checking', type: 'gateway' },
      ],
    });
  },
  
  // ═── 任务 ───
  'GET /tasks': async (req, res) => {
    const list = Array.from(tasks.values());
    sendJSON(res, 200, { success: true, data: list, total: list.length });
  },
  
  'POST /tasks': async (req, res) => {
    const body = await parseBody(req);
    const id = `task-${Date.now()}`;
    const task = {
      id,
      name: body.name || 'New Task',
      agentId: body.agentId,
      groupId: body.groupId,
      status: 'pending',
      input: body.input || '',
      output: '',
      createdAt: new Date().toISOString(),
    };
    tasks.set(id, task);
    sendJSON(res, 201, { success: true, data: task });
  },
};

// ═══════════════════════════════════════════════════════════════
// 蜂群执行逻辑
// ═══════════════════════════════════════════════════════════════

async function executeSwarm(group, mode, input, fastMode = false) {
  const groupAgents = group.agentIds.map(id => agents.get(id)).filter(Boolean);
  const coordinator = groupAgents.find(a => a.roleInGroup === 'leader');
  const workers = groupAgents.filter(a => a.roleInGroup === 'worker');
  
  // 快速模式：只使用1.5b模型和协调员
  const activeWorkers = fastMode
    ? workers.filter(a => a.model === 'qwen2.5:1.5b').slice(0, 2)
    : workers;
  
  const taskId = `swarm-task-${Date.now()}`;
  const startTime = Date.now();
  
  let results = [];
  
  switch (mode) {
    case 'sequential':
      // 顺序执行
      for (const agent of groupAgents) {
        const result = await executeAgentTask(agent, input, taskId, fastMode);
        results.push({ agent: agent.id, result });
      }
      break;
      
    case 'parallel':
      // 并行执行
      results = await Promise.all(
        activeWorkers.map(async (agent) => ({
          agent: agent.id,
          result: await executeAgentTask(agent, input, taskId, fastMode),
        }))
      );
      break;
      
    case 'hierarchical':
      // 层级执行：协调员分发 → 工作者执行 → 协调员聚合
      if (coordinator) {
        // 协调员分解任务
        const subtasks = await decomposeTask(coordinator, input);
        // 工作者并行执行子任务
        const workerResults = await Promise.all(
          activeWorkers.map(async (worker, i) => ({
            agent: worker.id,
            subtask: subtasks[i % subtasks.length],
            result: await executeAgentTask(worker, subtasks[i % subtasks.length], taskId, fastMode),
          }))
        );
        // 协调员聚合结果
        const aggregated = await aggregateResults(coordinator, workerResults);
        results = [{ agent: coordinator.id, result: aggregated }];
      }
      break;
      
    case 'dynamic':
      // 动态执行：根据负载选择执行方式
      const load = activeWorkers.filter(a => a.status === 'active').length;
      if (load >= activeWorkers.length * 0.8) {
        // 高负载：顺序执行
        for (const agent of activeWorkers) {
          const result = await executeAgentTask(agent, input, taskId, fastMode);
          results.push({ agent: agent.id, result });
        }
      } else {
        // 低负载：并行执行
        results = await Promise.all(
          activeWorkers.map(async (agent) => ({
            agent: agent.id,
            result: await executeAgentTask(agent, input, taskId, fastMode),
          }))
        );
      }
      break;
  }
  
  const duration = Date.now() - startTime;
  
  // 更新统计
  group.taskStats.completed++;
  
  return {
    taskId,
    mode,
    input,
    duration,
    results,
    summary: `蜂群执行完成：${results.length} 个Agent参与，耗时 ${duration}ms`,
  };
}

async function executeAgentTask(agent, input, taskId, fastMode = false) {
  // 根据Agent平台选择调用方式
  try {
    // 快速模式：使用1.5b模型
    const model = fastMode ? 'qwen2.5:1.5b' : (agent.model || 'qwen2.5:7b-custom');
    const timeout = fastMode ? 30000 : 120000;
    
    if (agent.platform === 'kimi-code') {
      const apiKey = getNextKimiCodeKey();
      try {
        const result = await proxyRequest('https://api.kimi.com/coding/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'claude-code/0.1.0',
          },
          body: {
            model: agent.model || 'kimi-k2.5',
            messages: [
              { role: 'system', content: `你是${agent.name}，${agent.description}` },
              { role: 'user', content: input },
            ],
            temperature: agent.config?.temperature || 0.7,
            max_tokens: agent.config?.maxTokens || 4096,
          },
          timeout: 60000,
        });
        const data = JSON.parse(result.body);
        if (data.error) throw new Error(data.error.message || 'Kimi Code API error');
        return data.choices?.[0]?.message?.content || '无输出';
      } catch (kimiErr) {
        console.log(`[Kimi Code降级] Agent ${agent.name} 使用Ollama fallback: ${kimiErr.message}`);
        // 降级到Ollama
        const result = await proxyRequest(`${OLLAMA_BASE}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            model: model,
            prompt: `[系统提示] 你是${agent.name}，${agent.description}\n\n[任务] ${input}`,
            stream: false,
          },
          timeout: timeout,
        });
        const data = JSON.parse(result.body);
        return `[Kimi降级→Ollama] ${data.response || '无输出'}`;
      }
    } else if (agent.platform === 'ollama') {
      const result = await proxyRequest(`${OLLAMA_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          model: model,
          prompt: `[系统提示] 你是${agent.name}，${agent.description}\n\n[任务] ${input}`,
          stream: false,
        },
        timeout: timeout,
      });
      const data = JSON.parse(result.body);
      return data.response || '无输出';
    }
    return `Agent ${agent.name} 执行完成（模拟）`;
  } catch (err) {
    return `执行失败: ${err.message}`;
  }
}

async function decomposeTask(coordinator, input) {
  // 模拟任务分解
  return [
    `子任务1：分析需求 - ${input}`,
    `子任务2：收集资料 - ${input}`,
    `子任务3：实施方案 - ${input}`,
    `子任务4：审核检查 - ${input}`,
  ];
}

async function aggregateResults(coordinator, workerResults) {
  // 模拟结果聚合
  const outputs = workerResults.map(r => r.result).join('\n---\n');
  return `【协调员聚合结果】\n${outputs}`;
}

// ═══════════════════════════════════════════════════════════════
// 路由匹配
// ═══════════════════════════════════════════════════════════════

function matchRoute(method, pathname) {
  // 精确匹配
  const exactKey = `${method} ${pathname}`;
  if (routes[exactKey]) return { handler: routes[exactKey], params: {} };
  
  // 参数匹配
  for (const [key, handler] of Object.entries(routes)) {
    const [routeMethod, routePath] = key.split(' ');
    if (routeMethod !== method) continue;
    
    const routeParts = routePath.split('/');
    const pathParts = pathname.split('/');
    if (routeParts.length !== pathParts.length) continue;
    
    const params = {};
    let match = true;
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        params[routeParts[i].slice(1)] = pathParts[i];
      } else if (routeParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }
    
    if (match) return { handler, params };
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════
// 启动服务
// ═══════════════════════════════════════════════════════════════

initAgents();

const server = http.createServer(async (req, res) => {
  setCORS(res);
  
  // OPTIONS预检
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);
  
  const route = matchRoute(req.method, pathname);
  
  if (route) {
    try {
      await route.handler(req, res, route.params);
    } catch (err) {
      console.error('Route error:', err);
      sendJSON(res, 500, { error: err.message });
    }
  } else {
    sendJSON(res, 404, { error: `Route not found: ${req.method} ${pathname}` });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║     Bloom Bloom Garden - 简化版后端服务 (零依赖)              ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);
  console.log(`服务地址: http://${HOST}:${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log(`Agent列表: http://localhost:${PORT}/agents`);
  console.log(`Group列表: http://localhost:${PORT}/groups`);
  console.log(`Kimi代理:  http://localhost:${PORT}/kimi-code/chat/completions`);
  console.log(`Ollama代理: http://localhost:${PORT}/ollama/models`);
  console.log('');
  console.log(`已配置: ${KIMI_CODE_KEYS.length} 个Kimi Code Key`);
  console.log(`已创建: ${agents.size} 个Agent, ${groups.size} 个Group`);
});

module.exports = server;
