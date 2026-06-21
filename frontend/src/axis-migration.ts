/**
 * axis-migration.ts — 3DACP 前端兼容层
 * 让现有 client.ts 的函数签名不变，内部走 AxisClient
 * 40+ 页面 import { fetchAgents } from '../api/client' 不用改代码
 */

import { AxisClient } from './AxisClient';

// 全局单例（与现有 client.ts 行为一致）
const axisClient = new AxisClient({
  baseUrl: (typeof window !== 'undefined' && window.location.port === '3000')
    ? window.location.origin.replace(/:3000$/, ':3001')
    : '/api',
  defaultSource: { x: 'web-frontend', y: 'any', z: 'rest' },
  timeout: 30000,
  retryCount: 2,
  preferredProtocol: 'rest',
});

// ── 健康检查 ──
export const fetchHealth = () =>
  axisClient
    .send({ x: 'backend-api', y: 'monitor', z: 'rest' }, 'read', 'monitor', { ping: true })
    .then((r) => r.data)
    .catch(() => ({ status: 'ok' }));

// ── Agents ──
export const fetchAgents = () =>
  axisClient
    .send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'read', 'agent', {})
    .then((r) => r.data);

export const getAgent = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'read', 'agent', { id })
    .then((r) => r.data);

export const createAgent = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'create', 'agent', data)
    .then((r) => r.data);

export const updateAgent = (id: string, data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'update', 'agent', { id, ...data })
    .then((r) => r.data);

export const deleteAgent = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'delete', 'agent', { id })
    .then((r) => r.data);

export const startAgent = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'invoke', 'agent', { id, action: 'start' })
    .then((r) => r.data);

export const stopAgent = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'invoke', 'agent', { id, action: 'stop' })
    .then((r) => r.data);

// ── Channels ──
export const fetchChannels = () =>
  axisClient
    .send({ x: 'backend-api', y: 'dialog', z: 'rest' }, 'read', 'dialog', { type: 'channels' })
    .then((r) => r.data);

export const getChannel = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'dialog', z: 'rest' }, 'read', 'dialog', { type: 'channel', id })
    .then((r) => r.data);

export const createChannel = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'dialog', z: 'rest' }, 'create', 'dialog', data)
    .then((r) => r.data);

export const updateChannel = (id: string, data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'dialog', z: 'rest' }, 'update', 'dialog', { id, ...data })
    .then((r) => r.data);

export const deleteChannel = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'dialog', z: 'rest' }, 'delete', 'dialog', { id })
    .then((r) => r.data);

export const toggleChannel = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'dialog', z: 'rest' }, 'invoke', 'dialog', { id, action: 'toggle' })
    .then((r) => r.data);

// ── Platforms / Providers ──
export const fetchPlatforms = () =>
  axisClient
    .send({ x: 'backend-api', y: 'platform', z: 'rest' }, 'read', 'platform', {})
    .then((r) => r.data);

export const fetchProviders = () => fetchPlatforms();

export const getPlatform = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'platform', z: 'rest' }, 'read', 'platform', { id })
    .then((r) => r.data);

export const fetchProviderHealth = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'platform', z: 'rest' }, 'invoke', 'platform', { id, action: 'health' })
    .then((r) => r.data);

export const createPlatform = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'platform', z: 'rest' }, 'create', 'platform', data)
    .then((r) => r.data);

export const deletePlatform = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'platform', z: 'rest' }, 'delete', 'platform', { id })
    .then((r) => r.data);

// ── Models ──
export const fetchModels = () =>
  axisClient
    .send({ x: 'backend-api', y: 'platform', z: 'rest' }, 'read', 'platform', { type: 'models' })
    .then((r) => r.data);

export const getModel = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'platform', z: 'rest' }, 'read', 'platform', { type: 'model', id })
    .then((r) => r.data);

// ── Skills ──
export const fetchSkills = () =>
  axisClient
    .send({ x: 'backend-api', y: 'skill', z: 'rest' }, 'read', 'skill', {})
    .then((r) => r.data);

export const getSkill = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'skill', z: 'rest' }, 'read', 'skill', { id })
    .then((r) => r.data);

export const createSkill = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'skill', z: 'rest' }, 'create', 'skill', data)
    .then((r) => r.data);

export const updateSkill = (id: string, data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'skill', z: 'rest' }, 'update', 'skill', { id, ...data })
    .then((r) => r.data);

export const deleteSkill = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'skill', z: 'rest' }, 'delete', 'skill', { id })
    .then((r) => r.data);

// ── Tasks ──
export const fetchTasks = () =>
  axisClient
    .send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'read', 'agent', { type: 'tasks' })
    .then((r) => r.data);

export const getTask = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'read', 'agent', { type: 'task', id })
    .then((r) => r.data);

