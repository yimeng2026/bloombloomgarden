# 千界花园 — 构建与部署指南

## 快速开始

### 方式一：Docker Compose（推荐）

```bash
cd /path/to/thousand-realms-garden
docker-compose up --build
```

访问: http://localhost:5173 (前端) / http://localhost:3001 (后端API)

### 方式二：本地开发

**后端:**
```bash
cd backend
npm install
npm run dev
# 服务启动在 http://localhost:3001
```

**前端:**
```bash
cd frontend
npm install
npm run dev
# 开发服务器 http://localhost:5173
```

**Electron 桌面端:**
```bash
cd electron
npm install
cd ../frontend && npm run build
cd ../backend && npm run build
cd ../electron
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

## LLM Provider 配置

用户只需在 **设置 > API Keys** 页面选择 Provider 并填写 Key：

| Provider | 环境变量 | 备注 |
|----------|----------|------|
| Kimi Code | `KIMI_API_KEY` | 必须带 `User-Agent: claude-code/0.7.8` |
| Moonshot | `MOONSHOT_API_KEY` | 兼容 Kimi 格式 |
| OpenAI | `OPENAI_API_KEY` | 标准 OpenAI 格式 |
| Azure OpenAI | `AZURE_OPENAI_KEY` + `AZURE_OPENAI_ENDPOINT` | 需填写 Endpoint |
| Anthropic Claude | `ANTHROPIC_API_KEY` | 需 `anthropic-version` 头 |
| DeepSeek | `DEEPSEEK_API_KEY` | 支持 `reasoning_content` |
| Qwen/通义千问 | `DASHSCOPE_API_KEY` | 阿里云 dashscope |
| Gemini | `GEMINI_API_KEY` | Google Generative Language API |
| 智谱 GLM | `GLM_API_KEY` | 开放大模型平台 |
| OpenRouter | `OPENROUTER_API_KEY` | 多模型聚合网关 |

### 批量测试 API Key

```bash
# 设置环境变量后运行
$env:KIMI_API_KEY_1="sk-kimi-..."    # PowerShell
export KIMI_API_KEY_1="sk-kimi-..."   # Bash

# 测试所有 Provider
python test_all_providers.py

# 仅测试 Kimi Code 集群
python test_all_providers.py --kimi-only

# 生成 JSON 报告
python test_all_providers.py --report results.json
```

## 后端 API 端点速查

| 路由 | 功能 |
|------|------|
| `GET /health` | 健康检查 |
| `GET /api/agents` | Agent 列表 |
| `GET /api/agents/:id/context` | Agent 完整上下文（可折叠） |
| `POST /api/groups/:id/execute` | 群组执行（sequential/parallel/hierarchical） |
| `POST /api/knowledge-bases/search` | 语义搜索 |
| `POST /api/apikeys` | 保存 API Key（AES-256-GCM 加密） |
| `POST /api/apikeys/:id/test` | 一键测试连通性 |
| `GET /api/kimi-cluster/status` | Kimi 集群状态 |
| `POST /api/intervention/override` | AgentZero 4级干预 |
| `GET /api/spend/overview` | 用量统计（参考 LiteLLM） |
| `GET /api/events` | 系统事件中心 |
| `GET /api/registry` | 3DACP 注册中心 |
| `GET /api/external/platforms` | 外部平台集成 |
| `GET /api/security/events` | 安全审计 |

## 前端页面覆盖

共 **56** 个页面，**100%** 覆盖所有后端 Service：

- **平台**: PlatformHub, PlatformLibrary, Platforms, ExternalIntegrations
- **工作区**: WorkspaceHub, FileWorkspace, Workspaces
- **知识库**: KnowledgeHub, AiSearch, UploadsPage, Memory, MemoryExport
- **Agent**: Agents, AgentCreator, AgentCollab, AgentMonitor, DialogCenter
- **对话**: Chat, ChatChannels, TasksAndChat, Sessions
- **监控**: Monitoring, ContextMonitor, ProcessMonitor, EventsMonitor, EventsPage
- **任务**: TasksPage, TaskScheduler, TaskManager
- **编排**: Groups, Collaboration, SwarmPanel, SwarmArchitectures, Workflows, BlueprintStudio
- **工具**: Skills, APITest, RegistryView, ModelBrowser
- **设置**: SettingsHub, Admin, Login, APIKeys, OllamaSettings, SecurityCenter
- **费用**: SpendTracker
- **系统**: BackupManager, WebhooksPage, SchedulerPage, IntegrationManager, InterventionCenter, HierarchicalDashboard, UnifiedGUI

## 核心架构

### 3DACP (3D Axis Connection Protocol)

```
X轴 (1-15): 前端平台/客户端
Y轴 (1-15): 后端服务
Z轴 (1-20): 子工具/外部集成

