# p+ip 相图与陈数符号统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用同一 BdG 矩阵、Read–Green 绕数约定、FHS 占据带计算和连续模型积分，裁决并修复系列稿件的 p+ip 相图及陈数符号冲突。

**Architecture:** 先冻结约定，再用两种独立数值方法复核，最后只修改受影响的论文段落。主证据是可执行脚本、原始 JSON 和测试，不用文字投票决定符号；连续模型与晶格模型分开报告。

**Tech Stack:** Python 3、NumPy、unittest、Markdown、Pandoc／原生 DOCX、Git。

## Global Constraints

- 在现有 `provider-main-integration` 链接工作区执行，不新建嵌套 worktree，不覆盖无关未提交成果。
- 不使用子代理；由主代理逐项执行。
- 采用 `H=Re(Δ)τx−Im(Δ)τy+ετz`，Read–Green 向量为 `E=(ReΔ,−ImΔ,ε)`，Berry 联络采用 `A=+i〈u|∂u〉`；若改用其他符号必须显式转换。
- 晶格模型固定 `ε=−μ−2t(cos kx+cos ky)`，`Δ=Δ0(sin kx+i sin ky)`；连续模型固定 `ε=k²−μ`、`Δ=kx+i ky`（质量与速度取 1）。
- 相变点不计算陈数；不能把晶格负 μ 的整个区间称为强配对企业相。
- 只修复模型、拓扑分类、相图、结论和直接数据可用性声明；实验数据、CdGM 和其他论文缺陷另立任务。
- 外部基线使用 Read–Green 原文 `arXiv:cond-mat/9906453` 与 FHS 原始方法，不能仅凭近期论文或仓库自述定符号。
- 研究报告同时交付原生 Word；图像真实嵌入、表格为真正 Word 表格，结构验证与视觉检查分开。
- 每个验证结论保存命令、退出码和原始输出；不允许把通过编译等同于实验验证。

---

### Task 1: 冻结双模型与双方法证据

**Files:**
- Create: `papers/topo-quantum-internet/verification/pip_chern_convention.py`
- Create: `papers/topo-quantum-internet/verification/test_pip_chern_convention.py`
- Create: `papers/topo-quantum-internet/verification/pip_chern_convention_results.json`
- Reference: `toe-sylva-audit/papers/topo_quantum_internet/verify_topo_qinternet.py:74-113`

**Interfaces:**
- `bdg(kx, ky, mu, t=1.0, delta=0.5, chirality=1) -> numpy.ndarray`：返回与文稿一致的 2×2 BdG 矩阵。
- `lattice_degree(mu, t, delta, grid, chirality=1) -> float`：解析导数积分 Read–Green 绕数。
- `fhs_chern(mu, t, delta, grid, chirality=1) -> float`：最低能带、标准链接变量、周期边界。
- `continuum_degree(mu, radial_grid=20000, r_max=200.0) -> float`：连续模型 Simpson 积分加无穷远解析尾部。
- `run_all_tests() -> bool`：测试失败打印期望与实际，进程以非零退出。

- [x] **Step 1: 先写会失败的测试**

固定测试期望，不根据输出反改答案：

```python
EXPECTED = {-5.0: 0, -1.0: 1, 1.0: -1, 5.0: 0}
for mu, expected in EXPECTED.items():
    for grid in (41, 81, 161):
        self.assertAlmostEqual(lattice_degree(mu, 1.0, 0.5, grid), expected, delta=0.03)
        self.assertAlmostEqual(fhs_chern(mu, 1.0, 0.5, grid), expected, delta=0.03)
self.assertAlmostEqual(continuum_degree(1.0), 1.0, delta=1e-6)
self.assertAlmostEqual(continuum_degree(-1.0), 0.0, delta=1e-6)
self.assertAlmostEqual(lattice_degree(1.0, 1.0, -0.5, 81), -1.0, delta=0.03)
self.assertAlmostEqual(lattice_degree(1.0, 1.0, 0.5, 81, chirality=-1), 1.0, delta=0.03)
with self.assertRaises(ValueError):
    fhs_chern(0.0, 1.0, 0.5, 41)
```

- [x] **Step 2: 运行测试并确认缺少实现**

