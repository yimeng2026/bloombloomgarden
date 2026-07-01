/* ── API Client �?Unified Backend (v2) ── */
// 分离部署：前�?Vercel) �?后端(Railway)
// 优先从环境变量读取，否则回退到本地开发地址
const API_BASE = 'http://localhost:3001/api';

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

async function patch(path: string, body: unknown) {
  const res = await fetch(`${EFFECTIVE_API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`);
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

/* ── API Keys ── */
export const fetchApiKeys = () => get('/apikeys');
export const createApiKey = (data: any) => post('/apikeys', data);
export const deleteApiKey = (id: string) => del(`/apikeys/${id}`);
export const toggleApiKey = (id: string) => patch(`/apikeys/${id}/toggle`, {});
export const testApiKey = (id: string) => post(`/apikeys/${id}/test`, {});

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

/* ── Agent Templates & Stats ── */
export const fetchAgentTemplates = (filters?: any) => get('/agent-templates' + (filters ? '?' + new URLSearchParams(filters) : ''));
export const getAgentTemplate = (id: string) => get(`/agent-templates/${id}`);
export const fetchAgentStats = () => get('/agents/stats');
export const fetchGroupStats = () => get('/groups/stats');
export const fetchFrameworks = () => get('/frameworks');
export const getFramework = (id: string) => get(`/frameworks/${id}`);

/* ── v4.0 Engines ── */
export const fetchEngines = () => get('/engines');
export const getEngine = (id: string) => get(`/engines/${id}`);
export const createEngine = (data: any) => post('/engines', data);
export const allocateEngine = (id: string, data?: any) => post(`/engines/${id}/allocate`, data || {});
export const addEngineKey = (id: string, data: any) => post(`/engines/${id}/keys`, data);
// chatWithEngine 已移除 — 请使用 /api/dialog/:agentId/chat
export const chatWithEngine = (id: string, messages: any[]) => {
  console.warn('[DEPRECATED] chatWithEngine 已废弃，请使用 dialog API');
  return post(`/dialog/${id}/chat`, { content: messages[messages.length - 1]?.content || '' });
};

/**
 * 流式与引擎对话（SSE）— 已迁移到 /api/dialog/:agentId/stream
 * @param agentId Agent ID
 * @param messages 消息数组
 * @param onEvent 事件回调
 * @returns 返回一个关闭函数
 */
export const streamChatWithAgent = (
  agentId: string,
  messages: any[],
  onEvent: (event: any) => void,
  onError?: (err: Error) => void,
  onComplete?: () => void,
): (() => void) => {
  const ctrl = new AbortController();
  const url = `${EFFECTIVE_API_BASE}/dialog/${agentId}/stream?message=${encodeURIComponent(messages[messages.length - 1]?.content || '')}`;

  fetch(url, { signal: ctrl.signal })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`GET ${url} → ${res.status}`);
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
export const createRole = (teamId: string, data: any) => post(`/teams/${teamId}/roles`, data);
export const updateRole = (id: string, data: any) => put(`/roles/${id}`, data);
export const deleteRole = (id: string) => del(`/roles/${id}`);
export const executeRole = (id: string, task: string) => post(`/roles/${id}/execute`, { task });
// chatWithRole 已移除 — 请使用 /api/dialog/:agentId/chat
export const chatWithRole = (id: string, message: string) => {
  console.warn('[DEPRECATED] chatWithRole 已废弃，请使用 dialog API');
  return post(`/dialog/${id}/chat`, { content: message });
};

/* ── v4.0 Canvas ── */
export const fetchCanvases = () => get('/canvas');
export const getCanvas = (id: string) => get(`/canvas/${id}`);
export const createCanvas = (data: any) => post('/canvas', data);
export const deleteCanvas = (id: string) => del(`/canvas/${id}`);
export const updateCanvas = (id: string, data: any) => put(`/canvas/${id}`, data);
export const createCanvasRevision = (id: string, data: any) => post(`/canvas/${id}/revisions`, data);
export const getCanvasRevisions = (id: string) => get(`/canvas/${id}/revisions`);
export const restoreCanvasRevision = (id: string, revisionId: string) => post(`/canvas/${id}/restore`, { revisionId });

/* ── Swarm Coordinator ── */
export const batchChatSwarm = (data: any) => post('/swarm/batch-chat', data);
export const coordinateSwarm = (data: any) => post('/swarm/coordinate', data);
export const aggregateSwarm = (data: any) => post('/swarm/aggregate', data);

/* ── Chat Accounts ── */
export const fetchChatAccounts = (filters?: any) => get('/chat-accounts' + (filters ? '?' + new URLSearchParams(filters) : ''));
export const getChatAccount = (id: string) => get(`/chat-accounts/${id}`);
export const createChatAccount = (data: any) => post('/chat-accounts', data);
export const updateChatAccount = (id: string, data: any) => put(`/chat-accounts/${id}`, data);
export const deleteChatAccount = (id: string) => del(`/chat-accounts/${id}`);
export const connectChatAccount = (id: string) => post(`/chat-accounts/${id}/connect`, {});
export const disconnectChatAccount = (id: string) => post(`/chat-accounts/${id}/disconnect`, {});
export const generateQRCode = (id: string) => post(`/chat-accounts/${id}/qr-code`, {});
export const getQRStatus = (id: string) => get(`/chat-accounts/${id}/qr-status`);
export const testChatAccount = (id: string) => post(`/chat-accounts/${id}/test`, {});
export const getPlatformChatAccounts = (platformId: string) => get(`/chat-accounts/platforms/${platformId}`);
/* ── v4.0 Dialog ── */
export const fetchDialogs = () => get('/dialog');
export const getDialog = (id: string) => get(`/dialog/${id}`);
export const createDialog = (data: any) => post('/dialog', data);
export const deleteDialog = (id: string) => del(`/dialog/${id}`);
export const chatDialog = (id: string, content: string) => post(`/dialog/${id}/chat`, { content });
export const streamDialog = (id: string, content: string, onEvent: (event: any) => void, onError?: (err: Error) => void, onComplete?: () => void): (() => void) => {
  const ctrl = new AbortController();
  const url = `${EFFECTIVE_API_BASE}/dialog/${id}/stream?message=${encodeURIComponent(content)}`;
  fetch(url, { signal: ctrl.signal }).then(async (res) => {
    if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
    const reader = res.body?.getReader(); if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder(); let buffer = '';
    while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''; for (const line of lines) { const trimmed = line.trim(); if (!trimmed.startsWith('data: ')) continue; const data = trimmed.slice(6); if (data === '[DONE]') { onComplete?.(); return; } try { const event = JSON.parse(data); onEvent(event); } catch {} } }
    onComplete?.();
  }).catch((err) => { if (err.name !== 'AbortError') onError?.(err); });
  return () => ctrl.abort();
};

