# 全仓库审计记录：测试、遗留问题与后续顺序

**日期**：2026-11-07
**范围**：当前工作树、 tracked 文件、研究脚本、根平台与后端测试、构建、lint、文档状态和敏感信息模式扫描。
**状态**：审计与首轮修复已完成；全部遗留问题**尚未**解决。

## 1. 总体结论

根平台与后端当前可构建、可测试，零模型的 CLASS–CAMB TT 输出口径错误已经修正并推送。仓库不能被描述为“全部完成”：全库 lint 仍有 52 个 `no-explicit-any` 错误和 17 个警告，后端另有 40 个警告；极端物质谱、低波数规范映射、复合实现差异以及观测检验仍是开放研究方向。

历史设计文档中的“未实现”、已经移除的 Vite／Electron 前端，以及论文中的形式化占位，不能不加区分地当作当前生产故障。

## 2. 实际验证结果

| 检查 | 本次结果 | 证据边界 |
|---|---|---|
| 根平台单元测试 | 58 项通过，0 失败，258 个断言 | 19 个测试文件；不代表全部端到端场景 |
| 根平台当前范围 lint | 通过 | 只覆盖 `npm run lint` 声明的范围，不等于 `lint:all` |
| TypeScript `tsc --noEmit` | 通过 | 在首轮小修复后重新执行 |
| Next standalone 构建 | 通过 | Next 16.2.9，42 个静态页面生成完成 |
| 后端集群单元测试 | 12 项通过，0 失败 | 只覆盖 KimiClusterOrchestrator 测试集 |
| 后端 Express 构建 | 通过 | `tsc` 完成 |
| 后端 lint | 0 错误、40 警告 | 警告主要是未使用变量和未使用导入 |
| 根平台 `lint:all` | 52 错误、17 警告 | 已从审计前的 57 错误、17 警告减少 |
| 操作目录生成 | 457 个操作、38 个后端路由 | 登记数量不代表全部端到端验证 |

审计开始时工作区没有未提交修改。仓库共有 758 个 tracked 文件；最大 tracked 文件约 6.16 MB，没有超过 10 MB 的 tracked 文件。敏感信息模式扫描未命中 tracked 内容；`.env.local` 被 `.gitignore` 排除，未进入 tracked 文件列表。该结果不等于对本机所有忽略文件或历史提交作绝对安全保证。

## 3. 本轮已修复

1. **TT 输出口径错误**：CLASS `cl.dat` 与 CAMB `lensed_scalar` 曾被混比。现已分别使用 CLASS `cl.dat`／CAMB `unlensed_scalar` 和 CLASS `cl_lensed.dat`／CAMB `lensed_scalar`，旧输出与哈希保留。对应提交为 `bc0fb4e3e0c89db1fed68a7bd89dc5bd78acf3e5`。
2. **Next 禁止的 `module` 变量**：`sylva-sync` 改为 `parsedModule`，并修复遗漏的函数参数；TypeScript 与 Next 构建复验通过。
3. **四处 `let` 误用**：`workshop`、`pipeline`、`cleaned`、`fixed` 改为 `const`。
4. **文档数字过时**：README 更新为根平台 58 项测试、后端 12 项测试和 457 个操作。
5. **研究运行缓存**：增加 `__pycache__/` 与 `*.pyc` 忽略规则，避免运行输出进入版本控制。

## 4. 尚未解决的问题与优先级

### P1：52 个显式 `any` 类型错误

问题集中在真实 API 和工具库，不能用全局禁用规则或强制转换掩盖。热点包括：

- `src/app/api/research/competitions/[id]/rounds/route.ts`：11 项；
- `src/app/api/research/panels/[id]/execute/route.ts`：7 项；
- `collaborations/init`、`review-boards/[id]/reviews`、`platform-api.ts`、`research-prompts.ts` 等。

后续应按业务数据结构建立请求、响应、数据库记录和错误载荷的明确类型，并为修改后的路由补充行为测试。仅把 `any` 改成 `unknown` 而不收窄，不算完成。

### P2：根平台 17 个警告与后端 40 个警告

主要是未使用变量、未使用导入、mock 生成函数和请求参数。需要区分：

- 可直接删除的死代码；
- 预留但必须显式标记的接口；
- 与当前无界面架构冲突、应该归档的旧实现。

不得在删除 mock 或路由辅助函数前只凭 lint 结果判断其运行时无引用。

### P2：零模型与跨代码数值研究

