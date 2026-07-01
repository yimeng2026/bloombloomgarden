import { useState } from 'react'
import {
  Server, Lock, Unlock, Star, Zap, Cpu, Diamond, Sparkles, Globe,
  Plus, ChevronRight, CheckCircle, XCircle, Clock, Activity,
  TrendingUp, Shield, ArrowRight, Layers, Crown,
} from 'lucide-react'

interface PlatformLevel {
  id: number
  name: string
  label: string
  description: string
  unlockCondition: string
  isUnlocked: boolean
  platforms: PlatformItem[]
  color: string
  icon: any
}

interface PlatformItem {
  id: string
  name: string
  provider: string
  status: 'connected' | 'disconnected' | 'error'
  models: string[]
  modelCount: number
  latency: number
  requestCount: number
  icon: any
  tint: string
}

const LEVELS: PlatformLevel[] = [
  {
    id: 1,
    name: 'Level 1',
    label: '基础平台',
    description: '免费开源和本地部署的模型平台，零成本起步',
    unlockCondition: '默认解锁',
    isUnlocked: true,
    color: '#6b7a5a',
    icon: Layers,
    platforms: [
      { id: 'pl-ollama', name: 'Ollama', provider: 'ollama', status: 'connected', models: ['qwen2.5:7b', 'deepseek-r1:14b', 'qwen2.5:1.5b'], modelCount: 3, latency: 120, requestCount: 3421, icon: Cpu, tint: '#6b7a5a' },
      { id: 'pl-localai', name: 'LocalAI', provider: 'localai', status: 'disconnected', models: ['llama3-8b', 'mistral-7b'], modelCount: 2, latency: 0, requestCount: 0, icon: Server, tint: '#7fb89f' },
      { id: 'pl-groq', name: 'Groq', provider: 'groq', status: 'connected', models: ['llama3-70b', 'mixtral-8x7b'], modelCount: 2, latency: 45, requestCount: 876, icon: Zap, tint: '#f59e0b' },
    ],
  },
  {
    id: 2,
    name: 'Level 2',
    label: '主流平台',
    description: '主流商业 API 平台，稳定可靠，适合生产环境',
    unlockCondition: '连接至少 1 个基础平台',
    isUnlocked: true,
    color: '#3b82f6',
    icon: Star,
    platforms: [
      { id: 'pl-kimi', name: 'Kimi (Moonshot)', provider: 'kimi', status: 'connected', models: ['kimi-k2.5', 'kimi-k1.5', 'kimi-k2.5-long'], modelCount: 3, latency: 156, requestCount: 12543, icon: Star, tint: '#c97b84' },
      { id: 'pl-claude', name: 'Claude (Anthropic)', provider: 'claude', status: 'connected', models: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'], modelCount: 3, latency: 35, requestCount: 8765, icon: Diamond, tint: '#d4a373' },
      { id: 'pl-openai', name: 'OpenAI', provider: 'openai', status: 'disconnected', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'], modelCount: 3, latency: 0, requestCount: 0, icon: Zap, tint: '#7fa3b0' },
      { id: 'pl-deepseek', name: 'DeepSeek', provider: 'deepseek', status: 'connected', models: ['deepseek-v3', 'deepseek-chat', 'deepseek-coder'], modelCount: 3, latency: 45, requestCount: 5678, icon: Globe, tint: '#a78b9a' },
    ],
  },
  {
    id: 3,
    name: 'Level 3',
    label: '企业平台',
    description: '高级企业级平台，专有大模型和私有化部署',
    unlockCondition: '累计 API 调用超过 10,000 次',
    isUnlocked: false,
    color: '#8b5cf6',
    icon: Crown,
    platforms: [
      { id: 'pl-azure', name: 'Azure OpenAI', provider: 'azure', status: 'disconnected', models: ['gpt-4o', 'gpt-4', 'text-embedding-3'], modelCount: 3, latency: 0, requestCount: 0, icon: Shield, tint: '#3b82f6' },
      { id: 'pl-bedrock', name: 'AWS Bedrock', provider: 'aws', status: 'disconnected', models: ['claude-3-5-sonnet', 'llama3-70b', 'titan'], modelCount: 3, latency: 0, requestCount: 0, icon: Server, tint: '#f59e0b' },
      { id: 'pl-gemini', name: 'Gemini Enterprise', provider: 'gemini', status: 'error', models: ['gemini-1.5-pro', 'gemini-1.5-flash'], modelCount: 2, latency: 28, requestCount: 1234, icon: Sparkles, tint: '#7fb89f' },
    ],
  },
]

export default function PlatformLibrary() {
  const [expandedLevels, setExpandedLevels] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: false })
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState(1)

  const toggleLevel = (id: number) => {
    setExpandedLevels((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const totalPlatforms = LEVELS.reduce((s, l) => s + l.platforms.length, 0)
  const connectedPlatforms = LEVELS.reduce((s, l) => s + l.platforms.filter((p) => p.status === 'connected').length, 0)
  const totalModels = LEVELS.reduce((s, l) => s + l.platforms.reduce((ss, p) => ss + p.modelCount, 0), 0)
  const totalRequests = LEVELS.reduce((s, l) => s + l.platforms.reduce((ss, p) => ss + p.requestCount, 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">多级平台库</h1>
            <p className="text-sm text-[var(--sage-500)]">
              {totalPlatforms} 个平台 · {connectedPlatforms} 在线 · {totalModels} 个模型 · 累计 {totalRequests.toLocaleString()} 次调用
            </p>
          </div>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> 添加平台
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{connectedPlatforms}</p>
          <p className="text-xs text-[var(--sage-500)]">在线平台</p>
        </div>
        <div className="card p-4">
          <Server className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{totalPlatforms}</p>
          <p className="text-xs text-[var(--sage-500)]">总平台数</p>
        </div>
        <div className="card p-4">
          <Cpu className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{totalModels}</p>
          <p className="text-xs text-[var(--sage-500)]">可用模型</p>
        </div>
        <div className="card p-4">
          <TrendingUp className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{(totalRequests / 1000).toFixed(1)}K</p>
          <p className="text-xs text-[var(--sage-500)]">累计调用</p>
        </div>
      </div>

      {/* Levels */}
      <div className="space-y-4">
        {LEVELS.map((level) => {
          const LevelIcon = level.icon
          const isExpanded = expandedLevels[level.id]
          return (
            <div key={level.id} className="card overflow-hidden">
              {/* Level Header */}
              <div
                onClick={() => toggleLevel(level.id)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--sage-50)] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: level.color + '15' }}
                >
                  <LevelIcon className="w-5 h-5" style={{ color: level.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-[var(--sage-800)]">{level.name} · {level.label}</h3>
                    {!level.isUnlocked && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--sage-100)] text-[var(--sage-500)] flex items-center gap-1">
                        <Lock className="w-3 h-3" /> 锁定
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--sage-500)]">{level.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--sage-400)]">{level.platforms.length} 个平台</span>
                  <ChevronRight
                    className={`w-4 h-4 text-[var(--sage-400)] transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </div>
              </div>

              {/* Level Content */}
              {isExpanded && level.isUnlocked && (
                <div className="border-t" style={{ borderColor: 'var(--sage-100)' }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                    {level.platforms.map((platform) => {
                      const PlatformIcon = platform.icon
                      return (
                        <div key={platform.id} className="p-3 rounded-card border" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: platform.tint + '15' }}
                              >
                                <PlatformIcon className="w-4 h-4" style={{ color: platform.tint }} />
                              </div>
                              <span className="font-medium text-sm text-[var(--sage-800)]">{platform.name}</span>
                            </div>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                platform.status === 'connected'
                                  ? 'bg-green-500/10 text-green-600'
                                  : platform.status === 'error'
                                  ? 'bg-red-500/10 text-red-600'
                                  : 'bg-[var(--sage-100)] text-[var(--sage-500)]'
                              }`}
                            >
                              {platform.status === 'connected' ? '在线' : platform.status === 'error' ? '错误' : '离线'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {platform.models.map((m) => (
                              <span key={m} className="text-[10px] px-1 py-0.5 rounded bg-[var(--sage-100)] text-[var(--sage-500)]">{m}</span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-[var(--sage-400)]">
                            <span>{platform.modelCount} 模型</span>
                            <span>{platform.latency}ms</span>
                            <span>{platform.requestCount.toLocaleString()} 调用</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Locked overlay */}
              {isExpanded && !level.isUnlocked && (
                <div className="border-t p-8 text-center" style={{ borderColor: 'var(--sage-100)' }}>
                  <Lock className="w-8 h-8 text-[var(--sage-300)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--sage-500)]">解锁条件: {level.unlockCondition}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Platform Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="card p-6 w-[500px] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">添加平台</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[var(--sage-600)] mb-1 block">选择级别</label>
                <div className="flex gap-2">
                  {LEVELS.filter((l) => l.isUnlocked).map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setSelectedLevel(l.id)}
                      className={`flex-1 px-3 py-2 rounded-card text-xs font-medium transition-colors ${
                        selectedLevel === l.id
                          ? 'text-white'
                          : 'bg-[var(--sage-50)] text-[var(--sage-600)] hover:bg-[var(--sage-100)]'
                      }`}
                      style={selectedLevel === l.id ? { backgroundColor: l.color } : {}}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--sage-600)] mb-1 block">平台名称</label>
                <input type="text" placeholder="例如: My Ollama" className="w-full px-3 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--sage-600)] mb-1 block">API URI</label>
                <input type="text" placeholder="https://api.example.com/v1" className="w-full px-3 py-2 rounded-card border text-sm font-mono" style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }} />
              </div>

              <div className="p-3 rounded-card text-xs text-[var(--sage-500)]" style={{ backgroundColor: 'var(--sage-50)', border: '1px solid var(--sage-100)' }}>
                <div className="font-medium mb-1">常用 URI 参考:</div>
                <div className="space-y-0.5 font-mono text-[10px]">
                  <div>OpenAI: https://api.openai.com/v1</div>
                  <div>Ollama: {(import.meta.env.VITE_OLLAMA_URL as string) || 'http://localhost:11434'}/api</div>
                  <div>Kimi: https://api.moonshot.cn/v1</div>
                  <div>Claude: https://api.anthropic.com/v1</div>
                  <div>Gemini: https://generativelanguage.googleapis.com/v1</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button className="btn-primary flex-1">添加</button>
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)' }}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
