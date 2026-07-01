import { useState, useEffect } from 'react'
import {
  Globe, Send, CheckCircle, XCircle, Loader2, Clock, Zap,
  Trash2, History, Code, Play, Plus, ChevronDown, ChevronUp, Copy, Check,
} from 'lucide-react'

interface Endpoint {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  name: string
  description: string
  category: string
}

interface TestResult {
  id: string
  endpoint: string
  path: string
  method: string
  status: number
  duration: number
  success: boolean
  response?: string
  timestamp: string
  size?: number
}

const API_BASE = '/api'

const ENDPOINTS: Endpoint[] = [
  { id: 'e1', method: 'GET', path: '/health', name: '健康检查', description: '服务器健康状态', category: '系统' },
  { id: 'e2', method: 'GET', path: '/agents', name: '获取智能体', description: '列出所有Agent', category: '智能体' },
  { id: 'e3', method: 'GET', path: '/skills', name: '获取技能', description: '列出所有技能', category: '技能' },
  { id: 'e4', method: 'GET', path: '/tasks', name: '获取任务', description: '任务列表', category: '任务' },
  { id: 'e5', method: 'GET', path: '/channels', name: '获取频道', description: '通讯频道', category: '通讯' },
  { id: 'e6', method: 'GET', path: '/groups', name: '获取群组', description: '协作组列表', category: '协作' },
  { id: 'e7', method: 'GET', path: '/monitor', name: '监控数据', description: '系统监控指标', category: '监控' },
  { id: 'e8', method: 'GET', path: '/settings', name: '设置', description: '系统设置', category: '系统' },
  { id: 'e9', method: 'GET', path: '/providers', name: '获取提供商', description: 'AI模型提供商', category: '平台' },
  { id: 'e10', method: 'GET', path: '/workflows', name: '获取工作流', description: '工作流列表', category: '工作流' },
  { id: 'e11', method: 'POST', path: '/agents', name: '创建智能体', description: '新建Agent', category: '智能体' },
  { id: 'e12', method: 'GET', path: '/models', name: '获取模型', description: '可用模型列表', category: '平台' },
]

const METHOD_COLORS: Record<string, string> = {
  GET: '#10b981',
  POST: '#3b82f6',
  PUT: '#f59e0b',
  DELETE: '#ef4444',
  PATCH: '#8b5cf6',
}

