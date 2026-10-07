# U/D/A/H 场域健康监控接入千界花园 —— 设计与实测文档

> **日期**: 2026-10-07
> **实现位置**: `src/lib/provider-pool.ts`（U/D/A/H 场域健康监控段）、`src/app/api/llm-pool/status/route.ts`（`field_health` 字段）
> **思想来源**: 李广好生态的"场域健康 H = λᵤU + λᴅD − λₐA + 温度动力学"（生态调研定级 S 级，见 `工作交接文档.md` 生态地图节）。**仅借鉴架构思想，未复制任何代码；全部指标为工程化重定义，不照搬其神秘化部分。**

---

## 一、工程化重定义声明（与李广好原版的对应与区别）

| 李广好原版 | 我方工程化重定义 | 区别说明 |
|---|---|---|
| 场域（Field）概念 | ProviderPool 多 API 集群的运行态 | "场域"落地为可观测对象：全部 provider/key 的滑动窗口事件流 + inflight 计数，无玄学语义 |
| U（健康度） | **Uptime**：各 provider/key 的成功率滑动窗口（默认 10 min，env 可配）；窗口无事件时回退为"健康且未冷却 key 占比" | 纯计数指标，可由状态端点独立复算 |
| D（负载） | **Demand**：D_norm = inflight 总数 / 有效并发容量（Σ 每 provider 有效 per-key 并发 × key 数） | 原版偏现象学描述；我方定义为容量占用率，直接驱动调度 |
| A（异常） | **Anomalies**：滑动窗口内异常事件率，异常分类计数——429 限流 / auth(401/403) / timeout / net / 5xx / **empty 空回复**；另累计熔断跳闸次数 `cbTrips` | 空回复率是我方深筛实战故障（空 SSE）的指标化，原版无此条目 |
| H = λᵤU + λᴅD − λₐA | H = λᵤ·U + λᴅ·D_norm − λₐ·A_norm，系数 env 可配置（`UDAH_LAMBDA_U/D/A`，默认 0.6/0.2/0.4） | 公式同构，但三个输入全部改为归一化工程量（[0,1]），H 的可解释性来自定义而非修辞 |
| 温度动力学 dτ/dt | **并发闸负反馈**：H < `UDAH_H_TIGHTEN`（默认 0.45）→ 全部 provider 的 per-key 并发上限收紧一档（基准 −1，下限 1）；H ≥ `UDAH_H_RESTORE`（默认 0.55）→ 解除 | 用**迟滞带**（tighten/restore 双阈值）防抖动——这是对"温度"类比的控制论工程化：一阶滞后 + 滞环比较器 |

**刻意不照搬的部分**：原版场域话语中不可复算、不可证伪的表述一律不进入实现；我方版本的每一个数字都能由 `/api/llm-pool/status` 响应中的 `totals` 原始计数独立复算（台账可复算原则）。

## 二、实现要点

1. **事件流**：每个 key 携带 `events` 滑动窗口（`{t, ok, anomaly}`，按 `UDAH_WINDOW_MS` 剪枝，>500 条强制剪枝）；`markSuccess`/`markFailure` 路径自动记录，异常在 `markFailure` 内按 status/errMsg 分类（401/403→auth、429→429、≥500→5xx、abort/timeout→timeout）。
2. **空回复指标**：HTTP 200 但 content 与 reasoning 均为空 → 记 `anomaly:"empty"`（调用仍按成功处理）——深筛遇到的空 SSE 故障即归此指标，`totals.emptyReplies` 独立计数。
3. **温度动力学状态机**：`computeFieldHealth()` 即算即得并推进滞环状态（存于 globalThis，Next 热更新安全）；`pickKey` 每次调度前调用一次，开销 O(keys × 窗口)。
4. **有效并发闸**：`getEffectiveMaxConcurrency(p)` = throttled ? max(1, 基准−1) : 基准；状态快照同时暴露 `maxConcurrencyPerKey`（基准）与 `effectiveMaxConcurrencyPerKey`（生效值），**既有字段一律未改，纯增量**。
5. **API 兼容**：`/api/llm-pool/status` 既有响应字段全部保留，新增顶层 `field_health`（probe 与非 probe 路径均有）；75 个 route.ts 零删改、路由数不变。

## 三、配置项（环境变量）

| 变量 | 默认 | 含义 |
|---|---|---|
| `UDAH_LAMBDA_U` / `_D` / `_A` | 0.6 / 0.2 / 0.4 | H 的三项系数 |
| `UDAH_WINDOW_MS` | 600000 | 滑动窗口时长 |
| `UDAH_H_TIGHTEN` | 0.45 | H 低于此值收紧并发一档 |
| `UDAH_H_RESTORE` | 0.55 | H 回升至此值解除收紧（迟滞带） |

默认系数下的语义：空闲健康池 H=0.6（不收紧）；健康池满载 H=0.8；失败/异常率升高使 H 跌破 0.45 才触发收紧。

## 四、实测数据（dev server 验收，2026-10-07）

验收方式：临时 `next dev -p 3199` → 三次取样 → `taskkill /F /T` 停服 → `netstat` 确认端口释放（`PORT_3199_RELEASED`）。

| 取样 | 场景 | U | D_norm | A_norm | H | throttled | 有效容量 |
|---|---|---|---|---|---|---|---|
| T0 | 基线（无调用，10 keys：kimi×1 + zhipu×10） | 1.0 | 0 | 0 | **0.6** | false | 35（5+10×3） |
| T1 | `?probe=1` 真实探测：kimi 成功 + zhipu 首 key 401（auth 异常） | 0.5 | 0 | 0.5 | **0.1** | **true** | — |
| T2 | 探测后再取样 | 0.5 | 0 | 0.5 | **0.1** | true | **24**（4+10×2） |

**温度动力学实测生效**：H=0.1 < 0.45 → 全池 per-key 并发收紧一档，`effectiveConc: kimi-gateway=4/5 zhipu=2/3`，有效容量 35→24，与公式 Σ(max(1, 基准−1) × keys) 逐值吻合。

**类型检查**：`tsc --noEmit` 全量 4 个错误均为改动前既有基线（provider-pool 原有 3 个 TS2352 globalThis 断言 + research-llm 1 个 TS2367），**本次改动新增类型错误为 0**。

**停服确认**：dev server 进程树已 `taskkill /F /T`，`netstat -ano` 无 3199 LISTENING，无后台 Node 残留。

## 五、后续路线（挂号）

- H 时间序列落库（dτ/dt 的真正的"温度曲线"可视化）；
- 收紧档多级化（当前一档，可扩展 notch∈{0,1,2}）；
- 空回复率独立阈值告警（深筛场景的针对性守护）。
