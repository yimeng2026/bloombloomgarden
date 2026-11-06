# 物理直觉引擎：证据、边界与混合式实现设计

日期：2026-11-06
状态：已确认混合路线，待书面规格复核
项目：千界花园／物理直觉与数学工具接口
配套续写：`research/physical-intuition/MATH_PHYSICS_WORLDVIEW_2026.md`

## 1. 目标

建立一个可按研究任务生成、筛选和校准“候选物理直觉”的程序。系统应输出数学结构、潜在物理用途、证据、反例、未知字段和下一项判别实验，而不是只生成漂亮回答。

本设计的核心承诺是：

> 在理论名称定型之前，扩大候选数学结构的搜索；在物理映射成立之前，提前暴露其假设、反例和验证成本。

成功标准不是“最像某位评论者”，而是以下可测结果：

- 候选结构及其用途可以被独立复核；
- 硬约束失败不会被模型评分覆盖；
- 无数据、缺基线、缺观测量和证据矛盾会显式暴露；
- 数学验证与物理验证分轨，所有输出保持 `evidenceUpgrade=false`；
- 同一输入的确定性核心产生相同候选和检查状态，且不修改输入；
- 模型、教师、学生和真实评论者之间不存在冒充关系。

## 2. 非目标

- 不声称已经获得“最好的物理直觉”或统一物理理论；
- 不制造 wa9527we、沧海红尘或任何真实用户的人格克隆；
- 不把公开主页摘要、双方回信或教师生成文本当成实验事实；
- 不把形式证明等同于物理证实，不把数值拟合等同于自然定律；
- 不在首个实现阶段训练学生模型、下载大型权重或发起批量付费调用；
- 不把多模型一致意见当成独立验证；
- 不允许任意字符串作为代码执行，候选表达式只能使用显式类型化检查。

## 3. 总体架构

采用“确定性核心优先、模型适配器后置”的混合架构：

```text
研究任务包
  → 证据与基线登记
  → 候选结构生成（模板／后续模型）
  → 确定性约束检查
  → 双方法规则复核
  → 数值／形式验证（按需）
  → 直觉卡、判别实验、校准状态与输入哈希
  → 后续独立模型复核与蒸馏数据准备
```

核心不变量：

1. 提议不自动成为证据；
2. 数学验证不自动成为物理验证；
3. 历史用途不自动证明当前用途；
4. 模型评分不覆盖硬约束失败；
5. 任何生成、复核或更正都不覆盖历史记录。

## 4. 文件与职责

### 4.1 首批确定性实现

| 文件 | 单一职责 |
|---|---|
| `src/lib/physical-intuition/types.ts` | 任务包、证据、结构卡、候选卡、检查报告和状态类型 |
| `src/lib/physical-intuition/structure-registry.ts` | 内置数学结构卡及读取，不包含生成逻辑 |
| `src/lib/physical-intuition/candidate-generator.ts` | 从触发线索和模板生成候选，不调用模型 |
| `src/lib/physical-intuition/constraint-checks.ts` | 量纲、概率、矩阵对易、基线、数据与数值检查 |
| `src/lib/physical-intuition/method-critics.ts` | `evidence_skeptic` 与 `theory_gardener` 的确定性批评规则 |
| `src/lib/physical-intuition/evaluate.ts` | 组合任务包、候选、检查和批评，计算输入哈希 |
| `src/app/api/research/physical-intuition/structures/route.ts` | 只读结构卡列表 |
| `src/app/api/research/physical-intuition/evaluate/route.ts` | 接收任务包并返回确定性评估，不写研究事实 |

`.mjs` 测试可以直接导入 TypeScript 库与 Next 路由。新增路由后运行操作目录生成器，目录应增加两个操作。

### 4.2 后续适配器

- `model-proposal.ts`：使用现有 ProviderPool／researchChat 提议候选，实际返回与结束状态留痕；
- `symbolic-checks.ts`：接入 CAS、数值工具或 Lean，保留脚本、版本和原始结果；
- `intuition-audit.ts`：复用规范序列化思路，保存任务包、输出、算法版本、复核和人工更正；
- `distill-prepare.ts`：仅将通过来源与确定性审查的方法卡转成训练样本。

这些文件不属于首批实现，不能在完成其独立测试前宣称存在。

## 5. 数据模型

### 5.1 证据与状态

```ts
type EvidenceRole = "observation" | "reconstruction" | "interpretation" | "context" | "lead";
type MathCheckStatus = "proposal" | "quick_checked" | "computed" | "formal_verified" | "independently_reviewed";
type PhysicalCheckStatus = "analogy" | "compatible" | "out_of_sample_supported" | "discriminating_supported" | "independently_reproduced";

interface EvidenceLink {
  id: string;
  role: EvidenceRole;
  sourceUrl?: string;
  locator: string;
  note?: string;
}
```

