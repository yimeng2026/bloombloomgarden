/**
 * KimiClusterOrchestrator.ts — KIMI集群逆向工程核心模块
 * 
 * 功能：分析群聊内 claw/agent 活动模式，逆向编排 KIMI 多实例集群
 * - ActivityPatternDetector: 检测 agent 行为模式
 * - ModelParameterOptimizer: 逆向优化模型参数
 * - LoadBalancer: 多实例负载均衡
 * - ClusterCoordinator: 集群协调器
 */

import { EventEmitter } from 'events';
import type { AxisMessage, AxisMessageReply } from './coordinator/AxisMessage';
// Fallback: if module resolution fails, define inline
// @ts-ignore

// ========== 类型定义 ==========

interface KimiEndpoint {
  id: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  weight: number;        // 负载权重
  currentLoad: number;    // 当前负载 0-1
  avgLatency: number;     // 平均延迟 ms
  errorRate: number;      // 错误率
  lastUsed: number;       // 时间戳
  capabilities: string[]; // 支持的能力
}

interface ActivityPattern {
  agentId: string;
  patternType: 'sequential' | 'burst' | 'long_running' | 'interactive';
  avgMessageLength: number;
  avgResponseTime: number;
  peakHours: number[];
  preferredModel: string;
  tokenUsagePattern: 'low' | 'medium' | 'high';
  codeBlockFrequency: number; // 代码块出现频率
  contextWindowUsage: number; // 上下文窗口使用率
}

interface ClusterDecision {
  endpointId: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  retryStrategy: 'immediate' | 'backoff' | 'failover';
  priority: number;
  reason: string;
}

interface ClawActivity {
  timestamp: number;
  agentId: string;
  messageType: 'chat' | 'code' | 'analysis' | 'planning' | 'review';
  tokenCount: number;
  duration: number;
  success: boolean;
  modelUsed: string;
  endpointId: string;
}

// ========== 活动模式检测器 ==========

class ActivityPatternDetector extends EventEmitter {
  private activities: ClawActivity[] = [];
  private patterns: Map<string, ActivityPattern> = new Map();
  private readonly windowSize = 100; // 滑动窗口大小
  private readonly analysisInterval = 60000; // 1分钟分析一次

  constructor() {
    super();
    setInterval(() => this.analyzePatterns(), this.analysisInterval);
  }

  recordActivity(activity: ClawActivity): void {
    this.activities.push(activity);
    if (this.activities.length > this.windowSize * 2) {
      this.activities = this.activities.slice(-this.windowSize);
    }
    this.emit('activity', activity);
  }

  private analyzePatterns(): void {
    const agentActivities = this.groupByAgent(this.activities);
    
    for (const [agentId, activities] of agentActivities) {
      if (activities.length < 5) continue;

      const pattern = this.inferPattern(agentId, activities);
      const oldPattern = this.patterns.get(agentId);
      
      if (this.hasPatternChanged(oldPattern, pattern)) {
        this.patterns.set(agentId, pattern);
        this.emit('patternChange', { agentId, pattern, oldPattern });
      }
    }
  }

  private groupByAgent(activities: ClawActivity[]): Map<string, ClawActivity[]> {
    const map = new Map<string, ClawActivity[]>();
    for (const a of activities) {
      const list = map.get(a.agentId) || [];
      list.push(a);
      map.set(a.agentId, list);
    }
    return map;
  }

