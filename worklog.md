---
Task ID: 1
Agent: Main Agent
Task: 构建 BloomBloomGarden AI Agent 平台 - 完整的 Agent 创建与聊天功能

Work Log:
- 初始化 Next.js 16 项目（TypeScript + Tailwind CSS 4 + App Router）
- 安装 Prisma、z-ai-web-dev-sdk、uuid 等依赖
- 设计并创建数据库 Schema（Agent、Conversation、Message 三表）
- 运行 Prisma 迁移，生成 SQLite 数据库
- 实现后端 API：
  - /api/agents - Agent CRUD（GET/POST）
  - /api/agents/[id] - Agent 单个操作（GET/PUT/DELETE）
  - /api/conversations - 对话管理（GET/POST）
  - /api/conversations/[id] - 对话详情和删除（GET/DELETE）
  - /api/chat - 流式聊天 API（SSE 格式，使用 z-ai-web-dev-sdk）
- 实现前端完整界面：
  - 左侧 Agent 列表侧栏（创建/编辑/删除）
  - 中间对话历史列表
  - 右侧聊天主区域（消息展示 + 流式响应 + 输入框）
  - 创建/编辑 Agent 弹窗（名称、描述、头像、系统提示词、模型、温度）
  - 欢迎页和空状态提示
- 修复 ESLint 错误，确保代码质量

Stage Summary:
- 完整的 AI Agent 平台已构建完成
- 支持：创建 Agent → 设置系统提示词 → 打开对话 → 流式聊天
- 技术栈：Next.js 16 + Prisma v7 + SQLite(libsql) + z-ai-web-dev-sdk + Tailwind CSS 4
- 项目路径：/home/z/my-project/
- 已验证：API 创建 Agent、创建对话、流式聊天均正常工作
- 修复了 Prisma v7 适配器模式（使用 @prisma/adapter-libsql）
- 修复了 z-ai-web-dev-sdk 流式响应解析（原始 SSE ReadableStream 解析）