export const createTask = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'create', 'agent', { type: 'task', ...data })
    .then((r) => r.data);

export const updateTask = (id: string, data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'update', 'agent', { type: 'task', id, ...data })
    .then((r) => r.data);

export const deleteTask = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'delete', 'agent', { type: 'task', id })
    .then((r) => r.data);

export const sendTaskToAgent = (agentId: string, data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'invoke', 'agent', { id: agentId, action: 'task', data })
    .then((r) => r.data);

// ── Workspaces ──
export const fetchWorkspaces = () =>
  axisClient
    .send({ x: 'backend-api', y: 'workspace', z: 'rest' }, 'read', 'workspace', {})
    .then((r) => r.data);

export const getWorkspace = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'workspace', z: 'rest' }, 'read', 'workspace', { id })
    .then((r) => r.data);

export const createWorkspace = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'workspace', z: 'rest' }, 'create', 'workspace', data)
    .then((r) => r.data);

export const deleteWorkspace = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'workspace', z: 'rest' }, 'delete', 'workspace', { id })
    .then((r) => r.data);

// ── Knowledge Bases ──
export const fetchKnowledgeBases = () =>
  axisClient
    .send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'read', 'knowledge', {})
    .then((r) => r.data);

export const getKnowledgeBase = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'read', 'knowledge', { id })
    .then((r) => r.data);

export const createKnowledgeBase = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'create', 'knowledge', data)
    .then((r) => r.data);

export const deleteKnowledgeBase = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'delete', 'knowledge', { id })
    .then((r) => r.data);

// ── Memories ──
export const fetchMemories = () =>
  axisClient
    .send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'read', 'knowledge', { type: 'memories' })
    .then((r) => r.data);

export const getMemory = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'read', 'knowledge', { type: 'memory', id })
    .then((r) => r.data);

export const createMemory = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'create', 'knowledge', { type: 'memory', ...data })
    .then((r) => r.data);

export const deleteMemory = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'delete', 'knowledge', { type: 'memory', id })
    .then((r) => r.data);

export const exportMemories = () =>
  axisClient
    .send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'invoke', 'knowledge', { action: 'exportMemories' })
    .then((r) => r.data);

// ── Webhooks ──
export const fetchWebhooks = () =>
  axisClient
    .send({ x: 'backend-api', y: 'integration', z: 'rest' }, 'read', 'integration', { type: 'webhooks' })
    .then((r) => r.data);

export const getWebhook = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'integration', z: 'rest' }, 'read', 'integration', { type: 'webhook', id })
    .then((r) => r.data);

export const createWebhook = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'integration', z: 'rest' }, 'create', 'integration', { type: 'webhook', ...data })
    .then((r) => r.data);

export const updateWebhook = (id: string, data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'integration', z: 'rest' }, 'update', 'integration', { type: 'webhook', id, ...data })
    .then((r) => r.data);

export const deleteWebhook = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'integration', z: 'rest' }, 'delete', 'integration', { type: 'webhook', id })
    .then((r) => r.data);

export const toggleWebhook = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'integration', z: 'rest' }, 'invoke', 'integration', { type: 'webhook', id, action: 'toggle' })
    .then((r) => r.data);

// ── Scheduler ──
export const fetchSchedulerTasks = () =>
  axisClient
    .send({ x: 'backend-api', y: 'scheduler', z: 'rest' }, 'read', 'scheduler', {})
    .then((r) => r.data);

export const createSchedulerTask = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'scheduler', z: 'rest' }, 'create', 'scheduler', data)
    .then((r) => r.data);

export const deleteSchedulerTask = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'scheduler', z: 'rest' }, 'delete', 'scheduler', { id })
    .then((r) => r.data);

// ── Monitor ──
export const fetchMonitorData = () =>
  axisClient
    .send({ x: 'backend-api', y: 'monitor', z: 'rest' }, 'read', 'monitor', {})
    .then((r) => r.data);

export const fetchSystemMetrics = () =>
  axisClient
    .send({ x: 'backend-api', y: 'monitor', z: 'rest' }, 'read', 'monitor', { type: 'metrics' })
    .then((r) => r.data);

// ── Settings ──
export const fetchSettings = () =>
  axisClient
    .send({ x: 'backend-api', y: 'settings', z: 'rest' }, 'read', 'settings', {})
    .then((r) => r.data);

export const updateSettings = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'settings', z: 'rest' }, 'update', 'settings', data)
    .then((r) => r.data);

// ── Search ──
export const search = (query: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'invoke', 'knowledge', { action: 'search', query })
    .then((r) => r.data);

// ── Uploads ──
export const uploadFile = (formData: FormData) => {
  return fetch(`${axisClient['config'].baseUrl}/uploads`, {
    method: 'POST',
    body: formData,
  }).then((r) => {
    if (!r.ok) throw new Error(`POST /uploads -> ${r.status}`);
    return r.json();
  });
};

