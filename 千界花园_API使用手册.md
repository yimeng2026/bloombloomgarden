# 千界花园 API 使用手册

> 版本：救援修复版（Kimi 网关通道） · 更新日期：2026-08-05
> 适用环境：本地开发（Windows + Kimi Desktop 捆绑 Node.js）

---

## 一、启动方法

### 1. 前置条件

- 项目根目录：`C:\Users\一梦\Documents\kimi\workspace`
- `node_modules` 已安装、Prisma Client 已生成（`node_modules/.prisma/client`）
- `.env` 中已有 `PORT=3001`、`DATABASE_URL=file:./dev.db`
- **关键**：运行环境变量中必须有 Kimi 网关配置（Kimi Desktop 运行环境默认已注入）：
  - `KIMI_API_KEY`（`sk-kimi-` 开头）
  - `KIMI_BASE_URL`（`https://agent-gw.kimi.com/coding`）

### 2. 启动命令

`npm` 不在系统 PATH 中，必须使用 Kimi Desktop 捆绑的 Node 直接调用 Next.js：

```bash
cd "C:\Users\一梦\Documents\kimi\workspace"
"C:\Users\一梦\AppData\Local\Programs\kimi-desktop\resources\resources\runtime\node.exe" \
  node_modules/next/dist/bin/next dev -p 3001
```

启动成功标志：日志出现 `✓ Ready in xxx ms`，访问 `http://localhost:3001`。

### 3. 常见问题

| 问题 | 解决方案 |
|---|---|
| 提示 "Another next dev server is already running" | 旧 dev 进程残留：`taskkill //PID <旧PID> //F //T` 后重启 |
| Prisma Client 未生成 | `"<node路径>" node_modules/prisma/build/index.js generate` |
| 3001 端口被占用 | `netstat -ano \| grep ":3001"` 找到 PID 后 taskkill，或换 `-p 3002` |
| LLM 全部 401 | 确认启动 shell 中 `echo $KIMI_API_KEY` 非空（`.env` 里的 GLM Key 已全部失效，不影响） |

> 注意：环境变量 `KIMI_BASE_URL` 末尾可能带 `/`，代码已自动去除尾部斜杠，无需处理。

---

## 二、救援改动说明

### 背景

`.env` 中 `GLM51_API_KEY_1..10`（含 `ZHIPU_API_KEY`）已全部失效（401），`KIMI_CODE_API_KEY_1` 为占位符。救援方案：以运行环境中的 **Kimi 网关**作为全站首选 LLM Provider，GLM 降级为 fallback。

### Kimi 网关约束（实测）

- 端点：`POST {KIMI_BASE_URL}/v1/chat/completions`，OpenAI 兼容，Bearer 认证
- 模型固定：`kimi-for-coding`
- **仅允许 `temperature=1`**，传其他值返回 400
- 响应 `message` 含 `reasoning_content` 字段（思考过程）
- 流式 SSE 格式为 `data:{...}`（`data:` 后**无空格**；仅 `[DONE]` 行有空格），解析器已兼容
- 推理型模型：思考会消耗大量 token（实测 450 completion 中 359 为 reasoning_tokens），`max_tokens` 不宜过小

### Provider 优先级

```
1. Kimi 网关（KIMI_API_KEY + KIMI_BASE_URL 存在时永远优先，model=kimi-for-coding，temperature=1）
2. 智谱 GLM-5.1（fallback：ZHIPU_API_KEY / GLM51_API_KEY_1 / GLM_API_KEY）
```

### 改动文件清单（共 5 个，1 个新增）

| 文件 | 改动 |
|---|---|
| `src/lib/kimi-gateway.ts` | **新增**。统一读取 `KIMI_API_KEY`/`KIMI_BASE_URL`，输出规范化网关配置（chatUrl/model/temperature）。不硬编码密钥、不打印密钥 |
| `src/lib/research-llm.ts` | 重构 `researchChat` 为「候选通道」模式：Kimi 网关永远排第一，失败后自动 fallback 到 GLM；兼容 `reasoning_content`；日志只打印 provider/model/latency |
| `src/lib/platform-adapter.ts` | `callLLMStream` 增加 Kimi 网关优先覆盖（chat 单聊/群聊全走这里，数据库中存的死 GLM Key 不再影响）；SSE 解析兼容 `data:` 无空格格式 |
| `src/lib/graphrag.ts` | `callLLM` 拆出 `postChat`，Kimi 网关优先、失败回退 legacy provider；ontology.ts 经此自动获益 |
| `src/app/api/agents/route.ts` | 创建 Agent 时的 Key 校验改经 Kimi 网关（GLM Key 已失效，旧校验必然 401） |

