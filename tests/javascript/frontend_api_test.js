/**
 * frontend_api_test.js — 前端API端到端测试套件 (Node.js)
 * 用法: node tests/javascript/frontend_api_test.js
 * 功能: 模拟前端调用所有后端API，验证响应格式与数据完整性
 */

const http = require('http');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TIMEOUT = 10000;

let passed = 0;
let failed = 0;
const errors = [];

function request(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json, raw: data });
        } catch {
          resolve({ status: res.statusCode, data: null, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Timeout')));

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`   ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`   ❌ ${name}: ${err.message}`);
    failed++;
    errors.push({ test: name, error: err.message });
  }
}

// ===================== 测试用例 =====================

async function testHealth() {
  const res = await request('/api/health');
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(res.data && res.data.status === 'ok', 'Health status should be ok');
}

async function testProvidersList() {
  const res = await request('/api/apikeys/providers');
  assert(res.status === 200, `Status ${res.status}`);
  assert(Array.isArray(res.data?.data), 'Providers should be array');
  assert(res.data.data.length >= 10, `Expected >=10 providers, got ${res.data.data.length}`);
  const ids = res.data.data.map(p => p.id);
  assert(ids.includes('kimi-code'), 'Should include kimi-code');
  assert(ids.includes('openai'), 'Should include openai');
}

async function testAPIKeysCRUD() {
  // Create
  const createRes = await request('/api/apikeys', 'POST', {
    provider: 'kimi-code',
    apiKey: 'sk-test-fake-key-for-validation',
    isActive: true,
  });
  assert(createRes.status === 201 || createRes.status === 200, `Create status ${createRes.status}`);

  // List
  const listRes = await request('/api/apikeys');
  assert(listRes.status === 200, 'List status 200');
  assert(Array.isArray(listRes.data?.data), 'Keys should be array');

  // Toggle (if we have keys)
  if (listRes.data.data.length > 0) {
    const keyId = listRes.data.data[0].id;
    const toggleRes = await request(`/api/apikeys/${keyId}/toggle`, 'PATCH');
    assert(toggleRes.status === 200, 'Toggle status 200');
  }
}

async function testAgentsList() {
  const res = await request('/api/agents');
  assert(res.status === 200, `Status ${res.status}`);
  assert(Array.isArray(res.data?.data), 'Agents should be array');
}

async function testKimiClusterStatus() {
  const res = await request('/api/kimi-cluster/status');
  assert(res.status === 200, `Status ${res.status}`);
  assert(typeof res.data?.data === 'object', 'Cluster status should be object');
}

async function testDialogList() {
  const res = await request('/api/dialogs');
  assert(res.status === 200, `Status ${res.status}`);
  assert(Array.isArray(res.data?.data), 'Dialogs should be array');
}

async function testWorkspacesList() {
  const res = await request('/api/workspaces');
  assert(res.status === 200, `Status ${res.status}`);
  assert(Array.isArray(res.data?.data), 'Workspaces should be array');
}

async function testKnowledgeBasesList() {
  const res = await request('/api/knowledge-bases');
  assert(res.status === 200, `Status ${res.status}`);
  assert(Array.isArray(res.data?.data), 'Knowledge bases should be array');
}

async function testSkillsList() {
  const res = await request('/api/skills');
  assert(res.status === 200, `Status ${res.status}`);
  assert(Array.isArray(res.data?.data), 'Skills should be array');
}

async function testUploadsList() {
  const res = await request('/api/uploads');
  assert(res.status === 200, `Status ${res.status}`);
  assert(Array.isArray(res.data?.data), 'Uploads should be array');
}

async function testEventsList() {
  const res = await request('/api/events');
  assert(res.status === 200, `Status ${res.status}`);
  assert(Array.isArray(res.data?.data), 'Events should be array');
}

async function testBlueprintsList() {
  const res = await request('/api/blueprints');
  assert(res.status === 200, `Status ${res.status}`);
  assert(Array.isArray(res.data?.data), 'Blueprints should be array');
}

async function testMonitorMetrics() {
  const res = await request('/api/monitor/metrics');
  assert(res.status === 200, `Status ${res.status}`);
  assert(typeof res.data?.data === 'object', 'Metrics should be object');
}

async function testIntentsList() {
  const res = await request('/api/intents');
  assert(res.status === 200, `Status ${res.status}`);
  assert(Array.isArray(res.data?.data), 'Intents should be array');
}

async function testOllamaInstances() {
  const res = await request('/api/ollama/instances');
  // 可能未配置Ollama，允许500或200
  assert(res.status === 200 || res.status === 500 || res.status === 404, `Unexpected status ${res.status}`);
}

async function testAuthLoginMock() {
  // 测试登录接口格式
  const res = await request('/api/auth/login', 'POST', {
    email: 'admin@thousand-realms.garden',
    password: 'test',
    rememberMe: false,
  });
  // 允许200(成功)或401(密码错误)，但不能是500
  assert(res.status === 200 || res.status === 401, `Login should return 200 or 401, got ${res.status}`);
}

// ===================== 主流程 =====================

async function main() {
  console.log(`\n🧪 千界花园 — 前端API端到端测试`);
  console.log(`   目标后端: ${BASE_URL}`);
  console.log(`   开始时间: ${new Date().toLocaleString('zh-CN')}\n`);

  // 先检查后端是否在线
  try {
    await request('/api/health');
  } catch (err) {
    console.error(`\n❌ 后端未响应: ${err.message}`);
    console.error(`   请确保后端已启动: npm run dev (backend)`);
    process.exit(1);
  }

  const tests = [
    ['Health 健康检查', testHealth],
    ['Providers 列表 (≥10个)', testProvidersList],
    ['APIKeys CRUD', testAPIKeysCRUD],
    ['Agents 列表', testAgentsList],
    ['KimiCluster 状态', testKimiClusterStatus],
    ['Dialogs 列表', testDialogList],
    ['Workspaces 列表', testWorkspacesList],
    ['KnowledgeBases 列表', testKnowledgeBasesList],
    ['Skills 列表', testSkillsList],
    ['Uploads 列表', testUploadsList],
    ['Events 列表', testEventsList],
    ['Blueprints 列表', testBlueprintsList],
    ['Monitor 指标', testMonitorMetrics],
    ['Intents 列表', testIntentsList],
    ['Ollama 实例', testOllamaInstances],
    ['Auth 登录格式', testAuthLoginMock],
  ];

  for (const [name, fn] of tests) {
    await runTest(name, fn);
  }

  // 报告
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 测试报告`);
  console.log(`   通过: ${passed}/${passed + failed}`);
  console.log(`   失败: ${failed}`);
  if (failed > 0) {
    console.log(`\n   失败详情:`);
    errors.forEach(e => console.log(`      ❌ ${e.test}: ${e.error}`));
  }
  console.log(`=` .repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
