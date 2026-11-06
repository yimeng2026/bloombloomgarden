# Physical Intuition Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic library that converts typed research tasks into candidate mathematical structures, evidence-bound usage labels, hard checks, and review issues without calling a model.

**Architecture:** Small focused modules define and validate tasks, register mathematical structures, generate template candidates, run deterministic checks, and assemble an evaluation with a canonical input hash. No HTTP route, persistence, model call, or student training is introduced by this plan.

**Tech Stack:** TypeScript, Node.js 24 `node:test` and `node:crypto`, existing `canonicalJson`, Next.js project validation.

## Global Constraints

- Worktree: `C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration` (also `D:\kimi-migration\workspace\provider-main-integration`). Run every command from this root.
- Branch: `research/provider-main-integration-20261106`; do not commit directly to `main` and do not deploy.
- Do not use Agent or subagent tools. Execute inline with `superpowers:executing-plans`.
- Follow TDD: write each failing test first, observe the expected failure, then write minimal production code.
- All output keeps `evidenceUpgrade=false`; proposals never become empirical facts merely because a template matches.
- No arbitrary expression execution, model call, network request, HTTP route, large model download, or student training in this plan.
- No data means `explorationOnly=true`. Synthetic data must be visibly labeled and cannot be described as real observation.
- Matrices, dimensions, probabilities, and evidence links are validated with explicit numeric and URL checks. Near-zero commutators are only reported within a tolerance, never as exact zeros.
- `baseline=null` is an explicit user declaration and produces a warning; an absent `baseline` property is invalid.
- Do not stage `.tmp/`, `data/zhihu-invites/`, `.env.local`, real API keys, or public-user full-text archives.
- HTTP routes and real model adapters are separate follow-up plans.

---

### Task 1: Typed Tasks and Structure Registry

**Files:**
- Create: `src/lib/physical-intuition/types.ts`
- Create: `src/lib/physical-intuition/structure-registry.ts`
- Test: `tests/physical-intuition-core.test.mjs`

**Interfaces:**
- Consumes: no production module outside standard library types.
- Produces: `EvidenceRole`, `DimensionVector`, `Constraint`, `IntuitionTask`, `IntuitionCard`, `CheckResult`, `EvaluationIssue`, `assertIntuitionTask`, `listStructureCards`, `getStructureCard`.

- [ ] **Step 1: Write the failing registry and validation tests**

Create `tests/physical-intuition-core.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { assertIntuitionTask } from "../src/lib/physical-intuition/types.ts";
import { getStructureCard, listStructureCards } from "../src/lib/physical-intuition/structure-registry.ts";

export function taskFixture(overrides = {}) {
  return {
    taskId: "oscillation-fixture",
    title: "Synthetic oscillation fixture; not a research result",
    objective: "Compare candidate state representations without claiming a physical discovery",
    observables: [
      { name: "position", unit: "m", dimension: { L: 1 } },
      { name: "time", unit: "s", dimension: { T: 1 } },
    ],
    constraints: [],
    baseline: { name: "linear_ode", description: "A conventional linear oscillator baseline" },
    evidence: [],
    triggers: { noncommutative: true, oscillatory: true },
    ...overrides,
  };
}

test("registry exposes six structured cards with typed usage labels and rejection boundaries", () => {
  const cards = listStructureCards();
  assert.equal(cards.length, 6);
  assert.deepEqual(cards.map((card) => card.key).sort(), [
    "causal_poset",
    "hamiltonian_dynamics",
    "matrix_states",
    "relation_graph",
    "sparse_symbolic_dynamics",
    "symmetry_invariants",
  ]);
  for (const card of cards) {
    assert.equal(typeof card.signature, "string");
    assert.equal(typeof card.baselineDifference, "string");
    assert.ok(card.possibleUses.some((use) => use.status === "candidate"));
    assert.ok(card.possibleUses.some((use) => use.status === "rejected"));
    assert.ok(card.quickChecks.length > 0);
  }
  const matrix = getStructureCard("matrix_states");
  assert.ok(matrix.possibleUses.some((use) => use.label.includes("跃迁"));
  assert.equal(getStructureCard("missing"), undefined);
});

test("valid task declarations preserve an explicit null baseline and validate evidence URLs", () => {
  const task = taskFixture({ baseline: null });
  assertIntuitionTask(task);
  assert.equal(task.baseline, null);
  assertIntuitionTask(taskFixture({
    evidence: [{ id: "paper", role: "context", sourceUrl: "https://example.com/source", locator: "abstract" }],
  }));
  assert.throws(() => assertIntuitionTask(taskFixture({
    evidence: [{ id: "bad", role: "lead", sourceUrl: "file:///secret", locator: "local" }],
  })), /HTTP|HTTPS|sourceUrl/i);
});

test("invalid task essentials are rejected before candidate generation", () => {
  for (const candidate of [
    taskFixture({ taskId: "bad id" }),
    taskFixture({ objective: " " }),
    taskFixture({ observables: [] }),
    taskFixture({ baseline: undefined }),
    taskFixture({ evidence: [{ id: "x", role: "observation", locator: "" }] }),
  ]) {
    assert.throws(() => assertIntuitionTask(candidate), /taskId|objective|observables|baseline|locator/i);
  }
});
```

