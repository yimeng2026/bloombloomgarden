import { useState } from 'react'
import { Monitor, Activity, Cpu, HardDrive, Globe, Zap, TrendingUp, AlertTriangle, CheckCircle, Clock, Server, Database, Wifi, Shield } from 'lucide-react'

interface Metric {
  label: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: any
  color: string
}

const METRICS: Metric[] = [
  { label: 'CPU 使用率', value: '32%', change: '+2%', trend: 'up', icon: Cpu, color: '#10b981' },
  { label: '内存使用', value: '4.2 GB', change: '-0.5 GB', trend: 'up', icon: HardDrive, color: '#3b82f6' },
  { label: '磁盘 I/O', value: '156 MB/s', change: '+12%', trend: 'up', icon: Zap, color: '#f59e0b' },
  { label: '网络吞吐', value: '234 Mbps', change: '-15%', trend: 'down', icon: Wifi, color: '#8b5cf6' },
  { label: '活跃连接', value: '156', change: '+12', trend: 'up', icon: Globe, color: '#c97b84' },
  { label: '请求/秒', value: '234', change: '-15', trend: 'down', icon: TrendingUp, color: '#7fb89f' },
  { label: '错误率', value: '0.3%', change: '+0.1%', trend: 'up', icon: AlertTriangle, color: '#ef4444' },
  { label: '服务健康', value: '99.9%', change: '', trend: 'neutral', icon: CheckCircle, color: '#10b981' },
]

const SERVICES = [
  { name: 'API Server', status: 'running', uptime: '15d 3h', load: 32, type: 'api', port: 3001 },
  { name: 'Frontend Dev', status: 'running', uptime: '15d 3h', load: 18, type: 'web', port: 3000 },
  { name: 'Database', status: 'running', uptime: '15d 3h', load: 45, type: 'db', port: 5432 },
  { name: 'Redis', status: 'running', uptime: '15d 3h', load: 12, type: 'cache', port: 6379 },
  { name: 'Ollama', status: 'running', uptime: '5d 12h', load: 78, type: 'ai', port: 11434 },
  { name: 'Agent Zero', status: 'idle', uptime: '2d 8h', load: 5, type: 'agent', port: 5000 },
  { name: 'Nginx', status: 'running', uptime: '30d 0h', load: 8, type: 'proxy', port: 80 },
  { name: 'Message Bus', status: 'running', uptime: '15d 3h', load: 22, type: 'queue', port: 5672 },
]

const LOGS = [
  { time: '12:30:45', level: 'info', source: 'API Server', message: 'GET /api/v2/agents 200 OK (45ms)' },
  { time: '12:30:42', level: 'info', source: 'Agent-3', message: 'Task completed: code_review (1.2s)' },
  { time: '12:30:38', level: 'warn', source: 'Ollama', message: 'Model qwen2.5:7b loaded (5.5GB VRAM)' },
  { time: '12:30:35', level: 'error', source: 'Database', message: 'Connection pool exhausted, retrying...' },
  { time: '12:30:30', level: 'info', source: 'Message Bus', message: 'Published: agent.task.completed' },
  { time: '12:30:28', level: 'info', source: 'Frontend', message: 'Build completed: 2942 modules' },
  { time: '12:30:25', level: 'warn', source: 'Agent Zero', message: 'High memory usage: 3.2GB / 4GB' },
  { time: '12:30:20', level: 'info', source: 'API Server', message: 'WebSocket connection established' },
]

const LEVEL_CONFIG: Record<string, { color: string; bg: string }> = {
  info: { color: '#6b7a5a', bg: '#e8ebe3' },
  warn: { color: '#c9973f', bg: '#fdf6e3' },
  error: { color: '#b85c5c', bg: '#fce8e8' },
}

