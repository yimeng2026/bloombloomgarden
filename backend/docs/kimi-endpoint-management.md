/**
 * 千界花园 — Kimi 端点管理职责划分
 * 
 * 创建日期: 2026-06-10
 * 目的: 明确 KimiAdapter、BackendRouter、KimiClusterOrchestrator 三者的职责边界
 * 
 * ═══════════════════════════════════════════════════════════════
 * 核心原则: 单一职责，分层管理
 * ═══════════════════════════════════════════════════════════════
 * 
 * KimiAdapter        = 协议适配层（"翻译官"）
 * BackendRouter      = 路由调度层（"调度中心"）
 * KimiClusterOrchestrator = 集群智能层（"战略指挥部"）
 * 
 * ═══════════════════════════════════════════════════════════════
 * 1. KimiAdapter — 协议适配层
 * ═══════════════════════════════════════════════════════════════
 * 
 * 文件: backend/src/adapters/KimiAdapter.ts
 * 
 * 职责:
 *   - 将内部 ChatRequest 格式转换为 Kimi Code API 请求格式
 *   - 处理 Kimi Code 特有的认证头（Authorization: Bearer + User-Agent）
 *   - 管理 API Key 轮换（keyIndex 循环）
 *   - 处理流式输出（SSE 解析）
 *   - 错误重试（429/401 时自动换 Key）
 *   - 健康检查（调用 /models 端点）
 * 
 * 不职责:
 *   - 不决定使用哪个 Key（只按顺序轮换）
 *   - 不管理端点列表（只使用构造时传入的 baseUrl）
 *   - 不做负载均衡决策
 *   - 不分析活动模式
 * 
 * 接口:
 *   - chat(request: ChatRequest): Promise<ChatResponse>
 *   - chatStream(request: ChatRequest): AsyncIterable<ChatChunk>
 *   - healthCheck(): Promise<{status, latency}>
 *   - listModels(): Promise<string[]>
 * 
 * ═══════════════════════════════════════════════════════════════
 * 2. BackendRouter — 路由调度层
 * ═══════════════════════════════════════════════════════════════
 * 
 * 文件: backend/src/services/BackendRouter.ts
 * 
 * 职责:
 *   - 管理所有后端适配器的注册表（Map<string, BaseBackendAdapter>）
 *   - 初始化所有适配器（Kimi、Claude、Ollama、50+ OpenAI兼容平台）
 *   - 提供统一 chat() 和 chatStream() 入口
 *   - 健康检查轮询（每30秒）
 *   - 路由选择（routeChat: 按偏好列表尝试）
 *   - 从环境变量读取 API Key 并注入适配器
 * 
 * 不职责:
 *   - 不做智能负载均衡（只按注册顺序尝试）
 *   - 不分析 Agent 活动模式
 *   - 不管理 Kimi 特有的多实例集群
 * 
 * 接口:
 *   - chat(backendId, request): Promise<ChatResponse>
 *   - chatStream(backendId, request): AsyncIterable<ChatChunk>
 *   - routeChat(request, preferences): Promise<{backendId, response}>
 *   - listBackendsDetailed(): Promise<BackendHealth[]>
 *   - getBackend(id): BaseBackendAdapter | undefined
 * 
 * ═══════════════════════════════════════════════════════════════
 * 3. KimiClusterOrchestrator — 集群智能层
 * ═══════════════════════════════════════════════════════════════
 * 
 * 文件: backend/src/KimiClusterOrchestrator.ts
 * 
 * 职责:
 *   - 管理多个 Kimi 端点（不同 baseUrl / 不同 Key）
 *   - 活动模式检测（ActivityPatternDetector）
 *   - 负载均衡决策（LoadBalancer: 基于权重、当前负载、延迟、错误率）
 *   - 模型参数优化（ModelParameterOptimizer）
 *   - 集群协调（ClusterCoordinator）
 *   - 逆向工程：分析群聊内 Agent 行为，自动调整集群配置
 * 
 * 不职责:
 *   - 不直接调用 API（通过 BackendRouter 或 KimiAdapter）
 *   - 不管理非 Kimi 平台
 *   - 不做通用路由（只专注 Kimi 集群优化）
 * 
 * 接口:
 *   - handleRpc(message): Promise<AxisMessageReply>
 *   - addEndpoint(endpoint): void
 *   - removeEndpoint(id): void
 *   - getDecision(agentId, taskType): ClusterDecision
 *   - getStatus(): ClusterStatus
 *   - getPatterns(agentId?): ActivityPattern[]
 * 
 * ═══════════════════════════════════════════════════════════════
 * 协作流程
 * ═══════════════════════════════════════════════════════════════
 * 
 * 场景: 用户请求通过 Kimi 平台执行代码生成任务
 * 
 * 1. 前端 → /api/dialog/:agentId/chat
 *    → DialogService 构建消息上下文
 * 
 * 2. DialogService → BackendRouter.chat('kimi-code', request)
 *    → BackendRouter 查找 'kimi-code' 适配器
 *    → 找到 KimiAdapter 实例
 * 
 * 3. BackendRouter 可选: 如果启用了 Kimi 集群优化
 *    → 调用 KimiClusterOrchestrator.getDecision(agentId, 'code')
 *    → 获取推荐的端点、模型参数、温度等
 *    → 将决策结果传递给 KimiAdapter
 * 
 * 4. KimiAdapter.chat(request)
 *    → 选择当前 Key（按轮换顺序）
 *    → 发送 HTTP 请求到 Kimi Code API
 *    → 解析响应 → 返回 ChatResponse
 * 
 * 5. 如果 429/401
 *    → KimiAdapter 自动轮换到下一个 Key
 *    → 重试请求
 * 
 * 6. 后台（每30秒）
 *    → BackendRouter 对所有适配器执行 healthCheck()
 *    → KimiClusterOrchestrator 分析活动模式，更新端点权重
 * 
 * ═══════════════════════════════════════════════════════════════
 * 当前问题与修复状态
 * ═══════════════════════════════════════════════════════════════
 * 
 * ✅ 已修复 (2026-06-10):
 *   - BackendRouter 不再从 kimi.config.json 读取硬编码 Key
 *   - 改为从 KIMI_CODE_KEY_1~5 环境变量读取
 *   - KimiAdapter 的 Key 轮换机制保持不变
 * 
 * ⚠️ 待优化:
 *   - KimiClusterOrchestrator 目前通过 /api/kimi-cluster 暴露
 *   - 但 BackendRouter 未调用 KimiClusterOrchestrator 的决策
 *   - 建议: 在 BackendRouter.routeChat() 中集成 KimiClusterOrchestrator
 *     当 backendId === 'kimi-code' 时，先查询集群决策再执行
 * 
 *   - KimiClusterOrchestrator 的端点列表与 BackendRouter 的适配器列表
 *     存在数据不同步风险
 *     建议: KimiClusterOrchestrator 从 BackendRouter 同步端点信息
 *       或统一由 BackendRouter 管理所有端点配置
 */