# 千界花园 · Kimi 专用无界面研究工程

千界花园是一套由 Kimi 驱动的研究与工程控制系统：Next 研究 API + Express 编排后端 + 同一 Kimi 集群执行层。页面、Vite 前端和 Electron 已移除，研究对象、群组、任务、工作流、知识库、验证与审计能力保留。

**完整手册：[Kimi 专用无界面研究使用手册](docs/KIMI_HEADLESS_RESEARCH_GUIDE.md)**

![Kimi 专用无界面研究架构](docs/images/kimi-headless-architecture.png)

## 核心边界

- 花园负责研究任务、角色、数据、工作流、证据和审计；
- Kimi 集群只负责同 Provider 下的节点、并发、负载、熔断、退避和流式执行；
- `KIMI_API_KEY` 只用于模型调用，`GARDEN_AGENT_TOKEN` 只用于授权调用花园；
- 文本解析不是 Lean 编译，零 sorry 不是完整证明，LLM 评议不是独立证明；
- 操作数量、论文数量和生成速度不作为科研真实性指标。

## 安装与启动

```powershell
npx --yes bun install --frozen-lockfile
npm --prefix backend ci
```

复制 `.env.example` 为 `.env`，填写 `KIMI_API_KEY` 和独立生成的 `GARDEN_AGENT_TOKEN`。需要同步 Lean 文件时另设 `TOE_SYLVA_PATH`。

同时启动两个无界面服务：

```powershell
npm run dev -- --port 7100
```

- Next 研究 API：`http://localhost:7100`
- Express 编排后端：`http://127.0.0.1:3001`

生产启动分别使用 `npm start`（Next standalone）和 `npm --prefix backend run start`。生产环境必须另行配置 `GARDEN_BACKEND_URL`、数据库和 Agent 凭据。

## Kimi 控制入口

`GET /api/kimi-control` 返回由真实源码生成的操作目录；`POST /api/kimi-control` 调用目录中的真实功能。所有非 GET 操作必须显式 `confirm: true`，敏感字段会被脱敏，审计不记录请求正文。

```powershell
$headers = @{ Authorization = "Bearer $env:GARDEN_AGENT_TOKEN" }
Invoke-RestMethod -Uri "http://localhost:7100/api/kimi-control" -Headers $headers
```

`POST /api/kimi-agent` 允许 Kimi 通过 `garden_catalog` 和 `garden_invoke` 两个元工具发现并调用功能。默认 `allowWrites=false`，模型不能自行提升写权限。

## Kimi 集群

`KIMI_CLUSTER_NODES` 支持同 Provider 的多密钥、多端点和不同并发上限；每项使用 `apiKeyEnv` 引用环境变量，不在 JSON 中内嵌密钥。相同账户的多个密钥不意味着配额必然增加。

- 429 指数退避并允许节点故障切换；
- 400 不重试，全部熔断时不强行请求；
- 配置存在不等于健康，主动健康检查才调用真实模型；
- 正文与 `reasoning_content` 分离；
- 其他供应商不再作为隐式 fallback。

详见手册的集群配置与协作纪律。

## 验证

```powershell
npm test
npm run lint
node node_modules/typescript/bin/tsc --noEmit
npm run build
npm --prefix backend run test:unit
npm --prefix backend run build
```

当前实测：根平台 50 项单元测试通过；本次新增规律包代码 lint、TypeScript 检查和 Next standalone 构建通过。此前后端集群 12 项单元测试及 Express 构建已通过，但本轮未重复执行。`lint:all` 仍有存量问题，不能据此宣称全库 lint 通过。

操作目录由 `node scripts/generate-kimi-operations.mjs` 生成，当前为 439 个操作。该数字只表示已登记路由，不表示全部已端到端验证。

## 安全与数据

- `dev.db`、`.env*` 和审计输出不进入 Git 或 Docker 构建上下文；
- `db:push` 不再默认接受数据丢失；只有明确选择 `db:push:unsafe` 才允许；
- 生产数据库迁移必须单独审查，历史 Agent 的其他供应商密钥由专门迁移清理；
- 高风险写入、发布、部署和模型训练需要独立验收，不由单元测试代替。

## License

MIT，见 [LICENSE](LICENSE)。
