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

---

## 扩展：互异单位分数证书与重复试验

### 新题型与判定范围

新增 `egyptian_fraction`：把给定的 `targetNumerator / targetDenominator` 表示为指定项数的单位分数之和。新实验固定为四项、分母在闭区间 `[2,200]` 内，并显式设置 `requireDistinct: true`。

验证器检查：

1. 项数恰好等于 `terms`；
2. 每个分母是安全整数，且处于闭区间内；
3. `requireDistinct` 为真时，分母两两不同；
4. 以任意精度整数累加单位分数，精确比较目标，不使用浮点容差。

累加方式为 `a₀=0, d₀=1`，对每个提交分母 `q` 执行 `a←a q+d`、`d←d q`。最后比较 `a × targetDenominator` 与 `targetNumerator × d`。这里的 `commonDenominator` 是**所有提交分母的乘积，不要求是最小公分母，也不要求约分**。这是合法的精确表示，不是证据错误。

验证证据现在明确包含 `checks`、目标、要求项数、提交项数、闭区间、互异配置、累加分子、分母乘积和两侧交叉相乘结果。`requireDistinct` 类型必须为布尔值。早期没有该字段的记录按当时的默认互异规则复算；显式设为 `false` 时才允许重复分母。

验证仍只覆盖**提交分母列表是否满足约束**，不证明模型声称的构造过程真实执行，也不证明唯一性、最优性、穷尽性或新定理。

### 两轮初测与两轮审计复跑

以下四个记录均由真实花园 API、三名构造者与两名反方生成。每轮有三次构造调用和两次反方调用，四轮共 20 次模型调用，均正常结束；但是“调用正常结束”不代表“最终证书正确”，也不代表反方意见必然正确。

| 阶段 | 目标 | 记录 ID | 调用状态 | 有效证书 |
|---|---|---|---|---|
| 初测 | `1/2` | `2053a817-fa82-47e0-9ad4-6bba5d869df7` | 全部完成 | Kimi、GPT、Claude |
| 初测 | `1/3` | `c959edd6-5606-4f73-b665-22f3b17801a6` | 全部完成 | Kimi、GPT、Claude |
| 审计复跑 | `1/2` | `90676497-f788-42ac-be37-cde90bd04b1e` | 全部完成 | Kimi、GPT、Claude |
| 审计复跑 | `1/3` | `539b4573-3315-40a6-b60c-f26410443597` | 全部完成 | Kimi、GPT；Claude 证书无效 |

复跑 `1/3` 的 Claude 回答正常结束，但其最终 JSON 提交 `[4,18,36,72]`，精确和为 `25/72`，不是 `1/3`，所以为 0 分。它的说明文字后来出现另一组正确构造 `[6,12,18,36]`，却没有更新最终 `denominators`。这证明必须分别审计调用状态、说明文字和最终机器可读证书，不能用一段正确叙述替错误证书背书。

初测反方指出验证摘要没有充分展示项数、互异性和目标绑定。随后增加的显式字段与通分证据正是针对这一审计缺陷，而不是为了提高某个模型分数。前后原始回答与评审均保留，没有只保留有利轮次。

### 对反方意见的独立裁决

反方意见本身也可能有算术错误，不能覆盖确定性验证：

- GPT 反方正确指出 Claude 的最终证书与说明文字不一致，且未提交的替代构造不能为当前证书背书。
- Kimi 反方声称部分 `evidence` 的通分结果错误，实际是把“分母乘积”误当成“最小公分母”，并在手算中把 `1/196` 的展开系数误写为 `8228`；在乘积分母 `1613472` 下，正确的系数是 `8232`。
- 使用独立的 Python `fractions.Fraction` 与 `math.prod` 重算 `[4,14,147,196]`，得到分母乘积 `1613472`、累加分子 `537824`，且 `3 × 537824 = 1613472`，精确和为 `1/3`。原验证证据正确，未按这条误报修改算法。
- 同一独立实现对 `[4,18,36,72]` 得到 `25/72`，交叉相乘为 `194400` 与 `186624`，确认其无效判定。

因此，本轮既有真实的模型证书错误，也有真实的反方误报。机器验证与人工可读审计需要相互校验，任何一方都不能靠身份直接取得数学正确性。

### 离线复算与文件

最终离线复算覆盖 **7 份竞赛记录、17 份证书**，包括此前 3 份素数记录、2 份初测分数记录和 2 份审计复跑记录；所有原始有效性与分数均保持不变。复算不调用模型，也不覆盖原始回答或评审。

- 最新复跑摘要：`data/math-tournaments/egyptian_fraction-repeat-summary.json`
- 全部离线复算：`data/math-tournaments/rechecks.json`
- 原始四轮：上表 ID 对应的 `data/math-tournaments/<id>.json`
- 新题型测试：`tests/egyptian-fraction-tournament.test.mjs`
- 真实重复实验运行器：`tools/run-math-competition-live.mjs`

新题型复现命令：

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/egyptian-fraction-tournament.test.mjs tests/math-tournament.test.mjs
node --experimental-transform-types --import ./tests/register-ts.mjs tools/run-math-competition-live.mjs egyptian_fraction 2
```

第二个命令会使用真实付费模型；重复次数限制为 1–4，非法参数在启动服务和调用模型之前拒绝。临时数据库在结束时清理，临时开发服务也会停止。没有生成用于前端预览的持久服务。

本轮结果仍只是少量已知答案的构造证书实验，不能据此推出模型在一般数学研究、形式化证明或新定理发现中的稳定能力排名。
