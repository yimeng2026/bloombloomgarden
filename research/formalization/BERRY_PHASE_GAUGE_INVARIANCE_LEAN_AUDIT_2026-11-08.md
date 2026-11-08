# 闭合区间 Berry 相位规范不变性：证明与全链审计

**日期**：2026-11-08

**状态**：独立模型、增量补丁、分环境公理审计及全链复现通过

**范围**：实参数区间上的 Berry 相位积分，不是一般二维线积分或多值相位绕数定理

## 1. 实际定义与定理

`berryPhaseIntegral` 定义为：

```lean
∫ t in 0..1, berryConnection u t 1
```

其中 `u : ℝ → H` 是复 Hilbert 空间中的态曲线。定理要求 `u`、`θ` 逐点可微，`inner(u,u)=1`，原联络和规范导数在 `[0,1]` 上可积，且 `θ 1 = θ 0`。结论为：

```lean
berryPhaseIntegral (fun t => phaseFactor θ t • u t) = berryPhaseIntegral u
```

证明先由 `BerryConnection_GaugeTransformationLaw` 得到逐点联络差，再用 `intervalIntegral.integral_sub` 分离积分，最后以 `intervalIntegral.integral_deriv_eq_sub` 将规范导数积分化为 `θ(1)-θ(0)` 并归零。

## 2. 失败先行与根因

候选证明先完成联络分解和积分减法，实际留下“原相位积分减去导数积分等于原相位积分”的未解决目标，确认端点求值步骤不可省略。补入微积分基本定理时，证明项曾把复值相位推断为 `ofRealCLM ∘ θ`，与目标中的 `fun t => (θ t : ℂ)` 外形不同；显式固定 `hθC` 的函数类型后编译通过。

独立模型最初使用原公理同名，编译器报告重复声明，因此独立定理命名为 `BerryPhase_GaugeInvariance_model`。独立环境先编译联络规范律版本和模型，再切换为加入相位补丁的联络版本，避免积分定义重复。

## 3. 增量补丁与全链顺序

`berry-phase-gauge-invariance.patch` 为 90 行，应用于联络恒等、复合和一般规范律补丁之后，替换原 `BerryPhase_GaugeInvariance` 公理及其旧说明。修补联络由 625 行变为 618 行。

全链先准备七份既有补丁，再生成、同步检查并应用 Berry 相位补丁。独立模型在基础联络环境中审计，随后编译相位补丁联络、曲率、三维、L² 和常值实例。没有修改外部 TOE-SYLVA 源树。

## 4. 全链复现命令与输出

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-berry-curvature-integration-lean.ps1 `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\berry-phase-full-verification' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\berry-curvature-integration-lean-audit.json'
```

实际退出码：**0**。两项 Python 测试分别输出 `Ran 1 test ... OK`。`integrationPreparation`、`phasePatchApplication`、`bloch`、`baseConnection`、`phaseModel`、`phaseModelAudit`、`connection`、`main`、`threeD`、`l2`、`l2Instance`、`axiomAudit` 十二阶段均为 **0**。

独立目标：

```text
'BerryConnection.berryPhaseIntegral' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.BerryPhase_GaugeInvariance_model' depends on axioms: [propext, Classical.choice, Quot.sound]
```

补丁目标及既有十四目标：

```text
'BerryConnection.BerryPhase_GaugeInvariance' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.BerryConnection_GaugeTransformationIdentity' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.BerryConnection_GaugeTransformComposition' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.BerryConnection_GaugeTransformationLaw' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.BerryCurvature_GaugeInvariance' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.FirstChernNumber_Integrality' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.FirstChernNumber_TopologicalInvariance' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.TotalChernNumber_FullBandVanishing' depends on axioms: [propext, Classical.choice, Quot.sound]
'curl_linear_subtraction' depends on axioms: [propext, Classical.choice, Quot.sound]
'curl_of_gradient_zero' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature_gauge_invariance' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.BlochL2State_normalization_integral' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.BlochL2State_gauge_transformation_law' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.constantBlochL2State' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.constantBlochL2State_gauge_law' depends on axioms: [propext, Classical.choice, Quot.sound]
```

结构化报告为 schemaVersion 4：`phasePatchSynchronized=true`、`phasePatchApplicationMatchesGenerated=true`、`independentPhaseModelProved=true`、`standardAxiomsOnlyForFifteenTargets=true`。

## 5. 保留边界

本定理处理单值规范相位端点相等的实参数区间情形，并要求显式可微性和可积性。`generalTwoDimensionalLineIntegralProved=false`、`multiValuedPhaseWindingProved=false`。旧 `BerryPhase.definition : Prop` 尚未精炼，其他占位、陈类、非绝热微扰、物理满带和全库 Lake 构建仍开放。
