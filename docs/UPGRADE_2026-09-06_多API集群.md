# 千界花园升级报告：多 API 集群驱动 + 深筛提速

日期：2026-09-06 · 执行：千界花园升级工程师（子代理）

---

## 一、诊断结论：GLM/智谱 key 401 真因

**结论：11 个智谱 key 真实失效，非适配器 bug。**

直连智谱官方端点 `https://open.bigmodel.cn/api/paas/v4/chat/completions` 实测：

| 项 | 结果 |
|---|---|
| key 数量 | 11 个（ZHIPU_API_KEY + GLM51_API_KEY_1..10，其中 ZHIPU_API_KEY 与 GLM51_API_KEY_1 同值） |
| key 格式 | 全部合法（`id.secret` 含点号，长度 49，符合智谱格式） |
| 探测模型 | glm-4-flash（免费层，排除"模型无权限"干扰） |
| 结果 | **全部 HTTP 401**，智谱错误码 `1000 身份验证失败`，响应延迟 56–178ms（到达服务器后鉴权被拒） |

判定依据：URL 为官方端点、请求格式标准、响应延迟极低说明请求确实到达智谱鉴权服务并被拒绝 → key 被吊销/过期。适配器无 bug。

**意外发现并修复：Kimi 网关双重 /v1 bug。** 当前 `KIMI_BASE_URL=https://agent-gw.kimi.com/coding/v1` 已带 `/v1` 后缀，旧代码再拼 `/v1/chat/completions` 产生 `.../v1/v1/chat/completions`（实测 404 `resource_not_found_error`）。已修复 `kimi-gateway.ts`：自动检测并去重 `/v1` 后缀。

## 二、Kimi 网关探针实测（2026-09-06）

| 探测 | 结果 |
|---|---|
| 正确 URL | `{base}/chat/completions`（base 已含 /v1）→ 200 |
| 双重 /v1 | 404 |
| `thinking:{type:"disabled"}` | 400（提示该路径要求 temperature=0.6，弃用） |
| **`reasoning_effort:"none"`** | **200，有效降思考**（微请求 reasoning_tokens 54→18，延迟 3206ms→1477ms） |
| `reasoning_effort:"low"` | 200，轻微降思考 |
| 模型变体 | 网关还服务 `kimi-k2-0905-preview`、`kimi-k2-turbo-preview`（均为思考型，turbo 略快） |
| 并发上限 | **5 路并发 5/5 成功**，总墙钟 6.2s（单请求 2.0–6.2s），网关接受并发 |

## 三、ProviderPool 架构设计

### 借鉴的 GitHub 多代理项目（仅借鉴思想，未复制代码）

| 项目 | 借鉴点 | 落地位置 |
|---|---|---|
| **CrewAI / LangGraph fan-out 最佳实践** | "provider 前方必须有限流闸门，否则 N 个 worker 打爆同一 provider 造成 429 风暴" | `maxConcurrencyPerKey` + `inflight` 并发闸（per-key 信号量） |
| **AutoGen v0.4**（actor 分层 + OpenTelemetry 观测） | 每次调用记录 span（latency/token/error）聚合成可查询统计 | per-key 统计（totalCalls/avgLatency/failCount/lastError）+ `/api/llm-pool/status` 端点 |
| **MetaGPT SOP / CrewAI hierarchical**（分层兜底 + 评审熔断） | 失败计数 → 指数冷却熔断；provider 优先级 failover | key 级熔断器（401→10min，429→30s×2^n 封顶 5min，其他→1s×2^n 封顶 60s，连续 5 次失败标记不健康）+ provider priority 调度 |

### 组件

- **`src/lib/provider-pool.ts`**（新增，约 500 行）
  - `loadPoolFromEnv()`：从环境变量装载 kimi 网关（KIMI_API_KEY+_2.._5）、智谱 GLM（ZHIPU_API_KEY+GLM51_API_KEY_1..10，去重）、Moonshot（MOONSHOT_API_KEY）、通用 OpenAI 兼容端点（`POOL_<ID>_BASE_URL/API_KEY/MODEL`，可无限扩展）
  - 调度：provider 按 priority（kimi=0 最优先）；key 按 (inflight 最少 → 失败最少 → 调用最少) 加权轮询
  - `poolChat()`：跨 key/跨 provider 自动失败转移；`reasoningEffort` 透传
  - `getPoolStatus()`：掩码快照（前 6 位，绝不含原 key）；`probePool()`：主动健康探测（探测成功自动复位熔断）
  - 单例缓存在 `globalThis`（Next 热更新安全）
