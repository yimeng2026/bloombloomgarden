# 前端重构设计文档

## 目标
吸收新前端（bloombloomgarden）的简洁明了 + 旧前端（sylva_platform）的界面和全面功能

## 架构
- Next.js 16 App Router（保留）
- Tailwind CSS v4（保留）
- 文件拆分：从单文件 ~800 行 → 组件化但保持简洁

## 页面结构（App Router）
```
src/app/
  page.tsx           → Dashboard（丰富化）
  agents/page.tsx    → Agent 管理（吸收旧前端 Agents）
  groups/page.tsx    → 群组/协作（吸收旧前端 AgentCollab + SwarmPanel）
  canvas/page.tsx    → 画布编排
  chat/page.tsx      → 聊天
  layout.tsx         → 共享布局（Sidebar + Header）
  api/               → 保持现有

src/components/
  layout/
    Sidebar.tsx      → 左侧导航（吸收旧前端设计）
    Header.tsx       → 顶部栏
  dashboard/
    StatsCard.tsx    → 统计卡片（旧前端风格）
    ActivityFeed.tsx → 活动流
    HealthScore.tsx  → 系统健康度
    ProviderStatus.tsx → Provider 状态
    ResourceUsage.tsx → 资源使用
  agents/
    AgentCard.tsx    → Agent 卡片
    AgentGrid.tsx    → Agent 网格
    CreateAgentModal.tsx → 创建弹窗
  groups/
    GroupCard.tsx    → 群组卡片（旧前端植物风格）
    GroupGrid.tsx    → 群组网格
    SwarmPanel.tsx   → 蜂群面板（节点/任务/拓扑）
    CreateGroupWizard.tsx → 4步创建向导
    TemplateCard.tsx → 模板卡片
  canvas/
    CanvasView.tsx   → 画布视图
  chat/
    ChatView.tsx     → 聊天视图
    ConversationList.tsx → 对话列表
    MessageBubble.tsx → 消息气泡
  ui/                → 共享 UI 组件
```

## 设计系统
- 配色：吸收旧前端的 sage 绿色系 + 新前端的 purple 紫色系
- 卡片：白色背景 + 圆角 + 阴影
- 动画：CSS transitions + 简单动画（不引入 Framer Motion 减少依赖）
- 图标：Lucide React（旧前端）+ Emoji（新前端）混合

## 核心功能
1. Dashboard：统计卡片、活动流、健康度、Provider状态、资源使用、快速操作
2. Agents：列表、创建、管理
3. Groups：协作组、蜂群面板、4步创建向导、模板市场
4. Canvas：画布编排（保持新前端）
5. Chat：聊天（保持新前端）

## 实施计划
1. 创建共享 Layout（Sidebar + Header）
2. 重构 Dashboard（丰富化）
3. 重构 Agents 页面
4. 重构 Groups 页面（吸收 SwarmPanel + AgentCollab）
5. 重构 Canvas 页面
6. 重构 Chat 页面
7. 测试和部署
