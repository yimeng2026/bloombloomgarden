const uuidv4 = () => crypto.randomUUID();

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  agentId?: string;
  workspaceId?: string;
  payload?: Record<string, any>;
  result?: any;
  error?: string;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  retryCount: number;
  maxRetries: number;
}

export interface CreateTaskInput {
  name: string;
  description?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  agentId?: string;
  workspaceId?: string;
  payload?: Record<string, any>;
  scheduledAt?: Date | string;
  maxRetries?: number;
}

export interface UpdateTaskInput {
  name?: string;
  description?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  agentId?: string;
  workspaceId?: string;
  payload?: Record<string, any>;
  scheduledAt?: Date | string;
}

export interface TaskFilter {
  status?: Task['status'];
  priority?: Task['priority'];
  agentId?: string;
  workspaceId?: string;
  search?: string;
}

export interface TaskListResult {
  tasks: Task[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ScheduleOptions {
  delay?: number; // ms
  cron?: string;
  executeAt?: Date;
}

class TaskService {
  private tasks: Map<string, Task> = new Map();
  private maxConcurrent = 3;
  private runningCount = 0;
  private schedulerInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize mock data
    this.seedMockData();
    // Start background scheduler
    this.startScheduler();
  }

  private seedMockData(): void {
    const now = new Date();
    const mockTasks: CreateTaskInput[] = [
      {
        name: '分析用户意图',
        description: '解析自然语言输入，识别用户意图并提取关键参数',
        priority: 'high',
        agentId: 'agent-intent-001',
        payload: { input: '帮我创建一个数据分析Agent', source: 'chat' },
        maxRetries: 3,
      },
      {
        name: '生成代码片段',
        description: '根据需求描述生成可执行代码',
        priority: 'normal',
        agentId: 'agent-code-001',
        payload: { language: 'python', requirement: '实现快速排序' },
        maxRetries: 2,
      },
      {
        name: '知识库索引更新',
        description: '重新索引上传的文档，更新向量数据库',
        priority: 'low',
        workspaceId: 'ws-001',
        payload: { files: ['doc1.pdf', 'doc2.md'], force: false },
        maxRetries: 5,
      },
      {
        name: '模型性能评测',
        description: '对指定模型进行标准化 benchmark 测试',
        priority: 'urgent',
        agentId: 'agent-eval-001',
        payload: { model: 'gpt-4o', datasets: ['mmlu', 'gsm8k'] },
        maxRetries: 2,
      },
      {
        name: '定时数据备份',
        description: '每日自动备份系统数据到对象存储',
        priority: 'normal',
        payload: { type: 'daily_backup', destination: 's3' },
        maxRetries: 5,
      },
    ];

    mockTasks.forEach((input, idx) => {
      const task = this.createTask(input);
      // Simulate different statuses
      if (idx === 0) {
        task.status = 'completed';
        task.startedAt = new Date(now.getTime() - 300000);
        task.completedAt = new Date(now.getTime() - 120000);
        task.result = { intent: 'create_agent', confidence: 0.94, params: { type: 'data_analysis' } };
      } else if (idx === 1) {
        task.status = 'running';
        task.startedAt = new Date(now.getTime() - 60000);
        this.runningCount++;
      } else if (idx === 2) {
        task.status = 'pending';
        task.scheduledAt = new Date(now.getTime() + 300000);
      } else if (idx === 3) {
        task.status = 'failed';
        task.startedAt = new Date(now.getTime() - 600000);
        task.completedAt = new Date(now.getTime() - 580000);
        task.error = '模型 API 返回 429 Rate Limited，建议降低并发或更换模型';
        task.retryCount = 2;
      } else {
        task.status = 'pending';
        task.scheduledAt = new Date(now.getTime() + 86400000);
      }
    });
  }

  // ========== CRUD ==========

  createTask(input: CreateTaskInput): Task {
    const now = new Date();
    const task: Task = {
      id: uuidv4(),
      name: input.name,
      description: input.description || '',
      status: 'pending',
      priority: input.priority || 'normal',
      agentId: input.agentId,
      workspaceId: input.workspaceId,
      payload: input.payload || {},
      retryCount: 0,
      maxRetries: input.maxRetries || 3,
      createdAt: now,
      updatedAt: now,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  updateTask(id: string, input: UpdateTaskInput): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    if (input.name !== undefined) task.name = input.name;
    if (input.description !== undefined) task.description = input.description;
    if (input.priority !== undefined) task.priority = input.priority;
    if (input.agentId !== undefined) task.agentId = input.agentId;
    if (input.workspaceId !== undefined) task.workspaceId = input.workspaceId;
    if (input.payload !== undefined) task.payload = input.payload;
    if (input.scheduledAt !== undefined) task.scheduledAt = new Date(input.scheduledAt);
    task.updatedAt = new Date();

    return task;
  }

  deleteTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (task && task.status === 'running') {
      this.runningCount--;
    }
    return this.tasks.delete(id);
  }

  listTasks(filter?: TaskFilter, page = 1, pageSize = 20): TaskListResult {
    let result = Array.from(this.tasks.values());

    if (filter) {
      if (filter.status) result = result.filter(t => t.status === filter.status);
      if (filter.priority) result = result.filter(t => t.priority === filter.priority);
      if (filter.agentId) result = result.filter(t => t.agentId === filter.agentId);
      if (filter.workspaceId) result = result.filter(t => t.workspaceId === filter.workspaceId);
      if (filter.search) {
        const q = filter.search.toLowerCase();
        result = result.filter(t =>
          t.name.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
        );
      }
    }

    // Sort by priority (urgent > high > normal > low) then createdAt desc
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
    result.sort((a, b) => {
      const pa = priorityOrder[a.priority] || 0;
      const pb = priorityOrder[b.priority] || 0;
      if (pa !== pb) return pb - pa;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const total = result.length;
    const start = (page - 1) * pageSize;
    const paginated = result.slice(start, start + pageSize);

    return { tasks: paginated, total, page, pageSize };
  }

  // ========== Status Transitions ==========

  startTask(id: string): Task | undefined {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'pending') return undefined;
    task.status = 'running';
    task.startedAt = new Date();
    task.updatedAt = new Date();
    this.runningCount++;
    return task;
  }

  completeTask(id: string, result?: any): Task | undefined {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'running') return undefined;
    task.status = 'completed';
    task.result = result;
    task.completedAt = new Date();
    task.updatedAt = new Date();
    this.runningCount--;
    return task;
  }

  failTask(id: string, error: string): Task | undefined {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'running') return undefined;
    task.status = 'failed';
    task.error = error;
    task.completedAt = new Date();
    task.updatedAt = new Date();
    this.runningCount--;
    return task;
  }