/* ── v4.0 Handoff ── */
export const fetchHandoffs = () => get('/handoff');
export const fetchPendingHandoffs = () => get('/handoff/pending');
export const createHandoff = (data: any) => post('/handoff', data);
export const getHandoff = (id: string) => get(`/handoff/${id}`);
export const updateHandoff = (id: string, data: any) => put(`/handoff/${id}`, data);
export const deleteHandoff = (id: string) => del(`/handoff/${id}`);
export const acceptHandoff = (id: string) => post(`/handoff/${id}/accept`, {});
export const declineHandoff = (id: string) => post(`/handoff/${id}/decline`, {});
export const completeHandoff = (id: string) => post(`/handoff/${id}/complete`, {});
export const cancelHandoff = (id: string) => post(`/handoff/${id}/cancel`, {});
export const batchCreateHandoff = (data: any) => post('/handoff/batch', data);
export const autoRouteHandoff = (data: any) => post('/handoff/auto-route', data);
export const fetchHandoffStats = () => get('/handoff/stats');

/* ── v4.0 Intervention ── */
export const fetchInterventions = () => get('/intervention');
export const createIntervention = (data: any) => post('/intervention', data);
export const getInterventionStatus = (id: string) => get(`/intervention/status/${id}`);
export const resolveIntervention = (id: string, data?: any) => post(`/intervention/resolve/${id}`, data || {});
export const cancelIntervention = (id: string) => post(`/intervention/cancel/${id}`, {});
export const deleteIntervention = (id: string) => del(`/intervention/${id}`);
export const clearInterventions = () => del('/intervention/clear');

