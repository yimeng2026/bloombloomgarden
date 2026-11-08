# 第一陈数连续整数值不变性：证明与公理审计

**日期**：2026-11-08

**状态**：独立模型、组合补丁、公理审计及补丁应用一致性验证通过

**范围**：连续整数值函数在闭区间两端的不变性，不是完整能隙微扰理论

> 本文记录连续整数不变性批次的实际验证。后续总陈数工作已把统一复现入口扩展为十二阶段、schemaVersion 3；当前结果见 `TOTAL_CHERN_NUMBER_LEAN_AUDIT_2026-11-08.md`，下文的十一阶段和 schemaVersion 2 是该批次的历史证据。

## 1. 实际证明的命题

设 `C : ℝ → FirstChernNumberModel (L := L)`，并假设

```lean
Continuous (fun t : ℝ => (C t).value)
```

则

```lean
(C 0).value = (C 1).value
```

证明使用 `IsLocallyConstant.iff_continuous` 将到离散整数空间的连续映射转换为局部常数映射，再以 `isPreconnected_Icc` 和 `IsLocallyConstant.apply_eq_of_isPreconnected` 得到区间 `[0,1]` 两端值相等。

原 `FirstChernNumber_TopologicalInvariance` 只有 `True := by trivial`。组合补丁将其替换为同一受限命题，并把 `FirstChernNumberModel` 改为补丁内的 `FirstChernNumber`。结论比较整数值，不声称两个完整模型结构相等。

## 2. 失败先行与根因处理

候选证明先以 `exact hval` 编译，实际失败为连续性证据不能直接充当端点相等证据。补入局部常数与预连通论证后，编译器留下区间端点 metavariable；将集合显式固定为 `Set.Icc (0 : ℝ) 1` 后，候选证明通过。没有使用 `sorry`、新 `axiom` 或另一个空命题绕过失败。

补丁生成器先由回归测试确认缺失时失败。测试随后修正了两处测试自身问题：子进程输出显式使用 UTF-8；unified diff 中未改名的定理声明是上下文行，因此改为断言新增的连续性前提、端点相等结论和删除的 `True` 占位行。

## 3. 交付文件

- `FirstChernNumberInvariance.lean`：独立模型定理。
- `first-chern-invariance.patch`：从外部原文件直接生成结构修复与受限不变性的组合补丁。
- `prepare_first_chern_invariance_patch.py`：确定性提取定理并生成补丁。
- `test_prepare_first_chern_invariance_patch.py`：补丁内容与差异回归测试。
- `verify-first-chern-number-lean.ps1`：扩展为完整复现入口。
- `first-chern-number-lean-audit.json`：结构化结果，schemaVersion 2。

外部 TOE-SYLVA 源树保持只读；本仓库提供证明和补丁，不表示外部项目已合入。

## 4. 完整验证命令与实际输出

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-first-chern-number-lean.ps1 `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\chern-invariance-verification' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\first-chern-number-lean-audit.json'
```

实际退出码：**0**。Python 输出为 `Ran 1 test ... OK`。`bloch`、`connection`、`identity`、`law`、`l2`、`originalCurvature`、`model`、`invariance`、`standaloneAudit`、`patched`、`patchedAudit` 十一个阶段均为 **0**。

原结构补丁仍为 174 行；组合补丁为 236 行，修补后文件为 463 行。两份补丁的重新生成哈希一致，`git apply --check` 与实际应用均通过，应用结果与生成源文件逐字一致。

五条原始公理输出为：

```text
'BerryCurvature.FirstChernNumber_Integrality_model' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.zeroFirstChernNumberModel' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.FirstChernNumber_TopologicalInvariance_model' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.FirstChernNumber_Integrality' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.FirstChernNumber_TopologicalInvariance' depends on axioms: [propext, Classical.choice, Quot.sound]
```

`forbiddenPlaceholderOrNewAxiom=false`，没有 `sorryAx` 或新增自定义公理。原文件的既有命名空间和未使用变量警告保留，没有用关闭 linter 掩盖。

## 5. 结论边界

- 已证明的是：若整数值族连续，则其在 `t=0` 与 `t=1` 的值相同。
- 未证明：从任意曲率数据自动得到陈数整数性；从能隙保持推出 Berry 曲率或整数值连续；完整陈类拓扑；一般能隙微扰理论。
- 其他 `True` 占位、完整外微分和全库 Lake 构建仍未完成。本证明不把这些开放项写成已解决。
