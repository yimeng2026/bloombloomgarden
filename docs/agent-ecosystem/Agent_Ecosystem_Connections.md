# AI Agent 生态三维坐标系：连接点详细标注
# 3D Agent Ecosystem: Connection Points & Protocols Documentation

> 生成时间：2026-05-25  
> 对应图表：`3D_Agent_Ecosystem_Coordinate_System.png`

---

## 一、坐标系定义

| 轴 | 定义 | 数量 | 颜色标识 |
|---|------|------|---------|
| **X轴** | 前端平台 (Frontend / UI Layer) | 15款 | 🔴 红色 |
| **Y轴** | 后端/扩展平台 (Backend / Inference Layer) | 15款 | 🔵 蓝色 |
| **Z轴** | 子工具/CLI Agent (Agent Tools Layer) | 20款 | 🟢 绿色 |

---

## 二、二维连接点（XY平面：前端 ↔ 后端）

### 2.1 连接方向与协议

| 前端平台 | 后端平台 | 连接方向 | 协议 | 认证方式 | 备注 |
|---------|---------|---------|------|---------|------|
| **AION UI** | Ollama | 前端 → 后端 | HTTP REST (OpenAI兼容) | 无认证/Token | 原生支持，端口11434 |
| **AION UI** | LM Studio Server | 前端 → 后端 | HTTP REST (OpenAI兼容) | API Key | 本地服务器模式 |
| **AION UI** | LocalAI | 前端 → 后端 | HTTP REST + gRPC | API Key | 通用API适配层 |
| **AION UI** | OpenRouter | 前端 → 后端 | HTTP REST | Bearer Token | 云端+本地混合路由 |
| **Open WebUI** | Ollama | 前端 → 后端 | HTTP REST + WebSocket | 无认证 | 浏览器版ChatGPT体验 |
| **Open WebUI** | LM Studio | 前端 → 后端 | HTTP REST | API Key | 支持模型热切换 |
| **Open WebUI** | OpenRouter | 前端 → 后端 | HTTP REST | Bearer Token | 多模型聚合访问 |
| **Jan AI** | Ollama | 前端 → 后端 | HTTP REST | 无认证 | 跨平台桌面客户端 |
| **Jan AI** | LM Studio | 前端 → 后端 | HTTP REST | API Key | 内置模型市场 |
| **Jan AI** | Jan Backend | 前端 ↔ 后端 | 内部 IPC + HTTP | 本地认证 | 自研后端原生耦合 |
| **LibreChat** | Ollama | 前端 → 后端 | HTTP REST (OpenAI兼容) | 无认证 | 统一对话界面 |
| **LibreChat** | OpenRouter | 前端 → 后端 | HTTP REST | Bearer Token | 支持200+模型 |
| **AnythingLLM** | Ollama | 前端 → 后端 | HTTP REST | 无认证 | 企业RAG知识库 |
| **AnythingLLM** | LM Studio | 前端 → 后端 | HTTP REST | API Key | 多用户文档处理 |
| **AnythingLLM** | LocalAI | 前端 → 后端 | HTTP REST | API Key | 私有化部署首选 |
| **LobeChat** | Ollama | 前端 → 后端 | HTTP REST | 无认证 | 现代化UI，插件市场 |
| **LobeChat** | OpenRouter | 前端 → 后端 | HTTP REST | Bearer Token | 多模型切换 |
| **Chatbox** | Ollama | 前端 → 后端 | HTTP REST | 无认证 | 轻量跨平台客户端 |
| **Chatbox** | OpenRouter | 前端 → 后端 | HTTP REST | Bearer Token | 云端模型访问 |
| **Cherry Studio** | Ollama | 前端 → 后端 | HTTP REST | 无认证 | 国产开源，知识库 |
| **Cherry Studio** | LM Studio | 前端 → 后端 | HTTP REST | API Key | 本地模型管理 |
| **LM Studio** | LM Studio Server | 前端 ↔ 后端 | 内部 HTTP | 本地认证 | GUI与Server一体化 |
| **GPT4All** | GPT4All Backend | 前端 ↔ 后端 | 内部协议 | 本地认证 | 隐私优先桌面 |
| **Dify** | Ollama | 前端 → 后端 | HTTP REST | 无认证 | LLMOps工作流编排 |
| **Dify** | vLLM | 前端 → 后端 | HTTP REST (OpenAI兼容) | API Key | 高性能推理 |
| **Dify** | LocalAI | 前端 → 后端 | HTTP REST | API Key | 通用模型适配 |
| **Flowise** | Ollama | 前端 → 后端 | HTTP REST | 无认证 | 低代码拖拽构建 |
| **Flowise** | LocalAI | 前端 → 后端 | HTTP REST | API Key | LangChain节点可视化 |
| **n8n** | Ollama | 前端 → 后端 | HTTP REST + WebSocket | 无认证 | 工作流自动化触发 |
| **n8n** | LocalAI | 前端 → 后端 | HTTP REST | API Key | AI节点集成 |
| **LangGraph Studio** | Ollama | 前端 → 后端 | HTTP REST | 无认证 | 图结构Agent编排 |
| **LangGraph Studio** | vLLM | 前端 → 后端 | HTTP REST | API Key | 状态持久化调试 |
| **Oobabooga WebUI** | Ollama | 前端 → 后端 | HTTP REST | 无认证 | 高级参数调节 |
| **Oobabooga WebUI** | Text-gen-webui | 前端 ↔ 后端 | 内部 HTTP | 本地认证 | 自研后端原生耦合 |