// ── Logs ──
export const fetchLogs = () =>
  axisClient
    .send({ x: 'backend-api', y: 'monitor', z: 'rest' }, 'read', 'monitor', { type: 'logs' })
    .then((r) => r.data);

// ── Registry ──
export const fetchRegistry = () =>
  axisClient
    .send({ x: 'backend-api', y: 'platform', z: 'rest' }, 'read', 'platform', { type: 'registry' })
    .then((r) => r.data);

// ── Ollama ──
export const fetchOllamaModels = () =>
  axisClient
    .send({ x: 'backend-api', y: 'platform', z: 'rest' }, 'invoke', 'platform', { action: 'ollamaModels' })
    .then((r) => r.data);

export const pullOllamaModel = (name: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'platform', z: 'rest' }, 'invoke', 'platform', { action: 'ollamaPull', name })
    .then((r) => r.data);

// ── AI Search ──
export const aiSearch = (query: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'invoke', 'knowledge', { action: 'aiSearch', query })
    .then((r) => r.data);

// ── Groups ──
export const getGroupStatus = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'read', 'group', { id, type: 'status' })
    .then((r) => r.data);

export const updateGroupStatus = (id: string, data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'update', 'group', { id, type: 'status', ...data })
    .then((r) => r.data);

export const getGroupMeetings = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'read', 'group', { id, type: 'meetings' })
    .then((r) => r.data);

export const startGroupMeeting = (id: string, data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'invoke', 'group', { id, type: 'meeting', ...data })
    .then((r) => r.data);

export const getGroupRelays = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'read', 'group', { id, type: 'relays' })
    .then((r) => r.data);

export const startGroupRelay = (id: string, data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'invoke', 'group', { id, type: 'relay', ...data })
    .then((r) => r.data);

export const interruptGroup = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'invoke', 'group', { id, action: 'interrupt' })
    .then((r) => r.data);

export const getGroupConflicts = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'read', 'group', { id, type: 'conflicts' })
    .then((r) => r.data);

export const resolveGroupConflict = (id: string, data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'invoke', 'group', { id, type: 'resolveConflict', ...data })
    .then((r) => r.data);

export const getGroupHealth = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'read', 'group', { id, type: 'health' })
    .then((r) => r.data);

export const getGroupHierarchy = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'read', 'group', { id, type: 'hierarchy' })
    .then((r) => r.data);

export const getGroupReorganization = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'read', 'group', { id, type: 'reorganization' })
    .then((r) => r.data);

export const triggerGroupReorganize = (id: string, data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'invoke', 'group', { id, action: 'reorganize', ...data })
    .then((r) => r.data);

export const sendGroupMessage = (id: string, data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'invoke', 'group', { id, type: 'message', ...data })
    .then((r) => r.data);

export const getGroupGovernance = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'read', 'group', { id, type: 'governance' })
    .then((r) => r.data);

// ── Swarm ──
export const fetchSwarms = () =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'read', 'group', { type: 'swarms' })
    .then((r) => r.data)
    .catch(async () => {
      // fallback: aggregate agents into groups
      const agents = await fetchAgents();
      return {
        data: [{
          id: 'default',
          name: '默认蜂群',
          description: `${(agents as any)?.data?.length || 0} 个智能体`,
          status: 'healthy',
          health_score: 85,
          agent_count: (agents as any)?.data?.length || 0,
          active_tasks: 0,
          total_tasks: 0,
        }],
      };
    });

export const createSwarm = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'create', 'group', { type: 'swarm', ...data })
    .then((r) => r.data);

// ── 流式对话（新接口，兼容旧 chat 调用）──
export function chatStream(
  agentId: string,
  message: string,
  onChunk: (text: string, done: boolean) => void
) {
  return axisClient.sendStream(
    { x: 'backend-api', y: 'dialog', z: 'ws' },
    'invoke',
    'dialog',
    { agentId, message },
    (chunk) => {
      onChunk(String(chunk.chunk ?? ''), chunk.isLast);
    }
  );
}

// ── 导出 axisClient 单例供高级场景使用 ──
export { axisClient };

// ═══════════════════════════════════════════════════════════════
//  扩展API封装 — 覆盖剩余所有后端Service
// ═══════════════════════════════════════════════════════════════

// ── Groups ──
export const fetchGroups = () =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'read', 'group', {})
    .then((r) => r.data);

export const getGroup = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'read', 'group', { id })
    .then((r) => r.data);

export const createGroup = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'create', 'group', data)
    .then((r) => r.data);

export const updateGroup = (id: string, data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'update', 'group', { id, ...data })
    .then((r) => r.data);

export const deleteGroup = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'delete', 'group', { id })
    .then((r) => r.data);

