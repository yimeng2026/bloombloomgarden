/**
 * 千界花园 — 群组组合全链路测试
 * 测试 Sequential / Parallel / Hierarchical / Dynamic 四种模式
 * 以及群组嵌套、交接、Agent 迁移等组合场景
 *
 * 运行方式：npx tsx src/tests/group-combo.test.ts
 */

import { getSwarmCoordinator, ExecutionMode, GroupStatus } from '../services/CollabFramework';
import { getHandoffProtocol } from '../services/CollabFramework';
import { getInterventionService } from '../services/CollabFramework';
import { getBackendRouter } from '../services/BackendRouter';

// ─── 测试工具 ─────────────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`❌ ASSERT FAILED: ${message}`);
  console.log(`  ✅ ${message}`);
}

async function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─── 测试套件 ─────────────────────────────────────────

async function runGroupTests(): Promise<void> {
  console.log('\n🌸 千界花园群组组合全链路测试开始\n');
  let passed = 0;
  let failed = 0;

  // ── 测试 1: Sequential 顺序执行 ──────────────────────
  console.log('📋 测试 1: Sequential 顺序执行模式');
  try {
    const coordinator = getSwarmCoordinator();
    const chariot = coordinator.registerChariot({
      name: 'Sequential Team',
      executionMode: ExecutionMode.SEQUENTIAL,
      agentIds: ['agent-seq-1', 'agent-seq-2', 'agent-seq-3'],
      status: GroupStatus.ACTIVE,
      maxDepth: 1,
    });

    assert(chariot.executionMode === ExecutionMode.SEQUENTIAL, '执行模式为 Sequential');
    assert(chariot.agentIds.length === 3, '包含 3 个 Agent');

    // 模拟任务执行
    const result = await coordinator.execute(chariot.id, {
      id: 'task-seq-1',
      type: 'sequential',
      payload: { step: 'test' },
    });

    assert(result.success, 'Sequential 任务执行成功');
    assert(result.metadata.totalSubtasks === 3, '3 个子任务全部执行');

    passed++;
  } catch (err) {
    console.log(`  ❌ Sequential 测试失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 2: Parallel 并行执行 ────────────────────────
  console.log('\n⚡ 测试 2: Parallel 并行执行模式');
  try {
    const coordinator = getSwarmCoordinator();
    const chariot = coordinator.registerChariot({
      name: 'Parallel Team',
      executionMode: ExecutionMode.PARALLEL,
      agentIds: ['agent-par-1', 'agent-par-2', 'agent-par-3', 'agent-par-4'],
      status: GroupStatus.ACTIVE,
      maxDepth: 1,
    });

    const result = await coordinator.execute(chariot.id, {
      id: 'task-par-1',
      type: 'parallel',
      payload: { data: [1, 2, 3, 4] },
    });

    assert(result.success, 'Parallel 任务执行成功');
    assert(result.metadata.totalSubtasks === 4, '4 个并行子任务');
    assert(result.metadata.completedSubtasks === 4, '全部完成');

    passed++;
  } catch (err) {
    console.log(`  ❌ Parallel 测试失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 3: Hierarchical 层级执行 ────────────────────
  console.log('\n🏛️ 测试 3: Hierarchical 层级执行模式');
  try {
    const coordinator = getSwarmCoordinator();

    // 父群组（指挥部）
    const parent = coordinator.registerChariot({
      name: 'Command Center',
      executionMode: ExecutionMode.HIERARCHICAL,
      agentIds: ['coordinator-1'],
      coordinatorId: 'coordinator-1',
      status: GroupStatus.ACTIVE,
      maxDepth: 1,
    });

    // 子群组（执行队）
    const child1 = coordinator.registerChariot({
      name: 'Team Alpha',
      parentId: parent.id,
      executionMode: ExecutionMode.SEQUENTIAL,
      agentIds: ['agent-h1', 'agent-h2'],
      status: GroupStatus.ACTIVE,
      maxDepth: 2,
    });

    const child2 = coordinator.registerChariot({
      name: 'Team Beta',
      parentId: parent.id,
      executionMode: ExecutionMode.SEQUENTIAL,
      agentIds: ['agent-h3', 'agent-h4'],
      status: GroupStatus.ACTIVE,
      maxDepth: 2,
    });

    // 验证层级结构
    const tree = coordinator.getChariotTree(parent.id);
    assert(tree.length >= 3, `层级树包含 ${tree.length} 个节点`);

    const children = coordinator.getChariotChildren(parent.id);
    assert(children.length === 2, '指挥部有 2 个子群组');
    assert(children.some(c => c.id === child1.id), '包含 Team Alpha');
    assert(children.some(c => c.id === child2.id), '包含 Team Beta');

    // 验证深度
    assert(parent.maxDepth === 1, '指挥部深度为 1');
    assert(child1.maxDepth === 2, '子群组深度为 2');

    passed++;
  } catch (err) {
    console.log(`  ❌ Hierarchical 测试失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 4: Dynamic 动态模式 ─────────────────────────
  console.log('\n🔄 测试 4: Dynamic 动态执行模式');
  try {
    const coordinator = getSwarmCoordinator();
    const chariot = coordinator.registerChariot({
      name: 'Dynamic Squad',
      executionMode: ExecutionMode.DYNAMIC,
      agentIds: ['agent-dyn-1', 'agent-dyn-2'],
      status: GroupStatus.ACTIVE,
      maxDepth: 1,
    });

    const result = await coordinator.execute(chariot.id, {
      id: 'task-dyn-1',
      type: 'dynamic',
      payload: { canParallelize: true },
    });

    assert(result.success, 'Dynamic 任务执行成功');
    assert(result.data.length > 0, '有执行结果');

    passed++;
  } catch (err) {
    console.log(`  ❌ Dynamic 测试失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 5: 群组合并 ─────────────────────────────────
  console.log('\n🔀 测试 5: 群组合并 (Merge)');
  try {
    const coordinator = getSwarmCoordinator();

    const teamA = coordinator.registerChariot({
      name: 'Team A',
      executionMode: ExecutionMode.SEQUENTIAL,
      agentIds: ['agent-ma-1', 'agent-ma-2'],
      status: GroupStatus.ACTIVE,
      maxDepth: 1,
    });

    const teamB = coordinator.registerChariot({
      name: 'Team B',
      executionMode: ExecutionMode.SEQUENTIAL,
      agentIds: ['agent-mb-1', 'agent-mb-2'],
      status: GroupStatus.ACTIVE,
      maxDepth: 1,
    });

    const merged = coordinator.mergeChariots(teamA.id, teamB.id);
    assert(merged.agentIds.length === 4, `合并后 4 个 Agent: ${merged.agentIds.join(', ')}`);
    assert(!coordinator.getChariot(teamA.id), 'Team A 已注销');

    passed++;
  } catch (err) {
    console.log(`  ❌ 合并测试失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 6: 群组拆分 ─────────────────────────────────
  console.log('\n✂️ 测试 6: 群组拆分 (Split)');
  try {
    const coordinator = getSwarmCoordinator();

    const bigTeam = coordinator.registerChariot({
      name: 'Big Team',
      executionMode: ExecutionMode.PARALLEL,
      agentIds: ['agent-s1', 'agent-s2', 'agent-s3', 'agent-s4', 'agent-s5'],
      status: GroupStatus.ACTIVE,
      maxDepth: 1,
    });

    const newTeam = coordinator.splitChariot(bigTeam.id, ['agent-s4', 'agent-s5']);
    assert(newTeam.agentIds.length === 2, '新群组 2 个 Agent');
    assert(newTeam.name.includes('split'), '名称包含 split');

    const original = coordinator.getChariot(bigTeam.id);
    assert(original!.agentIds.length === 3, '原群组剩余 3 个 Agent');

    passed++;
  } catch (err) {
    console.log(`  ❌ 拆分测试失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 7: 跨群组交接 ───────────────────────────────
  console.log('\n🤝 测试 7: 跨群组交接 (Handoff)');
  try {
    const coordinator = getSwarmCoordinator();
    const handoff = getHandoffProtocol();

    const source = coordinator.registerChariot({
      name: 'Source Group',
      executionMode: ExecutionMode.SEQUENTIAL,
      agentIds: ['agent-src-1'],
      status: GroupStatus.ACTIVE,
      maxDepth: 1,
    });

    const target = coordinator.registerChariot({
      name: 'Target Group',
      executionMode: ExecutionMode.PARALLEL,
      agentIds: ['agent-tgt-1', 'agent-tgt-2'],
      status: GroupStatus.ACTIVE,
      maxDepth: 1,
    });

    const record = handoff.initiate({
      sourceChariotId: source.id,
      targetChariotId: target.id,
      task: { id: 'handoff-1', type: 'analysis', payload: { data: 'test-handoff' } },
      initiatedBy: 'test-user',
      reason: '负载转移',
    });

    assert(record.status === 'pending', '交接状态 pending');

    handoff.accept(record.id, 'target-admin');
    const started = await handoff.start(record.id);
    assert(started.status === 'started', '交接已启动');

    const completed = await handoff.complete(record.id, {
      success: true,
      data: ['handoff-result'],
      metadata: { totalSubtasks: 1, completedSubtasks: 1, failedSubtasks: 0 },
    });
    assert(completed.status === 'completed', '交接已完成');

    passed++;
  } catch (err) {
    console.log(`  ❌ 交接测试失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 8: Agent 跨群组迁移 + 干预 ──────────────────
  console.log('\n🎛️ 测试 8: Agent 跨群组干预');
  try {
    const coordinator = getSwarmCoordinator();
    const intervention = getInterventionService();

    const group1 = coordinator.registerChariot({
      name: 'Group 1',
      executionMode: ExecutionMode.SEQUENTIAL,
      agentIds: ['agent-mig-1'],
      status: GroupStatus.ACTIVE,
      maxDepth: 1,
    });

    const group2 = coordinator.registerChariot({
      name: 'Group 2',
      executionMode: ExecutionMode.PARALLEL,
      agentIds: [],
      status: GroupStatus.ACTIVE,
      maxDepth: 1,
    });

    // 先暂停 Agent
    const pauseRecord = await intervention.pause('agent-mig-1', 'admin');
    assert(pauseRecord.status === 'completed' || pauseRecord.status === 'approved', 'Agent 已暂停');

    // 迁移到 group2（通过干预系统记录）
    const migrateRecord = await intervention.requestIntervention({
      agentId: 'agent-mig-1',
      level: 3, // L3 Agent
      action: 'agent_migrate' as any,
      payload: { oldBackend: group1.id, newBackend: group2.id },
      requesterId: 'admin',
    });
    assert(migrateRecord.status === 'completed' || migrateRecord.status === 'approved', '迁移干预已执行');

    // 恢复 Agent
    const resumeRecord = await intervention.resume('agent-mig-1', 'admin');
    assert(resumeRecord.status === 'completed' || resumeRecord.status === 'approved', 'Agent 已恢复');

    passed++;
  } catch (err) {
    console.log(`  ❌ 迁移干预测试失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 9: 多层级嵌套 + 广播 ────────────────────────
  console.log('\n📡 测试 9: 多层级嵌套 + 广播消息');
  try {
    const coordinator = getSwarmCoordinator();

    const level1 = coordinator.registerChariot({
      name: 'Level 1 HQ',
      executionMode: ExecutionMode.HIERARCHICAL,
      agentIds: ['agent-l1'],
      status: GroupStatus.ACTIVE,
      maxDepth: 1,
    });

    const level2 = coordinator.registerChariot({
      name: 'Level 2 Division',
      parentId: level1.id,
      executionMode: ExecutionMode.HIERARCHICAL,
      agentIds: ['agent-l2'],
      status: GroupStatus.ACTIVE,
      maxDepth: 2,
    });

    const level3 = coordinator.registerChariot({
      name: 'Level 3 Squad',
      parentId: level2.id,
      executionMode: ExecutionMode.PARALLEL,
      agentIds: ['agent-l3a', 'agent-l3b'],
      status: GroupStatus.ACTIVE,
      maxDepth: 3,
    });

    // 从 level1 广播到所有子节点
    let broadcastCount = 0;
    coordinator.on('chariot:broadcast', (data) => {
      broadcastCount = data.agentCount;
    });

    coordinator.broadcast(level1.id, {
      type: 'alert',
      sender: 'system',
      recipient: 'all',
      payload: { message: '全员注意' },
      timestamp: new Date(),
    });

    await delay(100);
    assert(broadcastCount >= 1, `广播触达 ${broadcastCount} 个 Agent`);

    // 验证 3 层嵌套
    const fullTree = coordinator.getChariotTree(level1.id);
    assert(fullTree.length >= 3, `完整层级树 ${fullTree.length} 个节点`);

    passed++;
  } catch (err) {
    console.log(`  ❌ 嵌套广播测试失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 10: 群组匹配评分 ────────────────────────────
  console.log('\n🎯 测试 10: 群组任务匹配评分');
  try {
    const coordinator = getSwarmCoordinator();

    const parallelTeam = coordinator.registerChariot({
      name: 'Parallel Experts',
      executionMode: ExecutionMode.PARALLEL,
      agentIds: ['agent-p1', 'agent-p2', 'agent-p3', 'agent-p4', 'agent-p5'],
      status: GroupStatus.ACTIVE,
      maxDepth: 1,
    });

    const seqTeam = coordinator.registerChariot({
      name: 'Sequential Workers',
      executionMode: ExecutionMode.SEQUENTIAL,
      agentIds: ['agent-s1'],
      status: GroupStatus.ACTIVE,
      maxDepth: 1,
    });

    const deepTeam = coordinator.registerChariot({
      name: 'Deep Nested',
      executionMode: ExecutionMode.HIERARCHICAL,
      agentIds: ['agent-d1', 'agent-d2'],
      status: GroupStatus.ACTIVE,
      maxDepth: 5,
    });

    // 并行任务匹配
    const parScore = coordinator.matchScore(
      { id: 'task-par', type: 'parallel', payload: {} },
      parallelTeam.id,
    );
    assert(parScore.score >= 50, `并行团队评分 ${parScore.score}，理由: ${parScore.reasons.join(', ')}`);

    // 顺序任务匹配
    const seqScore = coordinator.matchScore(
      { id: 'task-seq', type: 'sequential', payload: {} },
      seqTeam.id,
    );
    assert(seqScore.score >= 30, `顺序团队评分 ${seqScore.score}`);

    // 深度惩罚
    const deepScore = coordinator.matchScore(
      { id: 'task-hie', type: 'hierarchical', payload: {} },
      deepTeam.id,
    );
    assert(deepScore.score < parScore.score, `深度惩罚生效: ${deepScore.score} < ${parScore.score}`);

    passed++;
  } catch (err) {
    console.log(`  ❌ 匹配评分测试失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 11: 群组状态管理 ────────────────────────────
  console.log('\n📊 测试 11: 群组状态转换');
  try {
    const coordinator = getSwarmCoordinator();

    const group = coordinator.registerChariot({
      name: 'Status Test Group',
      executionMode: ExecutionMode.SEQUENTIAL,
      agentIds: ['agent-st-1'],
      status: GroupStatus.ACTIVE,
      maxDepth: 1,
    });

    assert(group.status === GroupStatus.ACTIVE, '初始状态 active');

    // 暂停整个群组（通过干预系统）
    const intervention = getInterventionService();
    const pauseResult = await intervention.requestIntervention({
      agentId: group.id,
      level: 2, // L2 Group
      action: 'group_pause' as any,
      payload: {},
      requesterId: 'admin',
    });
    assert(pauseResult.status === 'completed' || pauseResult.status === 'approved', '群组暂停干预成功');

    passed++;
  } catch (err) {
    console.log(`  ❌ 状态管理测试失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 测试 12: 复杂组合场景 ────────────────────────────
  console.log('\n🧩 测试 12: 复杂组合 — 分治 + 合并 + 交接');
  try {
    const coordinator = getSwarmCoordinator();
    const handoff = getHandoffProtocol();

    // 1. 创建一个大群组
    const mainGroup = coordinator.registerChariot({
      name: 'Main Processing Unit',
      executionMode: ExecutionMode.PARALLEL,
      agentIds: ['agent-c1', 'agent-c2', 'agent-c3', 'agent-c4', 'agent-c5', 'agent-c6'],
      status: GroupStatus.ACTIVE,
      maxDepth: 1,
    });

    // 2. 拆分为两个子群组
    const subGroupA = coordinator.splitChariot(mainGroup.id, ['agent-c1', 'agent-c2', 'agent-c3']);
    const subGroupB = coordinator.splitChariot(mainGroup.id, ['agent-c4', 'agent-c5', 'agent-c6']);

    assert(subGroupA.agentIds.length === 3, 'SubGroup A 有 3 个 Agent');
    assert(subGroupB.agentIds.length === 3, 'SubGroup B 有 3 个 Agent');

    // 3. 设置层级关系
    subGroupA.parentId = mainGroup.id;
    subGroupB.parentId = mainGroup.id;

    // 4. 从 A 交接任务到 B
    const handoffRecord = handoff.initiate({
      sourceChariotId: subGroupA.id,
      targetChariotId: subGroupB.id,
      task: { id: 'complex-task', type: 'analysis', payload: { phase: 2 } },
      initiatedBy: 'system',
      reason: 'Phase 1 complete, handing to Phase 2 team',
    });

    await handoff.accept(handoffRecord.id, 'system');
    await handoff.start(handoffRecord.id);
    await handoff.complete(handoffRecord.id, {
      success: true,
      data: ['phase-2-result'],
      metadata: { totalSubtasks: 3, completedSubtasks: 3, failedSubtasks: 0 },
    });

    // 5. 最后合并回主群组
    const finalMerge = coordinator.mergeChariots(subGroupA.id, mainGroup.id);
    assert(finalMerge.agentIds.length >= 3, '合并后主群组有 Agent');

    passed++;
  } catch (err) {
    console.log(`  ❌ 复杂组合测试失败: ${(err as Error).message}`);
    failed++;
  }

  // ── 汇总 ───────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log(`🌸 群组组合全链路测试完成`);
  console.log(`   ✅ 通过: ${passed} 项`);
  console.log(`   ❌ 失败: ${failed} 项`);
  console.log(`   📊 总计: ${passed + failed} 项`);
  console.log('═══════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runGroupTests().catch(err => {
  console.error('测试套件崩溃:', err);
  process.exit(1);
});
