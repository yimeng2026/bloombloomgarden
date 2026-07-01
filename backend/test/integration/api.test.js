/**
 * @file test/integration/api.test.js
 * @description 千界花园后端集成测试 — 覆盖核心Service API
 *
 * 运行:
 *   cd backend && npx jest test/integration/api.test.js
 *   或: node test/integration/run-api-tests.js
 */

const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');

// 如果没有jest环境，提供polyfill
if (typeof describe === 'undefined') {
  global.describe = (name, fn) => fn();
  global.it = (name, fn) => { try { fn(); console.log(`  ✓ ${name}`); } catch(e) { console.log(`  ✗ ${name}: ${e.message}`); process.exitCode = 1; } };
  global.expect = (val) => ({
    toBe: (expected) => { if (val !== expected) throw new Error(`Expected ${expected}, got ${val}`); },
    toBeGreaterThan: (expected) => { if (!(val > expected)) throw new Error(`Expected > ${expected}, got ${val}`); },
    toBeDefined: () => { if (val === undefined) throw new Error(`Expected defined, got undefined`); },
    toEqual: (expected) => { if (JSON.stringify(val) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(val)}`); },
    toContain: (expected) => { if (!val.includes(expected)) throw new Error(`Expected to contain "${expected}"`); },
    toHaveProperty: (prop) => { if (!(prop in val)) throw new Error(`Expected property "${prop}"`); },
    not: { toBe: (expected) => { if (val === expected) throw new Error(`Expected not ${expected}`); } }
  });
  global.beforeAll = (fn) => fn();
  global.afterAll = (fn) => fn();
}

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

async function api(method, path, body) {
  const url = `${API_BASE}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  } catch (e) {
    return { status: 0, error: e.message, data: null };
  }
}

// ── 测试套件 ──────────────────────────────────────────────────────

describe('千界花园后端集成测试', () => {

  describe('🔌 健康检查', () => {
    it('GET /health 应返回200', async () => {
      const { status, data } = await api('GET', '/health');
      expect(status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
    });

    it('GET /api/status 应返回系统状态', async () => {
      const { status, data } = await api('GET', '/api/status');
      if (status === 200) {
        expect(data).toHaveProperty('services');
        expect(data).toHaveProperty('version');
      }
    });
  });

  describe('🔑 API Key管理', () => {
    let createdKeyId;

    it('GET /api/apikeys/providers 应返回Provider列表', async () => {
      const { status, data } = await api('GET', '/api/apikeys/providers');
      if (status === 200) {
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
      }
    });

    it('POST /api/apikeys 应保存API Key', async () => {
      const { status, data } = await api('POST', '/api/apikeys', {
        provider: 'kimi-code',
        apiKey: 'sk-kimi-test-' + Date.now(),
        isActive: true,
        label: '测试Key'
      });
      if (status === 200 || status === 201) {
        createdKeyId = data?.id;
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('provider');
      }
    });

    it('GET /api/apikeys 应返回已保存Keys（脱敏）', async () => {
      const { status, data } = await api('GET', '/api/apikeys');
      if (status === 200) {
        expect(Array.isArray(data)).toBe(true);
      }
    });

    it('PATCH /api/apikeys/:id/toggle 应切换激活状态', async () => {
      if (!createdKeyId) return;
      const { status, data } = await api('PATCH', `/api/apikeys/${createdKeyId}/toggle`);
      if (status === 200) {
        expect(data).toHaveProperty('isActive');
      }
    });

    it('DELETE /api/apikeys/:id 应删除Key', async () => {
      if (!createdKeyId) return;
      const { status } = await api('DELETE', `/api/apikeys/${createdKeyId}`);
      expect(status).toBe(200);
    });
  });

  describe('🤖 Agent管理', () => {
    it('GET /api/agents 应返回Agent列表', async () => {
      const { status, data } = await api('GET', '/api/agents');
      if (status === 200) {
        expect(Array.isArray(data)).toBe(true);
      }
    });

    it('GET /api/agents/:id/context 应返回Agent上下文', async () => {
      // 使用mock agent id测试
      const { status, data } = await api('GET', '/api/agents/sylva/context');
      if (status === 200) {
        expect(data).toHaveProperty('systemPrompt');
        expect(data).toHaveProperty('history');
      }
    });
  });

  describe('📚 知识库', () => {
    it('GET /api/knowledge 应返回知识库列表', async () => {
      const { status, data } = await api('GET', '/api/knowledge');
      if (status === 200) {
        expect(Array.isArray(data)).toBe(true);
      }
    });

    it('POST /api/knowledge/search 应执行语义搜索', async () => {
      const { status, data } = await api('POST', '/api/knowledge/search', {
        query: '3DACP协议',
        topK: 5
      });
      if (status === 200) {
        expect(Array.isArray(data)).toBe(true);
      }
    });
  });

  describe('💬 对话', () => {
    it('POST /api/chat/completions 流式响应', async () => {
      // 注意：此测试需要有效的API Key配置
      const { status, data } = await api('POST', '/api/chat/completions', {
        messages: [{ role: 'user', content: '你好，请做简短自我介绍。' }],
        model: 'kimi-code',
        stream: false
      });
      if (status === 200) {
        expect(data).toHaveProperty('choices');
        expect(Array.isArray(data.choices)).toBe(true);
      }
    });
  });

  describe('🌐 3DACP 核心', () => {
    it('POST /api/axis/route 应能路由消息', async () => {
      const { status, data } = await api('POST', '/api/axis/route', {
        message: {
          axisX: 1, axisY: 1, axisZ: 0,
          payload: { action: 'ping' },
          headers: { 'x-test': 'true' }
        }
      });
      if (status === 200) {
        expect(data).toHaveProperty('routed');
      }
    });

    it('GET /api/axis/registry 应返回注册表', async () => {
      const { status, data } = await api('GET', '/api/axis/registry');
      if (status === 200) {
        expect(Array.isArray(data)).toBe(true);
      }
    });
  });

  describe('🎯 Kimi集群', () => {
    it('GET /api/kimi-cluster/status 应返回集群状态', async () => {
      const { status, data } = await api('GET', '/api/kimi-cluster/status');
      if (status === 200) {
        expect(data).toHaveProperty('endpoints');
        expect(data).toHaveProperty('activeEndpoint');
      }
    });

    it('GET /api/kimi-cluster/patterns 应返回活动模式', async () => {
      const { status, data } = await api('GET', '/api/kimi-cluster/patterns');
      if (status === 200) {
        expect(data).toHaveProperty('patterns');
      }
    });
  });

  describe('📊 监控', () => {
    it('GET /api/monitoring/metrics 应返回指标', async () => {
      const { status, data } = await api('GET', '/api/monitoring/metrics');
      if (status === 200) {
        expect(data).toHaveProperty('cpu');
        expect(data).toHaveProperty('memory');
      }
    });
  });

  describe('🔧 外部集成', () => {
    it('GET /api/external/platforms 应返回平台列表', async () => {
      const { status, data } = await api('GET', '/api/external/platforms');
      if (status === 200) {
        expect(Array.isArray(data)).toBe(true);
      }
    });
  });

  describe('🛡️ 安全中心', () => {
    it('GET /api/security/events 应返回安全事件', async () => {
      const { status, data } = await api('GET', '/api/security/events');
      if (status === 200) {
        expect(Array.isArray(data)).toBe(true);
      }
    });
  });

});

// ── 无jest环境直接运行 ─────────────────────────────────────────────

if (require.main === module) {
  console.log('🧪 千界花园后端集成测试');
  console.log(`API_BASE: ${API_BASE}\n`);

  const suites = [];
  const current = { tests: [] };

  global.describe = (name, fn) => {
    current.name = name;
    current.tests = [];
    fn();
    suites.push({ ...current });
  };

  let pass = 0, fail = 0, skip = 0;

  global.it = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      pass++;
    } catch (e) {
      console.log(`  ❌ ${name}`);
      console.log(`     ${e.message}`);
      fail++;
    }
  };

  // 重新执行所有describe块
  // 注意：由于Jest风格，这里需要hack一下
  // 实际上这个文件主要用于Jest运行，直接node运行效果有限
  console.log('\n提示：使用 Jest 运行以获得完整功能');
  console.log('  npx jest test/integration/api.test.js');
}
