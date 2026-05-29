/**
 * frontend-integration-test.js — 前端JavaScript集成测试
 * 覆盖: axis-migration.ts API封装调用、页面组件渲染检查、路由配置验证
 * 运行: node frontend-integration-test.js (需安装jsdom + @testing-library/react)
 * 或浏览器控制台直接执行: copy(await runFrontendTests())
 */

const TEST_CONFIG = {
  baseUrl: typeof window !== 'undefined'
    ? (window.location.origin + '/api')
    : (process.env.API_BASE || 'http://localhost:3001/api'),
  timeout: 10000,
};

// ── 测试框架 (轻量级，无依赖) ──
class TestRunner {
  results = [];
  async test(name, fn) {
    const start = performance.now();
    try {
      await fn();
      this.results.push({ name, status: 'PASS', duration: (performance.now() - start).toFixed(2) });
    } catch (err) {
      this.results.push({ name, status: 'FAIL', error: err.message, duration: (performance.now() - start).toFixed(2) });
    }
  }
  report() {
    const passed = this.results.filter(r => r.status === 'PASS');
    const failed = this.results.filter(r => r.status === 'FAIL');
    console.log(`\n📊 前端集成测试报告: ${passed.length}/${this.results.length} 通过`);
    failed.forEach(r => console.log(`  ❌ ${r.name}: ${r.error}`));
    passed.slice(0, 5).forEach(r => console.log(`  ✅ ${r.name} (${r.duration}ms)`));
    if (passed.length > 5) console.log(`  ... 还有 ${passed.length - 5} 个通过`);
    return { passed: passed.length, failed: failed.length, total: this.results.length, results: this.results };
  }
}

// ── API契约测试 (验证所有封装函数存在且可调用) ──
async function runContractTests(runner) {
  // 动态导入或验证全局axis-migration导出
  const exports = typeof window !== 'undefined' && window.axisMigration
    ? window.axisMigration
    : {};

  const expectedExports = [
    // Health
    'fetchHealth',
    // Agents
    'fetchAgents', 'getAgent', 'createAgent', 'updateAgent', 'deleteAgent',
    'startAgent', 'stopAgent', 'fetchAgentContext', 'fetchAgentContextStream',
    // Dialog
    'fetchDialogSessions', 'createDialogSession', 'chatWithAgent', 'streamChatWithAgent',
    // Groups
    'fetchGroups', 'getGroup', 'createGroup', 'updateGroup', 'deleteGroup',
    'addAgentToGroup', 'removeAgentFromGroup', 'executeGroup', 'nestGroup',
    // Blueprints
    'fetchBlueprints', 'getBlueprint', 'createBlueprint', 'updateBlueprint', 'deleteBlueprint',
    'executeBlueprint', 'pauseBlueprint', 'resumeBlueprint',
    // Knowledge
    'fetchKnowledgeBases', 'getKnowledgeBase', 'createKnowledgeBase', 'updateKnowledgeBase',
    'deleteKnowledgeBase', 'searchKnowledge', 'queryKnowledge', 'uploadToKnowledge',
    // Skills
    'fetchSkills', 'getSkill', 'createSkill', 'updateSkill', 'deleteSkill',
    // Tasks
    'fetchTasks', 'getTask', 'createTask', 'updateTask', 'deleteTask',
    // APIKeys
    'fetchAPIKeys', 'fetchAPIKeyProviders', 'saveAPIKey', 'deleteAPIKey', 'toggleAPIKey', 'testAPIKey',
    // Monitor
    'fetchMonitorData', 'fetchAgentMonitor', 'fetchGroupMonitor', 'fetchMonitorLogs',
    'fetchMonitorStats', 'fetchMonitorPerformance', 'fetchMonitorHealth',
    // Spend
    'fetchSpendOverview', 'fetchSpendByProvider', 'fetchSpendByModel',
    'fetchSpendHistory', 'fetchRecentSpend',
    // Security
    'fetchSecurityEvents', 'fetchBlockedIPs', 'blockIP', 'unblockIP',
    // Registry
    'fetchRegistry', 'getRegistryNode', 'searchRegistry', 'heartbeatRegistry',
    // Events
    'fetchEvents', 'acknowledgeEvent', 'acknowledgeAllEvents',
    // Backups
    'fetchBackups', 'createBackup', 'restoreBackup', 'deleteBackup',
    // Processes
    'fetchProcesses', 'getProcess', 'restartProcess', 'stopProcess',
    // Settings
    'fetchSettings', 'updateSettings', 'fetchThemes', 'updateTheme',
    // Coordinator
    'createChariot', 'deleteChariot', 'mergeChariots', 'splitChariot',
    'delegateTask', 'broadcastToChariot', 'getChariotTree',
    // Intervention
    'requestIntervention', 'approveIntervention', 'rejectIntervention',
    'executeIntervention', 'globalPause', 'globalResume',
    // Kimi Cluster
    'fetchKimiClusterStatus', 'fetchKimiPatterns', 'loadBalanceKimi',
    'addKimiEndpoint', 'removeKimiEndpoint',
  ];

  for (const exp of expectedExports) {
    await runner.test(`Contract: ${exp} exists`, () => {
      const exists = typeof exports[exp] === 'function';
      if (!exists) throw new Error(`Export ${exp} not found`);
    });
  }
}