- [ ] **Step 2: Run tests and verify RED**

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/physical-intuition-core.test.mjs
```

Expected: `ERR_MODULE_NOT_FOUND` for `src/lib/physical-intuition/types.ts` or `structure-registry.ts`.

- [ ] **Step 3: Implement task types and validation**

Create `src/lib/physical-intuition/types.ts`:

```ts
export type EvidenceRole = "observation" | "reconstruction" | "interpretation" | "context" | "lead";
export type MathCheckStatus = "proposal" | "quick_checked" | "computed" | "formal_verified" | "independently_reviewed";
export type PhysicalCheckStatus = "analogy" | "compatible" | "out_of_sample_supported" | "discriminating_supported" | "independently_reproduced";
export type UsageStatus = "historical" | "candidate" | "analogy" | "rejected";
export type DimensionVector = Partial<Record<string, number>>;

export interface EvidenceLink {
  id: string;
  role: EvidenceRole;
  sourceUrl?: string;
  locator: string;
  note?: string;
}

export type Constraint =
  | { kind: "dimension"; left: DimensionVector; right: DimensionVector }
  | { kind: "probabilities"; values: number[]; tolerance: number }
  | { kind: "commutation"; a: number[][]; b: number[][]; tolerance: number }
  | { kind: "note"; text: string };

export interface IntuitionTask {
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
}

export interface UsageLabel {
  label: string;
  status: UsageStatus;
  rationale: string;
}

export interface StructureCard {
  key: string;
  signature: string;
  possibleUses: UsageLabel[];
  baselineDifference: string;
  quickChecks: string[];
}

export interface CheckResult {
  code: string;
  status: "pass" | "warning" | "fail";
  detail: string;
}

export interface IntuitionCard extends StructureCard {
  candidateId: string;
  statement: string;
  triggerRationale: string;
  checks: CheckResult[];
  unknowns: string[];
  counterexamples: string[];
  nextDiscriminatingTest?: string;
  sourceEvidenceIds: string[];
  mathStatus: MathCheckStatus;
  physicalStatus: PhysicalCheckStatus;
}

export interface EvaluationIssue {
  code: string;
  severity: "info" | "warning";
  detail: string;
}

const EVIDENCE_ROLES: EvidenceRole[] = ["observation", "reconstruction", "interpretation", "context", "lead"];