`sourceUrl` 仅允许 HTTP(S)。没有来源的观察性描述只能作为用户声明，不能自动成为已核验观察。

### 5.2 研究任务包

```ts
interface IntuitionTask {
  taskId: string;
  title: string;
  objective: string;
  observables: Array<{ name: string; unit?: string; dimension?: DimensionVector }>;
  constraints: Constraint[];
  baseline: { name: string; description: string } | null;
  evidence: EvidenceLink[];
  data?: {
    origin: "user" | "public" | "synthetic";
    trainAvailable: boolean;
    holdoutAvailable: boolean;
    samplingNote?: string;
  };
  triggers?: {
    noncommutative?: boolean;
    oscillatory?: boolean;
    relationalNetwork?: boolean;
    noisyMeasurements?: boolean;
    discreteOrder?: boolean;
  };
  numericChecks?: {
    matrices?: Array<{ name: string; values: number[][] }>;
    probabilities?: number[];
  };
}
```

`taskId` 使用与现有研究 ID 一致的安全格式。`objective`、`observables` 和 `baseline` 是实质必填项；`baseline=null` 表示明确登记“没有基线”，而不是静默遗漏。`dimension` 使用有理指数向量，不用字符串解析物理公式。

### 5.3 直觉卡

```ts
interface IntuitionCard {
  candidateId: string;
  structureKey: string;
  statement: string;
  triggerRationale: string;
  possibleUses: Array<{
    label: string;
    status: "historical" | "candidate" | "analogy" | "rejected";
    rationale: string;
  }>;
  baselineDifference: string;
  checks: CheckResult[];
  unknowns: string[];
  counterexamples: string[];
  nextDiscriminatingTest?: string;
  sourceEvidenceIds: string[];
  mathStatus: MathCheckStatus;
  physicalStatus: PhysicalCheckStatus;
}
```

所有候选默认 `proposal/analogy`。只有真实检查器返回的证据才能改变对应状态，而且只改变该检查的作用域，不写全局 `evidenceUpgrade=true`。

## 6. 内置结构卡与候选生成

首批内置模板：

- `matrix_states`：状态数组、跃迁、矩阵乘法、非对易与谱；
- `hamiltonian_dynamics`：能量形式、对称性、守恒量和演化；
- `sparse_symbolic_dynamics`：稀疏表达式、数据驱动候选动力学；
- `causal_poset`：离散偏序、因果链、集合与映射；
- `relation_graph`：节点、连接、边界、图不变量和网络动力学；
- `symmetry_invariants`：对称、守恒、群作用和不变量。

生成器只根据 `triggers` 选择模板并保留全部常规基线。`noncommutative` 可提示 `matrix_states`，但输出必须是“数组与非对易结构可能有用”，不能写成“该系统必然服从矩阵量子力学”。`oscillatory` 可提示 `hamiltonian_dynamics` 和 `sparse_symbolic_dynamics`。`discreteOrder` 可提示 `causal_poset`，`relationalNetwork` 可提示 `relation_graph`，`noisyMeasurements` 可提示概率与校准结构。

候选 ID 由 `taskId + structureKey + baselineKey` 确定性计算；相同输入不依赖时间或模型随机性。每个候选保留 `baselineDifference`，避免把已有基线的换名当成新增机制。

## 7. 确定性检查器

### 7.1 任务完整性

- 缺少目标、观测量、基线声明、证据角色或有效 ID 时拒绝；
- `baseline=null` 产生 `missing_baseline` 警告，不禁止结构探索；
- 无数据时设置 `explorationOnly=true`，禁止任何 `data_driven` 表述；
- 声称数据驱动时要求数据来源、训练可用性和独立留出说明；
- 只有 `synthetic` 数据时必须在输出显著标注，不能写成真实观测发现。

### 7.2 量纲向量

`DimensionVector` 使用长度、质量、时间、电流、热力学温度、物质的量，以及显式自定义轴的有理指数。加和只允许同向量；乘除按指数加减；若用户提供不兼容量纲则返回 `dimension_mismatch`，不猜测单位换算。

### 7.3 概率与数值

- 所有数值必须 `Number.isFinite`，拒绝 NaN／Infinity；
- 概率必须非负，归一化误差使用显式容差，不擅自把缺失概率补成均匀分布；
- 矩阵必须矩形且维数一致，拒绝空矩阵、非矩形和维数不匹配；
- 对易检查计算 `AB-BA`，使用显式容差，输出残差矩阵和 `maxAbs`，不把浮点近似写成精确零。

### 7.4 方法规则批评

`evidence_skeptic` 根据缺失字段生成问题：

