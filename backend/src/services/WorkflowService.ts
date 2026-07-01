import { EventEmitter } from 'events';
import { prisma } from './PrismaService';
import { getGatewayService } from './GatewayService';

export interface WorkflowData {
  name: string;
  description?: string;
  definition?: WorkflowDefinition;
  category?: string;
  status?: string;
  triggerType?: string;
  cronExpression?: string;
  teamId?: string;
  createdBy?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowNode {
  id: string;
  type: string; // 'llm' | 'condition' | 'input' | 'output' | 'tool'
  label?: string;
  config?: Record<string, unknown>;
  engineId?: string;
  systemPrompt?: string;
  userPromptTemplate?: string;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface WorkflowExecutionLog {
  nodeId: string;
  nodeLabel?: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  startedAt: string;
  endedAt?: string;
  error?: string;
}

export class WorkflowService extends EventEmitter {
  // 列出所有工作流
  async listWorkflows() {
    const workflows = await prisma.workflow.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { executions: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    return workflows.map((w) => ({
      ...w,
      definition: JSON.parse(w.definition || '{}'),
    }));
  }

  // 获取单个工作流
  async getWorkflow(id: string) {
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: { executions: { orderBy: { createdAt: 'desc' } } },
    });
    if (!workflow) return null;
    return {
      ...workflow,
      definition: JSON.parse(workflow.definition || '{}'),
      executions: workflow.executions.map((e) => ({
        ...e,
        input: JSON.parse(e.input || '{}'),
        output: JSON.parse(e.output || '{}'),
        logs: JSON.parse(e.logs || '[]'),
      })),
    };
  }

  // 创建工作流
  async createWorkflow(data: WorkflowData) {
    const workflow = await prisma.workflow.create({
      data: {
        name: data.name,
        description: data.description,
        definition: JSON.stringify(data.definition || { nodes: [], edges: [] }),
        category: data.category || 'general',
        status: data.status || 'draft',
        triggerType: data.triggerType || 'manual',
        cronExpression: data.cronExpression,
        teamId: data.teamId,
        createdBy: data.createdBy,
      },
    });

    this.emit('workflow:created', { id: workflow.id, name: workflow.name });
    return { ...workflow, definition: JSON.parse(workflow.definition || '{}') };
  }

  // 更新工作流
  async updateWorkflow(id: string, data: Partial<WorkflowData>) {
    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing) return null;

    const updateData: any = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.definition !== undefined) updateData.definition = JSON.stringify(data.definition);
    if (data.category !== undefined) updateData.category = data.category;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.triggerType !== undefined) updateData.triggerType = data.triggerType;
    if (data.cronExpression !== undefined) updateData.cronExpression = data.cronExpression;
    if (data.teamId !== undefined) updateData.teamId = data.teamId;

    const workflow = await prisma.workflow.update({ where: { id }, data: updateData });

    this.emit('workflow:updated', { id: workflow.id, name: workflow.name });
    return { ...workflow, definition: JSON.parse(workflow.definition || '{}') };
  }

  // 删除工作流
  async deleteWorkflow(id: string) {
    try {
      await prisma.workflow.delete({ where: { id } });
      this.emit('workflow:deleted', { id });
      return true;
    } catch {
      return false;
    }
  }

  // 执行工作流
  async executeWorkflow(id: string, input: Record<string, unknown> = {}) {
    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) throw new Error('Workflow not found');

    const definition: WorkflowDefinition = JSON.parse(workflow.definition || '{}');
    const { nodes, edges } = definition;

    if (!nodes || nodes.length === 0) throw new Error('Workflow has no nodes');

    // 创建执行记录
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: id,
        status: 'running',
        input: JSON.stringify(input),
        output: '{}',
        logs: '[]',
        startedAt: new Date(),
      },
    });

    this.emit('workflow:execution:start', { workflowId: id, executionId: execution.id });

    const logs: WorkflowExecutionLog[] = [];
    const nodeOutputs: Record<string, Record<string, unknown>> = {};

    try {
      // 拓扑排序
      const sortedNodeIds = this.topologicalSort(nodes, edges);

      for (const nodeId of sortedNodeIds) {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) continue;

        const log: WorkflowExecutionLog = {
          nodeId: node.id,
          nodeLabel: node.label || node.id,
          status: 'running',
          input: {},
          output: {},
          startedAt: new Date().toISOString(),
        };

        try {
          // 收集上游输入
          const incomingEdges = edges.filter((e) => e.target === nodeId);
          const nodeInput: Record<string, unknown> = { ...input };
          for (const edge of incomingEdges) {
            if (nodeOutputs[edge.source]) {
              Object.assign(nodeInput, nodeOutputs[edge.source]);
            }
          }
          log.input = nodeInput;

          // 执行节点
          const output = await this.executeNode(node, nodeInput);
          nodeOutputs[nodeId] = output;
          log.output = output;
          log.status = 'success';
          log.endedAt = new Date().toISOString();
        } catch (err) {
          log.status = 'failed';
          log.error = (err as Error).message;
          log.endedAt = new Date().toISOString();
          logs.push(log);

          // 更新执行记录为失败
          await prisma.workflowExecution.update({
            where: { id: execution.id },
            data: {
              status: 'failed',
              output: JSON.stringify(nodeOutputs),
              logs: JSON.stringify(logs),
              endedAt: new Date(),
              errorMessage: log.error,
            },
          });

          this.emit('workflow:execution:failed', { workflowId: id, executionId: execution.id, error: log.error });
          throw new Error(`Node ${node.id} failed: ${log.error}`);
        }

        logs.push(log);
        this.emit('workflow:node:complete', { workflowId: id, nodeId: node.id, status: log.status });
      }

      // 找到输出节点或最后一个节点的输出作为整体输出
      const outputNodes = nodes.filter((n) => n.type === 'output');
      const finalOutput = outputNodes.length > 0
        ? outputNodes.reduce((acc, n) => ({ ...acc, ...nodeOutputs[n.id] }), {})
        : nodeOutputs[sortedNodeIds[sortedNodeIds.length - 1]] || {};

      // 更新执行记录为成功
      const updatedExecution = await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'success',
          output: JSON.stringify(finalOutput),
          logs: JSON.stringify(logs),
          endedAt: new Date(),
        },
      });

      this.emit('workflow:execution:success', { workflowId: id, executionId: execution.id });

      return {
        ...updatedExecution,
        input: JSON.parse(updatedExecution.input || '{}'),
        output: JSON.parse(updatedExecution.output || '{}'),
        logs: JSON.parse(updatedExecution.logs || '[]'),
      };
    } catch (err) {
      // 如果执行记录还没更新（比如拓扑排序失败），更新一下
      const existing = await prisma.workflowExecution.findUnique({ where: { id: execution.id } });
      if (existing && existing.status === 'running') {
        await prisma.workflowExecution.update({
          where: { id: execution.id },
          data: {
            status: 'failed',
            output: JSON.stringify(nodeOutputs),
            logs: JSON.stringify(logs),
            endedAt: new Date(),
            errorMessage: (err as Error).message,
          },
        });
      }
      throw err;
    }
  }

  // 获取执行历史
  async getExecutions(workflowId: string) {
    const executions = await prisma.workflowExecution.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'desc' },
    });
    return executions.map((e) => ({
      ...e,
      input: JSON.parse(e.input || '{}'),
      output: JSON.parse(e.output || '{}'),
      logs: JSON.parse(e.logs || '[]'),
    }));
  }

  // 获取单个执行详情
  async getExecution(executionId: string) {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
    });
    if (!execution) return null;
    return {
      ...execution,
      input: JSON.parse(execution.input || '{}'),
      output: JSON.parse(execution.output || '{}'),
      logs: JSON.parse(execution.logs || '[]'),
    };
  }

  // 拓扑排序
  private topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    const adjacency: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};

    for (const node of nodes) {
      adjacency[node.id] = [];
      inDegree[node.id] = 0;
    }

    for (const edge of edges) {
      if (adjacency[edge.source]) {
        adjacency[edge.source].push(edge.target);
        inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
      }
    }

    const queue: string[] = [];
    for (const nodeId of Object.keys(inDegree)) {
      if (inDegree[nodeId] === 0) queue.push(nodeId);
    }

    const result: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      for (const neighbor of adjacency[current] || []) {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) queue.push(neighbor);
      }
    }

    if (result.length !== nodes.length) {
      throw new Error('Workflow contains cycles or disconnected nodes');
    }

    return result;
  }

  // 执行单个节点
  private async executeNode(node: WorkflowNode, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    switch (node.type) {
      case 'llm': {
        const gateway = getGatewayService();
        const prompt = this.renderTemplate(node.userPromptTemplate || '{{input}}', input);
        const messages: Array<{ role: string; content: string }> = [];
        if (node.systemPrompt) messages.push({ role: 'system', content: node.systemPrompt });
        messages.push({ role: 'user', content: String(prompt) });

        const engineId = node.engineId || 'openai';
        const response = await gateway.chat({ engineId, messages });
        return { content: response.content, model: response.model, engineId };
      }
      case 'condition': {
        const condition = node.config?.condition as string;
        const result = this.evaluateCondition(condition, input);
        return { condition, result, input };
      }
      case 'input': {
        return { value: input };
      }
      case 'output': {
        return { output: input };
      }
      case 'tool': {
        // 工具节点：返回配置中的模拟结果
        return { toolResult: node.config?.result || {}, toolType: node.config?.toolType };
      }
      default:
        return { rawInput: input, nodeType: node.type };
    }
  }

  // 渲染模板
  private renderTemplate(template: string, context: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
      const value = context[key];
      return value !== undefined ? String(value) : '';
    });
  }

  // 评估条件（简单表达式）
  private evaluateCondition(condition: string | undefined, input: Record<string, unknown>): boolean {
    if (!condition) return true;
    // 简单支持 {{key}} == 'value' 或 {{key}} 存在性判断
    const match = condition.match(/\{\{(\w+)\}\}\s*==\s*['"](.+?)['"]/);
    if (match) {
      return String(input[match[1]]) === match[2];
    }
    const existsMatch = condition.match(/\{\{(\w+)\}\}/);
    if (existsMatch) {
      return input[existsMatch[1]] !== undefined;
    }
    return true;
  }
}

let workflowService: WorkflowService | null = null;
export function getWorkflowService(): WorkflowService {
  if (!workflowService) workflowService = new WorkflowService();
  return workflowService;
}