  private inferPattern(agentId: string, activities: ClawActivity[]): ActivityPattern {
    const msgLengths = activities.map(a => a.tokenCount);
    const responseTimes = activities.map(a => a.duration);
    const hours = activities.map(a => new Date(a.timestamp).getHours());
    
    // 计算消息间隔分布
    const intervals: number[] = [];
    for (let i = 1; i < activities.length; i++) {
      intervals.push(activities[i].timestamp - activities[i - 1].timestamp);
    }
    const avgInterval = intervals.length > 0 
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
      : 0;

    // 推断模式类型
    let patternType: ActivityPattern['patternType'] = 'interactive';
    if (avgInterval < 5000 && activities.length > 10) {
      patternType = 'burst'; // 突发模式
    } else if (avgInterval > 300000) {
      patternType = 'sequential'; // 顺序模式
    } else if (responseTimes.some(t => t > 60000)) {
      patternType = 'long_running'; // 长运行模式
    }

    // 推断 token 使用模式
    const avgTokens = msgLengths.reduce((a, b) => a + b, 0) / msgLengths.length;
    let tokenUsagePattern: ActivityPattern['tokenUsagePattern'] = 'medium';
    if (avgTokens < 500) tokenUsagePattern = 'low';
    else if (avgTokens > 4000) tokenUsagePattern = 'high';

    // 代码块频率
    const codeActivities = activities.filter(a => a.messageType === 'code');
    const codeBlockFrequency = codeActivities.length / activities.length;

    // 上下文窗口使用率（基于 token 数估算）
    const maxTokens = Math.max(...msgLengths);
    const contextWindowUsage = maxTokens / 128000; // 假设 128k 窗口

    // 峰值小时
    const hourCounts = new Map<number, number>();
    for (const h of hours) {
      hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
    }
    const peakHours = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([h]) => h);

    // 推断偏好模型
    const modelCounts = new Map<string, number>();
    for (const a of activities) {
      modelCounts.set(a.modelUsed, (modelCounts.get(a.modelUsed) || 0) + 1);
    }
    const preferredModel = Array.from(modelCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'moonshot-v1-8k';

    return {
      agentId,
      patternType,
      avgMessageLength: avgTokens,
      avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      peakHours,
      preferredModel,
      tokenUsagePattern,
      codeBlockFrequency,
      contextWindowUsage,
    };
  }

  private hasPatternChanged(old: ActivityPattern | undefined, current: ActivityPattern): boolean {
    if (!old) return true;
    return old.patternType !== current.patternType
      || old.preferredModel !== current.preferredModel
      || old.tokenUsagePattern !== current.tokenUsagePattern
      || Math.abs(old.codeBlockFrequency - current.codeBlockFrequency) > 0.2;
  }

  getPattern(agentId: string): ActivityPattern | undefined {
    return this.patterns.get(agentId);
  }

  getAllPatterns(): ActivityPattern[] {
    return Array.from(this.patterns.values());
  }
}

// ========== 模型参数逆向优化器 ==========

class ModelParameterOptimizer {
  private modelProfiles: Map<string, ModelProfile> = new Map();

  constructor() {
    this.initProfiles();
  }

  private initProfiles(): void {
    // 基于逆向分析得出的最优参数配置
    this.modelProfiles.set('moonshot-v1-8k', {
      defaultTemp: 0.7,
      codeTemp: 0.2,
      creativeTemp: 0.9,
      maxTokens: 8192,
      contextWindow: 8192,
      strengths: ['chat', 'code', 'analysis'],
      weaknesses: ['long_context', 'creative_writing'],
    });
    this.modelProfiles.set('moonshot-v1-32k', {
      defaultTemp: 0.7,
      codeTemp: 0.2,
      creativeTemp: 0.9,
      maxTokens: 32768,
      contextWindow: 32768,
      strengths: ['long_context', 'document_analysis', 'multi_step'],
      weaknesses: ['quick_chat'],
    });
    this.modelProfiles.set('moonshot-v1-128k', {
      defaultTemp: 0.7,
      codeTemp: 0.2,
      creativeTemp: 0.9,
      maxTokens: 128000,
      contextWindow: 128000,
      strengths: ['very_long_context', 'knowledge_base', 'summarization'],
      weaknesses: ['cost_sensitive'],
    });
  }

