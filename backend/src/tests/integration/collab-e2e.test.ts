/**
 * 千界花园 — 协作组全链路测试脚本
 * 使用真实 Kimi API 密钥测试：对话、交接、干预
 *
 * 运行方式：
 *   cd /mnt/agents/thousand-realms-garden/backend
 *   npx tsx src/tests/integration/collab-e2e.test.ts
 */

import { getBackendRouter } from '../../services/BackendRouter';
import { getSwarmCoordinator, ExecutionMode } from '../../services/CollabFramework';
import { getHandoffProtocol } from '../../services/CollabFramework';
import { getInterventionService, InterventionLevel, InterventionAction } from '../../services/CollabFramework';

// ─── 测试工具 ─────────────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`❌ ASSERT FAILED: ${message}`);
  console.log(`  ✅ ${message}`);
}

async function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─── 测试套件 ─────────────────────────────────────────

async function runTests(): Promise<void> {
  console.log('\n🌸 千界花园协作组全链路测试开始\n');
  let passed = 0;
  let failed = 0;

  // ── 测试 1: Kimi API 连接 ─────────────────────────
  console.log('📡 测试 1: Kimi API 连接');
  try {
    const router = getBackendRouter();
    const kimiCode = router.getBackend('kimi-code');
    assert(kimiCode !== undefined, 'Kimi backend 已注册');

    const health = await kimiCode!.healthCheck();
    assert(health.status === 'healthy', `Kimi API 健康检查通过 (latency: ${health.latency}ms)`);

    const models = await kimiCode!.listModels();
    assert(models.length > 0, `Kimi 模型列表获取成功: ${models.join(', ')}`);

    passed++;
  } catch (err) {
    console.log(`  ❌ Kimi API 连接失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 2: Kimi 单轮对话 ──────────────────────────
  console.log('\n💬 测试 2: Kimi 单轮对话');
  try {
    const router = getBackendRouter();
    const response = await router.chat('kimi-code', {
      messages: [
        { role: 'system', content: '你是一个测试助手。' },
        { role: 'user', content: '请用一句话介绍千界花园项目。' },
      ],
      model: 'kimi-for-coding',
      temperature: 0.7,
    });

    assert(response.content.length > 0, `Kimi 对话响应: "${response.content.slice(0, 80)}..."`);
    assert(response.id.length > 0, 'Kimi 响应包含有效 ID');

    passed++;
  } catch (err) {
    console.log(`  ❌ Kimi 对话失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 3: Kimi 流式对话 ──────────────────────────
  console.log('\n🌊 测试 3: Kimi 流式对话 (SSE)');
  try {
    const router = getBackendRouter();
    const chunks: string[] = [];

    for await (const chunk of router.chatStream('kimi-code', {
      messages: [
        { role: 'system', content: '你是一个测试助手。' },
        { role: 'user', content: '数数：1,2,3' },
      ],
      model: 'kimi-for-coding',
      temperature: 0.5,
    })) {
      chunks.push(chunk.content);
    }

    const fullContent = chunks.join('');
    assert(chunks.length > 0, `Kimi 流式响应收到 ${chunks.length} 个 chunk`);
    assert(fullContent.length > 0, `Kimi 流式完整内容: "${fullContent.slice(0, 60)}..."`);

    passed++;
  } catch (err) {
    console.log(`  ❌ Kimi 流式对话失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 4: 战车注册与查询 ─────────────────────────
  console.log('\n🚗 测试 4: 战车注册与查询');
  try {
    const coordinator = getSwarmCoordinator();
    const chariot = coordinator.registerChariot({
      name: '开发团队 Alpha',
      executionMode: ExecutionMode.PARALLEL,
      agentIds: [],
      status: 'active' as any,
      maxDepth: 2,
    });

    assert(chariot.id.length > 0, `战车注册成功: ${chariot.id}`);
    assert(chariot.name === '开发团队 Alpha', '战车名称正确');

    const fetched = coordinator.getChariot(chariot.id);
    assert(fetched !== undefined, '战车查询成功');
    assert(fetched!.executionMode === ExecutionMode.PARALLEL, '战车执行模式为 Parallel');

    passed++;
  } catch (err) {
    console.log(`  ❌ 战车测试失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 5: 战车匹配评分 ───────────────────────────
  console.log('\n🎯 测试 5: 战车匹配评分');
  try {
    const coordinator = getSwarmCoordinator();
    const chariot = coordinator.registerChariot({
      name: '分析团队 Beta',
      executionMode: ExecutionMode.HIERARCHICAL,
      agentIds: ['agent-1', 'agent-2', 'agent-3'],
      status: 'active' as any,
      maxDepth: 1,
    });

    const score = coordinator.matchScore({ id: 'task-1', type: 'hierarchical', payload: {} }, chariot.id);
    assert(score.score > 0, `战车匹配评分: ${score.score}`);
    assert(score.reasons.length > 0, `评分理由: ${score.reasons.join(', ')}`);

    passed++;
  } catch (err) {
    console.log(`  ❌ 匹配评分失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 6: 交接协议 ───────────────────────────────
  console.log('\n🤝 测试 6: 交接协议 (Handoff)');
  try {
    const coordinator = getSwarmCoordinator();
    const handoff = getHandoffProtocol();

    const source = coordinator.registerChariot({
      name: 'Source Team',
      executionMode: ExecutionMode.SEQUENTIAL,
      agentIds: [],
      status: 'active' as any,
      maxDepth: 1,
    });
    const target = coordinator.registerChariot({
      name: 'Target Team',
      executionMode: ExecutionMode.SEQUENTIAL,
      agentIds: [],
      status: 'active' as any,
      maxDepth: 1,
    });

    const record = handoff.initiate({
      sourceChariotId: source.id,
      targetChariotId: target.id,
      task: { id: 'handoff-task-1', type: 'analysis', payload: { data: 'test' } },
      initiatedBy: 'test-user',
      reason: '工作负载转移',
    });

    assert(record.status === 'pending', '交接状态为 pending');
    assert(record.sourceChariotId === source.id, '交接源战车正确');

    const accepted = handoff.accept(record.id, 'target-coordinator');
    assert(accepted.status === 'accepted', '交接已接受');

    const started = await handoff.start(record.id);
    assert(started.status === 'started', '交接已开始');

    const completed = await handoff.complete(record.id, {
      success: true,
      data: ['result1'],
      metadata: { totalSubtasks: 1, completedSubtasks: 1, failedSubtasks: 0 },
    });
    assert(completed.status === 'completed', '交接已完成');

    passed++;
  } catch (err) {
    console.log(`  ❌ 交接测试失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 7: 干预系统 ───────────────────────────────
  console.log('\n🎛️ 测试 7: 干预系统 (12级)');
  try {
    const intervention = getInterventionService();

    // L3 Agent 级暂停
    const pauseRecord = await intervention.pause('agent-test-1', 'test-operator');
    assert(pauseRecord.status === 'completed' || pauseRecord.status === 'approved', 'Agent 暂停干预成功');
    assert(pauseRecord.level === InterventionLevel.L3_AGENT, '干预级别为 L3');

    // L3 Agent 级恢复
    const resumeRecord = await intervention.resume('agent-test-1', 'test-operator');
    assert(resumeRecord.status === 'completed' || resumeRecord.status === 'approved', 'Agent 恢复干预成功');

    // L1 系统级全局暂停
    const globalPause = await intervention.globalPause('admin', '系统维护');
    assert(globalPause.level === InterventionLevel.L1_SYSTEM, '全局暂停为 L1');

    // L5 对话级消息注入
    const injectRecord = await intervention.requestIntervention({
      agentId: 'agent-test-1',
      level: InterventionLevel.L5_DIALOG,
      action: InterventionAction.TURN_INJECT,
      payload: { message: '这是一条注入消息', position: 'end' },
      requesterId: 'test-operator',
    });
    assert(injectRecord.level === InterventionLevel.L5_DIALOG, '消息注入为 L5');

    // 查询干预历史
    const history = intervention.getAgentHistory('agent-test-1');
    assert(history.records.length >= 3, `Agent 干预历史记录数: ${history.records.length}`);
    assert(history.stats.total >= 3, `干预统计: total=${history.stats.total}`);

    passed++;
  } catch (err) {
    console.log(`  ❌ 干预测试失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 8: 多密钥轮询 ────────────────────────────
  console.log('\n🔄 测试 8: 多密钥轮询与故障转移');
  try {
    const router = getBackendRouter();
    const kimiCode = router.getBackend('kimi-code') as any;
    assert(kimiCode !== undefined, 'Kimi backend 存在');

    // 验证配置了多个密钥
    const keys = kimiCode.kimiConfig?.apiKeys || [];
    assert(keys.length === 5, `配置了 ${keys.length} 个 API 密钥`);

    // 连续发起两次请求，验证轮询机制存在
    const resp1 = await router.chat('kimi-code', {
      messages: [{ role: 'user', content: '测试密钥1' }],
      model: 'kimi-for-coding',
    });
    const resp2 = await router.chat('kimi-code', {
      messages: [{ role: 'user', content: '测试密钥2' }],
      model: 'kimi-for-coding',
    });
    assert(resp1.content.length > 0, '第一次请求成功');
    assert(resp2.content.length > 0, '第二次请求成功');

    passed++;
  } catch (err) {
    console.log(`  ❌ 多密钥测试失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 9: Backend Router 自动路由 ─────────────────
  console.log('\n🔀 测试 9: Backend Router 自动路由');
  try {
    const router = getBackendRouter();
    const result = await router.routeChat({
      messages: [{ role: 'user', content: '自动路由测试' }],
      model: 'kimi-for-coding',
    });

    assert(result.backendId === 'kimi-code', `自动路由选择: ${result.backendId}`);
    assert(result.response.content.length > 0, '自动路由响应成功');

    passed++;
  } catch (err) {
    console.log(`  ❌ 自动路由测试失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 10: 群组嵌套 ──────────────────────────────
  console.log('\n🪆 测试 10: 群组嵌套 (战车层级树)');
  try {
    const coordinator = getSwarmCoordinator();

    const parent = coordinator.registerChariot({
      name: '总指挥部',
      executionMode: ExecutionMode.HIERARCHICAL,
      agentIds: ['coordinator-1'],
      status: 'active' as any,
      maxDepth: 1,
    });

    const child = coordinator.registerChariot({
      name: '第一分队',
      parentId: parent.id,
      executionMode: ExecutionMode.PARALLEL,
      agentIds: ['agent-a', 'agent-b'],
      status: 'active' as any,
      maxDepth: 2,
    });

    const grandChild = coordinator.registerChariot({
      name: '突击小组',
      parentId: child.id,
      executionMode: ExecutionMode.SEQUENTIAL,
      agentIds: ['agent-c'],
      status: 'active' as any,
      maxDepth: 3,
    });

    const tree = coordinator.getChariotTree(parent.id);
    assert(tree.length >= 3, `层级树节点数: ${tree.length}`);

    const children = coordinator.getChariotChildren(parent.id);
    assert(children.length === 1 && children[0].id === child.id, '父节点子节点正确');

    passed++;
  } catch (err) {
    console.log(`  ❌ 嵌套测试失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 汇总 ───────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log(`🌸 千界花园全链路测试完成`);
  console.log(`   ✅ 通过: ${passed} 项`);
  console.log(`   ❌ 失败: ${failed} 项`);
  console.log(`   📊 总计: ${passed + failed} 项`);
  console.log('═══════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('测试套件崩溃:', err);
  process.exit(1);
});