Run: `python -m unittest discover -s papers/topo-quantum-internet/verification -p "test_*.py" -v`

Observed: 6 项测试均因计算器不存在而 FAIL，退出码 1；随后进入实现。

- [x] **Step 3: 实现最小的双方法计算器**

核心实现必须保持以下符号：

```python
def bdg(kx, ky, mu, t=1.0, delta=0.5, chirality=1):
    eps = -mu - 2*t*(np.cos(kx)+np.cos(ky))
    pairing = delta*(np.sin(kx)+1j*chirality*np.sin(ky))
    return np.array([[eps, pairing], [pairing.conjugate(), -eps]], dtype=complex)

# A=+i〈u|∂u〉时，FHS 链接展开要求 C=−Σarg(plaquette)/(2π)。
# E_map=(Δ sin(kx), −chirality*Δ sin(ky), eps)。
# Δ0 反号只是整体相位；chirality 反号才是 Δ_k→Δ_k*。
# 连续积分：E=(r cosφ,−r sinφ,r²−μ)，f(r)=r²−μ，
# M=(1/2)∫dr r[r f'(r)−f(r)]/[r²+f(r)²]^(3/2) + [1−f(R)/|E(R)|]/2。
```

先查 Γ、X、Y、M 的解析隙闭合，再查采样网格；直接积分使用解析导数，避免粗网格中心差分失真。连续模型使用复合 Simpson，并补上无穷远北极的解析尾部。

- [x] **Step 4: 运行测试并保存原始结果**

Run: `python -m unittest discover -s papers/topo-quantum-internet/verification -p "test_*.py" -v`

Observed: 7 项测试全部 PASS，退出码 0。`python papers/topo-quantum-internet/verification/pip_chern_convention.py` 同样退出码 0；12 个晶格结果的最大双方法差为 `1.7522414162307598e-05`，连续模型满足 `1e-6` 容差。

- [x] **Step 5: 提交独立验证层**

```bash
git add papers/topo-quantum-internet/verification/pip_chern_convention.py papers/topo-quantum-internet/verification/test_pip_chern_convention.py papers/topo-quantum-internet/verification/pip_chern_convention_results.json docs/superpowers/plans/2026-11-10-pip-chern-convention.md
git commit -m "Verify p+ip Chern signs with two methods"
```

### Task 2: 修复三篇稿件的对应段落

**Files:**
- Modify: `papers/topo-quantum-internet/Kitaev链与p_ip拓扑超导体_Majorana零能模数值研究.md`
- Modify: `papers/topo-quantum-internet/拓扑超导马约拉纳零能模_能谱分析与拓扑保护_投稿物理学报.md`
- Modify: `papers/topo-quantum-internet/拓扑量子物态与量子计算研究综述_投稿物理学报.md`
- Test: `papers/topo-quantum-internet/verification/test_manuscript_conventions.py`

**Interfaces:**
- Consumes: Task 1 的 `pip_chern_convention_results.json`。
- Produces: 三稿共用 `E=(ReΔ,−ImΔ,ε)`；晶格相区为 `0<μ<4t: −1`、`-4t<μ<0: +1`、外部为 0；连续弱配对为 +1、强配对为 0。

- [x] **Step 1: 先写文稿约束测试**

```python
self.assertNotIn("Ch = -sgn(μ)", first.read_text(encoding="utf-8"))
self.assertNotIn("mu^2 < 4(t^2 + \\Delta^2)", second.read_text(encoding="utf-8"))
self.assertIn("E=(\\operatorname{Re}\\Delta, -\\operatorname{Im}\\Delta, \\epsilon)", first.read_text(encoding="utf-8"))
self.assertIn("0<\\mu<4t", first.read_text(encoding="utf-8"))
self.assertIn("-4t<\\mu<0", first.read_text(encoding="utf-8"))
self.assertIn("pip_chern_convention_results.json", second.read_text(encoding="utf-8"))
```

同时禁止三稿继续把晶格 `μ<0` 全部写成平庸强配对，禁止无脚本时保留“200×200 FHS 已计算”的实证语气。

- [x] **Step 2: 运行约束测试并记录原稿失败行**

