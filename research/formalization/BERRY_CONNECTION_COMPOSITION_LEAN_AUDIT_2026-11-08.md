# Berry 联络规范变换复合：真实证明、顺序补丁与公理审计

**日期**：2026-11-08
**状态**：独立恒等、独立复合及原文件两条定理均编译、公理审计通过；外部 TOE-SYLVA 源树未修改
**范围**：二维实值联络分量的恒等与复合，不包括一般规范变换律或其他占位

## 1. 命题与必要前提

沿用恒等证明中的实值定义

\[
A'_\mu(k)=A_\mu(k)+\partial_\mu\theta(k),
\]

证明依次施加 `θ₁`、`θ₂` 等于一次施加 `θ₁+θ₂`。两个相位在目标点的 `DifferentiableAt` 是 `fderiv_add` 所必需的显式前提，没有省略。

共享类型类实例是本次证明的关键：定义和证明必须使用同一套 `NormedAddCommGroup` 与 `NormedSpace` 实例，否则打印形式相同的 `fderiv` 在隐式参数上并不相同，rewrite 无法匹配。恒等模块已改为导出共享实例，复合模块不再新建局部实例。

## 2. 顺序补丁

- `berry-connection-gauge-identity.patch`：先提供 `gaugeTransformConnection2D`、坐标方向和共享实例，73 行。
- `berry-connection-gauge-composition.patch`：再替换复合占位，54 行。

顺序不可颠倒。复合补丁生成器会检查前置 `gaugeTransformConnection2D` 是否存在，恒等补丁生成器也会检查两套共享实例是否完整，防止漏提取。

独立交付为 `BerryConnectionGaugeIdentity.lean` 与 `BerryConnectionGaugeComposition.lean`。最终原文件由 534 行变为 608 行。

## 3. 调试证据

- 不完整候选以退出码 1 失败，目标为复合等式的 `unsolved goals`。
- 随后发现局部类型类实例不一致，改为共享实例后，独立恒等和复合连续编译通过。
- 补丁生成曾因文档标记从“恢复”改为“导出”而漏掉第一个范数实例；已修正提取起点并加入双实例守卫，再完整复跑。
- 一次 PowerShell `$name:` 插值错误和一次绝对路径补丁应用错误均单独记录，没有计作 Lean 证明失败。

## 4. 最终验证命令与输出

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-berry-connection-composition-lean.ps1 `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\berry-composition-verification-v2' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\berry-connection-composition-lean-audit.json'
```

实际退出码：**0**。`bloch`、原联络、独立恒等、独立复合、独立公理审计、修补文件和原文件公理审计各阶段均为 0。两份补丁同步及顺序应用一致性均为 `true`，禁止占位／新增公理扫描为 `false`。

四条公理输出均只含标准依赖：

```text
'BerryConnection.BerryConnection_GaugeTransformComposition_concrete' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.BerryConnection_GaugeTransformationIdentity_concrete' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.BerryConnection_GaugeTransformationIdentity' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.BerryConnection_GaugeTransformComposition' depends on axioms: [propext, Classical.choice, Quot.sound]
```

没有 `sorryAx` 或新增自定义公理。结构化证据见 `berry-connection-composition-lean-audit.json`，恒等单独审计也已重新生成并保持同步。

## 5. 保留边界

- 原一般规范变换律没有被使用，也没有被清偿；时间反演和其他占位仍开放。
- 原文件其他公理和警告继续保留，未关闭或隐藏。
- 外部 TOE-SYLVA 项目尚需由维护者按顺序应用补丁并更新登记；本仓库不宣称外部项目已合入、全库已构建或物理语义已证明。
