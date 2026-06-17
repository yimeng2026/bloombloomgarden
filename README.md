# 🐝 BloomBloomGarden — AI Agent 群智协同平台

> 多 Agent 蜂群协作系统，支持 7 种蜂群模式 + 4 级人工干预 + 10 大 LLM 供应商

## ✨ 核心功能

### 🤖 Agent 管理
- 创建/编辑/删除 AI Agent
- 支持 10 大 LLM 供应商（智谱、OpenAI、Anthropic、DeepSeek 等）
- 角色模板一键创建（项目经理、调研助手、量化交易员等）
- API Key 自动检测供应商

### 👥 群组蜂群协作
- **7 种蜂群模式**：基础蜂群、信号传递、层级委派、流水线、共识机制、红蓝对抗、导师学徒
- **4 级人工干预**：观察模式、审批模式、副驾驶模式、否决模式
- 群组嵌套（子群组）
- 实时流式聊天

### 💬 对话系统
- 单 Agent 对话
- 群组蜂群聊天
- 对话历史持久化
- 流式输出（SSE）

### 🎨 画布视图
- Agent/群组关系可视化
- 拖拽布局
- 连线展示

### 📊 仪表盘
- Agent/群组统计
- 平台分布
- 角色分布
- 蜂群模式/人工干预级别选择

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| Next.js 16 | 全栈框架（App Router） |
| TypeScript | 类型安全 |
| Prisma | ORM（SQLite） |
| Tailwind CSS | 样式 |
| Bun | 运行时 & 包管理 |

## 🚀 部署

### Railway（推荐）
```bash
# railway.toml 和 railpack.json 已配置好
# 直接连接 GitHub 仓库即可部署
```

### Docker
```bash
docker build -t bloombloomgarden .
docker run -p 3000:3000 bloombloomgarden
```

### 本地开发
```bash
bun install
bun run postinstall    # 生成 Prisma Client
bun run dev            # 启动开发服务器
```

## 📁 项目结构

```
├── src/
│   ├── app/
│   │   ├── page.tsx              # 主页面（仪表盘+Agent+画布+聊天）
│   │   ├── api/
│   │   │   ├── agents/           # Agent CRUD API
│   │   │   ├── groups/           # 群组 CRUD API
│   │   │   ├── workflows/        # 工作流 CRUD API
│   │   │   ├── conversations/    # 对话 CRUD API
│   │   │   └── chat/             # 聊天 API（SSE 流式）
│   │   └── layout.tsx
│   └── lib/
│       ├── platforms.ts          # 平台注册表（LLM/角色/技能/频道）
│       └── prisma.ts             # Prisma Client 单例
├── prisma/
│   └── schema.prisma             # 数据库 Schema
├── railpack.json                 # Railpack 构建配置
├── railway.toml                  # Railway 部署配置
├── Dockerfile                    # Docker 构建配置
└── .env.example                  # 环境变量模板
```

## 🔑 环境变量

复制 `.env.example` 为 `.env` 并填写：

```bash
DATABASE_URL=file:./dev.db
ZHIPU_API_KEY=your-key-here
```

## 📄 License

MIT
