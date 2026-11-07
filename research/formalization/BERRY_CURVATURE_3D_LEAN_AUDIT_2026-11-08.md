# 三维 Berry 曲率规范不变性：旋度线性公理清偿审计

**日期**：2026-11-08
**状态**：旋度线性与三维主定理均编译、公理审计通过；外部 TOE-SYLVA 源树未修改
**范围**：三维实向量场的局部微积分，不是全库构建或完整微分几何证明

## 1. 原公理为何不能直接改名

原 `curl_linear_subtraction` 没有可微性前提，却直接断言 `curl(A−B)=curlA−curlB`。`fderiv_sub` 需要 `DifferentiableAt`，因此仅把 `axiom` 改成 `theorem` 不会得到健全证明。

本次修正：

- `curl_linear_subtraction` 新增 `hA : DifferentiableAt ℝ A k` 与 `hB`；
- 用 `differentiableAt_pi` 把向量可微性转为每个分量的可微性；
- 以 `fderiv_sub` 和逐分量环代数证明旋度线性；
- `BerryCurvature_gauge_invariance` 同步新增联络 `A` 的可微性前提，并从 `φ∈C²` 推出 `gradient3D φ` 可微；
- 保留已有混合偏导证明，不使用任何新增公理。

现役调用方检索只发现原参考文件和历史 archive；未发现其他现役模块调用，因此新增参数没有已见的下游签名破坏。完整全库 Lake 构建仍未声称完成。

## 2. 交付文件

- `research/formalization/BerryCurvatureGaugeInvariance3D.lean`：完整三维证明，原文件 258 行，修正后 274 行。
- `research/formalization/berry-curvature-gauge-invariance-3d.patch`：87 行精确补丁，包含文件头公理状态说明同步。
- `scripts/prepare_berry_curvature_3d_patch.py`：补丁生成和语义守卫。
- `scripts/verify-berry-curvature-3d-lean.ps1`：补丁同步、实际应用、结果一致性、编译和公理审计。
- `research/formalization/berry-curvature-3d-lean-audit.json`：最终结构化证据。

原参考文件 SHA-256 为 `902c7e400e061bbac6d9c2955b463ba6adca4b3e12bd98e3b117524432df62c8`，外部文件未回写。

## 3. 失败测试与实现核验

旋度线性候选最初以退出码 1 失败，错误为三个分量的 `unsolved goals`。补齐 `differentiableAt_pi`、函数空间减法形式与 `fderiv_sub` 后编译通过。完整三维主定理随后也通过。

复现脚本第一次在绝对 Windows 路径的 `git apply --directory` 处失败；改为在隔离目录内直接应用补丁后通过。该路径错误不被计作 Lean 证明失败，也没有隐藏。

## 4. 最终验证命令与输出

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-berry-curvature-3d-lean.ps1 `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\berry-3d-verification-v3' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\berry-curvature-3d-lean-audit.json'
```

实际退出码：**0**。补丁同步为 `true`，实际应用结果与编译证明一致为 `true`，禁止占位／新增公理扫描为 `false`。

三条原始公理输出为：

```text
'curl_linear_subtraction' depends on axioms: [propext, Classical.choice, Quot.sound]
'curl_of_gradient_zero' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryCurvature_gauge_invariance' depends on axioms: [propext, Classical.choice, Quot.sound]
```

`customCurlAxiomPresent=false`，没有 `sorryAx` 或其他自定义公理。

## 5. 边界

- 外部 TOE-SYLVA 项目尚需由维护者应用补丁、检查调用方并更新公理登记；本仓库没有宣称外部项目已合入。
- 该结果不覆盖原 `BerryCurvature.lean` 中其他 `True` 占位、任意复值结构、陈数拓扑或完整外微分形式。
- 新增可微性前提是求导规则的一部分，不是可省略的技术细节；物理上常见的光滑联络假设也不能代替 Lean 中的显式证据。
