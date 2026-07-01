# BloomBloomGarden 平台分类重构方案 v3.0

> **日期**: 2026-06-07  
> **目标**: 去XYZ轴展示，按功能/技术特性严谨分类，蜂群作为模块化机制  
> **参考**: Productive-openclaw 架构文档

---

## 一、问题诊断

### 1.1 当前问题

| 问题 | 现状 | 影响 |
|------|------|------|
| XYZ轴硬编码展示 | Ecosystem3D.tsx 静态展示50个节点 | 用户困惑，无实际意义 |
| X轴平台混入管理 | PlatformHub 展示15个前端平台 | 这些平台就是"被整合的对象"，不是"管理对象" |
| 蜂群作为独立页面 | `/swarm` 是独立路由 | 蜂群应该是Agent的属性，不是独立平台 |
| 分类逻辑混乱 | 按部署位置（前端/后端/CLI）分类 | 应该按功能/技术特性分类 |
| 50个平台无优先级 | 全部平铺展示 | 用户不知道哪些需要安装、哪些只需配置Key |

### 1.2 用户明确要求

1. **XYZ轴只是分类方式** → 不在网页端展示，无实际意义
2. **X轴=网页本身** → 平台管理只列出X轴以外的平台
3. **严谨分类** → 聚合平台、多线程平台、单线程工具平台
4. **蜂群定位** → 模块化机制 vs 单独平台？

---

## 二、新分类体系（去XYZ轴）

### 2.1 分类原则

```
按"功能 + 技术特性 + 使用方式"分类，不按"部署位置"分类

关键区分维度：
1. 是否需要安装？（本地安装 vs 云端配置）
2. 是否支持多Agent协作？（单线程 vs 多线程）
3. 连接方式？（API Key vs 本地进程 vs 浏览器插件）
```

### 2.2 四大类别

#### 类别A: API Provider（聚合平台）— 33个

**定义**: 提供LLM API端点的服务，只需配置API Key即可使用

**技术特征**:
- 单线程：一次请求一个响应
- 无状态：不维护会话状态
- 远程：通过HTTP连接
- 配置方式：API Key

**包含平台**:

| 子类 | 平台 | 安装需求 |
|------|------|----------|
| 国际云端 | OpenAI, Anthropic, Google Gemini, DeepSeek, Groq, Fireworks, Together AI, Mistral, Cohere, xAI Grok, Perplexity, AI21, Replicate | 只需API Key |
| 中国云端 | 通义千问, 文心一言, 讯飞星火, 智谱GLM, MiniMax, 百川, 阶跃星辰, 零一万物, 月之暗面Kimi, 商汤, 华为盘古, 腾讯混元 | 只需API Key |
| 本地引擎 | Ollama, LM Studio Server, vLLM, LocalAI | 需本地安装 |
| 统一路由 | OpenRouter, Azure OpenAI, AWS Bedrock, Cloudflare Workers AI, HuggingFace Inference | 只需API Key |
| 嵌入/媒体 | OpenAI Embedding, Cohere Embed, DALL-E, Stable Diffusion | 只需API Key |

**在系统中的角色**: Level A — LLM能力来源

---

#### 类别B: 多线程编排平台 — 12个

**定义**: 支持多Agent并行执行、工作流编排、状态管理的平台/框架

**技术特征**:
- 多线程：可同时运行多个Agent
- 有状态：维护会话、记忆、上下文
- 编排能力：DAG、循环、条件分支
- 安装方式：本地部署或自托管

**包含平台**:

| 平台 | 类型 | 安装需求 | 核心能力 |
|------|------|----------|----------|
| **OpenClaw** | 网关运行时 | Node.js安装 | Agent调度、工具注册、权限沙箱 |
| **Dify** | LLMOps平台 | Docker部署 | 工作流编排、知识库、多Agent |
| **Flowise** | 低代码编排 | Node.js安装 | 拖拽式工作流、LangChain集成 |
| **LangGraph** | 图结构编排 | Python安装 | 状态机、循环、条件分支 |
| **n8n** | 工作流自动化 | Docker/Node.js | 自动化流程、200+集成 |
| **Agent-Zero** | 执行引擎 | Python安装 | 任务执行、litellm管理 |
| **Sylva Backend** | 自研后端 | Node.js安装 | 统一协调、蜂群管理 |
| **LobeChat** | 聊天前端+后端 | Docker部署 | 插件市场、多模型切换 |
| **AnythingLLM** | 知识库+聊天 | Docker部署 | RAG、多用户、权限管理 |
| **LibreChat** | 统一对话 | Docker部署 | 多Provider、插件系统 |
| **Cherry Studio** | 国产开源 | 桌面安装 | 知识库、国产模型适配 |
| **Chatbox** | 轻量客户端 | 桌面安装 | 跨平台、多Provider |

