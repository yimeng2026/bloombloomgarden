# Berry 曲率与 Chern 补丁链集成审计

**日期**：2026-11-08

**状态**：四份既有补丁顺序应用、联合编译和七目标公理审计通过

**范围**：现有证明的集成回归，不新增物理定理，也不表示外部项目或全库 Lake 已完成

> 本文记录四份曲率／陈数补丁批次的历史证据。后续全链验证已扩展为三份原始源文件、七份补丁和十目标审计，统一报告升级为 schemaVersion 2；当前结果见 `BERRY_CONNECTION_CURVATURE_INTEGRATION_LEAN_AUDIT_2026-11-08.md`。

## 1. 集成对象与顺序

从外部原文件开始，按以下顺序应用：

1. `berry-curvature-gauge-invariance.patch`：二维实值 Berry 曲率规范不变性。
2. `berry-curvature-gauge-invariance-3d.patch`：三维旋度线性与规范不变性，作用于另一个源文件。
3. `first-chern-invariance.patch`：陈数积分—整数结构与连续整数值不变性。
4. `total-chern-number.patch`：总陈数求和结构与条件零和结论。

第二份补丁作用于 `TOE_SYLVA_Solutions/BerryCurvature_GaugeInvariance.lean`，其余主文件补丁作用于 `BerryCurvature.lean`。没有重复应用已包含在 `first-chern-invariance.patch` 中的 `first-chern-number.patch`。

## 2. 实际发现与处理

- 初次顺序测试因临时目录缺少三维补丁的第二份源文件而失败；补齐测试输入后，四份补丁均通过 `git apply --check` 和实际应用，没有文本重叠冲突。
- 联合编译进一步确认没有可测实例重复、命名冲突或目标公理依赖回归。因此不创建重复的组合补丁，保留现有独立补丁，只新增统一准备与验证入口。
- 集成准备器回归测试先因准备器缺失而失败。实现后又发现 Windows 文本读取会把 CRLF 转为 LF，导致用重新编码的文本计算哈希不一致；测试已改为直接读取文件字节计算 SHA-256。
- 准备器要求输出位于当前仓库内，并拒绝输出到外部 SYLVA 源树。每次都从两份原始文件重建应用目录，避免旧补丁状态累积。

## 3. 一键复现命令

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-berry-curvature-integration-lean.ps1 `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\curvature-integration-verification' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\berry-curvature-integration-lean-audit.json'
```

实际退出码：**0**。Python 集成测试输出 `Ran 1 test ... OK`。`integrationPreparation`、`bloch`、`connection`、`main`、`threeD`、`axiomAudit` 六个阶段均为 **0**。

脚本从原始源码重新编译 `BlochTheorem` 和 `BerryConnection`，不依赖先前临时目录中的编译缓存。主输出和三维输出的 SHA-256 已写入结构化报告。

## 4. 七条原始公理输出

```text
'BerryCurvature.BerryCurvature_GaugeInvariance' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.FirstChernNumber_Integrality' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.FirstChernNumber_TopologicalInvariance' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.TotalChernNumber_FullBandVanishing' depends on axioms: [propext, Classical.choice, Quot.sound]
'curl_linear_subtraction' depends on axioms: [propext, Classical.choice, Quot.sound]
'curl_of_gradient_zero' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature_gauge_invariance' depends on axioms: [propext, Classical.choice, Quot.sound]
```

没有 `sorryAx` 或这些目标上的新增自定义公理。`sequentialPatchApplication=true`、`combinedBuildSucceeded=true`、`standardAxiomsOnlyForSevenTargets=true`、`newCombinedPatchCreated=false`。

## 5. 边界

这次通过证明的是现有补丁可以共同应用和编译，不增加新的数学或物理结论。陈数连续性和总陈数零和仍是带显式前提的受限定理；一般能隙微扰、Bloch 完备性到物理满带零和、其他占位及全库 Lake 构建仍开放。外部 TOE-SYLVA 源树未修改。
