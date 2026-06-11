import { Router } from 'express';
import { getSwarmCoordinator } from '../services/SwarmCoordinator';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// POST /api/swarm/batch-chat — 批量聊天（并行调用多个引擎）
router.post('/batch-chat', asyncHandler(async (req, res) => {
  const { requests } = req.body;
  if (!requests || !Array.isArray(requests) || requests.length === 0) {
    return res.status(400).json({ success: false, error: 'Requests array is required' });
  }

  const coordinator = getSwarmCoordinator();
  const results = await coordinator.batchChat(requests);
  res.json({ success: true, data: results });
}));

// POST /api/swarm/coordinate — 协调蜂群执行
router.post('/coordinate', asyncHandler(async (req, res) => {
  const { swarmId, tasks } = req.body;
  if (!swarmId || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ success: false, error: 'swarmId and tasks array are required' });
  }

  const coordinator = getSwarmCoordinator();
  const results = await coordinator.coordinateSwarm(swarmId, tasks);
  res.json({ success: true, data: results });
}));

// POST /api/swarm/aggregate — 聚合蜂群结果
router.post('/aggregate', asyncHandler(async (req, res) => {
  const { results } = req.body;
  if (!results || !Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ success: false, error: 'Results array is required' });
  }

  const coordinator = getSwarmCoordinator();
  const aggregated = coordinator.aggregateResults(results);
  res.json({ success: true, data: aggregated });
}));

export default router;