**在系统中的角色**: Level C — 运行时/消费方，承载Agent执行

---

#### 类别C: 单线程CLI工具 — 20个

**定义**: 命令行工具，单会话单任务，无多Agent协作能力

**技术特征**:
- 单线程：一次一个任务
- 本地运行：需要本地安装
- IDE集成：大多数是VS Code扩展或独立CLI
- 配置方式：本地配置文件

**包含平台**:

| 平台 | 类型 | 安装需求 | 核心能力 |
|------|------|----------|----------|
| **Claude Code** | 自然语言开发 | `npm install -g @anthropic-ai/claude-code` | 自然语言编码、Git集成 |
| **Codex CLI** | 沙箱执行 | OpenAI CLI | 安全隔离、全上下文 |
| **Qwen Code** | 中文优化 | pip安装 | 中文注释、代码补全 |
| **Aider** | 多文件编辑 | pip安装 | 跨文件修改、Git提交 |
| **Continue Dev** | IDE扩展 | VS Code扩展 | 行内编辑、自动补全 |
| **Roo Code** | 自动任务 | VS Code扩展 | 自主规划、MCP支持 |
| **Cline** | 浏览器自动化 | VS Code扩展 | 网页浏览、终端执行 |
| **Kimi CLI** | 超长上下文 | npm安装 | 128K处理、文件上传 |
| **Cursor Agent** | 上下文感知 | 桌面安装 | 代码库感知、Tab预测 |
| **Goose** | MCP工具 | 本地安装 | 安全沙箱、本地运行 |
| **OpenClaw CLI** | 流式网关 | npm安装 | WebSocket、Agent路由 |
| **iFlow** | 流程设计器 | 本地安装 | 可视化编排、API触发 |
| **Hermes Agent** | 内存推理 | 本地安装 | 纯内存、无持久化 |
| **Augment Code** | 仓库理解 | VS Code扩展 | 语义索引、跨文件编辑 |
| **Devika** | 自动规划 | 本地安装 | 全栈生成、自我修复 |
| **Crush** | 快速任务 | 本地安装 | 秒级响应、剪贴板AI |
| **Pool** | 多后端 | 本地安装 | 统一调用、回退链 |
| **Pi** | 情感对话 | 本地安装 | 温暖交互、语音模式 |
| **Droid** | Android专项 | 本地安装 | Kotlin/Java优化 |
| **Mistral Vibe** | 快速聊天 | 本地安装 | 命令行问答、代码辅助 |

**在系统中的角色**: Peer Level — 开发工具，不参与Agent运行时

---

#### 类别D: Peer Level 技能/基础设施 — 15+个

**定义**: 不直接连接LLM API，被Agent调用的工具/服务

**技术特征**:
- 被调用：由Agent或编排平台调用
- 独立配置：有自己的认证体系
- 功能专一：搜索、RAG、监控、记忆等

**包含**:

| 子类 | 组件 | 说明 |
|------|------|------|
| 技能层 | 70+ Skills | 搜索、天气、OCR、代码分析等 |
| RAG引擎 | RAG Engine | 文档检索、上下文组装 |
| 嵌入服务 | Embedding Provider | 文本→向量 |
| 媒体生成 | Image/Video/Audio Gen | DALL-E、Stable Diffusion |
| 记忆系统 | Hermes Memory | 记忆存储、模式提取 |
| 监控系统 | Monitor Center | 性能统计、健康检查 |
| 通信集成 | Telegram/Slack/Notion | 消息通道 |

**在系统中的角色**: Peer Level — 被上层调用，不主动连接LLM

---

## 三、蜂群定位：模块化机制，不是独立平台

### 3.1 当前问题

