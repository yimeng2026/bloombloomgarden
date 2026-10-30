import { Router } from 'express';
import { kimiCluster } from '../KimiClusterOrchestrator';
import { normalizeKimiExecutionPayload } from '../KimiClusterPayload';
import type { AxisMessage } from '../coordinator/AxisMessage';

const router = Router();

function rpc(action: string, data: Record<string, unknown> = {}) {
  const id = `kimi-${Date.now()}`;
  const source = {
    x: { type: 'rest', action, id },
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
    protocol_adapter: 'REST',
    timestamp: new Date().toISOString(),
    traceId: id,
  };
  return kimiCluster.handleRpc(message);
}

router.get('/status', async (_req, res, next) => {
  try {
    const reply = await rpc('getStatus');
    res.json({ success: true, data: reply.payload.data });
  } catch (error) {
    next(error);
  }
});

router.get('/patterns', async (req, res, next) => {
  try {
    const reply = await rpc('getPatterns', { agentId: req.query.agentId });
    res.json({ success: true, data: reply.payload.data });
  } catch (error) {
    next(error);
  }
});

router.post('/load-balance', async (req, res, next) => {
  try {
    const reply = await rpc('getDecision', {
      agentId: req.body.agentId || 'default',
      taskType: req.body.taskType || 'chat',
    });
    res.json({ success: true, data: reply.payload.data });
  } catch (error) {
    next(error);
  }
});

router.post('/execute', async (req, res, next) => {
  try {
    const reply = await rpc('execute', {
      agentId: req.body.agentId || 'default',
      taskType: req.body.taskType || 'chat',
      payload: normalizeKimiExecutionPayload(req.body),
    });
    res.json({ success: true, data: reply.payload.data });
  } catch (error) {
    next(error);
  }
});

router.post('/stream', async (req, res, next) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();
    await kimiCluster.executeStream(
      String(req.body.agentId || 'default'),
      String(req.body.taskType || 'chat'),
      normalizeKimiExecutionPayload(req.body),
      chunk => res.write(`data: ${JSON.stringify(chunk)}\n\n`),
    );
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
      res.end();
      return;
    }
    next(error);
  }
});

/** Nodes are loaded from server environment; raw keys in HTTP bodies are rejected. */
router.post('/endpoints', async (req, res, next) => {
  try {
    if (req.body?.reload !== true) {
      res.status(400).json({
        success: false,
        error: 'Configure KIMI_CLUSTER_NODES and referenced environment keys, then send {reload:true}',
      });
      return;
    }
    const reply = await rpc('reload');
    res.json({ success: true, data: reply.payload.data });
  } catch (error) {
    next(error);
  }
});

router.delete('/endpoints/:id', async (req, res, next) => {
  try {
    const reply = await rpc('removeEndpoint', { endpointId: req.params.id });
    res.json({ success: true, data: reply.payload.data });
  } catch (error) {
    next(error);
  }
});

export default router;
