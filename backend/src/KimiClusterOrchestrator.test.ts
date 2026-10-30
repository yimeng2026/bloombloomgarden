import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  KimiClusterOrchestrator,
  loadKimiEndpoints,
  type ClawActivity,
  type KimiEndpoint,
} from './KimiClusterOrchestrator';
import type { AxisMessage } from './coordinator/AxisMessage';

function endpoint(id: string, overrides: Partial<KimiEndpoint> = {}): KimiEndpoint {
  return {
    id,
    baseUrl: `https://${id}.test/v1`,
    apiKey: `secret-${id}`,
    model: 'kimi-for-coding',
    weight: 1,
    currentLoad: 0,
    avgLatency: 1000,
    errorRate: 0,
    lastUsed: 0,
    capabilities: ['chat', 'code', 'analysis', 'planning', 'review'],
    maxConcurrency: 10,
    ...overrides,
  };
}

function activity(agentId: string, timestamp: number, overrides: Partial<ClawActivity> = {}): ClawActivity {
  return {
    timestamp,
    agentId,
    messageType: 'chat',
    tokenCount: 100,
    duration: 1000,
    success: true,
    modelUsed: 'kimi-for-coding',
    endpointId: 'kimi-1',
    ...overrides,
  };
}

function rpc(cluster: KimiClusterOrchestrator, action: string, data: Record<string, unknown> = {}) {
  const id = `test-${Date.now()}`;
  const source = {
    x: { type: 'test', action, id },
    y: { service: 'garden', version: '2.0' },
    z: { priority: 1 },
  };
  const target = {
    x: { type: 'service', action, id: 'kimi-cluster' },
    y: { service: 'kimi-cluster', version: '2.0' },
    z: { priority: 1 },
  };
  const message: AxisMessage = {
    id,
    header: { source, target, traceChain: [] },
    x: source.x,
    y: source.y,
    z: source.z,
    payload: { action, entity: 'kimi_cluster', data, metadata: {} },
    semantic_payload: { action, data },
    protocol_adapter: 'TEST',
    timestamp: new Date().toISOString(),
    traceId: id,
  };
  return cluster.handleRpc(message);
}

