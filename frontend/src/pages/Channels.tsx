import { useState, useEffect } from 'react'
import {
  Plus, Trash2, Power, MessageSquare, Settings, Search, Filter,
  Globe, Bot, CheckCircle, XCircle, Wifi, WifiOff, Copy, Check,
  Calendar, BarChart3, TrendingUp, AlertTriangle, RefreshCw,
} from 'lucide-react'
import { fetchChannels, createChannel, deleteChannel } from '@/api/client'

interface Channel {
  id: string
  name: string
  type: string
  config: string
  is_active: boolean
  agent_id?: string
  agent_name?: string
  created_at: string
  last_message?: string
  message_count: number
  connected_users: number
  webhook_url?: string
}

const CHANNEL_TYPES = [
  { value: 'webchat', label: 'WebChat', desc: '网页聊天界面', icon: Globe, color: '#3b82f6' },
  { value: 'telegram', label: 'Telegram', desc: 'Telegram Bot', icon: Bot, color: '#3b82f6' },
  { value: 'discord', label: 'Discord', desc: 'Discord Bot', icon: MessageSquare, color: '#8b5cf6' },
  { value: 'slack', label: 'Slack', desc: 'Slack Bot', icon: MessageSquare, color: '#6b7a5a' },
  { value: 'wechat', label: '微信', desc: '微信机器人', icon: MessageSquare, color: '#10b981' },
  { value: 'email', label: '邮件', desc: '邮件通知通道', icon: MessageSquare, color: '#f59e0b' },
  { value: 'webhook', label: 'Webhook', desc: '自定义 Webhook', icon: Globe, color: '#c97b84' },
]

export default function Channels() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'webchat', config: '{}' })
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchChannels()
      .then((data: any) => {
        if (!cancelled) setChannels(data?.data || [])
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || '加载频道列表失败')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleSubmit = async () => {
    const typeCfg = CHANNEL_TYPES.find((t) => t.value === form.type)
    const newChannel: Channel = {
      id: `ch-${Date.now()}`,
      name: form.name,
      type: form.type,
      config: form.config,
      is_active: true,
      agent_name: typeCfg?.label + ' Agent',
      created_at: new Date().toISOString().split('T')[0],
      message_count: 0,
      connected_users: 0,
    }
    setChannels([...channels, newChannel])
    setShowModal(false)
    setForm({ name: '', type: 'webchat', config: '{}' })
  }

  const handleDelete = (id: string) => {
    setChannels(channels.filter((c) => c.id !== id))
  }

  const toggleActive = (id: string) => {
    setChannels(channels.map((c) => c.id === id ? { ...c, is_active: !c.is_active } : c))
  }

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filtered = channels.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter !== 'all' && c.type !== typeFilter) return false
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && !c.is_active) return false
      if (statusFilter === 'inactive' && c.is_active) return false
    }
    return true
  })

  const activeCount = channels.filter((c) => c.is_active).length
  const totalMessages = channels.reduce((s, c) => s + c.message_count, 0)
  const totalUsers = channels.reduce((s, c) => s + c.connected_users, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="flex items-center gap-3 text-[var(--sage-500)]">
          <div className="w-5 h-5 border-2 border-[var(--sage-300)] border-t-[var(--sage-500)] rounded-full animate-spin" />
          <span className="text-sm">加载频道...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="card p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-[var(--sage-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--sage-800)]">频道列表</h1>
            <p className="text-sm text-[var(--sage-500)]">
              {channels.length} 个频道 · {activeCount} 在线 · {totalMessages.toLocaleString()} 消息 · {totalUsers} 用户
            </p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> 新建频道
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{activeCount}</p>
          <p className="text-xs text-[var(--sage-500)]">在线频道</p>
        </div>
        <div className="card p-4">
          <XCircle className="w-5 h-5 text-[var(--sage-400)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{channels.filter((c) => !c.is_active).length}</p>
          <p className="text-xs text-[var(--sage-500)]">离线</p>
        </div>
        <div className="card p-4">
          <BarChart3 className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{(totalMessages / 1000).toFixed(1)}K</p>
          <p className="text-xs text-[var(--sage-500)]">总消息</p>
        </div>
        <div className="card p-4">
          <TrendingUp className="w-5 h-5 text-[var(--sage-500)] mb-2" />
          <p className="text-2xl font-bold text-[var(--sage-800)]">{totalUsers}</p>
          <p className="text-xs text-[var(--sage-500)]">在线用户</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索频道..."
            className="w-full pl-10 pr-4 py-2.5 rounded-card border text-sm"
            style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 rounded-card border text-sm"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
        >
          <option value="all">全部类型</option>
          {CHANNEL_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-card border text-sm"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
        >
          <option value="all">全部状态</option>
          <option value="active">在线</option>
          <option value="inactive">离线</option>
        </select>
      </div>

      {/* Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((channel) => {
          const typeCfg = CHANNEL_TYPES.find((t) => t.value === channel.type) || CHANNEL_TYPES[0]
          const TypeIcon = typeCfg.icon
          return (
            <div key={channel.id} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: typeCfg.color + '15' }}
                  >
                    <TypeIcon className="w-5 h-5" style={{ color: typeCfg.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--sage-800)]">{channel.name}</h3>
                    <p className="text-xs text-[var(--sage-500)]">{typeCfg.label} · {typeCfg.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(channel.id)}
                  className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                    channel.is_active
                      ? 'bg-green-500/10 text-green-600'
                      : 'bg-[var(--sage-100)] text-[var(--sage-500)]'
                  }`}
                >
                  {channel.is_active ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {channel.is_active ? '在线' : '离线'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 rounded-lg bg-[var(--sage-50)]">
                  <p className="text-sm font-bold text-[var(--sage-800)]">{channel.message_count.toLocaleString()}</p>
                  <p className="text-[10px] text-[var(--sage-400)]">消息</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-[var(--sage-50)]">
                  <p className="text-sm font-bold text-[var(--sage-800)]">{channel.connected_users}</p>
                  <p className="text-[10px] text-[var(--sage-400)]">用户</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-[var(--sage-50)]">
                  <p className="text-sm font-bold text-[var(--sage-800)]">{channel.last_message || '-'}</p>
                  <p className="text-[10px] text-[var(--sage-400)]">最后消息</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--sage-400)]">
                <span>Agent: {channel.agent_name || '未分配'}</span>
                <span>{channel.created_at}</span>
              </div>

              <div className="flex items-center gap-1 mt-3 pt-3 border-t" style={{ borderColor: 'var(--sage-100)' }}>
                <button
                  onClick={() => copyId(channel.id)}
                  className="p-1.5 rounded-lg hover:bg-[var(--sage-100)] text-[var(--sage-400)]"
                  title="复制ID"
                >
                  {copiedId === channel.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleDelete(channel.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--sage-400)] hover:text-red-500"
                  title="删除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center text-sm text-[var(--sage-400)]">暂无数据</div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-[400px] max-w-[90vw]">
            <h2 className="text-lg font-bold text-[var(--sage-800)] mb-4">新建频道</h2>
            <div className="space-y-3">
              <input
                type="text" placeholder="频道名称"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 rounded-card border text-sm"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              >
                {CHANNEL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
                ))}
              </select>
              <textarea
                placeholder="配置 JSON（可选）"
                value={form.config}
                onChange={(e) => setForm({ ...form, config: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-card border text-sm font-mono"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSubmit} disabled={!form.name} className="btn-primary flex-1 disabled:opacity-50">创建</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-card border text-sm" style={{ borderColor: 'var(--sage-200)' }}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
