import { EventEmitter } from 'events';
import type { AxisMessage, AxisMessageReply } from './coordinator/AxisMessage';

export interface KimiEndpoint {
  id: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  weight: number;
  currentLoad: number;
  avgLatency: number;
  errorRate: number;
  lastUsed: number;
  capabilities: string[];
  maxConcurrency: number;
}

export interface ClawActivity {
  timestamp: number;
  agentId: string;
  messageType: 'chat' | 'code' | 'analysis' | 'planning' | 'review';
  tokenCount: number;
  duration: number;
  success: boolean;
  modelUsed: string;
  endpointId: string;
}

export interface ActivityPattern {
  agentId: string;
  patternType: 'sequential' | 'burst' | 'long_running' | 'interactive';
  avgMessageLength: number;
  avgResponseTime: number;
  peakHours: number[];
  preferredModel: string;
  tokenUsagePattern: 'low' | 'medium' | 'high';
  codeBlockFrequency: number;
  contextWindowUsage: number;
}

export interface ClusterDecision {
  endpointId: string;
  model: string;
  temperature: 1;
  maxTokens: number;
  timeout: number;
  retryStrategy: 'immediate' | 'backoff' | 'failover';
  priority: number;
  reason: string;
}

interface KimiPayload {
  messages?: Array<{ role: string; content: unknown }>;
  message?: unknown;
  maxTokens?: number;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
  tools?: Array<Record<string, unknown>>;
  toolChoice?: 'auto' | 'required' | 'none';
  responseFormat?: Record<string, unknown>;
}

class KimiApiError extends Error {
  constructor(readonly status: number, message: string, readonly retryable: boolean) {
    super(message);
  }
}

function normalizeBaseUrl(input: string): string {
  const url = new URL(input);
  const local = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new Error(`Kimi endpoint must use HTTPS unless loopback: ${url.hostname}`);
  }
  const base = input.replace(/\/+$/, '');
  return /\/v1$/i.test(base) ? base : `${base}/v1`;
}

/** JSON nodes reference environment variable names; raw keys are never required in JSON. */
export function loadKimiEndpoints(env: NodeJS.ProcessEnv = process.env): KimiEndpoint[] {
  const nodesJson = env.KIMI_CLUSTER_NODES?.trim();
  const rawNodes: Array<Record<string, unknown>> = nodesJson ? JSON.parse(nodesJson) : [];
  if (!Array.isArray(rawNodes)) throw new Error('KIMI_CLUSTER_NODES must be a JSON array');
  const endpoints: KimiEndpoint[] = [];
  if (rawNodes.length > 0) {
    for (const [index, node] of rawNodes.entries()) {
      const apiKeyEnv = String(node.apiKeyEnv || 'KIMI_API_KEY');
      const apiKey = env[apiKeyEnv]?.trim();
      if (!apiKey) continue;
      const model = String(node.model || 'kimi-for-coding');
      if (!['kimi-for-coding', 'kimi-for-coding-highspeed'].includes(model)) {
        throw new Error(`Unsupported Kimi coding model: ${model}`);
      }
      endpoints.push({
        id: String(node.id || `kimi-${index + 1}`),
        baseUrl: normalizeBaseUrl(String(node.baseUrl || 'https://api.kimi.com/coding/v1')),
        apiKey,
        model,
        weight: Math.max(0.01, Number(node.weight) || 1),
        currentLoad: 0,
        avgLatency: 1000,
        errorRate: 0,
        lastUsed: 0,
        capabilities: Array.isArray(node.capabilities)
          ? node.capabilities.map(String)
          : ['chat', 'code', 'analysis', 'planning', 'review'],
        maxConcurrency: Math.max(1, Math.floor(Number(node.maxConcurrency) || 10)),
      });
    }
    return endpoints;
  }

  const keys = new Set<string>();
  for (const value of [env.KIMI_API_KEY, env.KIMI_CODE_API_KEY, ...(env.KIMI_API_KEYS || '').split(',')]) {
    if (value?.trim()) keys.add(value.trim());
  }
  for (let i = 1; i <= 10; i++) {
    for (const prefix of ['KIMI_API_KEY_', 'KIMI_CODE_API_KEY_']) {
      const value = env[`${prefix}${i}`]?.trim();
      if (value) keys.add(value);
    }
  }
  return [...keys].map((apiKey, index) => ({
    id: `kimi-${index + 1}`,
    baseUrl: normalizeBaseUrl(env.KIMI_BASE_URL || env.KIMI_CODE_BASE_URL || 'https://api.kimi.com/coding/v1'),
    apiKey,
    model: 'kimi-for-coding',
    weight: 1,
    currentLoad: 0,
    avgLatency: 1000,
    errorRate: 0,
    lastUsed: 0,
    capabilities: ['chat', 'code', 'analysis', 'planning', 'review'],
    maxConcurrency: 10,
  }));
}