/* ── v4.0 Unified API ── */
export const fetchUnifiedTemplates = () => get('/unified-api/templates');
export const getUnifiedTemplate = (id: string) => get(`/unified-api/templates/${id}`);
export const createUnifiedTemplate = (data: any) => post('/unified-api/templates', data);
export const updateUnifiedTemplate = (id: string, data: any) => put(`/unified-api/templates/${id}`, data);
export const deleteUnifiedTemplate = (id: string) => del(`/unified-api/templates/${id}`);
export const fetchUnifiedInstances = () => get('/unified-api/instances');
export const createUnifiedInstance = (data: any) => post('/unified-api/instances', data);
export const getUnifiedInstance = (id: string) => get(`/unified-api/instances/${id}`);
export const updateUnifiedInstance = (id: string, data: any) => put(`/unified-api/instances/${id}`, data);
export const deleteUnifiedInstance = (id: string) => del(`/unified-api/instances/${id}`);
export const executeUnifiedInstance = (id: string, data?: any) => post(`/unified-api/instances/${id}/execute`, data || {});
export const streamUnifiedInstance = (id: string, data: any, onEvent: (event: any) => void, onError?: (err: Error) => void, onComplete?: () => void): (() => void) => {
  const ctrl = new AbortController();
  const url = `${EFFECTIVE_API_BASE}/unified-api/instances/${id}/stream`;
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: ctrl.signal }).then(async (res) => {
    if (!res.ok) throw new Error(`POST ${url} → ${res.status}`);
    const reader = res.body?.getReader(); if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder(); let buffer = '';
    while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''; for (const line of lines) { const trimmed = line.trim(); if (!trimmed.startsWith('data: ')) continue; const data = trimmed.slice(6); if (data === '[DONE]') { onComplete?.(); return; } try { const event = JSON.parse(data); onEvent(event); } catch {} } }
    onComplete?.();
  }).catch((err) => { if (err.name !== 'AbortError') onError?.(err); });
  return () => ctrl.abort();
};
export const getUnifiedInstanceStats = (id: string) => get(`/unified-api/instances/${id}/stats`);
export const fetchUnifiedStats = () => get('/unified-api/stats');
export const batchExecuteUnified = (data: any) => post('/unified-api/batch', data);
export const batchExecuteUnifiedStream = (data: any, onEvent: (event: any) => void, onError?: (err: Error) => void, onComplete?: () => void): (() => void) => {
  const ctrl = new AbortController();
  const url = `${EFFECTIVE_API_BASE}/unified-api/batch/stream`;
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: ctrl.signal }).then(async (res) => {
    if (!res.ok) throw new Error(`POST ${url} → ${res.status}`);
    const reader = res.body?.getReader(); if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder(); let buffer = '';
    while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''; for (const line of lines) { const trimmed = line.trim(); if (!trimmed.startsWith('data: ')) continue; const data = trimmed.slice(6); if (data === '[DONE]') { onComplete?.(); return; } try { const event = JSON.parse(data); onEvent(event); } catch {} } }
    onComplete?.();
  }).catch((err) => { if (err.name !== 'AbortError') onError?.(err); });
  return () => ctrl.abort();
};

/* ── v4.0 Integrations ── */
export const fetchIntegrations = () => get('/integrations');
export const getIntegration = (id: string) => get(`/integrations/${id}`);
export const createIntegration = (data: any) => post('/integrations', data);
export const updateIntegration = (id: string, data: any) => put(`/integrations/${id}`, data);
export const deleteIntegration = (id: string) => del(`/integrations/${id}`);
export const testIntegration = (id: string) => post(`/integrations/${id}/test`, {});
export const syncIntegration = (id: string) => post(`/integrations/${id}/sync`, {});
export const fetchIntegrationStats = () => get('/integrations/stats');

/* ── v4.0 Events ── */
export const fetchEvents = () => get('/events');
export const createEvent = (data: any) => post('/events', data);
export const fetchEventStats = () => get('/events/stats');
export const acknowledgeEvent = (id: string) => post(`/events/${id}/acknowledge`, {});
export const clearEvents = () => del('/events');

/* ── v4.0 Processes ── */
export const fetchProcesses = () => get('/processes');
export const createProcess = (data: any) => post('/processes', data);
export const fetchProcessStats = () => get('/processes/stats');
export const killProcess = (id: string) => post(`/processes/${id}/kill`, {});
export const signalProcess = (id: string, signal: string) => post(`/processes/${id}/signal`, { signal });
export const clearProcesses = () => del('/processes');

/* ── v4.0 Spend ── */
export const fetchSpendStats = () => get('/spend/stats');
export const fetchSpendSummary = () => get('/spend/summary');
export const fetchSpendBreakdown = () => get('/spend/breakdown');
export const fetchSpendByAgent = () => get('/spend/agents');
export const fetchSpendByProvider = () => get('/spend/providers');
export const updateSpend = (data: any) => post('/spend/update', data);

/* ── v4.0 Backups ── */
export const fetchBackups = () => get('/backups');
export const getBackup = (id: string) => get(`/backups/${id}`);
export const createBackup = (data: any) => post('/backups', data);
export const restoreBackup = (id: string) => post(`/backups/${id}/restore`, {});
export const verifyBackup = (id: string) => post(`/backups/${id}/verify`, {});
export const deleteBackup = (id: string) => del(`/backups/${id}`);
export const clearBackups = () => del('/backups');
export const fetchBackupStats = () => get('/backups/stats');