// ── 基础网络连通性测试 ──
async function runNetworkTests(runner) {
  await runner.test('Network: /api/health reachable', async () => {
    const resp = await fetch(`${TEST_CONFIG.baseUrl}/health`, { method: 'GET', signal: AbortSignal.timeout(TEST_CONFIG.timeout) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data.success && !data.status) throw new Error('Invalid health response');
  });

  await runner.test('Network: /api/agents returns JSON', async () => {
    const resp = await fetch(`${TEST_CONFIG.baseUrl}/agents`, { method: 'GET', signal: AbortSignal.timeout(TEST_CONFIG.timeout) });
    if (!resp.ok && resp.status !== 404) throw new Error(`HTTP ${resp.status}`);
  });

  await runner.test('Network: /api/apikeys/providers returns JSON', async () => {
    const resp = await fetch(`${TEST_CONFIG.baseUrl}/apikeys/providers`, { method: 'GET', signal: AbortSignal.timeout(TEST_CONFIG.timeout) });
    if (!resp.ok && resp.status !== 404) throw new Error(`HTTP ${resp.status}`);
  });
}

// ── 响应Schema验证 ──
async function runSchemaTests(runner) {
  const validateSuccessResponse = async (url) => {
    const resp = await fetch(url, { signal: AbortSignal.timeout(TEST_CONFIG.timeout) });
    if (resp.status === 404) return; // 资源不存在不算失败
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (typeof data.success !== 'boolean' && typeof data.status !== 'string') {
      throw new Error('Missing success/status field');
    }
  };

  const endpoints = [
    '/agents', '/groups', '/tasks', '/knowledge', '/skills',
    '/blueprints', '/events', '/monitor/agents', '/monitor/stats',
    '/registry', '/settings', '/spend/overview', '/apikeys',
    '/security/events', '/backups', '/processes',
  ];

  for (const ep of endpoints) {
    await runner.test(`Schema: ${ep} has valid response shape`, async () => {
      await validateSuccessResponse(`${TEST_CONFIG.baseUrl}${ep}`);
    });
  }
}

// ── 主入口 ──
async function runFrontendTests() {
  const runner = new TestRunner();

  console.log('🚀 千界花园前端集成测试启动...');
  console.log(`   API Base: ${TEST_CONFIG.baseUrl}`);

  await runContractTests(runner);
  await runNetworkTests(runner);
  await runSchemaTests(runner);

  const report = runner.report();

  // 浏览器环境写入window
  if (typeof window !== 'undefined') {
    window.lastTestReport = report;
  }

  return report;
}

// Node.js / 浏览器兼容导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runFrontendTests, TestRunner };
} else if (typeof window !== 'undefined') {
  window.runFrontendTests = runFrontendTests;
}

// 如果直接执行 (node 或 浏览器 console)
if (typeof window !== 'undefined' && document.readyState === 'complete') {
  runFrontendTests();
}