### 2.2 通用协议说明

| 协议 | 适用场景 | 传输层 | 特点 |
|------|---------|--------|------|
| **HTTP REST (OpenAI兼容)** | 绝大多数前端 ↔ Ollama/LocalAI/vLLM | TCP/HTTP | 事实标准，/v1/chat/completions端点 |
| **WebSocket** | 流式对话、实时推送 | TCP/WS | 低延迟，Server-Sent Events替代方案 |
| **gRPC** | LocalAI内部、高性能场景 | HTTP/2 | 二进制传输，低延迟 |
| **内部 IPC** | Jan/LM Studio/GPT4All一体化 | 本地管道 | 零网络开销，极致性能 |
| **SSE (Server-Sent Events)** | 流式Token返回 | HTTP | 单向流，OpenAI标准 |

---

## 三、二维连接点（XZ平面：前端 ↔ 子工具）

### 3.1 连接方向与协议

| 前端平台 | 子工具 | 连接方向 | 协议 | 调用方式 | 备注 |
|---------|--------|---------|------|---------|------|
| **AION UI** | OpenClaw | 前端 ↔ 子工具 | ACP (Agent Communication Protocol) | stdio + Socket | 原生集成，多Agent协调 |
| **AION UI** | Hermes Agent | 前端 ↔ 子工具 | ACP + OGP联邦协议 | stdio + Socket | 自愈型工作流 |
| **AION UI** | Claude Code | 前端 → 子工具 | ACP + stdio桥接 | CLI Wrapper | 一键启动 `ollama launch claude` |
| **AION UI** | Codex CLI | 前端 → 子工具 | ACP + stdio桥接 | CLI Wrapper | OpenAI代码生成 |
| **AION UI** | Goose | 前端 ↔ 子工具 | MCP (Model Context Protocol) | stdio + SSE | Block出品，Rust编写 |
| **AION UI** | Aider | 前端 ↔ 子工具 | MCP + stdio | CLI Wrapper | 终端结对编程 |
| **AION UI** | Cline | 前端 → 子工具 | VS Code Extension API + MCP | LSP-like | VS Code插件代理 |
| **AION UI** | Roo Code | 前端 → 子工具 | VS Code Extension API + MCP | LSP-like | Cline分支 |
| **AION UI** | Continue.dev | 前端 → 子工具 | VS Code Extension API + MCP | LSP-like | 多IDE支持 |
| **AION UI** | Kimi CLI | 前端 → 子工具 | ACP + stdio桥接 | CLI Wrapper | 月之暗面出品 |
| **AION UI** | Qwen Code | 前端 → 子工具 | ACP + stdio桥接 | CLI Wrapper | 阿里出品 |
| **AION UI** | Mistral Vibe | 前端 → 子工具 | ACP + stdio桥接 | CLI Wrapper | Mistral出品 |
| **AION UI** | Augment Code | 前端 → 子工具 | ACP + stdio桥接 | CLI Wrapper | 代码增强 |
| **AION UI** | Droid | 前端 → 子工具 | ACP + stdio桥接 | CLI Wrapper | 自动化Agent |
| **AION UI** | Pi | 前端 → 子工具 | ACP + stdio桥接 | CLI Wrapper | 轻量助手 |
| **AION UI** | Pool | 前端 → 子工具 | ACP + stdio桥接 | CLI Wrapper | 协作Agent |
| **LibreChat** | Claude Code | 前端 → 子工具 | MCP (间接) | 插件系统 | 通过MCP插件桥接 |
| **LibreChat** | Aider | 前端 → 子工具 | MCP (间接) | 插件系统 | 终端命令调用 |
| **Dify** | OpenClaw | 前端 → 子工具 | HTTP API + Plugin | 自定义节点 | Dify插件市场 |
| **Dify** | Hermes Agent | 前端 → 子工具 | HTTP API + Plugin | 自定义节点 | 工作流节点集成 |
| **n8n** | Goose | 前端 → 子工具 | HTTP Request + CLI | n8n AI Node | 工作流触发CLI |
| **n8n** | Aider | 前端 → 子工具 | HTTP Request + CLI | n8n AI Node | 代码自动化节点 |
| **n8n** | Cline | 前端 → 子工具 | HTTP Request + CLI | n8n AI Node | IDE自动化 |
| **n8n** | Continue.dev | 前端 → 子工具 | HTTP Request + CLI | n8n AI Node | 开发工作流 |
| **LangGraph Studio** | Cline | 前端 → 子工具 | LangGraph Checkpoint + MCP | 图节点调用 | 编码Agent节点 |
| **LangGraph Studio** | Roo Code | 前端 → 子工具 | LangGraph Checkpoint + MCP | 图节点调用 | 多Agent编码 |

