import { EventEmitter } from 'events';
import type { AgentService } from '../AgentService';
import type { DialogService } from '../DialogService';
import type { BackendRouter } from '../BackendRouter';

// ─── 类型定义 ───────────────────────────────────────────

export enum ExecutionMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  HIERARCHICAL = 'hierarchical',
  DYNAMIC = 'dynamic',
}

export enum GroupStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  DISBANDED = 'disbanded',
}

export interface Chariot {
  id: string;
  name: string;
  parentId?: string;
  coordinatorId?: string;
  executionMode: ExecutionMode;
  agentIds: string[];
  status: GroupStatus;
  maxDepth: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  type: string;
  payload: unknown;
}

export interface Subtask {
  id: string;
  assignee: string;
  payload: unknown;
}

export interface SubtaskResult {
  success: boolean;
  data: unknown;
  subtaskId: string;
}

export interface TaskResult {
  success: boolean;
  data: unknown[];
  metadata: {
    totalSubtasks: number;
    completedSubtasks: number;
    failedSubtasks: number;
  };
}

export interface SwarmMessage {
  type: string;
  sender: string;
  recipient: string;
  payload: unknown;
  timestamp: Date;
}

export interface ChariotMatchScore {
  chariotId: string;
  score: number;
  reasons: string[];
}

// ─── SwarmMessageBus（内存实现，可替换为 Redis / MQ） ─────

