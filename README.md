# 🌸 BloomBloomGarden - AI 蜂群协作平台

多 Agent 蜂群协作编排平台，支持 7 种蜂群协作机制、画布可视化编排、人工干预面板。

## 🚀 快速开始

```bash
# 安装依赖
bun install

# 初始化数据库
bun run db:push

# 启动开发服务器
bun run dev
```

打开 http://localhost:3000

## 🐝 7 种蜂群协作机制

| 机制 | 说明 |
|------|------|
| 🐝 基础蜂群 | 按编排模式顺序执行 |
| 🐜 信号觅食 | Agent 通过信息素自主发现任务 |
| 👑 层级委派 | Leader 分配任务给 Worker |
| 🔧 流水线 | 顺序处理，每步输出→下步输入 |
| 🤝 共识机制 | 所有 Agent 必须达成一致 |
| ⚔️ 红蓝对抗 | 两队对立辩论 |
| 🎓 导师学徒 | 资深 Agent 指导新手 |

## 🧑‍💼 4 种人工干预模式

| 模式 | 说明 |
|------|------|
| 👁️ 观察 | 自动运行，人工旁观 |
| ✅ 审批 | 关键决策需人工批准 |
| 🎮 副驾驶 | 人工可随时注入指令 |
| 🛑 否决权 | 人工可否决 Agent 输出 |

## 📊 功能模块

- **仪表盘** - 实时统计、Agent 状态热力图
- **Agent 管理** - 一键创建、API Key 自动检测供应商
- **群组管理** - 蜂群机制 + 人工干预组合
- **画布视图** - 可视化编排、拖拽移动、连线
- **聊天界面** - 单 Agent / 群组协作聊天

## 🛠️ 技术栈

- Next.js 16 + TypeScript + Tailwind CSS 4
- Prisma ORM + SQLite (LibSQL)
- z-ai-web-dev-sdk (LLM 集成)
- 支持 13+ LLM 供应商

## 🚢 部署

### Railway

项目已包含 `railway.toml` 和 `nixpacks.toml` 配置，直接连接 GitHub 仓库即可部署。

需要设置环境变量：
- `DATABASE_URL` - 数据库连接字符串

### Docker

```bash
docker build -t bloombloomgarden .
docker run -p 3000:3000 -e DATABASE_URL=file:./db/custom.db bloombloomgarden
```

## 📁 项目结构

```
src/
├── app/
│   ├── page.tsx          # 主界面（5个Tab视图）
│   └── api/
│       ├── agents/       # Agent CRUD
│       ├── groups/       # 群组 CRUD
│       ├── workflows/    # 工作流 CRUD
│       ├── conversations/# 对话 CRUD
│       └── chat/
│           ├── route.ts  # 单 Agent 聊天
│           └── group/    # 群组蜂群聊天
├── lib/
│   ├── platforms.ts      # 平台注册表
│   └── prisma.ts         # 数据库客户端
prisma/
└── schema.prisma         # 数据模型
```
