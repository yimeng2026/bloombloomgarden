# 千界花园 — 快速测试指南

> 客户只需要选择大模型种类，填写API即可使用。本文档指导你如何验证这一点。

## 一、环境准备

### 1.1 安装依赖（首次）

```bash
# Linux/macOS/WSL
./test_all.sh

# Windows PowerShell
.\test_all.bat
```

### 1.2 配置API Key（只需一次）

复制 `.env.example` 为 `.env`，填入你拥有的Key：

```bash
cp .env.example .env
```

编辑 `.env`，至少填 **一个** Provider：

| Provider | 环境变量名 | 获取地址 |
|---|---|---|
| **Kimi Code** | `KIMI_CODE_API_KEY_1` | https://platform.moonshot.cn |
| **OpenAI** | `OPENAI_API_KEY` | https://platform.openai.com |
| **Anthropic** | `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| **DeepSeek** | `DEEPSEEK_API_KEY` | https://platform.deepseek.com |
| **Qwen** | `DASHSCOPE_API_KEY` | https://dashscope.aliyun.com |
| **Gemini** | `GEMINI_API_KEY` | https://aistudio.google.com |
| **GLM** | `GLM_API_KEY` | https://open.bigmodel.cn |
| **OpenRouter** | `OPENROUTER_API_KEY` | https://openrouter.ai |

> 支持 **多Key负载均衡**：Kimi Code 可填 `KIMI_CODE_API_KEY_1` 到 `_5`，系统自动轮询+熔断。

---

## 二、Python测试（推荐首选）

### 2.1 一键测试所有Provider连通性

```bash
python tests/python/test_multi_provider_concurrent.py
```

输出示例：
```
📊 汇总: 3/10 通过 | 失败: 7 | 平均延迟: 892.3ms
🔹 KIMI-CODE (1/1)
   ✅ [KIMI_CODE_API_KEY_1]   342.5ms | HTTP 200 | models: kimi-latest, moonshot-v1-8k
🔹 OPENAI (0/1)
   ❌ [OPENAI_API_KEY]     0.0ms | API Key not configured in environment
```

### 2.2 测试单Provider对话能力

```bash
# 测试Kimi对话
python tests/python/test_multi_provider_concurrent.py --chat kimi-code

# 测试OpenAI对话（需配置OPENAI_API_KEY）
python tests/python/test_multi_provider_concurrent.py --chat openai
```

### 2.3 Kimi集群Failover与负载均衡

```bash
# 全部测试：轮询 + Failover + 压力 + reasoning字段验证
python tests/python/test_failover_loadbalance.py

# 只测轮询
python tests/python/test_failover_loadbalance.py --test roundrobin

# 只测Failover
python tests/python/test_failover_loadbalance.py --test failover

# 压力测试（60秒，10并发）
python tests/python/test_failover_loadbalance.py --test stress --stress-duration 60 --stress-concurrency 10
```

### 2.4 性能基准压测

```bash
# 对Kimi进行30秒5并发压力测试
python tests/python/test_stress_benchmark.py --provider kimi-code --duration 30 --concurrency 5

# 多Provider横向对比（需要各Provider都配置Key）
python tests/python/test_stress_benchmark.py --compare kimi-code openai deepseek
```

### 2.5 旧版Layer1测试（5Key × 5场景）

```bash
python test_kimi_layer1.py
```

---

## 三、JavaScript/Node.js测试

### 3.1 前端API全量测试（需后端运行）

```bash
# 启动后端
cd backend && npm run dev &

# 运行前端API测试
node tests/javascript/frontend_api_test.js
```

测试覆盖16个API端点：
- Health、Providers、APIKeys CRUD、Agents、Dialogs、Workspaces
- KnowledgeBases、Skills、Uploads、Events、Blueprints、Monitor
- KimiCluster、Intents、Ollama、Auth

### 3.2 端到端流程测试

```bash
node tests/javascript/e2e_flow_test.js
```

完整业务流程验证：
1. 系统健康检查
2. 用户登录
3. 获取Provider列表（≥10个）
4. 创建Agent
5. 获取Agent上下文
6. 创建对话并发送消息
7. 创建工作空间
8. 检查审计日志
9. 清理测试数据

---

## 四、前端构建验证

### 4.1 本地构建

```bash
cd frontend
npm install
npm run build
```

### 4.2 TypeScript类型检查

```bash
cd frontend
npx tsc --noEmit
```

### 4.3 Docker构建（无需本地Node环境）

```bash
# 配置国内镜像加速后
docker-compose build
docker-compose up -d
```

---

## 五、Electron桌面端打包

### 5.1 Windows (.exe)

```powershell
# PowerShell (管理员)
npm run install:all
npm run build
npm run dist:win

# 输出: dist/千界花园 Setup 1.0.0.exe
# 双击即可运行，自动启动后端+前端
```

### 5.2 便携版（无需安装）

```powershell
npm run dist:win:portable
# 输出: dist/千界花园 1.0.0.exe (单文件)
```

---

## 六、常见问题排查

### Q: Python测试显示 "API Key not configured"
**A**: 未设置环境变量。三种解决方式：
```bash
# 方式1: 临时export
export KIMI_CODE_API_KEY_1="sk-kimi-..."

# 方式2: 写入.env后source
source .env

# 方式3: 直接修改脚本默认值（不推荐）
```

### Q: JS测试显示 "后端未响应"
**A**: 先启动后端服务：
```bash
cd backend
npm install
npx tsx src/server.ts   # 或 npm run dev
```

### Q: Electron打包报错 "找不到 dist/server.js"
**A**: 需要先编译后端：
```bash
cd backend
npx tsc
```

### Q: Vite build 报错 Permission denied (esbuild)
**A**: 容器安全策略限制，请在**本地Windows/Linux**执行 `npm run build`。

---

## 七、测试覆盖矩阵

| 测试类型 | 脚本 | 语言 | 需后端 | 需外网 | 覆盖Provider |
|---|---|---|---|---|---|
| 多Provider连通性 | `test_multi_provider_concurrent.py` | Python | 否 | 是 | 10个 |
| Failover/负载均衡 | `test_failover_loadbalance.py` | Python | 否 | 是 | Kimi(5Key) |
| 性能基准 | `test_stress_benchmark.py` | Python | 否 | 是 | 6个 |
| Layer1旧版 | `test_kimi_layer1.py` | Python | 否 | 是 | Kimi(5Key) |
| 前端API测试 | `frontend_api_test.js` | Node.js | **是** | 否 | 后端路由 |
| E2E流程测试 | `e2e_flow_test.js` | Node.js | **是** | 否 | 完整链路 |
| 一键全测 | `test_all.sh` / `.bat` | 混合 | 是 | 是 | 全部 |

---

> **核心理念**: 用户只需在Web界面「选择大模型种类 → 粘贴API Key → 点击测试」即可使用全部功能。所有技术复杂度由系统隐藏。
