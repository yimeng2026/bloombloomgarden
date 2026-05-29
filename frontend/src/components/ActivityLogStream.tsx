import { useState, useEffect, useRef } from 'react';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * ActivityLogStream — 实时活动日志流
 * 模拟系统日志推送，支持过滤、展开详情
 */
export default function ActivityLogStream() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // 模拟日志推送
  useEffect(() => {
    if (isPaused) return;

    const sources = ['AxisRouter', 'AgentService', 'LLMClient', 'KimiCluster', 'TaskService', 'Auth'];
    const messages = [
      { level: 'info' as const, msg: '路由请求至 OpenRouter provider' },
      { level: 'info' as const, msg: 'Agent [dev-01] 开始执行任务 #T-4821' },
      { level: 'warn' as const, msg: 'Kimi Key #3 返回 429，切换至 Key #4' },
      { level: 'info' as const, msg: '流式响应接收完成，共 1243 tokens' },
      { level: 'error' as const, msg: 'DeepSeek API 连接超时，触发熔断器' },
      { level: 'info' as const, msg: 'Token 预算检查通过: 2341/4000' },
      { level: 'debug' as const, msg: '3DACP 消息序列化: axis=(2,5,8)' },
      { level: 'info' as const, msg: '知识库检索命中 3 条文档' },
      { level: 'warn' as const, msg: 'AgentZero 2级干预触发: 用户接管' },
      { level: 'info' as const, msg: '任务 #T-4821 状态: running → completed' },
    ];

    const interval = setInterval(() => {
      const template = messages[Math.floor(Math.random() * messages.length)];
      const newLog: LogEntry = {
        id: Math.random().toString(36).slice(2, 9),
        timestamp: new Date(),
        level: template.level,
        source: sources[Math.floor(Math.random() * sources.length)],
        message: template.msg,
        metadata: template.level === 'error' ? { retryCount: 3, fallback: 'OpenRouter' } : undefined,
      };

      setLogs(prev => {
        const next = [...prev, newLog];
        return next.slice(-200); // 保留最近200条
      });
    }, 1500 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, [isPaused]);

  // 自动滚动
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.level === filter);

  const levelColor = {
    info: 'text-blue-400',
    warn: 'text-amber-400',
    error: 'text-red-400',
    debug: 'text-gray-500',
  };

  const levelBg = {
    info: 'bg-blue-500/10',
    warn: 'bg-amber-500/10',
    error: 'bg-red-500/10',
    debug: 'bg-gray-500/10',
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] rounded-xl border border-gray-800">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800">
        <span className="text-sm font-medium text-gray-300">活动日志</span>
        <div className="flex-1" />
        <div className="flex gap-1">
          {(['all', 'info', 'warn', 'error'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 text-xs rounded ${filter === f ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {f === 'all' ? '全部' : f === 'info' ? '信息' : f === 'warn' ? '警告' : '错误'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsPaused(p => !p)}
          className={`px-2 py-0.5 text-xs rounded ${isPaused ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-300'}`}
        >
          {isPaused ? '已暂停' : '暂停'}
        </button>
        <button
          onClick={() => setLogs([])}
          className="px-2 py-0.5 text-xs rounded text-gray-500 hover:text-red-400"
        >
          清空
        </button>
      </div>

      {/* 日志列表 */}
      <div className="flex-1 overflow-y-auto px-2 py-2 font-mono text-xs space-y-1">
        {filtered.map(log => (
          <div
            key={log.id}
            className={`flex items-start gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-800/50 ${levelBg[log.level]} ${expanded === log.id ? 'bg-gray-800/50' : ''}`}
            onClick={() => setExpanded(expanded === log.id ? null : log.id)}
          >
            <span className="text-gray-500 shrink-0 w-[52px]">
              {log.timestamp.toLocaleTimeString('zh-CN', { hour12: false })}
            </span>
            <span className={`shrink-0 w-10 uppercase ${levelColor[log.level]}`}>{log.level}</span>
            <span className="text-gray-400 shrink-0 w-20">{log.source}</span>
            <span className="text-gray-300 flex-1 break-all">{log.message}</span>
            {log.metadata && (
              <span className="shrink-0 text-gray-500">{expanded === log.id ? '▲' : '▼'}</span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 底部状态 */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-t border-gray-800 text-xs text-gray-500">
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={e => setAutoScroll(e.target.checked)}
            className="accent-indigo-500"
          />
          自动滚动
        </label>
        <span className="flex-1" />
        <span>共 {logs.length} 条</span>
        {isPaused && <span className="text-amber-400">● 已暂停</span>}
      </div>
    </div>
  );
}
