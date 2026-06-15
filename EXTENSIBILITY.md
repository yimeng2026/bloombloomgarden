# BloomGarden 推而广之指南

## 核心架构模式

BloomGarden 不仅是一个 OpenClaw 管理面板，更是一个**通用 AI Agent 编排平台架构**。以下层均可独立复制到其他项目中。

---

## 六层架构

| 层 | 功能 | 可复制场景 | 关键文件 |
|---|------|----------|---------|
| **Agent 编排层** | 智能体创建、管理、协作组 | 任何多 Agent 系统 | `/app/agents/*`, `/app/groups/*` |
| **通道集成层** | 20+ 聊天平台统一接入 | 客服机器人、社群运营 | `/app/channels/*`, `schema.prisma#Channel` |
| **工作流编排层** | 可视化节点流程 | 自动化 RPA、内容流水线 | `/app/workflows/*`, `/app/canvas/*` |
| **知识管理层** | 向量知识库 + 文档 | 企业知识中台、客服 FAQ | `/app/knowledge/*`, `schema.prisma#KnowledgeBase` |
| **监控运维层** | 系统状态 + 成本 + Cron | 任何 LLM 应用运维 | `/app/monitor/*`, `/app/costs/*`, `/app/cron/*` |
| **插件扩展层** | 技能市场 + 插件管理 | 低代码扩展平台 | `/app/plugins/*`, `schema.prisma#Plugin` |

---

## 复制到任意 Agent 框架

### 仅需替换后端适配器

```
BloomGarden
├── Frontend (Next.js + Tailwind) ← 零改动
├── API Routes (/api/*) ← 零改动
├── Prisma Schema ← 零改动
└── Backend Adapter (替换此处)
    ├── OpenClaw ← 当前
    ├── AutoGPT ← 替换 adapter
    ├── MetaGPT ← 替换 adapter
    ├── CrewAI ← 替换 adapter
    └── Dify ← 替换 adapter
```

### 后端适配器接口

任何后端只需实现以下 REST API：

| 端点 | 功能 | 响应格式 |
|-----|------|---------|
| `GET /api/agents` | 列出所有 Agent | `{ id, name, status, model, ... }[]` |
| `POST /api/agents` | 创建 Agent | `{ id }` |
| `GET /api/groups` | 列出协作组 | `{ id, name, members[] }[]` |
| `GET /api/chat` | SSE 流式对话 | `text/event-stream` |
| `GET /api/channels` | 通道状态 | `{ id, name, status }[]` |
| `GET /api/tasks` | 任务列表 | `{ id, name, status, progress }[]` |
| `GET /api/workflows` | 工作流 | `{ id, name, nodes[], edges[] }` |
| `GET /api/costs` | 成本统计 | `{ records[], alerts[] }` |
| `GET /api/cron` | 定时任务 | `{ id, name, schedule, status }[]` |

**前端完全不需要改动。** 只需将 API 调用指向新的后端即可。

---

## 快速复制到 Vercel

```bash
# 1. Fork 仓库
git clone https://github.com/yimeng2026/bloombloomgarden.git

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 DATABASE_URL 和 API Keys

# 4. 推送数据库
npm run db:push

# 5. 构建
npm run build

# 6. 部署到 Vercel
vercel --prod
```

---

## 数据库模型独立复用

`prisma/schema.prisma` 中的 17 个模型可以独立使用：

- `Agent` + `AgentGroup` → 多智能体协作系统
- `Channel` → 任何 IM 平台接入层
- `Plugin` + `Skill` → 技能市场
- `Workflow` + `WorkflowNode` + `WorkflowEdge` → 可视化流程编排
- `KnowledgeBase` + `KnowledgeDoc` → 向量知识库管理
- `CostRecord` + `CostAlert` → LLM 成本监控
- `CronJob` → 定时任务调度
- `Task` → 任务看板
- `WorkspaceFile` + `MemoryFile` → 文件/记忆管理

---

## 技术栈

- **前端**: Next.js 16 · React 19 · Tailwind CSS · Lucide React
- **后端**: Next.js API Routes · Prisma · SQLite (Turso)
- **实时**: WebSocket (ws) + Server-Sent Events fallback
- **部署**: Vercel · Docker · Railway

---

## 许可证

MIT — 可自由复制、修改、商用。

## 链接

- GitHub: https://github.com/yimeng2026/bloombloomgarden
- OpenClaw: https://github.com/openclaw/openclaw
- ChatClaw: https://github.com/fastclaw-ai/chatclaw
- ClawPanel: https://github.com/zhaoxinyi02/ClawPanel