export function assertDimensionVector(value: unknown, field: string): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must be a dimension vector`);
  for (const [axis, exponent] of Object.entries(value)) {
    if (!axis.trim() || !Number.isFinite(exponent)) throw new Error(`${field}.${axis} must have a finite exponent`);
  }
}

export function assertIntuitionTask(task: IntuitionTask): void {
  if (!task || typeof task !== "object" || Array.isArray(task)) throw new Error("Intuition task must be an object");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(task.taskId)) throw new Error("Invalid taskId");
  if (typeof task.title !== "string" || !task.title.trim()) throw new Error("Task title is required");
  if (typeof task.objective !== "string" || !task.objective.trim()) throw new Error("Task objective is required");
  if (!Array.isArray(task.observables) || task.observables.length === 0) throw new Error("At least one observable is required");
  for (const observable of task.observables) {
    if (!observable || typeof observable.name !== "string" || !observable.name.trim()) throw new Error("Observable names are required");
    if (observable.dimension !== undefined) assertDimensionVector(observable.dimension, `observable ${observable.name}.dimension`);
  }
  if (!Array.isArray(task.constraints)) throw new Error("constraints must be an array");
  if (!("baseline" in task) || task.baseline === undefined) throw new Error("baseline must be explicitly declared or null");
  if (task.baseline !== null && (typeof task.baseline.name !== "string" || !task.baseline.name.trim() || typeof task.baseline.description !== "string" || !task.baseline.description.trim())) {
    throw new Error("A named baseline and description are required when baseline is not null");
  }
  if (!Array.isArray(task.evidence)) throw new Error("evidence must be an array");
  for (const evidence of task.evidence) {
    if (!evidence || typeof evidence.id !== "string" || !evidence.id.trim()) throw new Error("Evidence id is required");
    if (!EVIDENCE_ROLES.includes(evidence.role)) throw new Error(`Invalid evidence role: ${evidence.role}`);
    if (typeof evidence.locator !== "string" || !evidence.locator.trim()) throw new Error("Evidence locator is required");
    if (evidence.sourceUrl !== undefined) {
      let url: URL;
      try { url = new URL(evidence.sourceUrl); } catch { throw new Error("Evidence sourceUrl must be valid"); }
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Evidence sourceUrl must use HTTP or HTTPS");
    }
  }
  if (task.data !== undefined) {
    if (!["user", "public", "synthetic"].includes(task.data.origin)) throw new Error("Invalid data origin");
    if (typeof task.data.trainAvailable !== "boolean" || typeof task.data.holdoutAvailable !== "boolean") {
      throw new Error("trainAvailable and holdoutAvailable must be boolean");
    }
  }
}
```

Create `src/lib/physical-intuition/structure-registry.ts`:

