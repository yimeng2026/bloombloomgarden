# BerryCurvature 实际定义与零曲率实例审计

**日期**：2026-11-08

**状态**：曲率定义精炼、零实例、八目标独立审计和二十目标下游集成通过

**范围**：二维复值曲率与旧联络分量的方向导数关系，不是完整微分形式或陈类理论

## 1. 定义精炼

旧联络类型为 `CrystalMomentum2D → Fin 2 → ℂ`，索引 0、1 对应 x、y。实际曲率定义为：

```lean
fderiv ℝ (fun k' => A.connection k' 1) k BerryConnection.realDirectionX
  - fderiv ℝ (fun k' => A.connection k' 0) k BerryConnection.realDirectionY
```

精炼 `BerryCurvature` 的 `definition` 不再是 `Prop`，而是 `curvatureXY` 与上述实际导数反对称差的等式。这样联络外微分和曲率记录不再各自独立叙述。

零实例由零波函数、零联络分量和零曲率字段构造。候选证明先以 `rfl` 失败，证明零函数导数化简不可省略；展开实际曲率和零联络后，`simp` 完成定义等式。

## 2. 补丁与兼容性

`berry-curvature-model.patch` 为 99 行，输入 492 行，最终 506 行。生成器只替换结构声明，避免把 `zeroBerryCurvatureModel` 名称误改。

独立定义、独立零实例、补丁定义、补丁零实例和陈数整数性均通过编译与公理审计，全部只有 `propext、Classical.choice、Quot.sound`。陈数结构未因曲率定义精炼而失效。

## 3. 独立八目标复现

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-berry-independent-models-lean.ps1 `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\independent-curvature-verification' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\berry-independent-models-lean-audit.json'
```

实际退出码：**0**，耗时 229.776 秒。五项补丁测试和十六阶段均为 0。独立报告为 schemaVersion 2，八个目标均只有标准三公理。

曲率相关输出：

```text
'BerryCurvature.curvatureXYFromBerryConnection_model' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.zeroBerryCurvatureModel' depends on axioms: [propext, Classical.choice, Quot.sound]
```

## 4. 下游二十目标复现

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-berry-curvature-integration-lean.ps1 `
  -IntegrationOnly `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\curvature-downstream-verification' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\berry-curvature-integration-lean-audit.json'
```

实际退出码：**0**，耗时 161.338 秒。五项补丁测试和十二阶段均为 0，曲率补丁同步和实际应用一致性均为 `true`。

```text
'BerryCurvature.curvatureXYFromBerryConnection' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.zeroBerryCurvatureModel' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.FirstChernNumber_Integrality' depends on axioms: [propext, Classical.choice, Quot.sound]
```

其余十七个下游目标也全部只依赖标准三公理。报告为 schemaVersion 7：`curvatureDefinitionPresent=true`、`zeroCurvatureInstanceConstructed=true`、`legacyCurvaturePropRemoved=true`、`standardAxiomsOnlyForTwentyTargets=true`。

## 5. 边界

本轮统一的是旧联络复值分量与曲率字段的计算关系，不证明完整微分形式、陈类、一般规范微扰或物理满带定理。旧联络自身的 `definition : Prop` 仍需另行精炼。外部 TOE-SYLVA 源树未修改。