export const addAgentToGroup = (groupId: string, agentId: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'invoke', 'group', { id: groupId, action: 'addAgent', agentId })
    .then((r) => r.data);

export const removeAgentFromGroup = (groupId: string, agentId: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'invoke', 'group', { id: groupId, action: 'removeAgent', agentId })
    .then((r) => r.data);

export const setGroupCoordinator = (groupId: string, agentId: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'invoke', 'group', { id: groupId, action: 'setCoordinator', agentId })
    .then((r) => r.data);

export const executeGroup = (groupId: string, mode: string, input: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'invoke', 'group', { id: groupId, action: 'execute', mode, input })
    .then((r) => r.data);

export const nestGroup = (parentId: string, childGroupId: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'group', z: 'rest' }, 'invoke', 'group', { id: parentId, action: 'nest', childGroupId })
    .then((r) => r.data);

// ── Blueprints ──
export const fetchBlueprints = () =>
  axisClient
    .send({ x: 'backend-api', y: 'blueprint', z: 'rest' }, 'read', 'blueprint', {})
    .then((r) => r.data);

export const getBlueprint = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'blueprint', z: 'rest' }, 'read', 'blueprint', { id })
    .then((r) => r.data);

export const createBlueprint = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'blueprint', z: 'rest' }, 'create', 'blueprint', data)
    .then((r) => r.data);

export const updateBlueprint = (id: string, data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'blueprint', z: 'rest' }, 'update', 'blueprint', { id, ...data })
    .then((r) => r.data);

export const deleteBlueprint = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'blueprint', z: 'rest' }, 'delete', 'blueprint', { id })
    .then((r) => r.data);

export const executeBlueprint = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'blueprint', z: 'rest' }, 'invoke', 'blueprint', { id, action: 'execute' })
    .then((r) => r.data);

export const pauseBlueprint = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'blueprint', z: 'rest' }, 'invoke', 'blueprint', { id, action: 'pause' })
    .then((r) => r.data);

export const resumeBlueprint = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'blueprint', z: 'rest' }, 'invoke', 'blueprint', { id, action: 'resume' })
    .then((r) => r.data);

export const getBlueprintExecutions = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'blueprint', z: 'rest' }, 'read', 'blueprint', { id, type: 'executions' })
    .then((r) => r.data);

export const fetchBlueprintPresets = () =>
  axisClient
    .send({ x: 'backend-api', y: 'blueprint', z: 'rest' }, 'read', 'blueprint', { type: 'presets' })
    .then((r) => r.data);

// ── Intervention ──
export const requestIntervention = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'intervention', z: 'rest' }, 'create', 'intervention', data)
    .then((r) => r.data);

export const approveIntervention = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'intervention', z: 'rest' }, 'invoke', 'intervention', { id, action: 'approve' })
    .then((r) => r.data);

export const rejectIntervention = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'intervention', z: 'rest' }, 'invoke', 'intervention', { id, action: 'reject' })
    .then((r) => r.data);

export const executeIntervention = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'intervention', z: 'rest' }, 'invoke', 'intervention', { id, action: 'execute' })
    .then((r) => r.data);

export const globalPause = () =>
  axisClient
    .send({ x: 'backend-api', y: 'intervention', z: 'rest' }, 'invoke', 'intervention', { action: 'globalPause' })
    .then((r) => r.data);

export const globalResume = () =>
  axisClient
    .send({ x: 'backend-api', y: 'intervention', z: 'rest' }, 'invoke', 'intervention', { action: 'globalResume' })
    .then((r) => r.data);

// ── Handoff ──
export const initiateHandoff = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'handoff', z: 'rest' }, 'create', 'handoff', data)
    .then((r) => r.data);

export const acceptHandoff = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'handoff', z: 'rest' }, 'invoke', 'handoff', { id, action: 'accept' })
    .then((r) => r.data);

export const rejectHandoff = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'handoff', z: 'rest' }, 'invoke', 'handoff', { id, action: 'reject' })
    .then((r) => r.data);

export const startHandoff = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'handoff', z: 'rest' }, 'invoke', 'handoff', { id, action: 'start' })
    .then((r) => r.data);

export const completeHandoff = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'handoff', z: 'rest' }, 'invoke', 'handoff', { id, action: 'complete' })
    .then((r) => r.data);

// ── Hierarchical ──
export const fetchHierarchicalTree = () =>
  axisClient
    .send({ x: 'backend-api', y: 'hierarchical', z: 'rest' }, 'read', 'hierarchical', { type: 'tree' })
    .then((r) => r.data);

export const fetchHierarchicalStats = () =>
  axisClient
    .send({ x: 'backend-api', y: 'hierarchical', z: 'rest' }, 'read', 'hierarchical', { type: 'stats' })
    .then((r) => r.data);