```ts
import type { StructureCard, UsageLabel } from "./types";

function uses(candidate: string, historical: string, analogy: string, rejected: string): UsageLabel[] {
  return [
    { label: candidate, status: "candidate", rationale: "仅在当前约束与映射检验成立后，才可发展为候选模型" },
    { label: historical, status: "historical", rationale: "已有理论用途只说明历史经验，不自动覆盖当前问题" },
    { label: analogy, status: "analogy", rationale: "类比可帮助生成假设，但不能替代定义与验证" },
    { label: rejected, status: "rejected", rationale: "该全称推断缺少必要定义或存在明显反例" },
  ];
}

const CARDS: StructureCard[] = [
  {
    key: "matrix_states",
    signature: "以两个状态索引组织的数组、跃迁振幅、乘法和非对易关系",
    possibleUses: uses("跃迁、状态表示与谱候选", "矩阵力学和算符表示", "把数组当作可视化工具", "任何数组或非对易结构都被直接宣布为量子力学"),
    baselineDifference: "从单一经典轨道转向状态与跃迁的代数关系",
    quickChecks: ["矩阵形状", "对易残差", "谱与不变量", "可观测量映射"],
  },
  {
    key: "hamiltonian_dynamics",
    signature: "能量函数、泊松结构、对称性与演化",
    possibleUses: uses("演化与守恒候选", "经典与量子 Hamiltonian 体系", "把能量函数当记账工具", "写出能量函数就宣称必然守恒"),
    baselineDifference: "用能量和对称性补充纯轨迹拟合",
    quickChecks: ["能量残差", "对称性", "极限", "稳定性"],
  },
  {
    key: "sparse_symbolic_dynamics",
    signature: "在显式候选库中寻找稀疏、可读、可拟合的动力学表达式",
    possibleUses: uses("唯象动力学候选", "SINDy 与符号回归", "把表达式当压缩工具", "留出轨迹上的拟合直接称为自然定律"),
    baselineDifference: "以可读稀疏表达式对照黑箱或高阶拟合",
    quickChecks: ["量纲", "留出误差", "候选基", "外推"],
  },
  {
    key: "causal_poset",
    signature: "具有偏序关系的离散事件集、因果链和集合映射",
    possibleUses: uses("离散因果结构候选", "因果集量子引力", "用偏序图组织假设", "画出偏序就证明时空本质离散"),
    baselineDifference: "以离散事件和偏序补充连续时空描述",
    quickChecks: ["偏序公理", "因果链", "连续极限", "Lorentz 映射"],
  },
  {
    key: "relation_graph",
    signature: "节点、连接、边界、图不变量与网络动力学",
    possibleUses: uses("关系与网络候选", "复杂系统与图模型", "把网络图当思维导图", "网络图直接等同于物理因果图"),
    baselineDifference: "用显式关系替代只列变量和方程",
    quickChecks: ["节点与边定义", "边界", "图不变量", "动力学"],
  },
  {
    key: "symmetry_invariants",
    signature: "群作用、对称变换、守恒量与不变量",
    possibleUses: uses("约束与守恒候选", "Noether 结构与普适分类", "把对称性当简化审美", "形式对称必然对应真实物理对称"),
    baselineDifference: "以不变量压缩候选模型，而非仅增加参数",
    quickChecks: ["群作用", "守恒量", "表示", "对称破缺"],
  },
];

export function listStructureCards(): StructureCard[] {
  return CARDS.map((card) => ({ ...card, possibleUses: card.possibleUses.map((use) => ({ ...use })), quickChecks: [...card.quickChecks] });
}

export function getStructureCard(key: string): StructureCard | undefined {
  const card = CARDS.find((item) => item.key === key);
  return card ? { ...card, possibleUses: card.possibleUses.map((use) => ({ ...use })), quickChecks: [...card.quickChecks] } : undefined;
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run the command from Step 2.

Expected: 3 tests pass, 0 fail. The exported fixture does not create another test.

- [ ] **Step 5: Run static checks and commit**

```bash
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js src/lib/physical-intuition/types.ts src/lib/physical-intuition/structure-registry.ts
git add src/lib/physical-intuition/types.ts src/lib/physical-intuition/structure-registry.ts tests/physical-intuition-core.test.mjs
git diff --cached --check
git commit -m "feat: add physical intuition structure registry"
```

Expected: static checks exit 0; only the three files are committed.

---

### Task 2: Candidate Generation, Constraint Checks, and Evaluation

**Files:**
- Create: `src/lib/physical-intuition/candidate-generator.ts`
- Create: `src/lib/physical-intuition/constraint-checks.ts`
- Create: `src/lib/physical-intuition/method-critics.ts`
- Create: `src/lib/physical-intuition/evaluate.ts`
- Modify: `tests/physical-intuition-core.test.mjs`

**Interfaces:**
- Consumes: Task 1 `IntuitionTask`, `StructureCard`, `IntuitionCard`, `CheckResult`, `EvaluationIssue`, `assertIntuitionTask`, `getStructureCard`; existing `canonicalJson`.
- Produces:
  - `generateCandidates(task): IntuitionCard[]`
  - `runConstraintChecks(task): CheckResult[]`
  - `runMethodCritics(task): EvaluationIssue[]`
  - `evaluateIntuitionTask(task)` returning `requestId`, `cards`, `issues`, `explorationOnly`, `syntheticData`, `audit`, `evidenceUpgrade`, `boundaries`.

- [ ] **Step 1: Append failing generation and evaluation tests**

Append to `tests/physical-intuition-core.test.mjs`:

```js
import { evaluateIntuitionTask } from "../src/lib/physical-intuition/evaluate.ts";

