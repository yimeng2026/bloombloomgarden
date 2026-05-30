# 🌸 千界花园 — 群智协同系统 (Thousand Realms Garden)

> 统一合并版 — 整合 Kimi + TOE Sʏʟᴠᴀ + 咨询师 + OpenClaw-5PW + Agent Ecosystem 全部产出

## 项目统计

| 指标 | 数量 |
|------|------|
| 总文件数 | 200+ |
| 后端 .ts 文件 | ~120 |
| 前端 .tsx/.ts 文件 | ~85 |
| 路由端点 | 121+ |
| LLM 适配器 | 54 (5 特殊 + 49 通用 OpenAI 兼容) |
| 前端页面 | 54 |
| shadcn/ui 组件 | 47 |
| 监控面板 | 7 |
| API 密钥 (Kimi Code) | 5 |
| 3D 生态系统平台 | 50+ |
| 桌面平台 | Windows .exe / macOS .dmg / Linux AppImage |

## 三维 Agent 生态系统

本项目内含完整的 **3D Agent 生态坐标系**，覆盖前端、后端、子工具三层：

| 轴 | 数量 | 代表平台 |
|---|------|---------|
| **X轴 (前端)** | 15 | AION UI, Open WebUI, LibreChat, Cherry Studio, Dify, n8n, Flowise 等 |
| **Y轴 (后端)** | 15 | Ollama, vLLM, llama.cpp, LocalAI, OpenRouter, TGI, MLX 等 |
| **Z轴 (子工具)** | 20 | Claude Code, Kimi CLI, Qwen Code, Aider, Goose, Cline, Continue.dev 等 |

📁 **文档位置**：`docs/agent-ecosystem/`
- `3D_Agent_Ecosystem_Coordinate_System.png` — 高清 3D 全景图
- `Agent_Ecosystem_Connections.md` — 所有连接点详细标注
- `README_Agent_Ecosystem_3D.md` — 阅读指南与方法论

## 参与者贡献

| 参与者 | 核心贡献 |
|--------|---------|
| **Kimi (指挥)** | 项目骨架、BackendRouter 54 平台、CollabFramework、认证中间件、Docker/CI/CD、E2E测试、前端骨架配置 |
| **TOE Sʏʟᴠᴀ** | 54 页面完整前端、DialogCenter 38KB、AgentCreator 62KB、KnowledgeHub 64KB、7 监控面板、Zustand 状态、蜂群策略 7 个、WebSocket 推送、Provider 桥接 |
| **咨询师** | app.ts / server.ts 入口、model.ts 6 平台路由、coordinator/handoff/intervention 路由真实化、GroupCoordinator 修复、52 测试通过 |
| **OpenClaw-5PW** | Prisma schema 11 模型、PrismaService 封装、.env / package.json 配置 |
| **TOE SYLVA (用户)** | 产品方向、API 密钥、前端 zip、需求定义、测试指令、3D Agent Ecosystem 文档 |

## 目录结构

