# 总陈数求和结构与条件零和定理审计

**日期**：2026-11-08

**状态**：独立模型、顺序增量补丁、公理审计及组合应用一致性验证通过

**范围**：显式求和等式加零和证据的代数结论，不是由 Bloch 完备性推导的物理满带定理

## 1. 原问题与修复

原 `TotalChernNumber` 的 `definition : Prop` 没有规定总值与各带陈数的关系；`TotalChernNumber_FullBandVanishing` 只有 `True := by trivial`。另一个参考文件 `TOE_SYLVA_Solutions/BerryKubo_ChernTopology.lean` 虽给出完备性证明思路，实际仍以 `admit` 结束，不能作为已证明依赖。

新 `TotalChernNumberModel` 显式保存：

```lean
definition : totalValue = ∑ i, (individualChern i).value
```

修补后的定理所证明的是：

```lean
theorem TotalChernNumber_FullBandVanishing_model
    {N : ℕ} (total : TotalChernNumberModel L N)
    (hfull : ∑ i, (total.individualChern i).value = 0) :
    total.totalValue = 0
```

证明先用 `total.definition` 改写总值，再使用 `hfull`。`numOccupied=N` 没有被解释为完备性，零和证据也没有被伪装成从投影算符或 Bloch 波函数自动推出。

## 2. 失败先行

候选证明最初只有 `exact total.definition`，实际编译失败：

```text
total.definition has type total.totalValue = ∑ i, ...
but is expected to have type total.totalValue = 0
```

这确认求和定义本身不能替代零和证据。加入 `hfull` 的两步 `calc` 后编译通过。补丁生成器回归测试也先因生成器不存在而失败，随后验证实际删除 `definition : Prop`、删除 `True` 占位、加入零和前提和有限和作用域。

## 3. 补丁顺序与文件

1. `first-chern-number.patch`：陈数积分—整数结构，174 行。
2. `first-chern-invariance.patch`：从原文件直接生成结构与连续整数不变性，236 行。
3. `total-chern-number.patch`：在第二份结果上应用的增量补丁，113 行。

第二份应用后为 463 行，第三份应用后为 424 行。总陈数补丁加入 `open scoped BigOperators`，不依赖证明文件中的局部作用域设置。

交付包括 `TotalChernNumberModel.lean`、增量补丁、确定性生成器、回归测试和扩展后的统一验证脚本。外部 TOE-SYLVA 源树未修改。

## 4. 完整验证命令与实际输出

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-first-chern-number-lean.ps1 `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\total-chern-verification' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\first-chern-number-lean-audit.json'
```

实际退出码：**0**。两项 Python 补丁测试分别输出 `Ran 1 test ... OK`。`bloch`、`connection`、`identity`、`law`、`l2`、`originalCurvature`、`model`、`invariance`、`total`、`standaloneAudit`、`patched`、`patchedAudit` 十二个阶段均为 **0**。

三份补丁重新生成哈希一致；总陈数增量补丁在先应用不变性组合补丁的文件上通过 `git apply --check` 和实际应用，结果与生成文件逐字一致。

七条原始公理输出为：

```text
'BerryCurvature.FirstChernNumber_Integrality_model' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.zeroFirstChernNumberModel' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.FirstChernNumber_TopologicalInvariance_model' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.TotalChernNumber_FullBandVanishing_model' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.FirstChernNumber_Integrality' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.FirstChernNumber_TopologicalInvariance' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.TotalChernNumber_FullBandVanishing' depends on axioms: [propext, Classical.choice, Quot.sound]
```

结构化报告升级为 schemaVersion 3：`totalSumDefinitionPresent=true`、`conditionalZeroSumVanishingProved=true`、`completenessToFullBandVanishingProved=false`、`forbiddenPlaceholderOrNewAxiom=false`。

## 5. 保留边界

本轮解决的是总陈数定义关系和条件零和代数环节，不是完整物理满带定理。要清偿后者，仍需定义有限维 Bloch 投影族、证明完备性关系、建立总 Berry 曲率与投影导数的关系，并处理布里渊区上的边界或绕数项。其他占位和全库 Lake 构建仍开放。