test("noncommutative clues yield a matrix candidate without claiming a quantum conclusion", () => {
  const result = evaluateIntuitionTask(taskFixture());
  const matrix = result.cards.find((card) => card.key === "matrix_states");
  assert.ok(matrix);
  assert.equal(matrix.mathStatus, "proposal");
  assert.equal(matrix.physicalStatus, "analogy");
  assert.equal(matrix.statement.includes("必然"), false);
  assert.ok(matrix.possibleUses.some((use) => use.status === "candidate"));
  assert.ok(matrix.nextDiscriminatingTest.includes("对易"));
  assert.equal(result.audit.algorithmVersion, "physical-intuition/v1");
  assert.match(result.audit.inputHash, /^[a-f0-9]{64}$/);
  assert.equal(result.evidenceUpgrade, false);
});

test("missing baseline and absent data produce explicit exploration boundaries and no input mutation", () => {
  const task = taskFixture({ baseline: null });
  const before = JSON.stringify(task);
  const first = evaluateIntuitionTask(task);
  const second = evaluateIntuitionTask(task);
  assert.equal(first.explorationOnly, true);
  assert.ok(first.issues.some((issue) => issue.code === "missing_baseline"));
  assert.equal(first.syntheticData, false);
  assert.equal(JSON.stringify(task), before);
  assert.deepEqual(first, second);
});

test("dimension mismatches and probability normalization failures are visible", () => {
  const dimensionFailure = evaluateIntuitionTask(taskFixture({
    constraints: [{ kind: "dimension", left: { L: 1 }, right: { T: 1 } }],
  }));
  assert.ok(dimensionFailure.cards[0].checks.some((check) => check.code === "dimension_mismatch" && check.status === "fail"));
  const probabilityFailure = evaluateIntuitionTask(taskFixture({
    constraints: [{ kind: "probabilities", values: [0.2, 0.2], tolerance: 1e-9 }],
  }));
  assert.ok(probabilityFailure.cards[0].checks.some((check) => check.code === "probability_not_normalized" && check.status === "fail"));
  const valid = evaluateIntuitionTask(taskFixture({
    constraints: [{ kind: "probabilities", values: [0.2, 0.8], tolerance: 1e-9 }],
  }));
  assert.ok(valid.cards[0].checks.some((check) => check.code === "probabilities_normalized" && check.status === "pass"));
});

test("non-finite values and invalid matrix shapes are rejected rather than hidden", () => {
  for (const constraint of [
    { kind: "probabilities", values: [Number.NaN], tolerance: 1e-9 },
    { kind: "probabilities", values: [-0.1, 1.1], tolerance: 1e-9 },
    { kind: "commutation", a: [[1, 2]], b: [[1, 2]], tolerance: 1e-9 },
  ]) {
    assert.throws(() => evaluateIntuitionTask(taskFixture({ constraints: [constraint] })), /finite|probability|rectangle|matrix/i);
  }
});

test("commutation reports residual and tolerance without declaring an exact zero", () => {
  const result = evaluateIntuitionTask(taskFixture({
    constraints: [{
      kind: "commutation",
      a: [[0, 1], [0, 0]],
      b: [[1, 0], [0, 0]],
      tolerance: 1e-12,
    }],
  }));
  const check = result.cards[0].checks.find((item) => item.code === "nonzero_commutator");
  assert.ok(check);
  assert.equal(check.status, "warning");
  assert.match(check.detail, /maxAbs=1/);
  assert.equal(check.detail.includes("exactly zero"), false);
});

test("synthetic data is labeled and cannot masquerade as a real observational discovery", () => {
  const result = evaluateIntuitionTask(taskFixture({
    data: { origin: "synthetic", trainAvailable: true, holdoutAvailable: true, samplingNote: "fixture only" },
  }));
  assert.equal(result.syntheticData, true);
  assert.ok(result.issues.some((issue) => issue.code === "synthetic_data"));
  assert.equal(result.evidenceUpgrade, false);
});
```

- [ ] **Step 2: Run tests and verify RED**

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/physical-intuition-core.test.mjs
```