### 3.2 子工具调用协议说明

| 协议 | 定义 | 传输层 | 特点 |
|------|------|--------|------|
| **ACP (Agent Communication Protocol)** | AION UI原生多Agent协调协议 | stdio / Unix Socket / TCP | 支持联邦通信，跨框架Agent协作 |
| **MCP (Model Context Protocol)** | Anthropic主导的标准化工具协议 | stdio / SSE / HTTP | 2024年11月发布，事实标准 |
| **OGP (Open Governance Protocol)** | Hermes Agent联邦协议 | HTTP / gRPC | 跨框架Agent发现与调用 |
| **stdio桥接** | 前端通过子进程调用CLI | 标准输入输出 | 简单可靠，适合CLI工具 |
| **VS Code Extension API** | IDE内部通信 | 内部IPC | 仅限VS Code生态 |
| **LSP-like** | 语言服务器协议变种 | stdio / Socket | 代码工具专用 |
| **HTTP API** | RESTful调用 | TCP/HTTP | 服务化Agent调用 |

---

## 四、二维连接点（YZ平面：后端 ↔ 子工具）

### 4.1 连接方向与协议

| 后端平台 | 子工具 | 连接方向 | 协议 | 模型供给方式 | 备注 |
|---------|--------|---------|------|-------------|------|
| **Ollama** | OpenClaw | 后端 → 子工具 | HTTP REST (OpenAI兼容) | 本地模型拉取 | 原生支持，模型库100+ |
| **Ollama** | Hermes Agent | 后端 → 子工具 | HTTP REST + OGP | 本地模型拉取 | 联邦协议通信 |
| **Ollama** | Aider | 后端 → 子工具 | HTTP REST (OpenAI兼容) | 环境变量配置 | 支持多模型切换 |
| **Ollama** | Cline | 后端 → 子工具 | HTTP REST (OpenAI兼容) | settings.json配置 | VS Code插件配置 |
| **Ollama** | Roo Code | 后端 → 子工具 | HTTP REST (OpenAI兼容) | settings.json配置 | Cline兼容配置 |
| **Ollama** | Continue.dev | 后端 → 子工具 | HTTP REST (OpenAI兼容) | config.json配置 | 多IDE统一配置 |
| **Ollama** | Devika | 后端 → 子工具 | HTTP REST (OpenAI兼容) | 环境变量配置 | 软件工程Agent |
| **Ollama** | Crush | 后端 → 子工具 | HTTP REST (OpenAI兼容) | 环境变量配置 | 终端编码Agent |
| **LM Studio Server** | Claude Code | 后端 → 子工具 | HTTP REST (OpenAI兼容) | 全局配置 | 通用API支持所有CLI |
| **LM Studio Server** | Codex CLI | 后端 → 子工具 | HTTP REST (OpenAI兼容) | 全局配置 | 本地运行Codex类模型 |
| **LM Studio Server** | Aider | 后端 → 子工具 | HTTP REST (OpenAI兼容) | 全局配置 | 本地结对编程 |
| **LM Studio Server** | Cline | 后端 → 子工具 | HTTP REST (OpenAI兼容) | 全局配置 | VS Code本地推理 |
| **LM Studio Server** | Roo Code | 后端 → 子工具 | HTTP REST (OpenAI兼容) | 全局配置 | 本地Agent编码 |
| **LM Studio Server** | Continue.dev | 后端 → 子工具 | HTTP REST (OpenAI兼容) | 全局配置 | 本地多IDE支持 |
| **LM Studio Server** | GitHub Copilot CLI | 后端 → 子工具 | HTTP REST (OpenAI兼容) | 全局配置 | 本地Copilot替代 |
| **vLLM** | Claude Code | 后端 → 子工具 | HTTP REST (OpenAI兼容) | API端点配置 | 高性能本地推理 |
| **vLLM** | Aider | 后端 → 子工具 | HTTP REST (OpenAI兼容) | API端点配置 | 批量代码生成 |
| **vLLM** | Cline | 后端 → 子工具 | HTTP REST (OpenAI兼容) | API端点配置 | 高并发编码 |
| **vLLM** | Roo Code | 后端 → 子工具 | HTTP REST (OpenAI兼容) | API端点配置 | 多Agent并行 |
| **vLLM** | Continue.dev | 后端 → 子工具 | HTTP REST (OpenAI兼容) | API端点配置 | 团队开发 |
| **LocalAI** | OpenClaw | 后端 → 子工具 | HTTP REST + gRPC | 通用端点 | 通用模型适配层 |
| **LocalAI** | Hermes Agent | 后端 → 子工具 | HTTP REST + OGP | 通用端点 | 联邦通信支持 |
| **LocalAI** | Aider | 后端 → 子工具 | HTTP REST (OpenAI兼容) | 通用端点 | 本地开发环境 |
| **LocalAI** | Cline | 后端 → 子工具 | HTTP REST (OpenAI兼容) | 通用端点 | 本地IDE集成 |
| **LocalAI** | Roo Code | 后端 → 子工具 | HTTP REST (OpenAI兼容) | 通用端点 | 本地Agent开发 |
| **OpenRouter** | Claude Code | 后端 → 子工具 | HTTP REST | Bearer Token | 云端Claude访问 |
| **OpenRouter** | Codex CLI | 后端 → 子工具 | HTTP REST | Bearer Token | 云端Codex访问 |
| **OpenRouter** | Goose | 后端 → 子工具 | HTTP REST | Bearer Token | 云端模型+本地工具 |
| **OpenRouter** | Aider | 后端 → 子工具 | HTTP REST | Bearer Token | 云端结对编程 |
| **OpenRouter** | Cursor Agent | 后端 → 子工具 | HTTP REST | Bearer Token | 云端Cursor模型 |
| **OpenRouter** | Kimi CLI | 后端 → 子工具 | HTTP REST | Bearer Token | 云端Kimi访问 |
| **OpenRouter** | Qwen Code | 后端 → 子工具 | HTTP REST | Bearer Token | 云端Qwen访问 |

