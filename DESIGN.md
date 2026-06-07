# BloomBloomGarden 网页端总体设计文档

> **版本**: 2026-06-07  
> **项目**: 千界花园 — 群智协同系统  
> **部署**: https://bloombloomgarden.vercel.app

---

## 一、项目概述

**BloomBloomGarden** 是一个面向多平台、多Agent的群智协同管理系统。核心定位是：

- **Agent 生态中心**: 统一管理各类AI Agent（Kimi、Claude、GPT、本地模型等）
- **平台整合枢纽**: 整合30+ AI平台/工具（OpenRouter、OpenClaw、Ollama、Dify等）
- **蜂群协作引擎**: 支持层级式、顺序式、并行式、森林式、路由式5种蜂群编排
- **人工干预系统**: 实时介入Agent执行过程（暂停/恢复/重试/消息注入/紧急停止）
- **知识库分析**: 基于本地知识库的多Agent协作分析

---

## 二、技术架构

### 2.1 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **框架** | React 18 + TypeScript | 函数组件 + Hooks |
| **构建** | Vite 5 | 快速开发/生产构建 |
| **样式** | Tailwind CSS 3 + CSS Variables | 原子化 + 主题变量 |
| **UI组件** | Radix UI + 自定义组件 | 无头组件库 + 自研 |
| **动画** | Framer Motion | 页面过渡、交互动画 |
| **图表** | Recharts | 数据可视化 |
| **状态** | Zustand | 轻量级全局状态 |
| **路由** | React Router 6 | 声明式路由 + 懒加载 |
| **图标** | Lucide React | 统一图标体系 |
| **流式** | SSE / fetch streaming | LLM流式输出 |