class ActivityPatternDetector extends EventEmitter {
  private activities: ClawActivity[] = [];
  private patterns = new Map<string, ActivityPattern>();

  recordActivity(activity: ClawActivity): void {
    this.activities.push(activity);
    if (this.activities.length > 200) this.activities = this.activities.slice(-100);
    this.emit('activity', activity);
    this.analyzeAgent(activity.agentId);
  }

  private analyzeAgent(agentId: string): void {
    const activities = this.activities
      .filter(item => item.agentId === agentId)
      .sort((a, b) => a.timestamp - b.timestamp);
    if (activities.length < 3) return;
    const intervals = activities.slice(1).map((item, index) => item.timestamp - activities[index].timestamp);
    const avgInterval = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
    const avgTokens = activities.reduce((sum, item) => sum + item.tokenCount, 0) / activities.length;
    const avgResponseTime = activities.reduce((sum, item) => sum + item.duration, 0) / activities.length;
    const codeBlockFrequency = activities.filter(item => item.messageType === 'code').length / activities.length;
    let patternType: ActivityPattern['patternType'] = 'interactive';
    if (activities.length >= 10 && avgInterval < 5000) patternType = 'burst';
    else if (activities.length >= 5 && avgInterval > 300000) patternType = 'sequential';
    else if (activities.some(item => item.duration > 60000)) patternType = 'long_running';
    const modelCounts = new Map<string, number>();
    const hourCounts = new Map<number, number>();
    for (const item of activities) {
      modelCounts.set(item.modelUsed, (modelCounts.get(item.modelUsed) || 0) + 1);
      const hour = new Date(item.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }
    this.patterns.set(agentId, {
      agentId,
      patternType,
      avgMessageLength: avgTokens,
      avgResponseTime,
      peakHours: [...hourCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([hour]) => hour),
      preferredModel: [...modelCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'kimi-for-coding',
      tokenUsagePattern: avgTokens < 500 ? 'low' : avgTokens > 4000 ? 'high' : 'medium',
      codeBlockFrequency,
      contextWindowUsage: Math.max(...activities.map(item => item.tokenCount)) / 1_000_000,
    });
  }

  analyzePatterns(): void {
    for (const agentId of new Set(this.activities.map(item => item.agentId))) this.analyzeAgent(agentId);
  }

  getPattern(agentId: string): ActivityPattern | undefined {
    return this.patterns.get(agentId);
  }

  getAllPatterns(): ActivityPattern[] {
    return [...this.patterns.values()];
  }

  get activityCount(): number {
    return this.activities.length;
  }
}

class ModelParameterOptimizer {
  optimizeParameters(pattern: ActivityPattern): {
    model: string;
    temperature: 1;
    maxTokens: number;
    timeout: number;
  } {
    const model = ['kimi-for-coding', 'kimi-for-coding-highspeed'].includes(pattern.preferredModel)
      ? pattern.preferredModel
      : 'kimi-for-coding';
    return {
      model,
      temperature: 1,
      maxTokens: pattern.tokenUsagePattern === 'low' ? 2048 : pattern.tokenUsagePattern === 'high' ? 16384 : 8192,
      timeout: Math.max(30000, Math.min(120000, Math.round(pattern.avgResponseTime * 1.5))),
    };
  }

  defaults(): { model: string; temperature: 1; maxTokens: number; timeout: number } {
    return { model: 'kimi-for-coding', temperature: 1, maxTokens: 8192, timeout: 120000 };
  }
}

class KimiLoadBalancer extends EventEmitter {
  private endpoints: KimiEndpoint[];
  private circuitBreakers = new Map<string, { failures: number; lastFailure: number; open: boolean }>();
  private readonly circuitThreshold = 5;
  private readonly circuitTimeout = 60000;

  constructor(endpoints: KimiEndpoint[]) {
    super();
    this.endpoints = endpoints;
    for (const endpoint of endpoints) {
      this.circuitBreakers.set(endpoint.id, { failures: 0, lastFailure: 0, open: false });
    }
  }

  addEndpoint(endpoint: KimiEndpoint): void {
    if (this.endpoints.some(item => item.id === endpoint.id)) throw new Error(`Duplicate endpoint: ${endpoint.id}`);
    this.endpoints.push(endpoint);
    this.circuitBreakers.set(endpoint.id, { failures: 0, lastFailure: 0, open: false });
  }

  removeEndpoint(id: string): void {
    this.endpoints = this.endpoints.filter(endpoint => endpoint.id !== id);
    this.circuitBreakers.delete(id);
  }

  selectEndpoint(requirements: { model?: string; capabilities?: string[] }, excluded: string[] = []): KimiEndpoint | undefined {
    const now = Date.now();
    for (const breaker of this.circuitBreakers.values()) {
      if (breaker.open && now - breaker.lastFailure >= this.circuitTimeout) {
        breaker.open = false;
        breaker.failures = 0;
      }
    }
    const available = this.endpoints.filter(endpoint => {
      if (excluded.includes(endpoint.id)) return false;
      if (this.circuitBreakers.get(endpoint.id)?.open) return false;
      if (requirements.model && endpoint.model !== requirements.model) return false;
      return (requirements.capabilities || []).every(capability => endpoint.capabilities.includes(capability));
    });
    if (!available.length) return undefined;
    const scored = available.map(endpoint => ({
      endpoint,
      score: (1 - endpoint.currentLoad) * 0.5
        + (1 / (1 + endpoint.avgLatency / 1000)) * 0.15
        + endpoint.weight * 0.15
        + (1 - endpoint.errorRate) * 0.15
        + Math.min((now - endpoint.lastUsed) / 60000, 1) * 0.05,
    }));
    scored.sort((a, b) => b.score - a.score || a.endpoint.id.localeCompare(b.endpoint.id));
    scored[0].endpoint.lastUsed = now;
    return scored[0].endpoint;
  }

  beginRequest(id: string): void {
    const endpoint = this.endpoints.find(item => item.id === id);
    if (endpoint) endpoint.currentLoad = Math.min(1, endpoint.currentLoad + 1 / endpoint.maxConcurrency);
  }

  reportResult(endpointId: string, success: boolean, latency: number): void {
    const endpoint = this.endpoints.find(item => item.id === endpointId);
    const breaker = this.circuitBreakers.get(endpointId);
    if (!endpoint || !breaker) return;
    endpoint.currentLoad = Math.max(0, endpoint.currentLoad - 1 / endpoint.maxConcurrency);
    endpoint.avgLatency = endpoint.avgLatency * 0.7 + latency * 0.3;
    endpoint.errorRate = endpoint.errorRate * 0.9 + (success ? 0 : 0.1);
    if (success) {
      breaker.failures = 0;
    } else {
      breaker.failures += 1;
      breaker.lastFailure = Date.now();
      if (breaker.failures >= this.circuitThreshold) {
        breaker.open = true;
        this.emit('circuitOpen', { endpointId, failures: breaker.failures });
      }
    }
    this.emit('metricsUpdate', {
      endpointId,
      latency: endpoint.avgLatency,
      load: endpoint.currentLoad,
      errorRate: endpoint.errorRate,
    });
  }

  /** Internal execution view contains credentials and must never be serialized by routes. */
  getEndpoints(): KimiEndpoint[] {
    return this.endpoints;
  }

  getEndpointViews(): Array<Omit<KimiEndpoint, 'apiKey'> & { apiKeyConfigured: boolean; circuitOpen: boolean }> {
    return this.endpoints.map(endpoint => {
      const safe: Record<string, unknown> = { ...endpoint };
      delete safe.apiKey;
      return {
        ...safe,
        apiKeyConfigured: endpoint.apiKey.length > 0,
        circuitOpen: this.circuitBreakers.get(endpoint.id)?.open || false,
      } as Omit<KimiEndpoint, 'apiKey'> & { apiKeyConfigured: boolean; circuitOpen: boolean };
    });
  }
}

export class KimiClusterOrchestrator extends EventEmitter {
  private detector: ActivityPatternDetector;
  private optimizer: ModelParameterOptimizer;
  private balancer: KimiLoadBalancer;
  private isRunning = false;

  constructor(endpoints?: KimiEndpoint[]) {
    super();
    this.detector = new ActivityPatternDetector();
    this.optimizer = new ModelParameterOptimizer();
    this.balancer = new KimiLoadBalancer(endpoints || loadKimiEndpoints());
  }

  reloadEndpoints(): number {
    this.balancer = new KimiLoadBalancer(loadKimiEndpoints());
    return this.balancer.getEndpoints().length;
  }

  recordClawActivity(activity: ClawActivity): void {
    this.detector.recordActivity(activity);
  }

  makeDecision(agentId: string, taskType: string, excluded: string[] = []): ClusterDecision {
    const pattern = this.detector.getPattern(agentId);
    const optimized = pattern ? this.optimizer.optimizeParameters(pattern) : this.optimizer.defaults();
    const capabilities = ['code', 'analysis', 'planning', 'review'].includes(taskType) ? [taskType] : ['chat'];
    const endpoint = this.balancer.selectEndpoint({ model: optimized.model, capabilities }, excluded);
    if (!endpoint) throw new Error('No available Kimi endpoint with the required model/capabilities');
    return {
      endpointId: endpoint.id,
      model: optimized.model,
      temperature: 1,
      maxTokens: optimized.maxTokens,
      timeout: optimized.timeout,
      retryStrategy: endpoint.errorRate > 0.1 ? 'failover' : 'backoff',
      priority: pattern?.patternType === 'burst' ? 2 : 1,
      reason: pattern ? `Observed ${pattern.patternType} activity; fixed Kimi gateway parameters` : 'Default Kimi configuration; no activity history',
    };
  }

  private messages(payload: KimiPayload): Array<{ role: string; content: unknown }> {
    if (Array.isArray(payload.messages) && payload.messages.length) return payload.messages;
    const value = payload.message ?? payload;
    return [{ role: 'user', content: typeof value === 'string' ? value : JSON.stringify(value) }];
  }

  private estimateTokens(payload: unknown): number {
    const text = JSON.stringify(payload) || '';
    let tokens = 0;
    for (const char of text) tokens += char.charCodeAt(0) > 127 ? 1 : 0.25;
    return Math.ceil(tokens);
  }

  private retryable(error: unknown): boolean {
    if (error instanceof KimiApiError) return error.retryable;
    return error instanceof TypeError || (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name));
  }

  private async waitForRetry(attempt: number, hasNext: boolean): Promise<void> {
    if (!hasNext) return;
    const configured = Number(process.env.KIMI_RETRY_BASE_MS ?? 1000);
    const base = Number.isFinite(configured) ? Math.max(0, configured) : 1000;
    await new Promise(resolve => setTimeout(resolve, base * 2 ** attempt));
  }

  private async callKimiApi(endpoint: KimiEndpoint, decision: ClusterDecision, payload: KimiPayload): Promise<any> {
    const response = await fetch(`${endpoint.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${endpoint.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: decision.model,
        messages: this.messages(payload),
        temperature: 1,
        max_tokens: payload.maxTokens ?? decision.maxTokens,
        ...(payload.reasoningEffort ? { reasoning_effort: payload.reasoningEffort } : {}),
        ...(payload.tools?.length ? { tools: payload.tools } : {}),
        ...(payload.toolChoice ? { tool_choice: payload.toolChoice } : {}),
        ...(payload.responseFormat ? { response_format: payload.responseFormat } : {}),
        stream: false,
      }),
      signal: AbortSignal.timeout(decision.timeout),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const retryable = [401, 403, 408, 429].includes(response.status) || response.status >= 500;
      throw new KimiApiError(response.status, `Kimi API ${response.status}: ${text.slice(0, 200)}`, retryable);
    }
    const data = await response.json();
    const message = data?.choices?.[0]?.message;
    const hasContent = typeof message?.content === 'string' && message.content.trim().length > 0;
    const hasToolCalls = Array.isArray(message?.tool_calls) && message.tool_calls.length > 0;
    if (!hasContent && !hasToolCalls) {
      throw new KimiApiError(200, 'Kimi response has neither answer content nor tool calls', false);
    }
    return data;
  }

  async execute(agentId: string, taskType: string, payload: KimiPayload): Promise<any> {
    const excluded: string[] = [];
    let lastError: unknown;
    const endpointCount = this.balancer.getEndpoints().length;
    for (let attempt = 0; attempt < endpointCount; attempt++) {
      const decision = this.makeDecision(agentId, taskType, excluded);
      const endpoint = this.balancer.getEndpoints().find(item => item.id === decision.endpointId)!;
      const start = Date.now();
      this.balancer.beginRequest(endpoint.id);
      try {
        const result = await this.callKimiApi(endpoint, decision, payload);
        const usageTokens = Number(result?.usage?.total_tokens) || this.estimateTokens(payload);
        this.detector.recordActivity({
          timestamp: Date.now(), agentId, messageType: taskType as ClawActivity['messageType'],
          tokenCount: usageTokens, duration: Date.now() - start, success: true,
          modelUsed: decision.model, endpointId: endpoint.id,
        });
        this.balancer.reportResult(endpoint.id, true, Date.now() - start);
        return result;
      } catch (error) {
        this.detector.recordActivity({
          timestamp: Date.now(), agentId, messageType: taskType as ClawActivity['messageType'],
          tokenCount: this.estimateTokens(payload), duration: Date.now() - start, success: false,
          modelUsed: decision.model, endpointId: endpoint.id,
        });
        this.balancer.reportResult(endpoint.id, false, Date.now() - start);
        lastError = error;
        if (!this.retryable(error)) throw error;
        excluded.push(endpoint.id);
        await this.waitForRetry(attempt, excluded.length < endpointCount);
        if (excluded.length < endpointCount) this.emit('failover', { from: endpoint.id, agentId });
      }
    }
    throw lastError instanceof Error ? lastError : new Error('All Kimi endpoints failed');
  }

  private async streamFromEndpoint(endpoint: KimiEndpoint, decision: ClusterDecision, payload: KimiPayload, onChunk: (chunk: any) => void): Promise<number> {
    const response = await fetch(`${endpoint.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${endpoint.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: decision.model,
        messages: this.messages(payload),
        temperature: 1,
        max_tokens: payload.maxTokens ?? decision.maxTokens,
        ...(payload.reasoningEffort ? { reasoning_effort: payload.reasoningEffort } : {}),
        ...(payload.tools?.length ? { tools: payload.tools } : {}),
        ...(payload.toolChoice ? { tool_choice: payload.toolChoice } : {}),
        ...(payload.responseFormat ? { response_format: payload.responseFormat } : {}),
        stream: true,
      }),
      signal: AbortSignal.timeout(decision.timeout),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const retryable = [401, 403, 408, 429].includes(response.status) || response.status >= 500;
      throw new KimiApiError(response.status, `Kimi API ${response.status}: ${text.slice(0, 200)}`, retryable);
    }
    if (!response.body) throw new Error('Kimi stream has no response body');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let count = 0;
    try {
      while (true) {
        const read = await reader.read();
        if (read.done) break;
        buffer += decoder.decode(read.value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const raw = trimmed.slice(5).trim();
          if (!raw || raw === '[DONE]') continue;
          const parsed = JSON.parse(raw);
          const content = parsed.choices?.[0]?.delta?.content;
          if (typeof content === 'string' && content) {
            count += content.length;
            onChunk({ content, nodeId: endpoint.id });
          }
        }
      }
      if (count === 0) throw new Error('Kimi stream returned empty content');
      return count;
    } finally {
      reader.releaseLock();
    }
  }

  async executeStream(agentId: string, taskType: string, payload: KimiPayload, onChunk: (chunk: any) => void): Promise<void> {
    const excluded: string[] = [];
    let lastError: unknown;
    const endpointCount = this.balancer.getEndpoints().length;
    for (let attempt = 0; attempt < endpointCount; attempt++) {
      const decision = this.makeDecision(agentId, taskType, excluded);
      const endpoint = this.balancer.getEndpoints().find(item => item.id === decision.endpointId)!;
      const start = Date.now();
      this.balancer.beginRequest(endpoint.id);
      try {
        const tokens = await this.streamFromEndpoint(endpoint, decision, payload, onChunk);
        this.detector.recordActivity({
          timestamp: Date.now(), agentId, messageType: taskType as ClawActivity['messageType'],
          tokenCount: tokens, duration: Date.now() - start, success: true,
          modelUsed: decision.model, endpointId: endpoint.id,
        });
        this.balancer.reportResult(endpoint.id, true, Date.now() - start);
        return;
      } catch (error) {
        this.detector.recordActivity({
          timestamp: Date.now(), agentId, messageType: taskType as ClawActivity['messageType'],
          tokenCount: this.estimateTokens(payload), duration: Date.now() - start, success: false,
          modelUsed: decision.model, endpointId: endpoint.id,
        });
        this.balancer.reportResult(endpoint.id, false, Date.now() - start);
        lastError = error;
        if (!this.retryable(error)) throw error;
        excluded.push(endpoint.id);
        await this.waitForRetry(attempt, excluded.length < endpointCount);
      }
    }
    throw lastError instanceof Error ? lastError : new Error('All Kimi streams failed');
  }

  async handleRpc(msg: AxisMessage): Promise<AxisMessageReply> {
    const { action, data } = msg.payload;
    const replyData = async (): Promise<unknown> => {
      if (action === 'execute') {
        const input = data as { agentId: string; taskType: string; payload: KimiPayload };
        return this.execute(input.agentId, input.taskType, input.payload);
      }
      if (action === 'getDecision') {
        const input = data as { agentId: string; taskType: string };
        return this.makeDecision(input.agentId, input.taskType);
      }
      if (action === 'getPatterns') {
        const input = data as { agentId?: string };
        const patterns = input.agentId
          ? [this.detector.getPattern(input.agentId)].filter(Boolean)
          : this.detector.getAllPatterns();
        return { patterns };
      }
      if (action === 'getEndpoints') return { endpoints: this.balancer.getEndpointViews() };
      if (action === 'getStatus') return this.getStats();
      if (action === 'reload') return { endpoints: this.reloadEndpoints() };
      if (action === 'removeEndpoint') {
        const input = data as { endpointId: string };
        this.balancer.removeEndpoint(input.endpointId);
        return { removed: input.endpointId };
      }
      throw new Error(`Unknown action: ${action}`);
    };
    return {
      header: { ...msg.header, source: msg.header.target, target: msg.header.source },
      payload: { action: 'reply', entity: 'kimi_cluster', data: await replyData(), metadata: {} },
      trace: [...(msg.header.traceChain || []), `kimi-cluster-${action}`],
    };
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const started = Date.now();
    const endpoints = this.balancer.getEndpoints();
    if (endpoints.length === 0) return { status: 'unhealthy', latency: -1 };
    const results = await Promise.all(endpoints.map(async endpoint => {
      const start = Date.now();
      try {
        const response = await fetch(`${endpoint.baseUrl}/models`, {
          headers: { Authorization: `Bearer ${endpoint.apiKey}` },
          signal: AbortSignal.timeout(10000),
        });
        this.balancer.reportResult(endpoint.id, response.ok, Date.now() - start);
        return response.ok;
      } catch {
        this.balancer.reportResult(endpoint.id, false, Date.now() - start);
        return false;
      }
    }));
    return {
      status: results.some(Boolean) ? 'healthy' : 'unhealthy',
      latency: Date.now() - started,
    };
  }

  getStats() {
    return {
      running: this.isRunning,
      patterns: this.detector.getAllPatterns().length,
      endpoints: this.balancer.getEndpoints().length,
      activities: this.detector.activityCount,
      models: [...new Set(this.balancer.getEndpoints().map(endpoint => endpoint.model))],
      endpointDetails: this.balancer.getEndpointViews(),
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

export const kimiCluster = new KimiClusterOrchestrator();

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
    if (action !== 'executeStream') throw new Error(`Unknown stream action: ${action}`);
    const input = data as { agentId: string; taskType: string; payload: KimiPayload };
    await this.orchestrator.executeStream(input.agentId, input.taskType, input.payload, onChunk);
  }

  async handleEmit(msg: AxisMessage): Promise<void> {
    const { data } = msg.payload;
    if (data) this.orchestrator.recordClawActivity(data as ClawActivity);
  }
}
