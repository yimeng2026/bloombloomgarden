import { useState } from 'react'
import { MessageSquare, Wifi, WifiOff, Bot, Globe, Mail, Hash, Smartphone, Radio, AlertTriangle, CheckCircle, Plus, Settings } from 'lucide-react'

interface Channel {
  id: string
  name: string
  platform: string
  url: string
  status: 'connected' | 'disconnected' | 'error'
  agentId?: string
  messagesToday: number
  messagesTotal: number
  lastMessage: string
  config: { webhook?: string; apiKey?: string }
}

const MOCK_CHANNELS: Channel[] = [
  { id: 'ch-1', name: 'WebChat 主站', platform: 'web', url: 'https://sylva.local/chat', status: 'connected', messagesToday: 156, messagesTotal: 12453, lastMessage: '2分钟前', config: {} },
  { id: 'ch-2', name: 'Telegram Bot', platform: 'telegram', url: 't.me/sylva_bot', status: 'connected', agentId: 'agent-1', messagesToday: 89, messagesTotal: 5672, lastMessage: '5分钟前', config: { apiKey: '***' } },
  { id: 'ch-3', name: 'Discord 服务器', platform: 'discord', url: 'discord.gg/sylva', status: 'disconnected', messagesToday: 0, messagesTotal: 3421, lastMessage: '3小时前', config: { apiKey: '***' } },
  { id: 'ch-4', name: 'Slack 工作区', platform: 'slack', url: 'sylva.slack.com', status: 'connected', agentId: 'agent-2', messagesToday: 45, messagesTotal: 2890, lastMessage: '15分钟前', config: { webhook: '***' } },
  { id: 'ch-5', name: '微信公众号', platform: 'wechat', url: 'mp.weixin.qq.com', status: 'error', messagesToday: 12, messagesTotal: 8901, lastMessage: '1小时前', config: { apiKey: '***' } },
  { id: 'ch-6', name: '企业微信', platform: 'wecom', url: 'work.weixin.qq.com', status: 'connected', agentId: 'agent-3', messagesToday: 234, messagesTotal: 15678, lastMessage: '刚刚', config: { apiKey: '***' } },
  { id: 'ch-7', name: '邮件通知', platform: 'email', url: 'smtp.sylva.local', status: 'connected', messagesToday: 67, messagesTotal: 4234, lastMessage: '30分钟前', config: {} },
  { id: 'ch-8', name: 'WhatsApp Bot', platform: 'whatsapp', url: 'wa.me/sylva', status: 'disconnected', messagesToday: 0, messagesTotal: 1234, lastMessage: '昨天', config: { apiKey: '***' } },
]

const PLATFORM_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  web: { icon: Globe, label: 'Web', color: '#10b981' },
  telegram: { icon: Smartphone, label: 'Telegram', color: '#3b82f6' },
  discord: { icon: Bot, label: 'Discord', color: '#8b5cf6' },
  slack: { icon: Hash, label: 'Slack', color: '#c97b84' },
  wechat: { icon: MessageSquare, label: '微信', color: '#10b981' },
  wecom: { icon: MessageSquare, label: '企微', color: '#f59e0b' },
  email: { icon: Mail, label: '邮件', color: '#7fa3b0' },
  whatsapp: { icon: Radio, label: 'WhatsApp', color: '#10b981' },
}

export default function ChatChannels() {
  const [channels, setChannels] = useState<Channel[]>(MOCK_CHANNELS)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'connected' | 'disconnected' | 'error'>('all')
  const [selected, setSelected] = useState<string | null>(null)

  const filtered = channels.filter((ch) => {
    if (search && !ch.name.toLowerCase().includes(search.toLowerCase()) && !ch.platform.toLowerCase().includes(search.toLowerCase())) return false
    if (filter !== 'all' && ch.status !== filter) return false
    return true
  })

  const toggleStatus = (id: string) => {
    setChannels(channels.map((ch) => {
      if (ch.id !== id) return ch
      const next = ch.status === 'connected' ? 'disconnected' : 'connected'
      return { ...ch, status: next }
    }))
  }

  const connectedCount = channels.filter((c) => c.status === 'connected').length
  const totalMessages = channels.reduce((s, c) => s + c.messagesToday, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">频道管理</h1>
            <p className="text-sm text-[var(--sage-500)]">{channels.length} 个频道 · {connectedCount} 在线 · 今日 {totalMessages} 条消息</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-[var(--sage-500)]">在线</span>
          </div>
          <p className="text-2xl font-bold text-[var(--sage-800)]">{connectedCount}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <WifiOff className="w-4 h-4 text-[var(--sage-400)]" />
            <span className="text-xs text-[var(--sage-500)]">离线</span>
          </div>
          <p className="text-2xl font-bold text-[var(--sage-800)]">{channels.filter((c) => c.status === 'disconnected').length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-[var(--sage-500)]">异常</span>
          </div>
          <p className="text-2xl font-bold text-[var(--sage-800)]">{channels.filter((c) => c.status === 'error').length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-[var(--sage-500)]" />
            <span className="text-xs text-[var(--sage-500)]">今日消息</span>
          </div>
          <p className="text-2xl font-bold text-[var(--sage-800)]">{totalMessages}</p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text" placeholder="搜索频道..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-card border text-sm"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'connected', 'disconnected', 'error'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-card text-xs font-medium transition-colors ${
                filter === f ? 'bg-[var(--sage-500)] text-white' : 'bg-[var(--sage-50)] text-[var(--sage-600)] hover:bg-[var(--sage-100)]'
              }`}
            >
              {f === 'all' ? '全部' : f === 'connected' ? '在线' : f === 'disconnected' ? '离线' : '异常'}
            </button>
          ))}
        </div>
      </div>

      {/* Channel List */}
      <div className="space-y-3">
        {filtered.map((ch) => {
          const config = PLATFORM_CONFIG[ch.platform] || PLATFORM_CONFIG.web
          const Icon = config.icon
          return (
            <div
              key={ch.id}
              onClick={() => setSelected(selected === ch.id ? null : ch.id)}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                selected === ch.id ? 'ring-2 ring-[var(--sage-500)]' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: config.color + '15' }}>
                    <Icon className="w-5 h-5" style={{ color: config.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-[var(--sage-800)]">{ch.name}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--sage-100)] text-[var(--sage-500)]">{config.label}</span>
                    </div>
                    <p className="text-xs text-[var(--sage-500)] font-mono mt-0.5">{ch.url}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--sage-400)]">
                      <span>今日: {ch.messagesToday}</span>
                      <span>总计: {ch.messagesTotal.toLocaleString()}</span>
                      <span>最后: {ch.lastMessage}</span>
                      {ch.agentId && <span>Agent: {ch.agentId}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchChannels()
      .then(res => { if (!cancelled) setChannels(res.data || []); })
      .catch(() => { /* keep default/mock */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []); toggleStatus(ch.id); }}
                    className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 transition-colors ${
                      ch.status === 'connected'
                        ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                        : ch.status === 'error'
                          ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
                          : 'bg-[var(--sage-100)] text-[var(--sage-500)] hover:bg-[var(--sage-200)]'
                    }`}
                  >
                    {ch.status === 'connected' ? <CheckCircle className="w-3 h-3" /> : ch.status === 'error' ? <AlertTriangle className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {ch.status === 'connected' ? '在线' : ch.status === 'error' ? '异常' : '离线'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