  optimizeParameters(pattern: ActivityPattern, taskType: string): {
    model: string;
    temperature: number;
    maxTokens: number;
    timeout: number;
  } {
    const profile = this.modelProfiles.get(pattern.preferredModel) || this.modelProfiles.get('moonshot-v1-8k')!;
    
    // 根据任务类型选择温度
    let temperature = profile.defaultTemp;
    if (taskType === 'code' || taskType === 'review') {
      temperature = profile.codeTemp;
    } else if (taskType === 'creative' || taskType === 'planning') {
      temperature = profile.creativeTemp;
    }

    // 根据 token 使用模式调整 maxTokens
    let maxTokens = profile.maxTokens;
    if (pattern.tokenUsagePattern === 'low') {
      maxTokens = Math.min(maxTokens, 2048);
    } else if (pattern.tokenUsagePattern === 'high') {
      maxTokens = profile.maxTokens; // 使用完整窗口
    }

    // 根据平均响应时间调整超时
    const timeout = Math.max(30000, pattern.avgResponseTime * 1.5);

    // 如果代码块频率高，选择支持代码的模型
    let model = pattern.preferredModel;
    if (pattern.codeBlockFrequency > 0.5 && !profile.strengths.includes('code')) {
      model = 'moonshot-v1-8k'; // 切换到代码优化模型
    }

    // 如果上下文使用率高，升级模型
    if (pattern.contextWindowUsage > 0.7) {
      if (model === 'moonshot-v1-8k') model = 'moonshot-v1-32k';
      else if (model === 'moonshot-v1-32k') model = 'moonshot-v1-128k';
    }

    return { model, temperature, maxTokens, timeout };
  }

  recommendModel(taskType: string, contextLength: number): string {
    if (contextLength > 30000) return 'moonshot-v1-128k';
    if (contextLength > 6000) return 'moonshot-v1-32k';
    if (taskType === 'code') return 'moonshot-v1-8k';
    return 'moonshot-v1-8k';
  }
}

interface ModelProfile {
  defaultTemp: number;
  codeTemp: number;
  creativeTemp: number;
  maxTokens: number;
  contextWindow: number;
  strengths: string[];
  weaknesses: string[];
}

// ========== 多实例负载均衡器 ==========

class KimiLoadBalancer extends EventEmitter {
  private endpoints: KimiEndpoint[] = [];
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; open: boolean }> = new Map();
  private readonly circuitThreshold = 5;
  private readonly circuitTimeout = 60000;

  constructor(endpoints: KimiEndpoint[]) {
    super();
    this.endpoints = endpoints;
    for (const ep of endpoints) {
      this.circuitBreakers.set(ep.id, { failures: 0, lastFailure: 0, open: false });
    }
  }

  addEndpoint(endpoint: KimiEndpoint): void {
    this.endpoints.push(endpoint);
    this.circuitBreakers.set(endpoint.id, { failures: 0, lastFailure: 0, open: false });
  }

  removeEndpoint(id: string): void {
    this.endpoints = this.endpoints.filter(ep => ep.id !== id);
    this.circuitBreakers.delete(id);
  }

  selectEndpoint(requirements: {
    model?: string;
    priority?: number;
    capabilities?: string[];
  }): KimiEndpoint | undefined {
    const now = Date.now();
    
    // 检查熔断器状态
    for (const [id, breaker] of this.circuitBreakers) {
      if (breaker.open && now - breaker.lastFailure > this.circuitTimeout) {
        breaker.open = false;
        breaker.failures = 0;
      }
    }

    // 筛选可用节点
    let available = this.endpoints.filter(ep => {
      const breaker = this.circuitBreakers.get(ep.id);
      if (!breaker || breaker.open) return false;
      if (requirements.model && !ep.model.includes(requirements.model)) return false;
      if (requirements.capabilities) {
        return requirements.capabilities.every(c => ep.capabilities.includes(c));
      }
      return true;
    });

    if (available.length === 0) {
      // 所有节点都熔断，强制使用错误率最低的
      available = this.endpoints.filter(ep => {
        if (requirements.model && !ep.model.includes(requirements.model)) return false;
        return true;
      }).sort((a, b) => a.errorRate - b.errorRate);
    }

    if (available.length === 0) return undefined;

    // 加权轮询 + 延迟感知
    const scores = available.map(ep => {
      const loadScore = 1 - ep.currentLoad;
      const latencyScore = 1 / (1 + ep.avgLatency / 1000);
      const weightScore = ep.weight;
      const freshnessScore = Math.min((now - ep.lastUsed) / 60000, 1); // 1分钟内未使用的加分
      
      return {
        endpoint: ep,
        score: loadScore * 0.4 + latencyScore * 0.3 + weightScore * 0.2 + freshnessScore * 0.1,
      };
    });

    scores.sort((a, b) => b.score - a.score);
    const selected = scores[0].endpoint;
    selected.lastUsed = now;
    
    return selected;
  }

  reportResult(endpointId: string, success: boolean, latency: number): void {
    const ep = this.endpoints.find(e => e.id === endpointId);
    if (!ep) return;

    // 更新延迟（指数移动平均）
    ep.avgLatency = ep.avgLatency * 0.7 + latency * 0.3;
    
    const breaker = this.circuitBreakers.get(endpointId)!;
    
    if (success) {
      ep.currentLoad = Math.max(0, ep.currentLoad - 0.1);
      breaker.failures = Math.max(0, breaker.failures - 1);
    } else {
      ep.currentLoad = Math.min(1, ep.currentLoad + 0.2);
      breaker.failures++;
      breaker.lastFailure = Date.now();
      ep.errorRate = ep.errorRate * 0.9 + 0.1;
      
      if (breaker.failures >= this.circuitThreshold) {
        breaker.open = true;
        this.emit('circuitOpen', { endpointId, failures: breaker.failures });
      }
    }

    this.emit('metricsUpdate', { endpointId, latency: ep.avgLatency, load: ep.currentLoad, errorRate: ep.errorRate });
  }

  getEndpoints(): KimiEndpoint[] {
    return this.endpoints.map(ep => ({ ...ep }));
  }
}

