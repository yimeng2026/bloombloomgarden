import { EventEmitter } from 'events';
import { getGatewayService, ChatRequest, ChatResponse } from './GatewayService';
import { getEngineScheduler } from './EngineScheduler';

export interface SwarmTask {
  id: string;
  roleId?: string;
  engineId?: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface SwarmResult {
  taskId: string;
  roleId?: string;
  engineId: string;
  content: string;
  latency: number;
  tokens?: number;
}

export class SwarmCoordinator extends EventEmitter {
  // 批量聊天：并行调用多个引擎，聚合结果
  async batchChat(requests: ChatRequest[]): Promise<ChatResponse[]> {
    const gateway = getGatewayService();
    this.emit('swarm:batch:start', { count: requests.length, timestamp: new Date() });

    const results = await Promise.all(
      requests.map(async (req) => {
        const start = Date.now();
        try {
          const response = await gateway.chat(req);
          this.emit('swarm:task:complete', {
            engineId: req.engineId,
            latency: Date.now() - start,
            tokens: response.usage?.totalTokens,
          });
          return response;
        } catch (err) {
          this.emit('swarm:task:error', {
            engineId: req.engineId,
            error: (err as Error).message,
          });
          throw err;
        }
      })
    );

    this.emit('swarm:batch:end', { count: results.length, timestamp: new Date() });
    return results;
  }

  // 协调蜂群执行：分配任务给多个角色/引擎，收集结果
  async coordinateSwarm(swarmId: string, task: SwarmTask[]): Promise<SwarmResult[]> {
    const scheduler = getEngineScheduler();
    const gateway = getGatewayService();

    this.emit('swarm:coordinate:start', { swarmId, taskCount: task.length });

    // 为每个任务分配引擎（如果未指定）
    const allocatedTasks = await Promise.all(
      task.map(async (t) => {
        if (t.engineId) return t;
        const engine = await scheduler.allocate({ id: t.roleId, roleType: 'custom' }, 'mixed');
        if (!engine) throw new Error(`No available engine for task ${t.id}`);
        return { ...t, engineId: engine.id };
      })
    );

    // 并行执行所有任务
    const results = await Promise.all(
      allocatedTasks.map(async (t) => {
        const start = Date.now();
        const messages: Array<{ role: string; content: string }> = [];
        if (t.systemPrompt) messages.push({ role: 'system', content: t.systemPrompt });
        messages.push({ role: 'user', content: t.prompt });

        const response = await gateway.chat({
          engineId: t.engineId!,
          messages,
          temperature: t.temperature,
          maxTokens: t.maxTokens,
        });

        const latency = Date.now() - start;
        const result: SwarmResult = {
          taskId: t.id,
          roleId: t.roleId,
          engineId: t.engineId!,
          content: response.content,
          latency,
          tokens: response.usage?.totalTokens,
        };

        this.emit('swarm:task:complete', result);
        return result;
      })
    );

    this.emit('swarm:coordinate:end', { swarmId, resultCount: results.length });
    return results;
  }

  // 结果聚合（投票、合并、排序）
  aggregateResults(results: SwarmResult[]): {
    best: SwarmResult | undefined;
    ranked: SwarmResult[];
    consensus: string | undefined;
    merged: string;
  } {
    if (results.length === 0) {
      return { best: undefined, ranked: [], consensus: undefined, merged: '' };
    }

    // 按 token 效率排序（内容长度 / tokens，越高越好）
    const ranked = [...results].sort((a, b) => {
      const scoreA = a.tokens ? a.content.length / a.tokens : a.content.length;
      const scoreB = b.tokens ? b.content.length / b.tokens : b.content.length;
      return scoreB - scoreA;
    });

    const best = ranked[0];

    // 简单共识：如果所有结果相似，取最长公共子串（这里用首句相同作为启发）
    const firstSentences = results.map((r) => r.content.split(/[。！？.!?]/)[0].trim());
    const consensus = firstSentences.every((s) => s === firstSentences[0])
      ? firstSentences[0]
      : undefined;

    // 合并所有结果
    const merged = results.map((r, i) => `--- 结果 ${i + 1} [${r.engineId}] ---\n${r.content}`).join('\n\n');

    this.emit('swarm:aggregate', { count: results.length, bestId: best.taskId, hasConsensus: !!consensus });

    return { best, ranked, consensus, merged };
  }
}

let swarmCoordinator: SwarmCoordinator | null = null;
export function getSwarmCoordinator(): SwarmCoordinator {
  if (!swarmCoordinator) swarmCoordinator = new SwarmCoordinator();
  return swarmCoordinator;
}
