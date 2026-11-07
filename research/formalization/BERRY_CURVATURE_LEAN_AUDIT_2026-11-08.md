# Berry 曲率二维规范不变性：真实证明与占位补丁审计

**日期**：2026-11-08
**状态**：独立证明与打补丁后的原文件均编译、公理审计通过；外部 TOE-SYLVA 源树未修改
**范围**：二维实值联络分量，不断言任意复值结构、完整外微分形式或三维旋度已形式化

## 1. 根因与处置

原 `BerryCurvature.lean` 的 `BerryCurvature_GaugeInvariance` 以 `True := by trivial` 占位。原结构只有任意复值 `curvatureXY` 和未约束的 `definition : Prop`，没有给出曲率与 `∂xAy − ∂yAx` 的等式，也没有可微性或 `C²` 前提，因此不能在原签名下恢复真实证明。

本次交付采用明确的二维实值定义：

\[
\Omega_{xy}(k)=\partial_x A_y(k)-\partial_y A_x(k),\qquad
A_\mu\mapsto A_\mu+\partial_\mu\theta.
\]

定理显式要求 `θ ∈ C²` 以及两个联络分量在目标点可微。证明使用 `fderiv_add` 展开，再由 `ContDiffAt.isSymmSndFDerivAt` 与 `fderiv_clm_apply` 证明混合偏导相消，不是新的公理或另一个平凡命题。

## 2. 交付文件

- `research/formalization/BerryCurvatureGaugeInvariance.lean`：独立可编译证明。
- `research/formalization/berry-curvature-gauge-invariance.patch`：只替换原文件第 2 节占位段的最小补丁，不触碰其他声明。
- `scripts/prepare_berry_curvature_patch.py`：从原文件和证明重新生成补丁及隔离的修补后源码。
- `scripts/verify-berry-curvature-lean.ps1`：编译依赖、独立证明、修补后原文件，并分别执行公理审计。
- `research/formalization/berry-curvature-lean-audit.json`：最终运行产生的结构化证据。

原文件为 564 行，修补后为 632 行，补丁为 174 行。外部源文件 SHA-256 保持 `de9bcbd15cecc346b2a9135b8b44cb21cc3db4422775506d08928b94a8f5958d`，没有回写外部项目。

## 3. 失败测试与参考边界

不完整候选证明在依赖编译和类型结构补齐后，以退出码 1 失败，唯一剩余错误为 `unsolved goals`，目标正是规范变换前后的曲率等式。完整证明随后编译通过。

已有三维参考 `BerryCurvature_gauge_invariance` 仍依赖 `curl_linear_subtraction`；本次没有调用该公理。二维参考和本次新定理均只依赖 Lean 标准三公理。原任意复值结构和其他 `True` 占位不在本次清偿范围内。

## 4. 最终验证命令与实际结果

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-berry-curvature-lean.ps1 `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\berry-lean-verification' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\berry-curvature-lean-audit.json'
```

实际退出码：**0**。各阶段退出码：

| 阶段 | 退出码 |
|---|---:|
| `BlochTheorem` 依赖编译 | 0 |
| `BerryConnection` 依赖编译 | 0 |
| 独立证明编译 | 0 |
| 修补后原文件编译 | 0 |
| 独立证明公理审计 | 0 |
| 修补后原文件公理审计 | 0 |

两条审计的原始关键输出均为：

```text
'BerryCurvature.BerryCurvature_GaugeInvariance' depends on axioms: [propext, Classical.choice, Quot.sound]
```

没有 `sorryAx`、`curl_linear_subtraction` 或新增自定义公理。补丁同步检查为 `true`，禁止占位／新增公理扫描为 `false`。

## 5. 保留问题

- 原文件仍有重复命名空间、未使用变量等警告；没有关闭或隐藏。
- 其他 `True` 占位和既有公理仍存在，不因本定理通过而自动核销。
- 这是局部二维实值微积分定理，不是完整外微分、任意复值结构、陈数拓扑或物理语义证明。
- 外部 TOE-SYLVA 项目尚需由维护者应用补丁并更新其 `proof_status.md`／公理登记；本仓库没有伪称外部项目已合入。