Expected: `evaluateIntuitionTask is not a function` or a module export error. Task 1 tests remain green.

- [ ] **Step 3: Implement deterministic candidate generation**

Create `src/lib/physical-intuition/candidate-generator.ts`:

```ts
import { createHash } from "node:crypto";
import { getStructureCard } from "./structure-registry";
import type { IntuitionCard, IntuitionTask, StructureCard } from "./types";

function candidateId(task: IntuitionTask, key: string): string {
  const baseline = task.baseline?.name || "no_baseline";
  return createHash("sha256").update(JSON.stringify([task.taskId, key, baseline])).digest("hex").slice(0, 16);
}

function candidate(task: IntuitionTask, structure: StructureCard): IntuitionCard {
  const tests: Record<string, string> = {
    matrix_states: "对易残差、谱与观测量映射是否与基线产生可区分结果",
    hamiltonian_dynamics: "能量残差、对称性和低阻尼极限是否区别于基线",
    sparse_symbolic_dynamics: "在未参与构造的数据上比较稀疏表达式与基线及高阶拟合",
    causal_poset: "检验偏序、因果链与连续极限是否具有可区分的观测映射",
    relation_graph: "检验图不变量与目标观测之间是否存在可重复关系",
    symmetry_invariants: "检验对称性和守恒量在独立数据或干预下是否保持",
  };
  return {
    ...structure,
    possibleUses: structure.possibleUses.map((use) => ({ ...use })),
    quickChecks: [...structure.quickChecks],
    candidateId: candidateId(task, structure.key),
    statement: `在“${task.objective}”中，${structure.signature}可作为一种候选表示，而非已被证明的物理结论。`,
    triggerRationale: `依据任务触发线索选择 ${structure.key}；其用途仍需通过 ${tests[structure.key]}。`,
    checks: [],
    unknowns: ["候选结构的完整定义、参数、映射和独立证据仍需按任务补齐"],
    counterexamples: [],
    nextDiscriminatingTest: tests[structure.key],
    sourceEvidenceIds: task.evidence.map((evidence) => evidence.id),
    mathStatus: "proposal",
    physicalStatus: "analogy",
  };
}

export function generateCandidates(task: IntuitionTask): IntuitionCard[] {
  const keys: string[] = [];
  if (task.triggers?.noncommutative) keys.push("matrix_states");
  if (task.triggers?.oscillatory) keys.push("hamiltonian_dynamics", "sparse_symbolic_dynamics");
  if (task.triggers?.discreteOrder) keys.push("causal_poset");
  if (task.triggers?.relationalNetwork) keys.push("relation_graph");
  if (task.triggers?.noisyMeasurements) keys.push("sparse_symbolic_dynamics");
  if (keys.length === 0) keys.push("symmetry_invariants");
  return [...new Set(keys)].map((key) => candidate(task, getStructureCard(key)!));
}
```

- [ ] **Step 4: Implement constraint checks**

Create `src/lib/physical-intuition/constraint-checks.ts`:

