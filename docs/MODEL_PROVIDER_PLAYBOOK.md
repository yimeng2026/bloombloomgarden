# 千界花园模型与供应商接入手册

更新：2026-11-06。本文是当前配置与实测记录；旧版救援手册中的历史 GLM 结论不再代表当前活动通道。

## 1. 当前组织方式

活动供应商只有两类，未为了凑数启用第三个供应商：

| 供应商 | 角色 | 当前模型 | 协议 |
|---|---|---|---|
| Kimi 网关 | 代码、形式化、实验方法检查 | `kimi-for-coding` | Chat Completions |
| RelayRouter | 独立语义复核、反方审查、批量初筛 | 按角色选择下表模型 | 按模型选择 Responses 或 Chat Completions |

RelayRouter 密钥属于同一供应商，不是独立供应商，也不自动带来能力或证据独立性。当前活动十枚：原七枚全部保留，另三枚按空槽接入，全部通过 `GET /v1/models`，当前各返回 328 个模型条目。三枚新密钥还分别通过 ProviderPool 的 Responses 真实调用，其中第一枚同时通过 Chat Completions 调用。接入层最多支持十二枚不同密钥并自动去重，但不默认增加研究并发或预算。密钥只在本机被 Git 忽略的 `.env.local` 中，未写入源码或本文。

## 2. 本次真实小样本评测

四个模型使用同一道实验方法血缘审查题，均要求只依据给定记录、返回结构化结果、不得虚构协议。下表是一次实际调用的延迟与服务端返回用量，不是通用排行榜，也不是稳定延迟承诺。

| 模型 | 实测协议 | 延迟 | 输入 / 输出 tokens | 本次观察与用途 |
|---|---|---:|---:|---|
| `gpt-5.4` | Responses | 9046 ms | 130 / 365 | 证据边界完整，可作复杂审查备选 |
| `gpt-5.5` | Responses | 6312 ms | 130 / 327 | 输出简洁且遵守边界，选作反方审查 |
| `claude-opus-5-5` | Chat Completions | 7879 ms | 197 / 269 | 方法血缘和外部方法嫁接审查较清楚，选作血缘复核 |
| `claude-haiku-5-5` | Chat Completions | 2743 ms | 197 / 262 | 字段提取快，但“抑制主张证据不足”的措辞过宽；只作初筛，不单独裁决 |

选型结论：

- 实验方法角色：Kimi，保留既有代码与形式化工作环境。
- 文档血缘角色：`claude-opus-5-5`。
- 反方审查角色：`gpt-5.5`。
- 批量字段提取：`claude-haiku-5-5`，必须经规则检查和必要的人工／强模型复核。
- 数学构造：`kimi-k3.1-pro` 与 GPT／Claude 独立生成候选，Kimi 编码通道做反方；具体证书由独立程序裁决，见 `docs/MATH_TOURNAMENT_2026-11-06.md`。
- 限时数学角色使用 `providerAttempts=1` 和任务级超时，不逐枚密钥重试；其他场景保留正常容错。
- 此结论只覆盖当前任务的小样本。更换研究方向时，用该方向的真实题目重测，不以名称、宣传语或单一跑分代替验收。

真实三角色 API 评审已返回 `kimi-gateway/kimi-for-coding`、`relay/claude-opus-5-5`、`relay/gpt-5.5`，并保留 `evidenceUpgrade=false`。

## 3. 通用配置模板

将 `.env.example` 中所需字段复制到 `.env.local`。不要在仓库、Issue、聊天回复、测试快照或命令输出中填写真实密钥。

```dotenv
POOL_RELAY_BASE_URL=https://api.relayrouter.app/v1
POOL_RELAY_API_KEY=在此本机填写
POOL_RELAY_API_KEY_2=在此本机填写
POOL_RELAY_API_KEY_3=在此本机填写

POOL_RELAY_MODEL=gpt-5.5
POOL_RELAY_API_STYLE=chat_completions
POOL_RELAY_RESPONSES_MODELS=gpt-5.4,gpt-5.5,kimi-k3.1-pro
POOL_RELAY_REASONING_EFFORT=low
POOL_RELAY_REASONING_MODELS=gpt-5.4,gpt-5.5,kimi-k3.1-pro
POOL_RELAY_OMIT_TEMPERATURE_MODELS=claude-opus-5-5,claude-sonnet-5-5,claude-haiku-5-5,kimi-k3,kimi-k3.1-pro
```

通用变量规则：

- `POOL_<ID>_BASE_URL`：端点，可带或不带 `/v1`。
- `POOL_<ID>_API_KEY` 与 `_2` 至 `_12`：同一供应商最多十二枚不同密钥；重复值自动去重，数量不等于推荐并发数。
- `POOL_<ID>_MODEL`：默认模型。
- `POOL_<ID>_API_STYLE`：`chat_completions`（默认）或 `responses`。
- `POOL_<ID>_RESPONSES_MODELS`：同一网关中需要 Responses 的模型列表；设置后按模型覆盖默认协议。
- `POOL_<ID>_REASONING_EFFORT`：`none/low/medium/high/xhigh`，仅对已核实的模型启用。
- `POOL_<ID>_REASONING_MODELS`：限制允许推理强度字段的模型，避免把 GPT 参数误发给 Claude。
- `POOL_<ID>_OMIT_TEMPERATURE_MODELS`：禁止默认和显式 `temperature` 的模型。
- `POOL_<ID>_TEMPERATURE`：只有确认端点支持时才设置；Responses 默认不发送采样参数。

