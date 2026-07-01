import { useState, useEffect } from 'react'
import { Cpu, Search, CheckCircle, XCircle, Activity, Zap, HardDrive, Clock, Globe, Server, Radio } from 'lucide-react'

interface Model {
  id: string
  name: string
  provider: string
  status: 'available' | 'unavailable' | 'busy'
  capabilities: string[]
  latency: number
  contextWindow: number
  params: string
  quant: string
  sizeGB: number
}

const MOCK_MODELS: Model[] = [
  { id: 'gpt-4', name: 'GPT-4o', provider: 'OpenAI', status: 'available', capabilities: ['chat', 'code', 'analysis', 'vision'], latency: 23, contextWindow: 128000, params: '1.76T', quant: 'N/A', sizeGB: 0 },
  { id: 'claude-3', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', status: 'available', capabilities: ['chat', 'code', 'vision', 'long-context'], latency: 35, contextWindow: 200000, params: '175B', quant: 'N/A', sizeGB: 0 },
  { id: 'kimi-k2.5', name: 'Kimi K2.5', provider: 'Moonshot', status: 'available', capabilities: ['chat', 'code', 'reasoning', 'long-context'], latency: 156, contextWindow: 256000, params: '1T', quant: 'N/A', sizeGB: 0 },
  { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek', status: 'available', capabilities: ['chat', 'code', 'math'], latency: 45, contextWindow: 64000, params: '671B', quant: 'N/A', sizeGB: 0 },
  { id: 'qwen-7b', name: 'Qwen 2.5 7B', provider: 'Ollama', status: 'available', capabilities: ['chat', 'code', 'local'], latency: 120, contextWindow: 32000, params: '7.6B', quant: 'Q4_K_M', sizeGB: 5.5 },
  { id: 'deepseek-r1-14b', name: 'DeepSeek R1 14B', provider: 'Ollama', status: 'available', capabilities: ['chat', 'reasoning', 'local'], latency: 89, contextWindow: 64000, params: '14.8B', quant: 'Q4_K_M', sizeGB: 8.9 },
  { id: 'qwen-1.5b', name: 'Qwen 2.5 1.5B', provider: 'Ollama', status: 'busy', capabilities: ['chat', 'local'], latency: 45, contextWindow: 32000, params: '1.5B', quant: 'Q4_K_M', sizeGB: 0.9 },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', status: 'available', capabilities: ['chat', 'code', 'vision'], latency: 28, contextWindow: 1000000, params: 'N/A', quant: 'N/A', sizeGB: 0 },
  { id: 'groq-llama3', name: 'Llama 3 70B (Groq)', provider: 'Groq', status: 'available', capabilities: ['chat', 'code', 'fast'], latency: 12, contextWindow: 8192, params: '70B', quant: 'N/A', sizeGB: 0 },
]

export default function ModelBrowser() {
  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [models] = useState(MOCK_MODELS)

  const providers = ['all', ...new Set(models.map((m) => m.provider))]

  const filtered = models.filter((m) => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.provider.toLowerCase().includes(search.toLowerCase())) return false
    if (providerFilter !== 'all' && m.provider !== providerFilter) return false
    return true
  })

  const onlineCount = models.filter((m) => m.status === 'available').length
  const localCount = models.filter((m) => m.provider === 'Ollama').length
  const totalParams = models.reduce((s, m) => s + (parseFloat(m.params) || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Cpu className="w-6 h-6 text-[var(--sage-500)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--sage-800)]">模型浏览器</h1>
          <p className="text-sm text-[var(--sage-500)]">{models.length} 个模型 · {onlineCount} 在线 · {localCount} 本地</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{onlineCount}</p>
          <p className="text-xs text-[var(--sage-500)]">在线模型</p>
        </div>
        <div className="card p-4">
          <HardDrive className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{localCount}</p>
          <p className="text-xs text-[var(--sage-500)]">本地模型</p>
        </div>
        <div className="card p-4">
          <Zap className="w-5 h-5 text-[var(--bloom-amber)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{Math.round(models.reduce((s, m) => s + m.latency, 0) / models.length)}ms</p>
          <p className="text-xs text-[var(--sage-500)]">平均延迟</p>
        </div>
        <div className="card p-4">
          <Globe className="w-5 h-5 text-[var(--bloom-sky)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{new Set(models.map((m) => m.provider)).size}</p>
          <p className="text-xs text-[var(--sage-500)]">提供商</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
          <input
            type="text" placeholder="搜索模型..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
          />
        </div>
        <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} className="px-3 py-2.5 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}>
          {providers.map((p) => (
            <option key={p} value={p}>{p === 'all' ? '全部提供商' : p}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map((model) => (
          <div key={model.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  model.status === 'available' ? 'bg-green-500/10' : model.status === 'busy' ? 'bg-amber-500/10' : 'bg-red-500/10'
                }`}>
                  <Cpu className={`w-5 h-5 ${
                    model.status === 'available' ? 'text-green-500' : model.status === 'busy' ? 'text-amber-500' : 'text-red-500'
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-[var(--sage-800)]">{model.name}</h3>
                    {model.status === 'available' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : model.status === 'busy' ? (
                      <Activity className="w-4 h-4 text-amber-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--sage-500)]">{model.provider} · {model.params} · {model.quant}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {model.capabilities.map((cap) => (
                      <span key={cap} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--sage-100)] text-[var(--sage-600)]">
                        {cap === 'chat' ? '对话' : cap === 'code' ? '代码' : cap === 'vision' ? '视觉' : cap === 'reasoning' ? '推理' : cap === 'local' ? '本地' : cap === 'long-context' ? '长上下文' : cap === 'fast' ? '极速' : cap === 'analysis' ? '分析' : cap === 'math' ? '数学' : cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-right text-xs text-[var(--sage-500)] space-y-1">
                <div className="flex items-center gap-1 justify-end">
                  <Clock className="w-3 h-3" />
                  {model.latency}ms
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <HardDrive className="w-3 h-3" />
                  {(model.contextWindow / 1000).toFixed(0)}K
                </div>
                {model.sizeGB > 0 && (
                  <div className="flex items-center gap-1 justify-end">
                    <Server className="w-3 h-3" />
                    {model.sizeGB} GB
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