```ts
import type { CheckResult, Constraint, DimensionVector } from "./types";

function finiteVector(vector: DimensionVector, field: string): void {
  for (const [axis, value] of Object.entries(vector)) {
    if (!axis.trim() || !Number.isFinite(value)) throw new Error(`${field}.${axis} must have a finite exponent`);
  }
}

function dimensionDifference(left: DimensionVector, right: DimensionVector): string[] {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].filter((key) => (left[key] || 0) !== (right[key] || 0)).sort();
}

function dimensionCheck(constraint: Extract<Constraint, { kind: "dimension" }>): CheckResult {
  finiteVector(constraint.left, "left");
  finiteVector(constraint.right, "right");
  const differences = dimensionDifference(constraint.left, constraint.right);
  if (differences.length) return { code: "dimension_mismatch", status: "fail", detail: `不兼容量纲轴：${differences.join("、")}；不执行隐式换算` };
  return { code: "dimension_consistent", status: "pass", detail: "左右量纲向量一致" };
}

function probabilityCheck(constraint: Extract<Constraint, { kind: "probabilities" }): CheckResult {
  if (!Number.isFinite(constraint.tolerance) || constraint.tolerance < 0) throw new Error("Probability tolerance must be finite and nonnegative");
  if (constraint.values.some((value) => !Number.isFinite(value))) throw new Error("Probabilities must be finite");
  if (constraint.values.some((value) => value < 0)) throw new Error("Probabilities must be nonnegative");
  const sum = constraint.values.reduce((total, value) => total + value, 0);
  if (Math.abs(sum - 1) > constraint.tolerance) return { code: "probability_not_normalized", status: "fail", detail: `概率和为 ${sum}，超出容差 ${constraint.tolerance}` };
  return { code: "probabilities_normalized", status: "pass", detail: `概率和在容差 ${constraint.tolerance} 内` };
}

function multiply(a: number[][], b: number[][]): number[][] {
  if (!a.length || !b.length || a.some((row) => row.length !== a[0].length) || b.some((row) => row.length !== b[0].length) || a[0].length !== b.length) {
    throw new Error("Matrix values must be nonempty rectangles with compatible dimensions");
  }
  return a.map((row) => b[0].map((_, column) => row.reduce((sum, value, index) => sum + value * b[index][column], 0)));
}

function commutatorCheck(constraint: Extract<Constraint, { kind: "commutation" }>): CheckResult {
  if (!Number.isFinite(constraint.tolerance) || constraint.tolerance < 0) throw new Error("Commutation tolerance must be finite and nonnegative");
  for (const matrix of [constraint.a, constraint.b]) {
    for (const row of matrix) for (const value of row) if (!Number.isFinite(value)) throw new Error("Matrix entries must be finite");
  }
  const residual = multiply(constraint.a, constraint.b).map((row, i) => row.map((value, j) => value - multiply(constraint.b, constraint.a)[i][j]);
  const maxAbs = Math.max(...residual.flat().map(Math.abs));
  if (maxAbs > constraint.tolerance) return { code: "nonzero_commutator", status: "warning", detail: `maxAbs=${maxAbs}，超过容差 ${constraint.tolerance}；非对易本身不是量子结论，需检查物理映射` };
  return { code: "commutation_within_tolerance", status: "pass", detail: `maxAbs=${maxAbs}，仅在容差 ${constraint.tolerance} 内，不写成严格为零` };
}

export function runConstraintChecks(task: { constraints: Constraint[] }): CheckResult[] {
  return task.constraints.map((constraint) => {
    if (constraint.kind === "dimension") return dimensionCheck(constraint);
    if (constraint.kind === "probabilities") return probabilityCheck(constraint);
    if (constraint.kind === "commutation") return commutatorCheck(constraint);
    if (constraint.kind === "note") return { code: "note", status: "pass", detail: constraint.text };
    throw new Error(`Unknown constraint kind: ${(constraint as Constraint).kind}`);
  });
}
```

- [ ] **Step 5: Implement method critics and evaluation**

Create `src/lib/physical-intuition/method-critics.ts`:

```ts
import type { EvaluationIssue, IntuitionTask } from "./types";

export function runMethodCritics(task: IntuitionTask): EvaluationIssue[] {
  const issues: EvaluationIssue[] = [];
  if (task.baseline === null) issues.push({ code: "missing_baseline", severity: "warning", detail: "未提供常规基线；所有候选必须保留为探索性比较，不能宣称新增机制。" });
  if (task.evidence.some((item) => item.role === "observation" && !item.sourceUrl)) issues.push({ code: "observation_without_source", severity: "warning", detail: "存在没有来源定位的观察性声明，只能视为用户声明。" });
  if (task.data?.origin === "synthetic") issues.push({ code: "synthetic_data", severity: "info", detail: "当前数据为合成材料，只能验证程序行为，不能作为真实观测发现。" });
  issues.push({ code: "evidence_skeptic", severity: "info", detail: "请回答：结论是否偷含前提、批评针对哪一层理论、原始观察与重建诠释是否分离、否决条件能否执行、辅助假设是否也接受检验？" });
  issues.push({ code: "theory_gardener", severity: "info", detail: "请把候选拆成最小定义、数学事实、历史类比和新增假设，并给出负结果、近 miss 与下一项可判别实验。" });
  return issues;
}
```

