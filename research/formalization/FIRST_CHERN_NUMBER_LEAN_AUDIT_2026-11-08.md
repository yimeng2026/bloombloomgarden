# 第一陈数：积分—整数结构、零曲率实例与补丁审计

**日期**：2026-11-08
**状态**：模型、零曲率实例及原文件结构补丁均编译、公理审计通过；外部 TOE-SYLVA 源树未修改
**范围**：显式测度与积分定义关系，不是一般陈数拓扑整数性的完整证明

## 1. 原结构缺口与修复

原 `FirstChernNumber` 只有 `value : ℤ` 和未约束的 `definition : Prop`，没有说明整数值与曲率积分的关系。新模型显式包含：

- `curvatureIntegral`：对 Berry 曲率实部取 Bochner 积分；
- `measure`：通量计算使用的测度；
- `value : ℤ`：陈数整数值；
- `definition`：`(1/2π)∫Ω = value` 的等式。

`FirstChernNumber_Integrality_model` 由该等式给出整数存在性。它不把由定义字段给出的整数误写成由任意曲率数据推导出的拓扑定理。

## 2. 零曲率实例

`zeroFirstChernNumberModel` 使用零联络、零曲率、Dirac 测度和 `value=0`，通过零函数积分证明定义等式。这验证积分—整数结构可以实际实例化，不是只有声明。

## 3. 原文件补丁与调试

原文件 564 行，修补后 496 行，补丁 174 行。补丁替换结构定义与空公理，保留其他占位和警告。

调试中实际处理了：

- 类型名与隐式 `L` 参数不一致，改为与原文件一致的显式 `L`；
- 可测实例缺失，改为文件内提供；
- `curvatureIntegral` 放在结构之后造成前向引用，恢复为积分定义在前、陈数结构在后；
- 原长文档块与声明替换发生解析冲突，改为简洁普通注释；
- 复现脚本最初漏编译原 `BerryCurvature`，已补入完整流程，不再依赖旧缓存。

## 4. 最终验证命令与输出

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-first-chern-number-lean.ps1 `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\chern-verification-v2' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\first-chern-number-lean-audit.json'
```

实际退出码：**0**。`bloch`、原联络、共享恒等、一般规范律、L2 精炼、原曲率、模型、模型审计、原文件补丁和补丁审计各阶段均为 0。补丁同步与实际应用一致性均为 `true`。

三条原始公理输出为：

```text
'BerryCurvature.FirstChernNumber_Integrality_model' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.zeroFirstChernNumberModel' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature.FirstChernNumber_Integrality' depends on axioms: [propext, Classical.choice, Quot.sound]
```

没有 `sorryAx` 或新增自定义公理。`integralToIntegerDefinitionPresent=true`、`zeroCurvatureInstanceConstructed=true`、`generalTopologicalIntegralityProved=false`。

## 5. 保留边界

- 该结构要求提供积分等式，不能从任意曲率数据免费得到陈数整数性。
- 零曲率实例只是可计算用例，不是一般拓扑不变性证明。
- 其他 `True` 占位、完整外微分、陈类拓扑和全库 Lake 构建仍未完成。外部 TOE-SYLVA 项目只读，未回写。