### 2.2 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户浏览器                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Vercel CDN │  │  直连Kimi   │  │  直连OpenRouter     │  │
│  │  (静态资源) │  │  API (5Key) │  │  /其他LLM API      │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (前端 SPA)                         │
│              React App → /api/* 路由代理                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  /api/*     │  │  Railway    │  │  直连LLM    │
│  → rewrite  │  │  后端服务   │  │  (fallback) │
│  (vercel)   │  │  (Express)  │  │             │
└─────────────┘  └─────────────┘  └─────────────┘
```

---

## 三、系统架构

### 3.1 核心架构图

```
┌──────────────────────────────────────────────────────────────┐
│                      表现层 (Presentation)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  页面层   │ │  组件层   │ │  布局层   │ │  路由层   │      │
│  │ 65 Pages │ │ 30+ Comp │ │ Layout   │ │ Router   │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
└───────┼────────────┼────────────┼────────────┼──────────────┘
        │            │            │            │
┌───────┼────────────┼────────────┼────────────┼──────────────┐
│       ▼            ▼            ▼            ▼              │
│                   状态层 (State)                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  appStore.ts (Zustand) — 全局状态: 主题/语言/通知/Agent │ │
│  │  swarmStore.ts (Zustand) — 蜂群状态: 组/节点/任务/指标   │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
        │
┌───────┼──────────────────────────────────────────────────────┐
│       ▼                                                      │
│                   数据层 (Data)                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ api/client  │  │ api/llmApi  │  │ api/kimiApi         │  │
│  │ (后端API)   │  │ (LLM直连)   │  │ (Kimi Code 5Key)    │  │
│  │ safeGet/Post│  │ streamLLM   │  │ testConsoleChat     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 数据流设计

```
用户操作 → 页面组件 → API调用 → 后端/Railway
                              ↓
                         失败? → safeGet fallback → 本地缓存/mock降级
                              ↓
                         成功 → 更新Zustand Store → 组件重渲染
```

---

## 四、页面体系（65个页面）

### 4.1 按功能模块分类

#### A. 核心仪表盘（2页）
| 页面 | 路由 | 功能 |
|------|------|------|
| 首页 | `/` | 生态概览、实时状态、快捷入口 |
| 仪表盘 | `/dashboard` | 统计卡片、Agent选择、活动日志 |

#### B. 平台中心（4页）
| 页面 | 路由 | 功能 |
|------|------|------|
| 平台中心 | `/platforms` | 平台管理、API Key配置、健康检测 |
| 平台库 | `/platform-library` | 30+平台浏览、安装、配置 |
| 平台详情 | `/platform/:id/ui` | 单平台个性化UI |
| Kimi集群 | `/kimi-cluster` | Kimi Code多Key管理 |

#### C. Agent生态（8页）
| 页面 | 路由 | 功能 |
|------|------|------|
| Agent中心 | `/agent` | Agent总览、搜索、筛选 |
| Agent详情 | `/agent/:id` | 单Agent工作流/画布/监控/编排/干预/对话/知识 |
| Agent列表 | `/agents` | 所有Agent列表视图 |
| 创建Agent | `/agents/create` | 向导式Agent创建、技能绑定 |
| Agent协作 | `/agents/collab` | Agent间协作配置 |
| Agent监控 | `/agents/monitor` | 单Agent实时监控 |
| Agent上下文 | `/agent-contexts` | Agent上下文管理 |

#### D. 蜂群与协作（7页）
| 页面 | 路由 | 功能 |
|------|------|------|
| 蜂群面板 | `/swarm` | 蜂群总览、节点管理、拓扑图 |
| 蜂群架构 | `/swarm-architectures` | 5种架构模式展示 |
| 蜂群测试 | `/swarm-test` | 蜂群功能测试 |
| 测试控制台 | `/test-console` | 6标签页统一测试（蜂群/干预/画布/监控/知识） |
| 协作组 | `/groups` | 协作组树形管理 |
| 组详情 | `/groups/:id` | 单组详情、Agent分配 |
| 协作管理 | `/collaboration` | 协作关系配置 |

#### E. 人工干预（1页）
| 页面 | 路由 | 功能 |
|------|------|------|
| 干预中心 | `/intervention` | 5种干预操作、实时状态、干预历史 |

#### F. 知识库（2页）
| 页面 | 路由 | 功能 |
|------|------|------|
| 知识库 | `/knowledge` | 知识库管理、文档索引、语义搜索 |
| 记忆库 | `/memory` | 记忆管理、导出 |

#### G. 通讯与对话（5页）
| 页面 | 路由 | 功能 |
|------|------|------|
| 聊天 | `/chat` | LLM对话、平台选择、流式输出 |
| 频道 | `/channels` | 多频道管理 |
| 会话 | `/sessions` | 会话历史 |
| 对话中心 | `/dialog-center` | 集中式对话管理 |
| 任务与聊天 | `/tasks` | 任务+聊天组合视图 |

#### H. 工作流与蓝图（4页）
| 页面 | 路由 | 功能 |
|------|------|------|
| 蓝图编排 | `/blueprints` | 3DACP蓝图设计、执行 |
| 工作流 | `/workflows` | 工作流管理 |
| 调度器 | `/scheduler` | 定时任务调度 |
| 任务管理 | `/task-manager` | 任务深度管理 |

#### I. 监控中心（3页）
| 页面 | 路由 | 功能 |
|------|------|------|
| 系统监控 | `/monitoring` | 实时监控、指标图表、日志 |
| 上下文监控 | `/context` | Agent上下文追踪 |
| 进程监控 | `/processes` | 进程级监控 |

#### J. 3D生态（2页）
| 页面 | 路由 | 功能 |
|------|------|------|
| 3D全景 | `/ecosystem` | 3D生态坐标系可视化 |
| X轴整合 | `/ecosystem/x` | 平台整合视图 |

#### K. 工具集（6页）
| 页面 | 路由 | 功能 |
|------|------|------|
| 技能库 | `/skills` | Agent技能管理 |
| 模型浏览器 | `/model-browser` | 可用模型浏览 |
| Webhooks | `/webhooks` | Webhook配置 |
| API测试 | `/api-test` | API连通性测试 |
| AI搜索 | `/ai-search` | AI驱动搜索 |
| 文件上传 | `/uploads` | 文件管理 |

#### L. 设置与管理（8页）
| 页面 | 路由 | 功能 |
|------|------|------|
| 设置中心 | `/settings` | 全局设置 |
| 管理面板 | `/admin` | 系统管理 |
| API Keys | `/api-keys` | Key管理 |
| Ollama设置 | `/ollama` | 本地模型配置 |
| 工作空间 | `/workspaces` | 多工作空间 |
| 安全管理 | `/security` | 安全策略 |
| 备份管理 | `/backups` | 数据备份 |
| 注册表 | `/registry` | 节点注册表 |

#### M. 其他（13页）
| 页面 | 路由 | 功能 |
|------|------|------|
| 统一GUI | `/unified` | 统一操作界面 |
| 层级仪表盘 | `/hierarchical` | 层级视图 |
| 事件页面 | `/events-page` | 事件管理 |
| 事件监控 | `/events` | 实时监控 |
| 调度页面 | `/scheduler-page` | 高级调度 |
| 任务深度 | `/tasks-deep` | 深度任务 |
| 外部集成 | `/external-integrations` | 第三方集成 |
| 集成管理 | `/integration-manager` | 集成配置 |
| 支出追踪 | `/spend` | 费用监控 |
| 协议管理 | `/protocol-admin` | 协议配置 |
| 登录 | `/login` | 认证 |
| 占位页 | `*` | 未实现功能 |

---

## 五、组件体系

### 5.1 布局组件

| 组件 | 职责 |
|------|------|
| `Layout.tsx` | 全局布局：Sidebar + Navbar + Footer + 粒子背景 |
| `Sidebar.tsx` | 左侧导航：14个顶级菜单 + 子菜单 + 折叠 |
| `Navbar.tsx` | 顶部栏：搜索、通知、主题切换、语言切换 |
| `Footer.tsx` | 页脚 |
| `CommandPalette.tsx` | 命令面板：Cmd+K快捷操作 |

### 5.2 通用组件

| 组件 | 职责 |
|------|------|
| `ContentCard.tsx` | 内容卡片容器 |
| `StatsCard.tsx` | 统计卡片 |
| `LoadingSkeleton.tsx` | 加载骨架屏 |
| `ErrorBoundary.tsx` | 错误边界 |
| `ToastProvider.tsx` | 全局通知 |
| `PageLoadingBar.tsx` | 页面加载进度条 |
| `SystemBanner.tsx` | 系统公告横幅 |

### 5.3 业务组件

| 组件 | 职责 |
|------|------|
| `AgentContextPanel.tsx` | Agent上下文展示 |
| `AgentMessageBubble.tsx` | Agent消息气泡 |
| `AgentRoleSelector.tsx` | Agent角色选择 |
| `AgentRoleTemplates.tsx` | 角色模板库 |
| `ChatInputBar.tsx` | 聊天输入栏 |
| `ClawPanel.tsx` | OpenClaw面板 |
| `HumanTakeoverPanel.tsx` | 人工接管面板 |
| `OpenClawOrchestrator.tsx` | OpenClaw编排器 |
| `SpendTracker.tsx` | 支出追踪面板 |
| `SystemStatusBoard.tsx` | 系统状态看板 |
| `AxisTopologyGraph.tsx` | 拓扑图组件 |
| `ParticleNetwork.tsx` | 粒子网络动画 |

### 5.4 Swarm专用组件

| 组件 | 职责 |
|------|------|
| `AgentTaskChart.tsx` | Agent任务图表 |
| `SwarmTopologyGraph.tsx` | 蜂群拓扑图（SVG） |

---

## 六、状态管理

### 6.1 appStore.ts（Zustand，~2100行）

管理全局状态：

```typescript
interface AppState {
  // 主题与语言
  theme: 'light' | 'dark'
  language: 'zh' | 'en'
  
  // 布局
  sidebarCollapsed: boolean
  
  // 通知
  notifications: NotificationItem[]
  
  // Agent生态
  agentPersonas: AgentPersona[]      // 30+平台预设
  activeAgents: ActiveAgent[]         // 当前激活Agent
  selectedAgentId: string | null
  
  // 平台
  platforms: Platform[]
  
  // 知识库
  knowledgeBases: KnowledgeBase[]
  
  // 记忆
  memories: Memory[]
  
  // 设置
  settings: AppSettings
}
```

### 6.2 swarmStore.ts（Zustand）

管理蜂群状态：

```typescript
interface SwarmState {
  groups: SwarmGroup[]
  activeGroupId: string | null
  metricsHistory: MetricsPoint[]
  
  // Actions
  setActiveGroup: (id: string) => void
  createGroup: (config: GroupConfig) => void
  addAgentToGroup: (groupId: string, agent: SwarmAgent) => void
  updateAgentStatus: (groupId: string, agentId: string, status: string) => void
  generateMockGroup: (id: string) => void
}
```

---

## 七、API层设计

### 7.1 三层API架构

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: 后端API (api/client.ts)                          │
│  ───────────────────────────────────────────────────────  │
│  • 优先调用后端 (Railway)                                   │
│  • safeGet/safePost — 带fallback的容错请求                   │
│  • checkBackend — 后端可用性检测                             │
│  • 覆盖: Agents/Groups/Blueprints/Platforms/Tasks/...      │
└─────────────────────────────────────────────────────────────┘
                              ↓ 后端不可用
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: LLM直连 (api/llmApi.ts)                          │
│  ───────────────────────────────────────────────────────  │
│  • 浏览器直连 OpenRouter/OpenAI/Kimi/Claude                 │
│  • streamLLM — SSE流式输出                                  │
│  • chatLLM — 非流式请求                                     │
│  • 配置存储在 localStorage                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓ 通用LLM
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Kimi Code专用 (api/kimiApi.ts + testConsoleApi.ts)│
│  ───────────────────────────────────────────────────────  │
│  • 5个Kimi Code API Key轮询                                 │
│  • 专用 endpoint: https://api.kimi.com/coding/v1            │
│  • 必须 Header: User-Agent: claude-code/0.1.0               │
│  • 功能: 蜂群测试/干预/画布/知识分析                         │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 API Fallback策略

| 场景 | 策略 |
|------|------|
| 后端健康 | 全部走后端API |
| 后端超时 | safeGet返回fallback数据，页面不崩溃 |
| 后端404 | 降级到本地mock/缓存 |
| LLM对话 | 直连OpenRouter/Kimi，不依赖后端 |
| 蜂群测试 | 直连Kimi Code API，5Key轮询 |

---

## 八、路由结构

### 8.1 路由设计

```
/                           → Home (懒加载)
/dashboard                  → Dashboard (懒加载)

# 平台
/platforms                  → PlatformHub
/platform-library           → PlatformLibrary
/platform/:id/ui            → PlatformPersonaPage

# Agent
/agent                      → AgentHub
/agent/:id                  → AgentDetail (8个子tab)
/agent/:id/workflow         → AgentDetail
/agent/:id/canvas           → AgentDetail
/agent/:id/monitor          → AgentDetail
/agent/:id/orchestrate      → AgentDetail
/agent/:id/intervene        → AgentDetail
/agent/:id/dialog           → AgentDetail
/agent/:id/knowledge        → AgentDetail
/agents                     → Agents
/agents/create              → AgentCreator
/agents/collab              → AgentCollab
/agents/monitor             → AgentMonitor

# 蜂群
/swarm                      → SwarmPanel
/swarm-test                 → SwarmTest
/swarm-architectures        → SwarmArchitectures
/test-console               → TestConsole (6标签页)
/groups                     → Groups
/groups/:id                 → GroupDetail
/collaboration              → Collaboration

# 知识
/knowledge                  → KnowledgeHub
/memory                     → Memory
/memory/export              → MemoryExport

# 通讯
/chat                       → Chat
/channels                   → Channels
/sessions                   → Sessions
/dialog-center              → DialogCenter
/tasks                      → TasksAndChat

# 工作流
/blueprints                 → BlueprintStudio
/workflows                  → Workflows
/scheduler                  → TaskScheduler
/task-manager               → TaskManager

# 监控
/monitoring                 → Monitoring
/context                    → ContextMonitor
/processes                  → ProcessMonitor

# 3D生态
/ecosystem                  → Ecosystem3D
/ecosystem/x                → EcosystemX

# 工具
/skills                     → Skills
/model-browser              → ModelBrowser
/webhooks                   → WebhooksPage
/api-test                   → APITest
/ai-search                  → AiSearch
/uploads                    → UploadsPage

# 设置
/settings                   → SettingsHub
/admin                      → Admin
/api-keys                   → APIKeys
/ollama                     → OllamaSettings
/workspaces                 → Workspaces
/security                   → SecurityCenter
/backups                    → BackupManager
/registry                   → RegistryView

# 其他
/unified                    → UnifiedGUI
/hierarchical               → HierarchicalDashboard
/login                      → LoginPage
*                           → StubPage (404)
```

---

## 九、功能模块划分

### 9.1 模块依赖图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   平台层     │◄────│   Agent层    │◄────│   蜂群层     │
│  Platforms  │     │   Agents    │     │   Swarm     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
              ┌─────────────────────┐
              │      知识库层         │
              │   KnowledgeHub       │
              │   (knowledge_base)   │
              └─────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   通讯层     │     │   监控层     │     │   干预层     │
│   Chat      │     │  Monitoring │     │ Intervention│
└─────────────┘     └─────────────┘     └─────────────┘
```

### 9.2 核心功能矩阵

| 功能 | 页面 | 真实API | Fallback | 状态 |
|------|------|---------|----------|------|
| 仪表盘数据 | Dashboard | ✅ fetchAgents/tasks/platforms | ✅ MOCK降级 | 可用 |
| 首页概览 | Home | ✅ 5 API并行 | ✅ 本地fallback | 可用 |
| 平台管理 | PlatformHub | ✅ fetchProviders | ✅ 空状态 | 可用 |
| Agent创建 | AgentCreator | ✅ createAgent | ✅ 本地缓存 | 可用 |
| Agent列表 | Agents | ✅ fetchAgents | ✅ 空状态 | 可用 |
| Agent启停 | Agents | ✅ startAgent/stopAgent | ❌ | 可用 |
| 知识库 | KnowledgeHub | ✅ fetchKnowledgeBases | ✅ mock | 可用 |
| 知识搜索 | KnowledgeHub | ✅ search() | ✅ mock结果 | 可用 |
| 蜂群面板 | SwarmPanel | ✅ fetchSwarms/Agents/Tasks | ✅ 默认组 | 可用 |
| 协作组 | Groups | ✅ fetchGroups | ✅ mockGroups | 可用 |
| LLM聊天 | Chat | ✅ streamLLM/chatLLM | ❌ 需配置Key | 可用 |
| 人工干预 | InterventionCenter | ✅ sendGroupMessage/stopAgent/interruptGroup | ❌ | 可用 |
| 系统监控 | Monitoring | ✅ fetchMonitorData/metrics | ✅ 空状态 | 可用 |
| 蜂群测试 | TestConsole | ✅ 直连Kimi API 5Key | ❌ | 可用 |
| 画布编排 | TestConsole | ✅ 模拟编排+真实API | ❌ | 可用 |
| 知识分析 | TestConsole | ✅ 5Agent顺序分析 | ❌ | 可用 |

---

## 十、设计系统

### 10.1 色彩体系

```css
/* 主色调 — 自然/花园主题 */
--sage-50:  #f6f7f4    /* 背景 */
--sage-100: #e8ebe3    /* 卡片背景 */
--sage-200: #d5dacc    /* 边框 */
--sage-300: #b5bda8    /* 次要文字 */
--sage-400: #8a9a7a    /* 图标 */
--sage-500: #6b7a5a    /* 主色 */
--sage-600: #4a5d3f    /* 强调 */
--sage-700: #3a4a30    /* 深色 */
--sage-800: #2a3622    /* 标题 */