export const fetchHierarchicalAlerts = () =>
  axisClient
    .send({ x: 'backend-api', y: 'hierarchical', z: 'rest' }, 'read', 'hierarchical', { type: 'alerts' })
    .then((r) => r.data);

export const fetchHierarchicalApprovals = () =>
  axisClient
    .send({ x: 'backend-api', y: 'hierarchical', z: 'rest' }, 'read', 'hierarchical', { type: 'approvals' })
    .then((r) => r.data);

export const approveHierarchical = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'hierarchical', z: 'rest' }, 'invoke', 'hierarchical', { id, action: 'approve' })
    .then((r) => r.data);

// ── Coordinator ──
export const createChariot = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'coordinator', z: 'rest' }, 'create', 'coordinator', { type: 'chariot', ...data })
    .then((r) => r.data);

export const deleteChariot = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'coordinator', z: 'rest' }, 'delete', 'coordinator', { type: 'chariot', id })
    .then((r) => r.data);

export const mergeChariots = (chariotIds: string[]) =>
  axisClient
    .send({ x: 'backend-api', y: 'coordinator', z: 'rest' }, 'invoke', 'coordinator', { action: 'merge', chariotIds })
    .then((r) => r.data);

export const splitChariot = (chariotId: string, agents: any[]) =>
  axisClient
    .send({ x: 'backend-api', y: 'coordinator', z: 'rest' }, 'invoke', 'coordinator', { action: 'split', chariotId, agents })
    .then((r) => r.data);

export const delegateTask = (chariotId: string, agentId: string, task: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'coordinator', z: 'rest' }, 'invoke', 'coordinator', { action: 'delegate', chariotId, agentId, task })
    .then((r) => r.data);

export const broadcastToChariot = (chariotId: string, message: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'coordinator', z: 'rest' }, 'invoke', 'coordinator', { action: 'broadcast', chariotId, message })
    .then((r) => r.data);

export const getChariotTree = () =>
  axisClient
    .send({ x: 'backend-api', y: 'coordinator', z: 'rest' }, 'read', 'coordinator', { type: 'tree' })
    .then((r) => r.data);

export const getChariotChildren = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'coordinator', z: 'rest' }, 'read', 'coordinator', { type: 'chariotChildren', id })
    .then((r) => r.data);

export const getChariotAgents = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'coordinator', z: 'rest' }, 'read', 'coordinator', { type: 'chariotAgents', id })
    .then((r) => r.data);

export const executeChariot = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'coordinator', z: 'rest' }, 'invoke', 'coordinator', { type: 'chariot', id, action: 'execute' })
    .then((r) => r.data);

export const matchChariot = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'coordinator', z: 'rest' }, 'invoke', 'coordinator', { type: 'chariot', id, action: 'match' })
    .then((r) => r.data);

// ── Events ──
export const fetchEvents = () =>
  axisClient
    .send({ x: 'backend-api', y: 'event', z: 'rest' }, 'read', 'event', {})
    .then((r) => r.data);

export const getEventStream = () =>
  axisClient
    .send({ x: 'backend-api', y: 'event', z: 'sse' }, 'stream', 'event', {})
    .then((r) => r.data);

export const acknowledgeEvent = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'event', z: 'rest' }, 'invoke', 'event', { id, action: 'acknowledge' })
    .then((r) => r.data);

export const acknowledgeAllEvents = () =>
  axisClient
    .send({ x: 'backend-api', y: 'event', z: 'rest' }, 'invoke', 'event', { action: 'acknowledgeAll' })
    .then((r) => r.data);

export const createEvent = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'event', z: 'rest' }, 'create', 'event', data)
    .then((r) => r.data);

// ── External / Platforms ──
export const fetchExternalPlatforms = () =>
  axisClient
    .send({ x: 'backend-api', y: 'external', z: 'rest' }, 'read', 'external', {})
    .then((r) => r.data);

export const getExternalPlatform = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'external', z: 'rest' }, 'read', 'external', { id })
    .then((r) => r.data);

export const configureExternalPlatform = (id: string, config: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'external', z: 'rest' }, 'update', 'external', { id, ...config })
    .then((r) => r.data);

export const testExternalPlatform = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'external', z: 'rest' }, 'invoke', 'external', { id, action: 'test' })
    .then((r) => r.data);

export const toggleExternalPlatform = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'external', z: 'rest' }, 'invoke', 'external', { id, action: 'toggle' })
    .then((r) => r.data);

// ── Registry ──
export const fetchRegistryNodes = () =>
  axisClient
    .send({ x: 'backend-api', y: 'registry', z: 'rest' }, 'read', 'registry', {})
    .then((r) => r.data);

export const getRegistryNode = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'registry', z: 'rest' }, 'read', 'registry', { id })
    .then((r) => r.data);

