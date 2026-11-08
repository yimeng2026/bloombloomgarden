# Bloch 态的 L2 精炼、归一化与规范律审计

**日期**：2026-11-08
**状态**：L2 精炼结构、积分归一化与规范律均编译、公理审计通过；外部 TOE-SYLVA 源树未修改
**范围**：带显式一致性和归一化证据的 L2 精炼，不是从旧 `Prop` 自动构造 Bloch 态

## 1. 映射结构

`BlochL2State` 同时保存：

- 旧 `NormalizedBlochState`，作为来源记录；
- 实际 `α →₂[μ] ℂ` 向量，作为 Hilbert 态；
- `coherent`：向量代表与旧波函数在测度 `μ` 下几乎处处一致；
- `normalization`：每个动量点满足 `inner(vector k, vector k)=1`。

这避免了旧归一化、内积线性和完备性仅为未约束 `Prop` 的问题，但不假装这些向量和证明能从旧字段免费得到。完整从旧源码构造具体 Bloch L2 态仍是独立任务。

## 2. 两条实际定理

`BlochL2State_normalization_integral` 将归一化写成

\[
\int_a \langle u(a),u(a)\rangle\,d\mu(a)=1,
\]

直接利用 L2 内积的积分定义。

`BlochL2State_gauge_transformation_law` 将一般 Hilbert 规范律应用于 L2 向量。所需 `IsScalarTower ℝ ℂ (α→₂[μ]ℂ)` 通过 `Subtype.ext` 和底层 `AEEqFun` 的 `smul_assoc` 证明，不再缺失。

## 3. 验证中的问题与处理

- 初始失败确认缺少动量范数、位置可测结构和 L2 标量塔；分别通过共享动量实例、`Position2D=ℝ×ℝ` 的可测实例和底层标量结合律补齐。
- 积分归一化的 rewrite 接口不适用，改为按 L2 内积定义直接 `change` 到归一化字段后通过。
- 复现脚本中的唯一非 ASCII 检查字符被当前 PowerShell 误解码；改为 ASCII 检查项后完整复跑，Lean 证明未改变。

## 4. 最终验证命令与输出

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-bloch-l2-state-lean.ps1 `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\bloch-l2-verification-v3' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\bloch-l2-state-lean-audit.json'
```

实际退出码：**0**。`bloch`、原联络、共享恒等、一般规范律、L2 精炼和公理审计各阶段均为 0。

两条原始公理输出为：

```text
'BerryConnection.BlochL2State_normalization_integral' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.BlochL2State_gauge_transformation_law' depends on axioms: [propext, Classical.choice, Quot.sound]
```

没有 `sorryAx` 或新增自定义公理。`coherentFieldPresent=true`、`normalizationIntegralProved=true`、`oldPropUsedAsProof=false`、`fullOldStateNormalizationFromProp=false`。

## 5. 交付与边界

交付 `BlochL2State.lean`、可复现脚本和 `bloch-l2-state-lean-audit.json`。旧 Bloch 态的归一化构造、具体测度选择、周期性、其他占位和全库 Lake 构建仍未宣称完成。外部 TOE-SYLVA 项目只读，未回写。


## 6. 具体实例补充

后续 `BLOCH_L2_INSTANCE_LEAN_AUDIT_2026-11-08.md` 已用 Dirac 测度和常值波函数实际构造 `constantBlochL2State`。归一化由 `L2.inner_def` 和实际积分计算给出，旧态一致性与实例规范律均通过公理审计，证明 L2 精炼结构可实际实例化并可进入规范理论。