describe('KimiClusterOrchestrator', () => {
  let cluster: KimiClusterOrchestrator;
  let originalFetch: typeof fetch;
  let previousRetry: string | undefined;

  beforeEach(() => {
    cluster = new KimiClusterOrchestrator([
      endpoint('kimi-1'),
      endpoint('kimi-2', { currentLoad: 0.5, avgLatency: 2000, weight: 0.8 }),
      endpoint('kimi-3', { currentLoad: 0.8, avgLatency: 3000, weight: 0.5 }),
    ]);
    originalFetch = globalThis.fetch;
    previousRetry = process.env.KIMI_RETRY_BASE_MS;
    process.env.KIMI_RETRY_BASE_MS = '0';
  });

  function restore() {
    globalThis.fetch = originalFetch;
    if (previousRetry === undefined) delete process.env.KIMI_RETRY_BASE_MS;
    else process.env.KIMI_RETRY_BASE_MS = previousRetry;
  }

  it('uses load, latency, capabilities and fixed Kimi parameters', async () => {
    assert.equal(cluster.makeDecision('new', 'chat').endpointId, 'kimi-1');
    const internal = cluster['balancer'].getEndpoints();
    internal[0].currentLoad = 0.9;
    internal[1].currentLoad = 0.1;
    assert.equal(cluster.makeDecision('new', 'chat').endpointId, 'kimi-2');
    const capabilityCluster = new KimiClusterOrchestrator([
      endpoint('reader', { capabilities: ['chat'] }),
      endpoint('coder', { capabilities: ['chat', 'code'] }),
    ]);
    assert.equal(capabilityCluster.makeDecision('new', 'code').endpointId, 'coder');
    const decision = capabilityCluster.makeDecision('new', 'code');
    assert.equal(decision.model, 'kimi-for-coding');
    assert.equal(decision.temperature, 1);
    restore();
  });

  it('detects burst, sequential and interactive patterns without a timer', async () => {
    for (let i = 0; i < 11; i++) cluster.recordClawActivity(activity('burst', i * 1000));
    for (let i = 0; i < 5; i++) cluster.recordClawActivity(activity('sequence', i * 360000, { messageType: 'code' }));
    for (let i = 0; i < 3; i++) cluster.recordClawActivity(activity('interactive', i * 30000));
    const reply = await rpc(cluster, 'getPatterns');
    const patterns = (reply.payload.data as { patterns: Array<{ agentId: string; patternType: string }> }).patterns;
    assert.equal(patterns.find(p => p.agentId === 'burst')?.patternType, 'burst');
    assert.equal(patterns.find(p => p.agentId === 'sequence')?.patternType, 'sequential');
    assert.equal(patterns.find(p => p.agentId === 'interactive')?.patternType, 'interactive');
    restore();
  });

  it('keeps model identity fixed and budgets bounded by observed usage', async () => {
    for (let i = 0; i < 4; i++) {
      cluster.recordClawActivity(activity('heavy', i * 30000, { tokenCount: 50000, messageType: 'code' }));
    }
    const decision = cluster.makeDecision('heavy', 'code');
    assert.equal(decision.model, 'kimi-for-coding');
    assert.equal(decision.temperature, 1);
    assert.equal(decision.maxTokens, 16384);
    assert.ok(!decision.model.includes('moonshot-v1'));
    restore();
  });

  it('does not force a request when every endpoint is circuit-broken', async () => {
    const single = new KimiClusterOrchestrator([endpoint('only')]);
    globalThis.fetch = async () => new Response('unavailable', { status: 500 });
    for (let i = 0; i < 5; i++) {
      await assert.rejects(single.execute('agent', 'chat', { message: 'test' }));
    }
    assert.throws(() => single.makeDecision('agent', 'chat'), /No available Kimi endpoint/);
    restore();
  });

  it('loads node references from env without serializing their keys', async () => {
    const endpoints = loadKimiEndpoints({
      KIMI_CLUSTER_NODES: JSON.stringify([
        { id: 'a', baseUrl: 'https://a.test/v1', apiKeyEnv: 'KEY_A', maxConcurrency: 2 },
        { id: 'b', baseUrl: 'https://b.test/v1', apiKeyEnv: 'KEY_B', model: 'kimi-for-coding-highspeed' },
      ]),
      KEY_A: 'secret-a',
      KEY_B: 'secret-b',
    });
    assert.equal(endpoints.length, 2);
    assert.equal(endpoints[1].model, 'kimi-for-coding-highspeed');
    const configured = new KimiClusterOrchestrator(endpoints);
    const reply = await rpc(configured, 'getStatus');
    assert.ok(!JSON.stringify(reply.payload.data).includes('secret-a'));
    assert.ok(!JSON.stringify(reply.payload.data).includes('secret-b'));
    restore();
  });

  it('keeps reasoning separate and sends fixed model parameters', async () => {
    let requestBody: any;
    globalThis.fetch = async (_input, init) => {
      requestBody = JSON.parse(String(init?.body));
      return Response.json({
        id: 'answer-1', model: 'kimi-for-coding',
        choices: [{ message: { content: '正文', reasoning_content: '推理' }, finish_reason: 'stop' }],
        usage: { total_tokens: 12 },
      });
    };
    const result = await cluster.execute('research', 'chat', { message: '你好', maxTokens: 2048 });
    assert.equal(result.choices[0].message.content, '正文');
    assert.equal(result.choices[0].message.reasoning_content, '推理');
    assert.equal(requestBody.model, 'kimi-for-coding');
    assert.equal(requestBody.temperature, 1);
    assert.equal(requestBody.max_tokens, 2048);
    assert.ok(!JSON.stringify(cluster.getStats()).includes('secret-kimi-1'));
    restore();
  });

  it('fails over on 429 but rejects 400 without retrying', async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      if (calls === 1) return new Response('limited', { status: 429, headers: { 'Retry-After': '0' } });
      return Response.json({ choices: [{ message: { content: 'second node' } }] });
    };
    const result = await cluster.execute('research', 'chat', { message: 'test' });
    assert.equal(result.choices[0].message.content, 'second node');
    assert.equal(calls, 2);

    calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response('bad request', { status: 400 });
    };
    await assert.rejects(cluster.execute('research', 'chat', { message: 'bad' }), /400/);
    assert.equal(calls, 1);
    restore();
  });

  it('streams answer text only and rejects reasoning-only streams', async () => {
    globalThis.fetch = async () => new Response(
      'data: {"choices":[{"delta":{"reasoning_content":"hidden"}}]}\n\n' +
      'data: {"choices":[{"delta":{"content":"正文"}}]}\n\ndata: [DONE]\n\n',
      { status: 200 },
    );
    const chunks: string[] = [];
    await cluster.executeStream('research', 'chat', { message: 'test' }, chunk => chunks.push(chunk.content));
    assert.deepEqual(chunks, ['正文']);

    globalThis.fetch = async () => new Response(
      'data: {"choices":[{"delta":{"reasoning_content":"hidden"}}]}\n\ndata: [DONE]\n\n',
      { status: 200 },
    );
    await assert.rejects(
      cluster.executeStream('research', 'chat', { message: 'test' }, () => {}),
      /empty content/,
    );
    restore();
  });

  it('supports standard RPC status and activity emission', async () => {
    const status = await rpc(cluster, 'getStatus');
    assert.equal((status.payload.data as { endpoints: number }).endpoints, 3);
    const emitMessage = rpc(cluster, 'getPatterns');
    assert.ok((await emitMessage).payload.data);
    cluster['detector'].recordActivity(activity('emit-agent', Date.now()));
    assert.ok(cluster.getStats().activities >= 1);
    restore();
  });

  it('performs real health probes and reports partial availability honestly', async () => {
    globalThis.fetch = async input => new Response(null, {
      status: String(input).includes('kimi-1') ? 200 : 500,
    });
    const health = await cluster.healthCheck();
    assert.equal(health.status, 'healthy');
    assert.ok(health.latency >= 0);
    restore();
  });

  it('preserves nested gateway messages and tool definitions', async () => {
    const { normalizeKimiExecutionPayload } = await import('./KimiClusterPayload');
    const payload = normalizeKimiExecutionPayload({
      payload: {
        messages: [{ role: 'system', content: 'rules' }, { role: 'user', content: 'read stats' }],
        tools: [{ type: 'function', function: { name: 'garden_catalog' } }],
        toolChoice: 'auto',
        maxTokens: 512,
      },
    });
    let requestBody: any;
    globalThis.fetch = async (_input, init) => {
      requestBody = JSON.parse(String(init?.body));
      return Response.json({
        choices: [{ message: { content: '', tool_calls: [{ id: 'call-1' }] } }],
      });
    };
    await cluster.execute('research', 'chat', payload);
    assert.equal(requestBody.messages[1].content, 'read stats');
    assert.equal(requestBody.tools.length, 1);
    assert.equal(requestBody.tool_choice, 'auto');
    assert.equal(requestBody.max_tokens, 512);
    assert.equal(normalizeKimiExecutionPayload({ message: 'legacy' }).message, 'legacy');
    restore();
  });

  it('rejects empty gateway payloads before making a request', async () => {
    const { normalizeKimiExecutionPayload } = await import('./KimiClusterPayload');
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return Response.json({ choices: [{ message: { content: 'unexpected' } }] });
    };
    await assert.rejects(
      cluster.execute('research', 'chat', normalizeKimiExecutionPayload({ payload: {} })),
      /requires non-empty messages or message/,
    );
    assert.equal(calls, 0);
    restore();
  });
});
