# ReactionNetwork：真实 Lean 构建与声明级公理审计

**日期**：2026-11-08
**状态**：选定模块与选定声明通过；不是全库 Lake 构建，不是物理语义证明
**源码**：TOE-SYLVA-pull，提交 `06cb70e503f60bd0c4a5bcadd4e9a0e837fcd01b`
**源码文件**：`PhysicalChemistry/ReactionNetwork.lean`
**源码 SHA-256**：`1fcfeb8a662e73ebb9b40239835d4c6aaaa3bc3194b03e9db07abcb5f27d160b`

## 1. 最终实测结果

| 项目 | 实际结果 | 证据边界 |
|---|---|---|
| 隔离研究 API 自检 | 成功；服务与临时数据库均清理 | 默认不执行模型、arXiv 或 Lean 构建 |
| 选定 Lean 文件文本同步 | 1 个文件，22 个定理、27 个定义、0 个证明位 sorry、2 个 axiom | 只读文本统计，不等于编译 |
| Windows Lean 直接编译 | 退出码 0 | 编译 `PhysicalChemistry/ReactionNetwork.lean`，不是全库 Lake build |
| 编译产物 | `PhysicalChemistry/ReactionNetwork.olean` | SHA-256 `14f72a0d62e1a9dd40bd97b2746a452d9c8cc05482bbb4c4b769200828bf1d09` |
| 声明级公理审计 | 退出码 0 | 仅 `Sylva.ReactionNetwork.MM_deficiency_zero_computed` |
| 公理依赖 | `propext`、`Classical.choice`、`Quot.sound` | 无 `sorryAx`；没有新增公理 |
| 可复现脚本 | `scripts/verify-reaction-lean.ps1` | 含 `run_all_tests()`；最终构建与审计均为 0 |
| 结构化证据 | `research/formalization/reaction-network-lean-audit.json` | 由最终成功运行生成 |

最终公理输出为：

```text
'Sylva.ReactionNetwork.MM_deficiency_zero_computed' depends on axioms: [propext, Classical.choice, Quot.sound]
```

这只能证明该声明在当前源码和依赖下没有 `sorryAx` 或额外自定义公理，不能推出全部化学命题、全部物理映射或整个 TOE-SYLVA 仓库都已证明。

## 2. 实际复现命令与退出码

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-reaction-lean.ps1 `
  -LeanHome 'D:\kimi-migration\workspace\provider-main-integration\.tmp\lean-4.29.0-windows\lean-4.29.0-windows' `
  -SylvaRoot 'D:\kimi-workspace\TOE-SYLVA-pull\sylva_formalization\SylvaFormalization' `
  -OutputDirectory 'D:\kimi-migration\workspace\provider-main-integration\.tmp\reaction-lean-audit-run' `
  -ReportPath 'D:\kimi-migration\workspace\provider-main-integration\research\formalization\reaction-network-lean-audit.json'
```

本次实际退出码：脚本、直接编译和公理审计均为 **0**。工具链为官方 Lean v4.29.0，提交 `98dc76e3c0a9b856c9b98726b713fb04fab16740`。

## 3. 环境失败与修正过程

1. 默认隔离 API 自检成功，但 Lean 构建按配置被跳过；当时 Lean 历史快照数为 0。
2. 临时 `.cmd` 调用桥接被 Windows `spawnSync(..., { shell: false })` 以 `EINVAL` 拒绝，真实构建没有开始；自检服务与临时数据库均正常清理。
3. 改用可执行桥接后，完整自检和单独 Lake 构建均达到 300 秒工具上限，没有形成成功结果。
4. 短时诊断显示 Lake 进程等待在 `p9_client_rpc`，并打开 `.lake/config/[anonymous]/lakefile.olean.trace`。这说明 WSL 的 9P 文件访问是环境瓶颈，不能把超时解释成证明失败。
5. 下载官方 Windows Lean v4.29.0 后，直接编译在约 22 秒内完成。第一次公理调用因 `.olean` 未按模块目录放置而未通过，将产物放到 `PhysicalChemistry/ReactionNetwork.olean` 后审计成功。
6. 复现脚本第一次生成审计文件时，Windows PowerShell 5.1 的 `Set-Content UTF8` 引入 BOM，Lean 报 `expected token`。已改为纯 ASCII 无 BOM 写入并重新运行，最终脚本与审计均通过。

因此，本报告只主张“原生 Windows Lean 的直接编译与声明审计成功”，不主张 Lake 全库构建成功。

## 4. 未消除的源码警告与缺陷

直接编译日志仍包含以下警告，未被关闭或隐藏：

- 第 56–60 行附近：`ReactionNetwork` 重复命名空间；
- 多处未使用变量和假设；
- 第 564 行附近有不可达 tactic 和无效 `norm_num`；
- 第 605、609、613 行附近也有不可达 tactic。

另一个独立发现是：`BerryCurvature.lean` 的 `BerryCurvature_GaugeInvariance` 当前仍为 `True := by trivial` 占位。它不能作为有效的规范不变性证明样本，本报告没有使用该声明，也没有修改外部 TOE-SYLVA 源树。此缺陷在本审计中明确登记，不因其他模块构建成功而视为已解决。

## 5. 后续边界

- 全库 Lake 构建尚未完成；需要处理 WSL 9P 性能或在原生 Windows Lake 环境中重新验证。
- 当前只有一个模块和一个声明的真实证据，其他声明、其他模块和全文中的 `sorry`／TODO 不能自动核销。
- 需要保留并处理源码警告和占位定理，不能用零退出码替代数学内容审查。
- 物理语义、实验验证、观测拟合和模型族排除均不在本次审计范围内。