// ========== 集群协调器（主入口） ==========

export class KimiClusterOrchestrator extends EventEmitter {
  private detector: ActivityPatternDetector;
  private optimizer: ModelParameterOptimizer;
  private balancer: KimiLoadBalancer;
  private isRunning = false;

  constructor(endpoints?: KimiEndpoint[]) {
    super();
    this.detector = new ActivityPatternDetector();
    this.optimizer = new ModelParameterOptimizer();
    this.balancer = new KimiLoadBalancer(endpoints || this.getDefaultEndpoints());

    // 监听模式变化，自动调整集群
    this.detector.on('patternChange', ({ agentId, pattern }) => {
      this.emit('optimization', { agentId, pattern, decision: this.makeDecision(agentId, 'chat') });
    });
  }

  private getDefaultEndpoints(): KimiEndpoint[] {
    // 从配置读取，默认5个KIMI端点
    const keys = (process.env.KIMI_API_KEYS || '').split(',').filter(Boolean);
    return keys.map((key, i) => ({
      id: `kimi-${i + 1}`,
      baseUrl: 'https://api.kimi.com/coding/v1',
      apiKey: key.trim(),
      model: 'moonshot-v1-128k',
      weight: 1,
      currentLoad: 0,
      avgLatency: 1000,
      errorRate: 0,
      lastUsed: 0,
      capabilities: ['chat', 'code', 'analysis', 'long_context'],
    }));
  }

  // 记录一次 claw 活动
  recordClawActivity(activity: ClawActivity): void {
    this.detector.recordActivity(activity);
    this.balancer.reportResult(activity.endpointId, activity.success, activity.duration);
  }

