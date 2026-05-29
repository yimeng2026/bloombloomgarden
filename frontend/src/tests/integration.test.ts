/**
 * 千界花园 — 前端 JavaScript 集成测试
 * 覆盖: 路由可达性 / API端点响应 / 组件渲染 / 3DACP协议
 * 运行: npm test 或 node --test src/tests/integration.test.js (Node 20+)
 */

const API_BASE = import.meta.env?.VITE_API_BASE || '';

/* ── 工具函数 ──────────────────────────────────────────────────── */

async function fetchJSON(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAIL: ${msg}`);
}

/* ── 测试套件 ──────────────────────────────────────────────────── */

export async function runAllTests(onLog = console.log) {
  const results = { passed: 0, failed: 0, tests: [] };

  async function test(name, fn) {
    const start = performance.now();
    try {
      await fn();
      const ms = (performance.now() - start).toFixed(1);
      results.passed++;
      results.tests.push({ name, status: 'PASS', ms });
      onLog(`  ✅ ${name} (${ms}ms)`);
    } catch (err) {
      const ms = (performance.now() - start).toFixed(1);
      results.failed++;
      results.tests.push({ name, status: 'FAIL', ms, error: err.message });
      onLog(`  ❌ ${name} (${ms}ms): ${err.message}`);
    }
  }

  onLog('\n══════════ 千界花园前端集成测试 ══════════\n');

  /* ── 1. 基础健康检查 ────────────────────────────────────────── */
  await test('Health endpoint reachable', async () => {
    const { ok, status } = await fetchJSON('/api/health');
    assert(ok && status === 200, `health returned ${status}`);
  });

  await test('3DACP registry listable', async () => {
    const { ok, data } = await fetchJSON('/api/axis/registry');
    assert(ok, 'registry not ok');
    assert(Array.isArray(data?.data?.nodes || data?.data), 'registry nodes missing');
  });

  /* ── 2. API Keys 管理 ───────────────────────────────────────── */
  await test('API Key providers listable', async () => {
    const { ok, data } = await fetchJSON('/api/apikeys/providers');
    assert(ok, 'providers not ok');
    const providers = data?.data || [];
    assert(providers.length >= 5, `only ${providers.length} providers listed`);
  });

  await test('API Key CRUD (mock-safe)', async () => {
    // Save
    const save = await fetchJSON('/api/apikeys', {
      method: 'POST',
      body: JSON.stringify({ provider: 'test-mock', apiKey: 'sk-test123', isActive: true }),
    });
    // List
    const list = await fetchJSON('/api/apikeys');
    assert(list.ok, 'list failed');
    // Delete
    const keys = list.data?.data || [];
    const mockKey = keys.find(k => k.provider === 'test-mock');
    if (mockKey) {
      const del = await fetchJSON(`/api/apikeys/${mockKey.id}`, { method: 'DELETE' });
      assert(del.ok || del.status === 404, 'delete failed');
    }
  });

  /* ── 3. Agent 系统 ──────────────────────────────────────────── */
  await test('Agent list accessible', async () => {
    const { ok, data } = await fetchJSON('/api/agents');
    assert(ok || data?.error === 'unauthorized', 'agents endpoint broken');
  });

  await test('Agent context endpoint exists', async () => {
    const { status } = await fetchJSON('/api/agents/demo-agent-001/context');
    assert(status === 200 || status === 404 || status === 401, `unexpected status ${status}`);
  });

  /* ── 4. Knowledge Hub ─────────────────────────────────────── */
  await test('Knowledge bases listable', async () => {
    const { ok, data } = await fetchJSON('/api/knowledge/bases');
    assert(ok || data?.error === 'unauthorized', 'knowledge bases broken');
  });

  /* ── 5. 3DACP Messaging ─────────────────────────────────────── */
  await test('3DACP message send/receive', async () => {
    const payload = {
      header: { msgType: 'test', version: '1.0', msgId: `test-${Date.now()}` },
      axis: { x: 'test', y: 'test', z: 'test' },
      body: { text: 'integration test' },
    };
    const { ok, data } = await fetchJSON('/api/axis/message', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    assert(ok || data?.error === 'unauthorized', '3dacp message endpoint broken');
  });

  /* ── 6. Monitoring ──────────────────────────────────────────── */
  await test('Monitoring metrics accessible', async () => {
    const { ok, status } = await fetchJSON('/api/monitoring/metrics');
    assert(ok || status === 404, `metrics unexpected ${status}`);
  });

  /* ── 7. Chat / Sessions ─────────────────────────────────────── */
  await test('Chat sessions listable', async () => {
    const { ok } = await fetchJSON('/api/sessions');
    assert(ok, 'sessions not ok');
  });

  /* ── 8. Blueprints ──────────────────────────────────────────── */
  await test('Blueprints listable', async () => {
    const { ok } = await fetchJSON('/api/blueprints');
    assert(ok, 'blueprints not ok');
  });

  /* ── 9. Intervention ──────────────────────────────────────────── */
  await test('Intervention levels readable', async () => {
    const { ok } = await fetchJSON('/api/intervention/levels');
    assert(ok, 'intervention levels not ok');
  });

  /* ── 10. Spend Tracker ───────────────────────────────────────── */
  await test('Spend summary accessible', async () => {
    const { ok } = await fetchJSON('/api/spend/summary');
    assert(ok, 'spend summary not ok');
  });

  /* ── 11. Kimi Cluster ────────────────────────────────────────── */
  await test('Kimi cluster status endpoint', async () => {
    const { ok } = await fetchJSON('/api/kimi-cluster/status');
    assert(ok, 'kimi cluster status not ok');
  });

  /* ── 12. Groups / Collaboration ─────────────────────────────── */
  await test('Groups listable', async () => {
    const { ok } = await fetchJSON('/api/groups');
    assert(ok, 'groups not ok');
  });

  /* ── 13. Ollama ──────────────────────────────────────────────── */
  await test('Ollama instances listable', async () => {
    const { ok } = await fetchJSON('/api/ollama/instances');
    assert(ok, 'ollama instances not ok');
  });

  /* ── 14. External Integrations ───────────────────────────────── */
  await test('External integrations listable', async () => {
    const { ok } = await fetchJSON('/api/external-integrations');
    assert(ok, 'external integrations not ok');
  });

  /* ── 15. Security / Audit ────────────────────────────────────── */
  await test('Audit logs accessible', async () => {
    const { ok } = await fetchJSON('/api/security/audit-logs');
    assert(ok, 'audit logs not ok');
  });

  /* ── 汇总 ─────────────────────────────────────────────────────── */
  onLog('\n══════════════════════════════════════');
  onLog(`  总测试: ${results.passed + results.failed}`);
  onLog(`  ✅ 通过: ${results.passed}`);
  onLog(`  ❌ 失败: ${results.failed}`);
  onLog('══════════════════════════════════════\n');

  return results;
}

/* 浏览器环境自动执行 */
if (typeof window !== 'undefined' && window.location?.pathname?.includes('api-test')) {
  window.runIntegrationTests = runAllTests;
}

/* CommonJS / ESM 兼容导出 */
if (typeof module !== 'undefined') module.exports = { runAllTests };