/* ── v4.0 External ── */
export const fetchExternalIntegrations = () => get('/external/integrations');
export const createExternalIntegration = (data: any) => post('/external/integrations', data);
export const getExternalIntegration = (id: string) => get(`/external/integrations/${id}`);
export const updateExternalIntegration = (id: string, data: any) => put(`/external/integrations/${id}`, data);
export const deleteExternalIntegration = (id: string) => del(`/external/integrations/${id}`);
export const syncExternalIntegration = (id: string) => post(`/external/sync/${id}`, {});
export const webhookExternalIntegration = (id: string, data: any) => post(`/external/webhooks/${id}`, data);
export const fetchExternalStats = () => get('/external/stats');

/* ── v4.0 Security ── */
export const fetchSecurityLogs = () => get('/security/logs');
export const getSecurityLog = (id: string) => get(`/security/logs/${id}`);
export const createSecurityLog = (data: any) => post('/security/logs', data);
export const deleteSecurityLog = (id: string) => del(`/security/logs/${id}`);
export const fetchSecurityMetrics = () => get('/security/metrics');
export const scanSecurity = () => post('/security/scan', {});
export const blockSecurity = (data: any) => post('/security/block', data);
export const unblockSecurity = (data: any) => post('/security/unblock', data);
export const fetchSecurityAudit = () => get('/security/audit');
export const fetchSecurityStatus = () => get('/security/status');

/* ── v4.0 Auth ── */
export const login = (data: any) => post('/auth/login', data);
export const register = (data: any) => post('/auth/register', data);
export const logout = () => post('/auth/logout', {});
export const getMe = () => get('/auth/me');
export const refreshToken = () => post('/auth/refresh', {});
export const forgotPassword = (email: string) => post('/auth/forgot-password', { email });
export const resetPassword = (token: string, password: string) => post('/auth/reset-password', { token, password });
export const changePassword = (data: any) => post('/auth/change-password', data);
export const verifyEmail = (token: string) => post('/auth/verify-email', { token });
export const fetchAuthSessions = () => get('/auth/sessions');

/* ── v4.0 Kimi Cluster ── */
export const fetchKimiClusterNodes = () => get('/kimi-cluster');
export const fetchKimiClusterStats = () => get('/kimi-cluster/stats');
export const addKimiClusterNode = (data: any) => post('/kimi-cluster/nodes', data);
export const removeKimiClusterNode = (id: string) => del(`/kimi-cluster/nodes/${id}`);
export const activateKimiClusterNode = (id: string) => post(`/kimi-cluster/nodes/${id}/activate`, {});
export const deactivateKimiClusterNode = (id: string) => post(`/kimi-cluster/nodes/${id}/deactivate`, {});
export const fetchKimiClusterHealth = () => get('/kimi-cluster/health');
export const fetchKimiClusterStatus = () => get('/kimi-cluster/status');
export const syncKimiCluster = () => post('/kimi-cluster/sync', {});

/* ── v4.0 Agent Context ── */
export const fetchAgentContext = (id: string) => get(`/agent-context/${id}`);
export const setAgentContext = (id: string, data: any) => post(`/agent-context/${id}`, data);
export const deleteAgentContext = (id: string) => del(`/agent-context/${id}`);
export const fetchAgentContextHistory = (id: string) => get(`/agent-context/${id}/history`);
export const setAgentContextVariables = (id: string, data: any) => post(`/agent-context/${id}/variables`, data);
export const fetchAgentContextVariables = (id: string) => get(`/agent-context/${id}/variables`);
export const setAgentContextVariable = (id: string, key: string, value: any) => post(`/agent-context/${id}/variables/${key}`, { value });
export const deleteAgentContextVariable = (id: string, key: string) => del(`/agent-context/${id}/variables/${key}`);

/* ── v4.0 Platform Details ── */
export const fetchPlatformDetails = (id: string) => get(`/platform-details/${id}`);
export const updatePlatformDetails = (id: string, data: any) => put(`/platform-details/${id}`, data);
export const deletePlatformDetails = (id: string) => del(`/platform-details/${id}`);
export const verifyPlatformDetails = (id: string) => post(`/platform-details/${id}/verify`, {});
export const syncPlatformDetails = (id: string) => post(`/platform-details/${id}/sync`, {});
export const testPlatformDetails = (id: string) => post(`/platform-details/${id}/test`, {});
export const clonePlatformDetails = (id: string, data?: any) => post(`/platform-details/${id}/clone`, data || {});
export const fetchPlatformDetailStats = (id: string) => get(`/platform-details/${id}/stats`);

/* ── v4.0 Settings Extended ── */
export const resetSettings = () => post('/settings/reset', {});
export const backupSettings = () => post('/settings/backup', {});
export const restoreSettings = (data: any) => post('/settings/restore', data);
export const importSettings = (data: any) => post('/settings/import', data);
export const exportSettings = () => post('/settings/export', {});
