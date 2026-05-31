/* ── LLM API Client — OpenAI-Compatible Direct Client ──
 * 前端直连 LLM Provider（OpenRouter / OpenAI / Kimi / Claude 等）
 * 支持 SSE 流式输出 + 非流式请求
 * 配置存储在 localStorage，用户首次使用时需配置
 */

export interface LLMConfig {
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  maxTokens?: number
  topP?: number
  provider?: 'openrouter' | 'openai' | 'kimi' | 'anthropic' | 'custom'
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMRequest {
  messages: LLMMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  stream?: boolean
}

export interface LLMChunk {
  content: string
  done: boolean
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model?: string
}

/* ── 默认配置 ── */
const DEFAULT_CONFIG: LLMConfig = {
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: '',
  model: 'moonshotai/kimi-k2-0712',
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  provider: 'openrouter',
}

const STORAGE_KEY = 'sylva_llm_config'

/* ── 配置读写 ── */
export function loadLLMConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_CONFIG, ...parsed }
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_CONFIG }
}

export function saveLLMConfig(config: Partial<LLMConfig>) {
  const current = loadLLMConfig()
  const merged = { ...current, ...config }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  return merged
}

export function clearLLMConfig() {
  localStorage.removeItem(STORAGE_KEY)
}

export function hasLLMConfig(): boolean {
  const cfg = loadLLMConfig()
  return !!(cfg.apiKey && cfg.apiKey.trim().length > 0)
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '***'
  return key.slice(0, 6) + '...' + key.slice(-4)
}

/* ── 预设 Provider 配置 ── */
export const PRESET_PROVIDERS: { label: string; value: LLMConfig['provider']; baseUrl: string; models: string[] }[] = [
  {
    label: 'OpenRouter',
    value: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      'moonshotai/kimi-k2-0712',
      'openai/gpt-4o',
      'anthropic/claude-3.5-sonnet',
      'deepseek/deepseek-chat',
      'openai/gpt-3.5-turbo',
      'meta-llama/llama-3.3-70b-instruct',
    ],
  },
  {
    label: 'OpenAI',
    value: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  },
  {
    label: 'Kimi (Moonshot)',
    value: 'kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['kimi-k2-0712', 'kimi-latest', 'moonshot-v1-8k', 'moonshot-v1-128k'],
  },
  {
    label: 'Anthropic (Claude)',
    value: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  },
  {
    label: '自定义',
    value: 'custom',
    baseUrl: '',
    models: [],
  },
]

/* ── 核心请求函数 ── */
export async function* streamLLM(
  req: LLMRequest,
  config?: Partial<LLMConfig>
): AsyncGenerator<LLMChunk, void, unknown> {
  const cfg = { ...loadLLMConfig(), ...config }
  if (!cfg.apiKey) throw new Error('LLM API Key 未配置，请先在 Dashboard 配置')

  const url = `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const model = req.model || cfg.model
  const body = {
    model,
    messages: req.messages,
    temperature: req.temperature ?? cfg.temperature ?? 0.7,
    max_tokens: req.maxTokens ?? cfg.maxTokens ?? 4096,
    top_p: req.topP ?? cfg.topP ?? 1.0,
    stream: true,
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${cfg.apiKey}`,
  }

  // OpenRouter 额外头
  if (cfg.provider === 'openrouter' || cfg.baseUrl.includes('openrouter')) {
    headers['HTTP-Referer'] = window.location.origin || 'https://sylva.local'
    headers['X-Title'] = 'SYLVA Platform'
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`LLM API ${response.status}: ${text}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('Response body 不可读')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue
        if (!trimmed.startsWith('data:')) continue

        const jsonStr = trimmed.slice(5).trim()
        if (!jsonStr) continue

        try {
          const data = JSON.parse(jsonStr)
          const delta = data.choices?.[0]?.delta?.content || ''
          const finishReason = data.choices?.[0]?.finish_reason

          yield {
            content: delta,
            done: !!finishReason,
            usage: data.usage
              ? {
                  promptTokens: data.usage.prompt_tokens ?? 0,
                  completionTokens: data.usage.completion_tokens ?? 0,
                  totalTokens: data.usage.total_tokens ?? 0,
                }
              : undefined,
            model: data.model,
          }
        } catch {
          // ignore malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/* ── 非流式请求 ── */
export async function chatLLM(
  req: LLMRequest,
  config?: Partial<LLMConfig>
): Promise<{ content: string; usage?: LLMChunk['usage']; model?: string }> {
  const cfg = { ...loadLLMConfig(), ...config }
  if (!cfg.apiKey) throw new Error('LLM API Key 未配置，请先在 Dashboard 配置')

  const url = `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const model = req.model || cfg.model
  const body = {
    model,
    messages: req.messages,
    temperature: req.temperature ?? cfg.temperature ?? 0.7,
    max_tokens: req.maxTokens ?? cfg.maxTokens ?? 4096,
    top_p: req.topP ?? cfg.topP ?? 1.0,
    stream: false,
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${cfg.apiKey}`,
  }

  if (cfg.provider === 'openrouter' || cfg.baseUrl.includes('openrouter')) {
    headers['HTTP-Referer'] = window.location.origin || 'https://sylva.local'
    headers['X-Title'] = 'SYLVA Platform'
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`LLM API ${response.status}: ${text}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''

  return {
    content,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens ?? 0,
          completionTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
        }
      : undefined,
    model: data.model,
  }
}

/* ── 辅助：流式聚合为完整字符串 ── */
export async function streamToString(
  req: LLMRequest,
  config?: Partial<LLMConfig>
): Promise<{ content: string; usage?: LLMChunk['usage']; model?: string }> {
  let content = ''
  let usage: LLMChunk['usage'] | undefined
  let model: string | undefined

  for await (const chunk of streamLLM(req, config)) {
    content += chunk.content
    if (chunk.usage) usage = chunk.usage
    if (chunk.model) model = chunk.model
  }

  return { content, usage, model }
}

/* ── 测试连接 ── */
export async function testLLMConnection(config?: Partial<LLMConfig>): Promise<{
  ok: boolean
  latency: number
  error?: string
  model?: string
}> {
  const cfg = { ...loadLLMConfig(), ...config }
  const start = performance.now()

  try {
    const url = `${cfg.baseUrl.replace(/\/+$/, '')}/models`
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
    })
    const latency = Math.round(performance.now() - start)

    if (!res.ok) {
      const text = await res.text()
      return { ok: false, latency, error: `${res.status}: ${text}` }
    }

    // 如果 /models 可用，尝试获取可用模型列表
    const data = await res.json().catch(() => ({}))
    const firstModel = data.data?.[0]?.id || data.data?.[0] || cfg.model

    return { ok: true, latency, model: firstModel }
  } catch (e: any) {
    return { ok: false, latency: Math.round(performance.now() - start), error: e.message }
  }
}

/* ── 快捷封装：单轮对话 ── */
export async function askLLM(
  prompt: string,
  system?: string,
  config?: Partial<LLMConfig>
): Promise<string> {
  const messages: LLMMessage[] = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: prompt })

  const { content } = await chatLLM({ messages }, config)
  return content
}

export async function* askLLMStream(
  prompt: string,
  system?: string,
  config?: Partial<LLMConfig>
): AsyncGenerator<string, void, unknown> {
  const messages: LLMMessage[] = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: prompt })

  for await (const chunk of streamLLM({ messages }, config)) {
    yield chunk.content
  }
}