**安全约定**：全部密钥仅经 `process.env` 读取；日志中绝不出现密钥；无 git 写操作。

---

## 三、可用端点清单与实测记录

实测时间：2026-08-05，服务器 `http://localhost:3001`。

### GET 端点（数据类，真实 SQLite 数据）

| 端点 | 实测结果 |
|---|---|
| `GET /api/agents` | `[]` —— 设计如此：Agent 为「虚拟 Agent」模式，前端存 localStorage，服务端只负责校验 Key |
| `GET /api/conversations` | 200，返回真实会话列表（含群组、消息计数，如「月度报表讨论」等历史数据） |
| `GET /api/graphrag/stats` | `{"entityCount":0,"relationCount":0,"documentCount":1,"communityCount":0,"chunkCount":1}` |
| `GET /api/ontology/stats` | `{"schemaCount":1,"typeCount":2,"instanceCount":0,"relationCount":0}` |
| `GET /api/research/tasks` | `{"success":true,"data":[]}` |
| `GET /api/research/stats` | `{"success":true,"data":{"totalModules":0,...}}` |

其他 GET 分组（同一模式，共 74 个 route.ts）：`/api/groups`、`/api/workflows`、`/api/graphrag/entities|relations|documents`、`/api/ontology/schemas|instances|relations`、`/api/research/{papers,competitions,mentorships,validations,verification,workshops,collaborations,code-reviews,review-boards,millennium,modes,modules,notes,registry,sync}` 等。

### POST 端点（LLM 类，实测经 Kimi 网关）

#### 1. `POST /api/chat` —— 单聊（SSE 流式）✅ 实测通过

请求（模式 2：直接传 agent 配置，apiKey 任意非空即可，网关会覆盖）：

```json
{
  "content": "17 乘以 23 等于多少？再写出一个物理学公式。",
  "agent": {
    "id": "test", "name": "救援测试员",
    "systemPrompt": "你是一个严谨的学术助手。",
    "model": "glm-5.1", "temperature": 0.7,
    "apiKey": "legacy-key-will-be-overridden",
    "llmProvider": "zhipu", "agentPlatform": "direct",
    "skills": [], "channels": []
  }
}
```

实测响应（SSE，约 30s）：token 事件逐字推送，最终 `done` 事件 `fullContent` 为模型真实生成内容：

```
data: {"type":"token","content":"$",...}
data: {"type":"done","fullContent":"**17 除以 23 的余数是 17。**\n\n因为 17 小于 23……$$17 \\equiv 17 \\pmod{23}$$……"}
```

（模型把问题理解为带余除法并给出同余式推导 —— 真实推理输出，非 mock。）

#### 2. `POST /api/research/panels/[id]/execute` —— 专家组群智评议 ✅ 实测通过

流程：`POST /api/research/panels` 建组 → `POST /api/research/panels/{id}/members` 加成员（role: chair/contributor/reviewer）→ execute。

请求：`{"topic":"TOE-SYLVA 理论中时间涌现机制的可证伪性评估","mode":"parallel"}`（mode 可选 committee/debate/sequential/parallel）

实测响应（75s，2 名成员并行）：`steps[]` 中每位成员返回数千字真实学术评议，`usage` 为真实 token 计量：

```json
{"memberId":"4509c6ad-...","role":"chair","content":"**专家组审议意见**\n\n**论题：** TOE-SYLVA ……",
 "usage":{"prompt_tokens":298,"completion_tokens":4096,"total_tokens":4394}}
```

服务器日志铁证：

```
[ResearchLLM] answered by provider=kimi model=kimi-for-coding latency=74074ms
[ResearchLLM] answered by provider=kimi model=kimi-for-coding latency=74742ms
POST /api/research/panels/.../execute 200 in 75s
```

> 提示：模型注意到议题字符串在传输中出现编码损坏并主动声明 —— Windows git-bash 下 `curl -d` 传中文会乱码，建议把 JSON body 写入临时文件后用 `curl -d @file.json`（UTF-8）。这是 shell 编码问题，与应用无关。

#### 3. `POST /api/agents` —— 创建虚拟 Agent（Key 校验）✅ 实测通过

即使传入已失效的 GLM Key，也会改经 Kimi 网关完成真实校验并 201 创建（响应中 Key 已脱敏：`legacy-d****-key`）。

