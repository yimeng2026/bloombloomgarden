# BerryPhase 结构精炼与结构级规范不变性审计

**日期**：2026-11-08

**状态**：实际积分定义、独立结构模型、增量补丁和十六目标全链复现通过

**范围**：旧 BerryPhase 结构与实际区间积分的连接，不是一般二维线积分或多值相位绕数理论

## 1. 结构修复

旧 `BerryPhase` 只有 `definition : Prop`，没有说明 `phase` 与路径积分的关系。精炼结构现包含：

- 旧 `connection` 记录，仅作来源记录；
- `path` 与 `closedPath : path 0 = path 1`；
- 实际 `state : CrystalMomentum2D → H`；
- `phase : ℂ`；
- `definition : phase = berryPhaseIntegral (fun t => state (path t))`。

新增 `BerryPhase_GaugeInvariance_refined_model`，证明规范相位积分等于结构记录的 `γ.phase`。证明先用 `γ.definition` 展开记录相位，再复用区间规范不变性；`γ.closedPath` 给出端点规范相位相等。

候选包装最初只使用 `exact γ.definition`，实际失败为“记录相位等式不能替代规范积分等式”。加入区间定理与路径闭合性后编译通过。

## 2. 前向引用与 diff 基准修复

第一次联合编译发现 `berryPhaseIntegral` 位于精炼结构之后，形成前向引用。生成器现将积分定义移动到精炼结构之前，并以回归测试保证：

```text
berryPhaseIntegral 定义 < BerryPhase 结构 < BerryPhase_GaugeInvariance 定理
```

随后复查又修正两处证据风险：输入行数必须在移动定义前记录；unified diff 必须以移动前的完整原文为基准，防止漏删原位置定义。测试现同时检查输入行数、定义顺序、`git apply --check`、实际应用和逐字一致性。

第二份 `berry-phase-model.patch` 为 97 行，输入 618 行，最终 642 行。独立结构模型和补丁版两个相位定理均只依赖标准三公理。

## 3. 全链复现命令

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-berry-curvature-integration-lean.ps1 `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\berry-phase-structure-full-verification' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\berry-curvature-integration-lean-audit.json'
```

实际退出码：**0**。三项 Python 测试分别输出 `Ran 1 test ... OK`。`integrationPreparation`、`phasePatchApplication`、`phaseStructurePatchApplication`、`bloch`、`baseConnection`、`phaseModel`、`phaseModelAudit`、`phaseStructureModel`、`phaseStructureModelAudit`、`connection`、`main`、`threeD`、`l2`、`l2Instance`、`axiomAudit` 十六阶段均为 **0**。

## 4. 新增公理输出与全链状态

独立结构模型：

```text
'BerryConnection.BerryPhase_GaugeInvariance_refined_model' depends on axioms: [propext, Classical.choice, Quot.sound]
```

补丁版区间定理与结构级定理：

```text
'BerryConnection.BerryPhase_GaugeInvariance' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.BerryPhase_GaugeInvariance_refined' depends on axioms: [propext, Classical.choice, Quot.sound]
```

最终集成审计包含上述两项及既有十四项，共十六项，全部只依赖 `propext、Classical.choice、Quot.sound`。独立区间定义和区间定理也保持相同标准公理输出。

结构化报告为 schemaVersion 5：`refinedBerryPhaseDefinitionPresent=true`、`legacyBerryPhasePropRemoved=true`、`integralDefinitionPrecedesStructure=true`、`phaseStructurePatchSynchronized=true`、`phaseStructurePatchApplicationMatchesGenerated=true`、`standardAxiomsOnlyForSixteenTargets=true`。

## 5. 边界

结构精炼连接了旧路径记录和实际 Hilbert 态曲线，但旧联络字段仍只是来源记录，不用于冒充归一化或实际联络证据。一般二维线积分、多值相位绕数、其他占位、陈类、非绝热微扰、物理满带和全库 Lake 构建仍开放。外部 TOE-SYLVA 源树未修改。
