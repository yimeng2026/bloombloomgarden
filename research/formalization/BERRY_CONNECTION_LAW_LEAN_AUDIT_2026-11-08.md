# Berry 联络一般规范变换律：Hilbert 内积证明与公理补丁审计

**日期**：2026-11-08
**状态**：独立物理定理与原文件补丁均编译、公理审计通过；外部 TOE-SYLVA 源树未修改
**范围**：明确复 Hilbert 空间中的实际 Berry 联络，不是完整 Bloch L² 映射或全库证明

## 1. 旧结构为何不能直接证明

旧 `NormalizedBlochState` 的归一化、内积线性、正定性和完备性都只是未约束的 `Prop`，没有提供可使用的等式或代数结构。原 `BerryConnection_GaugeTransformationLaw` 因而只能是空 `True` 公理，不能从旧结构恢复物理推导。

本次使用明确的 `InnerProductSpace ℂ H`，并直接定义

\[
A(u,k,v)=i\,\langle u(k),D_vu(k)\rangle,\qquad
u'(k)=e^{i\theta(k)}u(k).
\]

在 `θ`、`u` 可微且 `inner(u(k),u(k))=1` 的前提下，使用 `HasFDerivAt.cexp`、`fderiv_smul` 和内积双线性证明 `A′=A−dθ`。归一化、相位模和 `I²=-1` 都作为显式证据进入最终代数，不是定义恒等式。

## 2. 符号一致性

旧注释同时出现 `A+dθ` 与推导中的 `-∂θ+A`。本证明采用 `A=I·inner(u,du)` 的约定，得到 `A′=A−dθ`。补丁同步把相关旧注释改为减号，避免代码正确而文档符号相反；另一套加法实值联络定义仍可视为不同约定，不能混用来宣称同一物理命题。

## 3. 交付文件

- `research/formalization/BerryConnectionGaugeLaw.lean`：独立 Hilbert 物理规范律。
- `research/formalization/berry-connection-gauge-law.patch`：149 行补丁，替换原空公理并纠正相关符号注释。
- `scripts/prepare_berry_connection_law_patch.py`：补丁生成、必要证据和旧符号守卫。
- `scripts/verify-berry-connection-law-lean.ps1`：依赖、独立证明、原文件补丁及公理审计。
- `research/formalization/berry-connection-gauge-law-lean-audit.json`：最终结构化证据。

原文件 534 行，修补后 551 行。原文件 SHA-256 为 `2e0066e9063e3639ba16ce6105aaf965685e54a7a7c12f6ebef55ae6c5fc0ee8`，外部源树未回写。

## 4. 失败测试与最终实现

不完整候选以退出码 1 失败，目标为实际内积规范律。实现中分别修正导数等式方向、相位共轭乘积展开、归一化到范数平方的转换以及最终代数证据组合，随后独立定理和原文件补丁均通过。

## 5. 最终验证命令与输出

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-berry-connection-law-lean.ps1 `
  -LeanHome 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\.tmp\berry-law-verification' `
  -ReportPath 'C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration\research\formalization\berry-connection-gauge-law-lean-audit.json'
```

实际退出码：**0**。`bloch`、独立证明、独立公理审计、修补文件和原文件公理审计各阶段均为 0。补丁同步与实际应用一致性均为 `true`，禁止占位／新增公理扫描为 `false`。

两条原始公理输出为：

```text
'BerryConnection.BerryConnection_GaugeTransformationLaw_physical' depends on axioms: [propext, Classical.choice, Quot.sound]
'BerryConnection.BerryConnection_GaugeTransformationLaw' depends on axioms: [propext, Classical.choice, Quot.sound]
```

没有 `sorryAx` 或新增自定义公理。`oldNormalizedBlochStateUsed=false`，`fullBlochL2MappingProved=false`，边界明确保留。

## 6. 保留问题

- 旧 Bloch 态到实际 L² Hilbert 空间的映射、归一化证明和周期性仍需另行形式化。
- 其他 `True` 占位和既有警告未自动清偿；本定理不覆盖陈数、Kubo 公式或完整外微分。
- 外部 TOE-SYLVA 项目尚需由维护者应用补丁并更新登记；本仓库不宣称外部项目已合入或全库物理语义已证明。