#### 4. `POST /api/graphrag/query` —— 图检索问答

实测：`{"question":"...","mode":"naive"}` → `{"answer":"未找到与问题相关的文档片段。","sources":[]}`。当前库中仅 1 文档 1 chunk 且未召回；naive 模式无召回时不触发 LLM。先用 `POST /api/graphrag/documents` 摄入文档后再查即可走通 LLM（`graphrag.ts` 的 `callLLM` 已接入 Kimi 网关）。

#### 5. 其他 LLM POST（同一通道，未逐一实测）

- `POST /api/chat/group` —— 群聊蜂群（relay/debate/vote/parallel/roundtable + stigmergy/hierarchical/pipeline/consensus/adversarial/mentor 六种 swarm 模式），经 `platform-adapter.ts` → Kimi 网关
- `POST /api/research/sylva-sync` —— 读取 `C:\Users\一梦\Documents\TOE-SYLVA-pull` 的 .lean 文件，LLM 分析 sorry 证明策略（经 `research-llm.ts`）
- `POST /api/research/{code-reviews,mentorships,validations,pipelines}/...` —— 均显式传 `provider:"zhipu"` 调用 `researchChat`，现已被候选通道自动改道 Kimi 网关
- `POST /api/ontology/extract` —— 本体抽取，经 `graphrag.ts callLLM` → Kimi 网关

---

## 四、用于 TOE-SYLVA 学术研究的建议

### 1. research/pipelines —— 论文生产流水线

`POST /api/research/pipelines` 创建流水线 → `POST /api/research/pipelines/{id}/stages/{stageId}` 逐阶段执行。每阶段内部调 `researchChat`（现走 Kimi）。建议阶段拆分：文献扫描 → 形式化建模 → Lean 证明要点 → 同行评议 → 修订成稿。注意 Kimi 为推理型模型，单阶段 `maxTokens` 建议 ≥ 4096，长证明阶段设 8192。

### 2. graphrag —— 论文知识图谱

1. `POST /api/graphrag/documents` 摄入 TOE-SYLVA 各章 `.md`/`.tex`（自动分 chunk）
2. 摄入过程经 LLM 抽取实体/关系（实体如「时间涌现」「精细结构常数」「SYLVA 公理」）
3. `POST /api/graphrag/query` 用 `mode:"local"`（实体邻域）查具体概念、`mode:"global"`（社区摘要）查跨章主题、`mode:"mix"` 综合
4. `GET /api/graphrag/stats` 监控图谱规模

适合场景：跨 52 章论文的概念一致性检查、「某公理在哪些章节被引用」类溯源。

### 3. ontology —— 本体论对齐

`POST /api/ontology/extract` 从论文文本抽取类型系统（`GET /api/ontology/schemas` 查看）。建议先为 TOE-SYLVA 建立「理论-公理-定理-证明-物理量」五层 schema，再用 `POST /api/ontology/query` 做语义查询，可发现不同论文间概念定义的漂移。

### 4. agents 群智 —— 学术评议团

- **专家组模式**（research/panels）：建「理论物理评议组」，成员按 specialty 分工（量子引力/代数几何/形式化验证/科学哲学），`mode:"committee"` 三轮（初步审议→交叉评议→综合决议）最接近真实同行评议。
- **蜂群模式**（chat/group）：`swarmMode:"adversarial"` 红蓝对抗适合攻击 TOE-SYLVA 的薄弱环节（如可证伪性质疑）；`swarmMode:"hierarchical"` 适合长篇论文分工写作。
- 实测单成员并行响应约 75s，committee 三轮模式请按 3-5 分钟预算设计超时。

### 5. 注意事项

- Kimi 网关 `temperature` 恒为 1，学术任务无法降温；如需更保守输出，在 systemPrompt 中强调「严格基于给定材料，不要发挥」。
- 思考型模型延迟较高（30-75s/次），批量场景用 `researchChatBatch`（concurrency 默认 3）。
- 所有 LLM 调用失败会自动 fallback GLM（当前 GLM Key 失效，fallback 等于无），日志中出现 `provider zhipu failed` 属预期。

---

## 五、运维备忘

- 停止服务器：`taskkill //PID <dev PID> //F //T`（勿留后台进程）
- 数据库：`prisma/dev.db`（SQLite），迁移用 `"<node路径>" node_modules/prisma/build/index.js db push`
- 本手册由「千界花园拯救工程师」自动生成，实测记录均为真实请求/响应。