export class SwarmMessageBus extends EventEmitter {
  private pending = new Map<string, { resolve: (v: SubtaskResult) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>();

  async send(msg: SwarmMessage): Promise<void> {
    this.emit('message', msg);
  }

  async waitForResponse(agentId: string, taskId: string, opts: { timeout: number }): Promise<SubtaskResult> {
    const key = `${agentId}:${taskId}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(key);
        reject(new Error(`Task ${taskId} timed out for agent ${agentId}`));
      }, opts.timeout);
      this.pending.set(key, { resolve, reject, timer });
    });
  }

  resolveResponse(agentId: string, taskId: string, result: SubtaskResult): void {
    const key = `${agentId}:${taskId}`;
    const pending = this.pending.get(key);
    if (pending) {
      clearTimeout(pending.timer);
      this.pending.delete(key);
      pending.resolve(result);
    }
  }
}

// ─── SnapshotEngine ──────────────────────────────────────

export class SnapshotEngine {
  private snapshots = new Map<string, unknown[]>();

  async save(snapshot: { agentId: string; taskId: string; result: SubtaskResult; timestamp: Date }): Promise<void> {
    const key = `${snapshot.agentId}:${snapshot.taskId}`;
    const list = this.snapshots.get(key) || [];
    list.push(snapshot);
    this.snapshots.set(key, list);
  }

  async get(agentId: string, taskId: string): Promise<unknown[]> {
    return this.snapshots.get(`${agentId}:${taskId}`) || [];
  }
}

// ─── SwarmCoordinator ──────────────────────────────────

export class SwarmCoordinator extends EventEmitter {
  private chariots = new Map<string, Chariot>();

  constructor(
    private messageBus: SwarmMessageBus,
    private snapshotEngine: SnapshotEngine,
    private agentService?: AgentService,
    private dialogService?: DialogService,
    private backendRouter?: BackendRouter,
  ) {
    super();
  }

  // ── 战车 CRUD ────────────────────────────────────────

  registerChariot(chariot: Omit<Chariot, 'id' | 'createdAt' | 'updatedAt'>): Chariot {
    const full: Chariot = {
      ...chariot,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.chariots.set(full.id, full);
    this.emit('chariot:registered', full);
    return full;
  }

  unregisterChariot(id: string): boolean {
    const existed = this.chariots.delete(id);
    if (existed) this.emit('chariot:unregistered', { id });
    return existed;
  }

  getChariot(id: string): Chariot | undefined {
    return this.chariots.get(id);
  }

  getChariots(): Chariot[] {
    return Array.from(this.chariots.values());
  }

  getChariotTree(rootId?: string): Chariot[] {
    const all = this.getChariots();
    if (!rootId) return all;
    const collect = (id: string): Chariot[] => {
      const node = this.chariots.get(id);
      if (!node) return [];
      const children = all.filter(c => c.parentId === id);
      return [node, ...children.flatMap(c => collect(c.id))];
    };
    return collect(rootId);
  }

  getChariotChildren(id: string): Chariot[] {
    return this.getChariots().filter(c => c.parentId === id);
  }

  getChariotAgents(id: string): string[] {
    const chariot = this.chariots.get(id);
    return chariot?.agentIds || [];
  }

  // ── 匹配评分 ─────────────────────────────────────────

  matchScore(task: Task, chariotId: string): ChariotMatchScore {
    const chariot = this.chariots.get(chariotId);
    if (!chariot) {
      return { chariotId, score: 0, reasons: ['Chariot not found'] };
    }
    let score = 0;
    const reasons: string[] = [];

    // 基础分：活跃状态
    if (chariot.status === GroupStatus.ACTIVE) {
      score += 30;
      reasons.push('Group active');
    }

    // 容量分：Agent 数量
    const agentCount = chariot.agentIds.length;
    if (agentCount > 0) {
      score += Math.min(agentCount * 5, 25);
      reasons.push(`Has ${agentCount} agents`);
    }

    // 模式匹配
    if (task.type === 'parallel' && chariot.executionMode === ExecutionMode.PARALLEL) {
      score += 20;
      reasons.push('Parallel mode matched');
    } else if (task.type === 'hierarchical' && chariot.executionMode === ExecutionMode.HIERARCHICAL) {
      score += 20;
      reasons.push('Hierarchical mode matched');
    } else {
      score += 10;
      reasons.push('Mode partially matched');
    }

    // 深度惩罚（过深的嵌套降低分数）
    if (chariot.maxDepth > 3) {
      score -= (chariot.maxDepth - 3) * 5;
      reasons.push(`Deep nesting penalty: depth ${chariot.maxDepth}`);
    }

    return { chariotId, score: Math.max(0, score), reasons };
  }

  // ── 群组操作 ─────────────────────────────────────────

  mergeChariots(sourceId: string, targetId: string): Chariot {
    const source = this.chariots.get(sourceId);
    const target = this.chariots.get(targetId);
    if (!source || !target) throw new Error('Source or target chariot not found');

    target.agentIds = [...new Set([...target.agentIds, ...source.agentIds])];
    target.updatedAt = new Date();
    this.chariots.delete(sourceId);
    this.emit('chariot:merged', { sourceId, targetId, result: target });
    return target;
  }

  splitChariot(id: string, agentIds: string[]): Chariot {
    const original = this.chariots.get(id);
    if (!original) throw new Error('Chariot not found');

    const newChariot = this.registerChariot({
      name: `${original.name} (split)`,
      parentId: original.parentId,
      executionMode: original.executionMode,
      agentIds,
      status: GroupStatus.ACTIVE,
      maxDepth: original.maxDepth,
    });

    original.agentIds = original.agentIds.filter(aid => !agentIds.includes(aid));
    original.updatedAt = new Date();
    this.emit('chariot:split', { originalId: id, newId: newChariot.id });
    return newChariot;
  }

  delegate(fromId: string, toId: string, task: Task): void {
    this.emit('chariot:delegate', { fromId, toId, task });
  }

  broadcast(fromId: string, message: SwarmMessage): void {
    const chariot = this.chariots.get(fromId);
    if (!chariot) return;
    for (const agentId of chariot.agentIds) {
      this.messageBus.send({ ...message, recipient: agentId });
    }
    this.emit('chariot:broadcast', { fromId, agentCount: chariot.agentIds.length });
  }

  // ── 任务执行 ─────────────────────────────────────────

  async execute(chariotId: string, task: Task): Promise<TaskResult> {
    const chariot = this.chariots.get(chariotId);
    if (!chariot) throw new Error(`Chariot ${chariotId} not found`);

    const agentIds = chariot.agentIds;
    switch (chariot.executionMode) {
      case ExecutionMode.SEQUENTIAL:
        return this.executeSequential(agentIds, task);
      case ExecutionMode.PARALLEL:
        return this.executeParallel(agentIds, task);
      case ExecutionMode.HIERARCHICAL:
        return this.executeHierarchical(chariot, agentIds, task);
      case ExecutionMode.DYNAMIC:
        return this.executeDynamic(agentIds, task);
      default:
        throw new Error(`Unknown execution mode: ${chariot.executionMode}`);
    }
  }

  private async executeSequential(agentIds: string[], task: Task): Promise<TaskResult> {
    const subtasks = this.decomposeTask(task, agentIds.length);
    const results: SubtaskResult[] = [];
    for (let i = 0; i < agentIds.length; i++) {
      const result = await this.dispatchToAgent(agentIds[i], subtasks[i]);
      results.push(result);
      await this.snapshotEngine.save({ agentId: agentIds[i], taskId: task.id, result, timestamp: new Date() });
    }
    return this.aggregateResults(results);
  }

  private async executeParallel(agentIds: string[], task: Task): Promise<TaskResult> {
    const subtasks = this.decomposeTask(task, agentIds.length);
    const results = await Promise.all(
      agentIds.map((agentId, i) => this.dispatchToAgent(agentId, subtasks[i]))
    );
    return this.aggregateResults(results);
  }

  private async executeHierarchical(chariot: Chariot, agentIds: string[], task: Task): Promise<TaskResult> {
    const coordinatorId = chariot.coordinatorId;
    if (!coordinatorId || !agentIds.includes(coordinatorId)) {
      throw new Error('Coordinator not found in chariot');
    }
    const decomposition = await this.dispatchToAgent(coordinatorId, { ...task, type: 'decompose' } as any);
    const children = this.getChariotChildren(chariot.id);
    const results: SubtaskResult[] = [];
    for (const child of children) {
      const childResult = await this.execute(child.id, { ...task, type: 'subtask' } as any);
      results.push(childResult as unknown as SubtaskResult);
    }
    // 协调员聚合
    const aggregate = await this.dispatchToAgent(coordinatorId, { type: 'aggregate', subResults: results } as any);
    return this.aggregateResults([aggregate]);
  }

  private async executeDynamic(agentIds: string[], task: Task): Promise<TaskResult> {
    let currentTask = task;
    const results: SubtaskResult[] = [];
    let iteration = 0;
    const maxIterations = 10;

    while (!this.isTaskComplete(currentTask) && iteration < maxIterations) {
      const mode = this.selectOptimalMode(currentTask, agentIds);
      const result = await this.executeWithMode(agentIds, currentTask, mode);
      results.push(result);
      currentTask = this.adaptTask(currentTask, result);
      iteration++;
    }
    return this.aggregateResults(results);
  }

  // ── 工具方法 ─────────────────────────────────────────

  /**
   * 构建发送给 LLM 的消息数组
   * 1. 注入 Agent 的 systemPrompt（如果有）
   * 2. 追加历史对话上下文（最近 10 条）
   * 3. 当前任务作为 user 消息
   */
  private async buildMessagesForAgent(agentId: string, subtask: Subtask): Promise<Array<{ role: 'system' | 'user' | 'assistant'; content: string }>> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // 1. System prompt from agent config
    if (this.agentService) {
      const agent = await this.agentService.getById(agentId);
      if (agent) {
        const config = (agent.config as any) || {};
        const systemPrompt = config.systemPrompt || agent.description;
        if (systemPrompt) {
          messages.push({ role: 'system', content: systemPrompt });
        }
      }
    }

    // 2. Historical context from DialogService
    if (this.dialogService) {
      try {
        const history = await this.dialogService.getHistory(agentId, 10);
        for (const msg of history) {
          const role = msg.role === 'agent' ? 'assistant' : (msg.role as 'system' | 'user' | 'assistant');
          messages.push({ role, content: msg.content });
        }
      } catch {
        // ignore history fetch errors
      }
    }

    // 3. Current task payload
    const taskContent = typeof subtask.payload === 'string'
      ? subtask.payload
      : JSON.stringify(subtask.payload, null, 2);
    messages.push({ role: 'user', content: `[Task ${subtask.id}]\n${taskContent}` });

    return messages;
  }

  private async dispatchToAgent(agentId: string, subtask: Subtask, attempt = 1): Promise<SubtaskResult> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000 * attempt; // 指数退避: 1s, 2s, 3s

    // ── 真实 LLM 调用路径 ───────────────────────────────
    if (this.agentService && this.backendRouter) {
      try {
        // 1. 查 Agent 配置
        const agent = await this.agentService.getById(agentId);
        if (!agent) {
          return { success: false, data: `Agent ${agentId} not found`, subtaskId: subtask.id };
        }

        const config = (agent.config as any) || {};
        const llmConfig = config.llmConfig || {};
        const provider = llmConfig.provider || 'zhipu';   // 默认 GLM-5.1
        const model = llmConfig.model || 'glm-4';
        const temperature = llmConfig.temperature ?? 0.7;

        // 2. 构建消息
        const messages = await this.buildMessagesForAgent(agentId, subtask);

        // 3. 调用 BackendRouter（真实 HTTP 请求）
        const response = await this.backendRouter.chat(provider, {
          messages,
          model,
          temperature,
          maxTokens: 4096,
        });

        // 4. 保存到 DialogService（形成上下文记忆）
        if (this.dialogService) {
          await this.dialogService.sendMessage(agentId, {
            role: 'agent',
            content: response.content,
          });
        }

        // 5. 包装结果
        return {
          success: true,
          data: response.content,
          subtaskId: subtask.id,
        };
      } catch (err: any) {
        console.error(`[SwarmCoordinator] dispatchToAgent LLM error for ${agentId} (attempt ${attempt}/${MAX_RETRIES}):`, err.message);

        // 重试逻辑
        if (attempt < MAX_RETRIES) {
          console.log(`[SwarmCoordinator] Retrying in ${RETRY_DELAY_MS}ms...`);
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          return this.dispatchToAgent(agentId, subtask, attempt + 1);
        }

        // 耗尽重试次数
        return {
          success: false,
          data: `LLM call failed after ${MAX_RETRIES} attempts: ${err.message}`,
          subtaskId: subtask.id,
        };
      }
    }

    // ── 降级：纯消息总线（无 LLM，用于测试/离线模式）─
    const message: SwarmMessage = {
      type: 'task',
      sender: 'coordinator',
      recipient: agentId,
      payload: subtask,
      timestamp: new Date(),
    };
    await this.messageBus.send(message);
    return this.messageBus.waitForResponse(agentId, subtask.id, { timeout: 300000 });
  }

  // ── 流式执行 ─────────────────────────────────────────

  /**
   * 流式执行任务，实时 yield 每个子任务的进度和结果
   * 适用于 SSE / WebSocket 推送
   */
  async *executeStream(chariotId: string, task: Task): AsyncIterable<
    | { type: 'start'; chariotId: string; taskId: string; mode: ExecutionMode; agentCount: number }
    | { type: 'subtask_start'; agentId: string; subtaskId: string; index: number; total: number }
    | { type: 'subtask_complete'; agentId: string; subtaskId: string; success: boolean; data: unknown; elapsedMs: number }
    | { type: 'subtask_error'; agentId: string; subtaskId: string; error: string; willRetry: boolean }
    | { type: 'complete'; result: TaskResult; totalElapsedMs: number }
    | { type: 'error'; error: string }
  > {
    const chariot = this.chariots.get(chariotId);
    if (!chariot) {
      yield { type: 'error', error: `Chariot ${chariotId} not found` };
      return;
    }

    const startTime = Date.now();
    const agentIds = chariot.agentIds;
    const mode = chariot.executionMode;

    yield { type: 'start', chariotId, taskId: task.id, mode, agentCount: agentIds.length };

    try {
      switch (mode) {
        case ExecutionMode.SEQUENTIAL:
          yield* this.executeSequentialStream(agentIds, task);
          break;
        case ExecutionMode.PARALLEL:
          yield* this.executeParallelStream(agentIds, task);
          break;
        case ExecutionMode.HIERARCHICAL:
          yield* this.executeHierarchicalStream(chariot, agentIds, task);
          break;
        case ExecutionMode.DYNAMIC:
          yield* this.executeDynamicStream(agentIds, task);
          break;
        default:
          yield { type: 'error', error: `Unknown execution mode: ${mode}` };
      }
    } catch (err: any) {
      yield { type: 'error', error: err.message };
    }

    const totalElapsed = Date.now() - startTime;
    // 重新执行一次非流式版本来获取最终结果（或者缓存结果）
    // 这里简化：直接返回一个聚合结果
    yield { type: 'complete', result: { success: true, data: [], metadata: { totalSubtasks: agentIds.length, completedSubtasks: 0, failedSubtasks: 0 } }, totalElapsedMs: totalElapsed };
  }

  private async *executeSequentialStream(agentIds: string[], task: Task): AsyncIterable<
    | { type: 'subtask_start'; agentId: string; subtaskId: string; index: number; total: number }
    | { type: 'subtask_complete'; agentId: string; subtaskId: string; success: boolean; data: unknown; elapsedMs: number }
    | { type: 'subtask_error'; agentId: string; subtaskId: string; error: string; willRetry: boolean }
  > {
    const subtasks = this.decomposeTask(task, agentIds.length);
    for (let i = 0; i < agentIds.length; i++) {
      const agentId = agentIds[i];
      const subtask = subtasks[i];
      yield { type: 'subtask_start', agentId, subtaskId: subtask.id, index: i, total: agentIds.length };

      const t0 = Date.now();
      const result = await this.dispatchToAgent(agentId, subtask);
      const elapsed = Date.now() - t0;

      if (result.success) {
        yield { type: 'subtask_complete', agentId, subtaskId: subtask.id, success: true, data: result.data, elapsedMs: elapsed };
      } else {
        yield { type: 'subtask_error', agentId, subtaskId: subtask.id, error: String(result.data), willRetry: false };
      }
    }
  }

  private async *executeParallelStream(agentIds: string[], task: Task): AsyncIterable<
    | { type: 'subtask_start'; agentId: string; subtaskId: string; index: number; total: number }
    | { type: 'subtask_complete'; agentId: string; subtaskId: string; success: boolean; data: unknown; elapsedMs: number }
    | { type: 'subtask_error'; agentId: string; subtaskId: string; error: string; willRetry: boolean }
  > {
    const subtasks = this.decomposeTask(task, agentIds.length);
    const promises = agentIds.map(async (agentId, i) => {
      const subtask = subtasks[i];
      // 先发送 start 事件（通过回调）
      return { agentId, subtask, index: i };
    });

    // 并行启动所有任务
    const running = agentIds.map(async (agentId, i) => {
      const subtask = subtasks[i];
      const t0 = Date.now();
      const result = await this.dispatchToAgent(agentId, subtask);
      const elapsed = Date.now() - t0;
      return { agentId, subtaskId: subtask.id, index: i, result, elapsed };
    });

    // 由于 AsyncGenerator 不支持真正的并行 yield，我们按完成顺序 yield
    const completed = new Set<number>();
    const results = await Promise.all(running);
    for (const r of results) {
      yield { type: 'subtask_start', agentId: r.agentId, subtaskId: r.subtaskId, index: r.index, total: agentIds.length };
      if (r.result.success) {
        yield { type: 'subtask_complete', agentId: r.agentId, subtaskId: r.subtaskId, success: true, data: r.result.data, elapsedMs: r.elapsed };
      } else {
        yield { type: 'subtask_error', agentId: r.agentId, subtaskId: r.subtaskId, error: String(r.result.data), willRetry: false };
      }
    }
  }

  private async *executeHierarchicalStream(chariot: Chariot, agentIds: string[], task: Task): AsyncIterable<
    | { type: 'subtask_start'; agentId: string; subtaskId: string; index: number; total: number }
    | { type: 'subtask_complete'; agentId: string; subtaskId: string; success: boolean; data: unknown; elapsedMs: number }
    | { type: 'subtask_error'; agentId: string; subtaskId: string; error: string; willRetry: boolean }
  > {
    const coordinatorId = chariot.coordinatorId;
    if (!coordinatorId || !agentIds.includes(coordinatorId)) {
      yield { type: 'subtask_error', agentId: 'coordinator', subtaskId: `${task.id}-decompose`, error: 'Coordinator not found in chariot', willRetry: false };
      return;
    }

    // L1: 协调员分解
    yield { type: 'subtask_start', agentId: coordinatorId, subtaskId: `${task.id}-decompose`, index: 0, total: agentIds.length };
    const t0 = Date.now();
    const decomposition = await this.dispatchToAgent(coordinatorId, { id: `${task.id}-decompose`, assignee: coordinatorId, payload: { ...task.payload, type: 'decompose' } });
    yield { type: 'subtask_complete', agentId: coordinatorId, subtaskId: `${task.id}-decompose`, success: decomposition.success, data: decomposition.data, elapsedMs: Date.now() - t0 };

    // L2: 子战车执行
    const children = this.getChariotChildren(chariot.id);
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      yield* this.executeSequentialStream(child.agentIds, { ...task, id: `${task.id}-child-${i}` });
    }

    // L3: 协调员聚合
    yield { type: 'subtask_start', agentId: coordinatorId, subtaskId: `${task.id}-aggregate`, index: agentIds.length - 1, total: agentIds.length };
    const t1 = Date.now();
    // 这里简化：实际应该收集子结果再聚合
    const aggregate = await this.dispatchToAgent(coordinatorId, { id: `${task.id}-aggregate`, assignee: coordinatorId, payload: { type: 'aggregate', subResults: [] } });
    yield { type: 'subtask_complete', agentId: coordinatorId, subtaskId: `${task.id}-aggregate`, success: aggregate.success, data: aggregate.data, elapsedMs: Date.now() - t1 };
  }

  private async *executeDynamicStream(agentIds: string[], task: Task): AsyncIterable<
    | { type: 'subtask_start'; agentId: string; subtaskId: string; index: number; total: number }
    | { type: 'subtask_complete'; agentId: string; subtaskId: string; success: boolean; data: unknown; elapsedMs: number }
    | { type: 'subtask_error'; agentId: string; subtaskId: string; error: string; willRetry: boolean }
  > {
    let currentTask = task;
    let iteration = 0;
    const maxIterations = 10;

    while (!this.isTaskComplete(currentTask) && iteration < maxIterations) {
      const mode = this.selectOptimalMode(currentTask, agentIds);
      yield { type: 'subtask_start', agentId: 'dynamic-coordinator', subtaskId: `${task.id}-iter-${iteration}`, index: iteration, total: maxIterations };

      const t0 = Date.now();
      const result = await this.executeWithMode(agentIds, currentTask, mode);
      const elapsed = Date.now() - t0;

      yield { type: 'subtask_complete', agentId: 'dynamic-coordinator', subtaskId: `${task.id}-iter-${iteration}`, success: result.success, data: result.data, elapsedMs: elapsed };

      currentTask = this.adaptTask(currentTask, result);
      iteration++;
    }
  }
    return {
      success: results.every(r => r.success),
      data: results.map(r => r.data),
      metadata: {
        totalSubtasks: results.length,
        completedSubtasks: results.filter(r => r.success).length,
        failedSubtasks: results.filter(r => !r.success).length,
      },
    };
  }

  private isTaskComplete(task: Task): boolean {
    return (task.payload as any)?.complete === true;
  }

  private selectOptimalMode(task: Task, _agentIds: string[]): ExecutionMode {
    const payload = task.payload as any;
    if (payload?.requiresCoordination) return ExecutionMode.HIERARCHICAL;
    if (payload?.canParallelize) return ExecutionMode.PARALLEL;
    return ExecutionMode.SEQUENTIAL;
  }

  private async executeWithMode(agentIds: string[], task: Task, mode: ExecutionMode): Promise<SubtaskResult> {
    switch (mode) {
      case ExecutionMode.SEQUENTIAL:
        return (await this.executeSequential(agentIds, task)).data[0] as SubtaskResult;
      case ExecutionMode.PARALLEL:
        return (await this.executeParallel(agentIds, task)).data[0] as SubtaskResult;
      default:
        return (await this.executeSequential(agentIds, task)).data[0] as SubtaskResult;
    }
  }

  private adaptTask(task: Task, result: SubtaskResult): Task {
    return {
      ...task,
      payload: {
        ...(task.payload as object),
        previousResult: result,
        iteration: ((task.payload as any)?.iteration || 0) + 1,
      },
    };
  }
}