AxisMessage {
  axisX, axisY, axisZ,
  payload: {...},
  headers: {...},
  protocol: 'REST' | 'SSE' | 'WS' | 'Internal' | 'Bridge' | 'External'
}
```

### 统一 LLM 适配器

- 10 大 Provider 独立 RequestBuilder
- 指数退避重试（1s→2s→4s→8s→16s）
- 熔断器（连续5次失败熔断30秒）
- Token 预算预检查
- 特殊处理：Kimi Code `User-Agent`, `reasoning_content`

## Electron 打包

```bash
# Windows 便携版
npm run dist:win
# 输出: electron/dist/千界花园-1.0.0.exe
```

打包配置已包含：
- 自动启动后端 Node 进程
- health 轮询与错误页面
- 前端 dist 静态文件嵌入
- 桌面快捷方式创建

## 测试覆盖

### Python 本地测试（纯本地，零网络依赖）

| 测试文件 | 用例数 | 功能 |
|----------|--------|------|
| `tests/python/test_token_cost_local.py` | 18 | Token 估算、成本计算、预算分级、SpendTracker 统计逻辑 |
| `tests/python/test_provider_schema_local.py` | 13 | 10 大 Provider 配置 Schema 校验、URL 合法性、重试/熔断器合规、.env.example 覆盖度、OpenAPI 交叉验证 |
| `tests/python/health_check.py` | — | 后端健康检查 |
| `tests/python/build_verify.py` | — | 构建产物验证 |

一键运行全部本地测试：
```bash
cd tests/python
python test_token_cost_local.py -v
python test_provider_schema_local.py -v
```

### 端到端 API 测试（需外网）

| 测试文件 | 功能 |
|----------|------|
| `test_provider_formats.py` | 10 大 Provider HTTP 请求格式验证（走 httpbin.org） |
| `test_kimi_advanced.py` | Kimi Code 5 Key 负载均衡 / failover / 并发 |
| `e2e_api_test.py` | 完整 API 流程（OpenRouter 实测通过） |

## 云端部署

### Render.com（推荐）

项目根目录已包含 `render.yaml`，直接导入 Render Dashboard 即可自动部署：

1. Fork / 上传代码到 GitHub
2. Render Dashboard → Blueprint → 粘贴 `render.yaml`
3. 自动识别 Dockerfile 多阶段构建
4. 免费额度：每月 750 小时

持久化磁盘：
- `/data` — SQLite 数据库（1GB）
- `/uploads` — 上传文件（1GB）

### 其他平台

- **Vercel**: 前端静态构建产物可独立部署
- **Railway**: 支持 Dockerfile，与 Render 类似
- **自托管 VPS**: `docker-compose up -d`

## 注意事项

1. **Vite 构建**: 容器环境可能遇到 esbuild binary 权限问题，建议在本地 Windows/Mac 上运行 `npm run build`
2. **Docker 镜像加速**: 国内环境需配置 `registry-mirrors` (daocloud/aliyun/azk8s)
3. **API Key 安全**: 所有 Key 采用 AES-256-GCM 加密存储，内存中临时解密
4. **TypeScript**: 项目模板含部分 MUI/Emotion 类型警告（约75项），不影响 Vite 构建