- 极端物质谱点值在 CLASS、CAMB 及不同精度档位间仍不稳健，需研究带符号、平滑化和带功率统计，不能把深谷插值点用于物理排除。
- CLASS Newtonian 与 CAMB 同步规范密度在低波数并非天然同义，需明确规范转换或限定主要比较区间。
- CAMB 使用 Recfast，CLASS 使用 HyRec 2020；复合实现差异没有被当前检验完全消除。
- 尚未接入真实观测似然、参数空间搜索、联合 BBN 或非线性计算，不能宣称对整个无 CDM 模型族的观测排除或支持。

### P3：历史文档与形式化证据

历史接口建议、旧平台清单和论文中的 `sorry`／TODO 只能说明当时的规划或证据状态，不能由当前单元测试自动核销。Lean 相关主张需要独立的源码、编译和公理依赖审计；文本解析通过不等于证明完成。

## 5. 后续执行顺序

1. 先处理两个 `any` 热点路由及其行为测试，再推广到其余文件；
2. 清理可证实的死代码和未使用导入，保留并标注有意的接口预留；
3. 对极端物质谱实现平滑化和带功率对照，同时记录低波数规范边界；
4. 在数值系统误差进一步闭合后，再评估公开似然、联合 BBN 与非线性工作；
5. 每次修改后重跑根平台 91 项测试、后端 12 项测试、TypeScript、构建与 `lint:all`，不以局部通过代替全库结论。

本记录是下一轮工作的基线，不是“全部问题已经解决”的声明。

## 6. 首轮后续进展

