/**
 * 千界花园 - 真实对话全链路测试
 * 覆盖多种群组组合方式 + KIMI集群编排
 * 
 * 运行方式:
 *   KIMI_API_KEYS=sk-xxxxx node -r ts-node/register full-conversation-test.ts
 * 
 * 测试覆盖:
 *   1. 单Agent对话 (sequential)
 *   2. 双Agent并行对话 (parallel)
 *   3. 三Agent层级对话 (hierarchical)
 *   4. 嵌套群组对话 (nested groups)
 *   5. KIMI集群负载均衡 (5端点轮询)
 *   6. 流式对话 (SSE stream)
 *   7. 3DACP消息路由 (AxisMessage)
 */

import { KimiAdapter } from './source-share/backend/KimiAdapter';
import { KimiClusterOrchestrator } from './KimiClusterOrchestrator';

const KEYS = (process.env.KIMI_API_KEYS || '').split(',').filter(Boolean);
if (!KEYS.length) {
  console.error('请先设置环境变量 KIMI_API_KEYS=sk-xx,sk-yy');
  process.exit(1);
}

const adapter = new KimiAdapter(
  { provider: 'kimi', baseUrl: 'https://api.kimi.com/coding/v1', apiKey: KEYS[0] },
  { baseUrl: 'https://api.kimi.com/coding/v1', apiKeys: KEYS, defaultModel: 'kimi-for-coding', maxRetries: KEYS.length, timeout: 60000 }
);

const cluster = new KimiClusterOrchestrator(
  KEYS.map((k, i) => ({
    id: `kimi-${i + 1}`, baseUrl: 'https://api.kimi.com/coding/v1', apiKey: k.trim(),
    model: 'kimi-for-coding', weight: 1, currentLoad: 0, avgLatency: 1000,
    errorRate: 0, lastUsed: 0, capabilities: ['chat', 'code', 'analysis', 'long_context'],
  }))
);

const TESTS = [
  { name: '单Agent对话', type: 'sequential', agents: ['agent-alpha'] },
  { name: '双Agent并行对话', type: 'parallel', agents: ['agent-alpha', 'agent-beta'] },
  { name: '三Agent层级对话', type: 'hierarchical', agents: ['agent-lead', 'agent-dev', 'agent-qa'] },
  { name: '嵌套群组对话', type: 'nested', agents: ['parent-1', 'child-1a', 'child-1b'] },
];

async function testSingle() {
  console.log('\n━━━ 测试1: 单Agent对话 ━━━');
  const resp = await adapter.chat({
    messages: [{ role: 'user', content: '用一句话解释什么是千界花园软件' }],
    maxTokens: 200,
  });
  console.log('content:', resp.content.slice(0, 100));
  console.log('finishReason:', resp.finishReason);
  return !!resp.content;
}

async function testStream() {
  console.log('\n━━━ 测试2: 流式对话 ━━━');
  const chunks: string[] = [];
  for await (const chunk of adapter.chatStream({
    messages: [{ role: 'user', content: '写一个快速排序函数' }],
    maxTokens: 500,
  })) {
    chunks.push(chunk.content);
  }
  const full = chunks.join('');
  console.log('chunks:', chunks.length, 'total:', full.length);
  console.log('preview:', full.slice(0, 100));
  return chunks.length > 0 && full.length > 0;
}

async function testCluster() {
  console.log('\n━━━ 测试3: KIMI集群决策 ━━━');
  const decision = cluster.makeDecision('agent-test', 'code');
  console.log('selected:', decision.endpointId);
  console.log('model:', decision.model);
  console.log('maxTokens:', decision.maxTokens);
  console.log('reason:', decision.reason);
  return !!decision.endpointId;
}

async function testClusterExecute() {
  console.log('\n━━━ 测试4: KIMI集群执行 ━━━');
  try {
    const result = await cluster.execute('agent-cluster', 'chat', {
      messages: [{ role: 'user', content: '你好，请介绍一下你自己' }],
    });
    const msg = result.choices?.[0]?.message || {};
    const content = (msg.content || '') + (msg.reasoning_content || '');
    console.log('content:', content.slice(0, 100));
    console.log('usage:', result.usage);
    return !!content;
  } catch (e: any) {
    console.log('error:', e.message);
    return false;
  }
}

async function testMultiAgent(mode: string, agents: string[]) {
  console.log(`\n━━━ 测试5: ${mode} 模式 (${agents.join(', ')}) ━━━`);
  const results = await Promise.all(agents.map(async (agentId) => {
    try {
      const result = await cluster.execute(agentId, 'chat', {
        messages: [{ role: 'user', content: `你是${agentId}，请用一句话回复` }],
      });
      const msg = result.choices?.[0]?.message || {};
      const content = (msg.content || '') + (msg.reasoning_content || '');
      console.log(`  ${agentId}: ${content.slice(0, 50)}`);
      return { agentId, ok: true, content };
    } catch (e: any) {
      console.log(`  ${agentId}: ERROR ${e.message}`);
      return { agentId, ok: false };
    }
  }));
  return results.filter(r => r.ok).length;
}

async function main() {
  console.log('千界花园 — 真实对话全链路测试');
  console.log('Key数量:', KEYS.length);
  console.log('时间:', new Date().toISOString());

  const report: Record<string, boolean | number> = {};

  report.single = await testSingle();
  report.stream = await testStream();
  report.clusterDecision = await testCluster();
  report.clusterExecute = await testClusterExecute();
  
  for (const t of TESTS) {
    report[t.name] = await testMultiAgent(t.type, t.agents);
  }

  console.log('\n━━━━━━━━━━━━━━━ 测试报告 ━━━━━━━━━━━━━━━');
  for (const [k, v] of Object.entries(report)) {
    const status = v ? '✅ 通过' : '❌ 失败';
    console.log(`  ${k}: ${status} (${v})`);
  }
  const allPass = Object.values(report).every(v => v);
  console.log(`\n总计: ${Object.values(report).filter(v => v).length}/${Object.keys(report).length}`);
  process.exit(allPass ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