- **`src/lib/kimi-gateway.ts`**（修复）：双重 /v1 去重
- **`src/lib/research-llm.ts`**（接入）：`researchChat` 优先走池；新增 `reasoningEffort` 字段（深筛流水线建议显式传 `"none"`）；保留旧候选逻辑作池空兜底，**导出签名完全不变，61 路由不受影响**
- **`src/app/api/llm-pool/status/route.ts`**（新增）：GET 快照；`?probe=1` 主动探测；`?reload=1` 重载环境变量

## 四、验收实测数据（dev server，localhost:3101）

| 验收项 | 结果 |
|---|---|
| 池状态端点 | `GET /api/llm-pool/status` → 200；2 providers / 11 keys（kimi×1 + zhipu×10 去重后） |
| 主动探测 | `?probe=1`：kimi-gateway healthy（同时验证双重 /v1 修复生效）；zhipu 探测 401 → 熔断 598s 冷却，状态正确展示掩码与错误 |
| **并发 3 路 /api/chat** | **3/3 成功**，耗时 3.3s/4.2s/3.8s，总墙钟 4.2s ≈ 单请求耗时 → 真并发 |
| **深筛提速**（652 字符学术样段，kimi-for-coding） | baseline 思考全开 **103.5s**（reasoning_tokens=2695）；`reasoning_effort=none` 3 路并发 **48.6/57.1/62.4s，均 56.0s**（reasoning_tokens 1351–2189，3/3 成功）→ **单段提速 1.85×；叠加 3 路并发等效吞吐 ~5×** |
| 既有路由回归 | `/api/research/sylva-sync` GET 200（间接验证 research-llm.ts 编译无误）；构建日志无编译错误 |

注：样段实际 652 字符（计划 2k 但切片偏差）；提速结论按比率外推，2k 字符场景绝对收益更大（baseline 78–260s 高方差主要来自 reasoning_tokens，`none` 直接压缩该部分）。`reasoning_effort=none` 是"大幅降低"而非"完全归零"——复杂提示下仍有千余 reasoning tokens。

## 五、使用说明

### 深筛流水线接入（paper_screen/run_pipeline.py）

千界花园侧已就绪，流水线侧建议：
1. 请求体加 `"reasoning_effort": "none"`（或经 `researchChat({..., reasoningEffort: "none"})`）——单段提速 ~1.85×；
2. 并发度设为 **3**（实测稳定；网关实测 5 路也全通，留安全余量）——吞吐再 ×3；
3. 单段 >2.8k 字符仍建议切分（思考型模型长输入易停滞的既有结论不变）。

### 新增 key / provider

```bash
# .env 追加即可，无需改代码；然后 GET /api/llm-pool/status?reload=1
KIMI_API_KEY_2=sk-kimi-...           # 网关第二通道
POOL_DEEPSEEK_BASE_URL=https://api.deepseek.com
POOL_DEEPSEEK_API_KEY=sk-...
POOL_DEEPSEEK_MODEL=deepseek-chat
```

### 监控

- `GET /api/llm-pool/status`：各通道 healthy / failCount / cooldownRemainingMs / inflight / avgLatencyMs
- `GET /api/llm-pool/status?probe=1`：主动探测并复位熔断

## 六、改动文件清单

| 文件 | 类型 |
|---|---|
| `src/lib/provider-pool.ts` | 新增 |
| `src/lib/kimi-gateway.ts` | 修复（双重 /v1） |
| `src/lib/research-llm.ts` | 修改（池接入 + reasoningEffort） |
| `src/app/api/llm-pool/status/route.ts` | 新增 |
| `scripts/diagnose-keys.mjs` / `probe-kimi-gateway.mjs` / `test-deepscreen-speed.mjs` / `test-chat-concurrent.py` / `start-dev.py` | 新增（诊断/验收脚本） |

## 七、下一步

1. GLM key 续期/更换后无需改代码，池自动装载生效（建议先 `?probe=1` 验证）；
2. 2k 字符整段的提速复测（本次样段 652 字符，按 1.85× 外推）；
3. 并发 5 路以上的边界压测（429 阈值摸底）；
4. `kimi-k2-turbo-preview` 作为深筛备选模型的质量对比（微请求快 ~35%，需验证学术评审质量）；
5. 深筛流水线（Python 侧）实际改造与全量回归。
