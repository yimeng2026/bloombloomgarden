# 千界花园 · Kimi 专用无界面研究使用手册

> 版本：2026-10-27
>
> 适用对象：使用 Kimi API、Kimi 集群和千界花园开展研究、程序开发与模型验证的用户。
>
> 本手册描述的是当前实现，而不是对未来的承诺。示例中的密钥、数据库和论文内容均使用占位符或模拟数据。

## 摘要

千界花园现在是一套**无界面、由 Kimi 驱动的研究与工程控制系统**。前端、Electron 和页面组件已经移除，但研究 API、Express 编排后端、数据库、群组、工作流、知识库、验证与审计能力保留。Kimi 不需要点击网页：它可以读取操作目录，经过独立 Agent 凭据调用真实功能。

集群不是“跨供应商混用”，而是同一 Kimi 体系内的多密钥、多端点或多模型执行资源。花园负责研究语义，集群负责执行资源。花园不重新实现一套蜂群，Kimi 集群也不决定研究结论。

研究上最值得坚持的原则是：**先定义真实问题和验收条件，再扩大自动化；生成程序和模型必须伴随执行证据、负例、版本与回滚。**

![Kimi 专用无界面研究架构](images/kimi-headless-architecture.png)

## 一、概念与边界

| 概念 | 它负责什么 | 它不能证明什么 |
|---|---|---|
| Provider | 模型供应商或 API 协议来源，例如 Kimi | 不等于多个节点或多代理 |
| Kimi 集群 | 同 Provider 下的密钥、端点、并发、负载、熔断与故障切换 | 不自动增加配额，不等于跨供应商 |
| Kimi AgentSwarm/Tower | 子代理任务并发、隔离与评审 | 不负责花园的研究对象、数据库和证据治理 |
| 千界花园 | 研究任务、角色、群组、论文、知识、验证、工作流和审计 | 不应再做一套与集群冲突的底层调度 |
| 研究结论 | 由数据、推导、实验、形式证明和独立复核共同支撑 | 不能由生成数量、LLM 自评分或讨论热度代替 |

