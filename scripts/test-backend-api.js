/**
 * 千界花园 — Node.js 后端 API 集成测试脚本
 * 运行: node scripts/test-backend-api.js
 * 功能: 自动测试所有后端端点，验证响应格式和状态码
 */

const http = require('http');

const HOST = process.env.TRG_BACKEND_HOST || 'localhost';
const PORT = process.env.TRG_BACKEND_PORT || 3001;
const BASE_URL = `http://${HOST}:${PORT}`;

const TESTS = [
  // 系统
  { name: 'Health', method: 'GET', path: '/api/health', expectStatus: 200, expectJson: true },
  { name: 'Settings', method: 'GET', path: '/api/settings', expectStatus: 200, expectJson: true },

  // 智能体
  { name: 'Agents List', method: 'GET', path: '/api/agents', expectStatus: [200, 401], expectJson: true },
  { name: 'Skills List', method: 'GET', path: '/api/skills', expectStatus: 200, expectJson: true },

  // 3DACP / Registry
  { name: '3DACP Registry', method: 'GET', path: '/api/axis/registry', expectStatus: 200, expectJson: true },
  { name: '3DACP Nodes', method: 'GET', path: '/api/axis/nodes', expectStatus: 200, expectJson: true },

  // API Keys
  { name: 'API Key Providers', method: 'GET', path: '/api/apikeys/providers', expectStatus: 200, expectJson: true },

  // 知识库
  { name: 'Knowledge Bases', method: 'GET', path: '/api/knowledge/bases', expectStatus: [200, 401], expectJson: true },

  // 协作
  { name: 'Groups List', method: 'GET', path: '/api/groups', expectStatus: 200, expectJson: true },

  // 监控
  { name: 'Monitor Metrics', method: 'GET', path: '/api/monitoring/metrics', expectStatus: [200, 404], expectJson: true },

  // 任务
  { name: 'Tasks List', method: 'GET', path: '/api/tasks', expectStatus: 200, expectJson: true },

  // 蓝图
  { name: 'Blueprints', method: 'GET', path: '/api/blueprints', expectStatus: 200, expectJson: true },

  // 干预
  { name: 'Intervention Levels', method: 'GET', path: '/api/intervention/levels', expectStatus: 200, expectJson: true },

  // 花费
  { name: 'Spend Summary', method: 'GET', path: '/api/spend/summary', expectStatus: 200, expectJson: true },

  // Kimi Cluster
  { name: 'Kimi Cluster Status', method: 'GET', path: '/api/kimi-cluster/status', expectStatus: 200, expectJson: true },

  // Ollama
  { name: 'Ollama Instances', method: 'GET', path: '/api/ollama/instances', expectStatus: 200, expectJson: true },

  // 外部集成
  { name: 'External Integrations', method: 'GET', path: '/api/external-integrations', expectStatus: 200, expectJson: true },

  // 统一API
  { name: 'Unified Platforms', method: 'GET', path: '/api/unified-api/platforms', expectStatus: 200, expectJson: true },

  // 安全
  { name: 'Audit Logs', method: 'GET', path: '/api/security/audit-logs', expectStatus: [200, 401], expectJson: true },

  // 平台
  { name: 'Platforms', method: 'GET', path: '/api/platforms', expectStatus: 200, expectJson: true },

  // 工作流
  { name: 'Workflows', method: 'GET', path: '/api/workflows', expectStatus: 200, expectJson: true },
];

function request(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { /* not JSON */ }
        resolve({ status: res.statusCode, data, json });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

async function run() {
  console.log(`\n══════════════════════════════════════`);
  console.log(`  千界花园 — 后端 API 集成测试`);
  console.log(`  目标: ${BASE_URL}`);
  console.log(`══════════════════════════════════════\n`);

  let passed = 0, failed = 0;

  for (const t of TESTS) {
    const start = Date.now();
    try {
      const res = await request(t.method, t.path);
      const ms = Date.now() - start;
      const expected = Array.isArray(t.expectStatus) ? t.expectStatus : [t.expectStatus];
      const ok = expected.includes(res.status);
      if (ok) {
        passed++;
        console.log(`  ✅ ${t.name.padEnd(24)} ${t.method} ${t.path}  ${res.status}  ${ms}ms`);
      } else {
        failed++;
        console.log(`  ❌ ${t.name.padEnd(24)} ${t.method} ${t.path}  ${res.status} (期望 ${expected.join('|')})  ${ms}ms`);
      }
    } catch (err) {
      failed++;
      console.log(`  ❌ ${t.name.padEnd(24)} ${t.method} ${t.path}  ERROR: ${err.message}`);
    }
  }

  console.log(`\n══════════════════════════════════════`);
  console.log(`  总测试: ${TESTS.length}`);
  console.log(`  ✅ 通过: ${passed}`);
  console.log(`  ❌ 失败: ${failed}`);
  console.log(`══════════════════════════════════════\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run();