  // 为指定 agent 的任务做集群决策
  makeDecision(agentId: string, taskType: string): ClusterDecision {
    const pattern = this.detector.getPattern(agentId);
    
    let optimizedParams;
    if (pattern) {
      optimizedParams = this.optimizer.optimizeParameters(pattern, taskType);
    } else {
      optimizedParams = {
        model: 'moonshot-v1-8k',
        temperature: 0.7,
        maxTokens: 8192,
        timeout: 30000,
      };
    }

    const requirements = {
      model: optimizedParams.model,
      capabilities: taskType === 'code' ? ['code'] : ['chat'],
    };

    const endpoint = this.balancer.selectEndpoint(requirements);
    
    if (!endpoint) {
      throw new Error('No available KIMI endpoint');
    }

    return {
      endpointId: endpoint.id,
      model: optimizedParams.model,
      temperature: optimizedParams.temperature,
      maxTokens: optimizedParams.maxTokens,
      timeout: optimizedParams.timeout,
      retryStrategy: endpoint.errorRate > 0.1 ? 'failover' : 'backoff',
      priority: pattern?.patternType === 'burst' ? 2 : 1,
      reason: pattern 
        ? `基于${pattern.patternType}模式优化: 模型=${optimizedParams.model}, 温度=${optimizedParams.temperature}`
        : '默认配置（暂无活动数据）',
    };
  }

  // 执行带集群优化的 KIMI 调用
  async execute(agentId: string, taskType: string, payload: any): Promise<any> {
    const decision = this.makeDecision(agentId, taskType);
    const endpoint = this.balancer.getEndpoints().find(ep => ep.id === decision.endpointId);
    
    if (!endpoint) {
      throw new Error(`Endpoint ${decision.endpointId} not found`);
    }

    const startTime = Date.now();
    
    try {
      // 这里调用实际的 KIMI API
      const result = await this.callKimiApi(endpoint, decision, payload);
      
      this.recordClawActivity({
        timestamp: Date.now(),
        agentId,
        messageType: taskType as any,
        tokenCount: this.estimateTokens(payload),
        duration: Date.now() - startTime,
        success: true,
        modelUsed: decision.model,
        endpointId: endpoint.id,
      });

      return result;
    } catch (err) {
      this.recordClawActivity({
        timestamp: Date.now(),
        agentId,
        messageType: taskType as any,
        tokenCount: this.estimateTokens(payload),
        duration: Date.now() - startTime,
        success: false,
        modelUsed: decision.model,
        endpointId: endpoint.id,
      });

      // 熔断触发时自动 failover
      if (decision.retryStrategy === 'failover') {
        const fallback = this.balancer.selectEndpoint({ model: decision.model });
        if (fallback && fallback.id !== endpoint.id) {
          this.emit('failover', { from: endpoint.id, to: fallback.id, agentId });
          return this.callKimiApi(fallback, { ...decision, endpointId: fallback.id }, payload);
        }
      }

      throw err;
    }
  }

