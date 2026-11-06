# 跨文档实验方法血缘与可验证证据操作系统

第一阶段，2026-11-06。

## 目标

把“论文报道了什么”“我们从哪里看到它”“它引用了谁”“它能否与另一篇比较”“是否构成独立湿实验”分开。方法血缘不是文本相似度，也不是多模型投票。

## 真实六篇基线

- 文档 6，证据 8，节点 14，描述边 8。
- 两条外部上下文：2016 讲座中的重复参考值、2012 另一项 DTC 研究的 stopped-flow 方法。
- 外部上下文的方法字段可以登记，但不进入目标文献的方法指纹。
- 完整目标方法指纹 0，指纹冲突 0，文档两两比较 15 组全部为 `insufficient`。
- 独立湿实验 0，`evidenceUpgrade=false`。

这与原有计数一致：明确同酯酶方法 1/6、方法不足 5/6、完整协议 0、独立湿实验 0。文档级历史判断和完整方法指纹是不同口径，不能混为一谈。

## 来源角色

| `lineage.kind` | 含义 | 能否进入目标方法指纹 |
|---|---|---|
| `primary` | 目标文献原始材料 | 仅 `verified` 的 `full_text`／`protocol` |
| `citation` | 对早期工作的引用或转述 | 否，需继续追溯原始文献 |
| `curation` | 数据库策划或转录 | 否，不自动构成独立实验 |
| `context` | 其他研究、讲座、外部方法背景 | 否，即使方法写得很完整 |
| `correspondence` | 作者或机构沟通 | 不自动等于全文或协议 |
| `lead` | 待追溯线索 | 否 |
| `unspecified` | 尚未结构化角色 | 否，不猜测 |

`derivedFromEvidenceIds` 只能引用同一任务中已经存在的证据。引用不存在的父节点会被拒绝，避免伪造血缘链。

## 方法字段

`assayFamily`、`instrument`、`substrate`、`readout`、`enzymeSource`、`pH`、`temperature`、`incubation`、`kiCalculation`、`replicates`。

字段只保存原文支持的字符串字面值，不进行跨文献单位换算，不根据常见实验室习惯补值。字段存在多组不同值时标为 `conflict`，字段不足时标为 `insufficient`，完整后才可比较。

- `method_match_candidate`：完整字段一致，但不自动是独立湿实验。
- `method_mismatch`：至少一个明确字段不同。
- `insufficient`：至少一方原始字段不完整。
- `conflict`：至少一方内部存在互相冲突的原始字段。

只有原始、已核验的 `full_text`／`protocol`，并且 `independentWetExperiment=true`，才进入独立湿实验计数。

## 接口与复现

```text
GET /api/research/method-lineage?requestId=ca-six-2026
```

所有 `/api/*` 仍需要 `GARDEN_AGENT_TOKEN` 鉴权。接口只读，不调用模型，不修改证据。

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/method-lineage.test.mjs
node --experimental-transform-types --import ./tests/register-ts.mjs tools/build-method-lineage.mjs
```

生成的静态审计快照：`data/method-lineage/ca-six-2026.json`。独立组件仓库 `garden-widgets` 使用这一快照的导出副本，主应用不内嵌组件代码。

## 下一阶段

1. 对求援得到的原始协议逐字段登记，保留定位与引文。
2. 将方法指纹与活性数值、单位、物种和构建信息连接，不先验合并 Ki／IC50。
3. 增加结构—序列构建对照和真实独立实验链路。
4. 为每个缺口生成精确求援项，而不是再次泛问“有没有全文”。
5. 引入 GraphRAG／本体映射时，仍保留原始证据 ID，语义关系不能替代原始出处。
