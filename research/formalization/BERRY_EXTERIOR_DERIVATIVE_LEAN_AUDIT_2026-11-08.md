# Berry 一形式外微分与规范不变性审计

**日期**：2026-11-08

**状态**：可计算定义、独立模型、增量补丁、六目标独立审计和十八目标下游集成通过

**范围**：二维复值外微分分量与 `C²` 规范不变性，不是完整微分形式或 de Rham 上同调

## 1. 定义与真实定理

`exteriorDerivativeOfBerryConnection` 现为可计算定义：

```lean
fderiv ℝ A.componentY k realDirectionX
  - fderiv ℝ A.componentX k realDirectionY
```

`gaugeTransform1Form` 给两个复值分量分别加上 `C²` 相位的 x、y 方向导数，保留旧记录字段。规范不变性定理要求 `ContDiff ℝ 2 θ` 和两个原分量在 `k` 点可微，证明变换前后外微分相等。

证明由 `fderiv_add` 展开分量，以二阶 Fréchet 导数对称相消规范项。没有新增公理、`sorry` 或空 `True` 结论。

## 2. 错误命题弃用与证明调试

最初尝试“只交换两个分量就变号”的反对称陈述，数学上不成立，已明确弃用，没有用于补丁。随后改为规范不变性目标。候选 `rfl` 按预期失败，补上混合偏导和求导加法规则后通过。

独立模型与补丁版分环境编译，外微分定义、规范变换和规范不变性均只有 `propext、Classical.choice、Quot.sound`。增量补丁为 142 行，输入 642 行，最终 689 行。

## 3. 超时根因与验证拆分

统一入口两次在冷缓存和重复编译下达到单次 300 秒执行时限；日志显示所有下游编译已完成，最后的十八目标审计随后单独执行成功。这不是证明失败，但也不能据此声称统一入口已完成。

为避免重复计算，验证现分为两个入口：

- `verify-berry-independent-models-lean.ps1`：基础联络上的六个独立模型目标；
- `verify-berry-curvature-integration-lean.ps1 -IntegrationOnly`：最终联络和下游十八目标。

仅下游报告明确为 `integrationOnly=true`，独立模型字段为 `null`，`independentModelsAudited=false`，并指向独立报告。默认完整模式保留，但本报告只声称下面两条实际完成的命令。

## 4. 独立模型复现命令

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-berry-independent-models-lean.ps1 `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\independent-models-verification' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\berry-independent-models-lean-audit.json'
```

实际退出码：**0**，耗时 169.762 秒。十二阶段均为 0，四项补丁测试通过。六目标公理输出：

```text
'BerryConnection.berryPhaseIntegral' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.BerryPhase_GaugeInvariance_model' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.BerryPhase_GaugeInvariance_refined_model' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.exteriorDerivativeOfBerryConnection_model' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.gaugeTransform1Form_model' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.exteriorDerivativeOfBerryConnection_gauge_invariant_model' depends on axioms: [propext, Classical.choice, Quot.sound]
```

## 5. 下游集成复现命令

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-berry-curvature-integration-lean.ps1 `
  -IntegrationOnly `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\exterior-downstream-verification' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\berry-curvature-integration-lean-audit.json'
```

实际退出码：**0**，耗时 160.416 秒。十一阶段均为 0，四项补丁测试通过，三份新增补丁同步及应用一致性均为 `true`。

外微分相关最终输出：

```text
'BerryConnection.exteriorDerivativeOfBerryConnection' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.exteriorDerivativeOfBerryConnection_gauge_invariant' depends on axioms: [propext, Classical.choice, Quot.sound]
```

其余十六个集成目标也全部只依赖标准三公理。报告为 schemaVersion 6：`exteriorDerivativeComputed=true`、`exteriorGaugeInvariantProved=true`、`standardAxiomsOnlyForEighteenTargets=true`、`fullDifferentialFormsCalculusProved=false`。

## 6. 边界

本轮证明二维复值外微分分量的规范不变性，要求 `C²` 相位和分量可微。原 `correspondenceX/Y : Prop` 仅作为保留记录字段，没有被用作证明。完整微分形式、de Rham 上同调、多值相位绕数、其他占位和全库 Lake 构建仍开放。外部 TOE-SYLVA 源树未修改。
