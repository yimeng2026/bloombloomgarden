# 千界花园 v4.0 全面推进计划

**日期**: 2026-06-11
**目标**: 同时推进 GatewayService 真实调用、SSE 流式输出、前端 API 对接、SwarmCoordinator、Canvas/Workflow 服务

---

## Stage 1 — GatewayService 真实 LLM 调用 + SSE（最高优先级）

**负责人**: 主代理
**文件**:
- `backend/src/services/GatewayService.ts` — 实现真实 HTTP 调用
- `backend/src/routes/engines.ts` — SSE 路由已就绪，只需后端支持

**要点**:
1. 从 `.env` 读取 ZHIPU_API_KEY / GLM51_API_KEY_* 进行 Key 轮换
2. 根据 providers.json 中 provider 的 baseUrl、apiKeySource、extraHeaders 构建请求
3. 支持 OpenAI 兼容格式（智谱、DeepSeek、SiliconFlow 均兼容）
4. 非流式：直接 fetch 返回 JSON
5. 流式：fetch + ReadableStream 解析 SSE，逐 chunk 回调
6. 错误处理：401/403 自动切换 Key，记录到 EventLog

## Stage 2 — 前端 API 对接 v4.0

**负责人**: 子代理 B
**文件**:
- `frontend/src/api/client.ts` — 添加 v4.0 API 调用

**要点**:
1. 添加 `/frameworks` CRUD
2. 添加 `/teams` CRUD + execute + intervene
3. 添加 `/roles` CRUD
4. 添加 `/engines` CRUD + chat + allocate
5. 添加 `/engines/:id/chat` SSE 流式调用

## Stage 3 — SwarmCoordinator + Canvas/Workflow 服务

**负责人**: 子代理 C
**文件**:
- `backend/src/services/SwarmCoordinator.ts` — 新建
- `backend/src/services/CanvasService.ts` — 新建
- `backend/src/services/WorkflowService.ts` — 新建
- `backend/src/routes/swarm.ts` — 新建
- `backend/src/routes/canvas.ts` — 新建
- `backend/src/routes/workflows.ts` — 新建（或增强现有）

**要点**:
1. SwarmCoordinator: 跨引擎批量调用、结果聚合、故障转移
2. CanvasService: 画布 CRUD + 版本历史
3. WorkflowService: 工作流定义 + 执行引擎

## Stage 4 — 集成验证

**负责人**: 主代理
1. 重启后端服务
2. 测试所有新 API
3. 更新工作记录

---

## 并行策略

- Stage 1 和 Stage 2 可完全并行（前后端独立）
- Stage 3 可独立并行
- Stage 4 依赖 Stage 1+2+3 完成