```
thousand-realms-garden/
├── README.md                          # 本文件
├── docker-compose.yml                 # Docker 编排
├── Dockerfile                         # 后端容器
├── nginx.conf                         # Nginx 反向代理
├── .github/workflows/                 # CI/CD GitHub Actions
│
├── docs/                              # 文档
│   ├── deployment.md                  # 部署运维文档
│   └── agent-ecosystem/               # 3D Agent 生态系统
│       ├── 3D_Agent_Ecosystem_Coordinate_System.png  # 高清 3D 全景图 (2MB)
│       ├── Agent_Ecosystem_Connections.md            # 连接点详细标注
│       └── README_Agent_Ecosystem_3D.md              # 阅读指南与方法论
│
├── backend/                           # 后端 (Node.js + Express + TypeScript)
│   ├── package.json
│   ├── prisma/
│   │   └── schema.prisma              # 11 个数据模型
│   ├── src/
│   │   ├── app.ts                     # Express 入口
│   │   ├── server.ts                  # 启动脚本
│   │   ├── config/
│   │   │   ├── prisma.ts              # PrismaClient 单例
│   │   │   ├── kimi.config.json       # 5 个 Kimi Code API 密钥
│   │   │   └── providers.json         # 54 个 LLM 平台配置
│   │   ├── adapters/                  # LLM 适配器
│   │   │   ├── BaseBackendAdapter.ts
│   │   │   ├── KimiAdapter.ts         # Kimi Code (5 密钥轮询)
│   │   │   ├── OpenAIAdapter.ts
│   │   │   ├── ClaudeAdapter.ts
│   │   │   ├── DeepSeekAdapter.ts
│   │   │   ├── OllamaAdapter.ts
│   │   │   └── OpenAICompatibleAdapter.ts  # 通用适配器 (49 平台)
│   │   ├── services/                  # 业务服务层
│   │   │   ├── index.ts               # 单例入口
│   │   │   ├── AgentService.ts
│   │   │   ├── GroupService.ts
│   │   │   ├── DialogService.ts
│   │   │   ├── UnifiedAPIService.ts
│   │   │   ├── WorkspaceService.ts
│   │   │   ├── KnowledgeService.ts
│   │   │   ├── SkillService.ts
│   │   │   ├── IntegrationService.ts
│   │   │   ├── MonitorService.ts
│   │   │   ├── BlueprintService.ts
│   │   │   ├── SettingsService.ts
│   │   │   └── CollabFramework/
│   │   │       ├── index.ts           # 单例 getter
│   │   │       ├── SwarmCoordinator.ts
│   │   │       ├── HandoffProtocol.ts
│   │   │       └── InterventionService.ts
│   │   ├── routes/                    # REST API 路由
│   │   │   ├── auth.ts
│   │   │   ├── agents.ts
│   │   │   ├── groups.ts
│   │   │   ├── coordinator.ts
│   │   │   ├── handoff.ts
│   │   │   ├── intervention.ts
│   │   │   ├── dialog.ts
│   │   │   ├── unified-api.ts
│   │   │   ├── workspace.ts
│   │   │   ├── knowledge.ts
│   │   │   ├── skills.ts
│   │   │   ├── integrations.ts
│   │   │   ├── monitor.ts
│   │   │   ├── blueprints.ts
│   │   │   └── settings.ts
│   │   ├── middleware/
│   │   │   └── auth.ts                # JWT + 速率限制
│   │   └── tests/integration/
│   │       ├── collab-e2e.test.ts     # 全链路 E2E
│   │       ├── kimi-chat.test.ts      # Kimi Code 对话测试
│   │       └── group-combo.test.ts    # 群组组合测试
│
└── frontend/                          # 前端 (React 18 + Vite + Tailwind)
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx                      # 路由配置
        ├── index.css
        ├── api/client.ts                # API 客户端
        ├── lib/
        ├── types/
        ├── stores/
        ├── hooks/
        ├── components/
        │   ├── ui/                      # 47 个 shadcn/ui 组件
        │   ├── monitor/               # 7 个监控面板
        │   ├── Layout.tsx
        │   ├── Sidebar.tsx
        │   └── ...
        └── pages/                       # 54 个页面
            ├── DialogCenter.tsx
            ├── AgentCreator.tsx
            ├── KnowledgeHub.tsx
            ├── WorkspaceHub.tsx
            └── ...
```

## 快速开始

### 1. Docker 一键启动

```bash
cd thousand-realms-garden
docker-compose up -d
```

### 2. 本地开发

```bash
# 后端
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev

# 前端（新终端）
cd frontend
npm install
npm run dev
```

### 3. Electron 桌面版（双击即用）

```bash
cd electron
npm install
npm run build    # 打包 Windows .exe / macOS .dmg / Linux AppImage
```

详细构建步骤见 **[BUILD_GUIDE.md](./BUILD_GUIDE.md)**

### 4. DockerHub 镜像（一键拉取）

```bash
# 拉取已构建的镜像（推送到 zmx72/thousand-realms-garden）
docker pull zmx72/thousand-realms-garden:latest

# 运行（填上你的 API Key）
docker run -d \
  -p 3001:3001 \
  -e OPENROUTER_API_KEY=sk-or-v1-... \
  -e JWT_SECRET=your-secret \
  -v trg-data:/app/backend/data \
  --name thousand-realms-garden \
  zmx72/thousand-realms-garden:latest
```

