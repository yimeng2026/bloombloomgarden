# 可验证数学对抗：素数四元组证书

日期：2026-11-06

## 结论与范围

本次是**已知答案的机器可验证数学实验**，不是新定理、新数学发现或通用模型排行榜。

在闭区间 `[1000024262, 1000026260]` 内，独立程序确认以下四个数均为素数：

`1000025261, 1000025263, 1000025267, 1000025269`

GPT‑5.5 与 Claude Opus 5.5 曾在不同轮次各自构造出这个有效证书。由于所有轮次都有至少一个模型调用失败或超时，**没有全场总冠军**。`winners` 字段只表示该轮有效证书持有者，不表示稳定的模型能力排名。

## 实际使用的花园能力

- 竞赛：`POST /api/research/competitions` 创建竞赛，`.../competitors` 添加真实模型，`.../rounds` 使用 `mode="certificate"`。
- 蜂群：三名构造者独立工作，Kimi 编码通道和 GPT‑5.5 作为两名反方评审。
- 多 Provider：Kimi 原生通道负责反方，RelayRouter 调度 K3.1 Pro、GPT‑5.5 和 Claude。
- 确定性验证：独立于模型的试除程序、最小因子、算法名称和每个数的平方根上限。
- 成本与故障分账：原始回答、供应商、模型、结束状态、tokens、延迟、错误与评审全部保存。

旧竞赛的模拟内容、随机分数、长度估分和模型投票没有进入本次判定。

## 三轮真实记录

| 记录 | Kimi 角色 | OpenAI GPT‑5.5 | Claude Opus 5.5 | 状态 |
|---|---|---|---|---|
| `bde64f99-e1e6-477e-9f6c-ca82ee7223a2` | 小预算导致空正文，未完成 | 小预算导致空正文，未完成 | 候选四项均非素数，0 分 | 部分完成 |
| `dd00eec6-59df-4bf4-8c3f-452c274be49c` | 6144 tokens 时有 6141 用于推理，空正文，未完成 | 有效证书，10 分 | 后续三个数的最小因子为 383、31、7，0 分 | 部分完成 |
| `06822922-0c6d-4b49-9200-feb4125f7c07` | 改用 K3.1 Pro，但本次调用超时，未完成 | 四个数的最小因子分别为 13、139、17、53，0 分 | 有效证书，10 分 | 部分完成 |

另一次 K3.1 Pro 单独诊断曾给出同一有效候选，说明“通道是否完成”和“数学答案是否正确”必须分开记录。不能把一次成功或一次失败推广成稳定的模型优劣。

## 预算诊断与修复

初次 `maxTokens=1200` 时：

- GPT‑5.5 返回 `incomplete:max_output_tokens`，正文长度 0，输出 1200 tokens。
- Kimi 编码通道返回 `length`，正文长度 0；1200 个输出 tokens 中 1197 为推理 tokens。

提高到 6144 后，Kimi 编码通道仍以 `length` 结束，6141 个输出 tokens 用于推理，正文仍为 0。由此改为角色适配：K3.1 Pro 尝试数学构造，Kimi 编码通道保留反方复核，而不是无限增加预算。

最终数学角色的限制：

- 构造：`maxTokens=6144`，每次调用最多 120 秒，外部 Provider 一枚密钥一次尝试。
- 反方：`maxTokens=2400`，每次调用最多 90 秒，一枚密钥一次尝试。
- 构造并发上限 3；原生 Kimi 在该竞赛中不隐式执行多次重试。
- 其他研究场景仍保留正常的多密钥故障转移。

这些设置是工程预算，不是数学真理层级，也不是“花得越多越正确”的证据。

## 独立验证与审计字段

验证器使用 `trial_division_to_sqrt`：

1. 检查候选是安全整数并处于原始闭区间。
2. 检查 2 的因子，再检查从 3 到 `floor(sqrt(n))` 的奇数因子。
3. 合数记录 `smallestFactor`，每个数记录 `trialDivisionLimit`。
4. 只有四个数都通过才给 10 分，其余为 0 分；错误与截断明确标为未完成，不能解释成数学反证。

验证覆盖的是**候选数值及区间归属**，不证明模型声称的筛选过程确实执行过，也不证明最小性、穷尽性或唯一性。模型反方意见同样可能有算术错误，不能改变机器判定。

`rechecks.json` 对三轮中的五份证书进行了离线复算：3 个原始记录、5 份证书，全部保持原有判定和分数，未调用模型，未覆盖原始回答或评审。

## 结果文件

- 原始三轮：`data/math-tournaments/<tournament-id>.json`
- 最近摘要：`data/math-tournaments/latest-summary.json`
- 离线复算：`data/math-tournaments/rechecks.json`
- 引擎：`src/lib/math-tournament.ts`
- 竞赛接入：`src/app/api/research/competitions/[id]/rounds/route.ts`
- 结果读取：`GET /api/research/math-tournaments/:id`

所有 `/api/*` 仍要求独立的 `GARDEN_AGENT_TOKEN` 鉴权，不能使用出站模型密钥代替。

## 可复现命令

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/provider-pool.test.mjs tests/math-tournament.test.mjs tests/protocol-review-status.test.mjs
node --experimental-transform-types --import ./tests/register-ts.mjs tools/reverify-math-records.mjs
```

以下命令使用真实付费模型，并创建后清理独立临时数据库：

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs tools/run-math-competition-live.mjs
```

运行前检查 `.env.local` 中的模型配置和预算，不要把密钥写入命令行或报告。下一轮应增加不同数学证书类型与重复试验，而不是挑选一次成功宣称稳定领先。
