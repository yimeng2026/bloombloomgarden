/**
 * e2e_flow_test.js — 端到端业务流程测试
 * 用法: node tests/javascript/e2e_flow_test.js
 * 场景: 用户完整流程 — 登录 → 配置Key → 创建Agent → 发起对话 → 检查上下文
 */

const http = require('http');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

let token = null;
let createdAgentId = null;
let createdDialogId = null;

function request(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data), raw: data }); }
        catch { resolve({ status: res.statusCode, data: null, raw: data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Timeout')));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let passed = 0;
let failed = 0;

async function step(name, fn) {
  try {
    const result = await fn();
    console.log(`   ✅ ${name}`);
    passed++;
    return result;
  } catch (err) {
    console.log(`   ❌ ${name}: ${err.message}`);
    failed++;
    throw err;
  }
}

async function runE2EFlow() {
  console.log(`\n🌸 千界花园 — 端到端业务流程测试`);
  console.log(`   后端: ${BASE_URL}\n`);

  // Step 1: 健康检查
  await step('1. 系统健康检查', async () => {
    const res = await request('/api/health');
    if (res.status !== 200) throw new Error(`Health ${res.status}`);
    if (res.data?.status !== 'ok') throw new Error('Status not ok');
  });

  // Step 2: 用户登录 (演示模式兼容)
  const loginRes = await step('2. 用户登录', async () => {
    const res = await request('/api/auth/login', 'POST', {
      email: 'admin@thousand-realms.garden',
      password: 'any-password',
    });
    // 后端如果支持JWT，保存token
    if (res.data?.data?.token) {
      token = res.data.data.token;
    }
    if (res.status !== 200 && res.status !== 401) {
      throw new Error(`Unexpected status ${res.status}`);
    }
    return res;
  });

  // Step 3: 获取Provider列表
  const providersRes = await step('3. 获取LLM Provider列表', async () => {
    const res = await request('/api/apikeys/providers');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data?.data)) throw new Error('Not array');
    if (res.data.data.length < 5) throw new Error(`Only ${res.data.data.length} providers`);
    return res.data.data;
  });
  console.log(`      发现 ${providersRes.length} 个Provider: ${providersRes.map(p => p.id).join(', ')}`);

  // Step 4: 创建Agent
  const agentRes = await step('4. 创建智能体', async () => {
    const res = await request('/api/agents', 'POST', {
      name: 'E2E测试Agent',
      description: '由e2e_flow_test.js自动创建',
      role: 'developer',
      provider: 'kimi-code',
      model: 'kimi-latest',
      systemPrompt: '你是一个测试助手，请简洁回答。',
    });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Status ${res.status}`);
    createdAgentId = res.data?.data?.id;
    return res;
  });
  console.log(`      Agent ID: ${createdAgentId}`);

  // Step 5: 获取Agent上下文
  await step('5. 获取Agent上下文', async () => {
    if (!createdAgentId) throw new Error('No agent created');
    const res = await request(`/api/agents/${createdAgentId}/context`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data?.data) throw new Error('No context data');
  });

  // Step 6: 发起对话
  const dialogRes = await step('6. 创建对话', async () => {
    const res = await request('/api/dialogs', 'POST', {
      title: 'E2E测试对话',
      agentId: createdAgentId,
      message: '你好，这是一条端到端测试消息',
    });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Status ${res.status}`);
    createdDialogId = res.data?.data?.id;
    return res;
  });
  console.log(`      Dialog ID: ${createdDialogId}`);

  // Step 7: 发送消息 (如果后端支持)
  await step('7. 发送消息到对话', async () => {
    if (!createdDialogId) throw new Error('No dialog');
    const res = await request(`/api/dialogs/${createdDialogId}/messages`, 'POST', {
      role: 'user',
      content: '请用一句话确认系统正常',
    });
    // 可能202(接受异步处理)或200
    if (res.status !== 200 && res.status !== 201 && res.status !== 202) {
      throw new Error(`Status ${res.status}: ${res.raw?.slice(0, 100)}`);
    }
  });

  // Step 8: 创建工作空间
  const wsRes = await step('8. 创建工作空间', async () => {
    const res = await request('/api/workspaces', 'POST', {
      name: 'E2E测试工作区',
      description: '自动测试创建',
      color: '0',
      isPublic: false,
    });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Status ${res.status}`);
    return res;
  });

  // Step 9: 检查审计日志
  await step('9. 检查审计日志', async () => {
    const res = await request('/api/security/audit-logs');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data?.data)) throw new Error('Not array');
  });

  // Step 10: 清理 (删除测试Agent和对话)
  await step('10. 清理测试数据', async () => {
    if (createdAgentId) {
      await request(`/api/agents/${createdAgentId}`, 'DELETE');
    }
    if (createdDialogId) {
      await request(`/api/dialogs/${createdDialogId}`, 'DELETE');
    }
  });

  // 报告
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 E2E测试报告`);
  console.log(`   通过: ${passed} | 失败: ${failed}`);
  if (failed === 0) {
    console.log(`   ✅ 端到端业务流程验证通过！`);
  } else {
    console.log(`   ⚠️ 有步骤失败，请检查后端日志`);
  }
  console.log(`=` .repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

runE2EFlow().catch(err => {
  console.error('\n💥 E2E测试异常中断:', err.message);
  process.exit(1);
});