---

## 五、三维连接点（XYZ空间：完整工作流链路）

### 5.1 代表性完整链路

| 链路ID | 前端 | 后端 | 子工具 | 场景描述 | 协议栈 |
|--------|------|------|--------|---------|--------|
| **XYZ-01** | AION UI | Ollama | OpenClaw | 本地多Agent消息自动化 | ACP → HTTP REST → OGP |
| **XYZ-02** | AION UI | Ollama | Hermes Agent | 本地自愈型工作流 | ACP → HTTP REST → OGP |
| **XYZ-03** | AION UI | LM Studio | Claude Code | 本地最强推理编程 | ACP → HTTP REST → stdio |
| **XYZ-04** | AION UI | OpenRouter | Cursor Agent | 云端Cursor本地前端 | ACP → HTTP REST → stdio |
| **XYZ-05** | Open WebUI | Ollama | Aider | 浏览器管理本地编程 | HTTP REST → HTTP REST → stdio |
| **XYZ-06** | Jan AI | Jan Backend | Continue.dev | 一体化桌面开发 | IPC → HTTP REST → LSP |
| **XYZ-07** | LibreChat | OpenRouter | Claude Code | 统一对话云端编程 | HTTP REST → HTTP REST → stdio |
| **XYZ-08** | AnythingLLM | Ollama | OpenClaw | 企业知识库+消息自动化 | HTTP REST → HTTP REST → OGP |
| **XYZ-09** | Dify | Ollama | Hermes Agent | LLMOps编排本地Agent | HTTP REST → HTTP REST → OGP |
| **XYZ-10** | Dify | vLLM | Devika | 高性能软件工程Agent | HTTP REST → HTTP REST → stdio |
| **XYZ-11** | Flowise | Ollama | Hermes Agent | 低代码Agent工作流 | HTTP REST → HTTP REST → OGP |
| **XYZ-12** | n8n | LocalAI | Goose | 自动化工作流+本地推理 | HTTP REST → HTTP REST → MCP |
| **XYZ-13** | LangGraph Studio | vLLM | Cline | 图结构编码Agent | HTTP REST → HTTP REST → MCP |
| **XYZ-14** | Cherry Studio | LM Studio | Qwen Code | 国产模型本地编程 | HTTP REST → HTTP REST → stdio |
| **XYZ-15** | LobeChat | Ollama | Kimi CLI | 多模型本地消息处理 | HTTP REST → HTTP REST → stdio |
| **XYZ-16** | Oobabooga | Text-gen-webui | Codex CLI | 高级参数本地代码 | HTTP REST → Internal → stdio |

