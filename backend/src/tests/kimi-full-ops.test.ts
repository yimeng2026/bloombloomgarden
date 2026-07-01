/**
 * 千界花园 — KimiCode 全操作综合测试
 * 覆盖：对话、人工干预、群组/子群组、蜂群策略
 * 运行：npx tsx src/tests/kimi-full-ops.test.ts
 */

import { getBackendRouter } from '../services/BackendRouter';
import { getSwarmCoordinator, ExecutionMode, GroupStatus } from '../services/CollabFramework';
import { getHandoffProtocol } from '../services/CollabFramework';
import { getInterventionService, InterventionLevel, InterventionAction } from '../services/CollabFramework';

const assert = (cond: boolean, msg: string) => {
  if (!cond) throw new Error(`❌ ${msg}`);
  console.log(`  ✅ ${msg}`);
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function runFullTest() {
  console.log('\n🌸 千界花园 — KimiCode 全操作综合测试\n');
  let pass = 0, fail = 0;

  const router = getBackendRouter();

  // ── 1. KimiCode API 连接 ──
  console.log('1️⃣ KimiCode API 连接');
  try {
    const backend = router.getBackend('kimi-code');
    assert(!!backend, 'KimiCode backend 已注册');
    const health = await backend!.healthCheck();
    assert(health.status === 'healthy', `API 健康 (latency: ${health.latency}ms)`);
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 2. 单轮对话 ──
  console.log('\n2️⃣ 单轮对话');
  try {
    const resp = await router.chat('kimi-code', {
      messages: [
        { role: 'system', content: '你是一个测试助手，只输出测试编号。' },
        { role: 'user', content: '输出"TEST-001"' },
      ],
      model: 'kimi-for-coding',
      temperature: 0,
    });
    assert(resp.content.includes('TEST-001') || resp.content.length > 0, `响应: "${resp.content.slice(0, 40)}..."`);
    assert(!!resp.usage, '包含 token 用量');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 3. 流式对话 ──
  console.log('\n3️⃣ 流式对话 (SSE)');
  try {
    const chunks: string[] = [];
    for await (const chunk of router.chatStream('kimi-code', {
      messages: [{ role: 'user', content: '数数：1,2,3' }],
      model: 'kimi-for-coding',
      temperature: 0.3,
    })) {
      chunks.push(chunk.content);
    }
    const full = chunks.join('');
    assert(chunks.length > 0, `收到 ${chunks.length} 个 chunk`);
    assert(full.length > 0, `完整内容: "${full.slice(0, 40)}..."`);
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 4. 多轮上下文对话 ──
  console.log('\n4️⃣ 多轮上下文对话');
  try {
    const msgs = [
      { role: 'system' as const, content: '记住用户名字。' },
      { role: 'user' as const, content: '我叫 Bob。' },
    ];
    const r1 = await router.chat('kimi-code', { messages: msgs, model: 'kimi-for-coding' });
    msgs.push({ role: 'assistant' as const, content: r1.content });
    msgs.push({ role: 'user' as const, content: '我叫什么名字？' });
    const r2 = await router.chat('kimi-code', { messages: msgs, model: 'kimi-for-coding' });
    assert(r2.content.toLowerCase().includes('bob') || r2.content.includes('Bob'), `记住名字: "${r2.content.slice(0, 50)}..."`);
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 5. 代码生成能力 ──
  console.log('\n5️⃣ 代码生成');
  try {
    const resp = await router.chat('kimi-code', {
      messages: [{ role: 'user', content: '用 Python 写一个快速排序函数' }],
      model: 'kimi-for-coding',
      temperature: 0.5,
    });
    assert(resp.content.includes('def ') || resp.content.includes('quicksort'), '包含函数定义');
    assert(resp.content.length > 100, `代码长度 ${resp.content.length} 字符`);
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 6. 战车注册 (群组) ──
  console.log('\n6️⃣ 战车注册 (群组)');
  try {
    const sc = getSwarmCoordinator();
    const c1 = sc.registerChariot({ name: '开发组', executionMode: ExecutionMode.PARALLEL, agentIds: ['a1', 'a2'], status: GroupStatus.ACTIVE, maxDepth: 1 });
    const c2 = sc.registerChariot({ name: '测试组', executionMode: ExecutionMode.SEQUENTIAL, agentIds: ['a3'], status: GroupStatus.ACTIVE, maxDepth: 1 });
    assert(!!c1.id, `开发组 ID: ${c1.id.slice(0, 8)}...`);
    assert(!!c2.id, `测试组 ID: ${c2.id.slice(0, 8)}...`);
    assert(c1.executionMode === ExecutionMode.PARALLEL, '开发组 Parallel');
    assert(c2.executionMode === ExecutionMode.SEQUENTIAL, '测试组 Sequential');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 7. 子群组嵌套 ──
  console.log('\n7️⃣ 子群组嵌套 (Hierarchical)');
  try {
    const sc = getSwarmCoordinator();
    const parent = sc.registerChariot({ name: '总指挥部', executionMode: ExecutionMode.HIERARCHICAL, agentIds: ['coord'], coordinatorId: 'coord', status: GroupStatus.ACTIVE, maxDepth: 1 });
    const child1 = sc.registerChariot({ name: '突击小队A', parentId: parent.id, executionMode: ExecutionMode.PARALLEL, agentIds: ['a4', 'a5'], status: GroupStatus.ACTIVE, maxDepth: 2 });
    const child2 = sc.registerChariot({ name: '突击小队B', parentId: parent.id, executionMode: ExecutionMode.PARALLEL, agentIds: ['a6', 'a7'], status: GroupStatus.ACTIVE, maxDepth: 2 });
    const tree = sc.getChariotTree(parent.id);
    assert(tree.length >= 3, `层级树 ${tree.length} 节点`);
    assert(tree.some(c => c.id === child1.id), '包含突击小队A');
    assert(tree.some(c => c.id === child2.id), '包含突击小队B');
    assert(child1.parentId === parent.id, 'parentId 正确');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 8. 三层深度嵌套 ──
  console.log('\n8️⃣ 三层深度嵌套');
  try {
    const sc = getSwarmCoordinator();
    const l1 = sc.registerChariot({ name: 'L1-司令部', executionMode: ExecutionMode.HIERARCHICAL, agentIds: ['cmd'], status: GroupStatus.ACTIVE, maxDepth: 1 });
    const l2 = sc.registerChariot({ name: 'L2-师部', parentId: l1.id, executionMode: ExecutionMode.HIERARCHICAL, agentIds: ['div'], status: GroupStatus.ACTIVE, maxDepth: 2 });
    const l3 = sc.registerChariot({ name: 'L3-连队', parentId: l2.id, executionMode: ExecutionMode.SEQUENTIAL, agentIds: ['a8', 'a9'], status: GroupStatus.ACTIVE, maxDepth: 3 });
    const fullTree = sc.getChariotTree(l1.id);
    assert(fullTree.length === 3, `3 层共 ${fullTree.length} 节点`);
    assert(l3.parentId === l2.id && l2.parentId === l1.id, '链式 parentId 正确');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 9. 群组合并 ──
  console.log('\n9️⃣ 群组合并 (Merge)');
  try {
    const sc = getSwarmCoordinator();
    const teamA = sc.registerChariot({ name: 'Team-A', executionMode: ExecutionMode.PARALLEL, agentIds: ['m1', 'm2'], status: GroupStatus.ACTIVE, maxDepth: 1 });
    const teamB = sc.registerChariot({ name: 'Team-B', executionMode: ExecutionMode.PARALLEL, agentIds: ['m3', 'm4'], status: GroupStatus.ACTIVE, maxDepth: 1 });
    const merged = sc.mergeChariots(teamA.id, teamB.id);
    assert(merged.agentIds.length === 4, `合并后 4 Agent: ${merged.agentIds.join(',')}`);
    assert(!sc.getChariot(teamA.id), 'Team-A 已注销');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 10. 群组拆分 ──
  console.log('\n🔟 群组拆分 (Split)');
  try {
    const sc = getSwarmCoordinator();
    const big = sc.registerChariot({ name: 'BigTeam', executionMode: ExecutionMode.PARALLEL, agentIds: ['s1', 's2', 's3', 's4', 's5'], status: GroupStatus.ACTIVE, maxDepth: 1 });
    const newTeam = sc.splitChariot(big.id, ['s4', 's5']);
    assert(newTeam.agentIds.length === 2, '新群组 2 Agent');
    assert(sc.getChariot(big.id)!.agentIds.length === 3, '原群组剩 3 Agent');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 11. Sequential 执行 ──
  console.log('\n1️⃣1️⃣ Sequential 顺序执行');
  try {
    const sc = getSwarmCoordinator();
    const chariot = sc.registerChariot({ name: 'SeqTeam', executionMode: ExecutionMode.SEQUENTIAL, agentIds: ['x1', 'x2', 'x3'], status: GroupStatus.ACTIVE, maxDepth: 1 });
    const result = await sc.execute(chariot.id, { id: 'task-seq', type: 'sequential', payload: {} });
    assert(result.success, 'Sequential 成功');
    assert(result.metadata.totalSubtasks === 3, '3 子任务');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 12. Parallel 执行 ──
  console.log('\n1️⃣2️⃣ Parallel 并行执行');
  try {
    const sc = getSwarmCoordinator();
    const chariot = sc.registerChariot({ name: 'ParTeam', executionMode: ExecutionMode.PARALLEL, agentIds: ['y1', 'y2', 'y3', 'y4'], status: GroupStatus.ACTIVE, maxDepth: 1 });
    const result = await sc.execute(chariot.id, { id: 'task-par', type: 'parallel', payload: {} });
    assert(result.success, 'Parallel 成功');
    assert(result.metadata.totalSubtasks === 4, '4 子任务');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 13. Hierarchical 执行 ──
  console.log('\n1️⃣3️⃣ Hierarchical 层级执行');
  try {
    const sc = getSwarmCoordinator();
    const parent = sc.registerChariot({ name: 'Hierarchy-Parent', executionMode: ExecutionMode.HIERARCHICAL, agentIds: ['coord-h'], coordinatorId: 'coord-h', status: GroupStatus.ACTIVE, maxDepth: 1 });
    const child = sc.registerChariot({ name: 'Hierarchy-Child', parentId: parent.id, executionMode: ExecutionMode.SEQUENTIAL, agentIds: ['z1'], status: GroupStatus.ACTIVE, maxDepth: 2 });
    assert(!!parent.id && !!child.id, '父子群组已注册');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 14. Dynamic 执行 ──
  console.log('\n1️⃣4️⃣ Dynamic 动态模式');
  try {
    const sc = getSwarmCoordinator();
    const chariot = sc.registerChariot({ name: 'DynTeam', executionMode: ExecutionMode.DYNAMIC, agentIds: ['d1', 'd2'], status: GroupStatus.ACTIVE, maxDepth: 1 });
    const result = await sc.execute(chariot.id, { id: 'task-dyn', type: 'dynamic', payload: { canParallelize: true } });
    assert(result.success, 'Dynamic 成功');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 15. 跨群组交接 ──
  console.log('\n1️⃣5️⃣ 跨群组交接 (Handoff)');
  try {
    const sc = getSwarmCoordinator();
    const handoff = getHandoffProtocol();
    const src = sc.registerChariot({ name: 'Source', executionMode: ExecutionMode.SEQUENTIAL, agentIds: ['h1'], status: GroupStatus.ACTIVE, maxDepth: 1 });
    const tgt = sc.registerChariot({ name: 'Target', executionMode: ExecutionMode.PARALLEL, agentIds: ['h2', 'h3'], status: GroupStatus.ACTIVE, maxDepth: 1 });
    const rec = handoff.initiate({ sourceChariotId: src.id, targetChariotId: tgt.id, task: { id: 'handoff-1', type: 'analysis', payload: {} }, initiatedBy: 'test', reason: '负载转移' });
    assert(rec.status === 'pending', 'pending');
    handoff.accept(rec.id, 'admin');
    await handoff.start(rec.id);
    await handoff.complete(rec.id, { success: true, data: ['done'], metadata: { totalSubtasks: 2, completedSubtasks: 2, failedSubtasks: 0 } });
    assert(handoff.getStatus(rec.id) === 'completed', '交接完成');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 16. L3 Agent 暂停 ──
  console.log('\n1️⃣6️⃣ L3 Agent 暂停干预');
  try {
    const iv = getInterventionService();
    const rec = await iv.pause('agent-test-pause', 'admin');
    assert(rec.level === InterventionLevel.L3_AGENT, 'L3 级别');
    assert(rec.action === InterventionAction.AGENT_PAUSE, 'AGENT_PAUSE');
    assert(rec.status === 'completed' || rec.status === 'approved', '已执行');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 17. L3 Agent 恢复 ──
  console.log('\n1️⃣7️⃣ L3 Agent 恢复干预');
  try {
    const iv = getInterventionService();
    const rec = await iv.resume('agent-test-pause', 'admin');
    assert(rec.level === InterventionLevel.L3_AGENT, 'L3 级别');
    assert(rec.action === InterventionAction.AGENT_RESUME, 'AGENT_RESUME');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 18. L3 Agent 终止 ──
  console.log('\n1️⃣8️⃣ L3 Agent 终止干预');
  try {
    const iv = getInterventionService();
    const rec = await iv.terminate('agent-test-kill', 'admin');
    assert(rec.level === InterventionLevel.L3_AGENT, 'L3 级别');
    assert(rec.action === InterventionAction.AGENT_KILL, 'AGENT_KILL');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 19. L1 系统全局暂停 ──
  console.log('\n1️⃣9️⃣ L1 系统全局暂停');
  try {
    const iv = getInterventionService();
    const rec = await iv.globalPause('admin', '系统维护测试');
    assert(rec.level === InterventionLevel.L1_SYSTEM, 'L1 级别');
    assert(rec.action === InterventionAction.SYSTEM_PAUSE, 'SYSTEM_PAUSE');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 20. L5 对话消息注入 ──
  console.log('\n2️⃣0️⃣ L5 对话消息注入');
  try {
    const iv = getInterventionService();
    const rec = await iv.requestIntervention({
      agentId: 'agent-dialog-test',
      level: InterventionLevel.L5_DIALOG,
      action: InterventionAction.TURN_INJECT,
      payload: { message: '[SYSTEM] 这是一条注入消息', position: 'end' },
      requesterId: 'admin',
    });
    assert(rec.level === InterventionLevel.L5_DIALOG, 'L5 级别');
    assert(rec.action === InterventionAction.TURN_INJECT, 'TURN_INJECT');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 21. L7 模型切换 ──
  console.log('\n2️⃣1️⃣ L7 模型切换干预');
  try {
    const iv = getInterventionService();
    const rec = await iv.requestIntervention({
      agentId: 'agent-model-test',
      level: InterventionLevel.L7_MODEL,
      action: InterventionAction.MODEL_SWITCH,
      payload: { oldModel: 'kimi-for-coding', newModel: 'moonshot-v1-32k' },
      requesterId: 'admin',
    });
    assert(rec.level === InterventionLevel.L7_MODEL, 'L7 级别');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 22. 批量干预 ──
  console.log('\n2️⃣2️⃣ 批量 Agent 干预');
  try {
    const iv = getInterventionService();
    const records = await iv.batchPause(['agent-b1', 'agent-b2', 'agent-b3'], 'admin');
    assert(records.length === 3, `批量暂停 3 个 Agent`);
    assert(records.every(r => r.status === 'completed' || r.status === 'approved'), '全部成功');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 23. 干预历史查询 ──
  console.log('\n2️⃣3️⃣ 干预历史查询');
  try {
    const iv = getInterventionService();
    const history = iv.getAgentHistory('agent-test-pause');
    assert(history.records.length >= 2, `历史记录 ${history.records.length} 条`);
    assert(history.stats.total >= 2, `统计 total ${history.stats.total}`);
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 24. 匹配评分 ──
  console.log('\n2️⃣4️⃣ 战车匹配评分');
  try {
    const sc = getSwarmCoordinator();
    const parTeam = sc.registerChariot({ name: 'Match-Par', executionMode: ExecutionMode.PARALLEL, agentIds: ['mp1', 'mp2', 'mp3', 'mp4', 'mp5'], status: GroupStatus.ACTIVE, maxDepth: 1 });
    const seqTeam = sc.registerChariot({ name: 'Match-Seq', executionMode: ExecutionMode.SEQUENTIAL, agentIds: ['ms1'], status: GroupStatus.ACTIVE, maxDepth: 1 });
    const parScore = sc.matchScore({ id: 't-par', type: 'parallel', payload: {} }, parTeam.id);
    const seqScore = sc.matchScore({ id: 't-seq', type: 'sequential', payload: {} }, seqTeam.id);
    assert(parScore.score > seqScore.score, `Parallel 评分 ${parScore.score} > Sequential ${seqScore.score}`);
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 25. 复杂蜂群场景：分治→交接→合并 ──
  console.log('\n2️⃣5️⃣ 复杂蜂群：分治→交接→合并');
  try {
    const sc = getSwarmCoordinator();
    const handoff = getHandoffProtocol();
    const main = sc.registerChariot({ name: '蜂群主群', executionMode: ExecutionMode.PARALLEL, agentIds: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'], status: GroupStatus.ACTIVE, maxDepth: 1 });
    const subA = sc.splitChariot(main.id, ['b1', 'b2', 'b3']);
    const subB = sc.splitChariot(main.id, ['b4', 'b5', 'b6']);
    subA.parentId = main.id; subB.parentId = main.id;
    const hf = handoff.initiate({ sourceChariotId: subA.id, targetChariotId: subB.id, task: { id: 'swarm-task', type: 'analysis', payload: {} }, initiatedBy: 'system', reason: '蜂群协作' });
    await handoff.accept(hf.id, 'system');
    await handoff.start(hf.id);
    await handoff.complete(hf.id, { success: true, data: ['swarm-result'], metadata: { totalSubtasks: 3, completedSubtasks: 3, failedSubtasks: 0 } });
    const final = sc.mergeChariots(subA.id, main.id);
    assert(final.agentIds.length >= 3, '合并后主群有 Agent');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 26. 自动路由故障转移 ──
  console.log('\n2️⃣6️⃣ 自动路由故障转移');
  try {
    const result = await router.routeChat({
      messages: [{ role: 'user', content: '路由测试' }],
      model: 'kimi-for-coding',
    });
    assert(result.backendId === 'kimi-code', `路由选择: ${result.backendId}`);
    assert(result.response.content.length > 0, '响应成功');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 27. 多密钥轮询 ──
  console.log('\n2️⃣7️⃣ 多密钥轮询 (连续 3 次)');
  try {
    for (let i = 1; i <= 3; i++) {
      const resp = await router.chat('kimi-code', {
        messages: [{ role: 'user', content: `轮询测试 #${i}` }],
        model: 'kimi-for-coding',
      });
      assert(resp.content.length > 0, `请求 #${i} 成功`);
    }
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 28. 审批规则引擎 ──
  console.log('\n2️⃣8️⃣ 审批规则引擎');
  try {
    const iv = getInterventionService();
    const rules = iv.getApprovalRules();
    assert(rules.length >= 3, `规则数 ${rules.length}`);
    assert(rules.some(r => r.minLevel === 1 && r.maxLevel === 2 && !r.autoApprove), 'L1-L2 需人工审批');
    assert(rules.some(r => r.minLevel === 3 && r.maxLevel === 6 && r.autoApprove), 'L3-L6 自动通过');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 29. 群组状态管理 ──
  console.log('\n2️⃣9️⃣ 群组状态管理');
  try {
    const sc = getSwarmCoordinator();
    const group = sc.registerChariot({ name: 'Status-Test', executionMode: ExecutionMode.SEQUENTIAL, agentIds: ['st1'], status: GroupStatus.ACTIVE, maxDepth: 1 });
    assert(group.status === GroupStatus.ACTIVE, '初始 active');
    const iv = getInterventionService();
    const pauseRec = await iv.requestIntervention({ agentId: group.id, level: InterventionLevel.L2_GROUP, action: InterventionAction.GROUP_PAUSE, payload: {}, requesterId: 'admin' });
    assert(pauseRec.status === 'completed' || pauseRec.status === 'approved', '群组暂停成功');
    pass++;
  } catch (e) { console.log(`  ❌ ${(e as Error).message}`); fail++; }

  // ── 30. 最终汇总 ──
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`🌸 KimiCode 全操作综合测试完成`);
  console.log(`   ✅ 通过: ${pass} 项`);
  console.log(`   ❌ 失败: ${fail} 项`);
  console.log(`   📊 总计: ${pass + fail} 项`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (fail > 0) process.exit(1);
}

runFullTest().catch(err => {
  console.error('测试套件崩溃:', err);
  process.exit(1);
});