蜂群被当作独立页面 `/swarm`、独立路由、独立概念存在，导致：
- 用户以为蜂群是一个"平台"
- 蜂群与Agent创建流程割裂
- 蜂群配置在多个地方重复

### 3.2 正确设计

蜂群是 **Agent的协作属性**，不是独立平台：

```
Agent创建流程
    ↓
[Step 1: 选择平台/Provider]
    ↓
[Step 2: 配置Agent参数]
    ↓
[Step 3: 是否启用蜂群协作？]
    → 否 → 单Agent运行
    → 是 → 选择蜂群模式
        → sequential（顺序）
        → parallel（并行）
        → hierarchical（层级）
        → dynamic（动态）
    ↓
[Step 4: 选择/创建协作组]
    → 加入现有组
    → 创建新组（指定协调员、成员）
```

### 3.3 蜂群在系统中的位置

```
┌─────────────────────────────────────────┐
│           Agent（核心实体）              │
├─────────────────────────────────────────┤
│  基础属性: name, role, provider, config   │
│  协作属性: swarmMode, groupId, role     │  ← 蜂群在这里
│  能力属性: skills, capabilities         │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│      Swarm Coordinator（协调器）         │
│  · 任务路由                             │
│  · 状态同步                             │
│  · 执行模式切换                         │
└─────────────────────────────────────────┘
```

### 3.4 蜂群模式作为Agent配置字段

```typescript
interface Agent {
  // ...基础字段...
  
  // 蜂群协作配置（新增）
  swarmConfig?: {
    enabled: boolean;           // 是否启用蜂群
    mode: 'sequential' | 'parallel' | 'hierarchical' | 'dynamic';
    groupId?: string;           // 所属组ID
    roleInGroup: 'leader' | 'worker' | 'solo';  // 组内角色
    coordinatorId?: string;     // 上级协调员
  };
}
```

### 3.5 页面调整

| 当前 | 调整后 |
|------|--------|
| `/swarm` 独立页面 | 删除独立页面，功能并入 `/agents` 和 `/groups` |
| `/swarm-test` | 保留作为测试工具，但改为 `/agents/swarm-test` |
| `/swarm-architectures` | 保留作为文档展示，但改为 `/docs/swarm-architectures` |
| `/test-console` | 保留，但蜂群测试改为Agent属性测试 |
| `/groups` | 强化为"协作组管理"，蜂群模式作为组属性 |

---

## 四、页面重构方案

### 4.1 删除/合并的页面

| 页面 | 操作 | 原因 |
|------|------|------|
| `/ecosystem` (3D全景) | **删除** | XYZ轴不展示 |
| `/ecosystem/x` (X轴整合) | **删除** | X轴=网页本身 |
| `/swarm` (蜂群面板) | **合并** → `/groups` | 蜂群不是独立平台 |
| `/swarm-test` | **移动** → `/agents/swarm-test` | 作为Agent测试工具 |
| `/swarm-architectures` | **移动** → `/docs/swarm-architectures` | 作为文档 |
| `/hierarchical` (层级仪表盘) | **合并** → `/groups/:id/monitor` | 作为组监控视图 |
| `/unified` (统一GUI) | **保留但重构** | 改为"跨平台Agent统一入口" |

### 4.2 保留并强化的页面

| 页面 | 强化内容 |
|------|----------|
| `/platforms` | 只展示API Provider + 多线程编排平台，按类别分组 |
| `/agents` | 增加蜂群协作属性展示和配置 |
| `/agents/create` | 增加蜂群模式选择步骤 |
| `/groups` | 增加蜂群模式切换、层级监控 |
| `/agent/:id` | 增加蜂群配置标签页 |

### 4.3 Sidebar导航调整

```
当前:                    调整后:
├─ 仪表盘                ├─ 仪表盘
├─ Agent中心             ├─ Agent中心
├─ 平台中心               ├─ 平台中心（过滤X轴）
├─ 平台库                 ├─ 平台库
├─ 蓝图编排               ├─ 蓝图编排
├─ 3D生态坐标系  ←删除    ├─ 工作空间
├─ 工作空间               ├─ 文件浏览
├─ 文件浏览               ├─ 知识库
├─ 知识库                 ├─ 记忆库
├─ 记忆库                 ├─ 智能体
│  ├─ 列表               │  ├─ 列表
│  ├─ 创建               │  ├─ 创建
│  ├─ 协作               │  ├─ 协作
│  ├─ 协作组             │  ├─ 协作组（含蜂群）
│  ├─ 协作组管理          │  ├─ 协作组管理
│  ├─ 蜂群面板  ←删除     │  ├─ 蜂群测试
│  ├─ 蜂群测试           │  ├─ 人工干预
│  ├─ 测试控制台          │  ├─ 蜂群架构（文档）
│  ├─ 人工干预           │  └─ 监控
│  ├─ 蜂群架构           │
│  └─ 监控               │
```

