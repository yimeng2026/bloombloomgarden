# GitHub 经验整理 — Railway 部署 + 大模型 API 测试

> 2026-05-30 收集，用于千界花园部署修复和 Provider 测试

---

## 一、Railway Docker 缓存问题（GitHub 经验）

### 问题定位
Railway 的 Docker 构建缓存是**普遍已知问题**。当你推了代码但线上没变化时，通常是缓存没刷新。

### 别人遇到的情况（railway.com/station 官方论坛）
> "I keep getting the same issue — it retrieves a docker file that I have removed. This is a cache issue."  
> — Railway Help Station, 2025-10-15

### 解决方案汇总（GitHub + Stack Overflow + 官方文档）

| 方案 | 操作 | 效果 |
|------|------|------|
| **A. Dashboard 强制重部署** | Railway Dashboard → Service → "Redeploy" 或 "Clear Cache and Deploy" | 最快，立即生效 |
| **B. Dockerfile 加缓存破坏参数** | `ARG CACHE_BUST=$(date +%s)` 放在 `COPY` 之前 | 每次 push 都强制刷新缓存 |
| **C. `--no-cache` 构建** | `docker build --no-cache`（本地可控） | Railway 不支持，需 Dashboard 操作 |
| **D. 改变 COPY 顺序** | 调整 Dockerfile 中 `COPY` 的指令顺序 | 使缓存失效 |

### 推荐方案 A（Dashboard 操作）

创始人你打开：
```
Railway Dashboard → 项目 → bloombloomgarden 服务 → "Redeploy" 或 "Clear Cache and Deploy"
```

点一下，**不用等推代码**，立即强制不用缓存重新构建。这是官方推荐的最快方案。

### 备选方案 B（代码层面强制缓存失效）

在 Dockerfile 中 `COPY` 之前加一行：

```dockerfile
# 强制缓存失效 — 每次 push 都重新构建
ARG CACHE_BUST=1
RUN echo "Cache bust: ${CACHE_BUST}"

COPY frontend/ ./
RUN npm run build
```

每次改 `CACHE_BUST` 的值（如 `CACHE_BUST=2`），就能强制 Railway 重新构建。

### 关键教训（GitHub 项目经验）

1. **Docker 层缓存是按文件 checksum 比较的**。如果 `COPY` 的文件内容变了，但 Railway 缓存判定没变，就跳过这一层。
2. ** Railway 的 "cached" 标记意味着它重用了之前的构建层**。看到日志里 `CACHED` 出现很多次 = 问题所在。
3. **GitHub 多个项目**（intercom/gtm-mirofish-demo, hamzaskewl/slinky, zt6453928/ailat-translation）**都成功部署到 Railway**，共同点是：要么本地构建好 dist 再推，要么在 Dockerfile 中确保 `npm run build` 真正执行（不被缓存跳过）。

---

## 二、Vite + Tailwind CSS 在 Railway 部署的经验

### 2026 年最新方案（Tailwind v4）

GitHub 上的最新项目（如 slinky, ailat-translation, gtm-mirofish-demo）都用的是 **Tailwind CSS v4** 的 Vite 插件方案：

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
})
```

```css
/* index.css */
@import "tailwindcss";
```

**不需要 `postcss.config.js`！** Tailwind v4 直接作为 Vite 插件集成，PostCSS 配置不再需要。

### 但我们项目用的是 Tailwind v3

从 `package.json` 看：`tailwindcss: ^3.4.17`

v3 的正确配置是 PostCSS 方案：

```javascript
// postcss.config.mjs（ESM 格式）
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

注意：v3 在 ESM 项目下必须用 `.mjs` 而不是 `.cjs`（`.cjs` 用 `module.exports` 在 ESM 环境下不兼容）。

### 经验总结

| 版本 | 配置方式 | 文件 | 说明 |
|------|---------|------|------|
| **v4** | Vite 插件 | `vite.config.ts` 加 `tailwindcss()` | 推荐，2026 新项目主流 |
| **v3** | PostCSS | `postcss.config.mjs` 用 `export default` | 当前项目，但需确保格式正确 |

---

