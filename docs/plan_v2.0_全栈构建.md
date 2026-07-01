# 千界花园 v2.0 — 全栈构建计划

## 终极目标
打造"大模型的大模型"——一键开公司平台。以协议种类为区分，统一MCP/ACP/OGP/OpenAI API等协议，
实现协议相同则线性连接、协议不同则并行连接的智能化Agent编排系统。

## 核心架构（修正XYZ轴）

### 以协议种类为区分的新坐标系

| 维度 | 定义 | 协议族 |
|------|------|--------|
| **协议层** | 连接协议分类 | MCP族、ACP族、OGP族、OpenAI API兼容、本地IPC |
| **X轴** | 交互界面层 | Web UI、CLI、IDE插件、API端点 |
| **Y轴** | 模型推理层 | 50+ LLM Provider（Cloud/Local/Gateway） |
| **Z轴** | Agent执行层 | CLI Agent、Skills、Tools、MCP Servers |

### 连接模式
- **线性连接**：协议相同的直连（如MCP→MCP）
- **并行连接**：协议不同但目标相同的并发连接
- **混合连接**：通过协议桥接适配器连接
- **智能编排**：系统自动选择最优连接方式

### 协作模式（统一协议化）
1. 顺序执行（Sequential）
2. 并行执行（Parallel）
3. 层级结构（Hierarchical）
4. 动态重组（Dynamic）
5. 人机回环（Human-in-the-loop）
6. 分治合并（Divide & Conquer）

### 访问分级
- **免费公开**：无需认证的API/工具
- **API获取**：需要API Key的云服务
- **本地安装**：需要本地部署的平台
- **权限付费**：需要付费授权的服务

## 技术栈

### 后端
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Express 4 + WebSocket
- **Database**: SQLite + Prisma ORM
- **API**: REST + WebSocket + SSE
- **Auth**: JWT + API Key + Rate Limiting

### 前端
- **Framework**: React 19 + TypeScript
- **Build**: Vite 7.2.4
- **Style**: Tailwind CSS 3.4.19 + shadcn/ui
- **State**: Zustand
- **Animation**: Framer Motion
- **Charts**: Recharts

## 五大核心模块

### 1. 花园总览（Dashboard）
- 系统状态、实时图表、活动流
- 已连接Agent/平台/协议统计

### 2. 智能体工坊（Agent Workshop）
- Agent创建（两种模式）
- 群组管理（无限嵌套）
- 协作模式选择

### 3. 任务与对话中心（Task & Dialog Hub）
- 完整上下文聊天
- 工作文件管理
- 任务保护机制
- 人工干预

### 4. 协议与平台管理（Protocol & Platform Admin）
- 协议族管理（MCP/ACP/OGP/OpenAI）
- 50+ LLM Provider管理
- Agent工具管理
- 外部集成管理
- 知识库管理

### 5. 系统中枢（System Core）
- 设置
- 安全
- 备份

## 执行阶段

### Stage 1: 后端核心服务（已完成架构设计）
- [x] Prisma Schema定义
- [x] Provider配置系统
- [x] KimiClusterOrchestrator编排器
- [x] 认证中间件
- [ ] 补充缺失的services目录
- [ ] 创建Express服务器
- [ ] API路由层

### Stage 2: 前端完整重构
- [ ] 共享组件（Layout/Navbar/Sidebar）
- [ ] 五大模块页面
- [ ] API集成
- [ ] WebSocket实时通信

### Stage 3: 集成与部署
- [ ] 前后端联调
- [ ] 构建部署
- [ ] 长期有效地址

## 项目文件结构
```
千界花园/
├── backend/                    # Node.js后端
│   ├── src/
│   │   ├── server.ts           # Express入口
│   │   ├── routes/             # API路由
│   │   ├── services/           # 核心服务
│   │   ├── coordinator/        # 3DACP协调器
│   │   ├── config/             # 配置
│   │   └── middleware/         # 中间件
│   ├── prisma/
│   │   └── schema.prisma       # 数据库模型
│   └── package.json
│
└── frontend/                   # React前端
    ├── src/
    │   ├── App.tsx             # 路由
    │   ├── components/         # 共享组件
    │   ├── pages/              # 五大模块页面
    │   ├── stores/             # Zustand状态
    │   └── api/                # API客户端
    └── package.json
```