/* 点缀色 */
--bloom-mint:   #7fb89f   /* 成功/活跃 */
--bloom-rose:   #c97b84   /* 警告/重要 */
--bloom-amber:  #d4a373   /* 提示/中性 */
--bloom-sky:    #87ceeb   /* 信息 */
```

### 10.2 布局规范

| 元素 | 尺寸 |
|------|------|
| Sidebar展开 | `var(--sidebar-width)` = 240px |
| Sidebar折叠 | `var(--sidebar-collapsed)` = 64px |
| Topbar高度 | `var(--topbar-height)` = 56px |
| 内容区 | `margin-left: sidebar宽度` |
| 卡片圆角 | `rounded-card` = 12px |
| 卡片小圆角 | `rounded-card-sm` = 8px |

### 10.3 动画规范

| 动画 | 时长 | 缓动 |
|------|------|------|
| 页面过渡 | 200ms | ease-out |
| Sidebar折叠 | 400ms | var(--ease-gentle) |
| 卡片悬浮 | 200ms | ease-in-out |
| 粒子浮动 | 15-40s | linear infinite |
| 数据加载 | 300ms | ease-out |

---

## 十一、部署配置

### 11.1 vercel.json

```json
{
  "framework": "vite",
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://bloombloomgarden-production.up.railway.app/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 11.2 环境变量

| 变量 | 用途 |
|------|------|
| `VITE_API_BASE_URL` | 后端API地址 |

---

## 十二、待完善项（供调整参考）

### 12.1 当前限制

1. **后端依赖**: 部分功能需要后端(Railway)支持，当前后端可能未完全实现所有API
2. **LLM配置**: Chat页面需要用户手动配置OpenRouter或Kimi API Key
3. **Kimi Code**: TestConsole的5个Kimi Code Key已硬编码，需考虑安全存储方案
4. **实时性**: 监控数据轮询间隔10秒，非WebSocket实时推送

### 12.2 可扩展方向

1. **WebSocket层**: 添加实时推送（Agent状态、任务进度）
2. **后端补全**: 实现缺失的后端API（/swarm, /blueprints等）
3. **用户系统**: 添加登录/权限/多租户
4. **插件系统**: 支持第三方插件扩展
5. **移动端适配**: 优化Sidebar在小屏幕的体验

---

## 十三、文件结构总览

```
frontend/
├── public/                    # 静态资源
│   └── hero-dashboard.jpg
├── src/
│   ├── api/                   # API层
│   │   ├── client.ts          # 后端API (safeGet/safePost)
│   │   ├── llmApi.ts          # LLM直连 (streamLLM/chatLLM)
│   │   ├── kimiApi.ts         # Kimi API封装
│   │   └── protocolMatrix.ts  # 协议矩阵
│   ├── components/            # 组件 (30+文件)
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Navbar.tsx
│   │   └── ...
│   ├── data/                  # 数据
│   │   └── mockData.ts        # Mock数据 (fallback用)
│   ├── hooks/                 # 自定义Hooks
│   │   ├── use-mobile.ts
│   │   ├── useModal.ts
│   │   ├── useScheduler.ts
│   │   └── useWebhooks.ts
│   ├── pages/                 # 页面 (65个tsx)
│   │   ├── Home.tsx
│   │   ├── Dashboard.tsx
│   │   ├── PlatformHub.tsx
│   │   └── ...
│   ├── services/              # 服务层
│   │   ├── kimiApi.ts
│   │   ├── swarmEngine.ts
│   │   └── testConsoleApi.ts
│   ├── stores/                # 状态管理
│   │   ├── appStore.ts        # 全局状态 (~2100行)
│   │   └── swarmStore.ts      # 蜂群状态
│   ├── types/                 # 类型定义
│   │   ├── index.ts           # 核心类型
│   │   └── swarm.ts           # 蜂群类型
│   ├── App.tsx                # 路由入口 (65+路由)
│   ├── main.tsx               # 应用入口
│   └── index.css              # 全局样式
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

*文档生成时间: 2026-06-07*  
*基于代码库: yimeng2026/bloombloomgarden*
