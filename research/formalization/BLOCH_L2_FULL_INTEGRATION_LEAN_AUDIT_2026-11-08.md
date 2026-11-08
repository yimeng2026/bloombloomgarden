# Bloch L² 与联络—曲率全链集成审计

**日期**：2026-11-08

**状态**：重复依赖修复、三套复现和十四目标联合公理审计通过

**范围**：L² 精炼、积分归一化、L² 规范律和 Dirac 实例与既有七补丁链的集成；不是一般 Bloch 映射或物理满带证明

> 本文记录十四目标、schemaVersion 3 批次的历史证据。后续 Berry 相位公理已由区间积分定理清偿，当前全链为十二阶段、十五个集成目标加两个独立相位目标、schemaVersion 4；最新结果见 `BERRY_PHASE_GAUGE_INVARIANCE_LEAN_AUDIT_2026-11-08.md`。

## 1. 实际冲突与最小修复

旧 `BlochL2State.lean` 同时依赖早期独立 `BerryConnectionGaugeLaw`、`BerryConnectionGaugeIdentity` 和 `BerryConnection`。在修补联络环境中实际编译失败：

```text
import BerryConnection failed, environment already contains 'BerryConnection.phaseFactor' from BerryConnectionGaugeLaw
```

根因是早期独立规范律和修补后的联络模块都定义 `phaseFactor` 等对象。最小修复为：

- `BlochL2State.lean` 只导入修补后的 `BerryConnection`；
- 复用其中共享范数实例、相位定义和 `BerryConnection_GaugeTransformationLaw`；
- 删除对两个早期独立证明模块的重复依赖；
- 保留 L² 向量、几乎处处一致性、积分归一化和标量塔证明不变。

修复后 L² 与常值 Dirac 实例均在全链环境中编译通过，没有增加公理或改变物理前提。

## 2. 全链复现命令

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-berry-curvature-integration-lean.ps1 `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\full-l2-integration-verification' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\berry-curvature-integration-lean-audit.json'
```

实际退出码：**0**。`integrationPreparation`、`bloch`、`connection`、`main`、`threeD`、`l2`、`l2Instance`、`axiomAudit` 八阶段均为 **0**。结构化报告升级为 schemaVersion 3，记录 L² 和实例源码及编译输出哈希。

## 3. 原独立入口复现

L² 状态入口：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-bloch-l2-state-lean.ps1 `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\bloch-l2-state-patched-verification' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\bloch-l2-state-lean-audit.json'
```

实际退出码：**0**。`integrationPreparation`、`bloch`、`connection`、`proof`、`audit` 五阶段均为 **0**，报告为 schemaVersion 2。

L² 实例入口：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-bloch-l2-instance-lean.ps1 `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\bloch-l2-instance-patched-verification' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\bloch-l2-instance-lean-audit.json'
```

实际退出码：**0**。`integrationPreparation`、`bloch`、`connection`、`l2`、`instance`、`audit` 六阶段均为 **0**，报告为 schemaVersion 2。两个独立入口都编译修补后的联络文件，不再导入重复的早期规范律模块。

## 4. 十四条原始公理输出

```text
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

没有 `sorryAx` 或这些目标上的新增自定义公理。`l2UsesPatchedConnection=true`、`duplicateStandaloneGaugeLawImportsRemoved=true`、`standardAxiomsOnlyForFourteenTargets=true`。

## 5. 边界

Dirac 常值实例只是可计算验证用例，不是一般布里渊区测度。旧 `Prop` 仍不能自动构造实际 L² 向量、相干性和归一化；一般 Bloch 映射、完整外微分、能隙微扰、物理满带和全库 Lake 构建仍开放。外部 TOE-SYLVA 源树未修改。