## 三、大模型 API 测试资源（GitHub 官方）

### 1. 官方 SDK（推荐）

| 提供商 | GitHub 仓库 | 语言 | 测试方式 |
|--------|------------|------|---------|
| **OpenAI** | `openai/openai-node` / `openai-python` | JS/Python | 需 API Key，有免费额度 |
| **Anthropic** | `anthropics/anthropic-sdk-python` / `anthropic-sdk-typescript` | Python/TS | 需 API Key，有免费额度 |
| **Anthropic Agent** | `anthropics/claude-agent-sdk-typescript` | TS | Claude Code 能力，需 OAuth |
| **Moonshot / Kimi** | `MoonshotAI/kimi-agent-sdk` | Go/Node/Python | 官方 SDK，注册送额度 |
| **Google Gemini** | `google-gemini/generative-ai-js` | JS/Python | 需 API Key |
| **LiteLLM** | `BerriAI/litellm` | Python | 统一代理，100+ 模型，自带测试 |

### 2. 免费测试 Playground

| 资源 | 链接 | 说明 | 免费？ |
|------|------|------|--------|
| **OpenAI Playground** | platform.openai.com/playground | 官方测试 | 有免费额度 |
| **Anthropic Console** | console.anthropic.com | Claude 官方 | 有免费额度 |
| **Moonshot Platform** | platform.moonshot.ai | Kimi API | 注册送额度 |
| **Google AI Studio** | aistudio.google.com | Gemini 官方 | 免费 |
| **Hugging Face** | huggingface.co/docs/api-inference | 开源模型推理 | 免费（限流） |
| **OpenRouter** | openrouter.ai | 多模型路由 | 免费层可用 |
| **Groq** | groq.com | 极速推理 | 免费层 |
| **Ollama** | `ollama/ollama` (GitHub) | 本地运行 | 完全免费 |

### 3. GitHub 上的测试工具/示例

| 仓库 | 说明 |
|------|------|
| `anthropics/claude-cookbook` | 官方 Notebook 教程（RAG、Tool Use、MCP） |
| `anthropics/claude-quickstarts` | 官方 Quickstart 示例 |
| `anthropics/claude-code` | Claude Code CLI，可编程测试 |
| `xiaoju111a/kimi-actions` | Kimi Code Review GitHub Action |
| `jonaspauleta/laravel-ai-moonshot` | Laravel 适配 Kimi，OpenAI 兼容 |

### 4. 千界花园 Provider 测试建议

```bash
# 方案 A：Kimi（OpenAI 兼容，中文，注册送额度）
curl https://api.moonshot.cn/v1/chat/completions \
  -H "Authorization: Bearer $MOONSHOT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"kimi-k2.5","messages":[{"role":"user","content":"Hello"}]}'

# 方案 B：Ollama（本地，零成本）
ollama run llama3.2
ollama run qwen2.5

# 方案 C：LiteLLM（统一代理，测多模型）
pip install litellm
litellm --model gpt-4o
```

### 5. 测试优先级（千界花园）

| 优先级 | Provider | 理由 |
|--------|---------|------|
| 1 | **Ollama** | 本地运行，零成本，无需 Key |
| 2 | **Moonshot/Kimi** | 官方 API，OpenAI 兼容，中文社区 |
| 3 | **OpenRouter** | 多模型统一，免费层可用 |
| 4 | **Groq** | 极速推理，免费层 |
| 5 | **OpenAI** | 基准测试 |
| 6 | **Anthropic** | Claude 基准测试 |

---

## 四、下一步建议

### 立即修复部署
1. 创始人打开 Railway Dashboard → 点 "Redeploy" 或 "Clear Cache and Deploy"
2. 或者我这边改 Dockerfile 加 `ARG CACHE_BUST`，推一个新 commit 强制缓存刷新

### 后续优化
1. 考虑升级到 Tailwind v4 + `@tailwindcss/vite` 插件（移除 postcss 依赖）
2. 本地构建 `dist` 后推送 Railway（避免容器内构建 OOM）

---

> 来源：GitHub 官方仓库、Railway Help Station、Stack Overflow、Tailwind CSS 官方文档
