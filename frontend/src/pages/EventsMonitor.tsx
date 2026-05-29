import { useState, useEffect, useRef } from 'react'

interface EventItem {
  id: string
  type: string
  room: string
  payload: any
  timestamp: number
}

interface EventStats {
  connections: number
  rooms: number
  messagesPerSecond: number
}

export default function EventsMonitor() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [stats, setStats] = useState<EventStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [since, setSince] = useState('')
  const [rooms, setRooms] = useState('')
  const [autoPoll, setAutoPoll] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const API_BASE = '/api'

  async function pollEvents() {
    try {
      const params = new URLSearchParams()
      if (since) params.set('since', since)
      if (rooms) params.set('rooms', rooms)
      params.set('limit', '50')

      const res = await fetch(API_BASE + '/events/poll?' + params.toString())
      const json = await res.json()
      const newEvents = json.data || []
      if (newEvents.length > 0) {
        setEvents((prev) => [...newEvents, ...prev].slice(0, 200))
        const last = newEvents[newEvents.length - 1]
        if (last?.id) setSince(last.id)
      }
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function loadStats() {
    try {
      const res = await fetch(API_BASE + '/events/stats')
      const json = await res.json()
      setStats(json.data || null)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function loadAll() {
    setLoading(true)
    setError('')
    await Promise.all([pollEvents(), loadStats()])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (autoPoll) {
      pollRef.current = setInterval(() => {
        pollEvents()
        loadStats()
      }, 3000)
    } else if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [autoPoll, since, rooms])

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--sage-800)]">事件监控</h1>
          <p className="text-sm text-[var(--sage-500)] mt-1">实时事件轮询与WebSocket统计</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoPoll(!autoPoll)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${autoPoll ? 'bg-green-600 text-white' : 'bg-white text-[var(--sage-600)] border border-[var(--sage-300)]'}`}
          >
            {autoPoll ? '⏹ 停止轮询' : '▶ 自动轮询'}
          </button>
          <button onClick={loadAll} className="text-sm text-[var(--sage-600)] hover:text-[var(--sage-800)]">🔄 刷新</button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{error}</div>}

      {/* 统计 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-[var(--sage-200)] p-4 shadow-sm">
            <div className="text-sm text-[var(--sage-500)]">WebSocket连接</div>
            <div className="text-2xl font-bold text-[var(--sage-800)]">{stats.connections}</div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--sage-200)] p-4 shadow-sm">
            <div className="text-sm text-[var(--sage-500)]">活跃房间</div>
            <div className="text-2xl font-bold text-[var(--sage-800)]">{stats.rooms}</div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--sage-200)] p-4 shadow-sm">
            <div className="text-sm text-[var(--sage-500)]">消息/秒</div>
            <div className="text-2xl font-bold text-[var(--sage-800)]">{stats.messagesPerSecond?.toFixed(1) || '0'}</div>
          </div>
        </div>
      )}

      {/* 过滤器 */}
      <div className="bg-white rounded-xl border border-[var(--sage-200)] p-4 shadow-sm mb-6 flex gap-3 flex-wrap">
        <input
          value={rooms}
          onChange={(e) => setRooms(e.target.value)}
          className="px-3 py-2 border border-[var(--sage-300)] rounded-lg text-sm flex-1 min-w-[200px]"
          placeholder="房间列表（逗号分隔）"
        />
        <button onClick={pollEvents} className="px-4 py-2 bg-[var(--sage-600)] text-white rounded-lg text-sm hover:bg-[var(--sage-700)]">
          手动轮询
        </button>
        <button onClick={() => { setEvents([]); setSince(''); }} className="px-4 py-2 border border-[var(--sage-300)] text-[var(--sage-600)] rounded-lg text-sm">
          清空
        </button>
      </div>

      {/* 事件列表 */}
      {loading && events.length === 0 ? (
        <div className="text-center py-12 text-[var(--sage-500)]">加载中...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-[var(--sage-400)]">暂无事件</div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--sage-200)] overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-[var(--sage-50)] border-b border-[var(--sage-200)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--sage-700)]">时间</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--sage-700)]">类型</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--sage-700)]">房间</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--sage-700)]">内容</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-[var(--sage-100)] hover:bg-[var(--sage-50)]">
                  <td className="px-4 py-3 text-[var(--sage-500)] text-xs">{formatTime(e.timestamp)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">{e.type}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--sage-600)] font-mono text-xs">{e.room}</td>
                  <td className="px-4 py-3 text-[var(--sage-600)] text-xs max-w-md truncate">{JSON.stringify(e.payload).substring(0, 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
