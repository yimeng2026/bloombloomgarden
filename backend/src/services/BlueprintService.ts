import { EventEmitter } from 'events';
import type { PrismaClient } from '@prisma/client';

export interface Blueprint {
  id: string;
  name: string;
  description?: string;
  steps: BlueprintStep[];
  variables: Record<string, unknown>;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BlueprintStep {
  id: string;
  name: string;
  type: 'agent' | 'group' | 'condition' | 'parallel' | 'merge';
  config: Record<string, unknown>;
  nextSteps: string[];
}

export interface BlueprintExecution {
  id: string;
  blueprintId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  currentStepId?: string;
  results: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
}

export class BlueprintService extends EventEmitter {
  private blueprints = new Map<string, Blueprint>();
  private executions = new Map<string, BlueprintExecution>();

  constructor(private prisma?: PrismaClient) {
    super();
  }

  async create(data: Omit<Blueprint, 'id' | 'createdAt' | 'updatedAt'>): Promise<Blueprint> {
    if (this.prisma) {
      const raw = await this.prisma.blueprint.create({
        data: {
          id: crypto.randomUUID(),
          name: data.name,
          description: data.description,
          steps: JSON.stringify(data.steps || []),
          variables: JSON.stringify(data.variables || {}),
          tags: JSON.stringify(data.tags || []),
        },
      });
      const blueprint = this.fromDb(raw);
      this.emit('blueprint:created', blueprint);
      return blueprint;
    }
    const blueprint: Blueprint = { ...data, id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date() };
    this.blueprints.set(blueprint.id, blueprint);
    this.emit('blueprint:created', blueprint);
    return blueprint;
  }

  async getById(id: string): Promise<Blueprint | undefined> {
    if (this.prisma) {
      const raw = await this.prisma.blueprint.findUnique({ where: { id } });
      return raw ? this.fromDb(raw) : undefined;
    }
    return this.blueprints.get(id);
  }

  async list(): Promise<Blueprint[]> {
    if (this.prisma) {
      const raws = await this.prisma.blueprint.findMany({ orderBy: { createdAt: 'desc' } });
      return raws.map(this.fromDb);
    }
    return Array.from(this.blueprints.values());
  }

  async update(id: string, data: Partial<Blueprint>): Promise<Blueprint | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.steps) updateData.steps = JSON.stringify(data.steps);
    if (data.variables) updateData.variables = JSON.stringify(data.variables);
    if (data.tags) updateData.tags = JSON.stringify(data.tags);

    if (this.prisma) {
      try {
        const raw = await this.prisma.blueprint.update({ where: { id }, data: updateData });
        return this.fromDb(raw);
      } catch {
        return undefined;
      }
    }
    const blueprint = this.blueprints.get(id);
    if (!blueprint) return undefined;
    Object.assign(blueprint, data, { updatedAt: new Date() });
    return blueprint;
  }

  async delete(id: string): Promise<boolean> {
    if (this.prisma) {
      try {
        await this.prisma.blueprint.delete({ where: { id } });
        return true;
      } catch {
        return false;
      }
    }
    return this.blueprints.delete(id);
  }

  async execute(id: string, variables?: Record<string, unknown>): Promise<BlueprintExecution> {
    const blueprint = await this.getById(id);
    if (!blueprint) throw new Error(`Blueprint ${id} not found`);
    const execution: BlueprintExecution = {
      id: crypto.randomUUID(),
      blueprintId: id,
      status: 'running',
      currentStepId: blueprint.steps[0]?.id,
      results: { ...blueprint.variables, ...variables },
      startedAt: new Date(),
    };
    this.executions.set(execution.id, execution);
    this.emit('blueprint:executing', execution);
    setTimeout(() => {
      execution.status = 'completed';
      execution.completedAt = new Date();
      this.emit('blueprint:completed', execution);
    }, 100);
    return execution;
  }

  async pauseExecution(executionId: string): Promise<BlueprintExecution | undefined> {
    const execution = this.executions.get(executionId);
    if (!execution) return undefined;
    execution.status = 'paused';
    this.emit('blueprint:paused', execution);
    return execution;
  }

  async resumeExecution(executionId: string): Promise<BlueprintExecution | undefined> {
    const execution = this.executions.get(executionId);
    if (!execution) return undefined;
    execution.status = 'running';
    this.emit('blueprint:resumed', execution);
    return execution;
  }

  getExecutions(blueprintId: string): BlueprintExecution[] {
    return Array.from(this.executions.values()).filter(e => e.blueprintId === blueprintId);
  }

  getPresets(): Blueprint[] {
    return [
      {
        id: 'preset-code-review',
        name: 'Code Review Pipeline',
        description: 'Automated code review with multiple agents',
        steps: [
          { id: 's1', name: 'Syntax Check', type: 'agent', config: { role: 'reviewer' }, nextSteps: ['s2'] },
          { id: 's2', name: 'Security Scan', type: 'agent', config: { role: 'security' }, nextSteps: ['s3'] },
          { id: 's3', name: 'Style Review', type: 'agent', config: { role: 'reviewer' }, nextSteps: [] },
        ],
        variables: {},
        tags: ['dev', 'review'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'preset-data-analysis',
        name: 'Data Analysis Pipeline',
        description: 'Multi-step data processing workflow',
        steps: [
          { id: 's1', name: 'Data Ingest', type: 'agent', config: { role: 'analyst' }, nextSteps: ['s2'] },
          { id: 's2', name: 'Clean & Transform', type: 'agent', config: { role: 'analyst' }, nextSteps: ['s3'] },
          { id: 's3', name: 'Generate Report', type: 'agent', config: { role: 'writer' }, nextSteps: [] },
        ],
        variables: {},
        tags: ['data', 'analysis'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  private fromDb(raw: any): Blueprint {
    return {
      ...raw,
      steps: JSON.parse(raw.steps || '[]'),
      variables: JSON.parse(raw.variables || '{}'),
      tags: JSON.parse(raw.tags || '[]'),
    };
  }
}
