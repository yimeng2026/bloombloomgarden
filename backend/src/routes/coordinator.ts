import { Router, Request, Response, NextFunction } from 'express';
import { getSwarmCoordinator, ExecutionMode, GroupStatus } from '../services/CollabFramework';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// ─── 10 端点实现 ───────────────────────────────────────

// 1. POST /api/coordinator-hierarchy/chariot — 注册战车
router.post('/chariot', asyncHandler(async (req, res) => {
  const { name, parentId, coordinatorId, executionMode, agentIds, maxDepth } = req.body;
  const coordinator = getSwarmCoordinator();
  const chariot = coordinator.registerChariot({
    name,
    parentId,
    coordinatorId,
    executionMode: executionMode || ExecutionMode.SEQUENTIAL,
    agentIds: agentIds || [],
    status: GroupStatus.ACTIVE,
    maxDepth: maxDepth || 1,
  });
  res.status(201).json({ success: true, data: chariot });
}));

// 2. DELETE /api/coordinator-hierarchy/chariot/:id — 注销战车
router.delete('/chariot/:id', asyncHandler(async (req, res) => {
  const coordinator = getSwarmCoordinator();
  const existed = coordinator.unregisterChariot(req.params.id);
  if (!existed) {
    return res.status(404).json({ success: false, error: 'Chariot not found' });
  }
  res.json({ success: true });
}));

// 3. POST /api/coordinator-hierarchy/merge — 合并群组
router.post('/merge', asyncHandler(async (req, res) => {
  const { sourceId, targetId } = req.body;
  const coordinator = getSwarmCoordinator();
  const merged = coordinator.mergeChariots(sourceId, targetId);
  res.json({ success: true, data: merged });
}));

// 4. POST /api/coordinator-hierarchy/split — 拆分群组
router.post('/split', asyncHandler(async (req, res) => {
  const { chariotId, agentIds } = req.body;
  const coordinator = getSwarmCoordinator();
  const newChariot = coordinator.splitChariot(chariotId, agentIds);
  res.status(201).json({ success: true, data: newChariot });
}));

// 5. POST /api/coordinator-hierarchy/delegate — 跨层级委托
router.post('/delegate', asyncHandler(async (req, res) => {
  const { fromId, toId, task } = req.body;
  const coordinator = getSwarmCoordinator();
  coordinator.delegate(fromId, toId, task);
  res.json({ success: true, data: { delegated: true, fromId, toId } });
}));

// 6. POST /api/coordinator-hierarchy/broadcast — 广播消息
router.post('/broadcast', asyncHandler(async (req, res) => {
  const { fromId, message } = req.body;
  const coordinator = getSwarmCoordinator();
  coordinator.broadcast(fromId, message);
  res.json({ success: true, data: { broadcasted: true, fromId } });
}));

// 7. GET /api/coordinator-hierarchy/tree — 获取层级树
router.get('/tree', asyncHandler(async (req, res) => {
  const { rootId } = req.query;
  const coordinator = getSwarmCoordinator();
  const tree = coordinator.getChariotTree(rootId as string | undefined);
  res.json({ success: true, data: tree });
}));

// 7b. GET /api/coordinator-hierarchy/chariots — 获取所有战车列表
router.get('/chariots', asyncHandler(async (req, res) => {
  const coordinator = getSwarmCoordinator();
  const chariots = coordinator.getChariots();
  res.json({ success: true, data: chariots, total: chariots.length });
}));

// 8. GET /api/coordinator-hierarchy/chariot/:id — 战车详情
router.get('/chariot/:id', asyncHandler(async (req, res) => {
  const coordinator = getSwarmCoordinator();
  const chariot = coordinator.getChariot(req.params.id);
  if (!chariot) {
    return res.status(404).json({ success: false, error: 'Chariot not found' });
  }
  res.json({ success: true, data: chariot });
}));

// 9. GET /api/coordinator-hierarchy/chariot/:id/children — 子节点
router.get('/chariot/:id/children', asyncHandler(async (req, res) => {
  const coordinator = getSwarmCoordinator();
  const children = coordinator.getChariotChildren(req.params.id);
  res.json({ success: true, data: children });
}));

// 10. GET /api/coordinator-hierarchy/chariot/:id/agents — Agent列表
router.get('/chariot/:id/agents', asyncHandler(async (req, res) => {
  const coordinator = getSwarmCoordinator();
  const agentIds = coordinator.getChariotAgents(req.params.id);
  res.json({ success: true, data: { agentIds, count: agentIds.length } });
}));

// ─── 额外实用端点 ─────────────────────────────────────

// POST /api/coordinator-hierarchy/chariot/:id/execute — 执行任务（非流式）
router.post('/chariot/:id/execute', asyncHandler(async (req, res) => {
  const coordinator = getSwarmCoordinator();
  const result = await coordinator.execute(req.params.id, req.body.task);
  res.json({ success: true, data: result });
}));

// POST /api/coordinator-hierarchy/chariot/:id/execute/stream — 流式执行（SSE）
router.post('/chariot/:id/execute/stream', asyncHandler(async (req, res) => {
  const coordinator = getSwarmCoordinator();
  const { task } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    for await (const event of coordinator.executeStream(req.params.id, task)) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      // 如果是 complete 或 error，可以 flush 后结束
      if (event.type === 'complete' || event.type === 'error') {
        break;
      }
    }
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
  } finally {
    res.write('data: [DONE]\n\n');
    res.end();
  }
}));

// GET /api/coordinator-hierarchy/chariot/:id/match — 匹配评分
router.get('/chariot/:id/match', asyncHandler(async (req, res) => {
  const { task } = req.body;
  const coordinator = getSwarmCoordinator();
  const score = coordinator.matchScore(task, req.params.id);
  res.json({ success: true, data: score });
}));

export default router;
