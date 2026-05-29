import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

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

const MOCK_EVENTS: SystemEvent[] = [
  {
    id: 'evt-001',
    level: 'info',
    category: 'system',
    title: '系统启动完成',
    message: '千界花园后端服务启动成功，所有模块已加载',
    timestamp: '2024-05-29T08:00:00Z',
    source: 'SystemBootstrap',
    acknowledged: true
  },
  {
    id: 'evt-002',
    level: 'info',
    category: 'agent',
    title: 'Agent SYLVA 已激活',
    message: 'Agent SYLVA 已完成初始化，角色模板：软件工程师，模型：Kimi Code',
    timestamp: '2024-05-29T08:01:15Z',
    source: 'AgentService',
    relatedId: 'agent-sylva',
    acknowledged: true
  },
  {
    id: 'evt-003',
    level: 'warning',
    category: 'api',
    title: 'Kimi Code API 响应延迟偏高',
    message: '最近5次请求平均响应时间 3.2s，超过阈值 2.0s',
    timestamp: '2024-05-29T08:15:30Z',
    source: 'KimiClusterOrchestrator',
    acknowledged: false
  },
  {
    id: 'evt-004',
    level: 'error',
    category: 'integration',
    title: '外部平台 Discord 连接中断',
    message: 'WebSocket连接异常关闭，错误代码：1006，正在自动重试...',
    timestamp: '2024-05-29T08:20:00Z',
    source: 'BridgeAdapter',
    acknowledged: false
  },
  {
    id: 'evt-005',
    level: 'critical',
    category: 'security',
    title: '异常登录尝试 detected',
    message: 'IP 192.168.x.x 连续5次登录失败，已自动加入临时黑名单',
    timestamp: '2024-05-29T08:25:10Z',
    source: 'SecurityService',
    acknowledged: false
  },
  {
    id: 'evt-006',
    level: 'info',
    category: 'backup',
    title: '增量备份完成',
    message: '知识库增量备份成功，新增文档 23 个，索引已更新',
    timestamp: '2024-05-29T08:30:00Z',
    source: 'BackupService',
    acknowledged: true
  },
  {
    id: 'evt-007',
    level: 'warning',
    category: 'agent',
    title: 'Agent memory 使用量接近上限',
    message: 'AgentZero 的上下文窗口使用 3800/4096 tokens，建议清理历史消息',
    timestamp: '2024-05-29T08:35:00Z',
    source: 'ContextMonitor',
    relatedId: 'agent-zero',
    acknowledged: false
  },
  {
    id: 'evt-008',
    level: 'info',
    category: 'api',
    title: 'OpenRouter API 连通性测试通过',
    message: '新配置的 OpenRouter API Key 验证成功，模型列表已获取',
    timestamp: '2024-05-29T08:40:00Z',
    source: 'APIKeyService',
    acknowledged: true
  }
];

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
  const [events, setEvents] = useState<SystemEvent[]>(MOCK_EVENTS);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAcknowledged, setShowAcknowledged] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SystemEvent | null>(null);

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
      console.warn('后端确认不可用，仅更新本地状态:', e);
    }
    setEvents(prev => prev.map(e => e.id === id ? { ...e, acknowledged: true } : e));
  };

  const handleAcknowledgeAll = async () => {
    try {
      const res = await fetch('/api/events/acknowledge-all', { method: 'PATCH' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.warn('后端批量确认不可用，仅更新本地状态:', e);
    }
    setEvents(prev => prev.map(e => ({ ...e, acknowledged: true })));
  };

  // SSE实时事件流（后端可用时自动启用）
  useEffect(() => {
    let evtSource: EventSource | null = null;
    try {
      evtSource = new EventSource('/api/events/stream');
      evtSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          setEvents(prev => [event, ...prev]);
        } catch (err) {
          console.warn('SSE消息解析失败:', err);
        }
      };
      evtSource.onerror = () => {
        console.warn('SSE连接异常，关闭实时流');
        evtSource?.close();
      };
    } catch (e) {
      console.warn('SSE不可用（Mock环境正常现象）:', e);
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
              {filtered.map(event => {
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
              })}
              {filtered.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  <div className="text-4xl mb-2">📭</div>
                  <p>暂无匹配事件</p>
                </div>
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
