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

const app = express();

// ─── 全局中间件 ───────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── 全局速率限制 ─────────────────────────────────────
app.use(rateLimit({ windowMs: 60 * 1000, maxRequests: 100 }));

// ─── 可选认证（解析用户信息但不强制） ──────────────────
app.use(optionalAuth);

// ─── 健康检查 ─────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 认证路由（无需认证） ─────────────────────────────
app.use('/api/auth', authRouter);

// ─── API 路由挂载（20 模块 / 140+ 端点）─────────────────
app.use('/api/agents', agentsRouter);           // Agent CRUD + 上下文
app.use('/api/groups', groupsRouter);             // 群组编排
app.use('/api/coordinator-hierarchy', coordinatorRouter); // 层级协调
app.use('/api/handoff', handoffRouter);           // 交接机制
app.use('/api/intervention', interventionRouter); // 干预系统
app.use('/api/dialog', dialogRouter);             // 对话中心
app.use('/api/unified-api', unifiedAPIRouter);    // 统一API
app.use('/api/workspace', workspaceRouter);       // 工作区
app.use('/api/knowledge-bases', knowledgeRouter); // 知识库
app.use('/api/skills', skillsRouter);             // 技能
app.use('/api/integrations', integrationsRouter); // 集成
app.use('/api/monitor', monitorRouter);           // 监控
app.use('/api/blueprints', blueprintsRouter);     // 蓝图
app.use('/api/settings', settingsRouter);           // 设置
app.use('/api/tasks', tasksRouter);                 // 任务
app.use('/api/platforms', platformsRouter);         // 平台
app.use('/api/kimi-cluster', kimiClusterRouter);      // KIMI集群
app.use('/api/apikeys', apiKeysRouter);               // API密钥
app.use('/api/agent-context', agentContextRouter);    // Agent上下文详情
app.use('/api/spend', spendRouter);                   // 用量追踪
app.use('/api/backups', backupsRouter);               // 备份管理
app.use('/api/events', eventsRouter);                 // 系统事件
app.use('/api/registry', registryRouter);             // 3DACP注册中心
app.use('/api/processes', processesRouter);           // 进程监控
app.use('/api/external', externalRouter);             // 外部平台
app.use('/api/security', securityRouter);             // 安全中心

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