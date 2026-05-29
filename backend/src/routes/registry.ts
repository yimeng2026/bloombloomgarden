import { Router } from 'express';

const router = Router();

interface RegistryNode {
  id: string;
  name: string;
  type: 'internal' | 'external' | 'bridge' | 'adapter' | 'gateway';
  status: 'active' | 'inactive' | 'maintenance' | 'deprecated';
  axisX: number;
  axisY: number;
  axisZ: number;
  protocol: string;
  endpoint: string;
  version: string;
  lastHeartbeat: string;
  healthScore: number;
  description: string;
  tags: string[];
}

const nodes: RegistryNode[] = [
  { id: 'node-001', name: 'DialogService', type: 'internal', status: 'active', axisX: 1, axisY: 1, axisZ: 0, protocol: 'Internal', endpoint: 'internal://dialog', version: '1.2.0', lastHeartbeat: new Date().toISOString(), healthScore: 98, description: '对话管理服务', tags: ['core', 'dialog'] },
  { id: 'node-002', name: 'AgentService', type: 'internal', status: 'active', axisX: 2, axisY: 1, axisZ: 0, protocol: 'Internal', endpoint: 'internal://agent', version: '2.0.1', lastHeartbeat: new Date().toISOString(), healthScore: 97, description: 'Agent生命周期管理', tags: ['core', 'agent'] },
  { id: 'node-003', name: 'KnowledgeService', type: 'internal', status: 'active', axisX: 3, axisY: 1, axisZ: 0, protocol: 'Internal', endpoint: 'internal://knowledge', version: '1.5.0', lastHeartbeat: new Date().toISOString(), healthScore: 96, description: '知识库管理', tags: ['core', 'knowledge'] },
  { id: 'node-004', name: 'GroupService', type: 'internal', status: 'active', axisX: 4, axisY: 1, axisZ: 0, protocol: 'Internal', endpoint: 'internal://group', version: '1.1.0', lastHeartbeat: new Date().toISOString(), healthScore: 95, description: '多Agent群组编排', tags: ['core', 'group'] },
  { id: 'node-005', name: 'SkillService', type: 'internal', status: 'active', axisX: 5, axisY: 1, axisZ: 0, protocol: 'Internal', endpoint: 'internal://skill', version: '1.3.0', lastHeartbeat: new Date().toISOString(), healthScore: 99, description: '技能发现与执行', tags: ['core', 'skill'] },
  { id: 'node-006', name: 'PlatformService', type: 'internal', status: 'active', axisX: 6, axisY: 1, axisZ: 0, protocol: 'Internal', endpoint: 'internal://platform', version: '1.0.2', lastHeartbeat: new Date().toISOString(), healthScore: 94, description: '平台管理与集成', tags: ['core', 'platform'] },
  { id: 'node-007', name: 'InterventionService', type: 'internal', status: 'active', axisX: 7, axisY: 1, axisZ: 0, protocol: 'Internal', endpoint: 'internal://intervention', version: '1.0.0', lastHeartbeat: new Date().toISOString(), healthScore: 100, description: '人工干预与Agent接管', tags: ['core', 'intervention'] },
  { id: 'node-008', name: 'BlueprintService', type: 'internal', status: 'active', axisX: 8, axisY: 1, axisZ: 0, protocol: 'Internal', endpoint: 'internal://blueprint', version: '1.2.0', lastHeartbeat: new Date().toISOString(), healthScore: 93, description: 'Agent流水线编排', tags: ['core', 'blueprint'] },
  { id: 'node-009', name: 'RESTAdapter', type: 'adapter', status: 'active', axisX: 0, axisY: 2, axisZ: 0, protocol: 'REST', endpoint: '/api/v1', version: '2.1.0', lastHeartbeat: new Date().toISOString(), healthScore: 98, description: 'RESTful HTTP API适配器', tags: ['adapter', 'rest'] },
  { id: 'node-010', name: 'SSEAdapter', type: 'adapter', status: 'active', axisX: 0, axisY: 3, axisZ: 0, protocol: 'SSE', endpoint: '/api/stream', version: '1.0.0', lastHeartbeat: new Date().toISOString(), healthScore: 97, description: 'Server-Sent Events流适配器', tags: ['adapter', 'sse'] },
  { id: 'node-011', name: 'WSAdapter', type: 'adapter', status: 'active', axisX: 0, axisY: 4, axisZ: 0, protocol: 'WS', endpoint: 'ws://localhost:3002', version: '1.1.0', lastHeartbeat: new Date().toISOString(), healthScore: 96, description: 'WebSocket实时通信适配器', tags: ['adapter', 'ws'] },
  { id: 'node-012', name: 'DiscordBridge', type: 'bridge', status: 'active', axisX: 0, axisY: 5, axisZ: 1, protocol: 'Bridge', endpoint: 'wss://gateway.discord.gg', version: '1.0.0', lastHeartbeat: new Date().toISOString(), healthScore: 85, description: 'Discord消息桥接', tags: ['bridge', 'discord'] },
  { id: 'node-013', name: 'GitHubBridge', type: 'bridge', status: 'active', axisX: 0, axisY: 6, axisZ: 1, protocol: 'Bridge', endpoint: 'https://api.github.com', version: '1.0.0', lastHeartbeat: new Date().toISOString(), healthScore: 92, description: 'GitHub事件桥接', tags: ['bridge', 'github'] },
  { id: 'node-014', name: 'KimiCodeProvider', type: 'external', status: 'active', axisX: 0, axisY: 7, axisZ: 2, protocol: 'External', endpoint: 'https://api.kimi.moonshot.cn', version: 'v1', lastHeartbeat: new Date().toISOString(), healthScore: 88, description: 'Kimi Code LLM服务', tags: ['external', 'llm', 'kimi'] },
  { id: 'node-015', name: 'OpenRouterProvider', type: 'external', status: 'active', axisX: 0, axisY: 8, axisZ: 2, protocol: 'External', endpoint: 'https://openrouter.ai/api', version: 'v1', lastHeartbeat: new Date().toISOString(), healthScore: 90, description: 'OpenRouter多模型聚合', tags: ['external', 'llm', 'openrouter'] },
  { id: 'node-016', name: 'AxisGateway', type: 'gateway', status: 'active', axisX: 0, axisY: 0, axisZ: 0, protocol: 'Gateway', endpoint: '0.0.0.0:3001', version: '3.0.0', lastHeartbeat: new Date().toISOString(), healthScore: 99, description: '3DACP统一网关', tags: ['gateway', 'core'] },
];