`researchChat({ provider: "relay", model: "gpt-5.5", ... })` 会锁定该供应商。`provider: "kimi"` 使用原生 `kimiChat`，保留集群、工具调用和重试，不经过外部 ProviderPool。其他自定义供应商使用 `POOL_<ID>` 的小写 ID。指定外部角色时不跨供应商静默降级，防止审计记录与模型语义混淆；未指定供应商时始终保留原生 Kimi 行为。旧代码的 `provider:"zhipu"` 在未配置 GLM 时也回退原生 Kimi，不透传旧 GLM 名称。为兼容现有调用，只指定 `model` 而未指定外部供应商时仍由 Kimi 处理；需要外部模型时必须成对指定 `provider` 和 `model`。

当前主分支的原生返回标记为 `provider="kimi"`；早期功能分支已保存的真实评审中有 `provider="kimi-gateway"`，两者是同一 Kimi 网关的历史标识差异，不是两次独立实验。

## 4. 协议映射与限制

### Chat Completions

发送 `model/messages/max_tokens`，保留原有兼容行为。只有未被模型策略排除时才发送 `temperature`；只有策略允许时发送顶层 `reasoning_effort`。

### Responses

- 请求：`model/input/instructions/max_output_tokens`。
- 推理：`reasoning: { effort: ... }`，不是把 Chat 的字段原样搬过去。
- 返回：优先读取 `output_text`，否则拼接 `output[].content[]` 中的 `output_text`。
- 用量：`input_tokens/output_tokens/total_tokens` 映射为花园统一的 `prompt_tokens/completion_tokens/total_tokens`。
- 截断：`incomplete` 与 `incomplete_details.reason` 会进入 `finishReason`，不得把截断文本当成完整结论。

当前适配的是 **OpenAI 兼容 Chat Completions 与 Responses**，不是所有供应商的所有私有协议。RelayRouter 的 Claude Opus 5.5 页面列出 `/v1/messages` 与 `/v1/chat/completions`，未列 Responses，因此花园走 Chat Completions；原生 Anthropic Messages 尚未作为第三种协议实现。流式工具调用、音频、视频、图像生成不由本次文本适配自动获得。

模型名、上下文和输出上限必须以当前端点返回及官方文档为准。本地配置不能把服务端上下文、输出或安全限制改成无限。

## 5. 接入与验收

只读鉴权检查，不产生推理：

```bash
node tools/relay-model-audit.mjs
```

以下命令会产生真实模型计费和研究输出；仅在准备评测时执行：

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs tools/relay-model-audit.mjs --model gpt-5.5 --style chat_completions --effort low --max-tokens 900
```

`--model claude-opus-5-5` 会按本地模型策略走 Chat Completions；`gpt-5.4/gpt-5.5` 会按策略走 Responses。评测正文保存在本地 `.tmp`，不会自动成为证据。

自动测试：

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/provider-pool.test.mjs tests/research-llm-provider.test.mjs
node tests/protocol-scenarios-e2e.mjs
```

覆盖：Responses 请求与返回、嵌套文本、截断、Chat 回归、按模型协议路由、禁止采样、显式供应商锁定、密钥脱敏、完整协议生命周期和证据不升级。

## 6. 安全、故障与证据边界

- `.env*` 已被 Git 忽略，`.env.example` 是例外；提交前仍需检查暂存区。
- 密钥不进入 URL、命令参数、日志或异常输出。上游错误若反射密钥，ProviderPool 会替换为 `[redacted]`。
- 401/403 进入长冷却，429 和网络／服务端错误按策略退避；连续失败触发熔断。一次网络失败不代表密钥永久失效，应区分鉴权、额度和临时连接问题。
- `maxTokens` 同时约束可见输出与可能的推理消耗，预算过小会造成空答或截断。研究长文要分段、设验收点，不能用“无限 token”掩盖成本和上下文限制。
- 三路模型共识不等于实验重复。论坛线索不是全文，发送回执不是送达，作者回复不自动等于完整协议，数据库同值不是独立湿实验。
- 模型输出只能登记为 `review`。证据等级只能由带来源定位、原文片段和核验状态的材料改变。

## 7. 当前项目接口

- `GET /api/llm-pool/status`：查看健康状态与掩码，不返回原始密钥。
- `GET /api/research/scenarios`：六类研究场景。
- `GET /api/research/protocol-requests`：真实求援与证据计数。
- `POST /api/research/protocol-requests/:id/review`：三角色评审；`dryRun:true` 只预览角色和材料，不计费。

下一研究项目是在这些接口之上构建方法指纹、来源派生边和可比性判定，不另起空泛理论题目。