Kimi 官方文档区分会员产品、API 使用与配额。API 限流需要退避和并发控制，不能把多密钥当成绕过限额的通用办法。[Kimi API 限流](kimi-cite://web?url=https%3A%2F%2Fwww.kimi.com%2Fen%2Fhelp%2Fkimi-api%2Fapi-rate-limits&text=Use%20exponential%20backoff%20for%20retries "citation")

AgentSwarm 能启动子代理，Tower 还能给任务独立分支和工作树。花园应该复用这些隔离思想，但不允许多个调度器递归拆分同一任务、同时写同一份工作区。[Kimi 工具](kimi-cite://web?url=https%3A%2F%2Fwww.kimi.com%2Fcode%2Fdocs%2Fen%2Fkimi-code-cli%2Freference%2Ftools.html&text=Launch%20item-based%20subagents%20or%20resume%20existing%20subagents "citation"), [Kimi Tower](kimi-cite://web?url=https%3A%2F%2Fwww.kimi.com%2Fcode%2Fdocs%2Fen%2Fkimi-code-cli%2Fguides%2Ftower.html&text=Every%20mission%20has%20its%20own%20branch%20and%20Git%20worktree. "citation")

## 二、安装与启动

### 2.1 准备环境

需要 Node.js 24、npm、Python（仅部分验证和文档图生成需要）以及可访问 Kimi API 的账户。依赖安装：

```powershell
npx --yes bun install --frozen-lockfile
npm --prefix backend ci
```

首次创建研究数据库时运行 `npm run db:push`。已有数据库先备份，只有明确需要同步 schema 时才再次运行；不要把 `db:push:unsafe` 当作日常启动命令。研究 API 与配置模板统一使用 `file:./dev.db`，相对路径以项目根目录为基准。

复制 `.env.example` 为 `.env`，只在本机填写真实密钥。以下变量作用不同，不能混用：

| 变量 | 用途 | 是否可交给网页或写入数据库 |
|---|---|---|
| `KIMI_API_KEY` | 服务端调用 Kimi | 否 |
| `KIMI_BASE_URL` | Kimi 网关地址，默认 `https://api.kimi.com/coding` | 可以记录为非敏感配置 |
| `GARDEN_AGENT_TOKEN` | Kimi 或其他受信代理调用花园 API | 否，且不能等同于 Kimi Key |
| `GARDEN_BACKEND_URL` | Express 后端地址，默认 `http://127.0.0.1:3001` | 可以记录为非敏感配置 |
| `TOE_SYLVA_PATH` | 本地 Lean 源目录 | 非敏感，但不要嵌入个人绝对路径到代码 |
| `GARDEN_AUDIT_DIR` | 操作审计目录 | 可配置为私有目录，不写请求正文 |

生成独立 Agent 凭据：

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

把输出放入 `.env` 的 `GARDEN_AGENT_TOKEN`。不要把这个值发送到 GitHub、论文、截图或聊天中。

### 2.2 启动两个无界面服务

```powershell
npm run dev -- --port 7100
```

该命令同时启动：

- Next 研究 API：默认访问 `http://localhost:7100`，命令行 `--host`、`--port` 会原样传递；
- Express 编排后端：默认访问 `http://127.0.0.1:3001`。

任一服务退出，另一个也会停止。若只需要研究 API，可运行 `npm run dev:research`；若只需要后端，可运行 `npm run dev:backend`。

生产检查：

```powershell
npm test
npm run lint
node node_modules/typescript/bin/tsc --noEmit
npm run build
npm --prefix backend run test:unit
npm --prefix backend run build
```

`npm run lint:all` 是旧代码全量治理入口，当前仍有存量问题，不得把核心 lint 通过写成全库 lint 通过。

### 2.3 一键隔离自检

```powershell
# 无外部请求：目录、统计、任务写入与回读
npm run self-check:research

# 可能产生模型 API 用量：额外验收 Kimi 工具循环和 GraphRAG 入库、检索
npm run self-check:research -- --with-model

# 真实 arXiv 网络请求：摄取 1 条到隔离 KB，不调用模型
npm run self-check:research -- --with-arxiv

# 完整验收：同时生成 arXiv 快报，记录 llm 或 fallback-raw
npm run self-check:research -- --with-model --with-arxiv
```

自检只启动研究 API，使用独立的临时 SQLite 数据库和 arXiv/KB 目录，结束后删除临时数据并关闭服务，不写入正式研究记录。`--with-model` 使用 Kimi 服务端直连，不启动 Express 集群；共享集群链路需要单独验收。`--with-arxiv` 检查真实元数据、版本化链接、时间字段和 KB 卡回读，一次最新条目不冒充多版本历史验收。证据保存在 `data/kimi-control/research-self-check-latest.json`，不包含 Agent 凭据。GraphRAG 的 `indexed`、`partial`、`extraction_failed` 必须分开报告；检索返回来源不等于科学结论已经成立。

## 三、Kimi 控制入口

### 3.1 获取真实操作目录

```powershell
$headers = @{ Authorization = "Bearer $env:GARDEN_AGENT_TOKEN" }
Invoke-RestMethod -Uri "http://localhost:7100/api/kimi-control" -Headers $headers
```

当前由真实源码生成 **436 个操作**，覆盖根研究 API 和 38 个后端路由模块。该数量只表示已发现并登记的路由，不表示全部完成端到端实测。

可以按服务、方法或路径过滤：

```powershell
Invoke-RestMethod -Uri "http://localhost:7100/api/kimi-control?service=research&method=GET&path=/api/research/stats" -Headers $headers
```

返回的每项包含 `service`、`method`、`path`、`risk` 和 `source`。`backend` 请求转发到 `GARDEN_BACKEND_URL`，`research` 请求转发到当前研究服务或 `GARDEN_RESEARCH_URL`。

### 3.2 调用只读操作

直接读取研究统计：

```powershell
$operation = @{
  service = "research"
  method  = "GET"
  path    = "/api/research/stats"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:7100/api/kimi-control" -Method Post -Headers $headers -ContentType "application/json" -Body $operation
```

只读 GraphRAG 文档、任务、论文、群组和集群状态都遵循同一结构。未登记路径、路径穿越、错误方法和超过大小的请求体都会被拒绝。

### 3.3 调用写操作

所有非 GET 操作必须带 `confirm: true`。例如创建一个真实 Agent 编排档案：

```powershell
$operation = @{
  service = "research"
  method  = "POST"
  path    = "/api/agents"
  body    = @{
    name         = "lean-reviewer"
    description  = "检查 Lean 命题、依赖和反例"
    systemPrompt = "先核对定义与证据状态，不把文本解析称为证明"
    skills       = @("lean-audit", "counterexample")
  }
  confirm = $true
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:7100/api/kimi-control" -Method Post -Headers $headers -ContentType "application/json" -Body $operation
```

API 只保存角色、提示词、技能和编排关系，不保存 Kimi Key。创建档案不代表已完成任何模型调用或证明。

### 3.4 让 Kimi 自主发现并调用功能

`/api/kimi-agent` 提供两个元工具：

- `garden_catalog`：查询真实操作目录；
- `garden_invoke`：调用目录中经过校验的操作。

这符合大工具清单按需加载的工程原则，不必把全部工具定义塞进提示词。Kimi 官方工具调用流程也要求由应用验证参数、执行工具并按 `tool_call_id` 返回真实结果。[Kimi 工具调用](kimi-cite://web?url=https%3A%2F%2Fplatform.moonshot.ai%2Fdocs%2Fguide%2Fuse-kimi-api-to-complete-tool-calls&text=use%20Dynamically%20Loaded%20Tools%20to%20inject%20tool%20definitions%20on%20demand%20instead%20of%20submitting%20them%20all%20at%20once "citation")

只读示例：

```powershell
$request = @{
  message    = "先查询研究统计的真实操作，读取后总结返回字段，不要猜测"
  allowWrites = $false
  maxSteps   = 4
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:7100/api/kimi-agent" -Method Post -Headers $headers -ContentType "application/json" -Body $request
```

默认 `allowWrites=false`。即使模型自行填写 `confirm: true`，只要调用方没有显式允许写入，也不能执行写操作。最大轮次、最大响应体和上游状态都会被记录。

## 四、Kimi 集群配置与协作纪律

### 4.1 单节点与多节点

只设置 `KIMI_API_KEY` 即可使用单节点。多节点使用 `KIMI_CLUSTER_NODES`，每项只引用环境变量名，不直接写密钥：

```dotenv
KIMI_CLUSTER_NODES=[{"id":"primary","apiKeyEnv":"KIMI_API_KEY","baseUrl":"https://api.kimi.com/coding/v1","maxConcurrency":5},{"id":"secondary","apiKeyEnv":"KIMI_SECONDARY_API_KEY","baseUrl":"https://api.kimi.com/coding/v1","maxConcurrency":5}]
KIMI_SECONDARY_API_KEY=在本机填写的第二个密钥
KIMI_RETRY_BASE_MS=1000
```

节点也支持兼容网关和 `kimi-for-coding-highspeed`，但高速模型的可用性和配额取决于账户。同一账户的多个密钥通常共享配额；节点数量不代表合法吞吐量倍增。

默认调用路径为：花园 → 统一 Kimi 集群 → Kimi 节点。只有故障排查时才显式设置 `GARDEN_USE_CLUSTER=0` 走单节点直连。

### 4.2 避免调度冲突

| 层级 | 可以决定 | 不应越界 |
|---|---|---|
| 花园研究流程 | 研究问题、任务分解、角色、证据状态、验收条件 | 不应绕过集群直接做底层健康与负载调度 |
| Kimi 集群 | 节点选择、并发、退避、熔断、流式执行、用量指标 | 不应宣布论文正确、物理成立或研究完成 |
| 独立验证 | 编译、数值断言、数据复核、人工或外部评审 | 不应被模型自评分替代 |
| 人工/负责人 | 高风险写入、发布、署名、重大路线和退役 | 不应把责任转给代理或模型自评 |

执行层禁止递归开蜂群。一个任务只有一个负责人、一个工作区写入方和一个最终合并方。子任务可以并行检索、计算或评审，但不能同时修改同一证据记录。

### 4.3 真实健康与失败

集群状态接口不返回密钥。配置存在只说明“已配置节点”，不等于“健康”。`/api/llm-pool/status` 默认做免费配置查询；`?probe=1` 才执行真实、可能计费的模型请求。

遇到 429 时进行指数退避和节点切换；400 不重试；全部节点熔断时不强行请求。流式调用只返回正文，`reasoning_content` 可以单独保留用于协议或审计，但不能混入最终回答。

## 五、把全部花园功能用于研究

| 研究需要 | 可使用的真实功能 | 必须保留的证据 |
|---|---|---|
| 前沿跟踪 | arXiv 主题摄取、版本化 KB 卡、快报 | arXiv ID 与版本、摘要、抓取时间、原始链接、LLM 降级状态 |
| 文献与知识 | GraphRAG 文档、实体、关系、查询、Ontology | 原文、分块、抽取结果、失败分块、检索来源 |
| 形式化数学 | Lean 文本解析、同步、验证任务、反例与公理审计 | 声明、编译范围、依赖、`sorry`、公理、外部复核 |
| 数值研究 | 验证脚本、数据版本、参数和负例 | 输入、环境、容差、退出码、失败日志、原始输出 |
| 多角色评议 | 专家组、评审会、导师、竞赛、流水线 | 角色、提示词、真实返回、意见处置、独立复核 |
| 群组协作 | 基础、层级、流水线、共识、对抗、导师等模式 | 单一写入方、任务边界、冲突与合并记录 |
| 工程构建 | Agent、技能、工作流、Blueprint、备份和进程管理 | 构建产物、依赖锁、测试、部署和回滚 |
| 模型研究 | 数学模型、模拟器、训练/微调代码与注册 | 数据卡、基线、训练配置、评测、计算成本和外部验证 |

arXiv 官方要求单连接、最多每三秒一次请求，并区分首版 `published` 与当前版本 `updated`；花园保留版本号而不是把 v2 覆盖到 v1。[arXiv 使用条款](kimi-cite://web?url=https%3A%2F%2Finfo.arxiv.org%2Fhelp%2Fapi%2Ftou.html&text=make%20no%20more%20than%20one%20request%20every%20three%20seconds "citation"), [arXiv 版本](kimi-cite://web?url=https%3A%2F%2Finfo.arxiv.org%2Fhelp%2Fversions.html&text=Any%20replacement%20or%20withdrawal%20of%20that%20article%20generates%20a%20new%20version. "citation")

Lean 官方也提醒新增公理可能破坏一致性；`sorryAx` 不应出现在完成证明中。文本解析、Lean 编译、公理审计和外部检查必须是不同状态。[Lean 公理](kimi-cite://web?url=https%3A%2F%2Flean-lang.org%2Fdoc%2Freference%2Flatest%2FAxioms%2F&text=Lean%20cannot%20check%20whether%20new%20axioms%20are%20consistent "citation"), [Lean 外部检查](kimi-cite://web?url=https%3A%2F%2Flean-lang.org%2Fdoc%2Freference%2Flatest%2FBuild-Tools-and-Distribution%2FLake%2F&text=Lake%20supports%20invoking "citation")

## 六、示范案例

### 案例 A：前沿论文修订与研究评议

**目标**：跟踪一篇论文的 v1/v2，而不是错误地当成重复论文或历史首版。

1. 用 `POST /api/frontier/arxiv` 的 `topics`、`maxResults`、`digest` 参数做真实摄取；写入时带 `confirm: true`。
2. 用 `GET /api/frontier/arxiv?topic=quant-ph` 检查条目的 `id`、`baseId`、`published`、`updated`、`ingestedAt` 和 `link`。
3. 检查 KB 卡文件名是否带版本号，并保留摘要来源。若 LLM 快报失败，必须显示 `fallback-raw`，不能伪称 AI 摘要成功。
4. 创建 `type=review` 的研究任务，让不同角色分别核查数学、物理映射、引用和复现；任务通过 `/api/research/tasks` 创建。
5. 把结论分为“支持、混合、反驳、无信息”，而不是让模型投票决定真伪。

**验收**：v1/v2 均存在，链接含版本号，更新时间未混用，评议能回到原文与执行记录。

### 案例 B：生成一个有用的研究程序

**目标**：生成一个验证某数学断言的小工具，而不是只生成看起来像代码的文本。

推荐闭环：

1. 先写最小规格：输入、输出、公式、边界和至少一个负例。
2. 让 Kimi 生成实现、测试、依赖和 README；复杂修改使用独立工作树。
3. 运行类型检查、单元测试、负例、lint 和生产构建。
4. 检查生成代码是否调用真实数据，是否在缺数据时静默换成合成数据。
5. 由另一角色或人工复核“测试的命题是否就是研究命题”。
6. 保存提交哈希、依赖锁、运行环境、退出码、失败日志和回滚点。

ResearchCodeBench 使用真实执行、等价测试和专家测试评估论文到代码，其 2025 年报告中最佳成功率仍不足 40%。这不是当前 Kimi 的成绩，但说明为什么“会写代码”必须接受执行验证。[ResearchCodeBench](kimi-cite://web?url=https%3A%2F%2Farxiv.org%2Fhtml%2F2506.02314v1&text=even%20the%20best%20models%20correctly%20implement%20less%20than%2040%25%20of%20the%20code. "citation")

**验收**：工具不仅返回预期值，还能拒绝错误输入、缺数据和已知反例。

### 案例 C：生成一个新引擎

**目标**：为研究增加一个可替换的调度或验证引擎，而不是直接修改生产调度器。

先把引擎定义为带版本的插件：输入 schema、输出 schema、资源上限、失败语义、指标和回滚条件。选一个真实基线，例如“单节点执行”与“双节点集群执行”，比较失败率、P50/P95 延迟、费用、重复输出率和人工复核通过率。

先跑小规模 canary，再决定是否成为默认引擎。若只改善延迟却增加错误、重复或费用，应回滚而不是继续扩大流量。新引擎必须能解释：为何它解决的问题属于真实研究需求，而不是为了展示功能数量。

### 案例 D：制作数学模型或模拟器

**目标**：把研究假设转成可执行模型，而不是把提示词包装成新物理理论。

需要明确状态变量、更新规则、单位、初始条件、边界、离散参数、守恒量和观测量。随后检查量纲、守恒、极限、网格收敛、时间步收敛和与已知特例的兼容性。若连续极限、标准模型恢复或实验对应尚未闭合，应保留开放状态。

模拟器产生的是“模型在指定条件下的输出”，不是自然界的直接测量。负结果和模型不适用区域应进入同一记录。

### 案例 E：训练或微调一个 ML 模型

**目标**：制作一个可审查的模型资产，而不是把外部大模型 API 改名为自研模型。

最低资产清单：

- 数据卡：来源、许可、采集日期、清洗、脱敏、划分、污染检查；
- 基线：简单模型、规则模型或已有模型，不先追求复杂结构；
- 训练配置：架构、损失、超参数、随机种子、硬件、依赖和预算；
- 评测：独立验证集、外部测试集、误差分布、校准、负例与不确定性；
- 注册：代码哈希、数据版本、权重哈希、推理接口、资源需求和退役阈值。

Kimi 可以帮助写数据管线、训练代码、测试和报告，但**不能凭空提供真实数据、训练算力、独立验证或新基础模型的真实性**。如果只有提示词和调用记录，应称“基于 Kimi 的编排配置”，不要称“训练了新模型”。

## 七、研究如何随花园升级

### 7.1 从“写论文”升级到“生产可复核对象”

每篇论文都应能链接到定义、数据、代码、参数、运行记录和反例。每次失败都应转化为新的约束、负例或数据质量规则。这样，研究对象不会因文档增多而自动更可靠，却会因复核路径变短而更容易被检验。

NIST 的生成式 AI 风险管理材料强调来源追踪、持续监测、独立评审和必要退役。研究升级应优先补这些闭环，而不是继续增加代理数量。[NIST AI 治理](kimi-cite://web?url=https%3A%2F%2Fnvlpubs.nist.gov%2Fnistpubs%2Fai%2FNIST.AI.600-1.pdf&text=Track%20dataset%20modifications%20for%20provenance "citation")

### 7.2 从“自动化”升级到“可退役和可回滚”

任何新程序、引擎或模型都应有退役条件：数据源失效、错误率上升、偏差超限、费用异常、无法复现或评审不通过。项目需要能够恢复到上一版，而不是只能不断追加新内容。

### 7.3 从“项目驱动功能”升级为“真实问题驱动功能”

优先开发当前研究最缺的能力：真实数据、可执行验证、反例、版本血缘和独立复核。只有当新工具改变一个具体研究问题时，才把它登记为平台升级。

### 7.4 从“模型自评”升级为“外部判据”

模型可以提出评价维度，但不能单独决定评价结果。权威来源、执行测试、独立复现和专家评审应各有记录。FAIR 与可追溯工作流也要求能追踪“哪段代码在哪个数据版本上运行”，并使问题能传播到下游对象。[FAIR 数据管线](kimi-cite://web?url=https%3A%2F%2Fpmc.ncbi.nlm.nih.gov%2Farticles%2FPMC9376726%2F&text=trace%20exactly%20what%20code%20was%20run%20on%20which%20datasets "citation")

## 八、当前验证基线与限制

本次实际检查得到：

- 根平台 **19 项单元测试通过、0 失败**，覆盖操作目录、鉴权、写入拒绝、敏感字段脱敏、审计、工具循环、数据库路径、集群瞬时断连重试、GraphRAG 抽取状态、arXiv 版本与摘要降级、Lean 文本状态、LLM 正文边界和 arXiv 修订；
- 后端集群 **12 项单元测试通过、0 失败**，覆盖负载、能力、参数、模式、熔断、配置脱敏、429/400、流式正文、RPC、健康探测、嵌套工具消息和空消息拒绝；
- 根平台 TypeScript 检查和 Next standalone 生产构建通过，Express 后端 TypeScript 构建通过；
- 核心 lint 通过；`lint:all` 仍有存量错误与警告，不能写成全库 lint 通过；
- 目录当前为 **436 个操作**，不是 436 个已端到端验证的研究结论。

这些单元检查使用临时目录、模拟节点和模拟响应，不消耗真实 API 配额。2026-10-30 另完成本机真实冒烟：模型发现并调用统计工具，研究任务创建后按同一 ID 回读成功；隔离自检中的 GraphRAG 文档达到 `indexed`，实体与关系数大于零，问答返回来源片段；真实 arXiv 条目的版本化 ID、链接、时间字段和 KB 卡回读一致，快报明确返回 `digestSource=llm`。模拟模型故障另行验证 `fallback-raw` 保留原始链接。临时数据库、KB 与服务均已清理；这些结果只证明所测技术链路，不构成科学语义、多版本实时历史或全部接口的验收。真实账户的配额、模型权限、生产数据库迁移、Render/Railway 部署和外部专家评审仍需独立验收。高风险操作、真实数据写入、模型训练和论文发表不能由这些检查代替。

研究化学、材料或实验数据时，还应核验样品、仪器、批次、预处理、原始谱图和独立复现；不能仅凭数据库中的数值或 LLM 判断数据真实性，更不能把“某领域普遍造假”当成不经举证的结论。

## 九、最简工作约定

使用时遵守六条即可：

1. 先写真实问题和验收条件，再调用工具；
2. 默认只读，写操作必须明确授权并留审计；
3. 花园管研究，集群管执行，验证管证据，负责人管发布；
4. 新版本、负例和失败与成功一起保存；
5. 程序、引擎、模型都以真实执行、独立复核和可回滚作为晋级条件；
6. 不把文本解析当证明，不把 LLM 评议当独立证明，不把生成数量当科研进展。
