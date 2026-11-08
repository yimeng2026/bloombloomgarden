# 具体归一化 Bloch L2 实例：Dirac 测度审计

**日期**：2026-11-08
**状态**：具体实例、旧态映射、归一化和实例规范律均编译、公理审计通过；外部 TOE-SYLVA 源树未修改
**范围**：Dirac 测度下的可计算验证用例，不是一般布里渊区测度模型

## 1. 实际实例

`constantBlochL2State` 使用：

- 旧态：`n=0`、常值波函数 `1`，旧 `periodicity`、`normalization` 字段保留为 `True`；
- 测度：`Measure.dirac r0`；
- L2 向量：`MemLp.toLp (fun _ => 1) (memLp_const 1)`；
- 一致性：`MemLp.coeFn_toLp` 给出向量与旧波函数的几乎处处一致；
- 归一化：以 `L2.inner_def` 展开内积并计算 Dirac 测度下的常值积分，得到 1。

因此 L2 精炼结构不仅可陈述，而且可以实际构造。旧 `normalization : Prop` 没有被用作证明，实际归一化由积分计算给出。

## 2. 实例规范律

`constantBlochL2State_gauge_law` 以命名参数 `μ := Measure.dirac r0` 把该实例代入 L2 精炼规范律，证明 `A′=A−dθ`。这验证了“旧态→L2 向量→归一化→规范律”的完整链路。

## 3. 验证中的修正

- 可测实例改为导出，供实例模块复用；`BandIndex` 显式写为 `(0 : ℕ)`。
- 一致性先把旧波函数化简为常值函数，再调用 `MemLp.coeFn_toLp`。
- 归一化不能由 `change` 直接展开，改用 `L2.inner_def` 后完成实际积分。
- 规范律应用中的测度是显式参数，使用命名 `μ` 传入，未误用实例代替测度。

## 4. 最终验证命令与输出

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-bloch-l2-instance-lean.ps1 `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\bloch-l2-instance-verification' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\bloch-l2-instance-lean-audit.json'
```

实际退出码：**0**。`bloch`、原联络、共享恒等、一般规范律、L2 精炼、具体实例和公理审计各阶段均为 0。

两条原始公理输出为：

```text
'BerryConnection.constantBlochL2State' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.constantBlochL2State_gauge_law' depends on axioms: [propext, Classical.choice, Quot.sound]
```

没有 `sorryAx` 或新增自定义公理。`concreteInstanceConstructed=true`、`coherentMappingProved=true`、`normalizationIntegralComputed=true`、`diracIsGeneralBrillouinZoneMeasure=false`。

## 5. 交付与边界

交付 `BlochL2ConstantInstance.lean`、可复现脚本和 `bloch-l2-instance-lean-audit.json`。从旧源码构造一般 Bloch L2 态、布里渊区实际测度、周期性和其他占位仍未完成。外部 TOE-SYLVA 项目只读，未回写。
