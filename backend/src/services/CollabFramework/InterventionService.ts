import { EventEmitter } from 'events';

// ─── 类型定义 ───────────────────────────────────────────

export enum InterventionLevel {
  L1_SYSTEM = 1,
  L2_GROUP = 2,
  L3_AGENT = 3,
  L4_TASK = 4,
  L5_DIALOG = 5,
  L6_TOOL = 6,
  L7_MODEL = 7,
  L8_KB = 8,
  L9_SKILL = 9,
  L10_RESOURCE = 10,
  L11_SECURITY = 11,
  L12_MONITOR = 12,
}

export enum InterventionAction {
  // L1 系统级
  SYSTEM_PAUSE = 'system_pause',
  SYSTEM_RESUME = 'system_resume',
  SYSTEM_THROTTLE = 'system_throttle',
  SYSTEM_SHUTDOWN = 'system_shutdown',
  // L2 群组级
  GROUP_PAUSE = 'group_pause',
  GROUP_RESUME = 'group_resume',
  GROUP_REORG = 'group_reorg',
  GROUP_MERGE = 'group_merge',
  GROUP_SPLIT = 'group_split',
  GROUP_PRIORITY = 'group_priority',
  // L3 Agent级
  AGENT_PAUSE = 'agent_pause',
  AGENT_RESUME = 'agent_resume',
  AGENT_ISOLATE = 'agent_isolate',
  AGENT_RESTART = 'agent_restart',
  AGENT_KILL = 'agent_kill',
  AGENT_CLONE = 'agent_clone',
  AGENT_MIGRATE = 'agent_migrate',
  AGENT_ROLLBACK = 'agent_rollback',
  // L4 任务级
  TASK_PAUSE = 'task_pause',
  TASK_RESUME = 'task_resume',
  TASK_CANCEL = 'task_cancel',
  TASK_REROUTE = 'task_reroute',
  TASK_PRIORITY = 'task_priority',
  TASK_TIMEOUT = 'task_timeout',
  // L5 对话级
  TURN_INJECT = 'turn_inject',
  TURN_EDIT = 'turn_edit',
  TURN_DELETE = 'turn_delete',
  CONTEXT_TRUNCATE = 'context_truncate',
  CONTEXT_RESET = 'context_reset',
  CONTEXT_EXPORT = 'context_export',
  // L6 工具级
  TOOL_BLOCK = 'tool_block',
  TOOL_ALLOW = 'tool_allow',
  TOOL_REVIEW = 'tool_review',
  TOOL_TIMEOUT = 'tool_timeout',
  TOOL_REPLACE = 'tool_replace',
  TOOL_DISABLE = 'tool_disable',
  // L7 模型级
  MODEL_SWITCH = 'model_switch',
  MODEL_TEMPERATURE = 'model_temperature',
  MODEL_MAXTOKENS = 'model_maxtokens',
  MODEL_SYSTEMPROMPT = 'model_systemprompt',
  MODEL_FALLBACK = 'model_fallback',
  // L8 知识库级
  KB_ATTACH = 'kb_attach',
  KB_DETACH = 'kb_detach',
  KB_REFRESH = 'kb_refresh',
  KB_RELOAD = 'kb_reload',
  // L9 技能级
  SKILL_ENABLE = 'skill_enable',
  SKILL_DISABLE = 'skill_disable',
  SKILL_RELOAD = 'skill_reload',
  SKILL_CONFIGURE = 'skill_configure',
  // L10 资源级
  RESOURCE_LIMIT = 'resource_limit',
  RESOURCE_SCALE = 'resource_scale',
  RESOURCE_QUOTA = 'resource_quota',
  // L11 安全级
  CONTENT_FILTER = 'content_filter',
  OUTPUT_SCAN = 'output_scan',
  INPUT_VALIDATE = 'input_validate',
  ACCESS_REVOKE = 'access_revoke',
  // L12 监控级
  ALERT_CONFIG = 'alert_config',
  METRIC_COLLECT = 'metric_collect',
  LOG_LEVEL = 'log_level',
  TRACE_ENABLE = 'trace_enable',
}

