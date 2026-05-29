import { EventEmitter } from 'events';
import { SwarmCoordinator, Chariot, Task, TaskResult } from './SwarmCoordinator';

// ─── 类型定义 ───────────────────────────────────────────

export enum HandoffStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  STARTED = 'started',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface HandoffRecord {
  id: string;
  sourceChariotId: string;
  targetChariotId: string;
  task: Task;
  status: HandoffStatus;
  initiatedBy: string;
  acceptedBy?: string;
  startedAt?: Date;
  completedAt?: Date;
  result?: TaskResult;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HandoffInitiateRequest {
  sourceChariotId: string;
  targetChariotId: string;
  task: Task;
  initiatedBy: string;
  reason?: string;
}

// ─── InterChariotHandoffProtocol ───────────────────────

export class InterChariotHandoffProtocol extends EventEmitter {
  private records = new Map<string, HandoffRecord>();

  constructor(private swarmCoordinator: SwarmCoordinator) {
    super();
  }

  // ── 生命周期 ──────────────────────────────────────────

  initiate(request: HandoffInitiateRequest): HandoffRecord {
    const record: HandoffRecord = {
      id: crypto.randomUUID(),
      ...request,
      status: HandoffStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.set(record.id, record);
    this.emit('handoff:initiated', record);
    return record;
  }

  accept(handoffId: string, acceptedBy: string): HandoffRecord {
    const record = this.getRecord(handoffId);
    if (record.status !== HandoffStatus.PENDING) {
      throw new Error(`Cannot accept handoff in status ${record.status}`);
    }
    record.status = HandoffStatus.ACCEPTED;
    record.acceptedBy = acceptedBy;
    record.updatedAt = new Date();
    this.emit('handoff:accepted', record);
    return record;
  }

  reject(handoffId: string, reason?: string): HandoffRecord {
    const record = this.getRecord(handoffId);
    if (record.status !== HandoffStatus.PENDING) {
      throw new Error(`Cannot reject handoff in status ${record.status}`);
    }
    record.status = HandoffStatus.REJECTED;
    record.reason = reason || record.reason;
    record.updatedAt = new Date();
    this.emit('handoff:rejected', record);
    return record;
  }

  async start(handoffId: string): Promise<HandoffRecord> {
    const record = this.getRecord(handoffId);
    if (record.status !== HandoffStatus.ACCEPTED) {
      throw new Error(`Cannot start handoff in status ${record.status}`);
    }
    record.status = HandoffStatus.STARTED;
    record.startedAt = new Date();
    record.updatedAt = new Date();
    this.emit('handoff:started', record);
    return record;
  }

  async complete(handoffId: string, result: TaskResult): Promise<HandoffRecord> {
    const record = this.getRecord(handoffId);
    if (record.status !== HandoffStatus.STARTED) {
      throw new Error(`Cannot complete handoff in status ${record.status}`);
    }
    record.status = HandoffStatus.COMPLETED;
    record.result = result;
    record.completedAt = new Date();
    record.updatedAt = new Date();
    this.emit('handoff:completed', record);
    return record;
  }

  cancel(handoffId: string, reason?: string): HandoffRecord {
    const record = this.getRecord(handoffId);
    if (record.status === HandoffStatus.COMPLETED || record.status === HandoffStatus.REJECTED) {
      throw new Error(`Cannot cancel handoff in status ${record.status}`);
    }
    record.status = HandoffStatus.CANCELLED;
    record.reason = reason || record.reason;
    record.updatedAt = new Date();
    this.emit('handoff:cancelled', record);
    return record;
  }

  // ── 查询 ─────────────────────────────────────────────

  getRecord(id: string): HandoffRecord {
    const record = this.records.get(id);
    if (!record) throw new Error(`Handoff record ${id} not found`);
    return record;
  }

  getStatus(handoffId: string): HandoffStatus {
    return this.getRecord(handoffId).status;
  }

  listRecords(filter?: { sourceChariotId?: string; targetChariotId?: string; status?: HandoffStatus }): HandoffRecord[] {
    let results = Array.from(this.records.values());
    if (filter?.sourceChariotId) {
      results = results.filter(r => r.sourceChariotId === filter.sourceChariotId);
    }
    if (filter?.targetChariotId) {
      results = results.filter(r => r.targetChariotId === filter.targetChariotId);
    }
    if (filter?.status) {
      results = results.filter(r => r.status === filter.status);
    }
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ── 执行引擎 ─────────────────────────────────────────

  async executeHandoff(handoffId: string): Promise<TaskResult> {
    const record = await this.start(handoffId);
    const targetChariot = this.swarmCoordinator.getChariot(record.targetChariotId);
    if (!targetChariot) {
      throw new Error(`Target chariot ${record.targetChariotId} not found`);
    }

    try {
      const result = await this.swarmCoordinator.execute(record.targetChariotId, record.task);
      await this.complete(handoffId, result);
      return result;
    } catch (error) {
      await this.cancel(handoffId, (error as Error).message);
      throw error;
    }
  }

  // ── 批量操作 ─────────────────────────────────────────

  async autoAcceptForChariot(chariotId: string, policy: 'all' | 'internal' | 'none' = 'internal'): Promise<number> {
    const pending = this.listRecords({ targetChariotId: chariotId, status: HandoffStatus.PENDING });
    let accepted = 0;
    for (const record of pending) {
      const source = this.swarmCoordinator.getChariot(record.sourceChariotId);
      const target = this.swarmCoordinator.getChariot(record.targetChariotId);
      const isInternal = source?.parentId === target?.parentId;
      if (policy === 'all' || (policy === 'internal' && isInternal)) {
        this.accept(record.id, 'system:auto-accept');
        accepted++;
      }
    }
    return accepted;
  }

  getChariotStats(chariotId: string): {
    total: number;
    pending: number;
    accepted: number;
    started: number;
    completed: number;
    rejected: number;
    cancelled: number;
  } {
    const records = this.listRecords({ sourceChariotId: chariotId });
    const count = (status: HandoffStatus) => records.filter(r => r.status === status).length;
    return {
      total: records.length,
      pending: count(HandoffStatus.PENDING),
      accepted: count(HandoffStatus.ACCEPTED),
      started: count(HandoffStatus.STARTED),
      completed: count(HandoffStatus.COMPLETED),
      rejected: count(HandoffStatus.REJECTED),
      cancelled: count(HandoffStatus.CANCELLED),
    };
  }
}
