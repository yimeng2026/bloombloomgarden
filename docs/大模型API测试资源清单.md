# GitHub 大模型 API 测试资源清单

> 2026-05-30 收集，用于千界花园测试 Provider 集成

---

## 一、官方 SDK（可直接测试）

| 提供商 | 仓库 | 语言 | 说明 | API Key 要求 |
|--------|------|------|------|-------------|
| **OpenAI** | `openai/openai-node` / `openai-python` | JS/TS/Python | 官方 SDK，兼容所有 OpenAI 兼容端点 | 需要 API Key |
| **Anthropic Claude** | `anthropics/anthropic-sdk-python` / `anthropic-sdk-typescript` | Python/TS | 官方 SDK，Messages API + Tool Use | 需要 API Key |
| **Anthropic Agent SDK** | `anthropics/claude-agent-sdk-typescript` / `claude-agent-sdk-python` | TS/Python | 官方 Agent SDK，Claude Code 能力 | 需要 OAuth/Claude Max |
| **Moonshot / Kimi** | `MoonshotAI/kimi-agent-sdk` | Go/Node/Python | **官方 SDK**，支持 Kimi CLI Agent | 需要 API Key |
| **Google Gemini** | `google-gemini/generative-ai-js` / `google-generativeai-python` | JS/Python | 官方 SDK | 需要 API Key |
| **LiteLLM** | `BerriAI/litellm` | Python | 统一代理层，100+ 模型统一接口 | 不需要（自带测试 key）|

---

## 二、免费测试/Playground 资源

| 资源 | 链接 | 说明 | 是否免费 |
|------|------|------|---------|
| **OpenAI Playground** | https://platform.openai.com/playground | 官方 Playground，可测试所有模型 | 需 API Key（有免费额度） |
| **Anthropic Console** | https://console.anthropic.com | Claude 官方控制台 | 需 API Key（有免费额度） |
| **Moonshot Platform** | https://platform.moonshot.ai | Kimi API 控制台 | 注册送免费额度 |
| **Google AI Studio** | https://aistudio.google.com | Gemini 官方测试 | 免费 |
| **Hugging Face Inference API** | https://huggingface.co/docs/api-inference | 免费推理 API（限流） | 免费（需 token） |
| **OpenRouter** | https://openrouter.ai | 多模型统一路由，免费层可用 | 免费层可用 |
| **Groq** | https://groq.com | 极速推理，免费层可用 | 免费层 |
| **Ollama** | `ollama/ollama` (GitHub) | 本地运行大模型，零 API Key | 完全免费 |

---

## 三、GitHub 上的测试工具/示例

| 仓库 | 语言 | 说明 |
|------|------|------|
| `anthropics/claude-code` | TS/JS | Claude Code CLI，可编程测试 |
| `anthropics/claude-quickstarts` | 多语言 | 官方 Quickstart 示例 |
| `anthropics/claude-cookbook` | Python/TS | 官方 Notebook 教程（RAG、Tool Use、MCP） |
| `rescrv/claudius` | Rust | Anthropic API 测试框架，含 prompt 测试 |
| `d33disc/claude-sdk` | Python | 非官方 Python SDK，Docker 部署 |
| `tghamm/Anthropic.SDK` | C# | .NET SDK，含测试示例 |
| `aitrailblazer/anthropic-claude-golang-sdk` | Go | Go SDK，含 example.go |
| `tthew/anthropic-swift-sdk` | Swift | iOS/macOS SDK |
| `claude-php/Claude-PHP-SDK` | PHP | PHP SDK，含教程 |
| `xiaoju111a/kimi-actions` | TS/JS | Kimi Code Review GitHub Action |
| `jonaspauleta/laravel-ai-moonshot` | PHP | Laravel 适配 Kimi，OpenAI 兼容 |
| `wopr-network/wopr-plugin-provider-kimi` | TS | WOPR 插件，Kimi Provider |

---

## 四、测试方案建议

### 方案 A：OpenAI 兼容端点（最简）
```bash
# 测试 Kimi（OpenAI 兼容）
curl https://api.moonshot.cn/v1/chat/completions \
  -H "Authorization: Bearer $MOONSHOT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"kimi-k2.5","messages":[{"role":"user","content":"Hello"}]}'
```

### 方案 B：LiteLLM 统一代理（测试多模型）
```bash
pip install litellm
litellm --model gpt-4o  # 或 moonshot/kimi-k2.5
# 自动路由到对应 API，统一接口
```

### 方案 C：Ollama 本地测试（零成本）
```bash
# 本地运行，无需 API Key
ollama run llama3.2
ollama run qwen2.5
```

---

## 五、千界花园 Provider 集成测试建议

| 优先级 | Provider | 测试方式 | 说明 |
|--------|---------|---------|------|
| 1 | **Ollama** | 本地运行 | 零成本，无需 Key，可测所有本地模型 |
| 2 | **Moonshot/Kimi** | 注册送额度 | 官方 API，OpenAI 兼容，中文社区 |
| 3 | **OpenRouter** | 免费层 | 多模型统一路由，可测 Claude/GPT/Gemini |
| 4 | **Groq** | 免费层 | 极速推理，可测 Llama3/Gemma |
| 5 | **Hugging Face** | 免费（限流） | 开源模型推理 |
| 6 | **OpenAI** | 需付费 Key | 基准测试 |
| 7 | **Anthropic** | 需付费 Key | Claude 基准测试 |

---

> **下一步**：需要我为千界花园写一份 Provider 测试脚本（统一调用接口）吗？
