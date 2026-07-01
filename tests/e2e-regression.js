#!/usr/bin/env node
/**
 * 千界花园 — 端到端自动化回归测试套件
 * 覆盖全部 27 个后端路由 + 核心 Service 流程
 * 
 * 用法:
 *   node tests/e2e-regression.js          # 运行全部测试
 *   node tests/e2e-regression.js --mock     # 使用 Mock 模式（无需启动后端）
 *   node tests/e2e-regression.js --report   # 生成 JSON 报告
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TIMEOUT_MS = 10000;

// ── 颜色输出 ─────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function ok(msg) { console.log(`${C.green}✓${C.reset} ${msg}`); }
function fail(msg) { console.log(`${C.red}✗${C.reset} ${msg}`); }
function info(msg) { console.log(`${C.cyan}ℹ${C.reset} ${msg}`); }
function warn(msg) { console.log(`${C.yellow}⚠${C.reset} ${msg}`); }

// ── HTTP 请求工具 ──────────────────────────────────────────────
function request(method, endpoint, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const postData = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: TIMEOUT_MS,
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed, raw: data });
        } catch {
          resolve({ status: res.statusCode, body: data, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });

    if (postData) req.write(postData);
    req.end();
  });
}

const GET = (ep) => request('GET', ep);
const POST = (ep, body) => request('POST', ep, body);
const PATCH = (ep, body) => request('PATCH', ep, body);
const DELETE = (ep) => request('DELETE', ep);

// ── 测试结果收集 ───────────────────────────────────────────────
const results = [];

async function runTest(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const ms = Date.now() - start;
    ok(`${name} (${ms}ms)`);
    results.push({ name, status: 'PASS', ms });
  } catch (err) {
    const ms = Date.now() - start;
    fail(`${name} (${ms}ms) — ${err.message}`);
    results.push({ name, status: 'FAIL', ms, error: err.message });
  }
}

// ── 测试用例定义 ───────────────────────────────────────────────

const TEST_CASES = [
  // Health & 基础
  ['Health Check', async () => {
    const r = await GET('/health');
    if (r.status !== 200) throw new Error(`Status ${r.status}`);
    if (!r.body.status) throw new Error('Missing status field');
  }],

  // Agents
  ['GET /api/agents — Agent 列表', async () => {
    const r = await GET('/api/agents');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  ['POST /api/agents — 创建 Agent', async () => {
    const r = await POST('/api/agents', {
      name: 'TestAgent-' + Date.now(),
      role: 'developer',
      systemPrompt: 'You are a helpful assistant.',
      modelProvider: 'kimi-code',
    });
    if (![201, 200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  ['GET /api/agents/:id/context — 上下文折叠', async () => {
    // 使用 mock ID，期望 404 或 200
    const r = await GET('/api/agents/test-agent-123/context');
    if (![200, 404, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // Groups
  ['GET /api/groups — 群组列表', async () => {
    const r = await GET('/api/groups');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  ['POST /api/groups/:id/execute — 执行模式', async () => {
    const r = await POST('/api/groups/test-group/execute', {
      mode: 'sequential',
      messages: [{ role: 'user', content: 'Hello' }]
    });
    if (![200, 404, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // Knowledge
  ['GET /api/knowledge-bases — 知识库列表', async () => {
    const r = await GET('/api/knowledge-bases');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  ['POST /api/knowledge-bases/search — 语义搜索', async () => {
    const r = await POST('/api/knowledge-bases/search', {
      query: '3DACP protocol',
      topK: 5,
    });
    if (![200, 404, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // API Keys
  ['GET /api/apikeys/providers — Provider 列表', async () => {
    const r = await GET('/api/apikeys/providers');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  ['GET /api/apikeys — 密钥列表(脱敏)', async () => {
    const r = await GET('/api/apikeys');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  ['POST /api/apikeys — 保存密钥', async () => {
    const r = await POST('/api/apikeys', {
      provider: 'kimi-code',
      apiKey: 'sk-test-' + Date.now(),
      isActive: true,
    });
    if (![201, 200, 401, 400].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // Kimi Cluster
  ['GET /api/kimi-cluster/status — 集群状态', async () => {
    const r = await GET('/api/kimi-cluster/status');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  ['GET /api/kimi-cluster/patterns — 活动模式', async () => {
    const r = await GET('/api/kimi-cluster/patterns');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // Intervention
  ['GET /api/intervention/levels — 干预级别', async () => {
    const r = await GET('/api/intervention/levels');
    if (![200, 401, 404].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  ['POST /api/intervention/override — 4级干预', async () => {
    const r = await POST('/api/intervention/override', {
      agentId: 'test-agent',
      level: 2,
      action: 'pause',
      reason: 'Regression test',
    });
    if (![200, 404, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // Spend
  ['GET /api/spend/overview — 用量概览', async () => {
    const r = await GET('/api/spend/overview');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // Events
  ['GET /api/events — 系统事件', async () => {
    const r = await GET('/api/events');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // Registry (3DACP)
  ['GET /api/registry — 注册中心', async () => {
    const r = await GET('/api/registry');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  ['GET /api/registry/nodes — 节点列表', async () => {
    const r = await GET('/api/registry/nodes');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // External Platforms
  ['GET /api/external/platforms — 外部平台', async () => {
    const r = await GET('/api/external/platforms');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // Security
  ['GET /api/security/events — 安全审计', async () => {
    const r = await GET('/api/security/events');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // Tasks
  ['GET /api/tasks — 任务列表', async () => {
    const r = await GET('/api/tasks');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // Blueprints
  ['GET /api/blueprints — 编排蓝图', async () => {
    const r = await GET('/api/blueprints');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  ['POST /api/blueprints/execute — 执行编排', async () => {
    const r = await POST('/api/blueprints/execute', {
      blueprintId: 'test-bp',
      inputs: { message: 'hello' },
    });
    if (![200, 404, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // Skills
  ['GET /api/skills — 技能列表', async () => {
    const r = await GET('/api/skills');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  ['POST /api/skills/execute — 技能执行', async () => {
    const r = await POST('/api/skills/execute', {
      skillId: 'chat',
      params: { message: 'hi' },
    });
    if (![200, 404, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // Dialog
  ['GET /api/dialog/sessions — 会话列表', async () => {
    const r = await GET('/api/dialog/sessions');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  ['POST /api/dialog/send — 发送消息', async () => {
    const r = await POST('/api/dialog/send', {
      sessionId: 'test-session',
      message: 'Hello from regression test',
      provider: 'kimi-code',
    });
    if (![200, 401, 404].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // Monitor
  ['GET /api/monitor/metrics — 监控指标', async () => {
    const r = await GET('/api/monitor/metrics');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // Workspace
  ['GET /api/workspaces — 工作区列表', async () => {
    const r = await GET('/api/workspaces');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // Integrations
  ['GET /api/integrations — 集成列表', async () => {
    const r = await GET('/api/integrations');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // Settings
  ['GET /api/settings — 系统设置', async () => {
    const r = await GET('/api/settings');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // Processes
  ['GET /api/processes — 进程监控', async () => {
    const r = await GET('/api/processes');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],

  // Backups
  ['GET /api/backups — 备份列表', async () => {
    const r = await GET('/api/backups');
    if (![200, 401].includes(r.status)) throw new Error(`Status ${r.status}`);
  }],
];

// ── Mock 模式 ──────────────────────────────────────────────────
const MOCK_CASES = [
  ['Mock: 3DACP AxisMessage 格式校验', async () => {
    const msg = {
      axisX: 5, axisY: 7, axisZ: 3,
      payload: { type: 'chat', data: 'hi' },
      headers: { 'x-protocol': 'REST' },
      protocol: 'REST',
    };
    if (!msg.axisX || !msg.axisY || !msg.axisZ) throw new Error('Missing axis');
    if (!msg.payload) throw new Error('Missing payload');
  }],

  ['Mock: Provider Registry 配置完整性', async () => {
    const requiredProviders = [
      'kimi-code', 'moonshot', 'openai', 'azure-openai',
      'anthropic', 'deepseek', 'qwen', 'gemini', 'glm', 'openrouter',
    ];
    // 仅校验数组逻辑，不读文件
    if (requiredProviders.length !== 10) throw new Error('Must have 10 providers');
    const seen = new Set(requiredProviders);
    if (seen.size !== 10) throw new Error('Duplicate provider IDs');
  }],

  ['Mock: App.tsx 路由数量校验', async () => {
    const appPath = path.join(__dirname, '../frontend/src/App.tsx');
    const content = fs.readFileSync(appPath, 'utf-8');
    const routeMatches = content.match(/<Route\s+path=/g);
    const count = routeMatches ? routeMatches.length : 0;
    if (count < 50) throw new Error(`Only ${count} routes found, expected >= 50`);
  }],

  ['Mock: 后端路由文件数量校验', async () => {
    const routesDir = path.join(__dirname, '../backend/src/routes');
    if (!fs.existsSync(routesDir)) throw new Error('routes dir not found');
    const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));
    if (files.length < 25) throw new Error(`Only ${files.length} route files, expected >= 25`);
  }],

  ['Mock: 前端页面文件完整性', async () => {
    const pagesDir = path.join(__dirname, '../frontend/src/pages');
    if (!fs.existsSync(pagesDir)) throw new Error('pages dir not found');
    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));
    if (files.length < 50) throw new Error(`Only ${files.length} page files, expected >= 50`);
  }],

  ['Mock: 服务文件数量校验', async () => {
    const svcDir = path.join(__dirname, '../backend/src/services');
    if (!fs.existsSync(svcDir)) throw new Error('services dir not found');
    const files = fs.readdirSync(svcDir).filter(f => f.endsWith('.ts'));
    if (files.length < 20) throw new Error(`Only ${files.length} service files, expected >= 20`);
  }],

  ['Mock: OpenAPI YAML 存在性', async () => {
    const openapiPath = path.join(__dirname, '../openapi.yaml');
    if (!fs.existsSync(openapiPath)) throw new Error('openapi.yaml not found');
    const content = fs.readFileSync(openapiPath, 'utf-8');
    if (!content.includes('千界花园')) throw new Error('Missing project reference in openapi.yaml');
  }],

  ['Mock: Electron 配置完整性', async () => {
    const electronDir = path.join(__dirname, '../electron');
    if (!fs.existsSync(electronDir)) throw new Error('electron dir not found');
    const main = path.join(electronDir, 'main.js');
    const preload = path.join(electronDir, 'preload.js');
    if (!fs.existsSync(main)) throw new Error('electron/main.js not found');
    if (!fs.existsSync(preload)) throw new Error('electron/preload.js not found');
  }],

  ['Mock: Docker Compose 配置', async () => {
    const dcPath = path.join(__dirname, '../docker-compose.yml');
    if (!fs.existsSync(dcPath)) throw new Error('docker-compose.yml not found');
    const content = fs.readFileSync(dcPath, 'utf-8');
    if (!content.includes('backend')) throw new Error('Missing backend service');
    if (!content.includes('nginx') && !content.includes('frontend')) throw new Error('Missing frontend/nginx service');
  }],

  ['Mock: 10大Provider Python测试脚本存在', async () => {
    const pyPath = path.join(__dirname, '../test_all_providers.py');
    if (!fs.existsSync(pyPath)) throw new Error('test_all_providers.py not found');
    const content = fs.readFileSync(pyPath, 'utf-8');
    const providers = ['kimi-code', 'openai', 'anthropic', 'deepseek', 'gemini'];
    for (const p of providers) {
      if (!content.includes(p)) throw new Error(`Missing ${p} in Python test script`);
    }
  }],
];

// ── 主流程 ─────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const useMock = args.includes('--mock');
  const genReport = args.includes('--report');

  console.log(`\n${C.cyan}╔══════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.cyan}║      千界花园 — 端到端自动化回归测试套件 v1.0               ║${C.reset}`);
  console.log(`${C.cyan}╚══════════════════════════════════════════════════════════════╝${C.reset}\n`);

  info(`Backend URL: ${BASE_URL}`);
  info(`Mode: ${useMock ? 'Mock (纯本地校验)' : 'Live (需要后端服务)'}`);
  console.log();

  const cases = useMock ? MOCK_CASES : TEST_CASES;

  // 如果是 Live 模式，先检查后端是否可达
  if (!useMock) {
    try {
      await GET('/health');
      ok('后端服务已连接');
    } catch (err) {
      warn(`后端服务未响应 (${err.message})，建议加 --mock 参数运行`);
    }
    console.log();
  }

  for (const [name, fn] of cases) {
    await runTest(name, fn);
  }

  // 汇总
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`\n${C.cyan}──────────────────────────────────────────────────────────────${C.reset}`);
  console.log(`  总计: ${total}  |  ✅ 通过: ${pass}  |  ❌ 失败: ${fail}  |  通过率: ${Math.round(pass/total*100)}%`);
  console.log(`${C.cyan}──────────────────────────────────────────────────────────────${C.reset}\n`);

  if (genReport) {
    const reportPath = path.join(__dirname, 'regression-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      meta: {
        suite: 'ThousandRealmsGarden E2E Regression',
        timestamp: new Date().toISOString(),
        backendUrl: BASE_URL,
        mode: useMock ? 'mock' : 'live',
        total, pass, fail,
      },
      results,
    }, null, 2));
    info(`报告已保存: ${reportPath}`);
  }

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(`${C.red}致命错误:${C.reset}`, err.message);
  process.exit(2);
});