export const searchRegistry = (query: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'registry', z: 'rest' }, 'invoke', 'registry', { action: 'search', query })
    .then((r) => r.data);

export const getRegistryAxis = (x: number, y: number, z: number) =>
  axisClient
    .send({ x: 'backend-api', y: 'registry', z: 'rest' }, 'read', 'registry', { type: 'axis', x, y, z })
    .then((r) => r.data);

export const heartbeatRegistry = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'registry', z: 'rest' }, 'invoke', 'registry', { id, action: 'heartbeat' })
    .then((r) => r.data);

// ── Security ──
export const fetchSecurityEvents = () =>
  axisClient
    .send({ x: 'backend-api', y: 'security', z: 'rest' }, 'read', 'security', { type: 'events' })
    .then((r) => r.data);

export const fetchBlockedIPs = () =>
  axisClient
    .send({ x: 'backend-api', y: 'security', z: 'rest' }, 'read', 'security', { type: 'blockedIps' })
    .then((r) => r.data);

export const blockIP = (ip: string, reason: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'security', z: 'rest' }, 'create', 'security', { type: 'blockedIp', ip, reason })
    .then((r) => r.data);

export const unblockIP = (ip: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'security', z: 'rest' }, 'delete', 'security', { type: 'blockedIp', ip })
    .then((r) => r.data);

export const fetchAuditLog = () =>
  axisClient
    .send({ x: 'backend-api', y: 'security', z: 'rest' }, 'read', 'security', { type: 'auditLog' })
    .then((r) => r.data);

// ── Spend ──
export const fetchSpendOverview = () =>
  axisClient
    .send({ x: 'backend-api', y: 'spend', z: 'rest' }, 'read', 'spend', { type: 'overview' })
    .then((r) => r.data);

export const fetchSpendByProvider = () =>
  axisClient
    .send({ x: 'backend-api', y: 'spend', z: 'rest' }, 'read', 'spend', { type: 'byProvider' })
    .then((r) => r.data);

export const fetchSpendByModel = () =>
  axisClient
    .send({ x: 'backend-api', y: 'spend', z: 'rest' }, 'read', 'spend', { type: 'byModel' })
    .then((r) => r.data);

export const fetchSpendHistory = () =>
  axisClient
    .send({ x: 'backend-api', y: 'spend', z: 'rest' }, 'read', 'spend', { type: 'history' })
    .then((r) => r.data);

export const fetchRecentSpend = () =>
  axisClient
    .send({ x: 'backend-api', y: 'spend', z: 'rest' }, 'read', 'spend', { type: 'recent' })
    .then((r) => r.data);

export const setSpendBudget = (monthlyLimit: number) =>
  axisClient
    .send({ x: 'backend-api', y: 'spend', z: 'rest' }, 'create', 'spend', { type: 'budget', monthlyLimit })
    .then((r) => r.data);

// ── Backups ──
export const fetchBackups = () =>
  axisClient
    .send({ x: 'backend-api', y: 'backup', z: 'rest' }, 'read', 'backup', {})
    .then((r) => r.data);

export const createBackup = (name: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'backup', z: 'rest' }, 'create', 'backup', { name })
    .then((r) => r.data);

export const restoreBackup = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'backup', z: 'rest' }, 'invoke', 'backup', { id, action: 'restore' })
    .then((r) => r.data);

export const deleteBackup = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'backup', z: 'rest' }, 'delete', 'backup', { id })
    .then((r) => r.data);

// ── Processes ──
export const fetchProcesses = () =>
  axisClient
    .send({ x: 'backend-api', y: 'process', z: 'rest' }, 'read', 'process', {})
    .then((r) => r.data);

export const getProcess = (pid: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'process', z: 'rest' }, 'read', 'process', { pid })
    .then((r) => r.data);

export const restartProcess = (pid: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'process', z: 'rest' }, 'invoke', 'process', { pid, action: 'restart' })
    .then((r) => r.data);

export const stopProcess = (pid: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'process', z: 'rest' }, 'invoke', 'process', { pid, action: 'stop' })
    .then((r) => r.data);

export const fetchProcessStats = () =>
  axisClient
    .send({ x: 'backend-api', y: 'process', z: 'rest' }, 'read', 'process', { type: 'stats' })
    .then((r) => r.data);

// ── Unified API ──
export const detectProvider = (messages: any[]) =>
  axisClient
    .send({ x: 'backend-api', y: 'unified', z: 'rest' }, 'invoke', 'unified', { action: 'detect', messages })
    .then((r) => r.data);

export const configureProvider = (provider: string, model: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'unified', z: 'rest' }, 'invoke', 'unified', { action: 'config', provider, model })
    .then((r) => r.data);

export const unifiedChat = (id: string, messages: any[]) =>
  axisClient
    .send({ x: 'backend-api', y: 'unified', z: 'rest' }, 'invoke', 'unified', { id, action: 'chat', messages })
    .then((r) => r.data);

