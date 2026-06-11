/* ── API Client �?Unified Backend (v2) ── */
// 分离部署：前�?Vercel) �?后端(Railway)
// 优先从环境变量读取，否则回退到本地开发地址
const API_BASE = import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.PROD ? 'https://bloombloomgarden-production.up.railway.app/api' : 'http://localhost:3001/api');

// Electron 环境检测：如果运行在 Electron 中，强制使用本地后端
function isElectron() {
  return !!(window && (window as any).electronAPI);
}

const EFFECTIVE_API_BASE = isElectron() ? 'http://localhost:3001/api' : API_BASE;

async function get(path: string) {
  const res = await fetch(`${EFFECTIVE_API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} �?${res.status}`);
  return res.json();
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${EFFECTIVE_API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} �?${res.status}`);
  return res.json();
}

async function put(path: string, body: unknown) {
  const res = await fetch(`${EFFECTIVE_API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} �?${res.status}`);
  return res.json();
}

async function del(path: string) {
  const res = await fetch(`${EFFECTIVE_API_BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} �?${res.status}`);
  return res.json();
}

/* ── Health ── */
export const fetchHealth = () => get('/health');

/* ── Agents ── */
export const fetchAgents = () => get('/agents');
export const getAgent = (id: string) => get(`/agents/${id}`);
export const createAgent = (data: any) => post('/agents', data);
export const updateAgent = (id: string, data: any) => put(`/agents/${id}`, data);
export const deleteAgent = (id: string) => del(`/agents/${id}`);
export const startAgent = (id: string) => post(`/agents/${id}/start`, {});
export const stopAgent = (id: string) => post(`/agents/${id}/stop`, {});

/* ── Groups ── */
export const fetchGroups = () => get('/groups');
export const getGroup = (id: string) => get(`/groups/${id}`);
export const createGroup = (data: any) => post('/groups', data);
export const updateGroup = (id: string, data: any) => put(`/groups/${id}`, data);
export const deleteGroup = (id: string) => del(`/groups/${id}`);
export const addAgentToGroup = (groupId: string, agentId: string) => post(`/groups/${groupId}/agents`, { agentId });
export const removeAgentFromGroup = (groupId: string, agentId: string) => del(`/groups/${groupId}/agents/${agentId}`);
export const assignCoordinator = (groupId: string, coordinatorId: string) => post(`/groups/${groupId}/coordinator`, { coordinatorId });
export const nestGroup = (groupId: string, parentId: string) => post(`/groups/${groupId}/nest`, { parentId });
export const executeGroup = (groupId: string, data?: any) => post(`/groups/${groupId}/execute`, data || {});

/* ── Blueprints ── */
export const fetchBlueprints = () => get('/blueprints');
export const getBlueprint = (id: string) => get(`/blueprints/${id}`);
export const createBlueprint = (data: any) => post('/blueprints', data);
export const updateBlueprint = (id: string, data: any) => put(`/blueprints/${id}`, data);
export const deleteBlueprint = (id: string) => del(`/blueprints/${id}`);
export const executeBlueprint = (id: string, data?: any) => post(`/blueprints/${id}/execute`, data || {});
export const getBlueprintExecutions = (id: string) => get(`/blueprints/${id}/executions`);
export const getBlueprintPresets = () => get('/blueprints/presets');
export const pauseBlueprint = (id: string) => post(`/blueprints/${id}/pause`, {});
export const resumeBlueprint = (id: string) => post(`/blueprints/${id}/resume`, {});

/* ── SubTools ── */
export const fetchSubTools = () => get('/subtools');
export const getSubTool = (id: string) => get(`/subtools/${id}`);
export const installSubTool = (id: string) => post(`/subtools/${id}/install`, {});
export const startSubTool = (id: string) => post(`/subtools/${id}/start`, {});
export const stopSubTool = (id: string) => post(`/subtools/${id}/stop`, {});
export const fetchChannels = () => get('/channels');
export const getChannel = (id: string) => get(`/channels/${id}`);
export const createChannel = (data: any) => post('/channels', data);
export const updateChannel = (id: string, data: any) => put(`/channels/${id}`, data);
export const deleteChannel = (id: string) => del(`/channels/${id}`);
export const toggleChannel = (id: string) => post(`/channels/${id}/toggle`, {});

/* ── Platforms / Providers ── */
export const fetchPlatforms = () => get('/platforms');
export const fetchProviders = () => get('/platforms');
export const fetchPlatformsByLevel = (level: number) => get(`/platforms?protocolLevel=${level}`);
export const getPlatform = (id: string) => get(`/platforms/${id}`);
export const fetchProviderHealth = (id: string) => get(`/platforms/${id}/health`);
export const createPlatform = (data: any) => post('/platforms', data);
export const deletePlatform = (id: string) => del(`/platforms/${id}`);

/* ── Models ── */
export const fetchModels = () => get('/models');
export const getModel = (id: string) => get(`/models/${id}`);

/* ── Skills ── */
export const fetchSkills = () => get('/skills');
export const getSkill = (id: string) => get(`/skills/${id}`);
export const createSkill = (data: any) => post('/skills', data);
export const updateSkill = (id: string, data: any) => put(`/skills/${id}`, data);
export const deleteSkill = (id: string) => del(`/skills/${id}`);

/* ── Tasks ── */
export const fetchTasks = () => get('/tasks');
export const getTask = (id: string) => get(`/tasks/${id}`);
export const createTask = (data: any) => post('/tasks', data);
export const updateTask = (id: string, data: any) => put(`/tasks/${id}`, data);
export const deleteTask = (id: string) => del(`/tasks/${id}`);
export const sendTaskToAgent = (agentId: string, data: any) => post(`/agents/${agentId}/tasks`, data);

/* ── Workspaces ── */
export const fetchWorkspaces = () => get('/workspaces');
export const getWorkspace = (id: string) => get(`/workspaces/${id}`);
export const createWorkspace = (data: any) => post('/workspaces', data);
export const deleteWorkspace = (id: string) => del(`/workspaces/${id}`);

/* ── Knowledge Bases ── */
export const fetchKnowledgeBases = () => get('/knowledge-bases');
export const getKnowledgeBase = (id: string) => get(`/knowledge-bases/${id}`);
export const createKnowledgeBase = (data: any) => post('/knowledge-bases', data);
export const deleteKnowledgeBase = (id: string) => del(`/knowledge-bases/${id}`);

/* ── Memories ── */
export const fetchMemories = () => get('/memories');
export const getMemory = (id: string) => get(`/memories/${id}`);
export const createMemory = (data: any) => post('/memories', data);
export const deleteMemory = (id: string) => del(`/memories/${id}`);
export const exportMemories = () => post('/memories/export', {});

/* ── Webhooks ── */
export const fetchWebhooks = () => get('/webhooks');
export const getWebhook = (id: string) => get(`/webhooks/${id}`);
export const createWebhook = (data: any) => post('/webhooks', data);
export const updateWebhook = (id: string, data: any) => put(`/webhooks/${id}`, data);
export const deleteWebhook = (id: string) => del(`/webhooks/${id}`);
export const toggleWebhook = (id: string) => post(`/webhooks/${id}/toggle`, {});

/* ── Scheduler ── */
export const fetchSchedulerTasks = () => get('/scheduler');
export const createSchedulerTask = (data: any) => post('/scheduler', data);
export const deleteSchedulerTask = (id: string) => del(`/scheduler/${id}`);

/* ── Monitor ── */
export const fetchMonitorData = () => get('/monitor');
export const fetchSystemMetrics = () => get('/monitor/metrics');

/* ── Settings ── */
export const fetchSettings = () => get('/settings');
export const updateSettings = (data: any) => put('/settings', data);

/* ── Search ── */
export const search = (query: string) => get(`/search?q=${encodeURIComponent(query)}`);

/* ── Uploads ── */
export const uploadFile = (formData: FormData) => {
  return fetch(`${EFFECTIVE_API_BASE}/uploads`, {
    method: 'POST',
    body: formData,
  }).then(r => {
    if (!r.ok) throw new Error(`POST /uploads �?${r.status}`);
    return r.json();
  });
};

/* ── Logs ── */
export const fetchLogs = () => get('/logs');

/* ── Registry ── */
export const fetchRegistry = () => get('/registry');

/* ── Ollama ── */
export const fetchOllamaModels = () => get('/ollama/models');
export const pullOllamaModel = (name: string) => post('/ollama/pull', { name });

/* ── AI Search ── */
export const aiSearch = (query: string) => post('/ai-search', { query });

/* ── Groups / 协作�?── */
export const getGroupStatus = (id: string) => get(`/groups/${id}/status`);
export const updateGroupStatus = (id: string, data: any) => put(`/groups/${id}/status`, data);
export const getGroupMeetings = (id: string) => get(`/groups/${id}/meetings`);
export const startGroupMeeting = (id: string, data: any) => post(`/groups/${id}/meeting`, data);
export const getGroupRelays = (id: string) => get(`/groups/${id}/relays`);
export const startGroupRelay = (id: string, data: any) => post(`/groups/${id}/relay`, data);
export const interruptGroup = (id: string) => post(`/groups/${id}/interrupt`, {});
export const getGroupConflicts = (id: string) => get(`/groups/${id}/conflicts`);
export const resolveGroupConflict = (id: string, data: any) => post(`/groups/${id}/resolve`, data);
export const getGroupHealth = (id: string) => get(`/groups/${id}/health`);
export const getGroupHierarchy = (id: string) => get(`/groups/${id}/hierarchy`);
export const getGroupReorganization = (id: string) => get(`/groups/${id}/reorganization`);
export const triggerGroupReorganize = (id: string, data: any) => post(`/groups/${id}/reorganize`, data);
export const sendGroupMessage = (id: string, data: any) => post(`/groups/${id}/messages`, data);
export const getGroupGovernance = (id: string) => get(`/groups/${id}/governance`);
export const getGroupTree = (id: string) => get(`/groups/${id}/tree`);
export const addEntityToGroup = (groupId: string, entityId: string, entityType?: string) =>
  post(`/groups/${groupId}/entities`, { entityId, entityType: entityType || (entityId.startsWith('g-') ? 'group' : 'agent') });

/* ── Workflows ── */
export const fetchWorkflows = () => get('/workflows');
export const getWorkflow = (id: string) => get(`/workflows/${id}`);
export const createWorkflow = (data: any) => post('/workflows', data);
export const updateWorkflow = (id: string, data: any) => put(`/workflows/${id}`, data);
export const deleteWorkflow = (id: string) => del(`/workflows/${id}`);
export const executeWorkflow = (id: string, data?: any) => post(`/workflows/${id}/execute`, data || {});

/* ── Chariot / 战车 (Coordinator-Hierarchy) ── */
export const fetchChariots = () => get('/coordinator-hierarchy/tree');
export const getChariot = (id: string) => get(`/coordinator-hierarchy/chariot/${id}`);
export const createChariot = (data: any) => post('/coordinator-hierarchy/chariot', data);
export const deleteChariot = (id: string) => del(`/coordinator-hierarchy/chariot/${id}`);
export const executeChariot = (id: string, task: any) => post(`/coordinator-hierarchy/chariot/${id}/execute`, { task });

/**
 * 流式执行战车任务（SSE）
 * @param id 战车ID
 * @param task 任务对象 { id, type, payload }
 * @param onEvent 事件回调
 * @returns 返回一个关闭函数
 */
export const executeChariotStream = (
  id: string,
  task: any,
  onEvent: (event: any) => void,
  onError?: (err: Error) => void,
  onComplete?: () => void,
): (() => void) => {
  const ctrl = new AbortController();
  const url = `${EFFECTIVE_API_BASE}/coordinator-hierarchy/chariot/${id}/execute/stream`;

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task }),
    signal: ctrl.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`POST ${url} → ${res.status}`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            onComplete?.();
            return;
          }
          try {
            const event = JSON.parse(data);
            onEvent(event);
          } catch {
            // ignore parse errors
          }
        }
      }
      onComplete?.();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError?.(err);
      }
    });

  return () => ctrl.abort();
};
export const fetchSwarms = async () => {
  try {
    return await get('/swarm');
  } catch {
    // Fallback: aggregate agents into groups
    const agents = await fetchAgents();
    return {
      data: [{
        id: 'default',
        name: '默认蜂群',
        description: `${agents.data?.length || 0} 个智能体`,
        status: 'healthy',
        health_score: 85,
        agent_count: agents.data?.length || 0,
        active_tasks: 0,
        total_tasks: 0,
      }]
    };
  }
};
export const createSwarm = (data: any) => post('/swarm', data);

/* ── v4.0 Frameworks ── */
export const fetchFrameworks = () => get('/frameworks');
export const getFramework = (id: string) => get(`/frameworks/${id}`);

/* ── v4.0 Engines ── */
export const fetchEngines = () => get('/engines');
export const getEngine = (id: string) => get(`/engines/${id}`);
export const createEngine = (data: any) => post('/engines', data);
export const allocateEngine = (id: string, data?: any) => post(`/engines/${id}/allocate`, data || {});
export const addEngineKey = (id: string, data: any) => post(`/engines/${id}/keys`, data);
export const chatWithEngine = (id: string, messages: any[]) => post(`/engines/${id}/chat`, { messages });

/**
 * 流式与引擎对话（SSE）
 * @param id 引擎ID
 * @param messages 消息数组
 * @param onEvent 事件回调
 * @returns 返回一个关闭函数
 */
export const streamChatWithEngine = (
  id: string,
  messages: any[],
  onEvent: (event: any) => void,
  onError?: (err: Error) => void,
  onComplete?: () => void,
): (() => void) => {
  const ctrl = new AbortController();
  const url = `${EFFECTIVE_API_BASE}/engines/${id}/chat`;

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, stream: true }),
    signal: ctrl.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`POST ${url} → ${res.status}`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            onComplete?.();
            return;
          }
          try {
            const event = JSON.parse(data);
            onEvent(event);
          } catch {
            // ignore parse errors
          }
        }
      }
      onComplete?.();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError?.(err);
      }
    });

  return () => ctrl.abort();
};

/* ── v4.0 Teams ── */
export const fetchTeams = () => get('/teams');
export const getTeam = (id: string) => get(`/teams/${id}`);
export const createTeam = (data: any) => post('/teams', data);
export const executeTeam = (id: string, data?: any) => post(`/teams/${id}/execute`, data || {});
export const interveneTeam = (id: string, data: any) => post(`/teams/${id}/intervene`, data);

/* ── v4.0 Roles ── */
export const getRole = (id: string) => get(`/roles/${id}`);

/* ── v4.0 Canvas ── */
export const fetchCanvases = () => get('/canvas');
export const getCanvas = (id: string) => get(`/canvas/${id}`);
export const createCanvas = (data: any) => post('/canvas', data);
export const deleteCanvas = (id: string) => del(`/canvas/${id}`);