export enum InterventionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export interface InterventionRecord {
  id: string;
  agentId: string;
  level: InterventionLevel;
  action: InterventionAction;
  payload: Record<string, unknown>;
  requesterId: string;
  status: InterventionStatus;
  approvedBy?: string;
  executedAt?: Date;
  completedAt?: Date;
  result?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterventionRequest {
  agentId: string;
  level: InterventionLevel;
  action: InterventionAction;
  payload: Record<string, unknown>;
  requesterId: string;
}

export interface ApprovalRule {
  id: string;
  minLevel: InterventionLevel;
  maxLevel: InterventionLevel;
  autoApprove: boolean;
  requireSecondaryApproval: boolean;
  allowedRequesters: string[];
  description: string;
}

// ─── InterventionService ─────────────────────────────────

export class InterventionService extends EventEmitter {
  private records = new Map<string, InterventionRecord>();
  private approvalRules: ApprovalRule[] = [];
  private agentContexts = new Map<string, unknown>();

  constructor() {
    super();
    this.initDefaultRules();
  }

  // ── 查询 ────────────────────────────────────────────
  getQueue(): InterventionRecord[] {
    return Array.from(this.records.values()).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // ── 单Agent操作 ───────────────────────────────────────

  async pause(agentId: string, requesterId: string): Promise<InterventionRecord> {
    return this.requestIntervention({
      agentId,
      level: InterventionLevel.L3_AGENT,
      action: InterventionAction.AGENT_PAUSE,
      payload: {},
      requesterId,
    });
  }

  async resume(agentId: string, requesterId: string): Promise<InterventionRecord> {
    return this.requestIntervention({
      agentId,
      level: InterventionLevel.L3_AGENT,
      action: InterventionAction.AGENT_RESUME,
      payload: {},
      requesterId,
    });
  }

  async terminate(agentId: string, requesterId: string): Promise<InterventionRecord> {
    return this.requestIntervention({
      agentId,
      level: InterventionLevel.L3_AGENT,
      action: InterventionAction.AGENT_KILL,
      payload: {},
      requesterId,
    });
  }

  async emergencyStop(agentId: string, requesterId: string, reason?: string): Promise<InterventionRecord> {
    return this.requestIntervention({
      agentId,
      level: InterventionLevel.L1_SYSTEM,
      action: InterventionAction.SYSTEM_SHUTDOWN,
      payload: { reason, targetAgent: agentId },
      requesterId,
    });
  }

  // ── 全局操作 ──────────────────────────────────────────

  async globalPause(requesterId: string, reason?: string): Promise<InterventionRecord> {
    return this.requestIntervention({
      agentId: 'system',
      level: InterventionLevel.L1_SYSTEM,
      action: InterventionAction.SYSTEM_PAUSE,
      payload: { reason, scope: 'global' },
      requesterId,
    });
  }

  async globalResume(requesterId: string): Promise<InterventionRecord> {
    return this.requestIntervention({
      agentId: 'system',
      level: InterventionLevel.L1_SYSTEM,
      action: InterventionAction.SYSTEM_RESUME,
      payload: { scope: 'global' },
      requesterId,
    });
  }

  // ── 核心请求处理 ───────────────────────────────────────

  async requestIntervention(request: InterventionRequest): Promise<InterventionRecord> {
    const record: InterventionRecord = {
      id: crypto.randomUUID(),
      ...request,
      status: InterventionStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 自动审批检查
    const rule = this.findRule(request.level, request.action, request.requesterId);
    if (rule?.autoApprove) {
      record.status = InterventionStatus.APPROVED;
      record.approvedBy = 'system:auto';
    }

    this.records.set(record.id, record);
    this.emit('intervention:requested', record);

    // 如果已自动审批，立即执行
    if (record.status === InterventionStatus.APPROVED) {
      await this.executeIntervention(record.id);
    }

    return record;
  }

  async approve(interventionId: string, approverId: string): Promise<InterventionRecord> {
    const record = this.getRecord(interventionId);
    if (record.status !== InterventionStatus.PENDING) {
      throw new Error(`Cannot approve intervention in status ${record.status}`);
    }
    record.status = InterventionStatus.APPROVED;
    record.approvedBy = approverId;
    record.updatedAt = new Date();
    this.emit('intervention:approved', record);
    return record;
  }

  async reject(interventionId: string, reason?: string): Promise<InterventionRecord> {
    const record = this.getRecord(interventionId);
    if (record.status !== InterventionStatus.PENDING) {
      throw new Error(`Cannot reject intervention in status ${record.status}`);
    }
    record.status = InterventionStatus.REJECTED;
    record.errorMessage = reason;
    record.updatedAt = new Date();
    this.emit('intervention:rejected', record);
    return record;
  }

  async executeIntervention(interventionId: string): Promise<InterventionRecord> {
    const record = this.getRecord(interventionId);
    if (record.status !== InterventionStatus.APPROVED && record.status !== InterventionStatus.PENDING) {
      throw new Error(`Cannot execute intervention in status ${record.status}`);
    }
    record.status = InterventionStatus.EXECUTING;
    record.executedAt = new Date();
    record.updatedAt = new Date();
    this.emit('intervention:executing', record);

    try {
      const result = await this.performAction(record);
      record.status = InterventionStatus.COMPLETED;
      record.result = result;
      record.completedAt = new Date();
      record.updatedAt = new Date();
      this.emit('intervention:completed', record);
    } catch (error) {
      record.status = InterventionStatus.FAILED;
      record.errorMessage = (error as Error).message;
      record.updatedAt = new Date();
      this.emit('intervention:failed', record);
    }

    return record;
  }

  // ── 执行引擎 ──────────────────────────────────────────

  private async performAction(record: InterventionRecord): Promise<Record<string, unknown>> {
    const { action, agentId, payload } = record;

    switch (action) {
      case InterventionAction.AGENT_PAUSE:
        return { agentId, previousStatus: 'active', newStatus: 'paused' };
      case InterventionAction.AGENT_RESUME:
        return { agentId, previousStatus: 'paused', newStatus: 'active' };
      case InterventionAction.AGENT_ISOLATE:
        return { agentId, previousStatus: 'active', newStatus: 'isolated' };
      case InterventionAction.AGENT_KILL:
        return { agentId, previousStatus: 'active', newStatus: 'terminated', resourcesFreed: true };
      case InterventionAction.AGENT_RESTART:
        return { agentId, previousStatus: 'error', newStatus: 'active', contextPreserved: payload.preserveContext ?? true };
      case InterventionAction.AGENT_MIGRATE:
        return { agentId, oldBackend: payload.oldBackend, newBackend: payload.newBackend, model: payload.model };
      case InterventionAction.TASK_CANCEL:
        return { agentId, taskId: payload.taskId, cancelled: true };
      case InterventionAction.TURN_INJECT:
        return { agentId, messageInjected: payload.message, position: payload.position || 'end' };
      case InterventionAction.CONTEXT_RESET:
        const oldContext = this.agentContexts.get(agentId);
        this.agentContexts.set(agentId, { resetAt: new Date() });
        return { agentId, previousContextLength: oldContext ? JSON.stringify(oldContext).length : 0 };
      case InterventionAction.SYSTEM_PAUSE:
        return { scope: 'global', pausedAt: new Date(), affectedAgents: payload.affectedAgents || 'all' };
      case InterventionAction.SYSTEM_RESUME:
        return { scope: 'global', resumedAt: new Date() };
      case InterventionAction.SYSTEM_THROTTLE:
        return { maxConcurrency: payload.maxConcurrency, duration: payload.duration };
      case InterventionAction.TOOL_BLOCK:
        return { agentId, toolName: payload.toolName, blockedUntil: payload.until };
      case InterventionAction.MODEL_SWITCH:
        return { agentId, oldModel: payload.oldModel, newModel: payload.newModel };
      case InterventionAction.MODEL_TEMPERATURE:
        return { agentId, oldTemperature: payload.oldTemperature, newTemperature: payload.newTemperature };
      case InterventionAction.KB_ATTACH:
        return { agentId, knowledgeBaseId: payload.knowledgeBaseId, attached: true };
      case InterventionAction.SKILL_ENABLE:
        return { agentId, skillId: payload.skillId, enabled: true };
      case InterventionAction.SKILL_DISABLE:
        return { agentId, skillId: payload.skillId, enabled: false };
      case InterventionAction.CONTENT_FILTER:
        return { agentId, filterType: payload.filterType, severity: payload.severity };
      case InterventionAction.ALERT_CONFIG:
        return { alertRuleId: payload.ruleId, config: payload.config };
      default:
        return { agentId, action, executed: true, note: 'Default handler used' };
    }
  }

  // ── 查询 ─────────────────────────────────────────────

  getRecord(id: string): InterventionRecord {
    const record = this.records.get(id);
    if (!record) throw new Error(`Intervention record ${id} not found`);
    return record;
  }

  listRecords(filter?: {
    agentId?: string;
    level?: InterventionLevel;
    status?: InterventionStatus;
    action?: InterventionAction;
  }): InterventionRecord[] {
    let results = Array.from(this.records.values());
    if (filter?.agentId) results = results.filter(r => r.agentId === filter.agentId);
    if (filter?.level) results = results.filter(r => r.level === filter.level);
    if (filter?.status) results = results.filter(r => r.status === filter.status);
    if (filter?.action) results = results.filter(r => r.action === filter.action);
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getAgentHistory(agentId: string): {
    agentId: string;
    records: InterventionRecord[];
    stats: {
      total: number;
      successful: number;
      failed: number;
      autoTriggered: number;
      manualTriggered: number;
      averageResolutionTime: number;
    };
  } {
    const records = this.listRecords({ agentId });
    const completed = records.filter(r => r.status === InterventionStatus.COMPLETED);
    const resolutionTimes = completed
      .filter(r => r.executedAt && r.completedAt)
      .map(r => r.completedAt!.getTime() - r.executedAt!.getTime());
    const avgTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length / 1000
      : 0;

    return {
      agentId,
      records,
      stats: {
        total: records.length,
        successful: completed.length,
        failed: records.filter(r => r.status === InterventionStatus.FAILED).length,
        autoTriggered: records.filter(r => r.approvedBy?.startsWith('system:')).length,
        manualTriggered: records.filter(r => r.approvedBy && !r.approvedBy.startsWith('system:')).length,
        averageResolutionTime: avgTime,
      },
    };
  }

  // ── 审批规则 ─────────────────────────────────────────

  addApprovalRule(rule: Omit<ApprovalRule, 'id'>): ApprovalRule {
    const full: ApprovalRule = { ...rule, id: crypto.randomUUID() };
    this.approvalRules.push(full);
    return full;
  }

  removeApprovalRule(id: string): boolean {
    const idx = this.approvalRules.findIndex(r => r.id === id);
    if (idx >= 0) {
      this.approvalRules.splice(idx, 1);
      return true;
    }
    return false;
  }

  getApprovalRules(): ApprovalRule[] {
    return [...this.approvalRules];
  }

  private findRule(level: InterventionLevel, action: InterventionAction, requesterId: string): ApprovalRule | undefined {
    return this.approvalRules.find(r =>
      level >= r.minLevel &&
      level <= r.maxLevel &&
      (r.allowedRequesters.length === 0 || r.allowedRequesters.includes(requesterId))
    );
  }

  private initDefaultRules(): void {
    this.approvalRules = [
      {
        id: 'rule-default-l1',
        minLevel: InterventionLevel.L1_SYSTEM,
        maxLevel: InterventionLevel.L2_GROUP,
        autoApprove: false,
        requireSecondaryApproval: true,
        allowedRequesters: [],
        description: '系统和群组级干预需要人工审批',
      },
      {
        id: 'rule-default-l3-l6',
        minLevel: InterventionLevel.L3_AGENT,
        maxLevel: InterventionLevel.L6_TOOL,
        autoApprove: true,
        requireSecondaryApproval: false,
        allowedRequesters: [],
        description: 'Agent、任务、对话、工具级干预自动审批',
      },
      {
        id: 'rule-default-l7-l12',
        minLevel: InterventionLevel.L7_MODEL,
        maxLevel: InterventionLevel.L12_MONITOR,
        autoApprove: true,
        requireSecondaryApproval: false,
        allowedRequesters: [],
        description: '模型、知识库、技能、资源、安全、监控级干预自动审批',
      },
    ];
  }

  // ── 批量操作 ─────────────────────────────────────────

  async batchPause(agentIds: string[], requesterId: string): Promise<InterventionRecord[]> {
    return Promise.all(agentIds.map(id => this.pause(id, requesterId)));
  }

  async batchResume(agentIds: string[], requesterId: string): Promise<InterventionRecord[]> {
    return Promise.all(agentIds.map(id => this.resume(id, requesterId)));
  }

  async batchTerminate(agentIds: string[], requesterId: string): Promise<InterventionRecord[]> {
    return Promise.all(agentIds.map(id => this.terminate(id, requesterId)));
  }
}
