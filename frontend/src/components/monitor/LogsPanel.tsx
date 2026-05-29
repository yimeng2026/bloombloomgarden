import React from 'react'
import { useState, useRef, useEffect } from 'react';
import { Filter, Download, ScrollText, Pause, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { logEntries } from './mockData';

const levelConfig: Record<string, { color: string; bg: string }> = {
  DEBUG: { color: '#8f9a7d', bg: 'rgba(143,154,125,0.15)' },
  INFO: { color: '#7fb89f', bg: 'rgba(127,184,159,0.15)' },
  WARN: { color: '#d4a373', bg: 'rgba(212,163,115,0.15)' },
  ERROR: { color: '#b85c5c', bg: 'rgba(184,92,92,0.15)' },
};

export default function LogsPanel() {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterAgent, setFilterAgent] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const agents = ['ALL', ...Array.from(new Set(logEntries.map((l) => l.agent)))];

  const filtered = logEntries.filter((entry) => {
    if (filterLevel !== 'ALL' && entry.level !== filterLevel) return false;
    if (filterAgent !== 'ALL' && entry.agent !== filterAgent) return false;
    if (search && !entry.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    if (autoScroll && scrollRef.current && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered, autoScroll, isPaused]);

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 480 }}>
      {/* Filter Bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap pb-3" style={{ borderBottom: '1px solid var(--dark-border)' }}>
        <ScrollText size={16} style={{ color: 'var(--sage-400)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--sage-400)' }}>级别</span>
        {['ALL', 'INFO', 'DEBUG', 'WARN', 'ERROR'].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setFilterLevel(lvl)}
            className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all duration-200"
            style={{
              background: filterLevel === lvl ? (lvl === 'ALL' ? 'var(--sage-500)' : levelConfig[lvl]?.bg || 'var(--sage-500)') : 'transparent',
              color: filterLevel === lvl ? (lvl === 'ALL' ? '#fff' : levelConfig[lvl]?.color || '#fff') : 'var(--sage-400)',
              border: `1px solid ${filterLevel === lvl ? (levelConfig[lvl]?.color || 'var(--sage-500)') : 'var(--dark-border)'}`,
            }}
          >
            {lvl}
          </button>
        ))}

        <div className="w-px h-5 mx-1" style={{ background: 'var(--dark-border)' }} />

        <Filter size={14} style={{ color: 'var(--sage-400)' }} />
        <select
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="px-2 py-1 rounded-md text-[11px] font-medium outline-none cursor-pointer"
          style={{ background: 'var(--dark-elevated)', color: 'var(--dark-text)', border: '1px solid var(--dark-border)' }}
        >
          {agents.map((a) => (
            <option key={a} value={a}>{a === 'ALL' ? '全部智能体' : a}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="搜索日志..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 rounded-md text-xs outline-none flex-1 min-w-[120px]"
          style={{ background: 'var(--dark-elevated)', color: 'var(--dark-text)', border: '1px solid var(--dark-border)' }}
        />

        <div className="flex-1" />

        <button
          onClick={() => setIsPaused(!isPaused)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all"
          style={{
            background: isPaused ? 'var(--bloom-amber)' : 'var(--dark-elevated)',
            color: isPaused ? '#fff' : 'var(--sage-400)',
            border: '1px solid var(--dark-border)',
          }}
        >
          {isPaused ? <Play size={12} /> : <Pause size={12} />}
          {isPaused ? '已暂停' : '暂停'}
        </button>

        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className="px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all"
          style={{
            background: autoScroll ? 'var(--bloom-mint)' : 'var(--dark-elevated)',
            color: autoScroll ? '#fff' : 'var(--sage-400)',
            border: '1px solid var(--dark-border)',
          }}
        >
          {autoScroll ? '自动滚动' : '手动'}
        </button>

        <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all hover:scale-105" style={{ background: 'var(--dark-elevated)', color: 'var(--sage-400)', border: '1px solid var(--dark-border)' }}>
          <Download size={12} /> 导出
        </button>
      </div>

      {/* Log Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mospace"
        style={{
          background: '#0d1117',
          borderRadius: 10,
          padding: '12px 16px',
          border: '1px solid var(--dark-border)',
          maxHeight: 520,
        }}
      >
        {filtered.map((entry, i) => {
          const cfg = levelConfig[entry.level] || levelConfig.DEBUG;
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.01, 0.3), duration: 0.2 }}
              className="flex items-start gap-3 py-1 hover:bg-white/5 rounded px-1 transition-colors"
            >
              <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--bloom-sky)', minWidth: 85 }}>
                {entry.timestamp}
              </span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ background: cfg.bg, color: cfg.color, minWidth: 44, textAlign: 'center' }}
              >
                {entry.level}
              </span>
              <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--bloom-sky)', minWidth: 100 }}>
                [{entry.agent}]
              </span>
              <span className="text-xs" style={{ color: entry.level === 'ERROR' ? '#b85c5c' : entry.level === 'WARN' ? '#d4a373' : 'var(--dark-text)' }}>
                {entry.message}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