export default function APITest() {
  const [results, setResults] = useState<TestResult[]>([])
  const [history, setHistory] = useState<TestResult[]>([])
  const [testing, setTesting] = useState(false)
  const [expandedResult, setExpandedResult] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [customUrl, setCustomUrl] = useState('')
  const [customMethod, setCustomMethod] = useState('GET')
  const [customBody, setCustomBody] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('all')

  useEffect(() => {
    const saved = localStorage.getItem('api-test-history')
    if (saved) {
      try {
        setHistory(JSON.parse(saved))
      } catch { /* ignore */ }
    }
  }, [])

  const saveToHistory = (newResults: TestResult[]) => {
    const updated = [...newResults, ...history].slice(0, 50)
    setHistory(updated)
    localStorage.setItem('api-test-history', JSON.stringify(updated))
  }

  const runTest = async (ep: Endpoint) => {
    const start = performance.now()
    try {
      const res = await fetch(`${API_BASE}${ep.path}`)
      const duration = Math.round(performance.now() - start)
      let responseText = ''
      let size = 0
      try {
        const json = await res.json()
        responseText = JSON.stringify(json, null, 2)
        size = new Blob([responseText]).size
      } catch {
        responseText = await res.text()
        size = new Blob([responseText]).size
      }
      return {
        id: `${ep.id}-${Date.now()}`,
        endpoint: ep.name,
        path: ep.path,
        method: ep.method,
        status: res.status,
        duration,
        success: res.ok,
        response: responseText,
        timestamp: new Date().toLocaleTimeString(),
        size,
      }
    } catch (e: any) {
      return {
        id: `${ep.id}-${Date.now()}`,
        endpoint: ep.name,
        path: ep.path,
        method: ep.method,
        status: 0,
        duration: Math.round(performance.now() - start),
        success: false,
        response: e.message,
        timestamp: new Date().toLocaleTimeString(),
        size: 0,
      }
    }
  }

  const runCustomTest = async () => {
    if (!customUrl.trim()) return
    const start = performance.now()
    try {
      const options: RequestInit = { method: customMethod }
      if (customBody.trim() && ['POST', 'PUT', 'PATCH'].includes(customMethod)) {
        options.headers = { 'Content-Type': 'application/json' }
        options.body = customBody
      }
      const res = await fetch(customUrl.startsWith('http') ? customUrl : `${API_BASE}${customUrl}`, options)
      const duration = Math.round(performance.now() - start)
      let responseText = ''
      try {
        const json = await res.json()
        responseText = JSON.stringify(json, null, 2)
      } catch {
        responseText = await res.text()
      }
      const result: TestResult = {
        id: `custom-${Date.now()}`,
        endpoint: '自定义请求',
        path: customUrl,
        method: customMethod,
        status: res.status,
        duration,
        success: res.ok,
        response: responseText,
        timestamp: new Date().toLocaleTimeString(),
        size: new Blob([responseText]).size,
      }
      setResults((prev) => [result, ...prev])
      saveToHistory([result])
    } catch (e: any) {
      const result: TestResult = {
        id: `custom-${Date.now()}`,
        endpoint: '自定义请求',
        path: customUrl,
        method: customMethod,
        status: 0,
        duration: Math.round(performance.now() - start),
        success: false,
        response: e.message,
        timestamp: new Date().toLocaleTimeString(),
        size: 0,
      }
      setResults((prev) => [result, ...prev])
      saveToHistory([result])
    }
  }

  const runAllTests = async () => {
    setTesting(true)
    setResults([])
    const allResults: TestResult[] = []
    const filtered = filterCategory === 'all' ? ENDPOINTS : ENDPOINTS.filter((e) => e.category === filterCategory)
    for (const ep of filtered) {
      const result = await runTest(ep)
      allResults.push(result)
      setResults([...allResults])
    }
    saveToHistory(allResults)
    setTesting(false)
  }

  const clearResults = () => setResults([])

  const copyResponse = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const successCount = results.filter((r) => r.success).length
  const avgDuration = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.duration, 0) / results.length) : 0
  const categories = [...new Set(ENDPOINTS.map((e) => e.category))]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">API 测试</h1>
            <p className="text-sm text-[var(--sage-500)]">测试后端 API 连通性 · {ENDPOINTS.length} 个端点</p>
          </div>
        </div>
        <div className="flex gap-2">
          {results.length > 0 && (
            <button onClick={clearResults} className="btn-secondary flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> 清空
            </button>
          )}
          <button onClick={runAllTests} disabled={testing} className="btn-primary flex items-center gap-2">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {testing ? '测试中...' : filterCategory === 'all' ? '全部测试' : `测试 ${filterCategory}`}
          </button>
        </div>
      </div>

      {/* Stats */}
      {results.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4">
            <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
            <p className="text-2xl font-bold text-[var(--sage-800)]">{successCount}</p>
            <p className="text-xs text-[var(--sage-500)]">成功</p>
          </div>
          <div className="card p-4">
            <XCircle className="w-5 h-5 text-red-500 mb-2" />
            <p className="text-2xl font-bold text-[var(--sage-800)]">{results.length - successCount}</p>
            <p className="text-xs text-[var(--sage-500)]">失败</p>
          </div>
          <div className="card p-4">
            <Clock className="w-5 h-5 text-[var(--sage-500)] mb-2" />
            <p className="text-2xl font-bold text-[var(--sage-800)]">{avgDuration}ms</p>
            <p className="text-xs text-[var(--sage-500)]">平均延迟</p>
          </div>
          <div className="card p-4">
            <Zap className="w-5 h-5 text-[var(--sage-500)] mb-2" />
            <p className="text-2xl font-bold text-[var(--sage-800)]">{results.length}</p>
            <p className="text-xs text-[var(--sage-500)]">已测试</p>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-2 rounded-card text-xs font-medium transition-colors ${
            filterCategory === 'all' ? 'bg-[var(--sage-500)] text-white' : 'bg-[var(--sage-50)] text-[var(--sage-600)] hover:bg-[var(--sage-100)]'
          }`}
        >
          全部
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-2 rounded-card text-xs font-medium transition-colors ${
              filterCategory === cat ? 'bg-[var(--sage-500)] text-white' : 'bg-[var(--sage-50)] text-[var(--sage-600)] hover:bg-[var(--sage-100)]'
            }`}
          >
            {cat}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`ml-auto px-3 py-2 rounded-card text-xs font-medium transition-colors ${
            showCustom ? 'bg-[var(--sage-500)] text-white' : 'bg-[var(--sage-50)] text-[var(--sage-600)] hover:bg-[var(--sage-100)]'
          }`}
        >
          <Code className="w-3 h-3 inline mr-1" /> 自定义请求
        </button>
      </div>

      {/* Custom Request */}
      {showCustom && (
        <div className="card p-4 space-y-3">
          <div className="flex gap-2">
            <select
              value={customMethod}
              onChange={(e) => setCustomMethod(e.target.value)}
              className="px-3 py-2 rounded-card border text-sm font-mono"
              style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
            >
              {Object.keys(METHOD_COLORS).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="/api/... 或完整 URL"
              className="flex-1 px-3 py-2 rounded-card border text-sm font-mono"
              style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
            />
            <button onClick={runCustomTest} className="btn-primary flex items-center gap-2">
              <Play className="w-4 h-4" /> 发送
            </button>
          </div>
          {['POST', 'PUT', 'PATCH'].includes(customMethod) && (
            <textarea
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              placeholder='{"key": "value"}'
              rows={4}
              className="w-full px-3 py-2 rounded-card border text-sm font-mono"
              style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
            />
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r) => {
            const isExpanded = expandedResult === r.id
            return (
              <div key={r.id} className="card overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--sage-50)] transition-colors"
                  onClick={() => setExpandedResult(isExpanded ? null : r.id)}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-mono px-2 py-1 rounded font-bold"
                      style={{ backgroundColor: METHOD_COLORS[r.method] + '15', color: METHOD_COLORS[r.method] }}
                    >
                      {r.method}
                    </span>
                    <div>
                      <span className="font-medium text-sm text-[var(--sage-800)]">{r.endpoint}</span>
                      <span className="text-xs text-[var(--sage-400)] ml-2">{r.path}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--sage-400)]">{r.duration}ms</span>
                    <span
                      className={`text-xs font-mono px-2 py-1 rounded ${
                        r.status >= 200 && r.status < 300
                          ? 'bg-green-500/10 text-green-600'
                          : r.status >= 400
                          ? 'bg-red-500/10 text-red-600'
                          : 'bg-[var(--sage-100)] text-[var(--sage-500)]'
                      }`}
                    >
                      {r.status || 'ERR'}
                    </span>
                    {r.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[var(--sage-400)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--sage-400)]" />
                    )}
                  </div>
                </div>

                {isExpanded && r.response && (
                  <div className="border-t px-4 py-3" style={{ borderColor: 'var(--sage-100)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[var(--sage-400)]">
                        {r.timestamp} · {r.size ? (r.size / 1024).toFixed(1) + ' KB' : ''}
                      </span>
                      <button
                        onClick={() => copyResponse(r.id, r.response || '')}
                        className="text-xs text-[var(--sage-500)] hover:text-[var(--sage-700)] flex items-center gap-1"
                      >
                        {copiedId === r.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedId === r.id ? '已复制' : '复制'}
                      </button>
                    </div>
                    <pre className="text-xs text-[var(--sage-600)] font-mono bg-[var(--sage-50)] p-3 rounded overflow-x-auto max-h-[300px] overflow-y-auto">
                      {r.response}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* History */}
      {history.length > 0 && results.length === 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--sage-100)' }}>
            <History className="w-4 h-4 text-[var(--sage-500)]" />
            <h3 className="text-sm font-semibold text-[var(--sage-800)]">历史记录</h3>
            <span className="text-xs text-[var(--sage-400)] ml-auto">最近 {history.length} 条</span>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {history.slice(0, 10).map((h, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2 border-b text-xs" style={{ borderColor: 'var(--sage-50)' }}>
                <span
                  className="font-mono px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: METHOD_COLORS[h.method] + '15', color: METHOD_COLORS[h.method] }}
                >
                  {h.method}
                </span>
                <span className="text-[var(--sage-700)] flex-1 truncate">{h.endpoint}</span>
                <span className="text-[var(--sage-400)]">{h.duration}ms</span>
                <span className={h.success ? 'text-green-500' : 'text-red-500'}>
                  {h.status || 'ERR'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
