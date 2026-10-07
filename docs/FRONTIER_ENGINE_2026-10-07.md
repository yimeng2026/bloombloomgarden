# 前沿吞并引擎（Frontier Engine）工程文档

日期：2026-10-07 ｜ 版本：v1.0 ｜ 状态：已验收（真实数据）

## 1. 设计总览

千界花园升级为"前沿吞并引擎"：自动追踪、摄取、消化全球学术前沿。三层架构：

```
arXiv API (export.arxiv.org)
      │  atom / HTTPS 优先，HTTP 兜底
      ▼
摄取层  src/lib/frontier/arxiv-ingest.ts
      │  六主题轮询 · 按 arXiv id（去版本号）全局去重 · 关系标签规则打标
      ├──► 日落盘    data/frontier/arxiv_<date>.json   （增量合并）
      ├──► 去重索引  data/frontier/index.json          （baseId → firstSeen/topics）
      ├──► KB 摘要卡 data/frontier/kb/<topic>/<id>.md  （front-matter + 一句话 + 关系标签）
      └──► 每日快报  data/frontier/digest_<date>.json  （LLM 生成 / 降级原始摘要）
      ▼
API 层  /api/frontier/arxiv（GET 列表 / POST 抓取）
        /api/frontier/kb（GET 检索）
      ▼
纸面层  /frontier（快报纸面 UI）
```

配置集中在 `src/lib/frontier/frontier.config.ts`：六主题（quant-ph / gr-qc / hep-th / math.AG / math.NT / cs.LO），每主题 = arXiv 分类 + 关键词表；关系标签规则四条：**可形式化**（Lean/mathlib/Coq/Isabelle…）→ **竞品**（theory of everything/unified theory…）→ **对接**（emergent spacetime/quantum gravity/information geometry/dark matter…）→ **可评论**（foundations/no-go/paradox…），多标签叠加。

## 2. 端点

| 端点 | 方法 | 参数 | 说明 |
|---|---|---|---|
| `/api/frontier/arxiv` | GET | `topic` `date` `tag` `limit` `digest=1` | 已摄取条目列表（跨日或单日过滤），可附今日快报 |
| `/api/frontier/arxiv` | POST | `{topics?, maxResults?, digest?, redigest?}` | 触发真实抓取；`redigest:true` 跳过抓取用当日条目重生成快报 |
| `/api/frontier/kb` | GET | `topic` `tag` `q` `limit` | KB 摘要卡检索（主题/关系标签/模糊词） |
| `/frontier` | — | — | 快报纸面：快报横幅、主题分组卡片、关系标签筛选、摄取时间 |

## 3. 实测验收数据（2026-10-07，全部真实）

| 项目 | 结果 |
|---|---|
| arXiv 连通性 | `export.arxiv.org` HTTPS HTTP 200（2.6s） |
| 抓取（POST digest:true） | HTTP 200 / 73.9s；API 返回 **150 条**（6 主题 × 25），去重后新增 **144 条**（跨主题去重命中 6），errors=0 |
| 分主题 | quant-ph 25/25、gr-qc 25/24、hep-th 25/20、math-ag 25/25、math-nt 25/25、cs-lo 25/25（fetched/new） |
| KB 落卡 | **144 张** md 卡（data/frontier/kb/ 六主题目录），`?tag=可形式化` 检索命中正常 |
| 每日快报 | 首跑 `digestSource=fallback-raw`（LLM 输入 144 条全量超上下文 → 空回复，降级路径生效）；修复为上限 30 条 + maxTokens 8192 后 `redigest` 实测 `digestSource=llm, provider=kimi-gateway`，生成中文分组快报 |
| 页面 | `/frontier` HTTP 200；Edge 无头截图 `frontier_page.png`（快报区）/ `frontier_page_full.png`（卡片区，真实论文+发布时间+摄取时间+标签） |
| tsc 严格模式 | 新增 frontier 代码 **0 错误**（全项目存量 4 个错误均在 provider-pool.ts/research-llm.ts，非本次引入） |
| 兼容性 | 纯新增文件，未改动任何既有文件逻辑（仅 research-llm 被 import 调用），75 路由零破坏；无 git 写操作 |

## 4. 降级路径（绝不假造）

1. **arXiv 网络失败**：HTTPS 主端点 → HTTP 兜底；主题级失败记入 `report.errors`，其余主题照常落盘，接口仍 200（`ok` 字段标注）。
2. **LLM 快报失败**（无 key / 空回复 / 超时）：`digestSource="fallback-raw"`，快报内容 = 原始摘要列表（标题+链接+首句），并附 `llmError`；UI 显示"降级 · 原始摘要"琥珀色徽标，与 AI 生成（靛蓝徽标，标注 provider）明确区分。
3. **KB 落卡失败**：单卡失败不阻断摄取，计入 `report.errors`。

## 5. 环境注意（实测）

- node 运行时 = Kimi.exe（`KIMI_DESKTOP_RUNTIME_NODE`，ELECTRON_RUN_AS_NODE=1，v24.21.0）。**Turbopack 模式 dev server 渲染页面失败**（PostCSS pooled worker 需 `node.exe`，PATH 中只有 shim 脚本 → "program not found"）；**`next dev --webpack` 正常**。启动器见 `tools/_frontier_dev.py`（python 子进程 + 端口等待）。
- 停服：`taskkill /PID <npm pid> /T /F`，netstat 复核 3001/3002 无监听（已执行，证据见收尾报告）。

## 6. 下一步

- 快报 LLM 输入按主题配额（当前全局前 30 条，hep-th 之后主题可能占比不足）。
- 摄取定时化：接入 Automation（cron 每日 08:xx POST /api/frontier/arxiv）。
- KB 卡接入 GraphRAG 实体抽取，形成"前沿论文 ↔ TOE-SYLVA 概念"图谱边。
- 增加 arXiv id 版本追踪（v2 更新提醒）与 Crossref/Semantic Scholar 引用数富化。