---

## 六、外部集成矩阵（通信频道与开发平台）

### 6.1 前端平台 × 外部集成

| 前端平台 | GitHub | GitLab | 微信 | 钉钉 | 飞书 | Slack | Discord | Telegram | 邮件 | 浏览器 |
|---------|--------|--------|------|------|------|-------|---------|----------|------|--------|
| **AION UI** | ✅ Webhook | ✅ API | ❌ | ❌ | ❌ | ✅ RTM | ✅ Bot | ✅ Bot | ❌ | ✅ 内置 |
| **Open WebUI** | ✅ OAuth | ✅ OAuth | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 必需 |
| **Jan AI** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ 桌面 |
| **LibreChat** | ✅ Plugin | ✅ Plugin | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ SMTP | ✅ 内置 |
| **AnythingLLM** | ✅ 嵌入 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ 桌面 |
| **Dify** | ✅ API | ✅ API | ✅ Webhook | ✅ Webhook | ✅ Webhook | ✅ API | ❌ | ❌ | ✅ SMTP | ✅ 嵌入 |
| **n8n** | ✅ Node | ✅ Node | ✅ Node | ✅ Node | ✅ Node | ✅ Node | ✅ Node | ✅ Node | ✅ Node | ✅ Trigger |
| **Flowise** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 嵌入 |
| **LobeChat** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 内置 |
| **LangGraph Studio** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 内置 |