手动推送镜像到 DockerHub：
```bash
# Linux/macOS
./dockerhub-push.sh

# Windows
.\dockerhub-push.bat
```

完整部署文档见 **[DOCKERHUB_DEPLOY.md](./DOCKERHUB_DEPLOY.md)**

### 5. GitHub 直接部署（推荐）

将代码推送到 GitHub 后，即可自动触发 CI/CD：

```bash
# 1. 在 GitHub 创建新仓库，然后：
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/thousand-realms-garden.git
git push -u origin main
```

推送后自动触发：
- **前端构建** → `.github/workflows/frontend-ci.yml`
- **后端测试 + Docker 构建** → `.github/workflows/full-cicd.yml`
- **自动部署到 Render.com**（需配置 `RENDER_DEPLOY_HOOK_URL` Secret）

#### 需要配置的 GitHub Secrets

| Secret | 说明 |
|--------|------|
| `DOCKER_USERNAME` | Docker Hub 用户名 |
| `DOCKER_PASSWORD` | Docker Hub 密码/Token |
| `RENDER_DEPLOY_HOOK_URL` | Render.com 部署 Hook URL（可选） |

#### Render.com 一键部署

1. Fork 本仓库到 GitHub
2. 登录 [Render Dashboard](https://dashboard.render.com)
3. New + → Blueprint → 选择 GitHub 仓库
4. Render 自动读取 `render.yaml` 部署
5. 免费额度：每月 750 小时

### 6. 访问

- 前端: http://localhost:3000
- 后端 API: http://localhost:3001
- Prisma Studio: http://localhost:5555

## API 模块 (15 个 / 121+ 端点)

| 模块 | 前缀 | 端点数 | 负责人 |
|------|------|--------|--------|
| 认证 | `/api/auth` | 3 | Kimi |
| Agent 管理 | `/api/agents` | 9 | Kimi |
| 群组管理 | `/api/groups` | 9 | Kimi |
| 协调器层级 | `/api/coordinator-hierarchy` | 12 | Kimi + 咨询师 |
| 交接管控 | `/api/handoff` | 10 | Kimi + 咨询师 |
| 人工干预 | `/api/intervention` | 18 | Kimi + 咨询师 |
| 对话中心 | `/api/dialog` | 6 | Kimi |
| 统一 API | `/api/unified-api` | 6 | Kimi + TOE |
| 工作空间 | `/api/workspace` | 9 | Kimi + TOE |
| 知识库 | `/api/knowledge-bases` | 8 | Kimi + TOE |
| 技能库 | `/api/skills` | 5 | Kimi + TOE |
| 外部集成 | `/api/integrations` | 6 | Kimi + TOE |
| 监控数据 | `/api/monitor` | 5 | Kimi + TOE |
| 蓝图构建器 | `/api/blueprints` | 10 | Kimi + TOE |
| 系统设置 | `/api/settings` | 6 | Kimi |

## Kimi API 密钥

5 个密钥已配置在 `backend/src/config/kimi.config.json`，支持自动轮询和故障转移：
- 429/401 时自动切换下一个密钥
- 指数退避重试: 1s → 2s → 3s
- maxRetries: 3

## 后端适配器

| Provider | 状态 | 配置 |
|---------|------|------|
| Kimi | ✅ 就绪 | 5 密钥，config 文件 |
| OpenAI | ⏳ 需 OPENAI_API_KEY | 环境变量 |
| Claude | ⏳ 需 CLAUDE_API_KEY | 环境变量 |
| DeepSeek | ⏳ 需 DEEPSEEK_API_KEY | 环境变量 |
| Ollama | ✅ 本地默认 | localhost:11434 |

## 测试

```bash
# E2E 全链路测试（使用真实 Kimi API）
npx tsx src/tests/integration/collab-e2e.test.ts
```

覆盖：API 连接、单轮对话、流式对话、战车 CRUD、匹配评分、交接协议、干预系统、多密钥轮询、自动路由、群组嵌套。

## 最新更新

- **2026-05-30**: 三份架构修正文档入仓（平台完整清单 / 分类修正 / 接口契约修改）
- **部署**: 触发 Railway 自动重构

## License

MIT