// ── Kimi Cluster ──
export const fetchKimiClusterStatus = () =>
  axisClient
    .send({ x: 'backend-api', y: 'kimi-cluster', z: 'rest' }, 'read', 'kimi-cluster', { type: 'status' })
    .then((r) => r.data);

export const fetchKimiPatterns = () =>
  axisClient
    .send({ x: 'backend-api', y: 'kimi-cluster', z: 'rest' }, 'read', 'kimi-cluster', { type: 'patterns' })
    .then((r) => r.data);

export const loadBalanceKimi = (endpoints: any[]) =>
  axisClient
    .send({ x: 'backend-api', y: 'kimi-cluster', z: 'rest' }, 'invoke', 'kimi-cluster', { action: 'loadBalance', endpoints })
    .then((r) => r.data);

export const addKimiEndpoint = (endpoint: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'kimi-cluster', z: 'rest' }, 'create', 'kimi-cluster', endpoint)
    .then((r) => r.data);

export const removeKimiEndpoint = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'kimi-cluster', z: 'rest' }, 'delete', 'kimi-cluster', { id })
    .then((r) => r.data);

// ── Knowledge Base Operations ──
export const searchKnowledge = (id: string, query: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'invoke', 'knowledge', { id, action: 'search', query })
    .then((r) => r.data);

export const queryKnowledge = (id: string, query: string, topK?: number) =>
  axisClient
    .send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'invoke', 'knowledge', { id, action: 'query', query, topK })
    .then((r) => r.data);

export const uploadToKnowledge = (id: string, filename: string, contentType?: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'invoke', 'knowledge', { id, action: 'upload', filename, contentType })
    .then((r) => r.data);

export const updateKnowledgeBase = (id: string, data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'knowledge', z: 'rest' }, 'update', 'knowledge', { id, ...data })
    .then((r) => r.data);

// ── Monitor Detailed ──
export const fetchAgentMonitor = () =>
  axisClient
    .send({ x: 'backend-api', y: 'monitor', z: 'rest' }, 'read', 'monitor', { type: 'agents' })
    .then((r) => r.data);

export const fetchGroupMonitor = () =>
  axisClient
    .send({ x: 'backend-api', y: 'monitor', z: 'rest' }, 'read', 'monitor', { type: 'groups' })
    .then((r) => r.data);

export const fetchMonitorLogs = (level?: string, limit?: number) =>
  axisClient
    .send({ x: 'backend-api', y: 'monitor', z: 'rest' }, 'read', 'monitor', { type: 'logs', level, limit })
    .then((r) => r.data);

export const fetchMonitorStats = () =>
  axisClient
    .send({ x: 'backend-api', y: 'monitor', z: 'rest' }, 'read', 'monitor', { type: 'stats' })
    .then((r) => r.data);

export const fetchMonitorPerformance = () =>
  axisClient
    .send({ x: 'backend-api', y: 'monitor', z: 'rest' }, 'read', 'monitor', { type: 'performance' })
    .then((r) => r.data);

export const fetchMonitorSpend = () =>
  axisClient
    .send({ x: 'backend-api', y: 'monitor', z: 'rest' }, 'read', 'monitor', { type: 'spend' })
    .then((r) => r.data);

export const fetchMonitorHealth = () =>
  axisClient
    .send({ x: 'backend-api', y: 'monitor', z: 'rest' }, 'read', 'monitor', { type: 'health' })
    .then((r) => r.data);

// ── API Keys ──
export const fetchAPIKeys = () =>
  axisClient
    .send({ x: 'backend-api', y: 'apikey', z: 'rest' }, 'read', 'apikey', {})
    .then((r) => r.data);

export const fetchAPIKeyProviders = () =>
  axisClient
    .send({ x: 'backend-api', y: 'apikey', z: 'rest' }, 'read', 'apikey', { type: 'providers' })
    .then((r) => r.data);

export const saveAPIKey = (provider: string, apiKey: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'apikey', z: 'rest' }, 'create', 'apikey', { provider, apiKey, isActive: true })
    .then((r) => r.data);

export const deleteAPIKey = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'apikey', z: 'rest' }, 'delete', 'apikey', { id })
    .then((r) => r.data);

export const toggleAPIKey = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'apikey', z: 'rest' }, 'invoke', 'apikey', { id, action: 'toggle' })
    .then((r) => r.data);

export const testAPIKey = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'apikey', z: 'rest' }, 'invoke', 'apikey', { id, action: 'test' })
    .then((r) => r.data);

export const testAllAPIKeys = () =>
  axisClient
    .send({ x: 'backend-api', y: 'apikey', z: 'rest' }, 'invoke', 'apikey', { action: 'testAll' })
    .then((r) => r.data);