Run: `python -m unittest discover -s papers/topo-quantum-internet/verification -p "test_manuscript_*.py" -v`

Observed: 4 项约束均 FAIL，分别命中旧 `-sgn(μ)`、首次表述、缺失统一向量和缺失原始结果链接。

- [x] **Step 3: 做定点文字修复**

第一稿修复模型、Read–Green 向量、两个拓扑窗口、结论与证据链接；第二稿修复首次表述、连续／晶格分表、Kitaev 的 `|μ|<2t` 相界和实测网格；第三稿只同步 p+ip 向量、相图和证据链接。未重写无关章节。

- [x] **Step 4: 运行全部验证**

Run: `python -m unittest discover -s papers/topo-quantum-internet/verification -p "test_*.py" -v`

Observed: 11 项测试全部 PASS，退出码 0。Grep 对旧符号、错误 Δ 相界、200×200 和首次措辞无命中；原始结果生成脚本再次退出码 0。

- [x] **Step 5: 提交文稿修复**

```bash
git add papers/topo-quantum-internet/Kitaev链与p_ip拓扑超导体_Majorana零能模数值研究.md papers/topo-quantum-internet/拓扑超导马约拉纳零能模_能谱分析与拓扑保护_投稿物理学报.md papers/topo-quantum-internet/拓扑量子物态与量子计算研究综述_投稿物理学报.md papers/topo-quantum-internet/verification/test_manuscript_conventions.py docs/superpowers/plans/2026-11-10-pip-chern-convention.md
git commit -m "Unify p+ip phase diagrams and Chern conventions"
```

### Task 3: 形成可交付勘误报告与总账回写

**Files:**
- Create: `papers/topo-quantum-internet/P_IP_CHERN_CONVENTION_AUDIT.md`
- Create: `papers/topo-quantum-internet/P_IP_CHERN_CONVENTION_AUDIT.docx`
- Create: `papers/topo-quantum-internet/figures/pip_chern_phase_diagram.png`
- Modify: `garden-ecosystem/research/paper-direction-audit-2026-11-10/provider-review.json`（独立仓库提交，保留原风险记录，追加解决证据）

**Interfaces:**
- Consumes: Tasks 1–2 的测试结果、三稿 diff 和外部原文。
- Produces: 可复现勘误报告；`resolution_2026_11_10` 记录仅覆盖相图／符号，不宣称 CdGM、实验数字或整篇 P0 全部解除。

- [ ] **Step 1: 生成相图与报告**

相图横轴为 μ/t，标出 −4、0、4 三条隙闭合线及 +1、−1、0 相区。报告逐项列出“原句—问题—裁决—证据—未竟工作”，附 Read–Green 与 FHS 原始来源；说明符号约定改变不代表物理边界模式可以随意改名。

- [ ] **Step 2: 制作原生 Word**

使用已有 Pandoc／kimi-word 流程，嵌入 `pip_chern_phase_diagram.png`，生成页眉页码、目录域和原生公式。运行 `docx.py validate`，再渲染 contact-sheet，逐页检查图表、公式和表格，不用结构校验代替视觉验收。

- [ ] **Step 3: 最终复验与回写**

Run: `python -m unittest discover -s papers/topo-quantum-internet/verification -p "test_*.py" -v`

Expected: 全部 PASS。`provider-review.json` 原风险保留，新增解决报告路径、命令、通过数与剩余范围。

- [ ] **Step 4: 分别提交两个仓库**

主工作区提交报告、图、Word 和计划完成状态；花园仓库单独提交总账回写。只有实际退出码为 0 后才 `git push`，不合并或重置其他分支。

## Self-Review

- Spec coverage：相图、陈数符号、双模型区分、原始数据、三稿同步、报告与 Word、总账回写均有对应任务。
- Placeholder scan：没有 TBD、TODO 或“稍后验证”；唯一开放项是明确排除在本任务之外的 CdGM 和实验数据。
- Type consistency：所有测试和论文只消费 Task 1 定义的函数与 JSON；晶格期望 `+1/−1/0` 与 Read–Green 向量一致，不使用另一符号约定混写。
- Baseline：现有隔离工作区已确认；依赖已存在，不重跑全项目安装。历史未提交文件不属于本计划，不得纳入提交。
