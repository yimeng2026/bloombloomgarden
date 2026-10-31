# 长文生成、分段续写与检查点

## 输出预算不是单次承诺

花园把总产出预算上限设为 **100,000,000 token（1 亿）**，但这不是模型单次能够返回 1 亿 token 的承诺。实际输出仍受模型能力、服务端限额、网络、费用和上下文长度约束；超过这些限制时必须报错或恢复，不得伪造成功。

| 参数 | 含义 | 默认 / 上限 |
|---|---|---|
| `totalOutputBudget` | 当前生成任务的总预算 | 默认和最大均为 100,000,000 |
| `targetOutputTokens` | 本次整篇产物的目标预算，不是必须填满的字数 | 默认等于单段额度 |
| `maxTokens` | 单次模型请求额度；兼容旧调用 | 默认 12,288，应用层最多 100,000,000 |
| `segmentMaxTokens` | 分段生成时每段额度 | 默认 12,288，可覆盖 `maxTokens` |
| `timeoutMs` | 单次请求等待时间 | 1,000–3,600,000 ms |
| `maxRetries` | 单段失败后的重试次数 | 默认 2；设为 0 可禁用自动重试 |
| `resume` | 是否按证据指纹续跑缺失段 | 默认 `true`；`false` 明确重跑 |

## 分段与恢复

`generateManuscriptInSegments` 采用“分段生成—按序归并—逐段保存”的方式：

1. 计算 `segmentCount = ceil(targetOutputTokens / segmentMaxTokens)`。
2. 每次只生成当前缺失段，后续段携带已完成文本，要求避免重复。
3. 每段成功后以临时文件加原子重命名保存检查点。
4. 检查点记录计划、证据指纹、每段内容、完成时间、用量和完成原因，不保存 API Key。
5. 只有 `pipelineId`、`stageId`、主题、目标模块、原始证据和生成计划全部一致时才恢复；证据变化会生成新指纹，不混用旧稿。
6. 失败不会把已完成段标记为完成，也不会把空段或错误文本拼入终稿。
7. 最终用量为各段实际返回值的合计；不会为了凑预算自动补写无意义文字。

默认检查点目录为 `data/manuscript-checkpoints/<pipelineId>/<stageId>.json`，可用 `MANUSCRIPT_CHECKPOINT_DIR` 或测试专用 `checkpointRoot` 修改。生产调用不允许由请求体指定任意目录。

## 调用示例

兼容原来的单段长文：

```json
{
  "autoGenerate": true,
  "topic": "跨库证据链",
  "previousContent": "只允许使用给定证据",
  "maxTokens": 12288,
  "timeoutMs": 600000,
  "maxRetries": 0
}
```

总预算较大的分段任务：

```json
{
  "autoGenerate": true,
  "topic": "长篇技术综述",
  "previousContent": "只允许使用给定证据",
  "totalOutputBudget": 100000000,
  "targetOutputTokens": 1000000,
  "segmentMaxTokens": 12288,
  "timeoutMs": 600000,
  "maxRetries": 0,
  "resume": true
}
```

`targetOutputTokens=100000000` 且使用默认 12,288 分段时，计划为 **8,138 段**；这是容量计算，不是已经执行或免费生成的承诺。`maxTokens=100000000` 会把该额度交给单次模型请求，是否接受由上游决定，不应作为长文工作流的首选。

## 质量与验收边界

- 检查点证明的是执行进度，不证明文本科学正确。
- 阶段评分仍是原有文本启发式，不等于真实同行评议。
- 长文必须经过来源、数值、引用、重复内容和证据边界审查。
- 未完成段、超时、空响应和上游拒绝不得写成“全部生成成功”。
- 现有 `idea / outline / draft / review / revision / final / publish` 阶段保持兼容。

## 开源模式来源

实现参考而非整段复制：LangChain 的 map/reduce 与递归归并、LangGraph 的检查点和 pending writes、Vercel AI SDK 的 continue steps。详见根目录 `NOTICE.md`。