- 结论是否偷含前提？
- 当前批评针对总命题、理论族还是具体成分？
- 是否有可执行的否决条件？
- 原始观察、重建和诠释是否分开？
- 辅助假设是否也接受独立检查？

`theory_gardener` 根据候选生成发展任务：

- 能否写出最小定义和基本关系？
- 数学事实、历史类比和新增假设分别是什么？
- 能否连接到已有理论谱系并指出差异？
- 是否有负结果、近 miss 和下一项可判别实验？
- 是否把宏大命题拆成可以失败的小命题？

规则输出只是复核建议，不冒充真实用户，也不改变证据状态。

## 8. HTTP 接口

### 8.1 `GET /api/research/physical-intuition/structures`

返回内置结构卡及其历史／候选／类比／否决用途标签。无用户写入，始终 `evidenceUpgrade=false`。

### 8.2 `POST /api/research/physical-intuition/evaluate`

接收一个 `IntuitionTask`，返回：

```text
requestId=taskId
cards
issues
explorationOnly
audit
  algorithmVersion=physical-intuition/v1
  inputHash=<SHA-256 canonical task JSON>
evidenceUpgrade=false
boundaries
```

无效输入返回 400，路由异常不伪造候选。首版不写数据库或研究事实；操作目录按 POST 保守标为写权限，即使实现只做计算。

## 9. 后续模型与蒸馏接口

### 9.1 模型提议

- 模型只补充候选，不能修改硬检查；
- 保存 provider、model、finishReason、usage 和原始意见；
- 截断、空内容和失败为 `partial`，不得当成完整复核；
- 多模型结果不视为独立证据，需经过相同来源与数值检查。

### 9.2 方法蒸馏

只使用来源明确的方法卡、负结果和修订历史：

1. 保存链接、作者、日期、摘录、许可和回复关系；
2. 抽取证据批评、结构生成和修订规则；
3. 教师生成候选与反例，保留真实返回；
4. 去重、来源核验、硬约束、泄露和矛盾过滤；
5. 通过者才可进入学生训练，按问题族和时间隔离评测。

当前不抓取完整主页，不声称完成人格蒸馏，不将模仿语气作为验收指标。

## 10. 测试与验收

### 10.1 首批测试

1. 缺目标、观测量、基线声明或非法 ID 被拒绝；
2. `baseline=null` 只产生警告，不伪造基线；
3. 非对易线索产生矩阵结构卡，并明确候选而非事实；
4. 无数据时 `explorationOnly=true`，输出不含数据驱动结论；
5. 合成数据显著标注，不能冒充真实观测；
6. 不兼容量纲、NaN、Infinity、负概率、非矩形矩阵被拒绝；
7. 对易残差和容差保留，不能把近似零写成严格零；
8. 双方法批评返回可执行问题，不包含人格化身份声称；
9. 相同输入输出一致，原任务包不被修改；
10. 结构 GET、评估 POST、非法请求 400 和 `evidenceUpgrade=false` 正确；
11. 确定性核心不发起模型调用。

### 10.2 项目回归

完成后运行全部 Node／协议测试、项目单测、TypeScript、ESLint、生产构建、端到端场景和操作目录检查。全部新功能遵循测试先行：先看到功能缺失导致的失败，再写生产代码。

### 10.3 阶段验收

- A 阶段：确定性结构卡、候选生成和硬检查通过；
- B 阶段：真实模型提议和双方法复核可重放，失败与成本完整；
- C 阶段：有前瞻校准结果和许可完备的数据集；
- D 阶段：学生模型与基线、教师及独立评审比较后，才可讨论能力升级。

## 11. 安全、许可与隐私

- 真实密钥只保留在现有 Git 忽略配置，不进入任务包、日志、审计或训练数据；
- 不执行任意表达式或用户提交代码；
- 结构生成限制为显式模板和类型化数值检查；
- 公开文本只保存完成任务所需的链接、定位与必要摘录，不将完整关注、收藏或私人内容写入长期数据；
- 公开模型、数据和算法逐项记录许可、版本与修改；
- 不把真实用户姓名用于模型身份，方法模板只用 `evidence_skeptic` 和 `theory_gardener`；
- 输出必须包含“候选不是结论、当前不是统一物理理论”的边界。

## 12. 完成定义

本设计只有在以下条件全部满足时才进入后续模型蒸馏：

- 确定性候选与检查器全部通过测试；
- 现有项目回归无新增失败；
- 真实模型提议可审计，截断与失败不会被升级；
- 前瞻校准有冻结输入、独立结果和完整失败记录；
- 数据许可和来源覆盖清单经复核；
- 学生训练与评测没有数据泄漏、人格冒充或虚构研究结论。

最终目标是把物理直觉变成**可生成、可比较、可否证、可校准和可教学的公共技术**，而不是一个永远正确、不可质疑的自动化灵感权威。