---

## 五、后端调整方案

### 5.1 Agent模型扩展

```prisma
model Agent {
  // ...现有字段...
  
  // 蜂群协作配置（新增）
  swarmEnabled   Boolean  @default(false)
  swarmMode      String?  // sequential/parallel/hierarchical/dynamic
  groupId        String?  // 所属组ID
  roleInGroup    String?  @default("solo") // leader/worker/solo
  coordinatorId  String?  // 上级协调员ID
}
```

### 5.2 Group模型强化

```prisma
model Group {
  // ...现有字段...
  
  // 蜂群模式（从executionMode升级）
  swarmMode      String   @default("sequential")
  
  // 层级监控数据
  healthScore    Int      @default(100)
  taskStats      Json?    // { completed, failed, pending }
}
```

### 5.3 删除独立蜂群路由

- `/api/swarm/*` → 合并到 `/api/groups/*`
- 蜂群执行模式作为 `Group.executionMode` 的枚举值

---

## 六、实施步骤

### Phase 1: 数据层重构（2h）
1. 重构 `appStore.ts` 中 `agentPersonas` 分类
2. 删除 X轴平台数据（或标记为 internal）
3. 添加新分类字段：`category: 'api-provider' | 'orchestration' | 'cli-tool' | 'peer-skill'`

### Phase 2: 页面层重构（4h）
1. 删除 Ecosystem3D.tsx、EcosystemXPage.tsx
2. 重构 PlatformHub.tsx：按新分类展示，过滤X轴
3. 重构 AgentCreator.tsx：增加蜂群配置步骤
4. 重构 Groups.tsx：增加蜂群模式切换
5. 重构 Sidebar.tsx：删除3D生态菜单

### Phase 3: 后端调整（2h）
1. 扩展 Agent/Group Prisma 模型
2. 删除独立 `/api/swarm` 路由
3. 蜂群功能并入 `/api/groups`

### Phase 4: 验证部署（1h）
1. 本地构建
2. Push到GitHub
3. Vercel部署验证

---

## 七、分类合理性论证

### 7.1 为什么这样分类？

| 维度 | 旧分类（XYZ轴） | 新分类（功能特性） |
|------|----------------|-------------------|
| 分类依据 | 部署位置（前端/后端/CLI） | 技术特性（API/编排/工具） |
| 用户价值 | 低（用户不关心部署位置） | 高（用户关心"怎么用"） |
| 安装指导 | 无 | 明确（API Key vs 本地安装） |
| 蜂群关联 | 割裂 | 蜂群是编排平台的属性 |

### 7.2 多线程 vs 单线程的协调

```
单线程工具（CLI）→ 作为"技能"被多线程平台调用
                    ↓
多线程编排平台 → 统一管理多个Agent的协作
                    ↓
API Provider → 为所有Agent提供LLM能力
```

**协调原则**:
1. CLI工具不直接参与蜂群，但可以被编排平台调用
2. 编排平台负责多Agent调度，CLI工具负责单任务执行
3. API Provider为所有上层提供统一LLM能力

### 7.3 蜂群作为模块化机制的优势

| 方案 | 蜂群作为独立平台 | 蜂群作为模块化机制 |
|------|------------------|-------------------|
| 概念复杂度 | 高（多一个平台概念） | 低（Agent的属性） |
| 配置位置 | 分散（多个页面） | 集中（Agent创建流程） |
| 与Agent关系 | 割裂 | 紧密（蜂群=Agent协作方式） |
| 扩展性 | 差（新增平台需改蜂群） | 好（任何Agent可启用蜂群） |

**结论**: 蜂群必须是模块化机制，不是独立平台。

---

*本方案基于 Productive-openclaw 架构文档和当前仓库代码分析制定。*
*下一步: 执行代码重构。*
