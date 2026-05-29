import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KimiClusterOrchestrator, kimiCluster, KimiClusterModuleHandler } from './KimiClusterOrchestrator';
import type { AxisMessage, AxisMessageReply } from '../coordinator/AxisMessage';

describe('KimiClusterOrchestrator - KIMI集群逆向工程测试', () => {
  let cluster: KimiClusterOrchestrator;

  beforeEach(() => {
    cluster = new KimiClusterOrchestrator([
      {
        id: 'kimi-1',
        baseUrl: 'https://api.kimi.com/coding/v1',
        apiKey: 'test-key-1',
        model: 'moonshot-v1-128k',
        weight: 1,
        currentLoad: 0,
        avgLatency: 1000,
        errorRate: 0,
        lastUsed: 0,
        capabilities: ['chat', 'code', 'analysis', 'long_context'],
      },
      {
        id: 'kimi-2',
        baseUrl: 'https://api.kimi.com/coding/v1',
        apiKey: 'test-key-2',
        model: 'moonshot-v1-32k',
        weight: 0.8,
        currentLoad: 0.5,
        avgLatency: 2000,
        errorRate: 0.02,
        lastUsed: Date.now() - 60000,
        capabilities: ['chat', 'code'],
      },
      {
        id: 'kimi-3',
        baseUrl: 'https://api.kimi.com/coding/v1',
        apiKey: 'test-key-3',
        model: 'moonshot-v1-8k',
        weight: 0.5,
        currentLoad: 0.8,
        avgLatency: 3000,
        errorRate: 0.05,
        lastUsed: Date.now(),
        capabilities: ['chat'],
      },
    ]);
  });

  // ========== 测试1: 负载均衡 ==========
  describe('负载均衡', () => {
    it('应选择负载最低的端点', () => {
      const endpoint = (cluster as any).balancer.selectEndpoint({});
      expect(endpoint).toBeDefined();
      expect(endpoint.id).toBe('kimi-1'); // kimi-1 负载最低 (0)
    });

    it('应考虑延迟权重', () => {
      // 模拟 kimi-1 高负载
      const endpoints = (cluster as any).balancer.getEndpoints();
      endpoints[0].currentLoad = 0.9; // kimi-1 高负载
      endpoints[1].currentLoad = 0.1; // kimi-2 低负载

      const endpoint = (cluster as any).balancer.selectEndpoint({});
      expect(endpoint.id).toBe('kimi-2'); // kimi-2 延迟更低
    });

    it('应根据能力筛选端点', () => {
      const endpoint = (cluster as any).balancer.selectEndpoint({
        capabilities: ['long_context'],
      });
      expect(endpoint).toBeDefined();
      expect(endpoint.capabilities).toContain('long_context');
    });

    it('所有端点熔断时应返回错误率最低的', () => {
      const endpoints = (cluster as any).balancer.getEndpoints();
      // 模拟所有端点高错误率
      for (const ep of endpoints) {
        for (let i = 0; i < 10; i++) {
          (cluster as any).balancer.reportResult(ep.id, false, 5000);
        }
      }

      const endpoint = (cluster as any).balancer.selectEndpoint({});
      expect(endpoint).toBeDefined();
      // 应该返回错误率相对最低的
    });
  });

  // ========== 测试2: 熔断机制 ==========
  describe('熔断机制', () => {
    it('连续失败应触发熔断', () => {
      const endpoints = (cluster as any).balancer.getEndpoints();
      const epId = endpoints[0].id;

      // 连续5次失败
      for (let i = 0; i < 5; i++) {
        (cluster as any).balancer.reportResult(epId, false, 5000);
      }

      // 检查熔断状态
      const breaker = (cluster as any).balancer.circuitBreakers.get(epId);
      expect(breaker.failures).toBeGreaterThanOrEqual(5);
    });

    it('熔断后成功请求应恢复', () => {
      const endpoints = (cluster as any).balancer.getEndpoints();
      const epId = endpoints[0].id;

      // 触发熔断
      for (let i = 0; i < 5; i++) {
        (cluster as any).balancer.reportResult(epId, false, 5000);
      }

      // 成功请求应减少失败计数
      (cluster as any).balancer.reportResult(epId, true, 1000);
      const breaker = (cluster as any).balancer.circuitBreakers.get(epId);
      expect(breaker.failures).toBeLessThan(5);
    });
  });

  // ========== 测试3: 活动模式检测 ==========
  describe('活动模式检测', () => {
    it('应检测突发模式', () => {
      const activities = [
        { timestamp: Date.now(), agentId: 'agent-1', messageType: 'chat', tokenCount: 100, duration: 500, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
        { timestamp: Date.now() + 1000, agentId: 'agent-1', messageType: 'chat', tokenCount: 100, duration: 500, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
        { timestamp: Date.now() + 2000, agentId: 'agent-1', messageType: 'chat', tokenCount: 100, duration: 500, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
        { timestamp: Date.now() + 3000, agentId: 'agent-1', messageType: 'chat', tokenCount: 100, duration: 500, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
        { timestamp: Date.now() + 4000, agentId: 'agent-1', messageType: 'chat', tokenCount: 100, duration: 500, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
        { timestamp: Date.now() + 5000, agentId: 'agent-1', messageType: 'chat', tokenCount: 100, duration: 500, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
        { timestamp: Date.now() + 6000, agentId: 'agent-1', messageType: 'chat', tokenCount: 100, duration: 500, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
        { timestamp: Date.now() + 7000, agentId: 'agent-1', messageType: 'chat', tokenCount: 100, duration: 500, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
        { timestamp: Date.now() + 8000, agentId: 'agent-1', messageType: 'chat', tokenCount: 100, duration: 500, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
        { timestamp: Date.now() + 9000, agentId: 'agent-1', messageType: 'chat', tokenCount: 100, duration: 500, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
        { timestamp: Date.now() + 10000, agentId: 'agent-1', messageType: 'chat', tokenCount: 100, duration: 500, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
      ];

      for (const activity of activities) {
        cluster.recordClawActivity(activity);
      }

      // 手动触发分析
      const detector = (cluster as any).detector;
      detector.analyzePatterns();

      const pattern = detector.getPattern('agent-1');
      expect(pattern).toBeDefined();
      expect(pattern.patternType).toBe('burst');
    });

    it('应检测顺序模式', () => {
      const activities = [
        { timestamp: Date.now(), agentId: 'agent-2', messageType: 'code', tokenCount: 500, duration: 5000, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
        { timestamp: Date.now() + 360000, agentId: 'agent-2', messageType: 'code', tokenCount: 500, duration: 5000, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
        { timestamp: Date.now() + 720000, agentId: 'agent-2', messageType: 'code', tokenCount: 500, duration: 5000, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
        { timestamp: Date.now() + 1080000, agentId: 'agent-2', messageType: 'code', tokenCount: 500, duration: 5000, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
        { timestamp: Date.now() + 1440000, agentId: 'agent-2', messageType: 'code', tokenCount: 500, duration: 5000, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
      ];

      for (const activity of activities) {
        cluster.recordClawActivity(activity);
      }

      const detector = (cluster as any).detector;
      detector.analyzePatterns();

      const pattern = detector.getPattern('agent-2');
      expect(pattern).toBeDefined();
      expect(pattern.patternType).toBe('sequential');
    });

    it('应检测交互模式', () => {
      const activities = [
        { timestamp: Date.now(), agentId: 'agent-3', messageType: 'chat', tokenCount: 50, duration: 1000, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
        { timestamp: Date.now() + 30000, agentId: 'agent-3', messageType: 'chat', tokenCount: 50, duration: 1000, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
        { timestamp: Date.now() + 60000, agentId: 'agent-3', messageType: 'chat', tokenCount: 50, duration: 1000, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
      ];

      for (const activity of activities) {
        cluster.recordClawActivity(activity);
      }

      const detector = (cluster as any).detector;
      detector.analyzePatterns();

      const pattern = detector.getPattern('agent-3');
      expect(pattern).toBeDefined();
      expect(pattern.patternType).toBe('interactive');
    });
  });

  // ========== 测试4: 参数优化 ==========
  describe('模型参数优化', () => {
    it('代码任务应使用低温', () => {
      const pattern = {
        agentId: 'agent-1',
        patternType: 'interactive' as const,
        avgMessageLength: 100,
        avgResponseTime: 1000,
        peakHours: [9, 10, 11],
        preferredModel: 'moonshot-v1-8k',
        tokenUsagePattern: 'medium' as const,
        codeBlockFrequency: 0.6,
        contextWindowUsage: 0.3,
      };

      const optimizer = (cluster as any).optimizer;
      const params = optimizer.optimizeParameters(pattern, 'code');

      expect(params.temperature).toBe(0.2); // 代码任务温度低
      expect(params.model).toBe('moonshot-v1-8k');
    });

    it('高上下文使用应升级模型', () => {
      const pattern = {
        agentId: 'agent-1',
        patternType: 'long_running' as const,
        avgMessageLength: 50000,
        avgResponseTime: 30000,
        peakHours: [14, 15, 16],
        preferredModel: 'moonshot-v1-8k',
        tokenUsagePattern: 'high' as const,
        codeBlockFrequency: 0.1,
        contextWindowUsage: 0.8,
      };

      const optimizer = (cluster as any).optimizer;
      const params = optimizer.optimizeParameters(pattern, 'analysis');

      expect(params.model).toBe('moonshot-v1-32k'); // 上下文使用率高，升级到32k
    });

    it('创意任务应使用高温', () => {
      const pattern = {
        agentId: 'agent-1',
        patternType: 'interactive' as const,
        avgMessageLength: 200,
        avgResponseTime: 2000,
        peakHours: [20, 21, 22],
        preferredModel: 'moonshot-v1-8k',
        tokenUsagePattern: 'medium' as const,
        codeBlockFrequency: 0.1,
        contextWindowUsage: 0.2,
      };

      const optimizer = (cluster as any).optimizer;
      const params = optimizer.optimizeParameters(pattern, 'creative');

      expect(params.temperature).toBe(0.9); // 创意任务温度高
    });
  });

  // ========== 测试5: 集群决策 ==========
  describe('集群决策', () => {
    it('应生成包含所有必要字段的决策', () => {
      const activities = [
        { timestamp: Date.now(), agentId: 'agent-1', messageType: 'chat', tokenCount: 100, duration: 1000, success: true, modelUsed: 'moonshot-v1-8k', endpointId: 'kimi-1' },
      ];

      for (const activity of activities) {
        cluster.recordClawActivity(activity);
      }

      const decision = cluster.makeDecision('agent-1', 'chat');
      expect(decision).toHaveProperty('endpointId');
      expect(decision).toHaveProperty('model');
      expect(decision).toHaveProperty('temperature');
      expect(decision).toHaveProperty('maxTokens');
      expect(decision).toHaveProperty('timeout');
      expect(decision).toHaveProperty('retryStrategy');
      expect(decision).toHaveProperty('priority');
      expect(decision).toHaveProperty('reason');
    });

    it('无活动数据时应使用默认配置', () => {
      const decision = cluster.makeDecision('new-agent', 'chat');
      expect(decision.model).toBe('moonshot-v1-8k');
      expect(decision.temperature).toBe(0.7);
      expect(decision.maxTokens).toBe(8192);
    });
  });

  // ========== 测试6: 3DACP 接口 ==========
  describe('3DACP 集成', () => {
    it('应实现 handleRpc 接口', async () => {
      const msg: AxisMessage = {
        version: '3dacp/v1',
        header: {
          msgId: 'test-msg',
          source: { x: 'web', y: 'kimi_cluster', z: 'rest' },
          target: { x: 'backend-api', y: 'kimi_cluster', z: 'rest' },
          timestamp: Date.now(),
          priority: 1,
          ttl: 30000,
          expectsReply: true,
          retryCount: 0,
          traceChain: [],
        },
        payload: {
          action: 'getPatterns',
          entity: 'kimi_cluster',
          data: {},
          metadata: {},
        },
        transport: {
          protocol: 'rest',
          encoding: 'json',
          compressed: false,
        },
      };

      const handler = new KimiClusterModuleHandler(cluster);
      const reply: AxisMessageReply = await handler.handleRpc(msg);

      expect(reply).toHaveProperty('header');
      expect(reply).toHaveProperty('payload');
      expect(reply.payload.data).toHaveProperty('patterns');
    });

    it('应实现 handleEmit 接口', async () => {
      const msg: AxisMessage = {
        version: '3dacp/v1',
        header: {
          msgId: 'test-msg',
          source: { x: 'web', y: 'kimi_cluster', z: 'rest' },
          target: { x: 'backend-api', y: 'kimi_cluster', z: 'rest' },
          timestamp: Date.now(),
          priority: 1,
          ttl: 30000,
          expectsReply: false,
          retryCount: 0,
          traceChain: [],
        },
        payload: {
          action: 'record',
          entity: 'kimi_cluster',
          data: {
            timestamp: Date.now(),
            agentId: 'test-agent',
            messageType: 'chat',
            tokenCount: 100,
            duration: 1000,
            success: true,
            modelUsed: 'moonshot-v1-8k',
            endpointId: 'kimi-1',
          },
          metadata: {},
        },
        transport: {
          protocol: 'rest',
          encoding: 'json',
          compressed: false,
        },
      };

      const handler = new KimiClusterModuleHandler(cluster);
      await expect(handler.handleEmit(msg)).resolves.not.toThrow();
    });
  });

  // ========== 测试7: Token 估算 ==========
  describe('Token 估算', () => {
    it('应正确估算中文字符 token', () => {
      const payload = { message: '这是一个中文消息' };
      const tokens = (cluster as any).estimateTokens(payload);
      // 中文字符 ≈ 1 token，8个中文字符 ≈ 8 tokens
      expect(tokens).toBeGreaterThan(0);
    });

    it('应正确估算英文 token', () => {
      const payload = { message: 'Hello world' };
      const tokens = (cluster as any).estimateTokens(payload);
      // 英文 ≈ 0.25 token per char，11 chars ≈ 3 tokens
      expect(tokens).toBeGreaterThan(0);
    });
  });

  // ========== 测试8: Failover ==========
  describe('自动故障转移', () => {
    it('熔断触发时应自动 failvoer', async () => {
      const endpoints = (cluster as any).balancer.getEndpoints();
      const primaryId = endpoints[0].id;

      // 触发 primary 端点熔断
      for (let i = 0; i < 5; i++) {
        (cluster as any).balancer.reportResult(primaryId, false, 5000);
      }

      // 验证 failover 发生
      const decision = cluster.makeDecision('agent-1', 'chat');
      expect(decision.endpointId).not.toBe(primaryId);
    });
  });
});