Create `src/lib/physical-intuition/evaluate.ts`:

```ts
import { createHash } from "node:crypto";
import { canonicalJson } from "./protocol-followup-audit";
import { generateCandidates } from "./candidate-generator";
import { runConstraintChecks } from "./constraint-checks";
import { runMethodCritics } from "./method-critics";
import { assertIntuitionTask, type IntuitionTask } from "./types";

export function evaluateIntuitionTask(task: IntuitionTask) {
  assertIntuitionTask(task);
  const cards = generateCandidates(task);
  const checks = runConstraintChecks(task);
  const evaluatedCards = cards.map((card) => ({
    ...card,
    checks,
    counterexamples: checks.filter((check) => check.status === "fail").map((check) => check.detail),
  });
  const explorationOnly = task.baseline === null || !task.data || !task.data.trainAvailable || !task.data.holdoutAvailable;
  return {
    requestId: task.taskId,
    cards: evaluatedCards,
    issues: runMethodCritics(task),
    explorationOnly,
    syntheticData: task.data?.origin === "synthetic",
    audit: {
      algorithmVersion: "physical-intuition/v1",
      inputHash: createHash("sha256").update(canonicalJson(task), "utf8").digest("hex"),
    },
    evidenceUpgrade: false as const,
    boundaries: [
      "候选结构只是待验证提议，不是数学定理、物理定律或真实观测发现。",
      "历史用途、类比和模型评分不能覆盖硬约束失败，也不能替代独立数据与复核。",
      "数学验证与物理验证分轨；没有数据或独立留出时，仅进行结构探索。",
      "双方法评委是公开材料的方法模板，不代表任何真实用户本人或立场。",
    ],
  };
}
```

- [ ] **Step 6: Run tests and verify GREEN**

Run the command from Step 2.

Expected: 9 tests pass, 0 fail across Tasks 1 and 2.

- [ ] **Step 7: Run complete project verification**

```bash
node --experimental-transform-types --import ./tests/register-ts.mjs --test tests/*.test.mjs
npm test
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js src/lib/physical-intuition
npm run build
node tests/protocol-scenarios-e2e.mjs
node scripts/generate-kimi-operations.mjs --check
git diff --check
```

Expected:

- Existing 80 Node／protocol tests plus 9 new tests: 89 pass, 0 fail.
- Project unit tests: 58 pass, 0 fail.
- TypeScript, ESLint, production build and six end-to-end scenarios pass.
- Operation catalog remains at 455 because no HTTP route is added.
- `git diff --check` exits 0.

- [ ] **Step 8: Review, commit, and push**

```bash
git status --short
git diff -- src/lib/physical-intuition tests/physical-intuition-core.test.mjs
git add src/lib/physical-intuition tests/physical-intuition-core.test.mjs
git diff --cached --check
git commit -m "feat: evaluate deterministic physical intuition candidates"
git push origin HEAD
```

Expected: only the core modules and tests are committed. Temporary data, user-local content and credentials are excluded. Push updates the research branch, not `main`.

## Follow-up Plans Explicitly Outside This One

1. **HTTP structures and evaluate routes:** read-only structure listing, typed POST evaluation, error contracts, and operation catalog updates.
2. **Real model proposal and dual-method review:** actual provider/model/finishReason capture, no authority over hard checks, and append-only audit records.
3. **Calibration and method-data preparation:** frozen forward evaluations, negative examples, license manifests, train/holdout isolation, and no personality cloning.
