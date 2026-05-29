/**
 * 千界花园 - JavaScript API 兼容性测试套件
 * 用法: node tests/javascript/api_compatibility_test.js [--host http://localhost:3000]
 */
const http = require('http');

const args = {};
process.argv.slice(2).forEach((arg, i, arr) => {
  if (arg.startsWith('--')) args[arg.replace('--', '')] = arr[i + 1] || true;
});

const HOST = (args.host || 'http://localhost:3000').replace(/\/+$/, '');
const TIMEOUT = parseInt(args.timeout || '10000', 10);

const CATEGORIES = {
  '基础服务': [
    { method: 'GET', path: '/api/health', expect: 200 },
    { method: 'GET', path: '/api/version', expect: 200 },
  ],
  'Agent管理': [
    { method: 'GET', path: '/api/agents', expect: 200 },
    { method: 'GET', path: '/api/agents/templates', expect: 200 },
  ],
  '对话与知识': [
    { method: 'GET', path: '/api/dialogs', expect: 200 },
    { method: 'GET', path: '/api/knowledge/bases', expect: 200 },
    { method: 'GET', path: '/api/uploads', expect: 200 },
    { method: 'GET', path: '/api/knowledge/search?query=hello', expect: 200 },
  ],
  '组与编排': [
    { method: 'GET', path: '/api/groups', expect: 200 },
    { method: 'GET', path: '/api/blueprints', expect: 200 },
    { method: 'GET', path: '/api/tasks', expect: 200 },
  ],
  '监控与事件': [
    { method: 'GET', path: '/api/system/metrics', expect: 200 },
    { method: 'GET', path: '/api/events', expect: 200 },
    { method: 'GET', path: '/api/spend/summary', expect: 200 },
    { method: 'GET', path: '/api/system/processes', expect: 200 },
  ],
  '外部集成': [
    { method: 'GET', path: '/api/external/integrations', expect: 200 },
    { method: 'GET', path: '/api/registry/nodes', expect: 200 },
    { method: 'GET', path: '/api/kimi-cluster/status', expect: 200 },
  ],
  '安全与密钥': [
    { method: 'GET', path: '/api/apikeys', expect: 200 },
    { method: 'GET', path: '/api/apikeys/providers', expect: 200 },
    { method: 'GET', path: '/api/security/audit-logs', expect: 200 },
  ],
  '3DACP核心': [
    { method: 'GET', path: '/api/axis/nodes', expect: 200 },
    { method: 'GET', path: '/api/axis/routes', expect: 200 },
    { method: 'POST', path: '/api/axis/message', expect: [200, 201, 202, 400, 422] },
  ],
};

function request(method, path, body = null) {
  return new Promise((resolve) => {
    const url = new URL(HOST + path);
    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: TIMEOUT,
    };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data: data.slice(0, 200), ok: true });
      });
    });
    req.on('error', (err) => resolve({ status: 0, error: err.message, ok: false }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout', ok: false }); });
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  console.log(`🔍 千界花园 API 兼容性测试 => ${HOST}`);
  console.log('='.repeat(60));
  let total = 0, passed = 0, partial = 0;
  const results = [];

  for (const [cat, endpoints] of Object.entries(CATEGORIES)) {
    console.log(`\n📦 ${cat}`);
    for (const ep of endpoints) {
      total++;
      const body = ep.method === 'POST' && ep.path.includes('message')
        ? JSON.stringify({
            header: { x: 0, y: 0, z: 0, source: 'js-test', target: '*', msgType: 'ping' },
            payload: { type: 'text', content: 'ping' },
            meta: { timestamp: Date.now(), traceId: 'js-' + Date.now() }
          })
        : ep.method === 'POST' ? '{}' : null;

      const start = Date.now();
      const res = await request(ep.method, ep.path, body);
      const ms = Date.now() - start;
      const expects = Array.isArray(ep.expect) ? ep.expect : [ep.expect];
      const ok = expects.includes(res.status);
      const isPartial = !ok && [400, 401, 403, 404, 422, 409].includes(res.status);

      if (ok) passed++;
      else if (isPartial) partial++;

      const icon = ok ? '✓' : (isPartial ? '⚠' : '✗');
      const info = res.ok ? `${res.status}` : (res.error || res.status);
      console.log(`  ${icon} ${ep.method} ${ep.path} => ${info} (${ms}ms)`);
      results.push({ category: cat, method: ep.method, path: ep.path, status: res.status, ms, ok, partial: isPartial, error: res.error || null });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 结果: ${passed}/${total} 通过, ${partial} 部分可用`);
  const ratio = (passed + partial) / total;
  if (ratio >= 0.85) { console.log('🟢 状态: 健康'); process.exitCode = 0; }
  else if (ratio >= 0.6) { console.log('🟡 状态: 警告'); process.exitCode = 1; }
  else { console.log('🔴 状态: 严重'); process.exitCode = 2; }

  if (args.json) {
    console.log(JSON.stringify({ passed, total, partial, results }, null, 2));
  }
}

run();