### 6.2 子工具 × 外部集成

| 子工具 | GitHub | GitLab | 微信 | 钉钉 | 飞书 | Slack | Discord | 浏览器 | 文件系统 |
|--------|--------|--------|------|------|------|-------|---------|--------|---------|
| **OpenClaw** | ✅ API | ✅ API | ✅ Bot | ✅ Bot | ✅ Bot | ✅ RTM | ✅ Gateway | ✅ Puppeteer | ✅ 本地 |
| **Hermes Agent** | ✅ CLI | ✅ CLI | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Playwright | ✅ 本地 |
| **Claude Code** | ✅ 原生 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 项目目录 |
| **Codex CLI** | ✅ 原生 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 项目目录 |
| **Goose** | ✅ MCP | ✅ MCP | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ MCP | ✅ 本地+远程 |
| **Aider** | ✅ 原生 | ✅ 原生 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Git仓库 |
| **Cline** | ✅ VS Code | ✅ VS Code | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 内置 | ✅ 工作区 |
| **Roo Code** | ✅ VS Code | ✅ VS Code | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 内置 | ✅ 工作区 |
| **Continue.dev** | ✅ 多IDE | ✅ 多IDE | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 内置 | ✅ 工作区 |
| **Devika** | ✅ API | ✅ API | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Playwright | ✅ 项目目录 |
| **Crush** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 本地 |
| **Cursor Agent** | ✅ 原生 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 项目目录 |
| **Kimi CLI** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 本地 |
| **Qwen Code** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 本地 |

---

## 七、技能库与插件库完整清单

### 7.1 前端平台技能库

| 前端平台 | 技能库/插件库名称 | 数量 | 类型 | 代表性技能 |
|---------|-----------------|------|------|-----------|
| **AION UI** | ACP Skill Market | 50+ | Agent技能 | WhatsApp消息、Slack通知、文件整理、代码审查 |
| **AION UI** | Built-in Tools | 20+ | 内置工具 | 浏览器控制、终端执行、文件读写 |
| **Open WebUI** | WebUI Tools | 30+ | MCP插件 | 网页搜索、文档解析、图像生成 |
| **Open WebUI** | Functions | 100+ | 社区函数 | RAG检索、数据库查询、API调用 |
| **Jan AI** | Jan Plugins | 15+ | 桌面插件 | 模型转换、量化、语音输入 |
| **LibreChat** | LibreChat Plugins | 40+ | 对话插件 | 代码解释器、多模态、文件处理 |
| **AnythingLLM** | AnythingLLM Agents | 10+ | RAG Agent | 文档问答、网页抓取、数据提取 |
| **Dify** | Dify Tools | 60+ | 工作流节点 | HTTP请求、数据库、缓存、消息队列 |
| **Dify** | Dify Models | 100+ | 模型供应商 | OpenAI、Anthropic、本地模型、云端模型 |
| **Flowise** | LangChain Integrations | 200+ | 集成节点 | 向量存储、文档加载器、聊天模型 |
| **n8n** | n8n Nodes | 400+ | 工作流节点 | CRM、邮件、数据库、AI、社交媒体 |
| **n8n** | n8n AI Nodes | 20+ | AI专用 | LLM、向量存储、文档加载器、嵌入 |
| **LangGraph Studio** | LangGraph Checkpoints | 内置 | 状态管理 | 时间旅行、状态回滚、人机回环 |
| **LobeChat** | Lobe Plugins | 50+ | 聊天插件 | 搜索引擎、图像识别、语音合成 |
| **Cherry Studio** | Cherry Plugins | 20+ | 国产插件 | 百度翻译、搜狗搜索、微信推送 |

### 7.2 子工具技能库

