import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { rateLimit, optionalAuth } from './middleware/auth';

import agentsRouter from './routes/agents';
import groupsRouter from './routes/groups';
import coordinatorRouter from './routes/coordinator';
import handoffRouter from './routes/handoff';
import interventionRouter from './routes/intervention';
import dialogRouter from './routes/dialog';
import unifiedAPIRouter from './routes/unified-api';
import workspaceRouter from './routes/workspace';
import knowledgeRouter from './routes/knowledge';
import skillsRouter from './routes/skills';
import integrationsRouter from './routes/integrations';
import monitorRouter from './routes/monitor';
import blueprintsRouter from './routes/blueprints';
import settingsRouter from './routes/settings';
import authRouter from './routes/auth';
import tasksRouter from './routes/tasks';
import platformDetailsRouter from './routes/platform-details';
import platformsRouter from './routes/platforms';
import kimiClusterRouter from './routes/kimi-cluster';
import apiKeysRouter from './routes/apikeys';
import agentContextRouter from './routes/agent-context';
import spendRouter from './routes/spend';
import backupsRouter from './routes/backups';
import eventsRouter from './routes/events';
import registryRouter from './routes/registry';
import processesRouter from './routes/processes';
import externalRouter from './routes/external';
import securityRouter from './routes/security';
import subtoolsRouter from './routes/subtools';
import frameworksRouter from './routes/frameworks';
import teamsRouter from './routes/teams';
import rolesRouter from './routes/roles';
import enginesRouter from './routes/engines';
import swarmRouter from './routes/swarm';
import canvasRouter from './routes/canvas';
import workflowsRouter from './routes/workflows';

const app = express();

// ─── 全局中间�?───────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  }));

// CORS 配置 �?允许 Vercel 前端 + 本地开�?+ Railway 后端
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.match(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/)) return callback(null, true);
    const allowed = [
      'https://bloombloomgarden.vercel.app',
      'https://bloombloomgarden-production.up.railway.app',
    ];
    if (allowed.includes(origin)) return callback(null, true);
    callback(new Error('CORS blocked: ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── 全局速率限制 ─────────────────────────────────────
app.use(rateLimit({ windowMs: 60 * 1000, maxRequests: 100 }));

// ─── 可选认证（解析用户信息但不强制�?──────────────────
app.use(optionalAuth);

// --- Health Check (统一入口) ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// --- Health Check (向后兼容，已废弃，将在v2移除) ---
app.get('/health', (_req, res) => {
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', 'Sat, 01 Aug 2026 00:00:00 GMT');
  res.json({ status: 'ok', timestamp: new Date().toISOString(), note: '此端点已废弃，请使用 /api/health' });
});

// ─── 认证路由（无需认证�?─────────────────────────────
app.use('/api/auth', authRouter);

// ─── API 路由挂载�?0 模块 / 140+ 端点）─────────────────
app.use('/api/agents', agentsRouter);           // Agent CRUD + 上下�?
app.use('/api/groups', groupsRouter);             // 群组编排
app.use('/api/coordinator-hierarchy', coordinatorRouter); // 层级协调
app.use('/api/handoff', handoffRouter);           // 交接机制
app.use('/api/intervention', interventionRouter); // 干预系统
app.use('/api/dialog', dialogRouter);             // 对话中心
app.use('/api/unified-api', unifiedAPIRouter);    // 统一API
app.use('/api/workspace', workspaceRouter);       // 工作�?
app.use('/api/knowledge-bases', knowledgeRouter); // 知识�?
app.use('/api/skills', skillsRouter);             // 技�?
app.use('/api/integrations', integrationsRouter); // 集成
app.use('/api/monitor', monitorRouter);           // 监控
app.use('/api/blueprints', blueprintsRouter);     // 蓝图
app.use('/api/settings', settingsRouter);           // 设置
app.use('/api/tasks', tasksRouter);                 // 任务
app.use('/api/platform-details', platformDetailsRouter);
app.use('/api/platforms', platformsRouter);         // 平台
app.use('/api/kimi-cluster', kimiClusterRouter);      // KIMI集群
app.use('/api/apikeys', apiKeysRouter);               // API密钥
app.use('/api/agent-context', agentContextRouter);    // Agent上下文详�?
app.use('/api/spend', spendRouter);                   // 用量追踪
app.use('/api/backups', backupsRouter);               // 备份管理
app.use('/api/events', eventsRouter);                 // 系统事件
app.use('/api/registry', registryRouter);             // 3DACP注册中心
app.use('/api/processes', processesRouter);           // 进程监控
app.use('/api/external', externalRouter);             // 外部平台
app.use('/api/security', securityRouter);             // 安全中心
app.use('/api/subtools', subtoolsRouter);             // 子工具CLI Agent

// ─── v4.0 新路由 ──────────────────────────────────────
app.use('/api/frameworks', frameworksRouter);       // 框架市场
app.use('/api/teams', teamsRouter);                   // 团队管理
app.use('/api/roles', rolesRouter);                   // 角色管理
app.use('/api/engines', enginesRouter);               // 引擎调度             // 子工�?CLI Agent (3D坐标�?Z�?

app.use('/api/swarm', swarmRouter);                   // 蜂群协调
app.use('/api/canvas', canvasRouter);                 // 协作画布
app.use('/api/workflows', workflowsRouter);           // 工作流

// ─── Dashboard 聚合端点�?Coordinator 要求）─────────────
app.get('/api/dashboard/state', async (_req, res) => {
  const { getAgentService } = await import('./services');
  const { getMonitorService } = await import('./services');
  const { getTaskService } = await import('./services');
  const agentSvc = getAgentService();
  const monitorSvc = getMonitorService();
  const taskSvc = getTaskService();
  const [agents, stats, taskData] = await Promise.all([
    agentSvc.list(),
    Promise.resolve(monitorSvc.getStats()),
    taskSvc.listTasks(),
  ]);
  res.json({
    success: true,
    data: {
      agents: { count: agents.length, items: agents.slice(0, 10) },
      system: stats,
      tasks: { count: taskData.total, recent: taskData.tasks.slice(-5) },
      timestamp: new Date().toISOString(),
    },
  });
});

// ─── Intervention 状态汇总端点（Coordinator 要求）──────
app.get('/api/intervention/status', async (_req, res) => {
  const { getInterventionService, InterventionStatus } = await import('./services/CollabFramework');
  const svc = getInterventionService();
  const queue = await svc.getQueue();
  const stats = {
    pending: queue.filter((r: any) => r.status === InterventionStatus.PENDING).length,
    approved: queue.filter((r: any) => r.status === InterventionStatus.APPROVED).length,
    rejected: queue.filter((r: any) => r.status === InterventionStatus.REJECTED).length,
    total: queue.length,
  };
  res.json({ success: true, data: { status: 'active', stats, queue: queue.slice(-10) } });
});

// ─── 全局错误处理 ─────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

export default app;


