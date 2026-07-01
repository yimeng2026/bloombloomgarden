import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { fetchEvents, fetchEventStats } from '@/api/client';

interface SystemEvent {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  category: 'system' | 'agent' | 'api' | 'security' | 'backup' | 'integration';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  relatedId?: string;
  acknowledged: boolean;
}

const LEVEL_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  info: { color: 'text-blue-400', bg: 'bg-blue-500/10', label: '信息' },
  warning: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: '警告' },
  error: { color: 'text-red-400', bg: 'bg-red-500/10', label: '错误' },
  critical: { color: 'text-purple-400', bg: 'bg-purple-500/10', label: '严重' }
};

const CATEGORY_ICONS: Record<string, string> = {
  system: '🖥️',
  agent: '🤖',
  api: '🔌',
  security: '🔒',
  backup: '💾',
  integration: '🔗'
};

export default function EventsPage() {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventStats, setEventStats] = useState<any>(null);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAcknowledged, setShowAcknowledged] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SystemEvent | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [evRes, stRes] = await Promise.allSettled([
          fetchEvents(),
          fetchEventStats(),
        ]);
        if (evRes.status === 'fulfilled' && evRes.value?.data) {
          setEvents(Array.isArray(evRes.value.data) ? evRes.value.data : []);
        }
        if (stRes.status === 'fulfilled' && stRes.value?.data) {
          setEventStats(stRes.value.data);
        }
      } catch (e: any) {
        setError(e.message || '加载事件数据失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = events.filter(e => {
    if (levelFilter !== 'all' && e.level !== levelFilter) return false;
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    if (!showAcknowledged && e.acknowledged) return false;
    return true;
  });

  const unackCount = events.filter(e => !e.acknowledged).length;

  const handleAcknowledge = async (id: string) => {
    try {
      const res = await fetch(`/api/events/${id}/acknowledge`, { method: 'PATCH' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error('Acknowledge failed:', e);
    }
    setEvents(prev => prev.map(e => e.id === id ? { ...e, acknowledged: true } : e));
  };

  const handleAcknowledgeAll = async () => {
    try {
      const res = await fetch('/api/events/acknowledge-all', { method: 'PATCH' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error('AcknowledgeAll failed:', e);
    }
    setEvents(prev => prev.map(e => ({ ...e, acknowledged: true })));
  };

  // SSE实时事件流
  useEffect(() => {
    let evtSource: EventSource | null = null;
    try {
      evtSource = new EventSource('/api/events/stream');
      evtSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          setEvents(prev => [event, ...prev]);
        } catch (err) {
          console.error('SSE消息解析失败:', err);
        }
      };
      evtSource.onerror = () => {
        console.error('SSE连接异常，关闭实时流');
        evtSource?.close();
      };
    } catch (e) {
      console.error('SSE不可用:', e);
    }
    return () => evtSource?.close();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* 头部 */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-bold text-white mb-1">事件总览</h1>
              <p className="text-gray-500 text-sm">系统事件、告警与通知中心</p>
            </div>
            {unackCount > 0 && (
              <button
                onClick={handleAcknowledgeAll}
                className="px-4 py-2 bg-[var(--sage-600)] hover:bg-[var(--sage-500)] text-white rounded-lg text-sm transition-colors"
              >
                全部确认 ({unackCount})
              </button>
            )}
          </div>

          {loading && (
            <div className="text-center text-sm text-[var(--sage-400)] py-4">加载中...</div>
          )}
          {error && (
            <div className="text-center text-sm text-red-500 py-4">⚠️ {error}</div>
          )}

          {/* 统计 */}
          <div className="flex gap-4 mt-4">
            {(['info', 'warning', 'error', 'critical'] as const).map(level => {
              const count = events.filter(e => e.level === level).length;
              const cfg = LEVEL_CONFIG[level];
              return (
                <div
                  key={level}
                  onClick={() => setLevelFilter(levelFilter === level ? 'all' : level)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    levelFilter === level ? cfg.bg + ' ring-1 ring-' + cfg.color.split('-')[1] + '-500/30' : 'bg-[#12121a]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${cfg.bg.replace('/10', '')}`} />
                  <span className={`text-sm ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-white font-bold text-sm">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* 事件列表 */}
          <div className="flex-1 overflow-auto p-6">
            {/* 筛选栏 */}
            <div className="flex items-center gap-4 mb-4">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-[#12121a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--sage-500)]"
              >
                <option value="all">全部类别</option>
                <option value="system">系统</option>
                <option value="agent">Agent</option>
                <option value="api">API</option>
                <option value="security">安全</option>
                <option value="backup">备份</option>
                <option value="integration">集成</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAcknowledged}
                  onChange={e => setShowAcknowledged(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-[var(--sage-500)]"
                />
                显示已确认
              </label>
            </div>

            {/* 列表 */}
            <div className="space-y-2">
              {loading ? (
                <div className="p-12 text-center text-sm text-[var(--sage-400)]">加载中...</div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <div className="text-4xl mb-2">📭</div>
                  <p>暂无匹配事件</p>
                </div>
              ) : (
                filtered.map(event => {
                  const levelCfg = LEVEL_CONFIG[event.level];
                  return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`p-4 bg-[#12121a] border rounded-lg cursor-pointer transition-all ${
                      selectedEvent?.id === event.id
                        ? 'border-[var(--sage-500)] ring-1 ring-[var(--sage-500)]/20'
                        : event.acknowledged
                        ? 'border-gray-800 opacity-60'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 mt-1.5 rounded-full ${levelCfg.bg.replace('/10', '')} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{CATEGORY_ICONS[event.category]}</span>
                          <h3 className="text-white font-medium text-sm">{event.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded ${levelCfg.bg} ${levelCfg.color}`}>
                            {levelCfg.label}
                          </span>
                          {!event.acknowledged && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-2">{event.message}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>来源: {event.source}</span>
                          <span>{new Date(event.timestamp).toLocaleString('zh-CN')}</span>
                          {event.relatedId && <span>关联: {event.relatedId}</span>}
                        </div>
                      </div>
                      {!event.acknowledged && (
                        <button
                          onClick={e => { e.stopPropagation(); handleAcknowledge(event.id); }}
                          className="px-3 py-1 text-xs bg-[var(--sage-600)]/20 text-[var(--sage-400)] hover:bg-[var(--sage-600)]/30 rounded transition-colors flex-shrink-0"
                        >
                          确认
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>

          {/* 详情面板 */}
          {selectedEvent && (
            <div className="w-80 border-l border-gray-800 bg-[#0d0d14] p-6 overflow-auto">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">事件详情</h2>
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-gray-500">事件ID</span>
                  <p className="text-white text-sm font-mono">{selectedEvent.id}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">标题</span>
                  <p className="text-white text-sm">{selectedEvent.title}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">详细信息</span>
                  <p className="text-gray-300 text-sm mt-1">{selectedEvent.message}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">级别</span>
                  <p className={`text-sm ${LEVEL_CONFIG[selectedEvent.level].color}`}>
                    {LEVEL_CONFIG[selectedEvent.level].label}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">类别</span>
                  <p className="text-white text-sm">{CATEGORY_ICONS[selectedEvent.category]} {selectedEvent.category}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">来源服务</span>
                  <p className="text-[var(--sage-400)] text-sm">{selectedEvent.source}</p>
                </div>
                {selectedEvent.relatedId && (
                  <div>
                    <span className="text-xs text-gray-500">关联对象</span>
                    <p className="text-white text-sm font-mono">{selectedEvent.relatedId}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-gray-500">时间戳</span>
                  <p className="text-white text-sm">{new Date(selectedEvent.timestamp).toLocaleString('zh-CN')}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">状态</span>
                  <p className={`text-sm ${selectedEvent.acknowledged ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {selectedEvent.acknowledged ? '✅ 已确认' : '⏳ 待确认'}
                  </p>
                </div>
              </div>

              {!selectedEvent.acknowledged && (
                <button
                  onClick={() => handleAcknowledge(selectedEvent.id)}
                  className="mt-6 w-full py-2 bg-[var(--sage-600)] hover:bg-[var(--sage-500)] text-white rounded-lg transition-colors"
                >
                  确认事件
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
