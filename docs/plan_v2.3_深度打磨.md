# 千界花园 v2.3 — 深度打磨计划

## 目标
1. 具体选项引导 — 每个功能都有明确的选项卡片
2. 对话框精心打磨 — 完整上下文、流式输出、协议可视化
3. 后端可视化 — 服务状态、API调用链路、协议桥接
4. Push到 https://github.com/yimeng2026/bloombloomgarden

## 整合策略
基于现有仓库 bloombloomgarden（已有40+页面、完整后端），增量添加：

### 新增文件
- `frontend/src/api/llmApi.ts` — 通用LLM API客户端（前端直连）
- `frontend/src/api/protocolMatrix.ts` — 协议×平台×API三维矩阵
- `frontend/src/pages/ProtocolAdmin.tsx` — 协议矩阵可视化（新页面）

### 重写文件
- `frontend/src/pages/TaskDetail.tsx` — 深度打磨对话（流式+上下文+协议路由）
- `frontend/src/pages/Dashboard.tsx` — 添加引导选项
- `frontend/src/pages/AgentCreator.tsx` — 添加具体选项引导

### 修改文件
- `frontend/src/main.tsx` — 添加默认API初始化
- `frontend/src/App.tsx` — 添加新路由

## Push步骤
1. 整合所有文件到existing-repo
2. git add + commit
3. git push origin main