/**
 * GET /api/registry
 * 获取所有注册节点
 */
router.get('/', (_req, res) => {
  res.json({ success: true, data: nodes, total: nodes.length });
});

/**
 * GET /api/registry/:id
 * 获取单个节点详情
 */
router.get('/:id', (req, res) => {
  const node = nodes.find(n => n.id === req.params.id);
  if (!node) {
    return res.status(404).json({ success: false, error: 'Node not found' });
  }
  res.json({ success: true, data: node });
});

/**
 * GET /api/registry/axis/:x/:y/:z
 * 通过3D坐标定位节点
 */
router.get('/axis/:x/:y/:z', (req, res) => {
  const { x, y, z } = req.params;
  const result = nodes.filter(n =>
    n.axisX === parseInt(x) && n.axisY === parseInt(y) && n.axisZ === parseInt(z)
  );
  res.json({ success: true, data: result });
});

/**
 * GET /api/registry/search?q=xxx
 * 搜索节点
 */
router.get('/search', (req, res) => {
  const q = ((req.query.q as string) || '').toLowerCase();
  if (!q) {
    return res.json({ success: true, data: nodes });
  }
  const result = nodes.filter(n =>
    n.name.toLowerCase().includes(q) ||
    n.description.toLowerCase().includes(q) ||
    n.tags.some(t => t.toLowerCase().includes(q))
  );
  res.json({ success: true, data: result, total: result.length });
});

/**
 * POST /api/registry/:id/heartbeat
 * 节点心跳上报
 */
router.post('/:id/heartbeat', (req, res) => {
  const node = nodes.find(n => n.id === req.params.id);
  if (!node) {
    return res.status(404).json({ success: false, error: 'Node not found' });
  }
  node.lastHeartbeat = new Date().toISOString();
  node.healthScore = req.body.healthScore || node.healthScore;
  node.status = req.body.status || node.status;
  res.json({ success: true, data: node });
});

/**
 * GET /api/registry/stats/overview
 * 注册中心统计概览
 */
router.get('/stats/overview', (_req, res) => {
  const stats = {
    total: nodes.length,
    byType: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    byProtocol: {} as Record<string, number>,
    averageHealth: nodes.reduce((sum, n) => sum + n.healthScore, 0) / nodes.length,
    axisCoverage: {
      x: new Set(nodes.map(n => n.axisX)).size,
      y: new Set(nodes.map(n => n.axisY)).size,
      z: new Set(nodes.map(n => n.axisZ)).size
    }
  };
  nodes.forEach(n => {
    stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
    stats.byStatus[n.status] = (stats.byStatus[n.status] || 0) + 1;
    stats.byProtocol[n.protocol] = (stats.byProtocol[n.protocol] || 0) + 1;
  });
  res.json({ success: true, data: stats });
});

export default router;
