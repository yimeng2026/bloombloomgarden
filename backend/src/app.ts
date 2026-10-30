import path from 'path';
import { config as loadDotenv } from 'dotenv';
import express from 'express';

// Support both `npm run dev` at the repository root and `npm run dev` in backend/.
loadDotenv({ path: path.resolve(process.cwd(), '.env') });
loadDotenv({ path: path.resolve(__dirname, '../../.env') });
import helmet from 'helmet';
import { rateLimit, optionalAuth, agentKeyAuth } from './middleware/auth';

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
import chatAccountsRouter from './routes/chat-accounts';
import agentTemplatesRouter from './routes/agent-templates';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, maxRequests: 100 }));
app.use('/api', agentKeyAuth);
app.use(optionalAuth);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', mode: 'headless-kimi', timestamp: new Date().toISOString(), version: '2.0.0' });
});
app.get('/health', (_req, res) => {
  res.setHeader('Deprecation', 'true');
  res.json({ status: 'ok', mode: 'headless-kimi', timestamp: new Date().toISOString(), note: 'Use /api/health' });
});

app.use('/api/auth', authRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/coordinator-hierarchy', coordinatorRouter);
app.use('/api/handoff', handoffRouter);
app.use('/api/intervention', interventionRouter);
app.use('/api/dialog', dialogRouter);
app.use('/api/unified-api', unifiedAPIRouter);
app.use('/api/workspace', workspaceRouter);
app.use('/api/knowledge-bases', knowledgeRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/monitor', monitorRouter);
app.use('/api/blueprints', blueprintsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/platform-details', platformDetailsRouter);
app.use('/api/platforms', platformsRouter);
app.use('/api/kimi-cluster', kimiClusterRouter);
app.use('/api/apikeys', apiKeysRouter);
app.use('/api/agent-context', agentContextRouter);
app.use('/api/spend', spendRouter);
app.use('/api/backups', backupsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/registry', registryRouter);
app.use('/api/processes', processesRouter);
app.use('/api/external', externalRouter);
app.use('/api/security', securityRouter);
app.use('/api/subtools', subtoolsRouter);
app.use('/api/frameworks', frameworksRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/engines', enginesRouter);
app.use('/api/swarm', swarmRouter);
app.use('/api/canvas', canvasRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api/chat-accounts', chatAccountsRouter);
app.use('/api/agent-templates', agentTemplatesRouter);

app.get('/api/dashboard/state', async (_req, res) => {
  const { getAgentService, getMonitorService, getTaskService } = await import('./services');
  const [agents, stats, taskData] = await Promise.all([
    getAgentService().list(),
    Promise.resolve(getMonitorService().getStats()),
    getTaskService().listTasks(),
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

app.get('/api/intervention/status', async (_req, res) => {
  const { getInterventionService, InterventionStatus } = await import('./services/CollabFramework');
  const queue = await getInterventionService().getQueue();
  const stats = {
    pending: queue.filter((record) => record.status === InterventionStatus.PENDING).length,
    approved: queue.filter((record) => record.status === InterventionStatus.APPROVED).length,
    rejected: queue.filter((record) => record.status === InterventionStatus.REJECTED).length,
    total: queue.length,
  };
  res.json({ success: true, data: { status: 'active', stats, queue: queue.slice(-10) } });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

export default app;