  cancelTask(id: string): Task | undefined {
    const task = this.tasks.get(id);
    if (!task || task.status === 'completed') return undefined;
    if (task.status === 'running') this.runningCount--;
    task.status = 'cancelled';
    task.updatedAt = new Date();
    return task;
  }

  retryTask(id: string): Task | undefined {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'failed') return undefined;
    if (task.retryCount >= task.maxRetries) return undefined;
    task.retryCount++;
    task.status = 'pending';
    task.error = undefined;
    task.startedAt = undefined;
    task.completedAt = undefined;
    task.updatedAt = new Date();
    return task;
  }

  // ========== Agent Association ==========

  assignTaskToAgent(taskId: string, agentId: string): Task | undefined {
    return this.updateTask(taskId, { agentId });
  }

  getAgentTasks(agentId: string, status?: Task['status']): Task[] {
    let tasks = Array.from(this.tasks.values()).filter(t => t.agentId === agentId);
    if (status) tasks = tasks.filter(t => t.status === status);
    return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  batchAssignToAgent(taskIds: string[], agentId: string): { success: string[]; failed: string[] } {
    const success: string[] = [];
    const failed: string[] = [];
    for (const id of taskIds) {
      const updated = this.assignTaskToAgent(id, agentId);
      if (updated) success.push(id);
      else failed.push(id);
    }
    return { success, failed };
  }

  // ========== Scheduling ==========

  scheduleTask(id: string, options: ScheduleOptions): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    if (options.executeAt) {
      task.scheduledAt = new Date(options.executeAt);
    } else if (options.delay) {
      task.scheduledAt = new Date(Date.now() + options.delay);
    }
    // cron is stored in payload for simplicity
    if (options.cron) {
      task.payload = { ...task.payload, cron: options.cron };
    }
    task.updatedAt = new Date();
    return task;
  }

  // ========== Execution ==========

  async executeTask(id: string): Promise<Task | undefined> {
    const task = this.startTask(id);
    if (!task) return undefined;

    try {
      const result = await this.performExecution(task);
      return this.completeTask(id, result);
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      const failed = this.failTask(id, errMsg);
      // Auto retry if retries left
      if (failed && failed.retryCount < failed.maxRetries) {
        setTimeout(() => this.retryTask(id), 1000 * Math.pow(2, failed.retryCount));
      }
      return failed;
    }
  }

  private async performExecution(task: Task): Promise<any> {
    // Simulate LLM/Agent execution
    const duration = 1000 + Math.random() * 4000; // 1-5s
    await new Promise(resolve => setTimeout(resolve, duration));

    // Simulate occasional failure (10% chance)
    if (Math.random() < 0.1) {
      throw new Error(`Execution failed for task "${task.name}": simulated error`);
    }

    return {
      taskId: task.id,
      executedAt: new Date().toISOString(),
      duration,
      output: `Task "${task.name}" executed successfully`,
    };
  }

  // ========== Scheduler ==========

  private startScheduler(): void {
    this.schedulerInterval = setInterval(() => {
      this.processScheduledTasks();
    }, 5000);
  }

  private processScheduledTasks(): void {
    const now = new Date();
    const pending = Array.from(this.tasks.values()).filter(t =>
      t.status === 'pending' &&
      t.scheduledAt &&
      t.scheduledAt <= now
    );

    for (const task of pending) {
      if (this.runningCount >= this.maxConcurrent) break;
      this.executeTask(task.id);
    }
  }

  stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  // ========== Statistics ==========

  getStats(): {
    total: number;
    byStatus: Record<Task['status'], number>;
    byPriority: Record<Task['priority'], number>;
    completionRate: number;
    avgExecutionTime: number;
  } {
    const tasks = Array.from(this.tasks.values());
    const byStatus = { pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
    const byPriority = { low: 0, normal: 0, high: 0, urgent: 0 };
    let completedCount = 0;
    let totalExecutionTime = 0;

    for (const t of tasks) {
      byStatus[t.status]++;
      byPriority[t.priority]++;
      if (t.status === 'completed' && t.startedAt && t.completedAt) {
        completedCount++;
        totalExecutionTime += t.completedAt.getTime() - t.startedAt.getTime();
      }
    }

    return {
      total: tasks.length,
      byStatus,
      byPriority,
      completionRate: tasks.length > 0 ? completedCount / tasks.length : 0,
      avgExecutionTime: completedCount > 0 ? totalExecutionTime / completedCount : 0,
    };
  }

  getQueueStatus(): {
    running: number;
    pending: number;
    queued: number;
    maxConcurrent: number;
  } {
    const pending = Array.from(this.tasks.values()).filter(t => t.status === 'pending');
    const queued = pending.filter(t => t.scheduledAt && t.scheduledAt > new Date()).length;
    return {
      running: this.runningCount,
      pending: pending.length,
      queued,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

export const taskService = new TaskService();
export default taskService;
