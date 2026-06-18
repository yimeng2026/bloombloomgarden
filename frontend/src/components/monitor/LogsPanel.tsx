import React from 'react'
import { useState, useRef, useEffect } from 'react';
import { Filter, Download, ScrollText, Pause, Play } from 'lucide-react';
import { motion } from 'framer-motion';

interface LogEntry {
  id: string;
  timestamp: string;
  agent: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

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
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
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
              border: `1px solid ${filterLevel === lvl ? 'transparent' : 'var(--dark-border)'}`,
            }}
          >
            {lvl}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200"
          style={{ background: 'var(--dark-elevated)', border: '1px solid var(--dark-border)' }}
          title={isPaused ? '继续' : '暂停'}
        >
          {isPaused ? <Play size={14} style={{ color: 'var(--bloom-mint)' }} /> : <Pause size={14} style={{ color: 'var(--sage-400)' }} />}
        </button>
      </div>

      {/* Log Entries */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-xs space-y-1 pr-1"
        style={{ maxHeight: 440, lineHeight: 1.7, color: 'var(--dark-text)' }}
      >
        {logEntries.length === 0 ? (
          <div className="text-sm text-center py-8" style={{ color: 'var(--sage-400)' }}>
            暂无日志记录
          </div>
        ) : (
          filtered.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-2 px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
            >
              <span className="flex-shrink-0 font-bold" style={{ color: levelConfig[entry.level]?.color || 'var(--sage-400)' }}>
                {entry.level}
              </span>
              <span className="flex-shrink-0" style={{ color: 'var(--sage-400)' }}>
                {entry.timestamp}
              </span>
              <span className="flex-shrink-0 font-medium" style={{ color: 'var(--bloom-amber)' }}>
                [{entry.agent}]
              </span>
              <span className="break-all">{entry.message}</span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
