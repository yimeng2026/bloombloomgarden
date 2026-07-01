import { Router } from 'express';

const router = Router();

interface ProcessInfo {
  pid: number;
  name: string;
  type: string;
  status: 'running' | 'sleeping' | 'stopped' | 'zombie';
  cpu: number;
  memory: number;
  memoryUnit: string;
  uptime: string;
  threads: number;
  command: string;
}

const processes: ProcessInfo[] = [
  { pid: 1, name: 'node-backend', type: 'backend', status: 'running', cpu: 12.5, memory: 256, memoryUnit: 'MB', uptime: '3d 12h', threads: 8, command: 'node dist/main.js --port 3001' },
  { pid: 42, name: 'vite-frontend', type: 'frontend', status: 'running', cpu: 8.3, memory: 128, memoryUnit: 'MB', uptime: '3d 12h', threads: 4, command: 'vite --host 0.0.0.0 --port 5173' },
  { pid: 88, name: 'electron-main', type: 'electron', status: 'running', cpu: 5.1, memory: 192, memoryUnit: 'MB', uptime: '2h 15m', threads: 6, command: 'electron . --enable-logging' },
  { pid: 156, name: 'agent-sylva', type: 'agent', status: 'running', cpu: 15.7, memory: 320, memoryUnit: 'MB', uptime: '3d 10h', threads: 3, command: 'AgentRuntime --id=sylva --model=kimi-code' },
  { pid: 157, name: 'agent-zero', type: 'agent', status: 'running', cpu: 2.1, memory: 180, memoryUnit: 'MB', uptime: '3d 10h', threads: 2, command: 'AgentRuntime --id=zero --model=local' },
  { pid: 200, name: 'kimi-orchestrator', type: 'service', status: 'running', cpu: 4.5, memory: 64, memoryUnit: 'MB', uptime: '3d 10h', threads: 2, command: 'KimiClusterOrchestrator --keys=5' },
  { pid: 230, name: 'redis-server', type: 'service', status: 'running', cpu: 1.2, memory: 48, memoryUnit: 'MB', uptime: '5d 8h', threads: 4, command: 'redis-server /etc/redis.conf' },
  { pid: 245, name: 'axis-gateway', type: 'adapter', status: 'running', cpu: 3.8, memory: 96, memoryUnit: 'MB', uptime: '3d 12h', threads: 5, command: 'AxisGateway --protocols=all' },
  { pid: 260, name: 'ws-adapter', type: 'adapter', status: 'sleeping', cpu: 0.5, memory: 32, memoryUnit: 'MB', uptime: '3d 12h', threads: 2, command: 'WebSocketAdapter --port 3002' },
  { pid: 300, name: 'prisma-engine', type: 'service', status: 'running', cpu: 2.8, memory: 80, memoryUnit: 'MB', uptime: '3d 12h', threads: 3, command: 'prisma-query-engine' },
];

/**
 * GET /api/processes
 * 获取进程列表
 */
router.get('/', (_req, res) => {
  res.json({ success: true, data: processes });
});

/**
 * GET /api/processes/:pid
 * 获取单个进程详情
 */
router.get('/:pid', (req, res) => {
  const p = processes.find(proc => proc.pid === parseInt(req.params.pid));
  if (!p) {
    return res.status(404).json({ success: false, error: 'Process not found' });
  }
  res.json({ success: true, data: p });
});

/**
 * POST /api/processes/:pid/restart
 * 重启进程（模拟）
 */
router.post('/:pid/restart', (req, res) => {
  const p = processes.find(proc => proc.pid === parseInt(req.params.pid));
  if (!p) {
    return res.status(404).json({ success: false, error: 'Process not found' });
  }
  p.status = 'running';
  p.uptime = '0m';
  p.cpu = 0;
  res.json({ success: true, message: `Process ${p.name} restart initiated`, data: p });
});

/**
 * POST /api/processes/:pid/stop
 * 停止进程（模拟）
 */
router.post('/:pid/stop', (req, res) => {
  const p = processes.find(proc => proc.pid === parseInt(req.params.pid));
  if (!p) {
    return res.status(404).json({ success: false, error: 'Process not found' });
  }
  p.status = 'stopped';
  res.json({ success: true, message: `Process ${p.name} stopped`, data: p });
});

/**
 * GET /api/processes/stats/overview
 * 进程统计概览
 */
router.get('/stats/overview', (_req, res) => {
  const stats = {
    total: processes.length,
    running: processes.filter(p => p.status === 'running').length,
    sleeping: processes.filter(p => p.status === 'sleeping').length,
    stopped: processes.filter(p => p.status === 'stopped').length,
    totalCpu: processes.reduce((sum, p) => sum + p.cpu, 0),
    totalMemory: processes.reduce((sum, p) => sum + p.memory, 0),
    byType: {} as Record<string, number>
  };
  processes.forEach(p => {
    stats.byType[p.type] = (stats.byType[p.type] || 0) + 1;
  });
  res.json({ success: true, data: stats });
});

export default router;