  private async callKimiApi(endpoint: KimiEndpoint, decision: ClusterDecision, payload: any): Promise<any> {
    const response = await fetch(`${endpoint.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${endpoint.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'claude-code/0.7.8',
        'x-request-id': `req-${Date.now()}`,
      },
      body: JSON.stringify({
        model: decision.model,
        messages: payload.messages || [{ role: 'user', content: payload.message || payload }],
        temperature: decision.temperature,
        max_tokens: decision.maxTokens,
        stream: payload.stream || false,
      }),
    });

    if (!response.ok) {
      throw new Error(`KIMI API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const msg = data.choices?.[0]?.message || {};
    const raw = data._raw || data;
    // Kimi Code API 返回 content + reasoning_content 双字段，需要合并
    if (msg.reasoning_content && !data._raw) {
      data._raw = { ...msg };
      msg.content = (msg.content || '') + msg.reasoning_content;
    }
    return data;
  }

  private estimateTokens(payload: any): number {
    const text = JSON.stringify(payload);
    // 粗略估算：中文字符 ≈ 1 token，英文 ≈ 0.25 token
    let tokens = 0;
    for (const char of text) {
      tokens += char.charCodeAt(0) > 127 ? 1 : 0.25;
    }
    return Math.ceil(tokens);
  }

  // 3DACP 接口：作为 module handler 注册
  async handleRpc(msg: AxisMessage): Promise<AxisMessageReply> {
    const { action, data } = msg.payload;
    
    switch (action) {
      case 'execute': {
        const { agentId, taskType, payload } = data as any;
        const result = await this.execute(agentId, taskType, payload);
        return {
          header: { ...msg.header, source: msg.header.target, target: msg.header.source },
          payload: { action: 'reply', entity: 'kimi_cluster', data: result, metadata: {} },
          trace: [...(msg.header.traceChain || []), 'kimi-cluster-execute'],
        };
      }
      
      case 'getDecision': {
        const { agentId, taskType } = data as any;
        const decision = this.makeDecision(agentId, taskType);
        return {
          header: { ...msg.header, source: msg.header.target, target: msg.header.source },
          payload: { action: 'reply', entity: 'kimi_cluster', data: decision, metadata: {} },
          trace: [...(msg.header.traceChain || []), 'kimi-cluster-decision'],
        };
      }
      
      case 'getPatterns': {
        const patterns = this.detector.getAllPatterns();
        return {
          header: { ...msg.header, source: msg.header.target, target: msg.header.source },
          payload: { action: 'reply', entity: 'kimi_cluster', data: { patterns }, metadata: {} },
          trace: [...(msg.header.traceChain || []), 'kimi-cluster-patterns'],
        };
      }
      
      case 'getEndpoints': {
        const endpoints = this.balancer.getEndpoints();
        return {
          header: { ...msg.header, source: msg.header.target, target: msg.header.source },
          payload: { action: 'reply', entity: 'kimi_cluster', data: { endpoints }, metadata: {} },
          trace: [...(msg.header.traceChain || []), 'kimi-cluster-endpoints'],
        };
      }
      
      case 'addEndpoint': {
        const endpoint = data as KimiEndpoint;
        this.balancer.addEndpoint(endpoint);
        return {
          header: { ...msg.header, source: msg.header.target, target: msg.header.source },
          payload: { action: 'reply', entity: 'kimi_cluster', data: { success: true }, metadata: {} },
          trace: [...(msg.header.traceChain || []), 'kimi-cluster-add'],
        };
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  getStats() {
    return {
      patterns: this.detector.getAllPatterns().length,
      endpoints: this.balancer.getEndpoints().length,
      activities: 0, // 可从 detector 获取
    };
  }

  start(): void {
    this.isRunning = true;
    this.emit('started');
  }

  stop(): void {
    this.isRunning = false;
    this.emit('stopped');
  }
}

// 导出单例
export const kimiCluster = new KimiClusterOrchestrator();

// Module Handler 适配器（接入 3DACP）
export class KimiClusterModuleHandler {
  private orchestrator: KimiClusterOrchestrator;

  constructor(orchestrator?: KimiClusterOrchestrator) {
    this.orchestrator = orchestrator || kimiCluster;
  }

  async handleRpc(msg: AxisMessage): Promise<AxisMessageReply> {
    return this.orchestrator.handleRpc(msg);
  }

  async handleStream(msg: AxisMessage, onChunk: (chunk: any) => void): Promise<void> {
    const { action, data } = msg.payload;
    if (action === 'executeStream') {
      const { agentId, taskType, payload } = data as any;
      const decision = this.orchestrator.makeDecision(agentId, taskType);
      const endpoint = this.orchestrator['balancer'].getEndpoints().find(ep => ep.id === decision.endpointId);
      
      if (!endpoint) throw new Error('No endpoint');

      const response = await fetch(`${endpoint.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${endpoint.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'claude-code/0.7.8',
          'x-request-id': `req-${Date.now()}`,
        },
        body: JSON.stringify({
          model: decision.model,
          messages: payload.messages || [{ role: 'user', content: payload.message || payload }],
          temperature: decision.temperature,
          max_tokens: decision.maxTokens,
          stream: true,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = new TextDecoder().decode(value);
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta || {};
              const content = (delta.content || '') + (delta.reasoning_content || '');
              if (content) {
                onChunk({ content, nodeId: agentId });
              }
            } catch {}
          }
        }
      }
    }
  }

  async handleEmit(msg: AxisMessage): Promise<void> {
    // 单向通知，记录活动即可
    const { data } = msg.payload;
    if (data) {
      this.orchestrator.recordClawActivity(data as ClawActivity);
    }
  }
}