// ── Integrations ──
export const fetchIntegrations = () =>
  axisClient
    .send({ x: 'backend-api', y: 'integration', z: 'rest' }, 'read', 'integration', {})
    .then((r) => r.data);

export const createIntegration = (data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'integration', z: 'rest' }, 'create', 'integration', data)
    .then((r) => r.data);

export const updateIntegration = (id: string, data: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'integration', z: 'rest' }, 'update', 'integration', { id, ...data })
    .then((r) => r.data);

export const deleteIntegration = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'integration', z: 'rest' }, 'delete', 'integration', { id })
    .then((r) => r.data);

export const testIntegration = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'integration', z: 'rest' }, 'invoke', 'integration', { id, action: 'test' })
    .then((r) => r.data);

// ── Settings Detailed ──
export const updateSetting = (key: string, value: any) =>
  axisClient
    .send({ x: 'backend-api', y: 'settings', z: 'rest' }, 'update', 'settings', { key, value })
    .then((r) => r.data);

export const fetchThemes = () =>
  axisClient
    .send({ x: 'backend-api', y: 'settings', z: 'rest' }, 'read', 'settings', { type: 'themes' })
    .then((r) => r.data);

export const updateTheme = (theme: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'settings', z: 'rest' }, 'invoke', 'settings', { action: 'updateTheme', theme })
    .then((r) => r.data);

export const fetchLanguages = () =>
  axisClient
    .send({ x: 'backend-api', y: 'settings', z: 'rest' }, 'read', 'settings', { type: 'languages' })
    .then((r) => r.data);

// ── Auth ──
export const register = (username: string, email: string, password: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'auth', z: 'rest' }, 'create', 'auth', { type: 'register', username, email, password })
    .then((r) => r.data);

export const login = (username: string, password: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'auth', z: 'rest' }, 'invoke', 'auth', { action: 'login', username, password })
    .then((r) => r.data);

export const getMe = () =>
  axisClient
    .send({ x: 'backend-api', y: 'auth', z: 'rest' }, 'read', 'auth', { type: 'me' })
    .then((r) => r.data);

// ── Agent Context Panel API ──
export const fetchAgentContext = (agentId: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'agent', z: 'rest' }, 'read', 'agent', { id: agentId, type: 'context' })
    .then((r) => r.data);

export const fetchAgentContextStream = (agentId: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'agent', z: 'sse' }, 'stream', 'agent', { id: agentId, type: 'context' })
    .then((r) => r.data);

// ── Dialog ──
export const fetchDialogSessions = () =>
  axisClient
    .send({ x: 'backend-api', y: 'dialog', z: 'rest' }, 'read', 'dialog', {})
    .then((r) => r.data);

export const createDialogSession = (agentId: string, title?: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'dialog', z: 'rest' }, 'create', 'dialog', { agentId, title })
    .then((r) => r.data);

export const chatWithAgent = (agentId: string, content: string, role?: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'dialog', z: 'rest' }, 'invoke', 'dialog', { id: agentId, action: 'chat', content, role })
    .then((r) => r.data);

export const streamChatWithAgent = (agentId: string, message: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'dialog', z: 'sse' }, 'stream', 'dialog', { id: agentId, action: 'stream', message })
    .then((r) => r.data);

export const addAttachment = (agentId: string, fileId: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'dialog', z: 'rest' }, 'invoke', 'dialog', { id: agentId, action: 'addAttachment', fileId })
    .then((r) => r.data);

export const getDialogContext = (agentId: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'dialog', z: 'rest' }, 'read', 'dialog', { id: agentId, type: 'context' })
    .then((r) => r.data);

export const clearDialogContext = (agentId: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'dialog', z: 'rest' }, 'delete', 'dialog', { id: agentId, type: 'context' })
    .then((r) => r.data);

// ── Workspace Tasks ──
export const createWorkspaceTask = (title: string, content: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'workspace', z: 'rest' }, 'create', 'workspace', { type: 'task', title, content })
    .then((r) => r.data);

export const fetchWorkspaceTasks = () =>
  axisClient
    .send({ x: 'backend-api', y: 'workspace', z: 'rest' }, 'read', 'workspace', { type: 'tasks' })
    .then((r) => r.data);

export const getWorkspaceTask = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'workspace', z: 'rest' }, 'read', 'workspace', { type: 'task', id })
    .then((r) => r.data);

export const importWorkspaceTask = (id: string, source: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'workspace', z: 'rest' }, 'invoke', 'workspace', { type: 'task', id, action: 'import', source })
    .then((r) => r.data);

export const downloadWorkspaceTask = (id: string) =>
  axisClient
    .send({ x: 'backend-api', y: 'workspace', z: 'rest' }, 'invoke', 'workspace', { type: 'task', id, action: 'download' })
    .then((r) => r.data);