- `competitions/[id]/rounds/route.ts` 的 10 个 `no-explicit-any` 已全部移除，另有的第 11 项是独立的未使用变量警告，不能计为 `any`。LLM 合并逻辑已迁移到 `src/lib/competition-round-content.ts`，使用明确的参赛者、内容、评分和轮次条目类型。
- 新增 `tests/unit/competition-round-content.test.js`，覆盖双方参赛者合并、空结果回退、失败分数不冒充有效评分及源对象不被修改。根平台测试总数因此从 58 增至 61，全部通过。
- 全库 `no-explicit-any` 从 52 降至 42；`lint:all` 当前为 42 错误、17 警告。TypeScript 与 Next standalone 构建已复验通过。
- `panels/[id]/execute/route.ts` 的 6 个 `no-explicit-any` 已全部移除，`hasChair` 未使用警告也已清理。执行计划、成员、阶段和自定义策略解析已迁移到 `src/lib/panel-execution.ts`，使用明确类型和 `unknown` 类型守卫。
- 新增 `tests/unit/panel-execution.test.js`，覆盖顺序阶段排序、自定义阶段默认值和无效策略回退。根平台测试总数从 61 增至 64，全部通过。全库 `no-explicit-any` 进一步降至 36，`lint:all` 为 36 错误、16 警告；TypeScript 与 Next standalone 构建已复验通过。
- `collaborations/init/route.ts` 的 3 个 `as any` 已全部移除。专家模板迁移到 `src/lib/collaboration-init.ts`，使用 `ValidationRole` 联合类型约束 `lead_validator、validator、witness、checker`；未知领域继续回退到默认模板。
- 新增 `tests/unit/collaboration-init.test.js`，验证所有模板角色、必要字段和默认回退。根平台测试总数从 64 增至 66，全部通过。全库 `no-explicit-any` 进一步降至 33，`lint:all` 为 33 错误、16 警告；TypeScript 与 Next standalone 构建已复验通过。
- `review-boards/[id]/reviews/route.ts` 的 2 个 `any` 已全部移除，未使用的 `catch (e)` 也已清理。Prisma 查询条件、评审团与评审上下文改由 `src/lib/review-board.ts` 提供明确类型。
- 新增 `tests/unit/review-board.test.js`，覆盖查询条件、评审上下文、空评审团和默认字段。根平台测试总数从 66 增至 69，全部通过。全库 `no-explicit-any` 进一步降至 31，`lint:all` 为 31 错误、15 警告；TypeScript 与 Next standalone 构建已复验通过。
- `src/lib/platform-api.ts` 的 3 个 `Record<string, any>` 已全部改为 `Record<string, unknown>`。SSE 解析逻辑迁移到 `src/lib/platform-sse.ts`，事件对象和解析结果均有明确类型。
- 新增 `tests/unit/platform-sse.test.js`，覆盖完整事件、未完成缓冲区和非法 JSON。根平台测试总数从 69 增至 72，全部通过。全库 `no-explicit-any` 进一步降至 28，`lint:all` 为 28 错误、15 警告；TypeScript 与 Next standalone 构建已复验通过。
- `src/lib/research-prompts.ts` 的 3 个 `any` 已全部移除。`PromptTemplate` 改为使用 `PromptContext`，索引签名收紧为 `unknown`，并补齐阶段、标题、文件、行号等显式字段；竞赛提示词由 `src/lib/competition-prompt.ts` 统一构造。
- 新增 `tests/unit/competition-prompt.test.js`，验证轮次、格式、参赛者列表和默认值。根平台测试总数从 72 增至 74，全部通过。全库 `no-explicit-any` 进一步降至 25，`lint:all` 为 25 错误、15 警告；TypeScript 与 Next standalone 构建已复验通过。
- `competitions/[id]/competitors/route.ts` 的 1 个 `any` 已移除，参赛者筛选改由 `src/lib/competitor-filter.ts` 返回 `Prisma.AcademicCompetitorWhereInput`。
- 新增 `tests/unit/competitor-filter.test.js`，验证角色、淘汰状态和空筛选。根平台测试总数从 74 增至 76，全部通过。全库 `no-explicit-any` 进一步降至 24，`lint:all` 为 24 错误、15 警告；TypeScript 与 Next standalone 构建已复验通过。
- `competitions/route.ts` 的 1 个 `any` 已移除，竞赛列表筛选改由 `src/lib/competition-filter.ts` 返回 `Prisma.AcademicCompetitionWhereInput`。
- 新增 `tests/unit/competition-filter.test.js`，验证领域、状态、格式和空筛选。根平台测试总数从 76 增至 78，全部通过。全库 `no-explicit-any` 进一步降至 23，`lint:all` 为 23 错误、15 警告；TypeScript 与 Next standalone 构建已复验通过。
- `research/modules/route.ts` 的 2 个 `any` 已移除，模块筛选和分类分组改由 `src/lib/research-modules.ts` 提供明确类型；同时按 Prisma 7 的真实类型移除不支持的 `mode: "insensitive"` 字段。
- 新增 `tests/unit/research-modules.test.js`，覆盖多条件检索和“未分类”分组。根平台测试总数从 78 增至 80，全部通过。全库 `no-explicit-any` 进一步降至 21，`lint:all` 为 21 错误、15 警告；TypeScript 与 Next standalone 构建已复验通过。
- `research/notes/route.ts` 的 1 个 `any` 已移除，笔记标签筛选改由 `src/lib/research-notes.ts` 返回 `Prisma.ResearchNoteWhereInput`。
- 新增 `tests/unit/research-notes.test.js`，验证标签存在与未提供时的筛选结果。根平台测试总数从 80 增至 82，全部通过。全库 `no-explicit-any` 进一步降至 20，`lint:all` 为 20 错误、15 警告；TypeScript 与 Next standalone 构建已复验通过。
- `panels/[id]/members/route.ts` 的 1 个 `any` 已移除，专家组成员筛选改由 `src/lib/panel-member-filter.ts` 返回 `Prisma.AcademicPanelMemberWhereInput`。
- 新增 `tests/unit/panel-member-filter.test.js`，验证专长、角色和空筛选。根平台测试总数从 82 增至 84，全部通过。全库 `no-explicit-any` 进一步降至 19，`lint:all` 为 19 错误、15 警告；TypeScript 与 Next standalone 构建已复验通过。
- `panels/route.ts` 的 1 个 `any` 已移除，专家组领域筛选改由 `src/lib/panel-filter.ts` 返回 `Prisma.AcademicPanelWhereInput`。
- 新增 `tests/unit/panel-filter.test.js`，验证领域存在与空筛选。根平台测试总数从 84 增至 86，全部通过。全库 `no-explicit-any` 进一步降至 18，`lint:all` 为 18 错误、15 警告；TypeScript 与 Next standalone 构建已复验通过。
- `research/papers/route.ts` 的 2 个 `any` 已移除，论文筛选和按类型分组改由 `src/lib/research-papers.ts` 提供明确类型；同时按 Prisma 7 移除不支持的 `mode: "insensitive"` 字段。
- 新增 `tests/unit/research-papers.test.js`，覆盖多条件检索和 `Unknown` 分组。根平台测试总数从 86 增至 88，全部通过。全库 `no-explicit-any` 进一步降至 16，`lint:all` 为 16 错误、15 警告；TypeScript 与 Next standalone 构建已复验通过。
- `pipelines/[id]/stages/[stageId]/route.ts` 的 1 个 `any` 已移除，阶段更新对象改由 `src/lib/pipeline-stage-update.ts` 返回 `Prisma.PipelineStageUpdateInput`；确认未使用的模拟阶段内容函数和冗余 `statusOverride` 已删除。
- 新增 `tests/unit/pipeline-stage-update.test.js`，覆盖高分完成、低分拒绝和显式状态回退。根平台测试总数从 88 增至 91，全部通过。全库 `no-explicit-any` 进一步降至 15，`lint:all` 为 15 错误、14 警告；TypeScript 与 Next standalone 构建已复验通过。