export default function Monitoring() {
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'logs'>('overview')
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [logFilter, setLogFilter] = useState<string>('all')

  const runningCount = SERVICES.filter((s) => s.status === 'running').length
  const avgLoad = Math.round(SERVICES.reduce((sum, s) => sum + s.load, 0) / SERVICES.length)

  const filteredLogs = logFilter === 'all' ? LOGS : LOGS.filter((l) => l.level === logFilter)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-[var(--sage-500)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--sage-800)]">系统监控</h1>
          <p className="text-sm text-[var(--sage-500)]">
            {runningCount}/{SERVICES.length} 服务运行中 · 平均负载 {avgLoad}%
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'overview' as const, label: '概览', icon: Monitor },
          { id: 'services' as const, label: '服务', icon: Server },
          { id: 'logs' as const, label: '日志', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-card text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[var(--sage-500)] text-white'
                  : 'bg-[var(--sage-50)] text-[var(--sage-600)] hover:bg-[var(--sage-100)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {METRICS.map((m) => {
              const Icon = m.icon
              return (
                <div key={m.label} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[var(--sage-500)]">{m.label}</span>
                    <Icon className="w-4 h-4" style={{ color: m.color }} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[var(--sage-800)]">{m.value}</span>
                    {m.change && (
                      <span className={`text-xs ${m.trend === 'up' ? 'text-green-500' : 'text-[var(--sage-400)]'}`}>
                        {m.change}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Service Status */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-[var(--sage-800)] mb-3 flex items-center gap-2">
              <Server className="w-4 h-4 text-[var(--sage-500)]" />
              服务状态
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {SERVICES.slice(0, 4).map((s) => (
                <div key={s.name} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--sage-50)]">
                  <div className={`w-2 h-2 rounded-full ${s.status === 'running' ? 'bg-green-500' : 'bg-[var(--sage-400)]'}`} />
                  <span className="text-xs text-[var(--sage-700)]">{s.name}</span>
                  <span className="text-[10px] text-[var(--sage-400)] ml-auto">{s.load}%</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Services */}
      {activeTab === 'services' && (
        <div className="space-y-3">
          {SERVICES.map((s) => (
            <div
              key={s.name}
              onClick={() => setSelectedService(selectedService === s.name ? null : s.name)}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedService === s.name ? 'ring-2 ring-[var(--sage-500)]' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sage-100)]">
                    <Server className="w-5 h-5 text-[var(--sage-500)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--sage-800)]">{s.name}</h3>
                    <p className="text-xs text-[var(--sage-500)]">
                      {s.type} · 端口 {s.port} · 运行 {s.uptime}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      s.status === 'running'
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-[var(--sage-100)] text-[var(--sage-500)]'
                    }`}
                  >
                    {s.status === 'running' ? '运行中' : '空闲'}
                  </span>
                  <div className="text-right">
                    <div className="text-xs text-[var(--sage-500)]">负载 {s.load}%</div>
                    <div className="w-24 h-1.5 rounded-full bg-[var(--sage-100)] mt-1">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${s.load}%`,
                          backgroundColor: s.load > 80 ? '#ef4444' : s.load > 50 ? '#f59e0b' : '#10b981',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Logs */}
      {activeTab === 'logs' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--sage-100)' }}>
            <h3 className="text-sm font-semibold text-[var(--sage-800)] flex items-center gap-2">
              <Database className="w-4 h-4 text-[var(--sage-500)]" />
              实时日志
            </h3>
            <div className="flex gap-1">
              {['all', 'info', 'warn', 'error'].map((f) => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`text-xs px-2 py-1 rounded-full transition-colors ${
                    logFilter === f
                      ? 'bg-[var(--sage-500)] text-white'
                      : 'bg-[var(--sage-100)] text-[var(--sage-500)] hover:bg-[var(--sage-200)]'
                  }`}
                >
                  {f === 'all' ? '全部' : f === 'info' ? '信息' : f === 'warn' ? '警告' : '错误'}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {filteredLogs.map((log, i) => {
              const config = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.info
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 px-4 py-2.5 border-b text-xs"
                  style={{ borderColor: 'var(--sage-50)' }}
                >
                  <span className="text-[var(--sage-400)] font-mono shrink-0">{log.time}</span>
                  <span
                    className="px-1.5 py-0.5 rounded font-medium shrink-0"
                    style={{ backgroundColor: config.bg, color: config.color }}
                  >
                    {log.level.toUpperCase()}
                  </span>
                  <span className="text-[var(--sage-500)] shrink-0 w-[100px]">{log.source}</span>
                  <span className="text-[var(--sage-700)]">{log.message}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
