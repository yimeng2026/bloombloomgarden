# LLMClient 迁移指南

> 将现有 Provider 调用迁移到统一 LLMClient

## 当前代码（DialogService_3DACP.ts）

```typescript
const res = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'User-Agent': 'KimiCLI/0.77',
  },
  body: JSON.stringify({
    model: 'kimi-for-coding',
    messages: ctx,
    stream: false,
    temperature: 0.7,
    max_tokens: 4096,
  }),
  signal: AbortSignal.timeout(120000),
});
```

## 迁移后代码

```typescript
import LLMClient from './services/LLMClient';

const client = new LLMClient();

const res = await client.chat({
  provider: 'kimi-code',
  messages: ctx,
  taskType: 'normal',
  temperature: 0.7,
});

// res.content 已包含合并后的 reasoning_content + content
return { agentId, message: res.content, context: ctx };
```

## 流式迁移

```typescript
// 当前
const reader = res.body.getReader();
// ... 手动解析 SSE ...

// 迁移后
for await (const { chunk, reasoning, isLast } of client.chatStream({
  provider: 'kimi-code',
  messages: ctx,
  taskType: 'code',
})) {
  if (chunk) onChunk({ streamId: `dialog-${agentId}`, chunk: { text: chunk } });
}
```

## 多 Provider 切换

```typescript
// 同一接口，切换 provider 即可
const providers = ['kimi-code', 'deepseek', 'openai'];

for (const provider of providers) {
  try {
    const res = await client.chat({ provider, messages, taskType: 'code' });
    return res;
  } catch (e) {
    if (e.message.includes('Circuit breaker OPEN')) continue;
    throw e;
  }
}
```

## 环境变量配置

```bash
# .env
KIMICODE_API_KEY=xxx
OPENAI_API_KEY=xxx
ANTHROPIC_API_KEY=xxx
DEEPSEEK_API_KEY=xxx
MOONSHOT_API_KEY=xxx
GEMINI_API_KEY=xxx
GLM_API_KEY=xxx
OPENROUTER_API_KEY=xxx
QWEN_API_KEY=xxx
```

## 注意事项

1. **Token 预算**：`taskType` 决定 `max_tokens`，无需手动设置
2. **Timeout**：`taskType` 决定 timeout，无需手动设置
3. **Reasoning 合并**：Kimi Code / DeepSeek / Moonshot / Qwen 的 `reasoning_content` 会自动合并到 `content`
4. **熔断器**：连续 5 次失败后熔断 30 秒，自动恢复
5. **流式中断**：流式输出中途超时，保留已收到部分，不重试