| 子工具 | 技能库名称 | 数量 | 类型 | 代表性技能/插件 |
|--------|-----------|------|------|----------------|
| **OpenClaw** | Claw Skills | 50+ | 消息平台 | WhatsApp Bot、Slack RTM、Telegram Bot、Discord Gateway |
| **OpenClaw** | System Skills | 20+ | 系统操作 | 文件管理、进程控制、定时任务、邮件发送 |
| **Hermes Agent** | Hermes Toolkit | 30+ | 通用工具 | 网页浏览、API调用、数据库查询、文件解析 |
| **Hermes Agent** | Self-Healing | 内置 | 自愈机制 | 错误重试、替代方案、日志分析、状态恢复 |
| **Claude Code** | Claude Tools | 10+ | 编程工具 | 文件读写、终端执行、代码搜索、项目扫描 |
| **Codex CLI** | OpenAI Tools | 5+ | 代码工具 | 代码生成、重构、解释、测试生成 |
| **Goose** | Goose Toolkit | 25+ | MCP工具 | 文件系统、浏览器、数据库、API客户端 |
| **Goose** | MCP Extensions | 100+ | 社区扩展 | 任何MCP兼容工具 |
| **Aider** | Aider Commands | 15+ | Git工具 | 提交、分支、差异、历史、 blame |
| **Aider** | Editor Integrations | 5+ | 编辑器 | Vim、Emacs、VS Code、Sublime |
| **Cline** | Cline Tools | 20+ | VS Code工具 | 文件编辑、终端、浏览器、MCP |
| **Roo Code** | Roo Tools | 25+ | VS Code工具 | 文件编辑、终端、浏览器、MCP、自定义模式 |
| **Continue.dev** | Continue Tools | 30+ | 多IDE工具 | 代码补全、聊天、重构、文档、MCP |
| **Devika** | Devika Skills | 15+ | 软件工程 | 需求分析、架构设计、代码生成、测试、部署 |
| **Crush** | Crush Plugins | 10+ | 终端工具 | 文件操作、Git、Docker、Kubernetes |
| **Cursor Agent** | Cursor Tools | 20+ | IDE工具 | 代码生成、重构、解释、终端、Composer |
| **GitHub Copilot CLI** | Copilot Skills | 5+ | GitHub工具 | 代码解释、测试生成、Commit消息、PR描述 |
| **Continue.dev** | Continue Hub | 50+ | 社区配置 | 预设提示词、模型配置、RAG设置 |

---

## 八、协议总览表

| 协议名称 | 全称 | 主导方 | 层级 | 适用连接 | 状态 |
|---------|------|--------|------|---------|------|
| **ACP** | Agent Communication Protocol | AION UI | 应用层 | 前端 ↔ 子工具 | 活跃 |
| **MCP** | Model Context Protocol | Anthropic | 应用层 | 前端 ↔ 子工具 / 子工具 ↔ 外部 | 事实标准 |
| **OGP** | Open Governance Protocol | Hermes | 应用层 | 子工具 ↔ 子工具 | 活跃 |
| **OpenAI API** | OpenAI REST API | OpenAI | 应用层 | 前端 ↔ 后端 / 后端 ↔ 子工具 | 事实标准 |
| **HTTP REST** | Representational State Transfer | W3C | 传输层 | 通用 | 成熟 |
| **WebSocket** | WebSocket Protocol | IETF | 传输层 | 流式通信 | 成熟 |
| **SSE** | Server-Sent Events | W3C | 传输层 | 单向流 | 成熟 |
| **gRPC** | Google RPC | Google | 传输层 | 高性能内部通信 | 成熟 |
| **stdio** | Standard I/O | POSIX | 系统层 | CLI工具调用 | 成熟 |
| **LSP** | Language Server Protocol | Microsoft | 应用层 | IDE ↔ 代码工具 | 成熟 |
| **IPC** | Inter-Process Communication | OS | 系统层 | 一体化应用内部 | 成熟 |

---

*文档版本：v1.0 | 生成时间：2026-05-25 14:16*
