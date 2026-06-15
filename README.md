# Agent Platform Starter

通用 AI Agent 管理平台脚手架 — 支持 OpenClaw / Dify / LangChain / 自定义后端。

## 一键启动

```bash
git clone https://github.com/yimeng2026/agent-platform-starter.git
cd agent-platform-starter
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

## 场景预设

| 预设 | 场景 | 启动方式 |
|-----|------|---------|
| `customer-service` | 智能客服平台 | `PRESET=customer-service npm run dev` |
| `education` | AI 教育辅导 | `PRESET=education npm run dev` |
| `dev-team` | 开发协作 | `PRESET=dev-team npm run dev` |
| `healthcare` | 健康咨询 | `PRESET=healthcare npm run dev` |

## 后端适配器

| 适配器 | 配置 |
|-------|------|
| OpenClaw | `ADAPTER_TYPE=openclaw` |
| Dify | `ADAPTER_TYPE=dify` |
| LangChain | `ADAPTER_TYPE=langchain` |
| 自定义 | `ADAPTER_TYPE=custom` |

## Docker 部署

```bash
# 带 OpenClaw Gateway
docker compose --profile openclaw up -d

# 带 Dify
docker compose --profile dify up -d

# 基础部署
docker compose up -d
```

## 推而广之

将 `src/adapters/custom.ts` 复制并修改，即可接入任何后端。
前端 28 个页面零改动。

## 技术栈

Next.js 16 · React 19 · Tailwind CSS · Prisma · SQLite · WebSocket

## 许可证

MIT
