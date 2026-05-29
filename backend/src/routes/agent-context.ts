/**
 * agent-context.ts — Agent 上下文查询 API
 * 对接前端 AgentContextPanel 组件
 */

import { Router } from 'express';

const router = Router();

// Mock 上下文数据（按 agentId 返回不同数据）
const MOCK_CONTEXTS: Record<string, any> = {
  'agent-001': {
    agentId: 'agent-001',
    agentName: '架构师-Alpha',
    role: 'system_architect',
    systemPrompt: `你是千界花园的系统架构师，负责：
1. 评估技术方案的可行性与扩展性
2. 审查代码架构是否符合3DACP协议规范
3. 为多Agent协作提供技术约束与建议
4. 识别潜在的性能瓶颈与安全风险

工作原则：
- 优先考虑协议兼容性（3DACP AxisMessage规范）
- 所有设计必须支持XYZ三轴自由连接
- 性能指标：P99延迟 < 200ms，并发支持 10k+ agents`,
    messages: [
      { role: 'user', content: '设计一个支持万级Agent并发的心跳检测机制', timestamp: '2026-05-28 10:00:23' },
      { role: 'assistant', content: '基于3DACP协议，我建议采用分层心跳设计：\n1. L1 - 本地AgentManager每5秒ping\n2. L2 - 区域Coordinator每30秒聚合上报\n3. L3 - 全局Registry每120秒全量扫描\n\n超时策略：\n- L1: 15秒无响应标记suspect\n- L2: 60秒无响应触发rebalance\n- L3: 300秒无响应执行自动清理', timestamp: '2026-05-28 10:00:45' },
      { role: 'tool', content: '', timestamp: '2026-05-28 10:00:46', toolCall: 'registry_query' },
    ],
    toolCalls: [
      { name: 'registry_query', input: { pattern: 'heartbeat_*' }, output: { nodes: 156 }, status: 'success' },
      { name: 'load_test_simulate', input: { agents: 10000, duration: 60 }, status: 'pending' },
    ],
    knowledgeRefs: [
      { id: 'kb-42', title: '3DACP协议规范 v2.1', relevance: 0.98 },
      { id: 'kb-87', title: '微服务心跳设计模式', relevance: 0.85 },
      { id: 'kb-15', title: '分布式系统超时策略', relevance: 0.72 },
    ],
    tokenUsage: { used: 3847, limit: 8192 },
  },
  'agent-002': {
    agentId: 'agent-002',
    agentName: '开发工程师-Beta',
    role: 'developer',
    systemPrompt: `你是全栈开发工程师。开发原则：
1. 遵循3DACP协议规范编写所有服务代码
2. 使用TypeScript严格模式，零any类型
3. 单元测试覆盖率>80%，关键路径>95%
4. 代码审查 checklist：类型安全/错误处理/性能/安全`,
    messages: [
      { role: 'user', content: '帮我写一个 AgentContextPanel 的后端 API', timestamp: '2026-05-28 14:30:00' },
      { role: 'assistant', content: '好的，我来设计这个API端点...', timestamp: '2026-05-28 14:30:15' },
    ],
    toolCalls: [
      { name: 'code_generator', input: { language: 'typescript', framework: 'express' }, output: { files: ['agent-context.ts'] }, status: 'success' },
    ],
    knowledgeRefs: [
      { id: 'kb-33', title: 'Express.js 路由最佳实践', relevance: 0.91 },
    ],
    tokenUsage: { used: 2156, limit: 8192 },
  },
  'agent-dev-03': {
    agentId: 'agent-dev-03',
    agentName: '开发工程师-Beta',
    role: 'developer',
    systemPrompt: `你是全栈开发工程师...`,
    messages: [
      { role: 'system', content: '开发工程师-Beta 在分析循环依赖时卡住，已自动请求人工接管', timestamp: '2026-05-28 15:32:18' },
      { role: 'agent', content: '我发现模块A依赖模块B，模块B依赖模块C，模块C又依赖模块A...我需要人类帮助判断这是否是设计缺陷还是正常的循环引用。', timestamp: '2026-05-28 15:32:20' },
      { role: 'instruction', content: '[人类指导] 检查是否是接口层依赖而非实现层依赖。如果是接口层循环，这是可接受的；如果是实现层循环，需要重构。', timestamp: '2026-05-28 15:33:05' },
    ],
    toolCalls: [
      { name: 'dependency_analyzer', input: { module: 'core' }, output: { cycles: 3 }, status: 'success' },
    ],
    knowledgeRefs: [
      { id: 'kb-55', title: '循环依赖检测与重构策略', relevance: 0.95 },
    ],
    tokenUsage: { used: 7621, limit: 8192 },
  },
};

// GET /api/agents/:id/context
router.get('/:id/context', (req, res) => {
  const { id } = req.params;
  const context = MOCK_CONTEXTS[id] || {
    agentId: id,
    agentName: `Agent-${id.slice(-4)}`,
    role: 'unknown',
    systemPrompt: '暂无系统提示配置',
    messages: [],
    toolCalls: [],
    knowledgeRefs: [],
    tokenUsage: { used: 0, limit: 8192 },
  };

  res.json({
    success: true,
    data: context,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/agents/:id/context/stream — SSE 实时推送
router.get('/:id/context/stream', (req, res) => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // 发送初始数据
  const context = MOCK_CONTEXTS[id];
  if (context) {
    res.write(`data: ${JSON.stringify({ type: 'init', data: context })}\n\n`);
  }

  // 模拟实时更新
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
      tokenUsage: context?.tokenUsage || { used: Math.floor(Math.random() * 4000), limit: 8192 },
    })}\n\n`);
  }, 5000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

export default router;
