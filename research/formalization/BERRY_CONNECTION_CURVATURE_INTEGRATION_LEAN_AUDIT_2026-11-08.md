# BerryConnection 与 BerryCurvature 全链集成审计

**日期**：2026-11-08

**状态**：七份补丁顺序应用、修补后联络依赖、联合编译和十目标公理审计通过

**范围**：现有联络、曲率与陈数证明的全链集成回归，不新增物理定理或全库完成声明

## 1. 七份补丁与三份原始源文件

准备器读取外部 `BerryConnection.lean`、`BerryCurvature.lean` 和 `TOE_SYLVA_Solutions/BerryCurvature_GaugeInvariance.lean`，在当前仓库的输出目录中依次应用：

1. `berry-connection-gauge-identity.patch`；
2. `berry-connection-gauge-composition.patch`；
3. `berry-connection-gauge-law.patch`；
4. `berry-curvature-gauge-invariance.patch`；
5. `berry-curvature-gauge-invariance-3d.patch`；
6. `first-chern-invariance.patch`；
7. `total-chern-number.patch`。

七份补丁均通过 `git apply --check` 和实际应用。没有重复应用已包含在组合补丁中的陈数结构补丁，也没有新建另一份重复全链补丁。

## 2. 从四补丁到全链的测试先行

原集成测试要求四份曲率补丁。扩展前先改为要求三份源文件、七份补丁、三个联络定理和联络文件 SHA-256；测试实际失败，报告显示旧准备器仍只有四份补丁。随后扩展准备器，测试转绿。

一键验证的关键修正是：`BerryConnection.olean` 现在由 `$applyRoot/BerryConnection.lean` 编译，`BerryCurvature` 在同一 `LEAN_PATH` 下链接该修补版本，不再复制并编译原始联络文件。报告以 `patchedConnectionUsedByCurvature=true` 记录这一事实。

## 3. 一键复现命令

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-berry-curvature-integration-lean.ps1 `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\full-integration-verification' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\berry-curvature-integration-lean-audit.json'
```

实际退出码：**0**。真实源码集成测试输出 `Ran 1 test ... OK`。`integrationPreparation`、`bloch`、`connection`、`main`、`threeD`、`axiomAudit` 六个阶段均为 **0**。

结构化报告升级为 schemaVersion 2，记录三份原始文件哈希、三份修补后源文件哈希、七份补丁哈希，以及联络、主曲率、三维三个编译输出哈希。

## 4. 十条原始公理输出

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
```

没有 `sorryAx` 或这些目标上的新增自定义公理。`sequentialPatchApplication=true`、`combinedBuildSucceeded=true`、`standardAxiomsOnlyForTenTargets=true`。

## 5. 边界

全链集成通过不增加新的数学或物理结论。原文件的其他占位、一般 Bloch 映射、完整外微分、能隙微扰、物理满带完备性和全库 Lake 构建仍开放。外部 TOE-SYLVA 源树未修改。
